#!/usr/bin/env python3
"""Verify the Linux model tree against the pinned Windows release's model hashes."""

import hashlib
import json
import os
import sys
from pathlib import Path


def verify(lock_path: Path, models_path: Path) -> None:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    expected = {
        entry["path"].removeprefix("models/"): entry
        for entry in lock["files"] if entry["path"].startswith("models/")
    }
    if lock.get("version") != "docstructure-engine-v1" or len(expected) != 37:
        raise ValueError("Unexpected pinned model manifest")
    if models_path.is_symlink() or not models_path.is_dir():
        raise ValueError("Model root is missing or symbolic")
    actual = set()
    for current, directories, files in os.walk(models_path, followlinks=False):
        for name in directories:
            if (Path(current) / name).is_symlink():
                raise ValueError("Symbolic model directory")
        for name in files:
            candidate = Path(current) / name
            if candidate.is_symlink() or not candidate.is_file():
                raise ValueError("Invalid model file")
            relative = candidate.relative_to(models_path).as_posix()
            if relative not in expected:
                raise ValueError(f"Unexpected model file: {relative}")
            entry = expected[relative]
            if candidate.stat().st_size != entry["size"]:
                raise ValueError(f"Model size mismatch: {relative}")
            with candidate.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            if digest != entry["sha256"]:
                raise ValueError(f"Model hash mismatch: {relative}")
            actual.add(relative)
    missing = set(expected) - actual
    if missing:
        raise ValueError(f"Missing model files: {', '.join(sorted(missing))}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify-docstructure-models.py LOCK_JSON MODELS_DIR")
    verify(Path(sys.argv[1]), Path(sys.argv[2]))
