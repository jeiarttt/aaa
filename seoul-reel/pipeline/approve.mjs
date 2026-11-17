import path from "node:path";
import readline from "node:readline/promises";
import { requireJob, readJson, writeJson, setState, validateScript } from "./lib.mjs";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const yes = args.includes("--yes");
const confirm = args.includes("--confirm"); // 공식 공고로 확인 완료 → 면책 문구 제거
const dir = requireJob(id);
const file = path.join(dir, "script.json");
const script = readJson(file);

const errs = validateScript(script);
if (errs.length) {
  console.error("script.json 에 문제가 있어요:\n- " + errs.join("\n- "));
  process.exit(1);
}

console.log(`\n[${id}] 승인 전 확인`);
console.log("훅:", script.hook.replace(/\n/g, " / "));
console.log("출처:", (script.sources || []).join(", ") || "(없음)");
console.log("\n게시 전 확인 항목:");
(script.verify_before_post || ["수치·날짜·조건을 공식 출처와 대조"]).forEach((v) => console.log(" [ ] " + v));

if (!yes) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("\n위 항목을 모두 확인했나요? (y/N) ")).trim().toLowerCase();
  rl.close();
  if (a !== "y") {
    console.log("승인하지 않았어요. script.json 을 고친 뒤 다시 실행해 주세요.");
    process.exit(0);
  }
}

if (confirm) {
  script.status = "confirmed";
  writeJson(file, script);
  console.log('status 를 "confirmed" 로 바꿨어요 (면책 문구가 빠져요).');
}
setState(dir, "approved");
console.log(`승인했어요. 다음: npm run render -- ${id}`);
