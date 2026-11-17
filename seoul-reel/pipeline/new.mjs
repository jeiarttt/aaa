import fs from "node:fs";
import path from "node:path";
import { JOBS, jobDir, today, slugify, setState } from "./lib.mjs";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('주제를 적어 주세요. 예: npm run new -- "2027 서울 청년 월세 지원"');
  process.exit(1);
}
fs.mkdirSync(JOBS, { recursive: true });
const id = `${today()}-${slugify(topic)}`;
const dir = jobDir(id);
if (fs.existsSync(dir)) {
  console.error(`이미 있어요: jobs/${id}`);
  process.exit(1);
}
fs.mkdirSync(path.join(dir, "out"), { recursive: true });
fs.writeFileSync(
  path.join(dir, "topic.md"),
  `# 주제\n${topic}\n\n# 메모 (선택: 강조하고 싶은 점, 쓰지 말아야 할 내용, 배경 영상 파일 이름 등)\n\n`,
  "utf8"
);
setState(dir, "new", { topic });
console.log(`작업 폴더를 만들었어요: jobs/${id}`);
console.log(`다음: npm run generate -- ${id}`);
