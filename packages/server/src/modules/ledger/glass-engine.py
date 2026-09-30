"""Center-of-glazing U calculation. Requires exactly pywincalc 3.6.2."""

import json
import math
import sys
from importlib.metadata import version


def estimate(data):
    if version("pywincalc") != "3.6.2":
        raise RuntimeError("pywincalc 3.6.2 required")
    import pywincalc as wc

    def pane(thickness_mm, front_emissivity, back_emissivity):
        thickness = thickness_mm / 1000
        # Optical constants are generic clear glass; U uses thermal/IR data only,
        # with zero solar irradiance in the environments below.
        optical = wc.ProductDataOpticalDualBandHemispheric(
            solar_transmittance_front=0.8, solar_transmittance_back=0.8,
            solar_reflectance_front=0.08, solar_reflectance_back=0.08,
            visible_transmittance_front=0.8, visible_transmittance_back=0.8,
            visible_reflectance_front=0.08, visible_reflectance_back=0.08,
            thickness_meters=thickness, ir_transmittance_front=0,
            ir_transmittance_back=0, emissivity_front=front_emissivity,
            emissivity_back=back_emissivity,
        )
        thermal = wc.ProductDataThermal(conductivity=1, thickness_meters=thickness, flipped=False)
        return wc.ProductDataOpticalAndThermal(optical, thermal)

    if "panes" in data:
        panes = data["panes"]
        gaps = data["gaps"]
    else:
        emissivity = data.get("emissivity") if data["coating"] != "none" else 0.84
        panes = [
            {"thicknessMm": data["outerMm"], "backEmissivity": emissivity if data["coating"] == "surface2" else 0.84},
            {"thicknessMm": data["innerMm"], "frontEmissivity": emissivity if data["coating"] == "surface3" else 0.84},
        ]
        gaps = [{**data, "thicknessMm": data["gapMm"]}]
    if not 2 <= len(panes) <= 20 or len(gaps) != len(panes) - 1:
        raise ValueError("invalid pane/gap count")

    def make_gap(item):
        gap_m = item["thicknessMm"] / 1000
        if item["type"] == "hollow":
            gas_type = wc.PredefinedGasType.ARGON if item["gas"] == "argon" else wc.PredefinedGasType.AIR
            return wc.Layers.gap(thickness=gap_m, gas=wc.create_gas([[1.0, gas_type]]), pressure=101325)
        pillar = wc.CylindricalPillar(
            height=gap_m, material_conductivity=20,
            cell_area=wc.pillar_cell_area(wc.CellSpacingType.SQUARE, item["pillarPitchMm"] / 1000),
            radius=item["pillarDiameterMm"] / 2000,
        )
        return wc.Layers.create_pillar(pillar=pillar, pressure=item["vacuumPressurePa"])

    def environment(air_c, coefficient):
        return wc.Environment(
            air_temperature=air_c + 273.15, pressure=101325,
            convection_coefficient=coefficient,
            coefficient_model=wc.BoundaryConditionsCoefficientModelType.H_PRESCRIBED,
            radiation_temperature=air_c + 273.15, emissivity=1,
            air_speed=0, direct_solar_radiation=0,
        )

    conditions = wc.Environments(
        environment(0, data["outsideH"]), environment(20, data["insideH"])
    )
    result = float(wc.GlazingSystem(
        solid_layers=[pane(item["thicknessMm"], item.get("frontEmissivity", 0.84), item.get("backEmissivity", 0.84)) for item in panes],
        gap_layers=[make_gap(item) for item in gaps], environment=conditions,
        width_meters=1, height_meters=1, tilt_degrees=90,
    ).u())
    if not math.isfinite(result) or result <= 0:
        raise RuntimeError("invalid U result")
    return {"uValue": result}


if __name__ == "__main__":
    try:
        print(json.dumps(estimate(json.load(sys.stdin))))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
