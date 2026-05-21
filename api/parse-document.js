import { GoogleGenAI } from '@google/genai';

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
      const questions = normalizeQuestions(extractJson(out));
      return res.json({ questions });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: PARSE_PROMPT + '\n\nDocument:\n' + text }] }],
    });
    const out = response?.text ?? '';
    const questions = normalizeQuestions(extractJson(out));
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Failed to parse document' });
  }
}
