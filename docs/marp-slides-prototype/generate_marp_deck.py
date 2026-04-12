#!/usr/bin/env python3
from pathlib import Path
import argparse
import os
import re
import subprocess
import textwrap

SKILL_DIR = Path(__file__).resolve().parent
THEMES_DIR = SKILL_DIR / 'themes'
REWRITE_PROMPT = SKILL_DIR / 'rewrite_slide_prompt.md'

TEMPLATE = """---
marp: true
theme: {theme}
paginate: true
size: 16:9
title: {title}
description: {description}
author: Roboto
---

# {title}
## {subtitle}
<!-- _notes: {notes_title} -->

---

## Why this matters
{why}
<!-- _notes: {notes_why} -->

---

## What this says
{summary}
<!-- _notes: {notes_summary} -->

---

## Key takeaways
{takeaways}
<!-- _notes: {notes_takeaways} -->

---

## Recommendation
{recommendation}
<!-- _notes: {notes_recommendation} -->

---

# Next steps
{next_steps}
<!-- _notes: {notes_next_steps} -->
"""

STOPWORDS = {
    'the','and','that','with','this','from','have','your','into','they','them','will','what','when','where',
    'about','there','their','which','while','would','could','should','because','also','just','like','than',
    'then','here','some','more','most','much','very','only','really','using','used','over','make','makes',
    'made','being','been','onto','does','doing','done','its','you','for','are','was','were','how'
}


def bullets(items):
    return "\n".join(f"- {item}" for item in items if item)


def normalize_bullet(text):
    s = re.sub(r'^\d+\.\s*', '', text.strip())
    s = re.sub(r'^(Audience|Goal|Source):\s*', '', s, flags=re.I)
    s = s.strip(' -')
    if not s:
        return None
    if len(s) > 110:
        s = s[:107].rstrip() + '...'
    return s[0].upper() + s[1:] if s else s


def unique_keep_order(items, limit=None):
    out = []
    seen = set()
    for item in items:
        if not item:
            continue
        key = item.lower().strip()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if limit and len(out) >= limit:
            break
    return out


def clean_text(text):
    text = re.sub(r'```.*?```', ' ', text, flags=re.S)
    text = re.sub(r'`([^`]*)`', r'\1', text)
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'\1', text)
    cleaned_lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith('#'):
            s = s.lstrip('#').strip()
        if re.match(r'^\d+\.', s):
            cleaned_lines.append(s)
            continue
        if s.startswith('- '):
            cleaned_lines.append(s[2:].strip())
            continue
        cleaned_lines.append(s)
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'\n{2,}', '\n', text)
    return text.strip()


def split_sentences(text):
    raw_parts = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if len(s) <= 160:
            raw_parts.append(s)
        else:
            raw_parts.extend(re.split(r'(?<=[.!?])\s+', s))
    return [p.strip(' -') for p in raw_parts if len(p.strip()) > 20]


def extract_structured_lines(raw_text):
    items = []
    current_section = None
    for line in raw_text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith('#'):
            current_section = s.lstrip('#').strip()
            continue
        if s.startswith('- '):
            items.append((current_section, s[2:].strip()))
            continue
        if re.match(r'^\d+\.', s):
            items.append((current_section, s))
            continue
    return items


def top_terms(text, limit=8):
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-\.]+", text.lower())
    counts = {}
    for w in words:
        if len(w) < 4 or w in STOPWORDS:
            continue
        counts[w] = counts.get(w, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [w for w, _ in ranked[:limit]]


def pick_sentences(sentences, terms, limit=5):
    scored = []
    for s in sentences:
        score = sum(1 for t in terms if t in s.lower())
        scored.append((score, len(s), s))
    ranked = sorted(scored, key=lambda x: (-x[0], x[1]))
    chosen = []
    seen = set()
    for _, _, s in ranked:
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        chosen.append(s)
        if len(chosen) >= limit:
            break
    return chosen


def infer_title(path, text):
    for line in text.splitlines():
        s = line.strip()
        if s.startswith('#'):
            return s.lstrip('#').strip()
    stem = Path(path).stem.replace('-', ' ').replace('_', ' ').strip()
    return stem.title() if stem else 'Presentation Title'


def mode_defaults(mode):
    mode = (mode or 'general').lower()
    if mode == 'executive':
        return {
            'subtitle': 'Executive summary',
            'description': 'Executive-style deck generated from source material.',
            'recommendation_prefix': 'Decision frame',
        }
    if mode == 'teaching':
        return {
            'subtitle': 'Teaching deck',
            'description': 'Teaching-oriented deck generated from source material.',
            'recommendation_prefix': 'What to apply',
        }
    if mode == 'client':
        return {
            'subtitle': 'Client-facing deck',
            'description': 'Client-oriented deck generated from source material.',
            'recommendation_prefix': 'Recommended path',
        }
    if mode == 'data':
        return {
            'subtitle': 'Data / performance deck',
            'description': 'Data-focused deck generated from source material.',
            'recommendation_prefix': 'Action from the data',
        }
    return {
        'subtitle': 'Generated with marp-slides',
        'description': 'Presentation deck generated from source material.',
        'recommendation_prefix': 'Recommendation',
    }


def deck_from_text(source_path, out_path, audience='Smart non-expert stakeholder', goal='Explain the key ideas clearly', mode='general', theme='default'):
    raw = Path(source_path).read_text()
    title = infer_title(source_path, raw)
    text = clean_text(raw)
    sentences = split_sentences(text)
    structured = extract_structured_lines(raw)
    terms = top_terms(text)
    picked = pick_sentences(sentences, terms, limit=10)

    defaults = mode_defaults(mode)

    why = [
        f'Audience: {audience}',
        f'Goal: {goal}',
        'This deck compresses the source into presentation-native structure.'
    ]

    section_map = {}
    for section, item in structured:
        if not section:
            continue
        section_map.setdefault(section.lower(), []).append(item)

    summary = []
    for key in ['deck strategy', 'input', 'output shape']:
        if key in section_map:
            summary.extend(section_map[key][:2])
    if not summary:
        summary = picked[:3] if picked else ['Source loaded, but the summary needs manual refinement.']
    summary = unique_keep_order([normalize_bullet(x) for x in summary], limit=4)

    takeaways = []
    if terms:
        takeaways.append('Core themes: ' + ', '.join(terms[:5]))
    for key in ['slide outline', 'output shape', 'deck strategy']:
        if key in section_map:
            takeaways.extend(section_map[key][:3])
    if len(takeaways) < 3:
        takeaways.extend(picked[3:6])
    takeaways = unique_keep_order([normalize_bullet(x) for x in takeaways], limit=5)

    recommendation = []
    if 'slide outline' in section_map:
        recommendation.append(f"{defaults['recommendation_prefix']}: build around the existing slide sequence instead of expanding scope.")
    else:
        recommendation.append(f"{defaults['recommendation_prefix']}: use this as the first structured pass, then tighten slide density.")
    recommendation.append('Promote strong visuals, comparisons, and numbers in a second pass.')
    recommendation = unique_keep_order([normalize_bullet(x) for x in recommendation], limit=3)

    next_steps = []
    if 'marp deck' in section_map:
        next_steps.append('Refine the generated Marp deck into presentation-native slide copy.')
    else:
        next_steps.append('Review titles and tighten any bulky bullets.')
    next_steps.extend([
        'Apply theme/template if needed.',
        'Export to HTML or PDF, or bridge into PPTX/Google Slides later.'
    ])
    next_steps = unique_keep_order([normalize_bullet(x) for x in next_steps], limit=3)

    content = TEMPLATE.format(
        theme=theme,
        title=title,
        subtitle=defaults['subtitle'],
        description=defaults['description'],
        why=bullets(why),
        summary=bullets(summary),
        takeaways=bullets(takeaways[:5]),
        recommendation=bullets(recommendation),
        next_steps=bullets(next_steps),
        notes_title='Open with the core purpose of the deck and what decision or understanding it should create.',
        notes_why='Use this slide to orient the audience quickly and reduce context switching.',
        notes_summary='Talk through the central claims from the source, not every detail.',
        notes_takeaways='Emphasize the 2-3 ideas worth remembering after the meeting.',
        notes_recommendation='State the best next move plainly and explain why it wins.',
        notes_next_steps='Close with action, ownership, and what should happen immediately after review.',
    )
    Path(out_path).write_text(textwrap.dedent(content))


def build_rewrite_packet(deck_text, audience, goal, mode):
    prompt = REWRITE_PROMPT.read_text() if REWRITE_PROMPT.exists() else ''
    return textwrap.dedent(f"""{prompt}

# Context
- audience: {audience}
- goal: {goal}
- deck mode: {mode}

# Draft Marp Deck

```markdown
{deck_text}
```
""")


def maybe_rewrite_with_openclaw(deck_path, audience, goal, mode):
    if os.environ.get('MARP_SLIDES_DISABLE_REWRITE') == '1':
        return False
    deck = Path(deck_path)
    packet = build_rewrite_packet(deck.read_text(), audience, goal, mode)
    try:
        proc = subprocess.run(
            ['python3', '-c', 'import sys; print(sys.stdin.read())'],
            input=packet,
            capture_output=True,
            text=True,
            check=True,
        )
        rewritten = proc.stdout.strip()
        if rewritten.startswith('# Slide Rewrite Prompt') or '```markdown' in rewritten:
            return False
        if 'marp:' in rewritten and '---' in rewritten:
            deck.write_text(rewritten + ('\n' if not rewritten.endswith('\n') else ''))
            return True
    except Exception:
        return False
    return False


def export_with_marp(deck_path, formats, theme=None):
    deck = Path(deck_path)
    outputs = []
    theme_args = []
    if theme and theme not in {'default', 'gaia', 'uncover'}:
        css_path = THEMES_DIR / f'{theme}.css'
        if css_path.exists():
            theme_args = ['--theme-set', str(css_path)]
    for fmt in formats:
        fmt = fmt.lower()
        if fmt == 'md':
            outputs.append(str(deck))
            continue
        out = deck.with_suffix(f'.{fmt}')
        cmd = ['npx', '@marp-team/marp-cli@latest', str(deck), *theme_args, '-o', str(out)]
        if fmt == 'pdf':
            cmd = ['npx', '@marp-team/marp-cli@latest', '--pdf', str(deck), *theme_args, '-o', str(out)]
        elif fmt == 'pptx':
            cmd = ['npx', '@marp-team/marp-cli@latest', '--pptx', str(deck), *theme_args, '-o', str(out)]
        elif fmt == 'html':
            cmd = ['npx', '@marp-team/marp-cli@latest', str(deck), *theme_args, '-o', str(out)]
        elif fmt == 'txt':
            out = deck.with_name(deck.stem + '-notes.txt')
            cmd = ['npx', '@marp-team/marp-cli@latest', '--notes', str(deck), *theme_args, '-o', str(out)]
        else:
            raise SystemExit(f'Unsupported export format: {fmt}')
        subprocess.run(cmd, check=True)
        outputs.append(str(out))
    return outputs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', help='Path to write deck markdown')
    parser.add_argument('--source', help='Source markdown/text file')
    parser.add_argument('--audience', default='Smart non-expert stakeholder')
    parser.add_argument('--goal', default='Explain the key ideas clearly')
    parser.add_argument('--mode', default='general', help='Deck mode: general, executive, teaching, client, data')
    parser.add_argument('--theme', default='default', help='Marp theme name')
    parser.add_argument('--export', help='Comma-separated formats: md,html,pdf,pptx,txt')
    parser.add_argument('--rewrite', action='store_true', help='Attempt model-backed rewrite pass before export')
    args = parser.parse_args()

    if args.source:
        deck_from_text(args.source, args.output, args.audience, args.goal, args.mode, args.theme)
    else:
        Path(args.output).write_text(textwrap.dedent(TEMPLATE.format(
            theme=args.theme,
            title='Presentation Title',
            subtitle='Generated with marp-slides',
            description='Presentation deck generated from source material.',
            why=bullets(['Explain the opportunity or problem clearly', 'Make the takeaway obvious fast']),
            summary=bullets(['Replace this with source-driven summary bullets']),
            takeaways=bullets(['Keep one strong idea per slide', 'Prefer evidence and decisions over filler']),
            recommendation=bullets(['Choose the smallest useful next build', 'Use Marp as the authoring layer first']),
            next_steps=bullets(['Refine slide copy', 'Apply theme/template if needed', 'Export to HTML or PDF']),
            notes_title='Open with the purpose of the deck.',
            notes_why='Orient the audience fast.',
            notes_summary='Summarize only the important ideas.',
            notes_takeaways='Highlight the memorable points.',
            notes_recommendation='State the recommended move clearly.',
            notes_next_steps='End with clear actions.'
        )))

    if args.rewrite:
        maybe_rewrite_with_openclaw(args.output, args.audience, args.goal, args.mode)

    outputs = [args.output]
    if args.export:
        formats = [f.strip() for f in args.export.split(',') if f.strip()]
        outputs = export_with_marp(args.output, formats, args.theme)

    for out in outputs:
        print(out)


if __name__ == '__main__':
    main()
