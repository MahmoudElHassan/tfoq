import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROUTES = new Set([
  "/auth",
  "/student",
  "/quiz",
  "/leaderboard",
  "/parent",
  "/dashboard",
]);

const ROUTE_MAP = [
  { path: "/auth", label: "التسجيل وتسجيل الدخول" },
  { path: "/student", label: "لوحة الطالب" },
  { path: "/quiz", label: "عجلة الاختبارات" },
  { path: "/leaderboard", label: "لوحة الترتيب" },
  { path: "/parent", label: "لوحة ولي الأمر" },
  { path: "/dashboard", label: "لوحة التحكم" },
];

const GUEST_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 20;
const COOLDOWN_SECONDS = 4;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

type HistoryMessage = { role: "user" | "assistant"; content: string };

type ResolvedIdentity = {
  subjectType: "guest" | "user";
  subjectKey: string;
  dailyLimit: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Decode JWT payload without verifying — used only to skip anon/service keys. */
function peekJwtRole(jwt: string): string | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Resolve quota identity:
 * - Valid authenticated user JWT → user:<uuid>, limit 20 (isolated per account)
 * - Otherwise guest → ip:<sha256>, limit 5 (isolated per hashed IP)
 *
 * When serving locally against a remote-auth frontend, also try
 * VITE_SUPABASE_URL so cloud session JWTs still map to per-user quotas.
 */
async function resolveIdentity(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  ipSalt: string,
): Promise<{ ok: true; identity: ResolvedIdentity } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (bearer && bearer !== anonKey) {
    const role = peekJwtRole(bearer);
    // Only attempt user resolution for authenticated (or unknown) tokens — never anon/service.
    if (role !== "anon" && role !== "service_role") {
      const authTargets: Array<{ url: string; key: string }> = [
        { url: supabaseUrl, key: anonKey },
      ];
      const remoteUrl = Deno.env.get("VITE_SUPABASE_URL")?.trim();
      const remoteAnon = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")?.trim();
      if (remoteUrl && remoteAnon && remoteUrl !== supabaseUrl) {
        authTargets.unshift({ url: remoteUrl, key: remoteAnon });
      }

      for (const target of authTargets) {
        try {
          const userClient = createClient(target.url, target.key, {
            global: { headers: { Authorization: `Bearer ${bearer}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: { user }, error } = await userClient.auth.getUser(bearer);
          if (!error && user?.id) {
            return {
              ok: true,
              identity: {
                subjectType: "user",
                subjectKey: `user:${user.id}`,
                dailyLimit: USER_DAILY_LIMIT,
              },
            };
          }
        } catch {
          // try next auth target
        }
      }
    }
  }

  const ip = extractClientIp(req, supabaseUrl);
  if (!ip) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          code: "GUEST_IP_UNAVAILABLE",
          message: "تعذّر التحقق من الاتصال. استخدم الأسئلة الشائعة أو سجّل الدخول.",
        },
        400,
      ),
    };
  }

  const hashed = await hashIp(ipSalt, ip);
  return {
    ok: true,
    identity: {
      subjectType: "guest",
      subjectKey: `ip:${hashed}`,
      dailyLimit: GUEST_DAILY_LIMIT,
    },
  };
}

function extractClientIp(req: Request, supabaseUrl: string): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  // Local Supabase edge runtime often omits forwarded IP headers.
  if (/127\.0\.0\.1|localhost/.test(supabaseUrl)) return "127.0.0.1";
  return null;
}

async function hashIp(salt: string, ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function validateHistory(raw: unknown): HistoryMessage[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const trimmed = raw.slice(-6);
  const out: HistoryMessage[] = [];
  for (const item of trimmed) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const c = content.trim().slice(0, 1000);
    if (!c) return null;
    out.push({ role, content: c });
  }
  return out;
}

function buildFaqContext(
  rows: Array<{ question: string; answer: string; keywords?: string[] | null }>,
): string {
  let context = "";
  const limit = 8000;
  let count = 0;
  for (const row of rows) {
    if (count >= 20) break;
    const kw = (row.keywords ?? []).filter(Boolean).join(", ");
    const block =
      `س: ${row.question}\n` +
      `ج: ${row.answer}` +
      (kw ? `\nكلمات: ${kw}` : "") +
      "\n\n";
    if (context.length + block.length > limit) break;
    context += block;
    count += 1;
  }
  return context.trim();
}

function buildSystemPrompt(faqContext: string): string {
  const routes = ROUTE_MAP.map((r) => `- ${r.path} — ${r.label}`).join("\n");
  return [
    "أنت مساعد ذكي لمنصة تفوق التعليمية (Tfoq).",
    "أجب بالعربية الفصحى المبسطة وباختصار.",
    "أجب فقط عن منصة تفوق، صفحاتها، الأسئلة الشائعة، التحضير للتحصيلي والقدرات، واستخدام ميزات المنصة.",
    "ارفض الأسئلة غير المرتبطة بالمنصة، أو الطلبات غير الآمنة، أو طلبات كلمات المرور والرموز والبيانات الحساسة.",
    "لا تدّعِ القدرة على تعديل بيانات أو صلاحيات إدارية.",
    "اعتمد على حقائق الأسئلة الشائعة أدناه عند الإمكان، وقل بوضوح إذا لم تتوفر المعلومة.",
    "",
    "صفحات المنصة المتاحة:",
    routes,
    "",
    "الأسئلة الشائعة:",
    faqContext || "(لا توجد أسئلة شائعة متاحة حالياً)",
    "",
    'أعد JSON فقط بهذا الشكل: {"reply":"...","route":null,"routeLabel":null}',
    "ضع route فقط من القائمة أعلاه أو null. routeLabel نص عربي قصير للزر.",
  ].join("\n");
}

function parseAssistantPayload(raw: string): { reply: string; route: string | null; routeLabel: string | null } {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as {
      reply?: unknown;
      route?: unknown;
      routeLabel?: unknown;
    };
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : trimmed;
    let route: string | null = typeof parsed.route === "string" ? parsed.route.trim() : null;
    let routeLabel: string | null =
      typeof parsed.routeLabel === "string" ? parsed.routeLabel.trim().slice(0, 80) : null;
    if (route && !ALLOWED_ROUTES.has(route)) {
      route = null;
      routeLabel = null;
    }
    return { reply: reply.slice(0, 2000), route, routeLabel };
  } catch {
    return { reply: trimmed.slice(0, 2000), route: null, routeLabel: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "METHOD_NOT_ALLOWED", message: "طريقة غير مدعومة." }, 405);
  }

  try {

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    const ipSalt = Deno.env.get("ASSISTANT_IP_HASH_SALT");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!deepseekKey || !ipSalt || !supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
        },
        500,
      );
    }

    let body: { message?: unknown; history?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, code: "INVALID_REQUEST", message: "طلب غير صالح." }, 400);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 1 || message.length > 1000) {
      return jsonResponse({ ok: false, code: "INVALID_REQUEST", message: "الرسالة غير صالحة." }, 400);
    }

    const history = validateHistory(body.history);
    if (history === null) {
      return jsonResponse({ ok: false, code: "INVALID_REQUEST", message: "سجل المحادثة غير صالح." }, 400);
    }

    let subjectType: "guest" | "user" = "guest";
    let subjectKey = "";
    let dailyLimit = GUEST_DAILY_LIMIT;

    const resolved = await resolveIdentity(req, supabaseUrl, anonKey, ipSalt);
    if (!resolved.ok) return resolved.response;
    subjectType = resolved.identity.subjectType;
    subjectKey = resolved.identity.subjectKey;
    dailyLimit = resolved.identity.dailyLimit;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: quotaRows, error: quotaError } = await admin.rpc("reserve_chatbot_ai_quota", {
      p_subject_key: subjectKey,
      p_subject_type: subjectType,
      p_daily_limit: dailyLimit,
      p_cooldown_seconds: COOLDOWN_SECONDS,
    });

    if (quotaError) {
      return jsonResponse(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
        },
        500,
      );
    }

    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) {
      if (quota?.reason === "rate_limit") {
        return jsonResponse(
          {
            ok: false,
            code: "RATE_LIMIT",
            message: "يرجى الانتظار قليلاً قبل إرسال سؤال جديد.",
            retryAfterSeconds: quota.retry_after_seconds ?? COOLDOWN_SECONDS,
          },
          429,
        );
      }
      return jsonResponse(
        {
          ok: false,
          code: "DAILY_LIMIT",
          message:
            "تم استهلاك الحد اليومي للمساعد الذكي. يمكنك متابعة استخدام الأسئلة الشائعة والمحاولة غداً.",
          remaining: 0,
        },
        429,
      );
    }

    const { data: faqRows } = await admin
      .from("faq_entries")
      .select("question, answer, keywords")
      .eq("is_active", true)
      .order("sort_order")
      .limit(20);

    const faqContext = buildFaqContext(
      (faqRows ?? []) as Array<{ question: string; answer: string; keywords?: string[] | null }>,
    );
    const systemPrompt = buildSystemPrompt(faqContext);

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    let providerRes: Response;
    try {
      providerRes = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          stream: false,
          max_tokens: 400,
          temperature: 0.2,
          messages: chatMessages,
        }),
        signal: controller.signal,
      });
    } catch {
      return jsonResponse(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
        },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!providerRes.ok) {
      return jsonResponse(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
        },
        502,
      );
    }

    const providerJson = await providerRes.json();
    const content = providerJson?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return jsonResponse(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
        },
        502,
      );
    }

    const parsed = parseAssistantPayload(content);
    const totalTokens = Number(providerJson?.usage?.total_tokens ?? 0);
    if (totalTokens > 0) {
      await admin.rpc("record_chatbot_ai_tokens", {
        p_subject_key: subjectKey,
        p_tokens: totalTokens,
      });
    }

    return jsonResponse({
      ok: true,
      reply: parsed.reply,
      route: parsed.route,
      routeLabel: parsed.routeLabel,
      remaining: quota.remaining ?? 0,
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "المساعد الذكي غير متاح مؤقتاً. جرّب أحد الأسئلة الشائعة.",
      },
      500,
    );
  }
});
