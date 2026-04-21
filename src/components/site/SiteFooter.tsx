import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const defaults = {
  brand_name: "منصة تفوّق",
  brand_subtitle: "ثانوية الطالبات",
  about: "منصة تعليمية تفاعلية مخصصة لطالبات المرحلة الثانوية لتعزيز مهاراتهن في اختبارات التحصيلي والقدرات عبر أدوات حديثة وممتعة.",
  email: "info@tafawuq.edu.sa",
  phone: "+966 11 000 0000",
  address: "المملكة العربية السعودية",
  copyright: "منصة تفوّق - جميع الحقوق محفوظة | بدعم من وزارة التعليم",
};

export const SiteFooter = () => {
  const { content: f } = useSiteContent("footer", defaults);
  return (
    <footer className="bg-sidebar text-sidebar-foreground mt-20">
      <div className="container py-14 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-xl font-extrabold">{f.brand_name}</p>
              <p className="text-xs text-sidebar-foreground/70">{f.brand_subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-sidebar-foreground/80 leading-relaxed max-w-md">
            {f.about}
          </p>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4 text-sidebar-primary">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li><a href="/" className="hover:text-sidebar-primary">الرئيسية</a></li>
            <li><a href="/#features" className="hover:text-sidebar-primary">المميزات</a></li>
            <li><a href="/leaderboard" className="hover:text-sidebar-primary">لوحة الترتيب</a></li>
            <li><a href="/auth" className="hover:text-sidebar-primary">تسجيل الدخول</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4 text-sidebar-primary">تواصل معنا</h4>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-2"><Mail className="w-4 h-4" />{f.email}</li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4" />{f.phone}</li>
            <li className="flex items-center gap-2"><MapPin className="w-4 h-4" />{f.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="container py-5 text-center text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} {f.copyright}
        </div>
      </div>
    </footer>
  );
};
