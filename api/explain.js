import { GoogleGenAI } from '@google/genai';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_KEY not configured' });

  const ai = new GoogleGenAI({ apiKey: key });
  const body = req.body || {};
  const { question, options, selectedIndex, locale } = body;

  if (!question || !Array.isArray(options)) {
    return res.status(400).json({ error: 'Missing question or options' });
  }

  const indices = resolveCorrectIndices(body);
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = response?.text ?? '';
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
}
