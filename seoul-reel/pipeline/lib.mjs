import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const JOBS = path.join(ROOT, "jobs");

export function loadEnv() {
  const f = path.join(ROOT, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const jobDir = (id) => path.join(JOBS, id);
export const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const writeJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2), "utf8");

export function requireJob(id) {
  if (!id) throw new Error("작업 이름(jobId)이 필요해요. 예: npm run generate -- 20261117-월세지원");
  const d = jobDir(id);
  if (!fs.existsSync(d)) throw new Error(`jobs/${id} 폴더가 없어요.`);
  return d;
}

export function setState(dir, state, extra = {}) {
  const f = path.join(dir, "status.json");
  const prev = fs.existsSync(f) ? readJson(f) : {};
  writeJson(f, { ...prev, state, updatedAt: new Date().toISOString(), ...extra });
}

export const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^0-9a-z가-힣]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

// 모델 응답에서 JSON 객체 하나를 꺼내요 (코드블록이 섞여 있어도 처리)
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("응답에서 JSON을 찾지 못했어요.");
  return JSON.parse(text.slice(start, end + 1));
}

// 렌더링에 꼭 필요한 필드가 있는지 확인해요
export function validateScript(s) {
  const errs = [];
  if (typeof s.hook !== "string" || !s.hook) errs.push("hook 이 없어요");
  if (typeof s.cta !== "string" || !s.cta) errs.push("cta 가 없어요");
  if (!Array.isArray(s.scenes) || s.scenes.length < 1) errs.push("scenes 가 비어 있어요");
  else
    s.scenes.forEach((x, i) => {
      if (typeof x.t !== "number" || x.t <= 0) errs.push(`scenes[${i}].t 는 양수 숫자여야 해요`);
      const type = x.type || "text";
      if (type === "text" && (typeof x.text !== "string" || !x.text)) errs.push(`scenes[${i}].text 가 없어요`);
      if (type === "cards" && !(Array.isArray(x.cards) && x.cards.length >= 1 && x.cards.length <= 4 && x.cards.every((c) => c.label && c.value)))
        errs.push(`scenes[${i}].cards 는 label·value 가 있는 카드 1~4개여야 해요`);
      if (type === "table" && !(x.table && Array.isArray(x.table.head) && Array.isArray(x.table.rows) && x.table.rows.length >= 1 && x.table.rows.length <= 5 && x.table.rows.every((r) => r.length === x.table.head.length)))
        errs.push(`scenes[${i}].table 은 head 와 같은 칸 수의 rows 1~5줄이어야 해요`);
    });
  return errs;
}

export function normalizeScript(s, id) {
  return {
    id,
    mode: "card_news",
    style: "photo",
    status: "pending",
    background: "gradient_navy",
    backgroundSrc: "",
    accentColor: "#FF8A1F",
    ...s,
  };
}

// 오류가 나면 길고 어려운 로그 대신 한 줄 메시지만 보여줘요
process.on("uncaughtException", (e) => {
  console.error(e.message);
  process.exit(1);
});

// ---------- 리서치용 도우미 ----------
// "5.2만", "12만 회", "120k", "1.2m", "52,000" → 숫자
export function parseViews(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/,/g, "").toLowerCase();
  const m = s.match(/^([\d.]+)\s*(억|만|천|k|m)?\s*(?:회|뷰|views?)?$/);
  if (!m) return null;
  const mul = { 억: 1e8, 만: 1e4, 천: 1e3, k: 1e3, m: 1e6 }[m[2]] || 1;
  return Math.round(parseFloat(m[1]) * mul);
}

export function platformOf(url) {
  if (/instagram\.com/.test(url)) return "instagram";
  if (/threads\.(net|com)/.test(url)) return "threads";
  if (/(twitter|x)\.com/.test(url)) return "x";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/youtu(\.be|be\.com)/.test(url)) return "youtube";
  return "web";
}

// inbox.md 한 줄: 링크 | 조회수 | 메모(선택)
export function parseInbox(text) {
  const items = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^https?:\/\//.test(line)) continue;
    const parts = line.split("|").map((x) => x.trim());
    items.push({
      raw: line,
      url: parts[0],
      platform: platformOf(parts[0]),
      views: parseViews(parts[1]),
      note: parts.slice(2).join(" | "),
    });
  }
  return items;
}

const fmt = (n) => (n == null ? "미기입" : n.toLocaleString("ko-KR"));

export function renderReport(date, ai, collected) {
  const L = [`# 레퍼런스 리서치 ${date}`, ""];
  if (ai?.topics?.length) {
    L.push("## 오늘의 추천 주제", "");
    ai.topics.forEach((t, i) => {
      L.push(`### ${i + 1}. ${t.title}`);
      if (t.why) L.push(`- 왜 지금: ${t.why}`);
      if (t.angle) L.push(`- 우리 계정 각도: ${t.angle}`);
      if (t.hookIdea) L.push(`- 후킹 아이디어: ${t.hookIdea}`);
      if (t.pattern) L.push(`- 추천 구성: ${t.pattern}`);
      L.push(`- 사실 확인: ${t.needsFactCheck ? "필요 (정책·금액·날짜 등 검증 후 제작)" : "크게 필요 없음"}`);
      (t.evidence || []).forEach((e) => L.push(`- 근거: ${e}`));
      L.push(`- 시작: \`npm run new -- "${String(t.title).replace(/"/g, "'")}"\``, "");
    });
    if (ai.patterns?.length) {
      L.push("## 잘 되는 구성 패턴", "", ...ai.patterns.map((p) => `- ${p}`), "");
    }
    if (ai.notes) L.push("## 참고", "", ai.notes, "");
  } else {
    L.push("> AI 요약 없이 수집 결과만 정리했어요 (ANTHROPIC_API_KEY 없음 또는 --dry).", "");
  }
  L.push("## 수집한 레퍼런스", "");
  const refs = [...(collected.inbox || []), ...(collected.youtube || [])];
  if (!refs.length) L.push("- (조건을 통과한 레퍼런스가 없어요)");
  refs.forEach((r) =>
    L.push(`- [${r.platform}] 조회수 ${fmt(r.views)}${r.title ? ` · ${r.title}` : ""}${r.note ? ` · ${r.note}` : ""} — ${r.url}`)
  );
  if (collected.inboxUnverified?.length) {
    L.push("", "### 조회수 미기입 (직접 확인 필요)");
    collected.inboxUnverified.forEach((r) => L.push(`- [${r.platform}] ${r.url}${r.note ? ` · ${r.note}` : ""}`));
  }
  if (collected.naver?.trends?.length) {
    L.push("", "## 네이버 검색량 변화 (최근 7일 vs 직전 7일)");
    collected.naver.trends.forEach((t) => L.push(`- ${t.keyword}: ${t.change > 0 ? "+" : ""}${t.change}%`));
  }
  if (collected.naver?.news?.length) {
    L.push("", "## 최신 뉴스 제목");
    collected.naver.news.forEach((n) => L.push(`- (${n.keyword}) ${n.title} — ${n.link}`));
  }
  L.push("", "---", `수집 요약: ${collected.summary || ""}`);
  return L.join("\n") + "\n";
}
