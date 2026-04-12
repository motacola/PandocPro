# marp-slides workflow

## Current canonical flow

### 1. Source normalization
Take source material and reduce it into a rough deck draft.

Accepted source shapes:
- markdown
- transcript-derived text
- research notes
- proposal briefs
- report summaries

### 2. Rough deck generation
Use `generate_marp_deck.py` to create:
- Marp markdown
- theme-aware front matter
- presenter notes scaffold

This pass is local and deterministic.

### 3. Rewrite pass
Use a real OpenClaw session or strong model path to rewrite the rough deck into presentation-native copy.

Target output qualities:
- sharper slide titles
- less repetition
- fewer low-value bullets
- stronger narrative flow
- cleaner recommendation / next-step slide

### 4. Export pass
Use Marp CLI to export:
- HTML
- PDF
- PPTX
- notes txt

## Fallback ladder

1. Best: rough deck -> model rewrite -> export
2. Good: rough deck -> export
3. Minimum: outline only

## Rules

- Never claim a model rewrite happened if only local heuristics ran
- Keep Marp markdown as the source of truth
- Prefer branded themes for external-facing decks
- Prefer regular PPTX over editable PPTX unless editability matters more than fidelity

## Product truth

The real value is not markdown-to-slides.
The real value is:

**source material -> structured deck -> rewritten deck -> portable exports**
