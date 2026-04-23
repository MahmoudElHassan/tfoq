import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Disc3, Brain, RotateCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GameLite = { id: string; title: string; game_type: "wheel" | "memory"; content_kind: "mcq" | "concept" };
type Item = any;

export const GamePreview = ({ game, onClose }: { game: GameLite | null; onClose: () => void }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!game) return;
    setLoading(true);
    supabase.from("learning_game_items").select("*").eq("game_id", game.id).order("position").then(({ data }) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, [game]);

  return (
    <Dialog open={!!game} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{game?.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !game ? null : game.game_type === "wheel" ? (
          <Wheel items={items} contentKind={game.content_kind} />
        ) : (
          <Memory items={items} contentKind={game.content_kind} />
        )}
      </DialogContent>
    </Dialog>
  );
};

const labelOf = (it: Item, kind: "mcq" | "concept") =>
  kind === "mcq" ? (it.question_text ?? "—") : (it.front_text ?? "—");

const Wheel = ({ items, contentKind }: { items: Item[]; contentKind: "mcq" | "concept" }) => {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [reveal, setReveal] = useState(false);

  const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

  const spin = () => {
    if (items.length === 0 || spinning) return;
    setReveal(false); setSelected(null);
    const idx = Math.floor(Math.random() * items.length);
    const slice = 360 / items.length;
    const target = 360 * 6 + (360 - (idx * slice + slice / 2));
    setSpinning(true);
    setAngle(target);
    setTimeout(() => {
      setSelected(items[idx]);
      setSpinning(false);
    }, 3200);
  };

  if (items.length === 0) return <p className="text-center py-10 text-muted-foreground">لا توجد عناصر</p>;

  const slice = 360 / items.length;

  return (
    <div className="space-y-4">
      <div className="relative w-72 h-72 mx-auto" style={{ isolation: "isolate", contain: "layout paint" }}>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
        <div
          className="w-full h-full rounded-full border-4 border-primary shadow-elegant overflow-hidden transform-gpu"
          style={{
            transform: `translateZ(0) rotate(${angle}deg)`,
            transition: spinning ? "transform 3s cubic-bezier(.17,.67,.31,1)" : "none",
            background: `conic-gradient(${items.map((_, i) => `${colors[i % colors.length]} ${i * slice}deg ${(i + 1) * slice}deg`).join(",")})`,
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 origin-[0_0] text-xs font-bold text-primary-foreground pointer-events-none"
              style={{ transform: `rotate(${i * slice + slice / 2}deg) translate(60px, -8px)`, maxWidth: 70 }}
            >
              <span className="line-clamp-1">{labelOf(it, contentKind).slice(0, 12)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center">
        <Button onClick={spin} disabled={spinning} className="bg-gradient-primary text-primary-foreground gap-2">
          <RotateCw className="w-4 h-4" /> {spinning ? "تدور..." : "تدوير العجلة"}
        </Button>
      </div>
      {selected && (
        <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-2">
          <p className="font-bold">{labelOf(selected, contentKind)}</p>
          {!reveal ? (
            <Button size="sm" variant="outline" onClick={() => setReveal(true)}>إظهار الإجابة</Button>
          ) : (
            <p className="text-sm text-success font-semibold">
              {contentKind === "mcq"
                ? `الإجابة: ${(selected.correct_option ?? "?").toUpperCase()} - ${selected[`option_${selected.correct_option}`] ?? ""}`
                : selected.back_text}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const Memory = ({ items, contentKind }: { items: Item[]; contentKind: "mcq" | "concept" }) => {
  // Build pairs: each item -> 2 cards (front/back)
  const cards = useMemo(() => {
    const pairs: { id: string; pairKey: string; text: string }[] = [];
    items.forEach((it, i) => {
      const key = `p${i}`;
      const front = contentKind === "mcq" ? (it.question_text ?? "") : (it.front_text ?? "");
      const back = contentKind === "mcq"
        ? (it[`option_${it.correct_option ?? "a"}`] ?? "")
        : (it.back_text ?? "");
      pairs.push({ id: `${key}-a`, pairKey: key, text: front });
      pairs.push({ id: `${key}-b`, pairKey: key, text: back });
    });
    // shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
  }, [items, contentKind]);

  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const lock = useRef(false);

  const tap = (id: string) => {
    if (lock.current || matched.has(id) || flipped.has(id)) return;
    const next = new Set(flipped); next.add(id);
    setFlipped(next);
    if (next.size === 2) {
      lock.current = true;
      const [a, b] = [...next];
      const ca = cards.find((c) => c.id === a)!;
      const cb = cards.find((c) => c.id === b)!;
      setTimeout(() => {
        if (ca.pairKey === cb.pairKey) {
          const m = new Set(matched); m.add(a); m.add(b); setMatched(m);
        }
        setFlipped(new Set());
        lock.current = false;
      }, 800);
    }
  };

  if (items.length === 0) return <p className="text-center py-10 text-muted-foreground">لا توجد عناصر</p>;

  const cols = cards.length <= 8 ? "grid-cols-4" : cards.length <= 12 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">طابقي بين البطاقات. تم العثور على {matched.size / 2} من {items.length}</p>
      <div className={cn("grid gap-2", cols)}>
        {cards.map((c) => {
          const show = flipped.has(c.id) || matched.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => tap(c.id)}
              className={cn(
                "aspect-square rounded-xl text-xs font-semibold p-2 transition-all border-2",
                show
                  ? matched.has(c.id)
                    ? "bg-success/20 border-success text-success-foreground"
                    : "bg-card border-primary"
                  : "bg-gradient-primary border-transparent text-primary-foreground hover:scale-105"
              )}
            >
              {show ? <span className="line-clamp-3">{c.text}</span> : <Brain className="w-6 h-6 mx-auto" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
