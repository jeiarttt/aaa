import fs from "node:fs";
import path from "node:path";
import { ROOT, loadEnv, requireJob, writeJson, setState, extractJson, validateScript, normalizeScript } from "./lib.mjs";

loadEnv();
const id = process.argv[2];
const dir = requireJob(id);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY 가 없어요. .env 파일에 넣거나, claude.ai 에서 만든 대본을");
  console.error(`jobs/${id}/script.json 에 직접 붙여넣고 npm run approve 로 넘어가도 돼요.`);
  process.exit(1);
}

const skill = fs.readFileSync(path.join(ROOT, "skill", "SKILL.md"), "utf8");
const topic = fs.readFileSync(path.join(dir, "topic.md"), "utf8");
const model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const todayStr = new Date().toISOString().slice(0, 10);

const system = `${skill}

오늘 날짜: ${todayStr}
출력 규칙: 최종 답변은 대본 JSON 객체 하나만 출력한다. 설명, 코드블록, 머리말을 붙이지 않는다.
사실 확인이 필요하면 먼저 웹 검색을 사용한다.`;

console.log(`대본을 만드는 중이에요 (모델: ${model})...`);
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model,
    max_tokens: 4000,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    messages: [{ role: "user", content: `아래 주제로 릴스 대본 JSON을 만들어줘.\n\n${topic}` }],
  }),
});

const data = await res.json();
writeJson(path.join(dir, "generate.raw.json"), data);
if (!res.ok) {
  console.error("API 오류:", JSON.stringify(data.error || data));
  process.exit(1);
}

const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
let script;
try {
  script = normalizeScript(extractJson(text), id);
} catch (e) {
  console.error(e.message, `(원본 응답: jobs/${id}/generate.raw.json)`);
  process.exit(1);
}
const errs = validateScript(script);
if (errs.length) {
  console.error("대본 형식에 문제가 있어요:\n- " + errs.join("\n- "));
  writeJson(path.join(dir, "script.invalid.json"), script);
  process.exit(1);
}

writeJson(path.join(dir, "script.json"), script);
setState(dir, "generated");
console.log(`저장했어요: jobs/${id}/script.json`);
console.log("\n게시 전 확인 항목:");
(script.verify_before_post || []).forEach((v) => console.log(" - " + v));
console.log(`\n다음: npm run approve -- ${id}`);
