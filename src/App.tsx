import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandThemeProvider } from "@/components/BrandThemeProvider";
import { BrandingProvider } from "@/hooks/useBranding";
import { DbHealthCheck } from "@/components/DbHealthCheck";
import Landing from "./pages/Landing";

const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLiveMonitor = lazy(() => import("./pages/AdminLiveMonitor"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const Quiz = lazy(() => import("./pages/Quiz"));
const MockQuiz = lazy(() => import("./pages/MockQuiz"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    storageKey="tfoq-color-mode"
  >
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <DbHealthCheck />
        <BrandThemeProvider />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center text-muted-foreground">
                جارٍ التحميل...
              </div>
            }>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/live-monitor" element={<AdminLiveMonitor />} />
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/mock-quiz/:templateId" element={<MockQuiz />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </BrandingProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
