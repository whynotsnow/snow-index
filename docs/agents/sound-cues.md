# Sound Cues

This project uses local Codex sound cues for attention-worthy events only. Cues are for owner attention shifts: required input, production deployment approval, meaningful validation results, deployment results, and task completion.

The global Codex `Stop` hook triggers the `done` event when an agent turn ends. Project-level `.codex/codex-cues.json` overrides global defaults when Codex is working inside this repository.

## Commands

Agents may use these commands in this project:

```bash
pnpm cue:attention
pnpm cue:validation-start
pnpm cue:deploy-start
pnpm cue:deploy-approval
pnpm cue:deploy-pass
pnpm cue:deploy-fail
pnpm cue:tests-pass
pnpm cue:tests-fail
```

Do not manually play `done` for routine responses. The global Codex `Stop` hook already handles completion.

## Event Rules

| Event | Class | Default text | Use rule |
| --- | --- | --- | --- |
| `attention` | Blocking | `需要你处理` | Before stopping for required owner input, confirmation, approval, or external action. |
| `validation-start` | Process | `开始验证` | Before starting a full or long-running validation flow such as release validation, a broad browser smoke, or production deploy verification. |
| `tests-pass` | Result | `验证通过` | Only after a full or otherwise meaningful validation pass. |
| `tests-fail` | Failure | `验证失败` | After validation fails and needs owner attention. |
| `deploy-start` | Process | `开始部署` | Before triggering a production deployment workflow. |
| `deploy-approval` | Approval | `生产部署等待审批` | While a local agent session monitors a remote production deployment waiting for approval. Play about every 15 seconds until the wait exits. |
| `deploy-pass` | Result | `部署完成` | After production deployment completes successfully. |
| `deploy-fail` | Failure | `部署失败` | After production deployment fails and needs owner attention. |
| `done` | Completion | `任务完成` | Triggered by the global Codex `Stop` hook; agents should not trigger it manually for ordinary completion. |

Prefer concise Chinese TTS text for events that require action or report validation results.

## Forbidden Cases

- Do not play cues for ordinary reading, searching, editing, formatting, or intermediate progress.
- Do not play `validation-start` before small or short-running checks.
- Do not play `tests-pass` for small intermediate validation.
- Do not play local cues from CI, GitHub Actions, or any remote runner.
- Do not continue deployment approval cues after approval passes, the request is rejected, the run fails, the run is cancelled, the run times out, or a later build/deploy step starts.
- Do not replay or restart a rejected deployment unless the owner explicitly asks.

## Deployment Approval Monitoring

Deployment approval cues are local agent behavior. GitHub Actions and CI workflows must only create, poll, and consume approval state; they must not play local audio and must not decide whether the local machine rings.

When an agent triggers the GitHub Actions `Production Deploy` workflow from a local Codex session, it must monitor the run locally. If the remote job is waiting in the `Verify deployment approval` step, run:

```bash
pnpm cue:deploy-approval
```

Repeat approximately every 15 seconds while the step remains waiting.

Stop the approval cue loop immediately when any of these happens:

- `Verify deployment approval` exits and the run enters a later build or deploy step;
- the approval request is rejected;
- the run fails, is cancelled, or times out;
- the deployment approval wait expires.

A rejected approval is an explicit owner denial. Stop, report the rejection, and do not trigger another deployment unless the owner explicitly asks.
