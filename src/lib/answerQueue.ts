// نظام حفظ آمن للإجابات مع:
// - تكرار محاولات بفترات متزايدة (exponential backoff)
// - قائمة انتظار محلية (offline queue) في localStorage
// - منع التكرار عبر مفاتيح فريدة
// - مزامنة تلقائية عند عودة الاتصال

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "tfoq_pending_answers_v1";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800;

export type PendingAnswer = {
  client_id: string; // مفتاح فريد لمنع التكرار
  question_id: string;
  selected_option: string;
  attempted_at: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readQueue = (): PendingAnswer[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeQueue = (q: PendingAnswer[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    // تجاهل أخطاء التخزين (مثل وضع التصفح الخاص)
  }
};

const removeFromQueue = (clientId: string) => {
  writeQueue(readQueue().filter((a) => a.client_id !== clientId));
};

const enqueue = (a: PendingAnswer) => {
  const q = readQueue();
  if (q.some((x) => x.client_id === a.client_id)) return;
  q.push(a);
  writeQueue(q);
};

/**
 * Send the attempt through the SECURITY DEFINER RPC. The server reads
 * correct_option + points from the questions table — the client cannot
 * inflate is_correct / points_earned.
 *
 * client_id UNIQUE makes the operation idempotent on retries and queue
 * flushes — repeating the same call returns the original row.
 */
const submitOnce = async (a: PendingAnswer): Promise<boolean> => {
  const { error } = await supabase.rpc("submit_quiz_attempt", {
    p_question_id: a.question_id,
    p_selected: a.selected_option,
    p_client_id: a.client_id,
  });
  return !error;
};

/**
 * يحفظ إجابة الطالبة مع كل الاحتياطات.
 * - يضع نسخة في localStorage فوراً
 * - يحاول الإرسال مع backoff عبر submit_quiz_attempt (آمن + متكرّر-آمن)
 * - عند الفشل يبقى في القائمة للمزامنة لاحقاً
 * - يُرجع true إذا حُفظت محلياً (دائماً) — الحفظ على الخادم قد يتأخر
 */
export const saveAnswer = async (a: {
  question_id: string;
  selected_option: string;
  client_id?: string;
}) => {
  const payload: PendingAnswer = {
    client_id: a.client_id ?? crypto.randomUUID(),
    question_id: a.question_id,
    selected_option: a.selected_option,
    attempted_at: new Date().toISOString(),
  };

  enqueue(payload);

  // محاولة فورية مع backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (!navigator.onLine) break;
    const ok = await submitOnce(payload);
    if (ok) {
      removeFromQueue(payload.client_id);
      return { saved: true, queued: false, client_id: payload.client_id };
    }
    await sleep(BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200);
  }

  // الإجابة لا تزال في القائمة، ستُرسَل تلقائياً
  return { saved: false, queued: true, client_id: payload.client_id };
};

/**
 * مزامنة كل الإجابات المعلّقة. تُستدعى عند:
 * - تحميل الصفحة
 * - عودة الاتصال بالإنترنت
 */
export const flushQueue = async () => {
  const q = readQueue();
  if (q.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  for (const a of q) {
    if (!navigator.onLine) break;
    const ok = await submitOnce(a);
    if (ok) {
      removeFromQueue(a.client_id);
      flushed++;
    }
  }
  return { flushed, remaining: readQueue().length };
};

export const getQueueSize = () => readQueue().length;

// مزامنة تلقائية عند عودة الاتصال
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushQueue();
  });
}
