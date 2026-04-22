import { UserPlus, ClipboardCheck, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const teachers = [
  { name: "أ. سارة المطيري", subject: "قدرات - كمي", assigned: 48, completed: 42, status: "نشطة", color: "bg-primary" },
  { name: "أ. هند العتيبي", subject: "قدرات - لفظي", assigned: 35, completed: 30, status: "نشطة", color: "bg-accent" },
  { name: "أ. ريم القحطاني", subject: "تحصيلي - فيزياء", assigned: 52, completed: 38, status: "نشطة", color: "bg-info" },
  { name: "أ. نورة الشمري", subject: "تحصيلي - تاريخ", assigned: 28, completed: 28, status: "مكتملة", color: "bg-success" },
  { name: "أ. لطيفة الدوسري", subject: "تحصيلي - كيمياء", assigned: 40, completed: 25, status: "قيد العمل", color: "bg-warning" },
  { name: "أ. منيرة الزهراني", subject: "قدرات - كمي", assigned: 30, completed: 18, status: "قيد العمل", color: "bg-primary" },
];

const tasks = [
  { title: "إعداد ١٥ سؤال جديد - تحصيلي فيزياء", teacher: "أ. ريم القحطاني", due: "خلال ٣ أيام", priority: "high" },
  { title: "مراجعة بنك أسئلة القدرات الكمي", teacher: "أ. سارة المطيري", due: "خلال أسبوع", priority: "medium" },
  { title: "تحديث أسئلة التحصيلي الأدبي", teacher: "أ. نورة الشمري", due: "غداً", priority: "high" },
  { title: "تصنيف الأسئلة حسب المستوى", teacher: "أ. هند العتيبي", due: "خلال ٥ أيام", priority: "low" },
];

export const Teachers = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl font-bold">المعلمات والمواد المُكلفات بها</h3>
              <p className="text-sm text-muted-foreground mt-1">إدارة تفويض إعداد الأسئلة</p>
            </div>
            <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" />تفويض معلمة
            </Button>
          </div>

          <div className="space-y-3">
            {teachers.map((t, i) => {
              const pct = Math.round((t.completed / t.assigned) * 100);
              return (
                <div key={i} className="flex items-center gap-4 p-4 bg-secondary/40 hover:bg-secondary/70 rounded-xl transition-colors">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold font-display shrink-0", t.color)}>
                    {t.name.split(" ")[1]?.[0] || "م"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.subject}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-foreground whitespace-nowrap">
                        {t.completed} / {t.assigned}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl font-bold">المهام الحالية</h3>
          </div>
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="p-4 border border-border rounded-xl hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    task.priority === "high" && "bg-destructive",
                    task.priority === "medium" && "bg-warning",
                    task.priority === "low" && "bg-info"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{task.teacher}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{task.due}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4 gap-2">
            <CheckCircle2 className="w-4 h-4" />عرض جميع المهام
          </Button>
        </div>
      </div>
    </div>
  );
};
