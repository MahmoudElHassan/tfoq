import { Compass, Eye } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useSiteContent } from "@/hooks/useSiteContent";

const aboutDefaults = {
  eyebrow: "من نحن",
  title: "منصة تفوّق التعليمية",
  body: "منصة تفوّق هي منصة تعليمية تفاعلية مخصصة لطالبات الثانوية الرابعة بصبيا، تهدف إلى تعزيز مهارات الطالبات في اختبارات التحصيلي والقدرات.",
  mission: "تمكين الطالبات من تحقيق أعلى الدرجات في اختبارات القياس عبر أدوات تعليمية حديثة.",
  vision: "أن نكون المنصة الأولى في تأهيل طالبات الثانوية لاختبارات التحصيلي والقدرات.",
};

const About = () => {
  const { content: about } = useSiteContent("about", aboutDefaults);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <section className="relative overflow-hidden py-14 sm:py-16 md:py-20">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -right-32 w-[26rem] h-[26rem] bg-accent/15 rounded-full blur-3xl animate-blob [animation-delay:-6s]" />

        <div className="container relative">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <span className="t-eyebrow text-primary">{about.eyebrow}</span>
            <h1 className="t-display text-foreground mt-2 sm:mt-3">{about.title}</h1>
            <p className="t-body text-muted-foreground mt-4 sm:mt-5 leading-loose whitespace-pre-line">
              {about.body}
            </p>
          </div>

          {(about.mission || about.vision) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
              {about.mission && (
                <div className="group rounded-2xl bg-card border border-border p-6 sm:p-7 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h2 className="t-h3 text-foreground mb-2">رسالتنا</h2>
                  <p className="t-small text-muted-foreground leading-relaxed whitespace-pre-line">
                    {about.mission}
                  </p>
                </div>
              )}
              {about.vision && (
                <div className="group rounded-2xl bg-card border border-border p-6 sm:p-7 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h2 className="t-h3 text-foreground mb-2">رؤيتنا</h2>
                  <p className="t-small text-muted-foreground leading-relaxed whitespace-pre-line">
                    {about.vision}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter />
    </div>
  );
};

export default About;
