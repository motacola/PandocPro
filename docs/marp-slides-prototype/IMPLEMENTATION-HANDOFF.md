# marp-slides implementation handoff

## Objective
Implement the final OpenClaw-native controller step for `marp-slides` so the workflow can:
1. generate a rough Marp deck
2. invoke a real rewrite sub-session automatically
3. apply the returned rewritten Marp deck
4. export the final deck

## Current source of truth
Skill directory:
- `skills/marp-slides/`

Key files already in place:
- `generate_marp_deck.py`
- `run_marp_workflow.py`
- `apply_rewrite_result.py`
- `rewrite_slide_prompt.md`
- `WORKFLOW.md`
- `STATUS.md`
- `auto_rewrite_via_openclaw.md`
- `themes/`

## What already works
- rough deck generation
- theme-aware deck generation
- branded themes
- presenter notes scaffolding
- export to html/pdf/pptx/txt notes
- rewrite packet generation
- rewrite result ingestion
- proof that a real OpenClaw sub-session produces materially better deck copy

## Missing implementation
A controller that actually uses OpenClaw runtime session tools to:
- spawn a bounded rewrite sub-session
- pass rough deck + rewrite brief
- receive revised Marp markdown
- validate and apply the result
- continue export automatically

## Constraints
- do not fake model invocation inside local Python scripts
- do not claim rewrite happened unless it really did
- keep rough deck path as fallback if rewrite fails
- preserve Marp markdown as source of truth

## Recommended execution surface
OpenClaw assistant/runtime orchestration layer, not the local generator.

## Verification target
A single end-to-end run should prove:
- source -> rough deck
- rough deck -> real rewrite session
- rewrite result -> applied deck
- applied deck -> html/pdf/pptx exports
