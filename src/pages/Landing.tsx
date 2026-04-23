import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Trophy, Users, BookOpen, Gauge, ShieldCheck, Award, Target } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-students.jpg";

const features = [
  { icon: Gauge, title: "عجلة الاختبارات", desc: "اختبري مهاراتك عبر عجلة تفاعلية تختار أسئلة عشوائية من بنك الأسئلة", tone: "primary" },
  { icon: Trophy, title: "نظام النقاط والترتيب", desc: "اجمعي النقاط من الإجابات الصحيحة وتنافسي مع زميلاتك على لوحة الترتيب", tone: "gold" },
  { icon: BookOpen, title: "بنك أسئلة شامل", desc: "أسئلة تحصيلي علمي وأدبي + قدرات كمي ولفظي معتمدة من معلماتك", tone: "info" },
  { icon: Users, title: "حساب ولي الأمر", desc: "تابع/ي أداء الطالبة، نقاطها وترتيبها بشكل مستمر ومفصّل", tone: "success" },
];

const heroDefaults = {
  badge: "منصة تعليمية معتمدة لطالبات الثانوية",
  title_line1: "تفوّقي في",
  title_line2: "التحصيلي والقدرات",
  description: "منصة تفاعلية متكاملة تساعدك على إتقان مهارات اختبارَي التحصيلي والقدرات عبر عجلة أسئلة ذكية، نظام نقاط، ولوحة ترتيب محفّزة.",
  cta_primary: "ابدئي رحلتك الآن",
  cta_secondary: "استكشفي المميزات",
  image_url: "",
  gradient_from: "#006B3A",
  gradient_to: "#1F8B5C",
  gradient_angle: 135,
  stats: [
    { v: "1,200+", l: "طالبة مسجلة" },
    { v: "5,000+", l: "سؤال تفاعلي" },
    { v: "60+", l: "معلمة" },
    { v: "98%", l: "رضا الطالبات" },
  ],
};

const featuresDefaults = {
  eyebrow: "مميزات المنصة",
  title: "كل ما تحتاجينه للتفوّق في مكان واحد",
  subtitle: "أدوات تعليمية حديثة مصممة خصيصاً لطالبات المرحلة الثانوية",
};

const Landing = () => {
  const { content: hero } = useSiteContent("hero", heroDefaults);
  const { content: feat } = useSiteContent("features_section", featuresDefaults);
  const [liveStats, setLiveStats] = useState<{ v: string; l: string }[] | null>(null);

  // Fetch real counts as a guaranteed fallback so stats are NEVER empty
  useEffect(() => {
    (async () => {
      try {
        const [students, questions, teachers] = await Promise.all([
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("questions").select("id", { count: "exact", head: true }),
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "teacher"),
        ]);
        setLiveStats([
          { v: `${students.count ?? 0}+`, l: "طالبة مسجلة" },
          { v: `${questions.count ?? 0}+`, l: "سؤال تفاعلي" },
          { v: `${teachers.count ?? 0}+`, l: "معلمة" },
          { v: "100%", l: "رضا الطالبات" },
        ]);
      } catch {
        // ignore — fallback to hero.stats
      }
    })();
  }, []);

  // Stats source priority: admin-edited stats → live DB stats → defaults
  const stats: { v: string; l: string }[] =
    Array.isArray(hero.stats) && hero.stats.length > 0
      ? hero.stats
      : liveStats ?? heroDefaults.stats;

  const heroImage = hero.image_url && hero.image_url.length > 0 ? hero.image_url : heroImg;

  // Safe gradient style — applied inline so admin colors render reliably on mobile WebKit
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${hero.gradient_angle ?? 135}deg, ${hero.gradient_from ?? "#006B3A"}, ${hero.gradient_to ?? "#1F8B5C"})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Soft ambient backdrop (kept subtle, no green block) */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/40" />
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -right-32 w-[26rem] h-[26rem] bg-accent/15 rounded-full blur-3xl animate-blob [animation-delay:-6s]" />

        <div className="container relative py-8 sm:py-12 md:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 lg:gap-12 items-center">
          {/* TEXT — first on mobile, right side on desktop */}
          <div className="animate-rise order-1 lg:order-2 lg:col-span-6 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-5">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {hero.badge}
            </div>
            <h1 className="t-display text-foreground text-balance">
              {hero.title_line1}
              <span className="block mt-1.5 sm:mt-2 font-display" style={gradientStyle}>
                {hero.title_line2}
              </span>
            </h1>
            <p className="t-lead text-muted-foreground mt-4 sm:mt-5 max-w-xl mx-auto lg:mx-0">
              {hero.description}
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 sm:gap-3 mt-6 sm:mt-7">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant gap-2 h-11 sm:h-12 md:h-13 px-5 sm:px-6 md:px-7 text-sm sm:text-base">
                  {hero.cta_primary}
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-11 sm:h-12 md:h-13 px-5 sm:px-6 md:px-7 text-sm sm:text-base border-2">
                  {hero.cta_secondary}
                </Button>
              </a>
            </div>
          </div>

          {/* IMAGE — visible on all sizes, balanced sizing */}
          <div className="animate-fade-in order-2 lg:order-1 lg:col-span-6">
            <div className="relative mx-auto max-w-sm sm:max-w-md md:max-w-xl lg:max-w-none">
              <div className="absolute -inset-3 sm:-inset-4 bg-gradient-primary opacity-20 blur-2xl rounded-3xl" />
              <img
                src={heroImage}
                alt="طالبات يتعلمن في منصة تفوق"
                width={1280}
                height={896}
                loading="eager"
                className="relative w-full aspect-[4/3] object-cover rounded-2xl sm:rounded-3xl shadow-elegant border-2 sm:border-4 border-card animate-float-slow"
              />
            </div>
          </div>
        </div>

        {/* Stats — static cards grid (replaces marquee) */}
        <div className="container relative pb-10 sm:pb-14 lg:pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 max-w-5xl mx-auto animate-fade-in">
            {stats.map((s, idx) => (
              <div
                key={idx}
                style={{ animationDelay: `${idx * 80}ms` }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5 md:p-6 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 animate-rise text-center"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary opacity-70" />
                <p className="t-stat" style={gradientStyle}>
                  {s.v}
                </p>
                <p className="t-stat-label text-muted-foreground mt-1.5 sm:mt-2">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-14 sm:py-16 md:py-20 bg-card">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 md:mb-14">
            <span className="t-eyebrow text-primary">{feat.eyebrow}</span>
            <h2 className="t-h1 text-foreground mt-2 sm:mt-3">
              {feat.title}
            </h2>
            <p className="t-body text-muted-foreground mt-3 sm:mt-4">{feat.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              const toneCls: Record<string, string> = {
                primary: "bg-primary/10 text-primary",
                gold: "bg-accent/15 text-accent-foreground",
                info: "bg-info/10 text-info",
                success: "bg-success/10 text-success",
              };
              return (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="group relative p-5 sm:p-6 md:p-7 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 animate-rise"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${toneCls[f.tone]} flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="t-h4 text-foreground mb-1.5 sm:mb-2">{f.title}</h3>
                  <p className="t-small text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-14 sm:py-16 md:py-20 bg-gradient-soft">
        <div className="container">
          <div className="text-center mb-10 sm:mb-12 md:mb-14">
            <span className="t-eyebrow text-primary">رحلتك في 3 خطوات</span>
            <h2 className="t-h1 text-foreground mt-2 sm:mt-3">كيف تعمل المنصة؟</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              { n: "١", t: "أنشئي حسابك", d: "سجّلي ببريدك الإلكتروني واختاري دورك (طالبة / ولية أمر / معلمة)", icon: ShieldCheck },
              { n: "٢", t: "ابدئي الاختبار", d: "أديري عجلة الأسئلة واختاري المادة وأجيبي عن الأسئلة", icon: Target },
              { n: "٣", t: "اجمعي النقاط", d: "تابعي ترتيبك في لوحة الشرف وتنافسي مع زميلاتك", icon: Award },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 120}ms` }}
                  className="relative bg-card rounded-2xl p-6 sm:p-7 md:p-8 shadow-card border border-border text-center animate-rise hover:shadow-elegant transition-shadow duration-300"
                >
                  <div className="absolute -top-5 sm:-top-6 right-1/2 translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-gold flex items-center justify-center font-display font-extrabold text-lg sm:text-xl text-accent-foreground shadow-elegant">
                    {step.n}
                  </div>
                  <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mt-3 sm:mt-4 mb-3 sm:mb-4" />
                  <h3 className="t-h3 mb-1.5 sm:mb-2">{step.t}</h3>
                  <p className="t-small text-muted-foreground">{step.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-16 md:py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-primary p-7 sm:p-10 lg:p-16 text-center shadow-elegant animate-rise">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            <div className="relative">
              <h2 className="t-h1 text-primary-foreground">
                مستعدة لتحقيق أعلى الدرجات؟
              </h2>
              <p className="t-body text-primary-foreground/85 mt-3 sm:mt-4 max-w-xl mx-auto">
                انضمي اليوم إلى مئات الطالبات اللواتي يحضّرن لاختباراتهن بثقة عبر منصة تفوّق
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="mt-6 sm:mt-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-elegant h-12 sm:h-14 px-7 sm:px-10 text-sm sm:text-base font-bold">
                  سجّلي مجاناً الآن
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
