# 릴스 카드뉴스 자동화 (Remotion + Claude)

처음 설치와 연결 방법은 **SETUP.md**, 대본 규칙은 **skill/SKILL.md** 를 보세요.


`data/script.json` 하나로 9:16(1080x1920) 릴스를 렌더링해요.

## 사용법
```bash
npm install
npm run dev      # 미리보기 (Remotion Studio)
npm run render   # out/reel.mp4 생성
```
다른 대본으로 렌더링: `npx remotion render src/index.ts Reel out/other.mp4 --props=data/다른대본.json`

## 스타일 2종
- `"style": "photo"` : 사진/영상 배경 + 하단 어두운 그라데이션 + 초록 라벨 칩 + 흰색 굵은 제목 (기본 대본)
- `"style"` 없음 : 네이비 자막 카드 (`data/script-navy.json` 참고)
- photo 스타일은 배경이 있어야 예뻐요. `background: "video"` 또는 `"image"` 와 `backgroundSrc` 를 지정하세요.
- 라벨은 `hookLabel`, `scenes[].label`, `ctaLabel` 로 지정해요.

## 대본 JSON 규칙
- `hook` 3.5초, `scenes[].t` 장면별 초, `cta` 3.5초 → 전체 길이는 자동 계산돼요.
- 자막의 `\n` 은 줄바꿈이고, 줄마다 순서대로 나타나요.
- `status` 가 `confirmed` 가 아니면 `disclaimer_overlay` 문구가 하단에 자동으로 표시돼요.
  2027 공고 확인 후 `status` 를 `confirmed` 로 바꾸면 면책 문구가 사라져요.
- `caption`, `hashtags`, `sources`, `verify_before_post` 는 영상에 들어가지 않고 업로드/검수용이에요.

## 내 영상으로 만들기 (배경 교체)
1. 촬영한 세로 영상을 `public/myclip.mp4` 로 넣어요.
2. JSON에서 `"background": "video"`, `"backgroundSrc": "myclip.mp4"` 로 바꿔요.
   (이미지는 `"image"`.) 어두운 오버레이가 자동으로 깔려서 자막이 잘 보여요.
3. 영상 길이는 릴스 전체 길이(기본 약 31.5초)보다 길게 준비해요.

## 첫 타이틀(hook) 스타일 (photo 스타일)
- 모든 장면이 가로·세로 가운데 정렬이고, 큰 제목 글자는 전부 히피체(눈누 CDN)를 써요. 라벨 칩은 Noto Sans KR이에요. 배경에는 살짝 어두운 오버레이가 깔려요.
- 라벨 칩은 선택이에요. `label` 을 적은 장면에만 나오고, 안 적으면 칩 없이 제목만 나와요. 글만 봐서 맥락이 안 잡히는 장면에 넣어요.
- 포인트 컬러는 JSON의 `accentColor` 한 곳에서 정해요 (기본 주황 #FF8A1F). 라벨 칩 배경과 `[[강조]]` 글자에 쓰여요.
- 제목 안에서 `[[최대 240만 원]]` 처럼 감싼 부분만 포인트 컬러로 칠해져요. 핵심 숫자에만 아껴서 써요.
- 폰트 사용 조건(라이선스)은 눈누 페이지에서 한 번 확인해 주세요.

## 배경·카드·표·효과
- 배경: 기본은 도시 일러스트(public/bg). 내 영상·이미지는 public/ 에 넣고 `backgroundSrc`(전체) 또는 장면별 `bg` 에 파일 이름을 적어요(mp4/mov/webm/jpg/png).
- 자동 사진: 장면에 영어 `bgQuery` 를 적고 `npm run backgrounds -- <작업이름>` (PEXELS_API_KEY 필요, 무료). `bg` 가 이미 있으면 건드리지 않아요.
- 장면 종류: `type: "cards"`(요약 카드 2~4개), `type: "table"`(표). 예시는 jobs/ 의 2027 월세 작업 script.json.
- 효과: 글자 줄 단위 페이드+상승+블러 해제, 칩 팝, 장면 끝 페이드, 배경 슬로우 줌. 줄바꿈은 어절 단위.

## 알아두면 좋은 점
- 이모지(👀📌)가 영상에 안 나오면 Linux 환경에서 `fonts-noto-color-emoji` 를 설치해요.
- 폰트(Black Han Sans, Noto Sans KR)는 렌더링 시 Google Fonts에서 받아요. 인터넷 연결이 필요해요.
- 자막은 인스타 UI가 가리는 영역(상단 300px, 하단 380px, 오른쪽 150px)을 피해서 배치했어요.
