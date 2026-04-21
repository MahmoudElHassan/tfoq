import { Plus, Search, Filter, MoreVertical, BookOpen, Calculator, Languages, FlaskConical, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const subjects = [
  { id: "all", label: "الكل", icon: BookOpen, count: 1284 },
  { id: "quant", label: "قدرات - كمي", icon: Calculator, count: 342 },
  { id: "verbal", label: "قدرات - لفظي", icon: Languages, count: 298 },
  { id: "science", label: "تحصيلي - علمي", icon: FlaskConical, count: 384 },
  { id: "lit", label: "تحصيلي - أدبي", icon: ScrollText, count: 260 },
];

const questions = [
  { id: 1, q: "ما ناتج جمع المتتالية الحسابية: ٢ + ٤ + ٦ + ... + ١٠٠؟", subject: "قدرات - كمي", level: "متوسط", status: "منشور", teacher: "أ. سارة المطيري" },
  { id: 2, q: "أكمل: العلم نور و... ظلام", subject: "قدرات - لفظي", level: "سهل", status: "مراجعة", teacher: "أ. هند العتيبي" },
  { id: 3, q: "اشرح قانون أوم وعلاقته بالتيار الكهربائي", subject: "تحصيلي - علمي", level: "صعب", status: "منشور", teacher: "أ. ريم القحطاني" },
  { id: 4, q: "ما العوامل التي أدت إلى قيام الدولة السعودية الأولى؟", subject: "تحصيلي - أدبي", level: "متوسط", status: "مسودة", teacher: "أ. نورة الشمري" },
  { id: 5, q: "إذا كان س + ٣ = ١٢ فما قيمة س²؟", subject: "قدرات - كمي", level: "سهل", status: "منشور", teacher: "أ. سارة المطيري" },
];

const statusColor: Record<string, string> = {
  "منشور": "bg-success/10 text-success border-success/20",
  "مراجعة": "bg-warning/10 text-warning border-warning/20",
  "مسودة": "bg-muted text-muted-foreground border-border",
};

const levelColor: Record<string, string> = {
  "سهل": "bg-info/10 text-info",
  "متوسط": "bg-accent/15 text-accent-foreground",
  "صعب": "bg-destructive/10 text-destructive",
};

export const Questions = () => {
  const [active, setActive] = useState("all");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">بنك الأسئلة</h3>
            <p className="text-sm text-muted-foreground mt-1">إدارة أسئلة اختبارات التحصيلي والقدرات</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث في الأسئلة..." className="pr-10 lg:w-72" />
            </div>
            <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" />تصفية</Button>
            <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />سؤال جديد
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
          {subjects.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                )}
              >
                <Icon className="w-4 h-4" />
                {s.label}
                <span className={cn("px-2 py-0.5 rounded-full text-xs", isActive ? "bg-primary-foreground/20" : "bg-background")}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase">السؤال</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase">المادة</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase">المستوى</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase">المعلمة</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase">الحالة</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-sm text-foreground font-medium line-clamp-1">{q.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">#Q-{1000 + q.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{q.subject}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", levelColor[q.level])}>{q.level}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{q.teacher}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={cn("font-bold", statusColor[q.status])}>{q.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
