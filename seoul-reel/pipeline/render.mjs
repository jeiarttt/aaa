import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, requireJob, readJson, setState } from "./lib.mjs";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");
const dir = requireJob(id);
const status = readJson(path.join(dir, "status.json"));
if (status.state !== "approved" && status.state !== "rendered" && !force) {
  console.error(`아직 승인되지 않았어요(현재: ${status.state}). 먼저 npm run approve -- ${id}`);
  process.exit(1);
}

const script = readJson(path.join(dir, "script.json"));
const outDir = path.join(dir, "out");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "reel.mp4");

console.log("영상을 렌더링하는 중이에요 (처음엔 크롬 구성요소를 받느라 오래 걸릴 수 있어요)...");
const r = spawnSync(
  "npx",
  ["remotion", "render", "src/index.ts", "Reel", outFile, `--props=${path.join(dir, "script.json")}`],
  { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" }
);
if (r.status !== 0) {
  console.error("렌더링에 실패했어요.");
  process.exit(r.status || 1);
}

const caption = [script.caption || "", (script.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
fs.writeFileSync(path.join(outDir, "caption.txt"), caption, "utf8");
setState(dir, "rendered");
console.log(`\n완료: jobs/${id}/out/reel.mp4`);
console.log(`캡션: jobs/${id}/out/caption.txt (복사해서 업로드할 때 붙여넣어요)`);
