import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const openUrl = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Direct call to system browser via window.open (extremely reliable in Capacitor webviews)
      window.open(url, '_system');
      
      // Also invoke the Browser plugin as a parallel standard method
      await Browser.open({ url }).catch((err) => {
        console.warn("Capacitor Browser.open failed, fallback to system webview window:", err);
      });
    } catch (e) {
      console.warn("Capacitor openUrl failed, calling direct window open:", e);
      window.open(url, '_system');
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const dialPhone = (phone: string) => {
  if (!phone) return;
  const sanitized = phone.replace(/[^\d+]/g, ''); // Keep digits and + sign
  
  if (Capacitor.isNativePlatform()) {
    // In Capacitor, the best way to handle tel links is often through window.open with _system
    window.open(`tel:${sanitized}`, '_system');
  } else {
    // For web, the hidden link approach is standard 
    const link = document.createElement('a');
    link.href = `tel:${sanitized}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  // Handle Firestore Timestamp object
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString();
  }
  
  // Handle JS Date or string
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};
