import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BlackHanSans";
import { loadFont as loadBody } from "@remotion/google-fonts/NotoSansKR";
import type { ReelProps } from "./types";
import { buildTimeline, type Section } from "./timeline";

const display = loadDisplay("normal", { weights: ["400"], ignoreTooManyRequestsWarning: true });
const body = loadBody("normal", { weights: ["500", "700", "800"], ignoreTooManyRequestsWarning: true });

// 포인트 컬러는 JSON의 accentColor 한 곳에서 정해요 (기본 주황)
export const DEFAULT_ACCENT = "#FF8A1F";
const NAVY_TOP = "#16275C";
const NAVY_BOTTOM = "#0B1534";
const TEXT = "#FFFFFF";
const CHIP_TEXT = "#111111";
const CHIP_BORDER = "3px solid #000000";
const PANEL = "rgba(11,21,52,0.74)";
const DEFAULT_BG = "bg/city-night.svg";
const SAFE = { top: 300, bottom: 380, left: 80, right: 150 };

// 큰 글자 폰트: 히피체 (눈누 CDN). 렌더링할 때 인터넷 연결이 필요해요.
const HIPPIE_URL =
  "https://cdn.jsdelivr.net/gh/Project-Noonnu/2610081905@hippie/hippie/hippie_히피체.woff2";
const HIPPIE_FAMILY = `Hippie, ${body.fontFamily}`;

const useHippieFont = () => {
  const [handle] = useState(() => delayRender("Loading Hippie font"));
  useEffect(() => {
    const face = new FontFace("Hippie", `url("${encodeURI(HIPPIE_URL)}") format("woff2")`, {
      weight: "400",
      display: "swap",
    });
    face
      .load()
      .then(() => {
        document.fonts.add(face);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Hippie font failed to load, using fallback", err);
        continueRender(handle);
      });
  }, [handle]);
};

// "[[강조]]" 로 감싼 부분만 포인트 컬러
const Rich: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <>
    {text.split(/(\[\[.*?\]\])/g).map((part, i) =>
      part.startsWith("[[") && part.endsWith("]]") ? (
        <span key={i} style={{ color: accent }}>
          {part.slice(2, -2)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )}
  </>
);

// ---------- 배경 ----------
const isVideo = (f: string) => /\.(mp4|mov|webm|m4v)$/i.test(f);

const Media: React.FC<{ src: string }> = ({ src }) =>
  isVideo(src) ? (
    <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );

const FadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

// 천천히 확대되는 느낌 (아주 약하게)
const SlowZoom: React.FC<{ children: React.ReactNode; dur: number }> = ({ children, dur }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, dur], [1, 1.06], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

// ---------- 등장 효과 (과하지 않게: 살짝 올라오며 선명해지기) ----------
const useReveal = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * 26}px)`,
    filter: `blur(${(1 - p) * 6}px)`,
  } as React.CSSProperties;
};

// 장면이 끝나기 직전 살짝 사라지기
const Shell: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [dur - 8, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingLeft: 70,
        paddingRight: 70,
        opacity: o,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string; accent: string }> = ({ label, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <div
      style={{
        background: accent,
        color: CHIP_TEXT,
        border: CHIP_BORDER,
        fontFamily: body.fontFamily,
        fontWeight: 700,
        fontSize: 38,
        padding: "10px 32px",
        borderRadius: 999,
        marginBottom: 32,
        opacity: Math.min(1, p * 1.5),
        transform: `scale(${0.9 + 0.1 * p})`,
      }}
    >
      {label}
    </div>
  );
};

// 줄 단위로 차례대로 등장. 줄바꿈은 단어(어절) 단위로만 (keep-all + balance)
const Lines: React.FC<{ text: string; size: number; accent: string; startDelay?: number }> = ({
  text,
  size,
  accent,
  startDelay = 6,
}) => {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.1 }}>
      {lines.map((line, i) => (
        <Line key={i} delay={startDelay + i * 6} size={size}>
          <Rich text={line} accent={accent} />
        </Line>
      ))}
    </div>
  );
};

const Line: React.FC<{ delay: number; size: number; children: React.ReactNode }> = ({ delay, size, children }) => {
  const style = useReveal(delay);
  return (
    <div
      style={{
        ...style,
        fontFamily: HIPPIE_FAMILY,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1.25,
        color: TEXT,
        wordBreak: "keep-all",
        overflowWrap: "normal",
        textWrap: "balance",
        maxWidth: 940,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

// ---------- 요약 카드 ----------
const CardsView: React.FC<{ section: Section; accent: string }> = ({ section, accent }) => {
  const cards = section.scene?.cards ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 940, alignItems: "stretch" }}>
      {cards.map((c, i) => (
        <CardRow key={i} delay={8 + i * 8} accent={accent} label={c.label} value={c.value} sub={c.sub} />
      ))}
    </div>
  );
};

const CardRow: React.FC<{ delay: number; accent: string; label: string; value: string; sub?: string }> = ({
  delay,
  accent,
  label,
  value,
  sub,
}) => {
  const style = useReveal(delay);
  return (
    <div
      style={{
        ...style,
        background: PANEL,
        borderRadius: 32,
        borderLeft: `12px solid ${accent}`,
        padding: "28px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
        textAlign: "left",
      }}
    >
      <div style={{ fontFamily: body.fontFamily, fontWeight: 700, fontSize: 40, color: "rgba(255,255,255,0.85)", wordBreak: "keep-all" }}>
        {label}
        {sub && <div style={{ fontWeight: 500, fontSize: 30, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: HIPPIE_FAMILY, fontSize: 64, color: accent, textAlign: "right", wordBreak: "keep-all", lineHeight: 1.15 }}>
        {value}
      </div>
    </div>
  );
};

// ---------- 표 ----------
const TableView: React.FC<{ section: Section; accent: string }> = ({ section, accent }) => {
  const t = section.scene?.table;
  if (!t) return null;
  const cols = t.head.length;
  const grid = `1fr ${"1.4fr ".repeat(Math.max(0, cols - 1))}`.trim();
  return (
    <div style={{ width: 940, borderRadius: 28, overflow: "hidden", textAlign: "left" }}>
      <TableRow delay={8} grid={grid}>
        {t.head.map((h, i) => (
          <div
            key={i}
            style={{
              background: accent,
              color: CHIP_TEXT,
              fontFamily: body.fontFamily,
              fontWeight: 800,
              fontSize: 38,
              padding: "22px 30px",
              textAlign: i === 0 ? "left" : "center",
            }}
          >
            {h}
          </div>
        ))}
      </TableRow>
      {t.rows.map((r, ri) => (
        <TableRow key={ri} delay={16 + ri * 7} grid={grid}>
          {r.map((cell, ci) => (
            <div
              key={ci}
              style={{
                background: PANEL,
                borderTop: "2px solid rgba(255,255,255,0.12)",
                color: TEXT,
                fontFamily: body.fontFamily,
                fontWeight: ci === 0 ? 700 : 800,
                fontSize: 42,
                padding: "26px 30px",
                textAlign: ci === 0 ? "left" : "center",
                wordBreak: "keep-all",
              }}
            >
              <Rich text={cell} accent={accent} />
            </div>
          ))}
        </TableRow>
      ))}
    </div>
  );
};

const TableRow: React.FC<{ delay: number; grid: string; children: React.ReactNode }> = ({ delay, grid, children }) => {
  const style = useReveal(delay);
  return <div style={{ ...style, display: "grid", gridTemplateColumns: grid }}>{children}</div>;
};

// ---------- 장면 ----------
const PhotoSectionView: React.FC<{ section: Section; accent: string }> = ({ section, accent }) => {
  const isHook = section.kind === "hook";
  const type = section.scene?.type ?? "text";
  const hasText = !!section.text;
  return (
    <Shell dur={section.dur}>
      {section.label && <Chip label={section.label} accent={accent} />}
      {type === "cards" && <CardsView section={section} accent={accent} />}
      {type === "table" && <TableView section={section} accent={accent} />}
      {type === "text" && hasText && <Lines text={section.text} size={isHook ? 124 : 96} accent={accent} />}
      {type !== "text" && hasText && (
        <div style={{ marginTop: 28 }}>
          <Lines text={section.text} size={56} accent={accent} startDelay={30} />
        </div>
      )}
    </Shell>
  );
};

// ---------- navy 스타일 (예전 방식) ----------
const NavySectionView: React.FC<{ section: Section; accent: string }> = ({ section, accent }) => {
  const isHook = section.kind === "hook";
  const isCta = section.kind === "cta";
  const size = isHook ? 92 : isCta ? 76 : 80;
  return (
    <AbsoluteFill
      style={{
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        paddingLeft: SAFE.left,
        paddingRight: SAFE.right,
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div style={{ display: "flex", gap: 36, alignItems: "stretch" }}>
        <div style={{ width: 10, borderRadius: 5, background: accent, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: size * 0.28 }}>
          {section.text.split("\n").map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: display.fontFamily,
                fontSize: size,
                lineHeight: 1.25,
                color: isHook || isCta ? accent : TEXT,
                wordBreak: "keep-all",
              }}
            >
              <Rich text={line} accent={accent} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (props) => {
  useHippieFont();
  const accent = props.accentColor || DEFAULT_ACCENT;
  const timeline = buildTimeline(props);
  const isPhoto = props.style === "photo";
  const showDisclaimer = props.status !== "confirmed" && !!props.disclaimer_overlay;
  const baseBg = props.backgroundSrc || DEFAULT_BG;
  return (
    <AbsoluteFill style={{ fontFamily: body.fontFamily, backgroundColor: NAVY_BOTTOM }}>
      {isPhoto || props.background === "video" || props.background === "image" ? (
        <AbsoluteFill>
          <Media src={baseBg} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(165deg, ${NAVY_TOP} 0%, ${NAVY_BOTTOM} 100%)` }} />
      )}
      {isPhoto &&
        timeline.map(
          (s, i) =>
            s.bg && (
              <Sequence key={`bg${i}`} from={s.from} durationInFrames={s.dur}>
                <FadeIn>
                  <SlowZoom dur={s.dur}>
                    <Media src={s.bg} />
                  </SlowZoom>
                </FadeIn>
              </Sequence>
            )
        )}
      <AbsoluteFill style={{ background: `rgba(11,21,52,${isPhoto ? 0.5 : 0.62})` }} />
      {timeline.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          {isPhoto ? <PhotoSectionView section={s} accent={accent} /> : <NavySectionView section={s} accent={accent} />}
        </Sequence>
      ))}
      {showDisclaimer && (
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            bottom: isPhoto ? 300 : SAFE.bottom - 100,
            textAlign: "center",
            fontSize: 32,
            fontWeight: 500,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {props.disclaimer_overlay}
        </div>
      )}
    </AbsoluteFill>
  );
};
