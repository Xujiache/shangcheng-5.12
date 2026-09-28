#!/usr/bin/env python3
"""Extract the exact Python 3.12 docengine entry code from the locked Windows EXE."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import zlib

EXE_SHA256 = "c79c5fb2f797a04e7d2794ef84a88caac0ec6e8f8348efe310fc127549cd518c"
CORE_SHA256 = "d4f13034e719760790d75569b2dd9696facb88b15b8322f28d2aa4c3dbe6a835"
ENTRY_SHA256 = "36404137ad6657f41e10558f7b72de907d845c851c5e9be76e926853d4e99037"
ENTRY_OFFSET = 373655
ENTRY_COMPRESSED_BYTES = 7000
ENTRY_BYTES = 12975
PYZ_SHA256 = "6f75f22d34ca0cc910ac6bfaf17dcbc639d41a864e816980aa918ddf0b433504"
PYTHON312_MAGIC = bytes.fromhex("cb0d0d0a")
MODULE_COUNTS = {"pdf2docx": 55, "camelot": 20}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract(exe: Path) -> bytes:
    packed = exe.read_bytes()
    if sha256(packed) != EXE_SHA256:
        raise ValueError("docengine.exe SHA-256 differs from the locked ci-engines-v1 core")
    compressed = packed[ENTRY_OFFSET:ENTRY_OFFSET + ENTRY_COMPRESSED_BYTES]
    entry = zlib.decompress(compressed)
    if len(entry) != ENTRY_BYTES or sha256(entry) != ENTRY_SHA256:
        raise ValueError("docengine Python entry differs from the locked code object")
    return entry


def restore_modules(exe: Path, destination: Path, manifest_path: Path) -> None:
    # PyInstaller is needed only in the build stage. Runtime imports these .pyc files.
    from PyInstaller.archive.readers import CArchiveReader, ZlibArchiveReader

    pyz_bytes = CArchiveReader(str(exe)).extract("PYZ.pyz")
    if sha256(pyz_bytes) != PYZ_SHA256 or pyz_bytes[:8] != b"PYZ\0" + PYTHON312_MAGIC:
        raise ValueError("docengine PYZ archive SHA-256 or Python 3.12 magic mismatch")
    with tempfile.NamedTemporaryFile(suffix=".pyz") as temporary:
        temporary.write(pyz_bytes)
        temporary.flush()
        archive = ZlibArchiveReader(temporary.name)
        records = []
        counts = {prefix: 0 for prefix in MODULE_COUNTS}
        root = destination.resolve()
        for name, (kind, _, _) in sorted(archive.toc.items()):
            prefix = next((item for item in MODULE_COUNTS
                           if name == item or name.startswith(item + ".")), None)
            if prefix is None:
                continue
            if kind not in (0, 1) or not re.fullmatch(r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*", name):
                raise ValueError(f"Unsafe or non-code PYZ module: {name}")
            relative = Path(*name.split("."))
            relative = relative / "__init__.pyc" if kind == 1 else relative.with_suffix(".pyc")
            output = (root / relative).resolve()
            if not output.is_relative_to(root):
                raise ValueError(f"PYZ module escaped destination: {name}")
            code = archive.extract(name, raw=True)
            if not code:
                raise ValueError(f"Missing original bytecode: {name}")
            pyc = PYTHON312_MAGIC + bytes(12) + code
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(pyc)
            records.append({"module": name, "path": relative.as_posix(), "codeSha256": sha256(code),
                            "pycSha256": sha256(pyc)})
            counts[prefix] += 1
        if counts != MODULE_COUNTS:
            raise ValueError(f"Original module inventory changed: {counts}")
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps({"exeSha256": EXE_SHA256, "pyzSha256": PYZ_SHA256,
                                             "pythonMagic": PYTHON312_MAGIC.hex(),
                                             "counts": counts, "modules": records}, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe", type=Path, required=True)
    parser.add_argument("--core-archive", type=Path,
                        help="Also verify the enclosing ci-engines-v1 core archive")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--modules-dir", type=Path,
                        help="Extract original pdf2docx and Camelot Python modules as Python 3.12 .pyc")
    parser.add_argument("--manifest", type=Path, help="SHA-256 inventory for extracted modules")
    args = parser.parse_args()
    if args.core_archive and sha256(args.core_archive.read_bytes()) != CORE_SHA256:
        raise ValueError("ci-engines-v1 core archive SHA-256 mismatch")
    entry = extract(args.exe)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(args.output.name + ".tmp")
    temporary.write_bytes(entry)
    os.replace(temporary, args.output)
    if bool(args.modules_dir) != bool(args.manifest):
        raise ValueError("--modules-dir and --manifest must be provided together")
    if args.modules_dir:
        restore_modules(args.exe, args.modules_dir, args.manifest)
    print(f"{args.output}: {ENTRY_SHA256}")


if __name__ == "__main__":
    main()
