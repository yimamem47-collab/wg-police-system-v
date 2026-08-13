export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image, prompt } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      console.error("[Vercel /api/gemini/analyze-image Error] GEMINI_API_KEY missing.");
      return res.status(500).json({ error: "GEMINI_API_KEY missing." });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    let imageData = base64Image || '';
    let mimeType = "image/jpeg";

    if (imageData.includes(';base64,')) {
      const parts = imageData.split(';base64,');
      mimeType = parts[0].split(':')[1] || "image/jpeg";
      imageData = parts[1];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{
        role: 'user',
        parts: [
          { text: prompt || "Analyze this image" },
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType
            }
          }
        ]
      }]
    });

    return res.status(200).json({ text: response.text || '' });
  } catch (err: any) {
    console.error("[Vercel /api/gemini/analyze-image Error]:", err?.message || err, err?.stack);
    return res.status(500).json({ error: "Failed to analyze image", details: err?.message });
  }
}
