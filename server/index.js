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

const PARSE_PROMPT = `You are given a document that contains quiz questions. Extract EVERY question exactly as written, with the exact answer options as they appear, and identify which option(s) are correct (0-based indices).

Rules:
- Preserve the exact wording of each question and each option (do not include highlight/bold markup in the text).
- Options might be labeled (A, B, C or 1, 2, 3) or unlabeled - keep them as in the document.

HOW TO FIND CORRECT ANSWERS (strict priority order):
1) ANSWER SHEET FIRST: Look for an answer key / answer sheet at the END of the document (e.g. "Answers:", "Key:", "Řešení:", numbered list of correct letters per question). If present, use it as the source of truth for every question.
2) HIGHLIGHTING ONLY IF NO ANSWER SHEET: If there is NO answer sheet at the end, determine correct options from visual emphasis WITHIN each question's options: bold, highlight/background color, underline, colored text, larger font, or similar. One emphasized option → correctIndex. Two or more emphasized options in the same question → correctIndices with all of them.
3) If neither an answer sheet nor any highlighting/emphasis exists for a question, use your best judgment from the document context, defaulting to a single correctIndex.

MULTIPLE CORRECT: Use "correctIndices" (all correct 0-based indices) when the chosen source above gives TWO OR MORE correct options for that question (e.g. answer sheet "A,C", or both options A and C highlighted in the question). Otherwise use a single "correctIndex".

Return ONLY a valid JSON array, no other text. Examples:
  Single: {"question":"...","options":["a","b"],"correctIndex":0}
  Multiple: {"question":"...","options":["a","b","c","d"],"correctIndices":[0,2]}
- If the document has no clear questions/options, return [].`;

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => {
      if (!q || typeof q !== 'object') return null;
      const question = typeof q.question === 'string' ? q.question.trim() : '';
      const options = Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim()).filter(Boolean)
        : [];
      if (!question || options.length < 2) return null;

      let indices = [];
      if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
        indices = [...new Set(q.correctIndices.map((i) => Number(i)).filter(
          (i) => Number.isInteger(i) && i >= 0 && i < options.length
        ))].sort((a, b) => a - b);
      } else if (typeof q.correctIndex === 'number') {
        const i = q.correctIndex;
        if (Number.isInteger(i) && i >= 0 && i < options.length) indices = [i];
      }
      if (indices.length === 0) return null;

      const out = { question, options, correctIndex: indices[0] };
      if (indices.length > 1) out.correctIndices = indices;
      return out;
    })
    .filter(Boolean);
}

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
          model: 'gemini-2.5-flash',
          contents,
        });
        const out = (response && typeof response.text === 'string') ? response.text : '';
        const questions = normalizeQuestions(extractJson(out));
        return res.json({ questions });
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
        model: 'gemini-2.5-flash',
        contents,
      });
      const out = (response && typeof response.text === 'string') ? response.text : '';
      const questions = normalizeQuestions(extractJson(out));
      return res.json({ questions });
    } else {
      return res.status(400).json({ error: 'Provide a file, text, or { fileBase64, mimeType } in body' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: PARSE_PROMPT + '\n\nDocument:\n' + text }] }],
    });
    const out = (response && typeof response.text === 'string') ? response.text : '';
    const questions = normalizeQuestions(extractJson(out));
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to parse document' });
  }
});

function resolveCorrectIndices(body) {
  const { options, correctIndex, correctIndices } = body;
  if (Array.isArray(correctIndices) && correctIndices.length > 0) {
    return correctIndices
      .map((i) => Number(i))
      .filter((i) => Number.isInteger(i) && i >= 0 && i < options.length);
  }
  if (correctIndex != null) {
    const i = Number(correctIndex);
    if (Number.isInteger(i) && i >= 0 && i < options.length) return [i];
  }
  return [];
}

app.post('/api/explain', async (req, res) => {
  try {
    const { question, options, correctIndex, correctIndices, selectedIndex, locale } = req.body;
    if (!question || !Array.isArray(options)) {
      return res.status(400).json({ error: 'Missing question or options' });
    }
    const indices = resolveCorrectIndices(req.body);
    if (indices.length === 0) {
      return res.status(400).json({ error: 'Missing correctIndex or correctIndices' });
    }
    const correctAnswers = indices.map((i) => options[i] ?? 'Unknown').join('; ');
    const selectedAnswer = options[Number(selectedIndex)] ?? 'Unknown';
    const langInstruction = locale === 'cs' ? 'Write the EXPLANATION and TIP in Czech (čeština).' : 'Write the EXPLANATION and TIP in English.';
    const multiNote = indices.length > 1
      ? ' There are multiple correct answers; explain why each correct option is right.'
      : '';
    const prompt = `Question: ${question}\nOptions: ${options.join(' | ')}\nCorrect answer(s): ${correctAnswers}\nThe user incorrectly selected: ${selectedAnswer}\n\n${langInstruction}${multiNote}\n\nRespond with exactly two short paragraphs: 1) "EXPLANATION:" then 2-3 sentences explaining why the correct answer(s) are right. 2) "TIP:" then one short memorable tip to remember this. Keep it concise.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
