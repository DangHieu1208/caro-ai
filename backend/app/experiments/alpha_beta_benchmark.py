import argparse
import csv
import json
import os
import platform
import subprocess
from dataclasses import asdict, replace
from datetime import datetime, timezone
from math import isclose, isfinite
from pathlib import Path
from statistics import median
from time import perf_counter

from app.agents.base import AgentConfig
from app.agents.registry import AGENTS
from app.core.game import GameState, Move


POSITIONS: dict[str, tuple[Move, ...]] = {
    'S1_early': (
        (4, 4),
        (4, 5),
        (5, 4),
        (3, 4),
    ),

    'S2_middle': (
        (4, 4),
        (4, 5),
        (5, 4),
        (3, 4),
        (5, 5),
        (5, 3),
        (3, 3),
        (6, 6),
        (2, 2),
        (2, 3),
        (6, 4),
        (3, 5),
    ),

    'S3_tactical': (
        (4, 2),
        (3, 2),
        (4, 3),
        (3, 3),
        (4, 4),
        (3, 4),
        (4, 5),
        (5, 5),
    ),
}


def build_state(
    moves: tuple[Move, ...],
) -> GameState:
    state = GameState.initial()

    for move in moves:
        state = state.play(move)

    if state.winner is not None:
        raise ValueError(
            'Benchmark position must be nonterminal'
        )

    return state


def _measure(
    agent_class,
    state,
    config,
):
    agent = agent_class()

    start = perf_counter()

    result = agent.choose_move(
        state,
        config,
    )

    elapsed_ms = (
        perf_counter() - start
    ) * 1000

    if result.move not in state.legal_moves():
        raise ValueError(
            'MiniMax returned an illegal move'
        )

    for key in ('nodes', 'cutoffs', 'depth'):
        value = getattr(result, key)

        if type(value) is not int or value < 0:
            raise ValueError(
                f'Missing or invalid metric: {key}'
            )

    if (
        result.value is None
        or not isfinite(result.value)
    ):
        raise ValueError(
            'Missing or non-finite evaluation'
        )

    return {
        **asdict(result),
        'elapsed_ms': elapsed_ms,
    }


def compare_position(
    state,
    config,
    repeats=4,
):
    if state.winner is not None:
        raise ValueError(
            'Benchmark position must be nonterminal'
        )

    if (
        type(repeats) is not int
        or repeats < 2
        or repeats % 2
    ):
        raise ValueError(
            'repeats must be a positive even integer >= 2'
        )

    agent_class, ready = AGENTS['minimax']

    if not ready:
        raise ValueError(
            'MiniMax is not ready; review and integrate it first'
        )

    plain_config = replace(
        config,
        pruning=False,
    )

    ab_config = replace(
        config,
        pruning=True,
    )

    configs = {
        'plain': plain_config,
        'ab': ab_config,
    }

    samples = []

    for index in range(repeats):
        # Alternate execution order to reduce order bias.
        order = (
            ('plain', 'ab')
            if index % 2 == 0
            else ('ab', 'plain')
        )

        sample = {
            'repeat': index + 1,
            'order': order,
        }

        for mode in order:
            sample[mode] = _measure(
                agent_class,
                state,
                configs[mode],
            )

        samples.append(sample)

    # Calculate median node counts.
    p_nodes = median(
        s['plain']['nodes']
        for s in samples
    )

    a_nodes = median(
        s['ab']['nodes']
        for s in samples
    )

    # Calculate median search times.
    p_time = median(
        s['plain']['elapsed_ms']
        for s in samples
    )

    a_time = median(
        s['ab']['elapsed_ms']
        for s in samples
    )

    values_match = all(
        isclose(
            s['plain']['value'],
            s['ab']['value'],
            rel_tol=1e-9,
            abs_tol=1e-9,
        )
        for s in samples
    )

    moves_match = all(
        s['plain']['move'] == s['ab']['move']
        for s in samples
    )

    def signature(record):
        return tuple(
            record[key]
            for key in (
                'move',
                'nodes',
                'cutoffs',
                'depth',
                'value',
            )
        )

    stable = all(
        signature(s[mode])
        == signature(samples[0][mode])

        for s in samples

        for mode in configs
    )

    summary = {
        'plain_nodes_median': p_nodes,

        'ab_nodes_median': a_nodes,

        'plain_cutoffs_median': median(
            s['plain']['cutoffs']
            for s in samples
        ),

        'ab_cutoffs_median': median(
            s['ab']['cutoffs']
            for s in samples
        ),

        'plain_time_ms_median': p_time,

        'ab_time_ms_median': a_time,

        'node_reduction_percent': (
            (1 - a_nodes / p_nodes) * 100
            if p_nodes
            else None
        ),

        'speedup': (
            p_time / a_time
            if a_time > 0
            else None
        ),

        'values_match': values_match,

        'moves_match': moves_match,

        'stable_metrics': stable,

        'plain_cutoffs_zero': all(
            s['plain']['cutoffs'] == 0
            for s in samples
        ),

        'ab_nodes_not_greater': all(
            s['ab']['nodes']
            <= s['plain']['nodes']
            for s in samples
        ),
    }

    return {
        'samples': samples,
        'summary': summary,
    }


def _git(*args):
    try:
        return subprocess.check_output(
            ['git', *args],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()

    except (
        OSError,
        subprocess.CalledProcessError,
    ):
        return None


def run_benchmark(
    config,
    repeats=4,
):
    if config.seed is None:
        raise ValueError(
            'Use a fixed seed for the benchmark'
        )

    revision = _git(
        'rev-parse',
        'HEAD',
    )

    # Ignore untracked export files.
    # Tracked code changes still matter.
    changes = _git(
        'status',
        '--porcelain',
        '--untracked-files=no',
    )

    cases = []

    for case_id, moves in POSITIONS.items():
        state = build_state(moves)

        cases.append({
            'case_id': case_id,

            'history': moves,

            'board': state.board,

            'to_move': state.to_move,

            **compare_position(
                state,
                config,
                repeats,
            ),
        })

    return {
        'created_at': datetime.now(
            timezone.utc
        ).isoformat(),

        'source_revision': revision,

        'tracked_files_dirty': (
            None
            if changes is None
            else bool(changes)
        ),

        'environment': {
            'python_version':
                platform.python_version(),

            'operating_system':
                platform.platform(),

            'processor':
                platform.processor() or None,

            'logical_cpu_count':
                os.cpu_count(),

            'timing_method':
                'perf_counter',

            'execution_mode':
                'sequential',
        },

        'config': {
            key: value

            for key, value in asdict(config).items()

            if key != 'pruning'
        },

        'repeats': repeats,

        'cases': cases,
    }


def save_results(
    report,
    output: Path,
):
    # Never overwrite an existing benchmark.
    output.mkdir(
        parents=True,
        exist_ok=False,
    )

    json_path = (
        output / 'alpha_beta.json'
    )

    json_path.write_text(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=False,
            allow_nan=False,
        ),

        encoding='utf-8',
    )

    rows = [
        {
            'case_id': case['case_id'],

            'to_move': case['to_move'],

            'depth':
                report['config']['depth'],

            'candidate_limit':
                report['config']['candidate_limit'],

            'seed':
                report['config']['seed'],

            'repeats':
                report['repeats'],

            **case['summary'],
        }

        for case in report['cases']
    ]

    csv_path = (
        output / 'alpha_beta_summary.csv'
    )

    with csv_path.open(
        'w',
        encoding='utf-8-sig',
        newline='',
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=list(rows[0]),
        )

        writer.writeheader()

        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(
        description='Paired Alpha-Beta benchmark',
    )

    parser.add_argument(
        '--depth',
        type=int,
        choices=(2, 3, 4),
        default=2,
    )

    parser.add_argument(
        '--candidate-limit',
        type=int,
        choices=(5, 10, 15, 20),
        default=10,
    )

    parser.add_argument(
        '--repeats',
        type=int,
        choices=range(2, 11, 2),
        default=4,
    )

    parser.add_argument(
        '--seed',
        type=int,
        default=42,
    )

    parser.add_argument(
        '--output',
        type=Path,
        required=True,
    )

    args = parser.parse_args()

    if args.output.exists():
        parser.error(
            'Output directory already exists; choose a new one'
        )

    config = AgentConfig(
        depth=args.depth,

        candidate_limit=args.candidate_limit,

        seed=args.seed,
    )

    try:
        report = run_benchmark(
            config,
            args.repeats,
        )

        save_results(
            report,
            args.output,
        )

    except (
        ValueError,
        OSError,
    ) as exc:
        parser.exit(
            1,

            f'Benchmark failed: {exc}\n',
        )

    for case in report['cases']:
        print(
            case['case_id'],

            json.dumps(
                case['summary'],
                ensure_ascii=False,
            ),
        )

    print(
        f'Results saved to {args.output}'
    )


if __name__ == '__main__':
    main()
