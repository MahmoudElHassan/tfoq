import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Video, Lock, Users, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Subject } from "./LearningManagement";
import { visibilityLabels, visibilityOptions, extractYouTubeId } from "./shared";

type LVideo = {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  duration_seconds: number;
  subject_id: string;
  created_by: string;
  visibility: "private" | "subject" | "public";
  views_count?: number;
  half_views?: number;
};

const visIcon = { private: Lock, subject: Users, public: Globe } as const;

export const VideosCenter = ({ subjects }: { subjects: Subject[] }) => {
  const { user, isAdmin } = useAuth();
  const [videos, setVideos] = useState<LVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LVideo | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", url: "", duration_seconds: 600,
    subject_id: "", visibility: "private" as LVideo["visibility"],
  });
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<LVideo | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: vs } = await supabase.from("learning_videos").select("*").order("created_at", { ascending: false });
    const ids = (vs ?? []).map((v: any) => v.id);
    let stats: Record<string, { total: number; half: number }> = {};
    if (ids.length > 0) {
      const { data: vws } = await supabase.from("video_views").select("video_id, completed_half").in("video_id", ids);
      (vws ?? []).forEach((w: any) => {
        if (!stats[w.video_id]) stats[w.video_id] = { total: 0, half: 0 };
        stats[w.video_id].total++;
        if (w.completed_half) stats[w.video_id].half++;
      });
    }
    setVideos((vs ?? []).map((v: any) => ({
      ...v, views_count: stats[v.id]?.total ?? 0, half_views: stats[v.id]?.half ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", url: "", duration_seconds: 600, subject_id: subjects[0]?.id ?? "", visibility: "private" });
    setOpen(true);
  };

  const openEdit = (v: LVideo) => {
    setEditing(v);
    setForm({
      title: v.title, description: v.description ?? "",
      url: `https://youtu.be/${v.youtube_id}`,
      duration_seconds: v.duration_seconds || 600,
      subject_id: v.subject_id, visibility: v.visibility,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.subject_id) { toast.error("الرجاء تعبئة العنوان والمادة"); return; }
    const yid = extractYouTubeId(form.url);
    if (!yid) { toast.error("رابط يوتيوب غير صالح"); return; }
    if (!form.duration_seconds || form.duration_seconds < 10) { toast.error("الرجاء إدخال مدة الفيديو بالثواني"); return; }

    setSaving(true);
    const payload = {
      title: form.title, description: form.description, youtube_id: yid,
      duration_seconds: Number(form.duration_seconds),
      subject_id: form.subject_id, visibility: form.visibility,
    };
    const { error } = editing
      ? await supabase.from("learning_videos").update(payload).eq("id", editing.id)
      : await supabase.from("learning_videos").insert({ ...payload, created_by: user.id });
    if (error) { toast.error("تعذّر الحفظ", { description: error.message }); setSaving(false); return; }
    toast.success(editing ? "تم تحديث الفيديو" : "تم إضافة الفيديو");
    setOpen(false); setSaving(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الفيديو؟")) return;
    const { error } = await supabase.from("learning_videos").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    toast.success("تم الحذف"); load();
  };

  const subjectsById = Object.fromEntries(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" /> مكتبة الفيديوهات
          </h3>
          <p className="text-sm text-muted-foreground mt-1">روابط يوتيوب مع تتبع المشاهدات لإحصائيات المعلم</p>
        </div>
        <Button onClick={openNew} disabled={subjects.length === 0} className="bg-gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> فيديو جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : videos.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 border border-border/50 text-center">
          <Video className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display text-lg font-bold">لا توجد فيديوهات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => {
            const VisIcon = visIcon[v.visibility];
            const canEdit = isAdmin || v.created_by === user?.id;
            return (
              <div key={v.id} className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-card hover:shadow-elegant transition-all">
                <button onClick={() => setPlaying(v)} className="block w-full aspect-video bg-black relative group">
                  <img src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                      <Eye className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </button>
                <div className="p-4">
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{subjectsById[v.subject_id]?.name ?? "—"}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs"><VisIcon className="w-3 h-3" />{visibilityLabels[v.visibility]}</Badge>
                  </div>
                  <h4 className="font-display font-bold leading-tight line-clamp-2">{v.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>{v.views_count} مشاهدة</span>
                    <span>•</span>
                    <span className="text-success font-semibold">{v.half_views} أكملوا النصف</span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)} className="flex-1 gap-1">
                        <Edit2 className="w-3 h-3" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(v.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "تعديل الفيديو" : "إضافة فيديو"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>العنوان</Label>
              <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea className="mt-1.5" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>رابط يوتيوب</Label>
              <Input className="mt-1.5" dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://youtu.be/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المدة بالثواني</Label>
                <Input className="mt-1.5" type="number" min={10} value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>المادة</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>المشاركة</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as any })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "تحديث" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VideoPlayer video={playing} onClose={() => { setPlaying(null); load(); }} />
    </div>
  );
};

const VideoPlayer = ({ video, onClose }: { video: LVideo | null; onClose: () => void }) => {
  const { user, isStudent } = useAuth();
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
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [video]);

  // Persist on close (students only)
  useEffect(() => {
    return () => {
      if (!video || !user || !isStudent) return;
      const watched = Math.round((Date.now() - startRef.current) / 1000);
      const half = watched >= Math.floor((video.duration_seconds || 0) / 2);
      void supabase.from("video_views").upsert({
        video_id: video.id,
        student_id: user.id,
        watched_seconds: watched,
        completed_half: half,
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
            className="w-full h-full"
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="text-sm text-muted-foreground flex items-center justify-between">
          <span>الوقت المستغرق: {elapsed} ث / {video.duration_seconds} ث</span>
          {isStudent && (
            <span className={reached ? "text-success font-bold" : ""}>
              {reached ? "✓ تم احتساب المشاهدة" : `${halfMark - elapsed} ث للاحتساب`}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
