# Slide Rewrite Prompt

Use this prompt with a strong model to rewrite rough extracted slide bullets into presentation-native copy.

## Objective
Rewrite the provided draft deck so it reads like a real slide deck, not a transcript dump or rough summary.

## Rules
- Keep the same slide structure unless there is a strong reason to merge or rename
- Prefer short, high-signal bullets
- Remove repetition
- Make titles sharper if needed
- Do not turn slides into paragraphs
- Keep each slide focused on one idea
- Preserve factual meaning
- Prefer clarity, hierarchy, and decision-readiness over comprehensiveness
- If a bullet is weak, rewrite it instead of preserving bad phrasing

## Target style
- concise
- executive-friendly
- easy to scan
- visually presentable
- confident but not hypey

## Inputs
- audience
- goal
- deck mode
- raw source summary
- draft Marp deck

## Output
Return only revised Marp markdown.

## Suggested workflow
1. tighten slide titles
2. reduce each slide to 2-5 strong bullets max
3. remove duplicate ideas across slides
4. end with an action-oriented recommendation
