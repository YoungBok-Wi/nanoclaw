# NanoClaw 명세서

대화별 영구 메모리, 예약 작업, 이메일 통합을 갖춘 WhatsApp을 통해 접근 가능한 개인용 Claude 비서.

---

## 목차

1. [아키텍처](#아키텍처)
2. [폴더 구조](#폴더-구조)
3. [설정](#설정)
4. [메모리 시스템](#메모리-시스템)
5. [세션 관리](#세션-관리)
6. [메시지 흐름](#메시지-흐름)
7. [명령어](#명령어)
8. [예약 작업](#예약-작업)
9. [MCP 서버](#mcp-서버)
10. [배포](#배포)
11. [보안 고려 사항](#보안-고려-사항)

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        호스트 (macOS)                                │
│                   (메인 Node.js 프로세스)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                     ┌────────────────────┐        │
│  │  WhatsApp    │────────────────────▶│   SQLite 데이터베이스 │        │
│  │  (baileys)   │◀────────────────────│   (messages.db)    │        │
│  └──────────────┘   저장/전송          └─────────┬──────────┘        │
│                                                  │                   │
│         ┌────────────────────────────────────────┘                   │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  메시지 루프      │    │  스케줄러 루프    │    │  IPC 감시자    │  │
│  │  (SQLite 폴링)   │    │  (작업 확인)      │    │  (파일 기반)   │  │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────────┘  │
│           │                       │                                  │
│           └───────────┬───────────┘                                  │
│                       │ 컨테이너 생성                                  │
│                       ▼                                              │
├─────────────────────────────────────────────────────────────────────┤
│                  APPLE CONTAINER (Linux VM)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    에이전트 러너                               │   │
│  │                                                                │   │
│  │  작업 디렉토리: /workspace/group (호스트에서 마운트)             │   │
│  │  볼륨 마운트:                                                   │   │
│  │    • groups/{name}/ → /workspace/group                         │   │
│  │    • groups/global/ → /workspace/global/ (비메인만)              │   │
│  │    • data/sessions/{group}/.claude/ → /home/node/.claude/      │   │
│  │    • 추가 디렉토리 → /workspace/extra/*                         │   │
│  │                                                                │   │
│  │  도구 (모든 그룹):                                               │   │
│  │    • Bash (안전 - 컨테이너에서 샌드박스됨!)                        │   │
│  │    • Read, Write, Edit, Glob, Grep (파일 작업)                  │   │
│  │    • WebSearch, WebFetch (인터넷 접근)                           │   │
│  │    • agent-browser (브라우저 자동화)                             │   │
│  │    • mcp__nanoclaw__* (IPC를 통한 스케줄러 도구)                  │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 기술 스택

| 구성 요소 | 기술 | 목적 |
|----------|------|------|
| WhatsApp 연결 | Node.js (@whiskeysockets/baileys) | WhatsApp 연결, 메시지 송수신 |
| 메시지 저장 | SQLite (better-sqlite3) | 폴링을 위한 메시지 저장 |
| 컨테이너 런타임 | Apple Container | 에이전트 실행을 위한 격리된 Linux VM |
| 에이전트 | @anthropic-ai/claude-agent-sdk (0.2.29) | 도구와 MCP 서버로 Claude 실행 |
| 브라우저 자동화 | agent-browser + Chromium | 웹 상호작용 및 스크린샷 |
| 런타임 | Node.js 20+ | 라우팅 및 스케줄링을 위한 호스트 프로세스 |

---

## 폴더 구조

```
nanoclaw/
├── CLAUDE.md                      # Claude Code를 위한 프로젝트 컨텍스트
├── docs/
│   ├── SPEC.md                    # 이 명세서 문서
│   ├── REQUIREMENTS.md            # 아키텍처 결정 사항
│   └── SECURITY.md                # 보안 모델
├── README.md                      # 사용자 문서
├── package.json                   # Node.js 의존성
├── tsconfig.json                  # TypeScript 설정
├── .mcp.json                      # MCP 서버 설정 (참조)
├── .gitignore
│
├── src/
│   ├── index.ts                   # 메인 애플리케이션 (WhatsApp + 라우팅)
│   ├── config.ts                  # 설정 상수
│   ├── types.ts                   # TypeScript 인터페이스
│   ├── utils.ts                   # 일반 유틸리티 함수
│   ├── db.ts                      # 데이터베이스 초기화 및 쿼리
│   ├── whatsapp-auth.ts           # 독립 WhatsApp 인증
│   ├── task-scheduler.ts          # 예정된 작업 실행
│   └── container-runner.ts        # Apple Container에서 에이전트 생성
│
├── container/
│   ├── Dockerfile                 # 컨테이너 이미지 ('node' 사용자로 실행, Claude Code CLI 포함)
│   ├── build.sh                   # 컨테이너 이미지 빌드 스크립트
│   ├── agent-runner/              # 컨테이너 내부에서 실행되는 코드
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts           # 진입점 (JSON 읽기, 에이전트 실행)
│   │       └── ipc-mcp.ts         # 호스트 통신을 위한 MCP 서버
│   └── skills/
│       └── agent-browser.md       # 브라우저 자동화 스킬
│
├── dist/                          # 컴파일된 JavaScript (gitignored)
│
├── .claude/
│   └── skills/
│       ├── setup/
│       │   └── SKILL.md           # /setup 스킬
│       ├── customize/
│       │   └── SKILL.md           # /customize 스킬
│       └── debug/
│           └── SKILL.md           # /debug 스킬 (컨테이너 디버깅)
│
├── groups/
│   ├── CLAUDE.md                  # 전역 메모리 (모든 그룹이 읽음)
│   ├── main/                      # 자기 채팅 (메인 제어 채널)
│   │   ├── CLAUDE.md              # 메인 채널 메모리
│   │   └── logs/                  # 작업 실행 로그
│   └── {Group Name}/              # 그룹별 폴더 (등록 시 생성)
│       ├── CLAUDE.md              # 그룹별 메모리
│       ├── logs/                  # 이 그룹의 작업 로그
│       └── *.md                   # 에이전트가 생성한 파일
│
├── store/                         # 로컬 데이터 (gitignored)
│   ├── auth/                      # WhatsApp 인증 상태
│   └── messages.db                # SQLite 데이터베이스 (messages, scheduled_tasks, task_run_logs)
│
├── data/                          # 애플리케이션 상태 (gitignored)
│   ├── sessions.json              # 그룹별 활성 세션 ID
│   ├── registered_groups.json     # 그룹 JID → 폴더 매핑
│   ├── router_state.json          # 마지막 처리 타임스탬프 + 마지막 에이전트 타임스탬프
│   ├── env/env                    # 컨테이너 마운트용 .env 복사본
│   └── ipc/                       # 컨테이너 IPC (messages/, tasks/)
│
├── logs/                          # 런타임 로그 (gitignored)
│   ├── nanoclaw.log               # 호스트 stdout
│   └── nanoclaw.error.log         # 호스트 stderr
│   # 참고: 컨테이너별 로그는 groups/{folder}/logs/container-*.log에 있음
│
└── launchd/
    └── com.nanoclaw.plist         # macOS 서비스 설정
```

---

## 설정

설정 상수는 `src/config.ts`에 있습니다:

```typescript
import path from 'path';

export const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Andy';
export const POLL_INTERVAL = 2000;
export const SCHEDULER_POLL_INTERVAL = 60000;

// 경로는 절대 경로 (컨테이너 마운트에 필요)
const PROJECT_ROOT = process.cwd();
export const STORE_DIR = path.resolve(PROJECT_ROOT, 'store');
export const GROUPS_DIR = path.resolve(PROJECT_ROOT, 'groups');
export const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');

// 컨테이너 설정
export const CONTAINER_IMAGE = process.env.CONTAINER_IMAGE || 'nanoclaw-agent:latest';
export const CONTAINER_TIMEOUT = parseInt(process.env.CONTAINER_TIMEOUT || '300000', 10);
export const IPC_POLL_INTERVAL = 1000;

export const TRIGGER_PATTERN = new RegExp(`^@${ASSISTANT_NAME}\\b`, 'i');
```

**참고:** Apple Container 볼륨 마운트가 올바르게 작동하려면 경로가 절대 경로여야 합니다.

### 컨테이너 설정

그룹은 `data/registered_groups.json`의 `containerConfig`를 통해 추가 디렉토리를 마운트할 수 있습니다:

```json
{
  "1234567890@g.us": {
    "name": "Dev Team",
    "folder": "dev-team",
    "trigger": "@Andy",
    "added_at": "2026-01-31T12:00:00Z",
    "containerConfig": {
      "additionalMounts": [
        {
          "hostPath": "~/projects/webapp",
          "containerPath": "webapp",
          "readonly": false
        }
      ],
      "timeout": 600000
    }
  }
}
```

추가 마운트는 컨테이너 내부에서 `/workspace/extra/{containerPath}`에 나타납니다.

**Apple Container 마운트 구문 참고:** 읽기-쓰기 마운트는 `-v host:container`를 사용하지만, 읽기 전용 마운트는 `--mount "type=bind,source=...,target=...,readonly"`가 필요합니다 (`:ro` 접미사는 작동하지 않음).

### Claude 인증

프로젝트 루트의 `.env` 파일에서 인증을 구성합니다. 두 가지 옵션:

**옵션 1: Claude 구독 (OAuth 토큰)**
```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```
Claude Code에 로그인한 경우 `~/.claude/.credentials.json`에서 토큰을 추출할 수 있습니다.

**옵션 2: 사용량 기반 API 키**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

인증 변수(`CLAUDE_CODE_OAUTH_TOKEN` 및 `ANTHROPIC_API_KEY`)만 `.env`에서 추출되어 컨테이너의 `/workspace/env-dir/env`에 마운트된 다음 진입점 스크립트에서 소스됩니다. 이렇게 하면 `.env`의 다른 환경 변수가 에이전트에 노출되지 않습니다. 이 해결책은 Apple Container가 `-i`(파이프된 stdin이 있는 대화형 모드)를 사용할 때 `-e` 환경 변수를 잃어버리기 때문에 필요합니다.

### 비서 이름 변경

`ASSISTANT_NAME` 환경 변수를 설정하세요:

```bash
ASSISTANT_NAME=Bot npm start
```

또는 `src/config.ts`에서 기본값을 편집하세요. 이것은 다음을 변경합니다:
- 트리거 패턴 (메시지는 `@YourName`으로 시작해야 함)
- 응답 접두사 (`YourName:`이 자동으로 추가됨)

### launchd의 플레이스홀더 값

`{{PLACEHOLDER}}` 값이 있는 파일은 구성이 필요합니다:
- `{{PROJECT_ROOT}}` - nanoclaw 설치의 절대 경로
- `{{NODE_PATH}}` - node 바이너리 경로 (`which node`로 감지)
- `{{HOME}}` - 사용자의 홈 디렉토리

---

## 메모리 시스템

NanoClaw는 CLAUDE.md 파일 기반의 계층적 메모리 시스템을 사용합니다.

### 메모리 계층

| 수준 | 위치 | 읽는 주체 | 쓰는 주체 | 목적 |
|------|------|----------|----------|------|
| **전역** | `groups/CLAUDE.md` | 모든 그룹 | 메인만 | 모든 대화에 공유되는 선호 설정, 사실, 컨텍스트 |
| **그룹** | `groups/{name}/CLAUDE.md` | 해당 그룹 | 해당 그룹 | 그룹별 컨텍스트, 대화 메모리 |
| **파일** | `groups/{name}/*.md` | 해당 그룹 | 해당 그룹 | 대화 중 생성된 노트, 연구, 문서 |

### 메모리 작동 방식

1. **에이전트 컨텍스트 로딩**
   - 에이전트는 `cwd`가 `groups/{group-name}/`로 설정되어 실행
   - `settingSources: ['project']`가 있는 Claude Agent SDK가 자동으로 로드:
     - `../CLAUDE.md` (상위 디렉토리 = 전역 메모리)
     - `./CLAUDE.md` (현재 디렉토리 = 그룹 메모리)

2. **메모리 쓰기**
   - 사용자가 "이것을 기억해"라고 하면 에이전트가 `./CLAUDE.md`에 씀
   - 사용자가 "이것을 전역으로 기억해"라고 하면 (메인 채널만) 에이전트가 `../CLAUDE.md`에 씀
   - 에이전트는 그룹 폴더에 `notes.md`, `research.md` 같은 파일을 생성할 수 있음

3. **메인 채널 권한**
   - "main" 그룹(자기 채팅)만 전역 메모리에 쓸 수 있음
   - main은 등록된 그룹을 관리하고 모든 그룹의 작업을 예약할 수 있음
   - main은 모든 그룹의 추가 디렉토리 마운트를 구성할 수 있음
   - 모든 그룹은 Bash 접근이 가능 (컨테이너 안에서 실행되므로 안전)

---

## 세션 관리

세션은 대화 연속성을 가능하게 합니다 - Claude는 대화한 내용을 기억합니다.

### 세션 작동 방식

1. 각 그룹은 `data/sessions.json`에 세션 ID를 가짐
2. 세션 ID는 Claude Agent SDK의 `resume` 옵션에 전달됨
3. Claude는 전체 컨텍스트로 대화를 계속함

**data/sessions.json:**
```json
{
  "main": "session-abc123",
  "Family Chat": "session-def456"
}
```

---

## 메시지 흐름

### 수신 메시지 흐름

```
1. 사용자가 WhatsApp 메시지 전송
   │
   ▼
2. Baileys가 WhatsApp Web 프로토콜을 통해 메시지 수신
   │
   ▼
3. 메시지가 SQLite에 저장 (store/messages.db)
   │
   ▼
4. 메시지 루프가 SQLite 폴링 (2초마다)
   │
   ▼
5. 라우터 확인:
   ├── chat_jid가 registered_groups.json에 있나? → 아니오: 무시
   └── 메시지가 @Assistant로 시작하나? → 아니오: 무시
   │
   ▼
6. 라우터가 대화 따라잡기:
   ├── 마지막 에이전트 상호작용 이후 모든 메시지 가져오기
   ├── 타임스탬프와 보낸 사람 이름으로 형식 지정
   └── 전체 대화 컨텍스트로 프롬프트 작성
   │
   ▼
7. 라우터가 Claude Agent SDK 호출:
   ├── cwd: groups/{group-name}/
   ├── prompt: 대화 기록 + 현재 메시지
   ├── resume: session_id (연속성을 위해)
   └── mcpServers: nanoclaw (스케줄러)
   │
   ▼
8. Claude가 메시지 처리:
   ├── 컨텍스트를 위해 CLAUDE.md 파일 읽기
   └── 필요에 따라 도구 사용 (검색, 이메일 등)
   │
   ▼
9. 라우터가 응답에 비서 이름 접두사를 붙이고 WhatsApp으로 전송
   │
   ▼
10. 라우터가 마지막 에이전트 타임스탬프 업데이트 및 세션 ID 저장
```

### 트리거 단어 매칭

메시지는 트리거 패턴(기본값: `@Andy`)으로 시작해야 합니다:
- `@Andy 날씨 어때?` → ✅ Claude 트리거됨
- `@andy 도와줘` → ✅ 트리거됨 (대소문자 구분 없음)
- `안녕 @Andy` → ❌ 무시됨 (트리거가 시작에 없음)
- `뭐해?` → ❌ 무시됨 (트리거 없음)

### 대화 따라잡기

트리거된 메시지가 도착하면 에이전트는 해당 채팅에서 마지막 상호작용 이후의 모든 메시지를 받습니다. 각 메시지는 타임스탬프와 보낸 사람 이름으로 형식이 지정됩니다:

```
[1월 31일 오후 2:32] 철수: 오늘 저녁 피자 먹을까?
[1월 31일 오후 2:33] 영희: 좋아
[1월 31일 오후 2:35] 철수: @Andy 토핑 뭐가 좋아?
```

이렇게 하면 에이전트가 모든 메시지에서 언급되지 않아도 대화 컨텍스트를 이해할 수 있습니다.

---

## 명령어

### 모든 그룹에서 사용 가능한 명령어

| 명령어 | 예시 | 효과 |
|--------|-----|------|
| `@Assistant [메시지]` | `@Andy 날씨 어때?` | Claude와 대화 |

### 메인 채널에서만 사용 가능한 명령어

| 명령어 | 예시 | 효과 |
|--------|-----|------|
| `@Assistant add group "이름"` | `@Andy add group "가족 채팅"` | 새 그룹 등록 |
| `@Assistant remove group "이름"` | `@Andy remove group "회사 팀"` | 그룹 등록 해제 |
| `@Assistant list groups` | `@Andy list groups` | 등록된 그룹 표시 |
| `@Assistant remember [사실]` | `@Andy remember 나는 다크 모드를 선호해` | 전역 메모리에 추가 |

---

## 예약 작업

NanoClaw는 그룹 컨텍스트에서 전체 에이전트로 작업을 실행하는 내장 스케줄러를 가지고 있습니다.

### 스케줄링 작동 방식

1. **그룹 컨텍스트**: 그룹에서 생성된 작업은 해당 그룹의 작업 디렉토리와 메모리로 실행됨
2. **전체 에이전트 기능**: 예약된 작업은 모든 도구(WebSearch, 파일 작업 등)에 접근 가능
3. **선택적 메시징**: 작업은 `send_message` 도구를 사용하여 그룹에 메시지를 보내거나 조용히 완료 가능
4. **메인 채널 권한**: 메인 채널은 모든 그룹의 작업을 예약하고 모든 작업을 볼 수 있음

### 스케줄 유형

| 유형 | 값 형식 | 예시 |
|------|--------|------|
| `cron` | Cron 표현식 | `0 9 * * 1` (월요일 오전 9시) |
| `interval` | 밀리초 | `3600000` (매시간) |
| `once` | ISO 타임스탬프 | `2024-12-25T09:00:00Z` |

### 작업 생성

```
사용자: @Andy 매주 월요일 오전 9시에 주간 지표를 검토하라고 알려줘

Claude: [mcp__nanoclaw__schedule_task 호출]
        {
          "prompt": "주간 지표를 검토하라는 알림을 보내세요. 격려해주세요!",
          "schedule_type": "cron",
          "schedule_value": "0 9 * * 1"
        }

Claude: 완료! 매주 월요일 오전 9시에 알려드리겠습니다.
```

### 일회성 작업

```
사용자: @Andy 오늘 오후 5시에 오늘 이메일 요약을 보내줘

Claude: [mcp__nanoclaw__schedule_task 호출]
        {
          "prompt": "오늘의 이메일을 검색하고, 중요한 것을 요약하고, 그룹에 요약을 보내세요.",
          "schedule_type": "once",
          "schedule_value": "2024-01-31T17:00:00Z"
        }
```

### 작업 관리

모든 그룹에서:
- `@Andy 내 예약 작업 목록` - 이 그룹의 작업 보기
- `@Andy pause task [id]` - 작업 일시 중지
- `@Andy resume task [id]` - 일시 중지된 작업 재개
- `@Andy cancel task [id]` - 작업 삭제

메인 채널에서:
- `@Andy list all tasks` - 모든 그룹의 작업 보기
- `@Andy schedule task for "가족 채팅": [프롬프트]` - 다른 그룹의 작업 예약

---

## MCP 서버

### NanoClaw MCP (내장)

`nanoclaw` MCP 서버는 현재 그룹의 컨텍스트로 에이전트 호출당 동적으로 생성됩니다.

**사용 가능한 도구:**
| 도구 | 목적 |
|------|------|
| `schedule_task` | 반복 또는 일회성 작업 예약 |
| `list_tasks` | 작업 표시 (그룹의 작업, 또는 main이면 모두) |
| `get_task` | 작업 세부 정보 및 실행 기록 가져오기 |
| `update_task` | 작업 프롬프트 또는 스케줄 수정 |
| `pause_task` | 작업 일시 중지 |
| `resume_task` | 일시 중지된 작업 재개 |
| `cancel_task` | 작업 삭제 |
| `send_message` | 그룹에 WhatsApp 메시지 보내기 |

---

## 배포

NanoClaw는 단일 macOS launchd 서비스로 실행됩니다.

### 시작 순서

NanoClaw가 시작되면:
1. **Apple Container 시스템 실행 확인** - 필요한 경우 자동으로 시작 (재부팅 후에도 유지)
2. SQLite 데이터베이스 초기화
3. 상태 로드 (등록된 그룹, 세션, 라우터 상태)
4. WhatsApp에 연결
5. 메시지 폴링 루프 시작
6. 스케줄러 루프 시작
7. 컨테이너 메시지를 위한 IPC 감시자 시작

### 서비스: com.nanoclaw

**launchd/com.nanoclaw.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>{{NODE_PATH}}</string>
        <string>{{PROJECT_ROOT}}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{{PROJECT_ROOT}}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>{{HOME}}/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>{{HOME}}</string>
        <key>ASSISTANT_NAME</key>
        <string>Andy</string>
    </dict>
    <key>StandardOutPath</key>
    <string>{{PROJECT_ROOT}}/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>{{PROJECT_ROOT}}/logs/nanoclaw.error.log</string>
</dict>
</plist>
```

### 서비스 관리

```bash
# 서비스 설치
cp launchd/com.nanoclaw.plist ~/Library/LaunchAgents/

# 서비스 시작
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

# 서비스 중지
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist

# 상태 확인
launchctl list | grep nanoclaw

# 로그 보기
tail -f logs/nanoclaw.log
```

---

## 보안 고려 사항

### 컨테이너 격리

모든 에이전트는 Apple Container(경량 Linux VM) 내부에서 실행되어 다음을 제공합니다:
- **파일 시스템 격리**: 에이전트는 마운트된 디렉토리에만 접근 가능
- **안전한 Bash 접근**: 명령은 Mac이 아닌 컨테이너 안에서 실행
- **네트워크 격리**: 필요시 컨테이너별로 구성 가능
- **프로세스 격리**: 컨테이너 프로세스는 호스트에 영향을 줄 수 없음
- **비루트 사용자**: 컨테이너는 권한 없는 `node` 사용자(uid 1000)로 실행

### 프롬프트 인젝션 위험

WhatsApp 메시지에는 Claude의 동작을 조작하려는 악의적인 지시가 포함될 수 있습니다.

**완화책:**
- 컨테이너 격리가 피해 범위 제한
- 등록된 그룹만 처리됨
- 트리거 단어 필요 (우발적 처리 감소)
- 에이전트는 그룹의 마운트된 디렉토리에만 접근 가능
- main은 그룹별로 추가 디렉토리를 구성 가능
- Claude의 내장 안전 훈련

**권장 사항:**
- 신뢰할 수 있는 그룹만 등록
- 추가 디렉토리 마운트를 신중하게 검토
- 예약된 작업을 주기적으로 검토
- 비정상적인 활동에 대해 로그 모니터링

### 자격 증명 저장

| 자격 증명 | 저장 위치 | 참고 |
|----------|----------|------|
| Claude CLI 인증 | data/sessions/{group}/.claude/ | 그룹별 격리, /home/node/.claude/로 마운트 |
| WhatsApp 세션 | store/auth/ | 자동 생성, ~20일 지속 |

### 파일 권한

groups/ 폴더는 개인 메모리를 포함하므로 보호되어야 합니다:
```bash
chmod 700 groups/
```

---

## 문제 해결

### 일반적인 문제

| 문제 | 원인 | 해결책 |
|------|------|--------|
| 메시지에 응답 없음 | 서비스가 실행되지 않음 | `launchctl list | grep nanoclaw` 확인 |
| "Claude Code process exited with code 1" | Apple Container 시작 실패 | 로그 확인; NanoClaw가 컨테이너 시스템을 자동 시작하지만 실패할 수 있음 |
| "Claude Code process exited with code 1" | 세션 마운트 경로 오류 | 마운트가 `/root/.claude/`가 아닌 `/home/node/.claude/`로 되어 있는지 확인 |
| 세션이 계속되지 않음 | 세션 ID가 저장되지 않음 | `data/sessions.json` 확인 |
| 세션이 계속되지 않음 | 마운트 경로 불일치 | 컨테이너 사용자는 HOME=/home/node인 `node`; 세션은 `/home/node/.claude/`에 있어야 함 |
| "QR code expired" | WhatsApp 세션 만료 | store/auth/ 삭제 후 재시작 |
| "No groups registered" | 그룹을 추가하지 않음 | main에서 `@Andy add group "이름"` 사용 |

### 로그 위치

- `logs/nanoclaw.log` - stdout
- `logs/nanoclaw.error.log` - stderr

### 디버그 모드

자세한 출력을 위해 수동으로 실행:
```bash
npm run dev
# 또는
node dist/index.js
```
