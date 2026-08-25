# Agent Workspace

This directory declares the project-local Agent Workspace contract for `snow-index`.

Tracked files here may contain only public workspace metadata and local tooling. Do not store credentials, raw logs, private URLs, identity profiles, machine state, or unreviewed runtime observations in tracked files.

Ignored local state:

- `.agent-workspace/local/`
- `.agent-workspace/raw/`
- `.agent-workspace/quarantine/`

Use the declared local tooling through:

```bash
pnpm agent:validate
```

Agent Workspace does not replace the adjacent planning sidecar. `../snow-index.plan` still owns planning items, decisions, executable plans, sanitized run records, validation notes, and handoffs.
