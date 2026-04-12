# Marp Slides Prototype for PandocPro

This folder contains a working prototype for a Marp-based presentation pipeline that fits PandocPro's document-first workflow.

## Why this belongs in PandocPro
PandocPro already owns the document normalization and long-form editing side.
This prototype explores the next logical layer:

**document/transcript/source material -> structured deck -> rewritten deck -> portable presentation exports**

## Included here
- rough deck generator
- workflow wrapper
- rewrite-result applier
- rewrite prompt
- workflow/controller specs
- starter themes
- revised example deck

## Current proven capabilities
- source -> Marp markdown
- mode-aware deck generation
- branded theme support
- export-ready workflow for HTML/PDF/PPTX/notes
- proof that a real rewrite pass materially improves deck quality

## Best product direction
Short term:
- keep this as a prototype package inside docs
- evaluate how much of it should be promoted into CLI/app features

Likely future fit:
- a `deck` or `slides` export path for PandocPro
- report/docx -> presentation companion workflows
- presentation artifacts generated from section-aware document structures

## Important boundary
The final automatic rewrite invocation belongs in the app/runtime orchestration layer, not in the local scripts themselves.
