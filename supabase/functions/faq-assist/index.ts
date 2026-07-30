import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const DAILY_LIMIT_GUEST = 10
const DAILY_LIMIT_USER = 30
const COOLDOWN_SECONDS = 4
const MAX_CHARS = 2000
const MAX_HISTORY = 10

const SYSTEM_PROMPT = `أنت مساعد تعليمي ذكي لمنصة اختبارات (تحصيلي وقدرات) للطالبات.
- أجب دائماً بالعربية الفصحى المبسطة.
- ساعد في شرح المفاهيم وحل الأسئلة خطوة بخطوة.
- لا تعطِ إجابات نهائية لاختبار جارٍ بل وجّه الطالبة للتفكير.
- كن مختصراً وواضحاً.`

// ---- Local FAQ matching (runs first, no AI cost) ----
const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['تسجيل', 'حساب جديد', 'انشاء حساب', 'إنشاء حساب'],
    answer: 'يمكنكِ إنشاء حساب من صفحة "تسجيل الدخول" ثم اختيار "حساب جديد" وتعبئة الاسم والبريد والصف.',
  },
  {
    keywords: ['نسيت', 'كلمة المرور', 'استعادة'],
    answer: 'لاستعادة كلمة المرور، اذهبي لصفحة تسجيل الدخول واضغطي "نسيت كلمة المرور" وسيصلكِ رابط على بريدك.',
  },
  {
    keywords: ['نقاط', 'النقاط', 'ترتيب', 'المتصدرين', 'لوحة الشرف'],
    answer: 'تحصلين على نقاط عند كل إجابة صحيحة، ويظهر ترتيبك في صفحة "المتصدرات" التي تُحدَّث بشكل دوري.',
  },
  {
    keywords: ['ولي الأمر', 'ولي الامر', 'ربط', 'الأب', 'الأم'],
    answer: 'يستطيع ولي الأمر إنشاء حساب ثم ربط الطالبة عبر بريدها الإلكتروني من صفحة "لوحة ولي الأمر".',
  },
  {
    keywords: ['اختبار', 'كيف أبدأ', 'ابدأ الاختبار'],
    answer: 'اختاري المادة من الصفحة الرئيسية ثم اضغطي "ابدأ الاختبار"، وستُحفظ إجاباتك تلقائياً أثناء الحل.',
  },
]

function normalize(s: string) {
  return s
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchFaq(message: string): string | null {
  const m = normalize(message)
  let best: { answer: string; score: number } | null = null
  for (const item of FAQ) {
    let score = 0
    for (const k of item.keywords) if (m.includes(normalize(k))) score++
    if (score > 0 && (!best || score > best.score)) best = { answer: item.answer, score }
  }
  return best?.answer ?? null
}

async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => null)
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message || message.length > MAX_CHARS) {
      return json({ error: 'الرسالة غير صالحة' }, 400)
    }

    const rawHistory = Array.isArray(body?.history) ? body.history.slice(-MAX_HISTORY) : []
    const history: { role: string; content: string }[] = []
    for (const h of rawHistory) {
      if (!h || (h.role !== 'user' && h.role !== 'assistant')) continue
      const content = typeof h.content === 'string' ? h.content.trim() : ''
      if (content && content.length <= MAX_CHARS) history.push({ role: h.role, content })
    }

    // 1) Local FAQ first — free, instant, no quota consumed
    const faq = matchFaq(message)
    if (faq) return json({ reply: faq, source: 'faq' })

    // 2) AI fallback
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    const salt = Deno.env.get('ASSISTANT_IP_HASH_SALT')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!apiKey || !salt || !supabaseUrl || !serviceKey) {
      return json({ error: 'الخدمة غير مهيأة بشكل صحيح' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    let subjectKey: string | null = null
    let subjectType: 'user' | 'guest' = 'guest'
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data } = await admin.auth.getUser(token)
      if (data?.user) {
        subjectKey = `user:${data.user.id}`
        subjectType = 'user'
      }
    }
    if (!subjectKey) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('cf-connecting-ip') ||
        'unknown'
      subjectKey = `ip:${await hashIp(ip, salt)}`
    }

    const dailyLimit = subjectType === 'user' ? DAILY_LIMIT_USER : DAILY_LIMIT_GUEST
    const { data: quota, error: quotaError } = await admin.rpc('reserve_chatbot_ai_quota', {
      p_subject_key: subjectKey,
      p_subject_type: subjectType,
      p_daily_limit: dailyLimit,
      p_cooldown_seconds: COOLDOWN_SECONDS,
    })
    if (quotaError) {
      console.error('quota error', quotaError)
      return json({ error: 'تعذّر التحقق من الحصة' }, 500)
    }
    const q = Array.isArray(quota) ? quota[0] : quota
    if (!q?.allowed) {
      if (q?.reason === 'rate_limit') {
        return json(
          {
            error: `الرجاء الانتظار ${q.retry_after_seconds} ثانية قبل إرسال رسالة جديدة`,
            reason: 'rate_limit',
            retryAfter: q.retry_after_seconds,
          },
          429,
        )
      }
      return json(
        { error: 'لقد استنفدت عدد الرسائل المسموح بها اليوم، حاولي غداً', reason: 'daily_limit', remaining: 0 },
        429,
      )
    }

    const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
          { role: 'user', content: message },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!aiRes.ok) {
      const text = await aiRes.text()
      console.error('deepseek error', aiRes.status, text)
      if (aiRes.status === 429) return json({ error: 'الخدمة مزدحمة حالياً، حاولي بعد قليل' }, 429)
      if (aiRes.status === 402) return json({ error: 'رصيد خدمة الذكاء الاصطناعي غير كافٍ' }, 402)
      return json({ error: 'تعذّر الحصول على رد من المساعد', reason: 'upstream' }, 502)
    }

    const data = await aiRes.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? ''
    const tokens: number = data?.usage?.total_tokens ?? 0
    if (tokens > 0) {
      await admin.rpc('record_chatbot_ai_tokens', { p_subject_key: subjectKey, p_tokens: tokens })
    }

    return json({ reply, source: 'ai', remaining: q.remaining })
  } catch (e) {
    console.error('faq-assist error', e)
    return json({ error: 'حدث خطأ غير متوقع' }, 500)
  }
})
