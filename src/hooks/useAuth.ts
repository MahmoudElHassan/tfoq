import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "parent" | "student";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map((r: any) => r.role as AppRole);
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (newSession: Session | null) => {
      if (!mounted) return;

      setLoading(true);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const nextRoles = await fetchRoles(newSession.user.id);
      if (!mounted) return;

      setRoles(nextRoles);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void syncAuthState(newSession);
    });

    void supabase.auth.getSession().then(({ data: { session: s } }) => syncAuthState(s));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
