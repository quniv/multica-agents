---
title: Agent synchronization workflow
description: Propose, review, apply, and reconcile Multica agent configuration safely.
sidebar:
  order: 3
---

## Contract

The repository is the canonical **desired state** for publishable agent fields;
the live Multica workspace is the **deployed state**. Changes flow through a
reviewed pull request and are applied only by an authorized workspace owner.
Never copy live secrets into the repository to make a drift check pass.

The checked-in `scripts/sync-agents.mjs` tool manages only fields encoded in the
`multica-agent` comment and instruction boundaries on each page. It deliberately
does not mutate runtime selection, skill bindings, owners/member allow lists,
status, custom environment, or MCP configuration.

## Prerequisites

- Authenticate `multica` to the intended workspace and verify the active
  workspace before checking or applying.
- Use Node.js 22 or later and install the documentation dependencies with
  `pnpm install --frozen-lockfile`.
- Applying changes requires workspace-owner authorization. Drift checking is
  read-only.

## Propose and review a change

1. Edit the agent's summary and the exact canonical instruction block between
   `BEGIN MULTICA INSTRUCTIONS` and `END MULTICA INSTRUCTIONS`.
2. Update the machine-readable `multica-agent` comment only for intentionally
   managed fields. Keep it valid one-line JSON.
3. If a shared capability changes, update or link the shared page under
   [Skills](../../skills/) instead of duplicating the skill in multiple prompts.
4. Run validation:

   ```sh
   pnpm agents:check
   pnpm build
   ```

   Before the first deployment of a repository change, `agents:check` is
   expected to report the reviewed difference from live state. The build must
   still pass.
5. Open a pull request describing the behavior change, security impact,
   deployment owner, and rollback plan. Do not apply an unmerged change.

## Apply an approved change

After merge, an authorized owner checks out the merged revision and applies one
agent explicitly:

```sh
node scripts/sync-agents.mjs apply ahri
```

Use the page slug (`ahri`, `jinx`, `darius`, or `sylas`). The tool invokes the
Multica CLI without a shell and updates the managed scalar fields and effective
instructions. It does not expose values through generated temporary files.
Apply all documented agents only when the pull request intentionally covers the
full inventory:

```sh
node scripts/sync-agents.mjs apply --all
```

Skill bindings require a separate reviewed operation because Multica uses
workspace-specific skill IDs and `skills set` is destructive. Resolve the
reviewed skill names to IDs, inspect the current bindings, and have the owner
apply the smallest explicit `skills add` or `skills set` command. Runtime and
access-control changes follow the same explicit owner-managed rule.

## Verify and reconcile drift

Run the read-only comparison after every apply and periodically:

```sh
pnpm agents:check
```

A zero exit status means all documented active agents and managed fields match.
A non-zero status lists differences, undocumented active agents, missing live
agents, or archived records that still have active pages.

When drift is detected:

1. Stop and determine whether the repository or live change was approved.
2. If the repository is correct, re-apply the merged desired state.
3. If the live change is intentional, export only safe fields into a branch,
   review/redact them, and merge a pull request before treating the new state as
   canonical.
4. If the live change is unauthorized or includes sensitive material, do not
   copy it into Git. Escalate to the workspace/security owner and rotate exposed
   credentials through Multica's secret-specific interfaces.
5. Re-run both `pnpm agents:check` and `pnpm build`.

## Rollback

Revert the repository commit through a reviewed pull request, then apply the
reverted agent page and verify drift. Secret or access-control rollback remains
an owner-managed Multica operation; do not place prior secret values in Git.
