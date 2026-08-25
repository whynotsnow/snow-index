# Codex 提示音

本项目使用本机 Codex 提示音工具在关键节点播放 macOS 系统音或 TTS。提示音只服务于注意力切换：需要维护者处理、生产部署审批、关键验证结果或部署结果。全局 Codex `Stop` hook 会在回合结束时调用 `done` 事件；项目内的 `.codex/codex-cues.json` 会覆盖全局默认设置。

Agent 执行规范由 [`docs/agents/sound-cues.md`](../agents/sound-cues.md) 维护。本文件只说明开发者如何预览、配置和调整提示音。

## 快速体验

```bash
pnpm cue:preview
pnpm cue:show
pnpm cue:done
pnpm cue:attention
pnpm cue:validation-start
pnpm cue:deploy-start
pnpm cue:deploy-approval
pnpm cue:deploy-pass
pnpm cue:deploy-fail
pnpm cue:tests-pass
pnpm cue:tests-fail
```

预览时临时调高音量：

```bash
pnpm cue:preview -- --volume 3
```

临时播放某个事件，不修改配置：

```bash
pnpm cue play done --mode both --preset ping --volume 3 --text "任务完成"
pnpm cue play attention --mode both --preset tink --volume 4 --text "需要你处理"
pnpm cue play validation-start --mode both --preset pop --volume 3 --text "开始验证"
pnpm cue play deploy-start --mode both --preset ping --volume 4 --text "开始部署"
pnpm cue play deploy-approval --mode both --preset tink --volume 5 --text "生产部署等待审批"
pnpm cue play deploy-pass --mode both --preset hero --volume 4 --text "部署完成"
pnpm cue play deploy-fail --mode both --preset submarine --volume 5 --text "部署失败"
```

## 保存项目配置

保存后会修改 `.codex/codex-cues.json`，之后 Codex 在本项目目录中运行时会自动使用这些项目级设置。

```bash
pnpm cue set done --mode both --preset ping --volume 3 --text "任务完成"
pnpm cue set attention --mode both --preset tink --volume 4 --text "需要你处理"
pnpm cue set validation-start --mode both --preset pop --volume 3 --text "开始验证"
pnpm cue set deploy-start --mode both --preset ping --volume 4 --text "开始部署"
pnpm cue set deploy-approval --mode both --preset tink --volume 5 --text "生产部署等待审批"
pnpm cue set deploy-pass --mode both --preset hero --volume 4 --text "部署完成"
pnpm cue set deploy-fail --mode both --preset submarine --volume 5 --text "部署失败"
pnpm cue set tests-pass --mode both --preset hero --volume 3 --text "验证通过"
pnpm cue set tests-fail --mode both --preset submarine --volume 5 --text "验证失败"
```

查看某个事件的最终解析结果：

```bash
pnpm cue:show -- done
pnpm cue:show -- attention
pnpm cue:show -- validation-start
pnpm cue:show -- deploy-start
pnpm cue:show -- deploy-approval
pnpm cue:show -- deploy-pass
pnpm cue:show -- deploy-fail
pnpm cue:show -- tests-pass
pnpm cue:show -- tests-fail
```

## 可选事件

- `done`: Codex 回合完成。全局 `Stop` hook 默认会触发它。
- `attention`: agent 需要用户确认、批准或补充信息。
- `validation-start`: 开始完整或长耗时验证流程。
- `deploy-start`: 开始生产部署流程。
- `deploy-approval`: agent 本机会话监控远端生产部署审批等待时触发。
- `deploy-pass`: 生产部署成功完成。
- `deploy-fail`: 生产部署失败且需要关注。
- `tests-pass`: 完整或关键验证通过。
- `tests-fail`: 验证失败并需要用户注意。

## 可选提示音

内置 preset:

```text
ping, pop, glass, hero, tink, submarine, voice, both, silent
```

查看全部 preset 和 macOS 系统音文件：

```bash
pnpm cue:list
```

使用自定义音频文件时，只在本地运行命令，不要把私人音频文件路径写入 tracked 文档：

```bash
pnpm cue play done --sound <absolute-sound-path> --volume 2
```
