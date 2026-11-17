export type Card = { label: string; value: string; sub?: string };
export type TableData = { head: string[]; rows: string[][] };

export type Scene = {
  t: number;
  // text(기본) | cards(요약 카드) | table(표)
  type?: "text" | "cards" | "table";
  label?: string;
  text?: string;
  cards?: Card[];
  table?: TableData;
  // 이 장면 배경: public/ 안 파일 이름 (이미지 또는 mp4/mov/webm). 없으면 전체 배경을 써요.
  bg?: string;
  // bg 가 없을 때 backgrounds 명령이 무료 사진(Pexels)을 찾아줄 영어 검색어
  bgQuery?: string;
};

export type ReelProps = {
  id: string;
  mode: string;
  style?: string;
  accentColor?: string;
  status: string;
  background: string;
  // 전체 배경 (public/ 안 파일 이름). 비우면 기본 도시 일러스트가 깔려요.
  backgroundSrc?: string;
  bgQuery?: string;
  hookBg?: string;
  hook: string;
  hookLabel?: string;
  scenes: Scene[];
  cta: string;
  ctaLabel?: string;
  ctaBg?: string;
  disclaimer_overlay?: string;
  caption?: string;
  hashtags?: string[];
  sources?: string[];
  verify_before_post?: string[];
};
