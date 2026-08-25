# Runtime Requirements

Record public execution capabilities required to maintain and validate the project.

Do not record the detected state of a particular developer, machine, or session here.

## Required execution surfaces

| Requirement | Purpose | Acceptable surfaces |
| --- | --- | --- |
| Node.js 22+ | Run project scripts | Supported local shell or CI |
| pnpm 10.22.0 | Install and run package scripts | `pnpm` only |
| Static check command | Validate current static frontend surface | `pnpm check` |
| Agent Workspace validation | Validate workspace manifest, ignored local state, and public docs contract | `pnpm agent:validate` |
| Local preview command | Run the public portal locally | `pnpm dev` |
| Sidecar status command | Inspect adjacent planning board before executing plan-bound work | `pnpm --silent plan:status --json` |
| Sidecar preview command | Open the adjacent planning board | `pnpm plan` |
| Local sound cue command | Notify owner about attention-worthy local agent events | `pnpm cue:*` scripts |

## Capability resolution

Resolve current availability at runtime. Treat current detection as more authoritative than cached observations, and never weaken public safety rules with local preferences.

## Agent Workspace

This project declares `.agent-workspace/manifest.json` and project-local tooling at `.agent-workspace/tools/agent-workspace.mjs`. Use `pnpm agent:validate` for local Agent Workspace checks. Resolve the manifest at runtime and do not substitute bundled skill validation for declared local tooling.
