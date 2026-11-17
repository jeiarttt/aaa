# 프로젝트 인수인계 (claude.ai 대화 → Claude Code)

이 파일은 claude.ai 에서 진행한 대화 내용을 Claude Code 가 이어받도록 정리한 거예요. 먼저 README.md, SETUP.md, skill/SKILL.md 를 읽어요.

## 목표
부산 출신 서울 상경 2030 계정(재테크·자취 꿀팁·청년 혜택)의 **자막 카드뉴스형 인스타 릴스**를 주제와 상관없이 자동화.
처음엔 내 컴퓨터에서 돌리고, 나중에 클라우드/n8n 으로 옮길 수 있게 "폴더 파일 읽고 쓰는 독립 명령" 구조.

## 구성
- `src/` Remotion 템플릿 (1080x1920, 30fps). `data/script.json` 한 개로 영상 렌더링.
- `skill/SKILL.md` 릴스 대본 규칙(포맷·말투·면책·검수·배경·카드/표·줄바꿈). `skill/RESEARCH.md` 일일 리서치 지침.
- `pipeline/` 명령: new → generate → (backgrounds) → approve → render:job, 그리고 research / ref.
- `jobs/<날짜-주제>/` 작업 폴더(topic.md, script.json, status.json, out/). 예: `jobs/20261117-2027-서울-청년-월세-지원`.
- `research/` inbox.md(직접 모은 레퍼런스), 일일 리포트. `research.config.json` 설정.

## 확정한 디자인 규칙
- style "photo": 모든 장면 가로·세로 가운데 정렬. 큰 글자는 전부 히피체(눈누 CDN, SIL OFL 1.1 — 상업 이용 가능 확인됨). 라벨 칩·표·카드 설명은 Noto Sans KR.
- 라벨 칩: 주황(#FF8A1F, `accentColor` 한 곳에서 관리) 타원형 + 검은 테두리 1개. 라벨은 맥락이 필요할 때만 선택적으로.
- `[[강조]]` 는 포인트 컬러, 전체 2~3곳 이내.
- 말투 "~해요/~예요", 줄바꿈은 어절 단위(keep-all + balance).
- 배경: 사용자 파일 우선(`backgroundSrc`/장면별 `bg`), 없으면 `bgQuery` 로 Pexels 무료 사진, 그것도 없으면 기본 일러스트(public/bg). 어두운 오버레이 자동.
- 장면 종류: text / cards(요약 카드) / table(표). 등장 효과는 과하지 않게(줄 단위 페이드+상승+블러, 칩 팝, 장면 끝 페이드).
- 시점이 바뀌는 정보는 `status: "pending"` + `disclaimer_overlay` 자동 표시. 공식 출처로 확인 후에만 `confirmed`.
- 레퍼런스는 소재·구성 참고용만. 문구·구성 베끼기 금지.

## 정책·플랫폼 결정 사항
- 인스타 조회수 5만 이상 자동 수집은 공식적으로 불가(API 제약, 약관). 유료 도구는 쓰지 않기로 함.
- 레퍼런스 수집: ① 직접 모은 링크(inbox, 조회수 5만 이상만 통과) ② 유튜브 쇼츠 공식 API ③ 네이버 검색량·뉴스 API ④ Claude 웹 검색. X·쓰레드·인스타·틱톡은 직접 모은 링크로 받음.
- 업로드 자동화는 아직 안 함(인스타 Graph API, 비즈니스/크리에이터 계정 필요). 검수 승인 단계(approve)는 자동화에서 빼지 않기로 함.

## 현재 상태 / 아직 안 해본 것
- claude.ai 샌드박스에서는 폰트·크롬을 받을 수 없어 **실제 mp4 렌더링과 API 호출(generate, research, backgrounds)은 한 번도 실행해 보지 못했어요.** 타입 검사와 오프라인 단계(new, approve, ref, research --dry)만 테스트함.
- 첫 일: `npm install` → `npm run dev` 로 미리보기 → 히피체가 나오는지, 카드/표 레이아웃, 글자 크기 확인 → `npm run render:job` 로 mp4 생성.
- 키는 `.env` 에 직접 입력(채팅에 붙여넣지 말기): ANTHROPIC_API_KEY, (선택) YOUTUBE_API_KEY, NAVER_CLIENT_ID/SECRET, PEXELS_API_KEY.
- 매일 같은 시간 리서치는 SETUP.md 의 cron/작업 스케줄러 방법 참고.

## 진행 중인 작업
- 주제 "2027 서울 청년 월세 지원": 2027 서울시 예산안(2026.10.29)에서 청년월세 지원 대상 2만 3천 → 3만 2천 명 확대 보도. 시의회 심의 전, 2027 공고 전이라 `pending`.
- 확인 필요: 2026 선발 인원을 1만 5천 명으로 보도한 기사와 "2만 3천 명" 수치가 다른 이유(서울시 원문 확인). 확인 전엔 올해 인원을 영상에 넣지 않음.
- 표의 보증금 8천만/월세 60만/소득 48% 초과~150% 는 2026 공고 기준. 2027 공고 후 재확인.

## 다음 후보 작업
1. 실제 렌더링 확인 후 디자인 미세 조정.
2. n8n 등으로 research → generate → approve(승인 버튼) → render 묶기.
3. 인스타 Graph API 업로드 단계 추가(선택).
4. 승인 단계를 슬랙/이메일 링크로 대체.
