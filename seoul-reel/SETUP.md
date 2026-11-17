# 내 컴퓨터에 연결하기 (처음 한 번)

이 폴더를 내 컴퓨터로 옮긴 뒤, **Claude Code(또는 Claude 데스크톱 앱의 Code 탭)** 에서 이 폴더를 열고
아래 "Claude에게 붙여넣을 요청"을 그대로 보내면 설치부터 첫 테스트까지 Claude가 진행해 줘요.

## 필요한 것
- Node.js 18 이상 (nodejs.org 의 LTS)
- (자동 대본 생성을 쓸 때만) Anthropic API 키: console.anthropic.com 에서 발급.
  claude.ai 구독과는 별도예요. 키가 없으면 대본만 claude.ai 에서 만들어 붙여넣는 반자동으로도 돼요.
- 인터넷 연결 (폰트, 크롬 구성요소, API 호출)

## Claude에게 붙여넣을 요청
```
이 폴더는 인스타 릴스 자동화 프로젝트야. SETUP.md 와 README.md 를 읽고 아래 순서대로 진행해줘.
1. node -v 로 Node.js 18 이상인지 확인하고, 없으면 설치 방법을 알려줘.
2. npm install 을 실행해줘.
3. .env.example 을 복사해서 .env 를 만들고, ANTHROPIC_API_KEY 는 내가 직접 입력할 수 있게 안내해줘.
   (API 키를 대화에 붙여넣으라고 하지 말고, 파일에 직접 넣는 방법만 알려줘.)
4. npm run dev 로 미리보기가 뜨는지 확인해줘.
5. 테스트로 npm run new -- "테스트 주제" 를 실행하고, data/script.json 을 해당 작업 폴더의
   script.json 으로 복사한 뒤 approve → render:job 까지 돌려서 jobs/<작업>/out/reel.mp4 가 생기는지 확인해줘.
6. 문제가 생기면 원인과 해결 방법을 쉬운 말로 설명해줘.
끝나면 "내가 앞으로 쓸 명령어"를 짧게 정리해줘.
```

## 평소 사용 순서
```bash
npm run new -- "주제"              # 작업 폴더 생성 (jobs/날짜-주제)
npm run generate -- <작업이름>      # Claude가 검색+대본 생성 → script.json
npm run approve -- <작업이름>       # 사람이 검수 체크 후 승인 (필수 단계)
npm run backgrounds -- <작업이름>   # (선택) bgQuery 로 배경 사진 자동 다운로드
npm run render:job -- <작업이름>    # out/reel.mp4 + caption.txt 생성
```
- 자동 생성 없이 쓰려면: 작업 폴더 만들기 → claude.ai 에서 skill/SKILL.md 규칙으로 만든 JSON 을
  jobs/<작업>/script.json 으로 저장 → approve → render:job
- 공식 공고로 확인이 끝났다면 `npm run approve -- <작업이름> --confirm` 으로 면책 문구를 뺄 수 있어요.
- 내 영상을 배경으로: 영상을 public/ 에 넣고 script.json 의 `background: "video"`, `backgroundSrc: "파일명.mp4"`.

## 매일 레퍼런스 리서치 (무료 소스만)
```bash
npm run ref -- <링크> <조회수> "메모"   # 인스타·쓰레드·X·틱톡에서 본 잘 된 릴스를 inbox 에 추가
npm run research                        # 수집 + AI 요약 → research/날짜.md
npm run research -- --dry               # AI 요약 없이 수집만 (키 없이 테스트할 때)
```
- 소스: ① research/inbox.md (직접 모은 링크, 조회수 5만 이상만 통과) ② 유튜브 쇼츠(공식 API)
  ③ 네이버 검색량·뉴스(공식 API) ④ Claude 웹 검색. 키가 없는 소스는 자동으로 건너뛰어요.
- 설정(키워드, 최소 조회수 등)은 `research.config.json`, 키는 `.env` 에 넣어요.
  - YOUTUBE_API_KEY: Google Cloud 콘솔에서 YouTube Data API v3 사용 설정 후 발급(무료 한도 있음)
  - NAVER_CLIENT_ID / NAVER_CLIENT_SECRET: 네이버 개발자센터에서 애플리케이션 등록(검색, 데이터랩)
- 리포트의 "시작" 명령을 복사해서 실행하면 그 주제로 작업 폴더가 만들어져요.
- 레퍼런스는 소재·구성 참고용이에요. 문구와 구성을 그대로 따라 하지 않는 규칙이 스킬에 들어 있어요.
- 인스타·쓰레드·X 는 자동 수집하지 않고 직접 모은 링크로 받아요 (공식 API 제약, 약관 때문).

### 매일 같은 시간에 자동 실행 (내 컴퓨터가 켜져 있을 때)
- Mac/Linux (터미널에서 `crontab -e`, 매일 오전 8시 예시):
  `0 8 * * * cd /프로젝트/경로 && npm run research >> research/cron.log 2>&1`
- Windows (명령 프롬프트, 매일 오전 8시 예시):
  `schtasks /create /sc daily /st 08:00 /tn "reels-research" /tr "cmd /c cd /d C:\프로젝트\경로 && npm run research"`
- node 가 cron 에서 안 잡히면 Claude에게 "research 를 매일 8시에 돌리게 설정해줘" 라고 맡기세요.
- 나중에 클라우드로 옮기면 컴퓨터가 꺼져 있어도 같은 명령이 돌아가요.

## 나중에 클라우드/자동화 도구로 옮기기
각 단계가 "작업 폴더의 파일을 읽고 쓰는 독립 명령"이라서 그대로 옮길 수 있어요.

| 지금(내 컴퓨터) | 나중에 |
|---|---|
| 터미널에서 명령 실행 | n8n/Make 의 Execute Command 노드, 또는 서버의 예약 작업(cron) |
| `jobs/` 폴더 | 클라우드 저장소(Drive, S3 등) 또는 서버 디스크 |
| `.env` 의 API 키 | 서버·도구의 비밀 값(환경변수) 설정 |
| 직접 `approve` | 승인 버튼(슬랙, 이메일 링크 등) 으로 대체 — 검수 단계는 남기길 추천 |
| 직접 업로드 | 인스타 Graph API 단계 추가 (비즈니스/크리에이터 계정 필요) |

옮길 때 Claude에게 "이 프로젝트를 ○○(n8n/서버)에서 돌리도록 바꿔줘. docs/MIGRATION 대신 SETUP.md 의 표를 참고해" 라고 하면 돼요.
