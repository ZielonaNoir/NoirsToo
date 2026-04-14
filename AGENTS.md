# AGENTS.md

This repository contains local Codex guidance under `.agent/`.
Use these assets by default when the user asks for planning, debugging, code review, or iterative fix workflows.

## Local Skill Source

- Skills root: `.agent/skills`
- Workflows root: `.agent/workflows`

## How Codex Should Use Local Skills

1. If a user mentions a skill name that exists under `.agent/skills/<name>/SKILL.md`, open that file and follow it.
2. If task intent clearly matches one local skill, proactively use it even if the user did not explicitly name it.
3. If multiple skills match, use the minimum set needed and apply them in this order:
   - planning/spec skills first
   - implementation/debug skills second
   - verification/review skills last
4. Treat files in `.agent/workflows/*.md` as reusable runbooks and apply them when task intent matches.

## Available Local Skills (from `.agent/skills`)

- `analyzing-deployment-logs`
- `brainstorming`
- `dispatching-parallel-agents`
- `executing-plans`
- `finishing-a-development-branch`
- `fixing-framer-motion-types`
- `implementing-crud-module`
- `no-emoji-use-iconify`
- `receiving-code-review`
- `requesting-code-review`
- `subagent-driven-development`
- `systematic-debugging`
- `test-driven-development`
- `using-custom-scrollbar`
- `using-git-worktrees`
- `using-iconify`
- `using-shadcn-date-picker`
- `using-superpowers`
- `verification-before-completion`
- `writing-plans`
- `writing-skills`

## Available Local Workflows (from `.agent/workflows`)

- `data_gap_analysis.md`
- `history.md`
- `iterative-fix-loop.md`
- `knowledge-capture.md`
- `lint.md`
- `monitor-data-gaps.md`
- `typecheck.md`

## Defaults

- Prefer existing project scripts and commands over inventing new ones.
- Run lint/typecheck/tests before finishing implementation when relevant.
- Keep changes minimal and targeted; avoid unrelated refactors.
