import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const PASSWORD = process.env.PASSWORD || '';

app.use(cors({ origin: true }));
app.use(express.json({ limit: '52mb' }));

/** Optional password protection: require X-App-Password header on /api routes. */
function authMiddleware(req, res, next) {
  if (!PASSWORD) return next();
  if (req.path === '/api/check' || req.originalUrl === '/api/check') return next();
  const provided = req.headers['x-app-password'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');
  if (provided === PASSWORD) return next();
  res.status(401).json({ error: 'Password required' });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

const PARSE_PROMPT = `You are given a document that contains quiz questions. Your task is to extract EVERY question exactly as written, with the exact answer options as they appear in the document, and identify which option is correct (0-based index).

Rules:
- Preserve the exact wording of each question and each option.
- Options might be labeled (A, B, C or 1, 2, 3) or unlabeled - keep them as in the document.
- Return ONLY a valid JSON array, no other text. Format:
[{"question":"...","options":["option1","option2",...],"correctIndex":0}]
- correctIndex is 0-based (first option = 0).
- If the document has no clear questions/options, return [].`;

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** /api/check: no auth required; returns 200 if no password or valid password, 401 otherwise. */
app.get('/api/check', (req, res) => {
  if (!PASSWORD) return res.json({ ok: true });
  const provided = req.headers['x-app-password'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');
  if (provided === PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Password required' });
});

app.use('/api', authMiddleware);

app.post('/api/parse-document', upload.single('file'), async (req, res) => {
  try {
    let text = '';
    if (req.file) {
      const buffer = req.file.buffer;
      const mime = req.file.mimetype;
      if (mime === 'application/pdf') {
        const contents = [
          {
            role: 'user',
            parts: [
              { text: PARSE_PROMPT },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: buffer.toString('base64'),
                },
              },
            ],
          },
        ];
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
        });
        const out = (response && typeof response.text === 'string') ? response.text : '';
        const questions = extractJson(out);
        return res.json({ questions: questions || [] });
      }
      text = buffer.toString('utf-8');
    } else if (req.body?.text) {
      text = String(req.body.text).slice(0, 2_000_000); // ~500k tokens safe
    } else if (req.body?.fileBase64 && req.body?.mimeType === 'application/pdf') {
      const contents = [
        {
          role: 'user',
          parts: [
            { text: PARSE_PROMPT },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: req.body.fileBase64,
              },
            },
          ],
        },
      ];
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });
      const out = (response && typeof response.text === 'string') ? response.text : '';
      const questions = extractJson(out);
      return res.json({ questions: questions || [] });
    } else {
      return res.status(400).json({ error: 'Provide a file, text, or { fileBase64, mimeType } in body' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: PARSE_PROMPT + '\n\nDocument:\n' + text }] }],
    });
    const out = (response && typeof response.text === 'string') ? response.text : '';
    const questions = extractJson(out);
    res.json({ questions: questions || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to parse document' });
  }
});

app.post('/api/explain', async (req, res) => {
  try {
    const { question, options, correctIndex, selectedIndex } = req.body;
    if (!question || !Array.isArray(options) || correctIndex == null) {
      return res.status(400).json({ error: 'Missing question, options, or correctIndex' });
    }
    const correctAnswer = options[Number(correctIndex)] ?? 'Unknown';
    const selectedAnswer = options[Number(selectedIndex)] ?? 'Unknown';
    const prompt = `Question: ${question}\nOptions: ${options.join(' | ')}\nCorrect answer: ${correctAnswer}\nThe user incorrectly selected: ${selectedAnswer}\n\nRespond with exactly two short paragraphs: 1) "EXPLANATION:" then 2-3 sentences explaining why the correct answer is right. 2) "TIP:" then one short memorable tip to remember this. Keep it concise.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = (response && typeof response.text === 'string') ? response.text : '';
    const explanationMatch = text.match(/EXPLANATION:?\s*([\s\S]*?)(?=TIP:|$)/i);
    const tipMatch = text.match(/TIP:?\s*([\s\S]*?)$/im);
    res.json({
      explanation: explanationMatch ? explanationMatch[1].trim() : text,
      tip: tipMatch ? tipMatch[1].trim() : '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to get explanation' });
  }
});

/** Serve static build in production (Railway, Render, etc.) */
const __dirname2 = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname2, '..', 'dist');
try {
  const { existsSync } = await import('fs');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(distPath, 'index.html'));
    });
  }
} catch {}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
