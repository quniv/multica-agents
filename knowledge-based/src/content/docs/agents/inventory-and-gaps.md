---
title: Inventory and gaps
description: Active Multica agent inventory, publication boundaries, and declarative-management gaps.
sidebar:
  order: 2
---

## Inventory scope

This inventory was captured from the live workspace for QUN-21. An agent is
considered active when its Multica record has no archive timestamp. The
inventory contains four active agents and no archived agents.

| Agent | Purpose | Invocation | Runtime | Bound workspace skills | Page |
| --- | --- | --- | --- | --- | --- |
| Ahri | Full-stack software engineering | Private | Local, runtime default model | None | [Ahri](../ahri/) |
| Jinx | DevOps and infrastructure architecture | Private | Local, runtime default model | None | [Jinx](../jinx/) |
| Darius | Technical advice and solution architecture | Private | Local, runtime default model | None | [Darius](../darius/) |
| Sylas | Task management and engineering coordination | Private | Local, runtime default model | None | [Sylas](../sylas/) |

All four records currently use an empty runtime configuration (`{}`), no custom
provider arguments (`[]`), the runtime-default model and thinking level, no
custom environment, and no MCP configuration. Ahri, Jinx, and Darius allow two
concurrent tasks; Sylas allows six. These safe, behaviorally relevant values are
recorded on the individual pages where they are managed.

## Source-of-truth decision

The reviewed repository is the **canonical desired state** for publishable
agent identity, catalog description, effective instructions, invocation mode,
concurrency, model/thinking overrides, and workspace skill names. Multica is the
**deployed state**. A merged repository change does not by itself mutate the
workspace owner applies it using the
[synchronization workflow](../synchronization/), then runs drift detection.

Markdown is the canonical authoring format. Each agent page contains:

- a machine-readable `multica-agent` comment for safe managed fields; and
- an exact instruction block between stable boundary comments.

No separate YAML/JSON manifest is required while the inventory remains small.
The checked-in drift tool parses these page contracts directly, avoiding a
second copy that could diverge.

## Coverage and gaps

| Field or concern | Policy | Rationale / owner |
| --- | --- | --- |
| Name, description, instructions, invocation mode, concurrency, model, thinking level | Managed and drift-checked | Safe, reviewable behavior owned by the agent maintainer and workspace owner. |
| Workspace skill bindings | Documented and drift-checked by name; applied manually | Multica binds workspace-specific skill IDs, and replace-all operations can remove capabilities. Workspace owner applies reviewed changes explicitly. Shared/global skills are linked from the [skills catalog](../../skills/) rather than copied into prompts. |
| Runtime ID | Deployment-time reference, not versioned | Runtime UUIDs are environment-specific. The workspace owner selects a compatible runtime during deployment. |
| Runtime mode/configuration and provider arguments | Safe current shape documented; runtime selection applied manually | Runtime mode is derived from the selected runtime. Provider-specific settings need environment validation before application. |
| Owner ID and allow-listed member IDs | Not published | These are personal/workspace identifiers and access-control data. Workspace owner manages them in Multica. |
| Custom environment and MCP configuration | Never exported | They may contain credentials or tokens. Only configured/not-configured state may be documented. Security owner manages values through approved secret channels. |
| Avatar URL | Not managed | Presentation asset tied to the live upload service; agent owner manages it. |
| Status, timestamps, task counts | Not managed | Operational/transient state is not declarative configuration. |
| Runtime/platform built-in skills and tools | Referenced, not duplicated | Multica supplies these globally; copying them into each prompt would create inconsistent forks. Platform owner maintains them. |
| Archived agents | No current records | Future archived agents move to an `agents/archived/` section with an archive notice; they are excluded from apply operations. |
| Experimental/private agents | Document only after publication review | Private visibility alone does not make instructions safe to publish. The workspace owner and security reviewer decide whether to include, redact, or omit a page. |

## Publication review checklist

Before adding or changing an agent page:

1. Remove secrets, tokens, credential material, private personal data, and
   environment-specific sensitive identifiers.
2. Replace required secret/configuration values with named references, never
   realistic placeholders.
3. Link shared skills and platform policies instead of copying their contents.
4. Confirm that responsibilities, non-goals, inputs, outputs, and handoffs match
   the exact instruction block.
5. Run `pnpm agents:check` against the intended workspace and `pnpm build`.
6. Obtain pull-request approval from the workspace owner before applying live.
