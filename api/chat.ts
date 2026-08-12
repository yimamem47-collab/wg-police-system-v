export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[Vercel /api/chat] GEMINI_API_KEY is not set in Vercel Environment Variables.");
      return res.status(200).json({
        reply: "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። እንዴት ልረዳዎ እችላለሁ?"
      });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: `You are the "West Gojjam Zone Police Digital Assistant" (የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት), official AI assistant. Respond in the user's language (Amharic or English).`,
        temperature: 0.3
      }
    });

    const replyText = response.text || "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። እንዴት ልረዳዎ እችላለሁ?";
    return res.status(200).json({ reply: replyText });
  } catch (err: any) {
    console.error("[Vercel /api/chat Error]:", err);
    return res.status(200).json({
      reply: "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። በፖሊስ መምሪያው አገልግሎቶች፣ በወንጀል ጥቆማና በትራፊክ ደህንነት ዙሪያ ልረዳዎ እችላለሁ።"
    });
  }
}
