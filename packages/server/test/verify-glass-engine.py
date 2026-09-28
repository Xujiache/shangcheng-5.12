"""Run with the pinned pyWinCalc Python on Mac and production Linux."""

from pathlib import Path
from runpy import run_path

estimate = run_path(str(Path(__file__).parents[1] / "src/modules/ledger/glass-engine.py"))["estimate"]

hollow = {
    "type": "hollow", "outerMm": 6, "innerMm": 6, "gapMm": 12,
    "gas": "air", "coating": "none", "outsideH": 25, "insideH": 7.7,
}
vacuum = {
    "type": "vacuum", "outerMm": 6, "innerMm": 6, "gapMm": 0.2,
    "coating": "surface2", "emissivity": 0.1, "vacuumPressurePa": 0.1,
    "pillarDiameterMm": 0.5, "pillarPitchMm": 25,
    "outsideH": 25, "insideH": 7.7,
}

for input_data, expected in (
    (hollow, 2.7991738394707806),
    ({**hollow, "gas": "argon"}, 2.6327303375703073),
    (vacuum, 1.1245329998385727),
):
    actual = estimate(input_data)["uValue"]
    assert abs(actual - expected) < 0.01, (input_data["type"], actual, expected)

assert estimate({**hollow, "gas": "argon"})["uValue"] < estimate(hollow)["uValue"]
assert estimate({**vacuum, "vacuumPressurePa": 10})["uValue"] > estimate(vacuum)["uValue"]
print("pyWinCalc 3.6.2 glass reference cases passed")
