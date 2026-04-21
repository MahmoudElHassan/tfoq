import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { Overview } from "@/components/dashboard/Overview";
import { Statistics } from "@/components/dashboard/Statistics";
import { Questions } from "@/components/dashboard/Questions";
import { Teachers } from "@/components/dashboard/Teachers";
import { UsersManagement } from "@/components/dashboard/UsersManagement";
import { SiteContentEditor } from "@/components/dashboard/SiteContentEditor";

const titles: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "النظرة العامة", subtitle: "أهلاً بكِ، إليكِ ملخص أداء المنصة اليوم" },
  stats: { title: "الإحصائيات التفصيلية", subtitle: "تحليلات معمّقة للأداء والتسجيلات" },
  users: { title: "إدارة المستخدمين", subtitle: "تفعيل، تعطيل، تغيير الأدوار وحذف الحسابات" },
  content: { title: "تحرير الصفحة الرئيسية", subtitle: "تعديل الهيرو، المميزات، الفوتر وكل العبارات" },
  questions: { title: "إدارة الأسئلة", subtitle: "بنك أسئلة التحصيلي والقدرات" },
  teachers: { title: "المعلمات والتفويض", subtitle: "إدارة المهام والمواد المُكلَّفات بها" },
  students: { title: "الطالبات", subtitle: "قائمة طالبات المدرسة" },
  parents: { title: "أولياء الأمور", subtitle: "حسابات أولياء الأمور المرتبطة" },
};

const AdminDashboard = () => {
  const [section, setSection] = useState("overview");

  const handleExport = () => {
    const overviewSheet = [
      { المؤشر: "إجمالي الحسابات", القيمة: 1847, "نسبة النمو": "12.5%" },
      { المؤشر: "الطالبات", القيمة: 1235, "نسبة النمو": "8.3%" },
      { المؤشر: "أولياء الأمور", القيمة: 978, "نسبة النمو": "15.2%" },
      { المؤشر: "المعلمات", القيمة: 64, "نسبة النمو": "4.1%" },
    ];
    const statsSheet = [
      { المؤشر: "متوسط النقاط العام", القيمة: 78.4 },
      { المؤشر: "الطالبات المرتبطات بأولياء الأمور", القيمة: 892 },
      { المؤشر: "تسجيلات الأسبوع", القيمة: 170 },
      { المؤشر: "تسجيلات الشهر", القيمة: 642 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewSheet), "النظرة العامة");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsSheet), "الإحصائيات");
    XLSX.writeFile(wb, `تقرير-منصة-تفوّق-${new Date().toLocaleDateString("ar")}.xlsx`);
    toast.success("تم تصدير التقرير بنجاح", { description: "تم حفظ الملف بصيغة Excel" });
  };

  const meta = titles[section];

  return (
    <div className="min-h-screen bg-gradient-soft flex">
      <Sidebar active={section} onChange={setSection} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} onExport={handleExport} />
        <div className="flex-1 p-6 lg:p-8">
          {section === "overview" && <Overview />}
          {section === "stats" && <Statistics />}
          {section === "users" && <UsersManagement />}
          {section === "content" && <SiteContentEditor />}
          {section === "questions" && <Questions />}
          {section === "teachers" && <Teachers />}
          {section === "students" && <UsersManagement filterRole="student" />}
          {section === "parents" && <UsersManagement filterRole="parent" />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
