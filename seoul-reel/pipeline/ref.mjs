import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib.mjs";

const [url, views, ...memo] = process.argv.slice(2);
if (!url || !/^https?:\/\//.test(url)) {
  console.error('사용법: npm run ref -- <링크> <조회수> "메모"   예) npm run ref -- https://www.instagram.com/reel/xxx 12.5만 "후킹이 강함"');
  process.exit(1);
}
const f = path.join(ROOT, "research", "inbox.md");
fs.mkdirSync(path.dirname(f), { recursive: true });
fs.appendFileSync(f, `${url} | ${views || ""} | ${memo.join(" ")}\n`, "utf8");
console.log("inbox 에 추가했어요:", url);
