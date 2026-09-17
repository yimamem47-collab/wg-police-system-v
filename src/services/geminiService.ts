import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getApiUrl } from './apiConfig';
import { Capacitor } from '@capacitor/core';
import { sendTelegramMessage } from './telegramService';

/**
 * Client-side Gemini AI Service Proxy with mobile resilience and automatic Telegram dispatch.
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
 * Automatically detects if the user's message is a crime tip, accident report, or complaint,
 * and immediately forwards it to Telegram and Firestore directly from the mobile app.
 */
export async function detectAndForwardTip(userPrompt: string): Promise<string | null> {
  const p = userPrompt.trim();
  const lower = p.toLowerCase();
  
  const isTipKeywords = [
    'ጥቆማ', 'ሪፖርት', 'ወንጀል', 'ስርቆት', 'አደጋ', 'ጥቃት', 'ዘረፋ', 'የጠፋ', 
    'ተሰረቀ', 'ተደበደበ', 'ሰው ተጎዳ', 'ሰው ሞተ', 'እሳት', 'የህገወጥ', 'ሙስና',
    'crime', 'tip', 'report', 'theft', 'accident', 'emergency'
  ];

  const hasTipKeyword = isTipKeywords.some(k => lower.includes(k));
  const phoneMatch = p.match(/(?:\+251|0)[79]\d{8}/);
  
  // If the user provided a phone number or specifically provided a report/tip description
  if ((hasTipKeyword && p.length >= 15) || (phoneMatch && p.length >= 20)) {
    try {
      const detectedPhone = phoneMatch ? phoneMatch[0] : 'ያልተገለጸ (Not provided)';
      
      // Extract name if provided
      let detectedName = 'ስም-አልባ ዜጋ (Anonymous Citizen)';
      const nameRegex = new RegExp('(?:ስሜ|ስም|አቶ|ወ/ሮ|ጋሽ)\\s*[:፡]?\\s*([^\\n,፣.]+)', 'i');
      const nameMatch = p.match(nameRegex);
      if (nameMatch && nameMatch[1]) {
        detectedName = nameMatch[1].trim();
      }

      // Extract location if mentioned
      let detectedLocation = 'ምዕራብ ጎጃም ዞን (West Gojjam)';
      const locKeywords = ['ፈነተሰላም', 'ደንበጫ', 'ቡሬ', 'ቋሪት', 'ሰከላ', 'ይልማና ዴንሳ', 'ሜጫ', 'ባህር ዳር', 'ቀበሌ', 'ወረዳ', 'መንደር'];
      for (const loc of locKeywords) {
        if (p.includes(loc)) {
          detectedLocation = loc;
          break;
        }
      }

      // 1. Send directly to Telegram Bot Group
      const telegramAlert = `🤖 <b>አዲስ ጥቆማ ደርሷል! (ከሞባይል ረዳት / AI)</b>\n---------------------------\n<b>👤 አቅራቢ:</b> ${detectedName}\n<b>📞 ስልክ:</b> ${detectedPhone}\n<b>📍 ቦታ:</b> ${detectedLocation}\n---------------------------\n<b>📝 ዝርዝር መረጃ:</b>\n${p}\n---------------------------\n📅 <b>ቀን:</b> ${new Date().toLocaleString('am-ET')}`;
      
      sendTelegramMessage(telegramAlert).catch(err => {
        console.warn("Mobile background Telegram tip dispatch error:", err);
      });

      // 2. Log to Firestore community_reports collection
      if (db) {
        addDoc(collection(db, 'community_reports'), {
          reporterName: detectedName,
          reporterPhone: detectedPhone,
          location: detectedLocation,
          details: p,
          date: new Date().toISOString().split('T')[0],
          status: 'New',
          timestamp: serverTimestamp(),
          source: 'Mobile AI Assistant'
        }).catch(err => {
          console.warn("Mobile background Firestore tip dispatch error:", err);
        });
      }

      return 'ጥቆማዎ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፋየርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ተልኳል። ስለ ትብብርዎ እናመሰግናለን። የምዕራብ ጎጃም ዞን ፖሊስ ፈጣን ክትትል ያደርጋል።';
    } catch (e) {
      console.error("detectAndForwardTip error:", e);
    }
  }

  return null;
}

/**
 * Generates an intelligent, authoritative local police assistant response
 * covering the Constitution, Criminal Code, Traffic proclamations, station directories,
 * investigation procedures, and police administration.
 */
function getLocalPoliceResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  
  // 1. Greetings & Identity
  if (p.includes('ሰላም') || p.includes('ጤና') || p.includes('እንደምን') || p.includes('hello') || p.includes('hi')) {
    return 'ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። በዋና ሳጅን መንገሻ ይማም አበራ የተዘጋጀሁ ይፋዊ የፖሊስ ዲጂታል ረዳት ስሆን፤ በወንጀል ጥቆማ፣ በትራፊክ ደህንነት፣ በኢፌዴሪ ሕገ-መንግሥትና በወንጀል ሕግ፣ በጠፉ ሰዎች መረጃ እንዲሁም በማንኛውም የፖሊስ አገልግሎት ዙሪያ ማንኛውንም ጥያቄ ለመመለስ ዝግጁ ነኝ። እንዴት ልረዳዎ እችላለሁ?';
  }
  
  // 2. Developer / Creator Information
  if (p.includes('ማነው የሰራህ') || p.includes('ማነው ያዘጋጀህ') || p.includes('ፈጣሪህ') || p.includes('መንገሻ') || p.includes('developer') || p.includes('creator')) {
    return 'ይህ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት (West Gojjam Police Digital Assistant) የተገነባውና የተዘጋጀው በዋና ሳጅን መንገሻ ይማም አበራ (Chief Sergeant Mengesha Yimam Abera) ነው። የዚህ ሲስተም ዓላማ የምዕራብ ጎጃም ዞን ፖሊስ መምሪያን ስራዎች በቴክኖሎጂ ማዘመን፣ የወንጀልና የትራፊክ ሪፖርቶችን ማስተባበር እና የህብረተሰቡን ጥቆማ በቅጽበት ማስተናገድ ነው።';
  }

  // 3. Crime Reporting & Tips
  if (p.includes('ጥቆማ') || p.includes('ወንጀል') || p.includes('ስርቆት') || p.includes('ዘረፋ') || p.includes('ተሰረቀ') || p.includes('crime') || p.includes('report')) {
    return 'የወንጀል ወይም የጸጥታ ጥቆማ ለመስጠት እባክዎ የሚከተሉትን 4 መረጃዎች ያጋሩኝ፦\n\n1. የጥቆማ አቅራቢ ስም (ወይም ስም-አልባ)\n2. ስልክ ቁጥር\n3. የወንጀሉ/ክስተቱ ትክክለኛ ቦታ (ወረዳ/ቀበሌ/መንደር)\n4. የክስተቱ ዝርዝር ሁኔታ\n\nእነዚህን መረጃዎች እንደላኩልኝ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፋየርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት በቀጥታ ይላካሉ። ማንኛውም መረጃዎ በሚስጥር ይጠበቃል።';
  }

  // 4. Traffic Safety & Regulations
  if (p.includes('ትራፊክ') || p.includes('መንጃ') || p.includes('መኪና') || p.includes('መንገድ') || p.includes('አደጋ') || p.includes('ፍጥነት') || p.includes('traffic')) {
    return 'በትራፊክ ደህንነት አዋጆችና መመሪያዎች መሰረት፦\n\n1. የፍጥነት ወሰን፦ በከተማ ክልል ከፍተኛው ፍጥነት 30-50 ኪ.ሜ/ሰዓት ሲሆን ከአውራ ጎዳና ውጭ እንደየመንገዱ ሁኔታ ይወሰናል።\n2. አልኮልና አደንዛዥ እፅ፦ ጠጥቶ ማሽከርከር በወንጀል የሚያስቀጣ ከባድ ጥፋት ሲሆን ፈቃድ እስከመሰረዝ ያደርሳል።\n3. የእግረኞች ቅድሚያ፦ በእግረኛ ማቋረጫዎች (Zebra Cross) ላይ ለእግረኞች ቅድሚያ መስጠት ግዴታ ነው።\n4. ሰሌዳና ፈቃድ፦ የተበላሸ ወይም የተሰወረ ሰሌዳ ማሽከርከር እና ጊዜው ያለፈበት መንጃ ፈቃድ መያዝ የተከለከለ ነው።\n\nየትራፊክ አደጋ ሲያጋጥም ወዲያውኑ ሪፖርት ያድርጉ ወይም በስርዓቱ "የትራፊክ ሪፖርት" በመጫን ጥቆማ ይላኩ።';
  }

  // 5. Constitution & Human Rights
  if (p.includes('ህገ መንግስት') || p.includes('መብት') || p.includes('ሰብአዊ') || p.includes('ህግ') || p.includes('እስር') || p.includes('ዋስትና') || p.includes('constitution') || p.includes('rights')) {
    return 'በኢፌዴሪ ሕገ-መንግሥት እና በወንጀለኛ መቅጫ ስነ-ስርዓት ሕጉ መሰረት የተረጋገጡ መሰረታዊ መብቶች፦\n\n1. የተጠርጣሪዎች መብት (አንቀጽ 19)፦ ማንኛውም የተያዘ ሰው በ48 ሰዓታት ውስጥ ፍርድ ቤት የመቅረብ መብት አለው፤ የመያዙን ምክንያት በግልጽ የመረዳት እና ዝም የማለት መብት አለው።\n2. ዋስትና፦ በሕግ በተለየ ሁኔታ ካልተከለከለ በስተቀር ማንኛውም ተጠርጣሪ በዋስ የመፈታት ሕገ-መንግሥታዊ መብት አለው።\n3. የሰብአዊ ክብር (አንቀጽ 18)፦ ማንኛውም ሰው ኢ-ሰብአዊ ወይም አዋራጅ ከሆነ አያያዝ የመጠበቅ መብት አለው።\n4. ፍተሻ፦ ያለ ፍርድ ቤት የመበርበሪያ ትዕዛዝ ወይም በወንጀል እጅ ከፍንጅ ካልሆነ በስተቀር የሰውነት ወይም የመኖሪያ ቤት ፍተሻ አይፈቀድም።';
  }

  // 6. Stations & Woredas in West Gojjam
  if (p.includes('ወረዳ') || p.includes('ጣቢያ') || p.includes('መምሪያ') || p.includes('ፈነተሰላም') || p.includes('ደንበጫ') || p.includes('ቡሬ') || p.includes('ቋሪት') || p.includes('ሜጫ')) {
    return 'የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ ዋና ዋና የወረዳ ፖሊስ ጽ/ቤቶች፦\n\n• የዞኑ ዋና መምሪያ፦ ፈነተሰላም ከተማ\n• ፈነተሰላም ከተማ አስተዳደር ፖሊስ ጽ/ቤት\n• ደንበጫ ወረዳ ፖሊስ ጽ/ቤት\n• ቡሬ ወረዳና ቡሬ ከተማ ፖሊስ ጽ/ቤት\n• ቋሪት ወረዳ ፖሊስ ጽ/ቤት\n• ሰከላ ወረዳ ፖሊስ ጽ/ቤት\n• ይልማና ዴንሳ (አዴት) ፖሊስ ጽ/ቤት\n• ሜጫ ወረዳ (መርአዊ) ፖሊስ ጽ/ቤት\n• ደቡብ አቸፈር (ዱርቤቴ) እና ሰሜን አቸፈር ፖሊስ ጽ/ቤቶች\n\nበእነዚህ ሁሉ ጣቢያዎች ፈጣን አገልግሎትና የጥበቃ ስራ ይሰጣል።';
  }

  // 7. Missing Persons & Wanted Criminals
  if (p.includes('የጠፋ') || p.includes('ተፈላጊ') || p.includes('ወንጀለኛ') || p.includes('ፎቶ') || p.includes('wanted') || p.includes('missing')) {
    return 'በስርዓቱ ውስጥ የጠፉ ሰዎችና ተፈላጊ ወንጀለኞች መረጃ በቋሚነት ይመዘገባል፦\n\n1. የጠፋ ሰው ሪፖርት ለማድረግ፦ የጠፋውን ሰው ሙሉ ስም፣ ዕድሜ፣ የጠፋበትን ቀንና ቦታ፣ የመጨረሻ የለበሰውን ልብስ እና ፎቶግራፍ በማያያዝ በ"ጠፉ ሰዎች" ክፍል ይመዝግቡ።\n2. ተፈላጊ ወንጀለኞችን ካዩ፦ ለራስዎ ደህንነት ሲሉ በቀጥታ ለመያዝ አይሞክሩ፤ ይልቁንም ያለበትን ትክክለኛ ቦታ እና ሁኔታ ወዲያውኑ በስርዓቱ ወይም በስልክ ለፖሊስ ያሳውቁ።';
  }

  // 8. General Duties & Police Services
  if (p.includes('ስራ') || p.includes('ተግባር') || p.includes('አገልግሎት') || p.includes('ምን') || p.includes('service')) {
    return 'የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ ዋና ዋና ተግባራትና አገልግሎቶች፦\n\n1. የህዝብ ሰላምና ጸጥታን ማስከበር፣ ወንጀልን አስቀድሞ መከላከልና መመርመር\n2. የትራፊክ ደህንነትን ማረጋገጥ እና አደጋዎችን መቀነስ\n3. የህብረተሰብ ጥቆማዎችን በቅጽበት ተቀብሎ አፋጣኝ ምላሽ መስጠት\n4. የጠፉ ሰዎችን እና ተፈላጊ ወንጀለኞችን መከታተልና መያዝ\n5. የወንጀልና የትራፊክ ሪፖርቶችን በዲጂታል ቋት መመዝገብ\n6. ለፖሊስ አባላት የተልዕኮ እና የፈረቃ ስምሪቶችን ማስተባበር\n\nማንኛውንም ጥያቄ ወይም ጥቆማ ያጋሩኝ፤ በቅጽበት አደርሳለሁ።';
  }

  // Default Universal Comprehensive Response (Never blank, never chopped)
  return `የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ።\n\nየጠየቁትን ጥያቄ አስመልክቶ፡ በኢፌዴሪ ሕገ-መንግሥት፣ በወንጀል ሕጉ፣ በትራፊክ ደኅንነት አዋጆች እና በፖሊስ መምሪያው መመሪያዎች መሰረት የዜጎችን ደህንነት ማስጠበቅ ቀዳሚ ተግባራችን ነው።\n\n• ማንኛውንም የወንጀል ወይም የትራፊክ ጥቆማ ለመስጠት የስም፣ ስልክ ቁጥር፣ ቦታ እና ዝርዝር መረጃውን እዚህ ይጻፉልኝ፤ ወዲያውኑ ለፖሊስ መምሪያው እና ለቴሌግራም ግሩፕ በቅጽበት ይላካል።\n• ስለ ፖሊስ አገልግሎቶች፣ ስለተጠርጣሪዎች መብት፣ ስለጠፉ ሰዎች ወይም ስለ ትራፊክ ደንቦች ተጨማሪ ማብራሪያ ከፈለጉ በግልጽ ይጠይቁኝ።`;
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
  // Check immediately if this is a tip and forward it in parallel
  const tipConfirmed = await detectAndForwardTip(userPrompt);
  if (tipConfirmed) {
    onChunk(tipConfirmed);
    return tipConfirmed;
  }

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
      const decoder = new TextDecoder('utf-8');
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          fullText += decoder.decode();
          break;
        }
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
