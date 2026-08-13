const SYSTEM_PROMPT = `You are the "West Gojjam Zone Police Digital Assistant" (የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት), the official AI assistant for the West Gojjam Zone Police Department in Ethiopia.

IDENTITY & TONE:
- Developed by Chief Sergeant Mengesha Yimam Abera (ዋና ሳጅን መንገሻ ይማም አበራ).
- Professional, helpful, authoritative yet accessible, respectful on police matters.
- Expert in FDRE Constitution, Ethiopian Criminal Law, Traffic Safety Proclamations, and International Human Rights Principles.

LANGUAGE RULES:
- ALWAYS respond in the exact language the user used (Amharic or English).
- For Amharic greetings like "How are you?" / "ሰላም", respond: "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። እንዴት ልረዳዎ እችላለሁ?"
`;

function getFallbackAmharicReply(message: string): string {
  const lower = (message || '').toLowerCase();
  if (lower.includes('ሰላም') || lower.includes('hello') || lower.includes('hi') || lower.includes('እንዴት')) {
    return "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። እንዴት ልረዳዎ እችላለሁ?";
  }
  return "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። በወንጀል ጥቆማ፣ በትራፊክ ደህንነት እና በፖሊስ መምሪያው አገልግሎቶች ዙሪያ ልረዳዎ እችላለሁ።";
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userPrompt, message, history } = req.body || {};
    const promptText = userPrompt || message || '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      console.error("[Vercel /api/gemini/stream Error] GEMINI_API_KEY is not configured in process.env.");
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(getFallbackAmharicReply(promptText));
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || '' }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: promptText }]
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let responseStream;
    const modelsToTry = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.5-flash'];

    for (const modelName of modelsToTry) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.3
          }
        });
        if (responseStream) break;
      } catch (mErr: any) {
        console.warn(`[Vercel /api/gemini/stream Warning] Model ${modelName} failed:`, mErr?.message || mErr);
      }
    }

    if (!responseStream) {
      console.error("[Vercel /api/gemini/stream Error] All stream models failed.");
      return res.status(200).send(getFallbackAmharicReply(promptText));
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(text);
      }
    }

    return res.end();
  } catch (err: any) {
    console.error("[Vercel /api/gemini/stream Exception]:", err?.message || err, err?.stack);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(getFallbackAmharicReply(req.body?.userPrompt || req.body?.message));
  }
}
