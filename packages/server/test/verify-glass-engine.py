"""Run with the pinned pyWinCalc Python on Mac and production Linux."""

from pathlib import Path
from runpy import run_path
import math

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

def stack(count, gas="air"):
    return {
        "panes": [{"thicknessMm": 6} for _ in range(count)],
        "gaps": [{"type": "hollow", "thicknessMm": 12, "gas": gas} for _ in range(count - 1)],
        "outsideH": 25, "insideH": 7.7,
    }

assert abs(estimate(stack(2))["uValue"] - estimate(hollow)["uValue"]) < 1e-8
previous = math.inf
values = []
for count in range(2, 21):
    value = estimate(stack(count))["uValue"]
    assert 0 < value < previous, (count, value, previous)
    values.append({"panes": count, "uValue": value})
    previous = value

triple = stack(3)
argon = stack(3, "argon")
assert estimate(argon)["uValue"] < estimate(triple)["uValue"]
coated = stack(3, "argon")
coated["panes"][0]["backEmissivity"] = 0.1
coated["panes"][2]["frontEmissivity"] = 0.04
assert estimate(coated)["uValue"] < estimate(argon)["uValue"]
unequal = stack(4)
for pane_data, thickness in zip(unequal["panes"], [4, 6, 8, 10]):
    pane_data["thicknessMm"] = thickness
assert math.isfinite(estimate(unequal)["uValue"])

layered_vacuum = {
    "panes": [{"thicknessMm": 6, "backEmissivity": .1}, {"thicknessMm": 6}],
    "gaps": [{"type": "vacuum", "thicknessMm": .2, "vacuumPressurePa": .1, "pillarDiameterMm": .5, "pillarPitchMm": 25}],
    "outsideH": 25, "insideH": 7.7,
}
assert abs(estimate(layered_vacuum)["uValue"] - estimate(vacuum)["uValue"]) < 1e-8
mixed = stack(3)
mixed["panes"][0]["backEmissivity"] = .1
mixed["gaps"][0] = layered_vacuum["gaps"][0]
assert 0 < estimate(mixed)["uValue"] < estimate(triple)["uValue"]
try:
    estimate({**triple, "gaps": []})
    raise AssertionError("A missing gap must be rejected")
except ValueError:
    pass
print("pyWinCalc 3.6.2 legacy, 2–20 panes, coatings, gases, unequal glass and vacuum reference cases passed")
print(values)
