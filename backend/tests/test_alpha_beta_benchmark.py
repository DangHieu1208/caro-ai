import csv
import json
from dataclasses import replace

import pytest

from app.agents.base import (
    AgentConfig,
    SearchResult,
)

from app.agents.registry import AGENTS
from app.core.game import GameState

from app.experiments.alpha_beta_benchmark import (
    POSITIONS,
    build_state,
    compare_position,
    run_benchmark,
    save_results,
)


@pytest.fixture
def fake_agent(monkeypatch):
    calls = []

    class FakeAgent:
        def choose_move(
            self,
            state,
            config,
        ):
            calls.append(
                (state, config)
            )

            return SearchResult(
                move=state.legal_moves()[0],

                nodes=(
                    25 if config.pruning else 100
                ),

                cutoffs=(
                    8 if config.pruning else 0
                ),

                depth=config.depth,

                value=10.0,
            )

    monkeypatch.setitem(
        AGENTS,
        'minimax',
        (FakeAgent, True),
    )

    return calls


def test_positions_are_legal():
    for moves in POSITIONS.values():
        state = build_state(moves)

        assert state.winner is None

        assert (
            len(state.legal_moves())
            == 81 - len(moves)
        )


def test_only_pruning_changes_and_order_alternates(
    fake_agent,
):
    state = build_state(
        POSITIONS['S2_middle']
    )

    config = AgentConfig(
        depth=2,
        candidate_limit=10,
        seed=42,
    )

    result = compare_position(
        state,
        config,
        4,
    )

    assert [
        c.pruning
        for _, c in fake_agent
    ] == [
        False,
        True,
        True,
        False,
    ] * 2

    assert all(
        s is state

        for s, _ in fake_agent
    )

    assert all(
        replace(
            c,
            pruning=config.pruning,
        ) == config

        for _, c in fake_agent
    )

    summary = result['summary']

    assert (
        summary['node_reduction_percent']
        == pytest.approx(75)
    )

    assert summary['values_match']

    assert summary['moves_match']

    assert summary['stable_metrics']

    assert summary['plain_cutoffs_zero']

    assert summary['ab_nodes_not_greater']

    assert len(
        result['samples']
    ) == 4


def test_mismatch_is_reported(
    monkeypatch,
):
    class BadAgent:
        def choose_move(
            self,
            state,
            config,
        ):
            return SearchResult(
                move=state.legal_moves()[
                    int(config.pruning)
                ],

                nodes=(
                    120
                    if config.pruning
                    else 100
                ),

                cutoffs=0,

                depth=config.depth,

                value=(
                    2.0
                    if config.pruning
                    else 1.0
                ),
            )

    monkeypatch.setitem(
        AGENTS,
        'minimax',
        (BadAgent, True),
    )

    result = compare_position(
        GameState.initial(),

        AgentConfig(seed=42),

        2,
    )

    summary = result['summary']

    assert not summary['values_match']

    assert not summary['moves_match']

    assert not summary['ab_nodes_not_greater']


def test_missing_metrics(
    monkeypatch,
):
    class IncompleteAgent:
        def choose_move(
            self,
            state,
            config,
        ):
            return SearchResult(
                move=state.legal_moves()[0],
            )

    monkeypatch.setitem(
        AGENTS,
        'minimax',
        (IncompleteAgent, True),
    )

    with pytest.raises(
        ValueError,
        match='nodes',
    ):
        compare_position(
            GameState.initial(),

            AgentConfig(seed=42),

            2,
        )


def test_unready_agent(
    monkeypatch,
):
    cls, _ = AGENTS['minimax']

    monkeypatch.setitem(
        AGENTS,
        'minimax',
        (cls, False),
    )

    with pytest.raises(
        ValueError,
        match='not ready',
    ):
        compare_position(
            GameState.initial(),

            AgentConfig(seed=42),

            2,
        )


@pytest.mark.parametrize(
    'repeats',
    [0, 1, 3, True],
)
def test_invalid_repeats(
    fake_agent,
    repeats,
):
    with pytest.raises(
        ValueError,
        match='repeats',
    ):
        compare_position(
            GameState.initial(),

            AgentConfig(seed=42),

            repeats,
        )


def test_export(
    fake_agent,
    tmp_path,
):
    report = run_benchmark(
        AgentConfig(seed=42),

        2,
    )

    output = (
        tmp_path / 'benchmark'
    )

    save_results(
        report,
        output,
    )

    raw = json.loads(
        (
            output / 'alpha_beta.json'
        ).read_text(
            encoding='utf-8',
        )
    )

    assert len(
        raw['cases']
    ) == 3

    assert all(
        len(case['samples']) == 2

        for case in raw['cases']
    )

    with (
        output / 'alpha_beta_summary.csv'
    ).open(
        encoding='utf-8-sig',
        newline='',
    ) as f:
        rows = list(
            csv.DictReader(f)
        )

    assert len(rows) == 3

    assert all(
        float(
            row['node_reduction_percent']
        ) == 75

        for row in rows
    )

    with pytest.raises(FileExistsError):
        save_results(
            report,
            output,
        )
