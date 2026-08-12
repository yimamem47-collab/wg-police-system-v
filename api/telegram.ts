export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, html = true } = req.body || {};

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "8914963503:AAEnBeYX8qbRCKG6SUVkC2BUK9OqTvq0p_I";
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || "-1004319753390";

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("[Vercel /api/telegram] Missing Telegram credentials.");
      return res.status(500).json({ error: "Telegram configuration is missing." });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const bodyPayload: any = {
      chat_id: CHAT_ID,
      text: message
    };

    if (html) {
      bodyPayload.parse_mode = "HTML";
    }

    const telegramRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload)
    });

    if (telegramRes.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errText = await telegramRes.text();
      console.error("[Vercel /api/telegram API Error]:", errText);
      return res.status(502).json({ error: "Telegram API failed", details: errText });
    }
  } catch (err: any) {
    console.error("[Vercel /api/telegram Exception]:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
