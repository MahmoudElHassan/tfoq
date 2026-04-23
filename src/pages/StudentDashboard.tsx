import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Target, BookOpen, TrendingUp, Sparkles, Award,
  ClipboardList, Gamepad2, Video, Play, Clock, Disc3, Brain, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/site/SiteNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GamePreview } from "@/components/learning/GamePreview";
import { useRef } from "react";

type Subject = { id: string; name: string; type: string };
type Template = { id: string; title: string; description: string | null; subject_id: string; duration_minutes: number | null; question_count?: number };
type Game = { id: string; title: string; description: string | null; subject_id: string; game_type: "wheel" | "memory"; content_kind: "mcq" | "concept"; item_count?: number };
type LVideo = { id: string; title: string; description: string | null; subject_id: string; youtube_id: string; duration_seconds: number };

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0, rank: 0 });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [videos, setVideos] = useState<LVideo[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [playingVideo, setPlayingVideo] = useState<LVideo | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [pRes, attRes, totalRes, correctRes, allRes, subsRes, tplsRes, gamesRes, vidsRes, qcRes, icRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("quiz_attempts").select("*, questions(question_text)").eq("student_id", user.id).order("attempted_at", { ascending: false }).limit(5),
        supabase.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("student_id", user.id),
        supabase.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("student_id", user.id).eq("is_correct", true),
        supabase.from("profiles").select("id, total_points").order("total_points", { ascending: false }),
        supabase.from("subjects").select("*").order("name"),
        supabase.from("quiz_templates").select("*").order("created_at", { ascending: false }),
        supabase.from("learning_games").select("*").order("created_at", { ascending: false }),
        supabase.from("learning_videos").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_template_questions").select("template_id"),
        supabase.from("learning_game_items").select("game_id"),
      ]);

      setProfile(pRes.data);
      setRecentAttempts(attRes.data ?? []);

      const rank = (allRes.data ?? []).findIndex((x: any) => x.id === user.id) + 1;
      setStats({ total: totalRes.count ?? 0, correct: correctRes.count ?? 0, rank });

      setSubjects((subsRes.data ?? []) as Subject[]);

      const qCounts: Record<string, number> = {};
      (qcRes.data ?? []).forEach((r: any) => { qCounts[r.template_id] = (qCounts[r.template_id] ?? 0) + 1; });
      setTemplates(((tplsRes.data ?? []) as any[]).map((t) => ({ ...t, question_count: qCounts[t.id] ?? 0 })));

      const iCounts: Record<string, number> = {};
      (icRes.data ?? []).forEach((r: any) => { iCounts[r.game_id] = (iCounts[r.game_id] ?? 0) + 1; });
      setGames(((gamesRes.data ?? []) as any[]).map((g) => ({ ...g, item_count: iCounts[g.id] ?? 0 })));

      setVideos((vidsRes.data ?? []) as LVideo[]);
    };
    load();
  }, [user]);

  if (!profile) return <div className="min-h-screen bg-gradient-soft"><SiteNav /><div className="container py-20 text-center">جارٍ التحميل...</div></div>;

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const subjectsById = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const filterBySubject = <T extends { subject_id: string }>(arr: T[]) =>
    activeSubject === "all" ? arr : arr.filter((x) => x.subject_id === activeSubject);

  const filteredTpls = filterBySubject(templates);
  const filteredGames = filterBySubject(games);
  const filteredVideos = filterBySubject(videos);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <SiteNav />
      <div className="container py-8 lg:py-10 space-y-8">
        {/* Welcome */}
        <div className="bg-gradient-primary rounded-3xl p-6 lg:p-10 text-primary-foreground shadow-elegant relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-primary-foreground/80 flex items-center gap-2 text-sm"><Sparkles className="w-4 h-4" /> أهلاً بكِ مجدداً</p>
              <h1 className="font-display text-2xl lg:text-4xl font-extrabold mt-2">{profile.full_name}</h1>
              {profile.grade && <p className="text-primary-foreground/80 mt-1 text-sm">{profile.grade}</p>}
            </div>
            <Button onClick={() => navigate("/quiz")}
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 lg:h-14 px-6 lg:px-8 text-sm lg:text-base font-bold shadow-elegant">
              عجلة الاختبارات السريعة ←
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { l: "إجمالي النقاط", v: profile.total_points, icon: Trophy, c: "bg-accent/15 text-accent-foreground" },
            { l: "ترتيبك", v: `#${stats.rank || "—"}`, icon: Award, c: "bg-primary/10 text-primary" },
            { l: "إجابات صحيحة", v: stats.correct, icon: Target, c: "bg-success/10 text-success" },
            { l: "نسبة الدقة", v: `${accuracy}%`, icon: TrendingUp, c: "bg-info/10 text-info" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-card rounded-2xl p-4 lg:p-5 shadow-card border border-border">
                <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl ${s.c} flex items-center justify-center mb-2 lg:mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-[11px] lg:text-xs text-muted-foreground">{s.l}</p>
                <p className="font-display text-xl lg:text-2xl font-extrabold mt-1">{s.v}</p>
              </div>
            );
          })}
        </div>

        {/* Subject filter */}
        <div className="bg-card rounded-2xl p-4 lg:p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold">تصفية حسب المادة</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveSubject("all")}
              className={`text-xs px-4 py-2 rounded-full border transition-all ${activeSubject === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:border-primary/40"}`}>
              الكل
            </button>
            {subjects.map((s) => (
              <button key={s.id} onClick={() => setActiveSubject(s.id)}
                className={`text-xs px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${activeSubject === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:border-primary/40"}`}>
                <span>{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeSubject === s.id ? "bg-primary-foreground/20" : s.type === "tahseeli" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"}`}>
                  {s.type === "tahseeli" ? "تحصيلي" : "قدرات"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Learning content tabs */}
        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="bg-card border border-border/50 p-1 h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="quizzes" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4" /> الاختبارات المحاكية
              <Badge variant="secondary" className="text-[10px] h-5">{filteredTpls.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <Gamepad2 className="w-4 h-4" /> التعلم باللعب
              <Badge variant="secondary" className="text-[10px] h-5">{filteredGames.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4" /> الفيديوهات
              <Badge variant="secondary" className="text-[10px] h-5">{filteredVideos.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quiz templates */}
          <TabsContent value="quizzes" className="mt-6">
            {filteredTpls.length === 0 ? (
              <EmptyState icon={ClipboardList} text="لا توجد نماذج اختبار متاحة" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTpls.map((t) => (
                  <div key={t.id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-card hover:shadow-elegant transition-all flex flex-col">
                    <Badge className="bg-primary/10 text-primary border-0 self-start">{subjectsById[t.subject_id]?.name ?? "—"}</Badge>
                    <h4 className="font-display font-bold text-lg leading-tight mt-3">{t.title}</h4>
                    {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {t.question_count} سؤال</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.duration_minutes} د</span>
                    </div>
                    <Button onClick={() => navigate(`/quiz?template=${t.id}`)}
                      className="mt-4 bg-gradient-primary text-primary-foreground gap-2 w-full">
                      <Play className="w-4 h-4" /> ابدئي الاختبار
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Games */}
          <TabsContent value="games" className="mt-6">
            {filteredGames.length === 0 ? (
              <EmptyState icon={Gamepad2} text="لا توجد ألعاب متاحة" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGames.map((g) => {
                  const GIcon = g.game_type === "wheel" ? Disc3 : Brain;
                  return (
                    <div key={g.id} className="bg-card rounded-2xl p-5 border border-border/50 shadow-card hover:shadow-elegant transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center">
                          <GIcon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-bold leading-tight truncate">{g.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {g.game_type === "wheel" ? "العجلة الدوارة" : "لعبة الذاكرة"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">{subjectsById[g.subject_id]?.name ?? "—"}</Badge>
                        <Badge variant="outline" className="text-xs">{g.item_count} عنصر</Badge>
                      </div>
                      {g.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{g.description}</p>}
                      <Button onClick={() => setPreviewGame(g)}
                        className="bg-gradient-primary text-primary-foreground gap-2 w-full">
                        <Play className="w-4 h-4" /> العبي الآن
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Videos */}
          <TabsContent value="videos" className="mt-6">
            {filteredVideos.length === 0 ? (
              <EmptyState icon={Video} text="لا توجد فيديوهات متاحة" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((v) => (
                  <div key={v.id} className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-card hover:shadow-elegant transition-all">
                    <button onClick={() => setPlayingVideo(v)} className="block w-full aspect-video bg-black relative group">
                      <img src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`} alt={v.title}
                        className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                        <div className="w-14 h-14 rounded-full bg-primary/95 flex items-center justify-center shadow-elegant">
                          <Play className="w-6 h-6 text-primary-foreground" />
                        </div>
                      </div>
                    </button>
                    <div className="p-4">
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">{subjectsById[v.subject_id]?.name ?? "—"}</Badge>
                      <h4 className="font-display font-bold leading-tight line-clamp-2 mt-2">{v.title}</h4>
                      {v.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{v.description}</p>}
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3" /> {Math.round((v.duration_seconds || 0) / 60)} دقيقة
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent attempts */}
        <div className="bg-card rounded-2xl p-5 lg:p-6 shadow-card border border-border">
          <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> آخر محاولاتك
          </h3>
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد محاولات بعد — ابدئي اختباراً!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAttempts.map((a) => (
                <div key={a.id} className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-sm line-clamp-2 font-medium">{a.questions?.question_text}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${a.is_correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {a.is_correct ? "✓ صحيح" : "✗ خطأ"}
                    </span>
                    {a.is_correct && <span className="text-xs font-bold text-accent">+{a.points_earned}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <GamePreview game={previewGame} onClose={() => setPreviewGame(null)} />
      <StudentVideoPlayer video={playingVideo} onClose={() => setPlayingVideo(null)} userId={user?.id} />
    </div>
  );
};

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
    <Icon className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
    <p className="font-display text-lg font-bold">{text}</p>
    <p className="text-sm text-muted-foreground mt-1">سيظهر المحتوى هنا فور إضافته من المعلمة</p>
  </div>
);

const StudentVideoPlayer = ({ video, onClose, userId }: { video: LVideo | null; onClose: () => void; userId?: string }) => {
  const startRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!video) return;
    startRef.current = Date.now();
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [video]);

  useEffect(() => {
    return () => {
      if (!video || !userId) return;
      const watched = Math.round((Date.now() - startRef.current) / 1000);
      const half = watched >= Math.floor((video.duration_seconds || 0) / 2);
      void supabase.from("video_views").upsert({
        video_id: video.id, student_id: userId,
        watched_seconds: watched, completed_half: half,
        last_watched_at: new Date().toISOString(),
      }, { onConflict: "video_id,student_id" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  if (!video) return null;
  const halfMark = Math.floor((video.duration_seconds || 0) / 2);
  const reached = elapsed >= halfMark;

  return (
    <Dialog open={!!video} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{video.title}</DialogTitle></DialogHeader>
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1`}
            className="w-full h-full" title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="text-sm text-muted-foreground flex items-center justify-between">
          <span>الوقت: {elapsed} ث / {video.duration_seconds} ث</span>
          <span className={reached ? "text-success font-bold" : ""}>
            {reached ? "✓ تم احتساب المشاهدة" : `${halfMark - elapsed} ث للاحتساب`}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDashboard;
