# 프리미엄 영화관 예매 오픈 알림 봇

CGV의 IMAX와 메가박스의 Dolby Cinema 상영시간표를 확인해, 지정 영화의 주말 11:00~18:00 회차가 예매 가능해지면 카카오톡 **나와의 채팅**으로 한 번만 알립니다. 좌석 페이지, 좌석 선점, 로그인, 결제는 건드리지 않습니다.

CGV는 독립 실행형 백그라운드 브라우저 접속을 차단하므로 우회하지 않습니다. 메가박스는 로컬 프로세스가 확인하고, CGV는 Codex 인앱 브라우저 예약 작업이 정상 화면을 저빈도로 확인하는 하이브리드 구조입니다.

현재 감시 지점:

- CGV 왕십리, 용산아이파크몰, 천호: IMAX
- 메가박스 남양주현대아울렛스페이스원(다산), 하남스타필드: Dolby Cinema

## 1. 설치

Node.js 20 이상과 Chrome 또는 Edge가 필요합니다.

```powershell
npm install
Copy-Item .env.example .env
```

## 2. 카카오톡 연결

1. [Kakao Developers](https://developers.kakao.com/)에서 개인 앱을 만듭니다.
2. 카카오 로그인을 활성화합니다.
3. Redirect URI에 `http://localhost:8787/callback`을 등록합니다.
4. 동의항목에서 `카카오톡 메시지 전송(talk_message)`을 사용 설정합니다.
5. 제품 링크 관리의 웹 도메인에 `https://cgv.co.kr`, `https://www.megabox.co.kr`를 등록합니다. 알림의 "예매 페이지 열기" 버튼에 필요합니다.
6. `.env`에 REST API 키와 클라이언트 시크릿을 입력합니다. 신규 REST API 키는 클라이언트 시크릿이 기본 활성화되어 있습니다.
7. 아래 명령을 실행하고 표시된 주소에서 본인 카카오계정으로 동의합니다.

```powershell
npm run kakao:login
```

토큰은 `data/kakao-token.json`에만 저장되고 Git에서 제외됩니다. 액세스 토큰은 자동 갱신되며, 리프레시 토큰이 만료되면 위 명령으로 다시 연결합니다.

## 3. 영화 지정 및 확인

```powershell
npm run set-movie -- "오디세이"
npm run check
```

`npm run check`는 실제 카카오톡을 보내지 않고 메가박스의 현재 조건에 맞는 결과만 출력합니다. `monitor.config.json`의 `movieTitle`을 직접 바꿔도 되며, 실행 중인 봇은 다음 확인 주기에 변경 내용을 읽습니다. CGV 감시는 아래 Codex 예약 작업이 담당합니다.

## 4. 계속 실행

```powershell
npm start
```

기본 확인 주기는 3분, 탐색 범위는 오늘부터 14일입니다. 사이트 부하와 차단 위험을 줄이기 위해 확인 주기를 60초 미만으로 설정할 수 없습니다. PC가 켜져 있고 이 프로세스가 실행 중이어야 합니다.

Windows 로그인 후 자동 실행하려면 작업 스케줄러에서 프로그램을 `C:\Program Files\nodejs\npm.cmd`, 인수를 `start`, 시작 위치를 이 프로젝트 폴더로 지정하세요.

## 동작 원칙

- 토요일·일요일만 확인합니다.
- 시작 시각 11:00과 18:00을 포함합니다.
- 예매 가능한 버튼이 표시된 회차만 감지합니다.
- 동일한 지점·날짜·영화·회차는 `data/state.json`으로 중복 알림을 막습니다.
- 영화관 사이트가 화면 구조를 바꾸면 감시 선택자 업데이트가 필요할 수 있습니다.

## CGV Codex 예약 작업

영화 제목을 지정한 뒤 이 Codex 작업에서 “이 영화로 감시를 시작해줘”라고 말하면, 다음 조건의 인앱 브라우저 예약 작업을 활성화합니다.

- 왕십리, 용산아이파크몰, 천호의 IMAX
- 오늘부터 14일 이내 토요일과 일요일
- 시작 시각 11:00~18:00
- 공개 상영시간표에서 예매 가능한 신규 회차만 확인
- 신규 회차는 `npm run notify-one -- ...`를 통해 같은 카카오톡 나와의 채팅으로 전송

Codex 예약 작업도 PC와 Codex 앱이 열려 있어야 지속 실행됩니다. CGV가 대기 화면이나 접속 제한을 표시하면 우회하지 않고 해당 실행을 실패 처리합니다.

## GitHub 무료 실행

아이폰 사용자는 공개 GitHub 저장소의 예약 실행을 이용하면 PC를 꺼도 5분 간격으로 감시할 수 있습니다. 공개 저장소의 일반 실행 환경은 무료이며, 카카오 키와 토큰 암호는 저장소의 비밀 값으로 보관합니다.

필요한 저장소 설정:

- 변수 `MOVIE_TITLE`: 감시할 영화 제목
- 비밀 값 `KAKAO_REST_API_KEY`: 카카오 REST API 키
- 비밀 값 `KAKAO_CLIENT_SECRET`: 카카오 클라이언트 시크릿
- 비밀 값 `TOKEN_ENCRYPTION_PASSWORD`: 16자 이상의 임의 암호

카카오 로그인 후 다음 명령으로 토큰을 암호화하여 `data/kakao-token.enc`만 저장소에 올립니다. 원본 `data/kakao-token.json`은 절대 올리지 않습니다.

```powershell
$env:TOKEN_ENCRYPTION_PASSWORD="GitHub에 등록할 16자 이상의 암호"
npm run token:encrypt
```

예약 실행은 CGV와 메가박스를 모두 확인합니다. CGV가 GitHub 브라우저 접속을 제한하면 우회하지 않고 해당 지점 확인만 실패 처리합니다.
