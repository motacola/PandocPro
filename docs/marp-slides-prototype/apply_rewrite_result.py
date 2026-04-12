#!/usr/bin/env python3
from pathlib import Path
import re
import sys


def extract_marp(text: str) -> str | None:
    text = text.strip()
    if text.startswith('---') and 'marp:' in text:
        return text + ('\n' if not text.endswith('\n') else '')

    fence = re.search(r'```markdown\n(.*?)```', text, re.S)
    if fence:
        body = fence.group(1).strip()
        if body.startswith('---') and 'marp:' in body:
            return body + ('\n' if not body.endswith('\n') else '')

    return None


def main():
    if len(sys.argv) != 3:
        print('usage: apply_rewrite_result.py <rewrite_result.txt> <deck.md>', file=sys.stderr)
        raise SystemExit(1)

    result_path = Path(sys.argv[1])
    deck_path = Path(sys.argv[2])
    content = result_path.read_text()
    marp = extract_marp(content)
    if not marp:
        print('No valid Marp markdown found in rewrite result.', file=sys.stderr)
        raise SystemExit(2)

    deck_path.write_text(marp)
    print(deck_path)


if __name__ == '__main__':
    main()
