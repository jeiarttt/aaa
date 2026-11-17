import fs from "node:fs";
import path from "node:path";
import { ROOT, loadEnv, requireJob, readJson, writeJson } from "./lib.mjs";

loadEnv();
const id = process.argv[2];
const dir = requireJob(id);
const file = path.join(dir, "script.json");
const script = readJson(file);
const key = process.env.PEXELS_API_KEY;
if (!key) {
  console.error("PEXELS_API_KEY 가 없어요. pexels.com/api 에서 무료로 발급해 .env 에 넣어 주세요.");
  console.error("키 없이도 렌더링은 돼요: 기본 일러스트가 깔리고, 내 사진·영상은 public/ 에 넣고 bg 에 파일 이름을 적으면 돼요.");
  process.exit(1);
}

const outDir = path.join(ROOT, "public", "bg", id);
fs.mkdirSync(outDir, { recursive: true });

async function fetchPhoto(query, name) {
  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", query);
  u.searchParams.set("orientation", "portrait");
  u.searchParams.set("per_page", "5");
  const r = await fetch(u, { headers: { Authorization: key } });
  if (!r.ok) throw new Error(`Pexels 오류 ${r.status}`);
  const j = await r.json();
  const p = j.photos?.[0];
  if (!p) return null;
  const img = await fetch(p.src.portrait || p.src.large2x || p.src.large);
  if (!img.ok) throw new Error(`이미지 다운로드 실패 ${img.status}`);
  const rel = `bg/${id}/${name}.jpg`;
  fs.writeFileSync(path.join(ROOT, "public", rel), Buffer.from(await img.arrayBuffer()));
  return { rel, credit: `${p.photographer} (Pexels) ${p.url}` };
}

const credits = [];
const jobs = [];
if (script.bgQuery && !script.backgroundSrc) jobs.push({ q: script.bgQuery, name: "base", set: (rel) => (script.backgroundSrc = rel) });
script.scenes.forEach((s, i) => {
  if (s.bgQuery && !s.bg) jobs.push({ q: s.bgQuery, name: `scene${i + 1}`, set: (rel) => (s.bg = rel) });
});
for (const j of jobs) {
  try {
    const res = await fetchPhoto(j.q, j.name);
    if (res) { j.set(res.rel); credits.push(res.credit); console.log(`${j.name}: ${j.q} → ${res.rel}`); }
    else console.log(`${j.name}: "${j.q}" 결과 없음 (기본 배경 사용)`);
  } catch (e) {
    console.error(`${j.name}: ${e.message}`);
  }
}
writeJson(file, script);
if (credits.length) fs.writeFileSync(path.join(dir, "bg-credits.txt"), credits.join("\n") + "\n", "utf8");
console.log("완료. 마음에 안 드는 사진은 script.json 의 bg 를 내 파일 이름으로 바꾸면 돼요.");
