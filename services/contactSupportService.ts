import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface ContactFormData {
  issueType: string;
  description: string;
  userEmail: string;
  uid: string;
}

/**
 * 將客服表單寫入 Firestore support_tickets，並可搭配 Firebase Extension (Trigger Email) 發送真實信件至管理員信箱。
 * 若已設定 EmailJS，可同時呼叫 sendViaEmailJS 發送即時信件。
 */
export async function submitContactForm(data: ContactFormData): Promise<void> {
  const ticket = {
    uid: data.uid,
    type: data.issueType,
    description: data.description,
    userEmail: data.userEmail,
    status: 'open',
    timestamp: serverTimestamp()
  };
  const col = collection(db, 'support_tickets');
  await addDoc(col, ticket);
}

/**
 * 透過 EmailJS 發送即時信件至管理員信箱（需在 .env 設定 VITE_EMAILJS_*）。
 * 若未設定，僅寫入 Firestore，可搭配 Firebase Extension「Trigger Email from Firestore」發送信件。
 */
export async function sendContactEmailViaEmailJS(data: ContactFormData): Promise<boolean> {
  const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID;
  const templateId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return false;
  }

  try {
    const emailjs = await import('@emailjs/browser');
    await emailjs.init(publicKey);
    await emailjs.send(serviceId, templateId, {
      user_email: data.userEmail,
      user_uid: data.uid,
      issue_type: data.issueType,
      description: data.description
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 將 AI 客服對話紀錄透過 EmailJS 發送給管理員。
 */
export async function sendTranscriptToAdmin(
  transcript: string,
  userEmail: string,
  uid: string
): Promise<boolean> {
  return sendContactEmailViaEmailJS({
    issueType: 'chat_transcript',
    description: transcript,
    userEmail,
    uid,
  });
}
