import fs from "node:fs";
import path from "node:path";
import { ROOT, JOBS, loadEnv, readJson, writeJson, today, extractJson, parseInbox, renderReport } from "./lib.mjs";

loadEnv();
const args = process.argv.slice(2);
const DRY = args.includes("--dry"); // 수집만 하고 AI 요약은 건너뜀
const cfg = readJson(path.join(ROOT, "research.config.json"));
const RDIR = path.join(ROOT, "research");
fs.mkdirSync(RDIR, { recursive: true });
const date = today();
const MIN = cfg.minViews ?? 50000;

// 1) 직접 모은 링크
function readInbox() {
  const f = path.join(RDIR, "inbox.md");
  if (!fs.existsSync(f)) return { pass: [], unverified: [], dropped: 0, all: [] };
  const all = parseInbox(fs.readFileSync(f, "utf8"));
  return {
    all,
    pass: all.filter((x) => x.views != null && x.views >= MIN),
    unverified: all.filter((x) => x.views == null),
    dropped: all.filter((x) => x.views != null && x.views < MIN).length,
  };
}

// 2) 유튜브 쇼츠 (공식 API, 조회수 필터)
const isoSec = (d) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || "") || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};
async function youtube() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!cfg.youtube?.enabled) return [];
  if (!key) return console.log("YOUTUBE_API_KEY 없음 → 유튜브 건너뜀"), [];
  const after = new Date(Date.now() - cfg.youtube.withinDays * 864e5).toISOString();
  const kwOf = new Map();
  for (const q of cfg.keywords) {
    const u = new URL("https://www.googleapis.com/youtube/v3/search");
    Object.entries({
      part: "snippet", type: "video", videoDuration: "short", order: "viewCount",
      maxResults: cfg.youtube.perKeyword, q, regionCode: "KR", relevanceLanguage: "ko",
      publishedAfter: after, key,
    }).forEach(([k, v]) => u.searchParams.set(k, v));
    const j = await (await fetch(u)).json();
    if (j.error) { console.error("YouTube 오류:", j.error.message); continue; }
    (j.items || []).forEach((it) => kwOf.set(it.id.videoId, q));
  }
  const ids = [...kwOf.keys()];
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const u = new URL("https://www.googleapis.com/youtube/v3/videos");
    u.searchParams.set("part", "snippet,statistics,contentDetails");
    u.searchParams.set("id", ids.slice(i, i + 50).join(","));
    u.searchParams.set("key", key);
    const j = await (await fetch(u)).json();
    for (const v of j.items || []) {
      const views = +v.statistics?.viewCount || 0;
      if (views < MIN || isoSec(v.contentDetails?.duration) > cfg.youtube.maxSeconds) continue;
      out.push({
        platform: "youtube", url: `https://www.youtube.com/shorts/${v.id}`, title: v.snippet.title,
        channel: v.snippet.channelTitle, views, likes: +v.statistics?.likeCount || null,
        publishedAt: v.snippet.publishedAt, keyword: kwOf.get(v.id),
      });
    }
  }
  return out.sort((a, b) => b.views - a.views);
}

// 3) 네이버 (공식 API: 검색량 변화 + 최신 뉴스)
async function naver() {
  const id = process.env.NAVER_CLIENT_ID, sec = process.env.NAVER_CLIENT_SECRET;
  if (!cfg.naver?.enabled) return { trends: [], news: [] };
  if (!id || !sec) return console.log("NAVER 키 없음 → 네이버 건너뜀"), { trends: [], news: [] };
  const headers = { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": sec };
  const news = [];
  for (const k of cfg.keywords) {
    const u = new URL("https://openapi.naver.com/v1/search/news.json");
    u.searchParams.set("query", k); u.searchParams.set("display", cfg.naver.newsPerKeyword || 3); u.searchParams.set("sort", "date");
    const r = await fetch(u, { headers });
    if (!r.ok) { console.error("네이버 뉴스 오류:", r.status); break; }
    (await r.json()).items.forEach((n) =>
      news.push({ keyword: k, title: n.title.replace(/<\/?b>/g, "").replace(/&quot;/g, '"'), link: n.originallink || n.link, pubDate: n.pubDate })
    );
  }
  const ymd = (d) => d.toISOString().slice(0, 10);
  const end = new Date(Date.now() - 864e5), start = new Date(end.getTime() - 13 * 864e5);
  const trends = [];
  for (let i = 0; i < cfg.keywords.length; i += 5) {
    const group = cfg.keywords.slice(i, i + 5);
    const r = await fetch("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: ymd(start), endDate: ymd(end), timeUnit: "date",
        keywordGroups: group.map((k) => ({ groupName: k, keywords: [k] })),
      }),
    });
    if (!r.ok) { console.error("네이버 데이터랩 오류:", r.status); break; }
    for (const res of (await r.json()).results) {
      const d = res.data.map((x) => x.ratio);
      const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
      const prev = avg(d.slice(0, 7)), cur = avg(d.slice(-7));
      trends.push({ keyword: res.title, change: prev ? Math.round(((cur - prev) / prev) * 100) : 0 });
    }
  }
  return { trends: trends.sort((a, b) => b.change - a.change), news };
}

// 4) Claude 요약 (+ 웹 검색)
async function summarize(collected) {
  if (DRY) return null;
  if (!process.env.ANTHROPIC_API_KEY) return console.log("ANTHROPIC_API_KEY 없음 → AI 요약 건너뜀"), null;
  const read = (f) => fs.readFileSync(path.join(ROOT, "skill", f), "utf8");
  const recentJobs = fs.existsSync(JOBS) ? fs.readdirSync(JOBS).slice(-20) : [];
  const body = {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
    max_tokens: 6000,
    system: `${read("SKILL.md")}\n\n${read("RESEARCH.md")}\n\n오늘 날짜: ${new Date().toISOString().slice(0, 10)}`,
    messages: [{ role: "user", content: `topN: ${cfg.topN}\nrecentJobs: ${JSON.stringify(recentJobs)}\n수집 데이터:\n${JSON.stringify({ inbox: collected.inbox, youtube: collected.youtube, naver: collected.naver }, null, 1)}` }],
  };
  if (cfg.webSearch?.enabled) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: cfg.webSearch.maxUses || 6 }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  writeJson(path.join(RDIR, `${date}.raw.json`), data);
  if (!res.ok) return console.error("API 오류:", JSON.stringify(data.error || data)), null;
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  try { return extractJson(text); } catch (e) { console.error("요약 JSON 해석 실패:", e.message); return null; }
}

console.log("리서치를 시작해요...");
const ib = readInbox();
const [yt, nv] = await Promise.all([youtube(), naver()]);
const collected = {
  inbox: ib.pass, inboxUnverified: ib.unverified, youtube: yt, naver: nv,
  summary: `직접 모은 링크 ${ib.all.length}개 중 ${MIN.toLocaleString("ko-KR")}회 이상 ${ib.pass.length}개(미기입 ${ib.unverified.length}, 미달 ${ib.dropped}) · 유튜브 쇼츠 ${yt.length}개 · 네이버 뉴스 ${nv.news.length}건`,
};
const ai = await summarize(collected);
writeJson(path.join(RDIR, `${date}.json`), { date, ai, collected });
const reportFile = path.join(RDIR, `${date}.md`);
fs.writeFileSync(reportFile, renderReport(date, ai, collected), "utf8");

// 처리한 inbox 줄은 보관 파일로 옮겨서 다음 날 중복되지 않게 해요 (미기입 줄은 남겨둬요)
if (ib.all.length && !DRY) {
  const done = new Set([...ib.pass, ...ib.all.filter((x) => x.views != null && x.views < MIN)].map((x) => x.raw));
  const f = path.join(RDIR, "inbox.md");
  const kept = fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => !done.has(l.trim()));
  fs.writeFileSync(f, kept.join("\n"), "utf8");
  fs.appendFileSync(path.join(RDIR, "inbox.archive.md"), [...done].map((l) => `${date} | ${l}`).join("\n") + "\n", "utf8");
}
console.log(collected.summary);
console.log(`\n리포트: research/${date}.md`);
