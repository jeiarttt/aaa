import type { ReelProps, Scene } from "./types";

export const FPS = 30;
export const HOOK_SEC = 3.5;
export const CTA_SEC = 3.5;

export type Section = {
  kind: "hook" | "scene" | "cta";
  text: string;
  label?: string;
  bg?: string;
  scene?: Scene;
  from: number;
  dur: number;
};

export const buildTimeline = (p: ReelProps): Section[] => {
  const raw: { kind: Section["kind"]; text: string; label?: string; bg?: string; scene?: Scene; sec: number }[] = [
    { kind: "hook", text: p.hook, label: p.hookLabel, bg: p.hookBg, sec: HOOK_SEC },
    ...p.scenes.map((s) => ({
      kind: "scene" as const,
      text: s.text ?? "",
      label: s.label,
      bg: s.bg,
      scene: s,
      sec: s.t,
    })),
    { kind: "cta", text: p.cta, label: p.ctaLabel, bg: p.ctaBg, sec: CTA_SEC },
  ];
  let cursor = 0;
  return raw.map((r) => {
    const dur = Math.round(r.sec * FPS);
    const section: Section = { kind: r.kind, text: r.text, label: r.label, bg: r.bg, scene: r.scene, from: cursor, dur };
    cursor += dur;
    return section;
  });
};

export const totalFrames = (p: ReelProps) => {
  const t = buildTimeline(p);
  const last = t[t.length - 1];
  return last.from + last.dur;
};
