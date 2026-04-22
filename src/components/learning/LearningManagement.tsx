import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Gamepad2, Video, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuizTemplatesCenter } from "./QuizTemplatesCenter";
import { GamesCenter } from "./GamesCenter";
import { VideosCenter } from "./VideosCenter";

export type Subject = { id: string; name: string; type: string };

export const LearningManagement = () => {
  const { user, isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      let subs: Subject[] = [];
      if (isAdmin) {
        const { data } = await supabase.from("subjects").select("id, name, type").order("name");
        subs = (data ?? []) as Subject[];
      } else {
        const { data } = await supabase
          .from("teacher_subjects")
          .select("subjects(id, name, type)")
          .eq("teacher_id", user.id);
        subs = (data ?? []).map((r: any) => r.subjects).filter(Boolean) as Subject[];
      }
      setSubjects(subs);
      setLoading(false);
    })();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && subjects.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-card border border-border p-10 text-center">
        <p className="font-display text-xl font-bold">لا يوجد تفويض</p>
        <p className="text-muted-foreground mt-2">
          سيقوم مدير النظام بتفويضك لأقسام محددة لتتمكني من إدارة المحتوى التعليمي.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="bg-card border border-border/50 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="quizzes" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="w-4 h-4" /> مركز الاختبارات المحاكية
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
            <Gamepad2 className="w-4 h-4" /> مركز التعلم باللعب
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
            <Video className="w-4 h-4" /> مركز الفيديو
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-6">
          <QuizTemplatesCenter subjects={subjects} />
        </TabsContent>
        <TabsContent value="games" className="mt-6">
          <GamesCenter subjects={subjects} />
        </TabsContent>
        <TabsContent value="videos" className="mt-6">
          <VideosCenter subjects={subjects} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
