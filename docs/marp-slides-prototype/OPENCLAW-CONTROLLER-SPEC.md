# OpenClaw-native controller spec for marp-slides

## Objective
Create an OpenClaw-native controller/orchestrator step that completes the final mile of the `marp-slides` workflow:
- generate rough Marp deck
- invoke real rewrite session automatically
- apply rewritten deck
- export final deliverables

## Why this belongs here
This step depends on OpenClaw runtime capabilities:
- session spawning
- model-backed rewrite execution
- runtime messaging/orchestration
- reliable fallback handling

It should not be embedded as fake model invocation inside local Python scripts.

## Proposed controller responsibilities

### 1. Input contract
Accept:
- source path or source text
- audience
- goal
- deck mode
- theme
- export targets
- rewrite enabled/disabled

### 2. Rough deck stage
Call local generator:
- `generate_marp_deck.py`

Output:
- rough `deck.md`

### 3. Rewrite stage
If rewrite enabled:
- build rewrite request from rough deck + prompt
- spawn bounded rewrite sub-session
- require output as valid Marp markdown only
- enforce timeout / failure handling

### 4. Validation stage
Validate rewrite result:
- contains Marp front matter
- preserves valid markdown deck structure
- non-empty slide content
- if invalid, fall back to rough deck

### 5. Apply stage
Call local applier:
- `apply_rewrite_result.py`

### 6. Export stage
Call local exporter path via:
- `generate_marp_deck.py --export ...`
  or equivalent refactor if export becomes its own module later

### 7. Reporting stage
Return:
- final deck path
- export artifact paths
- whether rewrite was actually applied
- fallback note if rewrite failed/skipped

## Failure behavior

### Rewrite unavailable
- keep rough deck
- continue export
- report: rewrite skipped or unavailable

### Rewrite invalid
- discard invalid rewrite result
- keep rough deck
- continue export
- report: invalid rewrite result, fallback used

### Export failure
- preserve final markdown deck
- report which export targets failed

## Verification contract
A passing run proves:
1. source -> rough deck
2. rough deck -> rewrite session
3. rewrite session -> valid returned Marp markdown
4. returned markdown -> applied deck
5. applied deck -> requested exports

## Suggested user-facing summary shape
- Changed: generated and exported deck, with rewrite applied or skipped
- Verified: rewrite invocation status, deck replacement status, export outputs generated
- Not verified: subjective visual quality unless manually reviewed
- Next validation: open HTML/PDF/PPTX and inspect slide density / design

## Future extensions
- docx adapter before rough deck stage
- transcript adapter before rough deck stage
- image export path
- client-specific theme packs
- editable PPTX opt-in path
