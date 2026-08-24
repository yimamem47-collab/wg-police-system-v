import { Capacitor } from '@capacitor/core';
import { getApiUrl } from './apiConfig';

const DIRECT_BOT_TOKEN = "8914963503:AAEnBeYX8qbRCKG6SUVkC2BUK9OqTvq0p_I";
const DIRECT_CHAT_ID = "-1004319753390";

/**
 * Sends a message to Telegram with robust fallbacks:
 * 1. Tries backend proxy (/api/telegram)
 * 2. If proxy fails, returns HTML auth challenge, or running on native mobile, sends directly via Telegram Bot API
 */
export async function sendTelegramMessage(message: string, retries = 2): Promise<boolean> {
  // Method 1: Try direct Telegram Bot API first on native mobile (Capacitor)
  // because Cloud Run preview proxies require browser cookies that Android APK doesn't have.
  if (Capacitor.isNativePlatform()) {
    const directSuccess = await sendDirectToTelegram(message);
    if (directSuccess) return true;
  }

  // Method 2: Try Backend Proxy on Web
  const url = getApiUrl('/api/telegram');
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          html: true
        })
      });

      const contentType = response.headers.get('content-type') || '';
      
      // If response is HTML (e.g. Google Cloud Run auth cookie verification page), fallback to direct API
      if (contentType.includes('text/html')) {
        console.warn("Proxy returned HTML auth page, falling back to direct Telegram API.");
        return await sendDirectToTelegram(message);
      }

      if (response.ok) {
        console.log('Telegram message sent via proxy successfully');
        return true;
      }
      
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Not JSON
      }
      console.error(`Telegram Proxy error (Attempt ${i + 1}):`, errorData);
      
      // If server returns a parse error, try plain text
      if (errorData.description && errorData.description.includes('can\'t parse entities')) {
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.replace(/<[^>]*>?/gm, ''),
            html: false
          })
        });
        if (retryResponse.ok) return true;
      }
    } catch (error: any) {
      console.error(`Telegram Proxy fetch error (Attempt ${i + 1}):`, error.message || error);
      // If fetch fails (CORS, network error, offline), try direct Telegram Bot API
      const directSuccess = await sendDirectToTelegram(message);
      if (directSuccess) return true;

      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  
  // Final fallback to direct Telegram API
  return await sendDirectToTelegram(message);
}

/**
 * Direct Telegram Bot API Dispatcher (bypasses all backend proxies, works on native Android)
 */
async function sendDirectToTelegram(message: string): Promise<boolean> {
  if (!DIRECT_BOT_TOKEN || !DIRECT_CHAT_ID) {
    console.warn("Direct Telegram credentials not found.");
    return false;
  }

  const directUrl = `https://api.telegram.org/bot${DIRECT_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: DIRECT_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (response.ok) {
      console.log('Telegram message sent directly to Bot API successfully');
      return true;
    }

    // If HTML parsing failed on Telegram side, send plain text
    const plainText = message.replace(/<[^>]*>?/gm, '');
    const plainResponse = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: DIRECT_CHAT_ID,
        text: plainText
      })
    });

    return plainResponse.ok;
  } catch (directErr) {
    console.error("Direct Telegram dispatch error:", directErr);
    return false;
  }
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatIncidentMessage(incident: any, type: 'Incident' | 'Report', isUpdate: boolean = false) {
  const emoji = incident.type === 'Crime' ? '🚨' : '🚗';
  const action = isUpdate ? 'Updated' : 'New';
  
  // If it's a citizen report, use the user's requested format
  if (incident.officerId === 'citizen') {
    return `🚨 አዲስ የፖሊስ ጥቆማ፦\n\n<b>Title:</b> ${escapeHtml(incident.title)}\n<b>Type:</b> ${escapeHtml(incident.type)}\n<b>Category:</b> ${escapeHtml(incident.category)}\n<b>Location:</b> ${escapeHtml(incident.location)}\n<b>Description:</b>\n${escapeHtml(incident.description || 'No description provided')}`;
  }

  const header = type === 'Incident' ? `<b>${action} Incident Reported</b>` : `<b>${action} Case Report Submitted</b>`;
  
  return `
${emoji} ${header}
---------------------------
<b>Title:</b> ${escapeHtml(incident.title)}
<b>Status:</b> ${escapeHtml(incident.status)}
<b>Type:</b> ${escapeHtml(incident.type)}
<b>Category:</b> ${escapeHtml(incident.category)}
<b>Location:</b> ${escapeHtml(incident.location)}
<b>Date:</b> ${escapeHtml(incident.date)}
<b>Station:</b> ${escapeHtml(incident.filingStation)}
<b>Officer:</b> ${escapeHtml(incident.recordingOfficerRank || '')} ${escapeHtml(incident.recordingOfficerName || '')}
---------------------------
<b>Description:</b>
${escapeHtml(incident.description || 'No description provided')}
  `.trim();
}

export function formatOfficerMessage(officer: any, isUpdate: boolean = false) {
  const action = isUpdate ? 'Updated' : 'New';
  return `
👮 <b>${action} Officer Profile</b>
---------------------------
<b>Name:</b> ${escapeHtml(officer.name)}
<b>Rank:</b> ${escapeHtml(officer.rank)}
<b>Badge #:</b> ${escapeHtml(officer.badgeNumber)}
<b>Station:</b> ${escapeHtml(officer.station)}
<b>Phone:</b> ${escapeHtml(officer.phone)}
<b>Email:</b> ${escapeHtml(officer.email)}
<b>Status:</b> ${escapeHtml(officer.status)}
  `.trim();
}

export function formatAssignmentMessage(assignment: any, isUpdate: boolean = false) {
  const action = isUpdate ? 'Updated' : 'New';
  return `
📋 <b>${action} Duty Assignment</b>
---------------------------
<b>Title:</b> ${escapeHtml(assignment.title)}
<b>Type:</b> ${escapeHtml(assignment.type)}
<b>Priority:</b> ${escapeHtml(assignment.priority)}
<b>Status:</b> ${escapeHtml(assignment.status)}
<b>Location:</b> ${escapeHtml(assignment.location)}
<b>Officer ID:</b> ${escapeHtml(assignment.officerId)}
<b>Due Date:</b> ${escapeHtml(assignment.dueDate)}
  `.trim();
}
