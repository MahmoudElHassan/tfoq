import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Trophy, Users, BookOpen, Gauge, ShieldCheck, Award, Target } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/hooks/useSiteContent";
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
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-soft" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />

        <div className="container relative py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in order-2 lg:order-1">
            <img src={heroImg} alt="طالبات يتعلمن في منصة تفوق" width={1280} height={896}
              className="w-full rounded-3xl shadow-elegant border-4 border-card" />
          </div>

          <div className="animate-slide-in order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              {hero.badge}
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight text-balance">
              {hero.title_line1}
              <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2">{hero.title_line2}</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 leading-relaxed max-w-xl">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant gap-2 h-14 px-8 text-base">
                  {hero.cta_primary}
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-2">
                  {hero.cta_secondary}
                </Button>
              </a>
            </div>

            <div className="mt-10 grid grid-cols-4 gap-4">
              {(hero.stats ?? []).map((s: any) => (
                <div key={s.l} className="text-center">
                  <p className="font-display text-2xl md:text-3xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">{s.v}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-card">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">{feat.eyebrow}</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mt-3">
              {feat.title}
            </h2>
            <p className="text-muted-foreground mt-4">{feat.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              const toneCls: Record<string, string> = {
                primary: "bg-primary/10 text-primary",
                gold: "bg-accent/15 text-accent-foreground",
                info: "bg-info/10 text-info",
                success: "bg-success/10 text-success",
              };
              return (
                <div key={i} className="group relative p-7 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-elegant transition-all duration-300 hover:-translate-y-2">
                  <div className={`w-14 h-14 rounded-2xl ${toneCls[f.tone]} flex items-center justify-center mb-5`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gradient-soft">
        <div className="container">
          <div className="text-center mb-14">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">رحلتك في 3 خطوات</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mt-3">كيف تعمل المنصة؟</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { n: "١", t: "أنشئي حسابك", d: "سجّلي ببريدك الإلكتروني واختاري دورك (طالبة / ولية أمر / معلمة)", icon: ShieldCheck },
              { n: "٢", t: "ابدئي الاختبار", d: "أديري عجلة الأسئلة واختاري المادة وأجيبي عن الأسئلة", icon: Target },
              { n: "٣", t: "اجمعي النقاط", d: "تابعي ترتيبك في لوحة الشرف وتنافسي مع زميلاتك", icon: Award },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative bg-card rounded-2xl p-8 shadow-card border border-border text-center">
                  <div className="absolute -top-6 right-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center font-display font-extrabold text-xl text-accent-foreground shadow-elegant">
                    {step.n}
                  </div>
                  <Icon className="w-12 h-12 text-primary mx-auto mt-4 mb-4" />
                  <h3 className="font-display text-xl font-bold mb-2">{step.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 lg:p-16 text-center shadow-elegant">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-primary-foreground">
                مستعدة لتحقيق أعلى الدرجات؟
              </h2>
              <p className="text-primary-foreground/85 mt-4 max-w-xl mx-auto">
                انضمي اليوم إلى مئات الطالبات اللواتي يحضّرن لاختباراتهن بثقة عبر منصة تفوّق
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-elegant h-14 px-10 text-base font-bold">
                  سجّلي مجاناً الآن
                  <ArrowLeft className="w-5 h-5 mr-2" />
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
