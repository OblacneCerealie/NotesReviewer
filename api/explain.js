import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_KEY not configured' });

  const ai = new GoogleGenAI({ apiKey: key });
  const { question, options, correctIndex, selectedIndex, locale } = req.body || {};

  if (!question || !Array.isArray(options) || correctIndex == null) {
    return res.status(400).json({ error: 'Missing question, options, or correctIndex' });
  }

  const correctAnswer = options[Number(correctIndex)] ?? 'Unknown';
  const selectedAnswer = options[Number(selectedIndex)] ?? 'Unknown';
  const langInstruction = locale === 'cs' ? 'Write the EXPLANATION and TIP in Czech (čeština).' : 'Write the EXPLANATION and TIP in English.';
  const prompt = `Question: ${question}\nOptions: ${options.join(' | ')}\nCorrect answer: ${correctAnswer}\nThe user incorrectly selected: ${selectedAnswer}\n\n${langInstruction}\n\nRespond with exactly two short paragraphs: 1) "EXPLANATION:" then 2-3 sentences explaining why the correct answer is right. 2) "TIP:" then one short memorable tip to remember this. Keep it concise.`;

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
