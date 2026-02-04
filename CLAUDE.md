# NanoClaw

개인용 Claude AI 비서입니다. 철학과 설정은 [README.md](README.md)를 참조하세요. 아키텍처 결정 사항은 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)를 참조하세요.

## 빠른 컨텍스트

Discord에 연결하고 메시지를 Apple Container(Linux VM)에서 실행되는 Claude Agent SDK로 라우팅하는 단일 Node.js 프로세스입니다. 각 채널은 격리된 파일 시스템과 메모리를 가집니다.

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/index.ts` | 메인 앱: Discord 연결, 메시지 라우팅, IPC |
| `src/config.ts` | 트리거 패턴, 경로, 인터벌 설정 |
| `src/container-runner.ts` | 마운트와 함께 에이전트 컨테이너 생성 |
| `src/task-scheduler.ts` | 예약 작업 실행 |
| `src/db.ts` | SQLite 데이터베이스 작업 |
| `groups/{name}/CLAUDE.md` | 채널별 메모리 (격리됨) |

## 스킬

| 스킬 | 사용 시점 |
|------|----------|
| `/setup` | 최초 설치, 인증, 서비스 구성 |
| `/customize` | 채널, 통합, 동작 변경 추가 |
| `/debug` | 컨테이너 문제, 로그, 트러블슈팅 |

## 개발

명령어를 직접 실행하세요—사용자에게 실행하라고 말하지 마세요.

```bash
npm run dev          # 핫 리로드로 실행
npm run build        # TypeScript 컴파일
./container/build.sh # 에이전트 컨테이너 재빌드
```

서비스 관리 (macOS):
```bash
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
```
