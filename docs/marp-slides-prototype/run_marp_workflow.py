#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess
import sys

SKILL_DIR = Path(__file__).resolve().parent
GENERATOR = SKILL_DIR / 'generate_marp_deck.py'
REWRITE_PACKET = SKILL_DIR / 'llm_rewrite_stub.py'
APPLY_REWRITE = SKILL_DIR / 'apply_rewrite_result.py'


def run(cmd):
    return subprocess.run(cmd, check=True, text=True, capture_output=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', help='Target Marp markdown path')
    parser.add_argument('--source', required=True)
    parser.add_argument('--audience', default='Smart non-expert stakeholder')
    parser.add_argument('--goal', default='Explain the key ideas clearly')
    parser.add_argument('--mode', default='general')
    parser.add_argument('--theme', default='default')
    parser.add_argument('--export', help='Comma-separated formats')
    parser.add_argument('--rewrite-packet-out', help='Optional path to write rewrite packet')
    parser.add_argument('--rewrite-result', help='Optional model rewrite result to apply back into the deck')
    parser.add_argument('--no-rewrite', action='store_true')
    args = parser.parse_args()

    cmd = [
        'python3', str(GENERATOR), args.output,
        '--source', args.source,
        '--audience', args.audience,
        '--goal', args.goal,
        '--mode', args.mode,
        '--theme', args.theme,
    ]
    if args.export:
        cmd += ['--export', args.export]
    run(cmd)

    if not args.no_rewrite:
        packet_out = Path(args.rewrite_packet_out) if args.rewrite_packet_out else Path(args.output).with_name(Path(args.output).stem + '-rewrite-packet.md')
        run(['python3', str(REWRITE_PACKET), args.output, str(packet_out)])
        print(f'REWRITE_PACKET={packet_out}')

    if args.rewrite_result:
        run(['python3', str(APPLY_REWRITE), args.rewrite_result, args.output])
        print(f'APPLIED_REWRITE={args.output}')

    print(f'DECK={args.output}')


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as e:
        sys.stderr.write(e.stderr or str(e))
        raise
