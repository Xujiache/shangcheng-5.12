#!/usr/bin/env python3
"""Execute the hash-locked original Windows docengine entry with Python 3.12."""

import hashlib
import json
import marshal
import os
from pathlib import Path
import sys
import types

ENTRY_SHA256 = "36404137ad6657f41e10558f7b72de907d845c851c5e9be76e926853d4e99037"
ENTRY_PATH = Path(os.environ.get("FLYINGMOUSE_DOCENGINE_ENTRY", "/opt/docengine/docengine-entry.marshal"))
MODULES_PATH = Path(os.environ.get("FLYINGMOUSE_DOCENGINE_MODULES", "/opt/docengine/modules"))
MANIFEST_PATH = Path(os.environ.get("FLYINGMOUSE_DOCENGINE_MANIFEST", "/opt/docengine/modules-manifest.json"))
EXE_SHA256 = "c79c5fb2f797a04e7d2794ef84a88caac0ec6e8f8348efe310fc127549cd518c"
PYZ_SHA256 = "6f75f22d34ca0cc910ac6bfaf17dcbc639d41a864e816980aa918ddf0b433504"


def verify_modules() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    if (manifest.get("exeSha256") != EXE_SHA256 or
            manifest.get("pyzSha256") != PYZ_SHA256 or
            manifest.get("pythonMagic") != "cb0d0d0a" or
            manifest.get("counts") != {"pdf2docx": 55, "camelot": 20}):
        raise RuntimeError("Original docengine module manifest mismatch")
    records = manifest.get("modules")
    if not isinstance(records, list) or len(records) != 75:
        raise RuntimeError("Original docengine module inventory incomplete")
    root = MODULES_PATH.resolve()
    seen = set()
    for item in records:
        name = item.get("module")
        path = item.get("path")
        if not isinstance(name, str) or not isinstance(path, str) or name in seen or \
                not (name == "pdf2docx" or name.startswith("pdf2docx.") or
                     name == "camelot" or name.startswith("camelot.")):
            raise RuntimeError("Original docengine module identity invalid")
        seen.add(name)
        expected = "/".join(name.split("."))
        if path not in (expected + ".pyc", expected + "/__init__.pyc"):
            raise RuntimeError("Original docengine module path invalid")
        file = (root / path).resolve()
        if not file.is_relative_to(root) or not file.is_file() or \
                hashlib.sha256(file.read_bytes()).hexdigest() != item.get("pycSha256"):
            raise RuntimeError(f"Original docengine module missing or corrupt: {name}")
    sys.path.insert(0, str(root))


def main() -> None:
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError("Original docengine bytecode requires Python 3.12")
    data = ENTRY_PATH.read_bytes()
    if hashlib.sha256(data).hexdigest() != ENTRY_SHA256:
        raise RuntimeError("Original docengine entry SHA-256 mismatch")
    verify_modules()
    code = marshal.loads(data)
    if not isinstance(code, types.CodeType):
        raise RuntimeError("Original docengine entry is not a Python code object")
    original_argv0 = sys.argv[0]
    try:
        sys.argv[0] = str(ENTRY_PATH)
        exec(code, {"__name__": "__main__", "__file__": str(ENTRY_PATH), "__package__": None})
    finally:
        sys.argv[0] = original_argv0


if __name__ == "__main__":
    main()
