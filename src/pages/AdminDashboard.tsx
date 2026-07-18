import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { Overview } from "@/components/dashboard/Overview";
import { Statistics } from "@/components/dashboard/Statistics";
import { LearningManagement } from "@/components/learning/LearningManagement";
import { Teachers } from "@/components/dashboard/Teachers";
import { UsersManagement } from "@/components/dashboard/UsersManagement";
import { SiteContentEditor } from "@/components/dashboard/SiteContentEditor";
import { FaqManager } from "@/components/dashboard/FaqManager";
import { AdminSettings } from "@/components/dashboard/AdminSettings";

const titles: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "النظرة العامة", subtitle: "أهلاً بكِ، إليكِ ملخص أداء المنصة اليوم" },
  stats: { title: "الإحصائيات التفصيلية", subtitle: "تحليلات معمّقة للأداء والتسجيلات" },
  users: { title: "إدارة المستخدمين", subtitle: "تفعيل، تعطيل، تغيير الأدوار وحذف الحسابات" },
  content: { title: "تحرير الصفحة الرئيسية", subtitle: "تعديل الهيرو، المميزات، الفوتر وكل العبارات" },
  faq: { title: "الأسئلة الشائعة", subtitle: "إدارة محتوى المساعد الذكي على الصفحة الرئيسية" },
  questions: { title: "إدارة التعلّم", subtitle: "مراكز الاختبارات المحاكية والتعلم باللعب والفيديو" },
  teachers: { title: "المعلمات والتفويض", subtitle: "إدارة المهام والمواد المُكلَّفات بها" },
  students: { title: "الطالبات", subtitle: "قائمة طالبات المدرسة" },
  parents: { title: "أولياء الأمور", subtitle: "حسابات أولياء الأمور المرتبطة" },
  settings: { title: "الإعدادات", subtitle: "إدارة الحساب وكلمة المرور" },
};

const AdminDashboard = () => {
  const [section, setSection] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onExport={handleExport}
          mobileMenu={
            <MobileSidebar active={section} onChange={setSection} open={mobileOpen} onOpenChange={setMobileOpen} />
          }
        />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {section === "overview" && <Overview />}
          {section === "stats" && <Statistics />}
          {section === "users" && <UsersManagement />}
          {section === "content" && <SiteContentEditor />}
          {section === "faq" && <FaqManager />}
          {section === "questions" && <LearningManagement />}
          {section === "teachers" && <Teachers />}
          {section === "students" && <UsersManagement filterRole="student" />}
          {section === "parents" && <UsersManagement filterRole="parent" />}
          {section === "settings" && <AdminSettings />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
