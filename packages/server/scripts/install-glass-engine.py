"""Build pinned pyWinCalc for the active Python (Mac ARM or Linux)."""

import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path

TAG = "v3.6.2"
SHA = "49e3316a17d08715b96a5245a4bb656fcd914310"
REPO = "https://github.com/LBNL-ETA/pyWinCalc.git"


def run(*args, **kwargs):
    subprocess.run(args, check=True, **kwargs)


with tempfile.TemporaryDirectory(prefix="ledger-glass-build-") as directory:
    source = Path(directory) / "pyWinCalc"
    run("git", "clone", "--depth", "1", "--branch", TAG, REPO, str(source))
    actual = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    if actual != SHA:
        raise RuntimeError(f"pyWinCalc {TAG} SHA mismatch: {actual}")

    # Build compatibility only; no engine source or parameters are changed.
    cmake = source / "CMakeLists-WinCalc.txt.in"
    original = cmake.read_text()
    assert 'GIT_TAG "v2.5.1"' in original
    cmake.write_text(original.replace('GIT_TAG "v2.5.1"', 'GIT_TAG "v2.5.1"\n    GIT_SHALLOW TRUE'))

    if platform.system() == "Darwin":
        setup = source / "setup.py"
        original = setup.read_text()
        marker = "cmake_args += ['-DCMAKE_BUILD_TYPE=' + cfg]"
        assert marker in original
        setup.write_text(original.replace(
            marker, "cmake_args += ['-DCMAKE_BUILD_TYPE=' + cfg, "
            "'-DCMAKE_CXX_FLAGS=-Wno-error=deprecated-literal-operator']",
        ))

    constraints = Path(directory) / "constraints.txt"
    constraints.write_text("cmake<4\n")
    env = {**os.environ, "PIP_CONSTRAINT": str(constraints)}
    run(sys.executable, "-m", "pip", "install", str(source), env=env)

run(sys.executable, "-c", "from importlib.metadata import version; import pywincalc; assert version('pywincalc') == '3.6.2'")
