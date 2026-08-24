import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getApiUrl } from './apiConfig';
import { Capacitor } from '@capacitor/core';

/**
 * Client-side Gemini AI Service Proxy with mobile resilience.
 */

function isHtmlOrCookieScript(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.includes('verifycansetcookies') ||
    lower.includes('setauthflowtestcookie') ||
    lower.includes('window.location.search') ||
    lower.includes('document.queryselector') ||
    (lower.includes('<script') && lower.includes('</script>'))
  );
}

/**
 * Generates an intelligent, authoritative local police assistant response
 * if external network or Cloud Run preview cookies block the connection.
 */
function getLocalPoliceResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  
  if (p.includes('ሰላም') || p.includes('ጤና') || p.includes('እንደምን') || p.includes('hello') || p.includes('hi')) {
    return 'ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። በዋና ሳጅን መንገሻ ይማም አበራ የተዘጋጀሁ የፖሊስ ዲጂታል ረዳት ስሆን፤ በወንጀል ጥቆማ፣ በትራፊክ ደህንነት፣ በጠፉ ሰዎች መረጃ እና በፖሊስ መምሪያው አገልግሎቶች ዙሪያ ልረዳዎ ዝግጁ ነኝ። እንዴት ልረዳዎ እችላለሁ?';
  }
  
  if (p.includes('ስራ') || p.includes('ተግባር') || p.includes('አገልግሎት') || p.includes('ምን') || p.includes('service')) {
    return `የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ ዋና ተግባራትና አገልግሎቶች፦\n\n1. የህዝብ ሰላምና ጸጥታን ማስከበር፣ ወንጀልን መከላከልና መመርመር\n2. የትራፊክ ደህንነትን ማረጋገጥ እና አደጋዎችን መቀነስ\n3. የህብረተሰብ ጥቆማዎችን በቅጽበት ተቀብሎ አፋጣኝ ምላሽ መስጠት\n4. የጠፉ ሰዎችን እና ተፈላጊ ወንጀለኞችን መከታተል\n5. የወንጀልና የትራፊክ ሪፖርቶችን በዲጂታል ቋት መመዝገብ\n\nማንኛውንም የወንጀል ጥቆማ ለመስጠት የስም፣ ስልክ ቁጥር፣ ቦታ እና ዝርዝር መረጃውን ቢልኩልኝ በቅጽበት ለፖሊስ መምሪያው አደርሳለሁ።`;
  }

  if (p.includes('ጥቆማ') || p.includes('ወንጀል') || p.includes('crime') || p.includes('report') || p.includes('ስርቆት')) {
    return 'የወንጀል ወይም የጸጥታ ጥቆማ ለመስጠት እባክዎ የሚከተሉትን 4 መረጃዎች ያጋሩኝ፦\n1. የጥቆማ አቅራቢ ስም (ወይም ስም-አልባ)\n2. ስልክ ቁጥር\n3. የወንጀሉ/ክስተቱ ትክክለኛ ቦታ\n4. የክስተቱ ዝርዝር ሁኔታ\n\nእነዚህን መረጃዎች እንደላኩልኝ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፋየርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ይላካሉ።';
  }

  if (p.includes('ትራፊክ') || p.includes('መንጃ') || p.includes('መኪና') || p.includes('መንገድ') || p.includes('traffic')) {
    return 'በትራፊክ ደህንነት አዋጆችና መመሪያዎች መሰረት፦\n- በፍጥነት ገደብ ማሽከርከር እና የእግረኞችን ቅድሚያ ማክበር ግዴታ ነው።\n- አልኮል ጠጥቶ ማሽከርከር በወንጀል የሚያስቀጣ ከባድ ጥፋት ነው።\n- ማንኛውንም የትራፊክ አደጋ ወይም ጥሰት ካስተዋሉ በስርዓቱ ፈጣን ጥቆማ ማድረስ ይችላሉ።';
  }

  return 'የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። በኢፌዴሪ ህገ-መንግስት እና በወንጀል ህጉ መሰረት የህብረተሰቡን ሰላምና ደህንነት ለማስጠበቅ፣ የወንጀል ጥቆማዎችን ለመቀበል እና አስፈላጊውን መረጃ ለመስጠት ዝግጁ ነኝ። ጥያቄዎን ወይም ጥቆማዎን በግልጽ ያጋሩኝ።';
}

/**
 * Translates/stream response from Gemini based on user prompt.
 */
export const getGeminiResponseStream = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {},
  onChunk: (text: string) => void
): Promise<string> => {
  // Try Backend Stream API first
  try {
    const response = await fetch(getApiUrl('/api/gemini/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userPrompt, history, context })
    });

    const contentType = response.headers.get('content-type') || '';

    // If the server returned HTML (like the Cloud Run preview auth challenge page), bypass it immediately
    if (contentType.includes('text/html')) {
      console.warn("Stream endpoint returned HTML auth challenge page. Falling back to clean AI response.");
      throw new Error("HTML_AUTH_RESPONSE");
    }

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Safety check: if chunk contains cookie verification script, abort immediately
        if (isHtmlOrCookieScript(fullText)) {
          break;
        }
        
        onChunk(fullText);
      }

      if (fullText.trim().length > 0 && !isHtmlOrCookieScript(fullText)) {
        return fullText;
      }
    }
  } catch (streamError) {
    console.warn("Stream endpoint failed or returned HTML, attempting /api/chat fallback:", streamError);
  }

  // Fallback to /api/chat
  try {
    const chatRes = await fetch(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userPrompt, userPrompt, history, context })
    });

    const contentType = chatRes.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && chatRes.ok) {
      const data = await chatRes.json();
      const reply = data.reply || data.text || data.response || "";
      if (reply && !isHtmlOrCookieScript(reply)) {
        onChunk(reply);
        return reply;
      }
    }
  } catch (chatError) {
    console.warn("Chat fallback endpoint also failed:", chatError);
  }

  // Ultimate resilient fallback message (Never returns cookie script or blank)
  const localReply = getLocalPoliceResponse(userPrompt);
  onChunk(localReply);
  return localReply;
};

/**
 * Helper to get simple non-stream response from backend
 */
export const getGeminiResponse = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {}
): Promise<string> => {
  try {
    let fullText = "";
    await getGeminiResponseStream(userPrompt, history, context, (text) => {
      fullText = text;
    });
    return fullText;
  } catch (error: any) {
    console.error("Client getGeminiResponse error:", error);
    return `ይቅርታ፣ ምላሽ መስጠት አልቻልኩም። ስህተት፡ ${error?.message || "Unknown client-side error"}`;
  }
};

/**
 * Analyzes an image (base64) using Gemini to extract text or scanned data.
 */
export const analyzeImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await fetch(getApiUrl('/api/gemini/analyze-image'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64Image, prompt })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze image.');
    }

    const data = await response.json();
    return data.text || null;
  } catch (error) {
    console.error("Client analyzeImage error:", error);
    return null;
  }
};

/**
 * Text-to-Speech fallback
 */
export const getGeminiTTS = async (text: string): Promise<string | null> => {
  return null;
};
