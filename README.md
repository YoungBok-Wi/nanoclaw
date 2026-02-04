<p align="center">
  <img src="assets/nanoclaw-logo.png" alt="NanoClaw" width="400">
</p>

<p align="center">
  컨테이너에서 안전하게 실행되는 개인용 Claude AI 비서입니다. 가볍고, 이해하기 쉬우며, 자신만의 필요에 맞게 커스터마이징할 수 있도록 설계되었습니다.
</p>

---

## 기술 용어 설명 (처음 접하시는 분들을 위해)

이 프로젝트를 이해하기 위해 알아야 할 핵심 용어들입니다:

| 용어 | 설명 |
|------|------|
| **Node.js** | JavaScript를 컴퓨터에서 실행할 수 있게 해주는 프로그램입니다. 원래 JavaScript는 웹브라우저에서만 동작하는데, Node.js 덕분에 일반 프로그램처럼 실행할 수 있습니다. |
| **TypeScript** | JavaScript에 "타입"이라는 안전장치를 추가한 언어입니다. 코드에서 실수를 미리 잡아줍니다. `.ts` 파일로 작성하고 `.js`로 변환해서 실행합니다. |
| **Claude** | Anthropic에서 만든 AI 모델입니다. ChatGPT와 비슷하지만 다른 회사의 제품입니다. |
| **Claude Code** | Claude를 터미널(명령어 창)에서 사용할 수 있게 해주는 프로그램입니다. 코드 작성, 파일 수정 등을 도와줍니다. |
| **Claude Agent SDK** | 앱 안에서 Claude를 사용할 수 있게 해주는 개발 도구입니다. 이 프로젝트의 핵심 엔진입니다. |
| **컨테이너 (Container)** | 프로그램을 격리된 "상자" 안에서 실행하는 기술입니다. 컨테이너 안의 프로그램은 컴퓨터의 다른 부분에 접근할 수 없어서 안전합니다. |
| **Docker** | 컨테이너를 만들고 실행하는 가장 유명한 프로그램입니다. Windows, Mac, Linux 모두에서 사용 가능합니다. |
| **Apple Container** | Apple이 만든 Mac 전용 컨테이너 시스템입니다. Docker보다 Mac에서 더 빠릅니다. |
| **Discord** | 게이머와 커뮤니티에서 많이 쓰이는 메신저 플랫폼입니다. 이 프로젝트는 Discord로 AI에게 말을 걸 수 있게 해줍니다. |
| **Discord.js** | Discord Bot을 프로그램으로 만들 수 있게 해주는 공식 JavaScript 라이브러리입니다. |
| **SQLite** | 파일 하나로 동작하는 가벼운 데이터베이스입니다. 별도 서버 설치 없이 사용할 수 있습니다. |
| **MCP (Model Context Protocol)** | AI가 외부 도구(웹 검색, 파일 읽기 등)를 사용할 수 있게 해주는 표준 프로토콜입니다. |
| **launchd** | Mac에서 프로그램을 백그라운드에서 자동 실행하게 해주는 시스템입니다. Windows의 "서비스"와 비슷합니다. |
| **WSL2** | Windows에서 Linux를 실행할 수 있게 해주는 기능입니다. Windows 사용자가 이 프로젝트를 쓰려면 필요합니다. |

---

## 왜 이 프로젝트를 만들었나

[OpenClaw](https://github.com/openclaw/openclaw)는 훌륭한 비전을 가진 인상적인 프로젝트입니다. 하지만 저는 제 삶에 접근 권한을 가진, 이해하지 못하는 소프트웨어를 실행하면서 편히 잠들 수 없었습니다. OpenClaw는 52개 이상의 모듈, 8개의 설정 파일, 45개 이상의 의존성, 15개 채널 제공자를 위한 추상화를 가지고 있습니다. 보안은 OS 격리가 아닌 애플리케이션 수준(허용 목록, 페어링 코드)입니다. 모든 것이 공유 메모리를 가진 하나의 Node 프로세스에서 실행됩니다.

NanoClaw는 **8분 안에 이해할 수 있는** 코드베이스로 동일한 핵심 기능을 제공합니다. 하나의 프로세스. 몇 개의 파일. 에이전트는 권한 검사 뒤가 아닌 실제 Linux 컨테이너에서 파일 시스템 격리와 함께 실행됩니다.

---

## 빠른 시작

```bash
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
claude
```

그런 다음 `/setup`을 실행하세요. Claude Code가 모든 것을 처리합니다: 의존성 설치, 인증, 컨테이너 설정, 서비스 구성.

### Windows 사용자 안내

이 프로젝트는 원래 macOS/Linux용으로 만들어졌습니다. Windows에서 사용하려면:

1. **WSL2 설치**: Windows 기능에서 "Linux용 Windows 하위 시스템"을 활성화하세요
2. **Docker Desktop 설치**: [docker.com](https://docker.com/products/docker-desktop)에서 다운로드
3. WSL2 터미널 안에서 위의 명령어를 실행하세요

> ⚠️ 현재 Windows 전용 `/setup-windows` 스킬이 개발 중입니다. 기여를 환영합니다!

---

## 철학

**이해할 수 있을 만큼 작게.** 하나의 프로세스, 몇 개의 소스 파일. 마이크로서비스 없음, 메시지 큐 없음, 추상화 레이어 없음. Claude Code에게 코드를 설명해달라고 하세요.

**격리를 통한 보안.** 에이전트는 Linux 컨테이너(macOS에서는 Apple Container, 또는 Docker)에서 실행됩니다. 명시적으로 마운트된 것만 볼 수 있습니다. Bash 접근이 안전한 이유는 명령이 호스트가 아닌 컨테이너 안에서 실행되기 때문입니다.

**한 명의 사용자를 위해 만듦.** 이것은 프레임워크가 아닙니다. 제 정확한 필요에 맞는 작동하는 소프트웨어입니다. 여러분이 포크해서 Claude Code로 여러분의 정확한 필요에 맞게 만드세요.

**커스터마이징 = 코드 변경.** 설정 파일의 범람 없음. 다른 동작을 원하면? 코드를 수정하세요. 코드베이스가 충분히 작아서 이것이 안전합니다.

**AI 네이티브.** 설치 마법사 없음; Claude Code가 설정을 안내합니다. 모니터링 대시보드 없음; Claude에게 무슨 일이 일어나는지 물어보세요. 디버깅 도구 없음; 문제를 설명하면 Claude가 고칩니다.

**기능보다 스킬.** 기여자들은 코드베이스에 기능(예: Telegram 지원)을 추가해서는 안 됩니다. 대신 여러분의 포크를 변환하는 [claude code 스킬](https://code.claude.com/docs/en/skills)을 기여하세요(예: `/add-telegram`). 결과적으로 여러분이 필요로 하는 것만 정확히 수행하는 깔끔한 코드를 갖게 됩니다.

**최고의 하네스, 최고의 모델.** 이것은 Claude Agent SDK에서 실행됩니다. 즉, Claude Code를 직접 실행하는 것입니다. 하네스가 중요합니다. 나쁜 하네스는 똑똑한 모델도 멍청해 보이게 만들고, 좋은 하네스는 초능력을 줍니다. Claude Code는 (제 생각에) 현재 사용 가능한 최고의 하네스입니다.

---

## 지원 기능

- **Discord 입출력** - Discord 서버나 DM으로 Claude에게 메시지 보내기
- **격리된 채널 컨텍스트** - 각 Discord 채널은 자체 `CLAUDE.md` 메모리, 격리된 파일 시스템을 가지며, 해당 파일 시스템만 마운트된 자체 컨테이너 샌드박스에서 실행
- **메인 채널** - 관리 제어를 위한 개인 채널(DM 또는 특정 채널); 다른 모든 채널은 완전히 격리됨
- **예약 작업** - Claude를 실행하고 메시지를 보낼 수 있는 반복 작업
- **웹 접근** - 검색 및 콘텐츠 가져오기
- **컨테이너 격리** - Apple Container(macOS) 또는 Docker(macOS/Linux)에서 샌드박스된 에이전트
- **선택적 통합** - 스킬을 통해 Gmail(`/add-gmail`) 등 추가

---

## 사용법

트리거 단어(기본값: `@Blanc`)로 비서와 대화하세요:

```
@Blanc 매주 평일 아침 9시에 영업 파이프라인 개요를 보내줘 (내 Obsidian vault 폴더에 접근 가능)
@Blanc 매주 금요일에 지난 주 git 히스토리를 검토하고 변경이 있으면 README를 업데이트해줘
@Blanc 매주 월요일 오전 8시에 Hacker News와 TechCrunch에서 AI 개발 뉴스를 모아서 브리핑해줘
```

메인 채널(DM 또는 지정된 관리 채널)에서 채널과 작업을 관리할 수 있습니다:
```
@Blanc 모든 채널의 예약 작업 목록 보여줘
@Blanc 월요일 브리핑 작업 일시 중지해줘
@Blanc #general 채널에 참여해줘
```

---

## 커스터마이징

배울 설정 파일이 없습니다. Claude Code에게 원하는 것을 말하기만 하면 됩니다:

- "트리거 단어를 @봇으로 바꿔줘"
- "앞으로 응답을 더 짧고 직접적으로 해달라고 기억해줘"
- "내가 좋은 아침이라고 말하면 맞춤 인사를 추가해줘"
- "주간 대화 요약을 저장해줘"

또는 `/customize`를 실행해서 안내에 따라 변경하세요.

코드베이스가 충분히 작아서 Claude가 안전하게 수정할 수 있습니다.

---

## 기여하기

**기능을 추가하지 마세요. 스킬을 추가하세요.**

Telegram 지원을 추가하고 싶다면, WhatsApp 옆에 Telegram을 추가하는 PR을 만들지 마세요. 대신 Claude Code에게 NanoClaw 설치를 Telegram을 사용하도록 변환하는 방법을 가르치는 스킬 파일(`.claude/skills/add-telegram/SKILL.md`)을 기여하세요.

사용자들은 자신의 포크에서 `/add-telegram`을 실행하고 모든 사용 사례를 지원하려는 비대한 시스템이 아닌, 정확히 필요한 것만 하는 깔끔한 코드를 얻게 됩니다.

### RFS (스킬 요청)

우리가 보고 싶은 스킬들:

**커뮤니케이션 채널**
- `/add-telegram` - Telegram을 채널로 추가. Discord를 대체하거나 추가 채널로 사용하는 옵션 제공. 제어 채널(작업을 트리거할 수 있는)로 추가하거나 다른 곳에서 트리거된 작업에서만 사용되는 채널로 추가 가능
- `/add-slack` - Slack 추가
- `/add-whatsapp` - WhatsApp 추가 (baileys 라이브러리 사용)

**플랫폼 지원**
- `/setup-windows` - WSL2 + Docker를 통한 Windows 지원

**세션 관리**
- `/add-clear` - 대화를 압축하는 `/clear` 명령 추가 (동일 세션에서 중요 정보를 보존하면서 컨텍스트 요약). Claude Agent SDK를 통해 프로그래밍 방식으로 압축을 트리거하는 방법 파악 필요.

---

## 요구 사항

- macOS 또는 Linux (Windows는 WSL2 필요)
- Node.js 20+
- [Claude Code](https://claude.ai/download)
- [Apple Container](https://github.com/apple/container) (macOS) 또는 [Docker](https://docker.com/products/docker-desktop) (macOS/Linux/Windows)

---

## 아키텍처

```
Discord Bot (discord.js) --> SQLite --> 폴링 루프 --> 컨테이너 (Claude Agent SDK) --> 응답
```

단일 Node.js 프로세스. 에이전트는 마운트된 디렉토리와 함께 격리된 Linux 컨테이너에서 실행됩니다. 파일 시스템을 통한 IPC. 데몬 없음, 큐 없음, 복잡성 없음.

### 작동 방식 (간단 설명)

1. **Discord 연결**: discord.js 라이브러리가 Discord API에 연결합니다
2. **메시지 저장**: 받은 메시지가 SQLite 데이터베이스에 저장됩니다
3. **메시지 확인**: 2초마다 새 메시지가 있는지 확인합니다
4. **트리거 감지**: `@Blanc`로 시작하는 메시지를 찾습니다
5. **컨테이너 실행**: 격리된 컨테이너에서 Claude Agent SDK를 실행합니다
6. **응답 전송**: Claude의 응답을 Discord로 보냅니다

### 주요 파일

| 파일 | 역할 |
|------|------|
| `src/index.ts` | 메인 앱: Discord 연결, 라우팅, IPC |
| `src/container-runner.ts` | 에이전트 컨테이너 생성 |
| `src/task-scheduler.ts` | 예약 작업 실행 |
| `src/db.ts` | SQLite 데이터베이스 작업 |
| `groups/*/CLAUDE.md` | 채널별 메모리 |

---

## FAQ

**왜 Discord이고 Telegram/WhatsApp 등은 아닌가요?**

이 포크는 Discord를 사용합니다. 다른 플랫폼을 원하면 포크해서 스킬을 실행해 바꾸세요. 그게 전체 포인트입니다.

**왜 Docker 대신 Apple Container인가요?**

macOS에서 Apple Container는 가볍고 빠르며 Apple 실리콘에 최적화되어 있습니다. 하지만 Docker도 완전히 지원됩니다—`/setup` 중에 어떤 런타임을 사용할지 선택할 수 있습니다. Linux에서는 자동으로 Docker가 사용됩니다.

**Linux에서 실행할 수 있나요?**

네. `/setup`을 실행하면 자동으로 Docker를 컨테이너 런타임으로 구성합니다. `/convert-to-docker` 스킬을 기여해주신 [@dotsetgreg](https://github.com/dotsetgreg)님께 감사드립니다.

**Windows에서 실행할 수 있나요?**

WSL2와 Docker를 설치하면 가능합니다. WSL2 터미널 안에서 프로젝트를 실행하세요.

**이것이 안전한가요?**

에이전트는 애플리케이션 수준 권한 검사 뒤가 아닌 컨테이너에서 실행됩니다. 명시적으로 마운트된 디렉토리에만 접근할 수 있습니다. 여전히 실행하는 것을 검토해야 하지만, 코드베이스가 충분히 작아서 실제로 검토할 수 있습니다. 전체 보안 모델은 [docs/SECURITY.md](docs/SECURITY.md)를 참조하세요.

**왜 설정 파일이 없나요?**

설정 파일의 범람을 원하지 않습니다. 모든 사용자는 일반적인 시스템을 설정하는 대신 코드가 원하는 것과 정확히 일치하도록 커스터마이징해야 합니다. 설정 파일이 있으면 좋겠다면 Claude에게 추가해달라고 하세요.

**문제를 어떻게 디버깅하나요?**

Claude Code에게 물어보세요. "왜 스케줄러가 실행 안 돼?" "최근 로그에 뭐가 있어?" "왜 이 메시지가 응답을 받지 못했어?" 그게 AI 네이티브 접근 방식입니다.

**설정이 작동하지 않으면 어떻게 하나요?**

모르겠습니다. `claude`를 실행한 다음 `/debug`를 실행하세요. Claude가 다른 사용자에게도 영향을 미칠 가능성이 있는 문제를 발견하면 setup SKILL.md를 수정하는 PR을 열어주세요.

**어떤 변경이 코드베이스에 수락되나요?**

보안 수정, 버그 수정, 기본 구성에 대한 명확한 개선. 그것뿐입니다.

그 외 모든 것(새로운 기능, OS 호환성, 하드웨어 지원, 개선 사항)은 스킬로 기여해야 합니다.

이것은 기본 시스템을 최소화하고 모든 사용자가 원하지 않는 기능을 상속받지 않고 자신의 설치를 커스터마이징할 수 있게 합니다.

---

## 라이선스

MIT
