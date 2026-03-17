import { GoogleGenAI } from '@google/genai';

const PARSE_PROMPT = `You are given a document that contains quiz questions. Your task is to extract EVERY question exactly as written, with the exact answer options as they appear in the document, and identify which option is correct (0-based index).

Rules:
- Preserve the exact wording of each question and each option.
- Options might be labeled (A, B, C or 1, 2, 3) or unlabeled - keep them as in the document.
- Return ONLY a valid JSON array, no other text. Format:
[{"question":"...","options":["option1","option2",...],"correctIndex":0}]
- correctIndex is 0-based (first option = 0).
- If the document has no clear questions/options, return [].`;

function extractJson(text) {
  const match = text?.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_KEY not configured' });

  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const body = req.body || {};
    let text = '';
    let isPdf = false;
    let pdfBase64 = '';

    if (body.fileBase64 && body.mimeType === 'application/pdf') {
      pdfBase64 = body.fileBase64;
      isPdf = true;
    } else if (body.text) {
      text = String(body.text).slice(0, 2_000_000);
    } else {
      return res.status(400).json({ error: 'Provide { text } or { fileBase64, mimeType: "application/pdf" }' });
    }

    if (isPdf) {
      const contents = [
        {
          role: 'user',
          parts: [
            { text: PARSE_PROMPT },
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          ],
        },
      ];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });
      const out = response?.text ?? '';
      const questions = extractJson(out);
      return res.json({ questions: questions || [] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: PARSE_PROMPT + '\n\nDocument:\n' + text }] }],
    });
    const out = response?.text ?? '';
    const questions = extractJson(out);
    res.json({ questions: questions || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to parse document' });
  }
}
