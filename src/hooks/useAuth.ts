import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "parent" | "student";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => fetchRoles(newSession.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRoles(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r: any) => r.role as AppRole));
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return {
    user,
    session,
    roles,
    primaryRole: roles[0] ?? null,
    isAdmin: roles.includes("admin"),
    isTeacher: roles.includes("teacher"),
    isParent: roles.includes("parent"),
    isStudent: roles.includes("student"),
    loading,
    signOut,
  };
};
