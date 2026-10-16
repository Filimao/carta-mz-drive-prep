import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useRef, useState, type PointerEvent, type WheelEvent } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const MIN = 1;
const MAX = 5;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };
  const zoom = (delta: number) =>
    setScale((s) => {
      const n = clamp(s + delta);
      if (n === 1) setPos({ x: 0, y: 0 });
      return n;
    });

  const onPointerDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    } else {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (scale > 1) reset();
        else setScale(2.5);
      }
      lastTap.current = now;
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(clamp((pinchStart.current.scale * dist) / pinchStart.current.dist));
    } else if (scale > 1) {
      setPos((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };
  const onWheel = (e: WheelEvent) => zoom(e.deltaY < 0 ? 0.25 : -0.25);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mb-4 block w-full overflow-hidden rounded-xl border border-white/10 bg-black/20"
        aria-label="Ampliar imagem"
      >
        <img src={src} alt={alt} className="max-h-[45vh] w-full object-contain sm:max-h-[55vh]" />
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur">
          <Maximize2 className="h-3.5 w-3.5" /> Ampliar
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 bg-background/95 p-0 sm:rounded-none [&>button]:hidden">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div
            className="relative flex h-full w-full touch-none items-center justify-center overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full bg-card text-foreground shadow"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] flex justify-center gap-3">
            {[
              { icon: Minus, label: "Reduzir", fn: () => zoom(-0.5) },
              { icon: RotateCcw, label: "Repor", fn: reset },
              { icon: Plus, label: "Ampliar", fn: () => zoom(0.5) },
            ].map(({ icon: Icon, label, fn }) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                aria-label={label}
                className="grid h-12 w-12 place-items-center rounded-full bg-card text-foreground shadow"
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
          <p className="pointer-events-none absolute left-4 top-[calc(1.5rem+env(safe-area-inset-top))] text-xs text-muted-foreground">
            Toque duas vezes ou use dois dedos para ampliar
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
