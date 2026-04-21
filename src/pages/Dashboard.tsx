import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user, loading, isAdmin, isTeacher, isParent, isStudent } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isTeacher) return <Navigate to="/teacher" replace />;
  if (isParent) return <Navigate to="/parent" replace />;
  if (isStudent) return <Navigate to="/student" replace />;
  return <Navigate to="/student" replace />;
};

export default Dashboard;
