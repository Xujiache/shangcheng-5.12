#!/usr/bin/env python3
"""Candidate Linux replacement for docengine's `table PDF JSON` command.

Only digital PDF pages with ruled tables are attempted. The caller's existing
per-page quality gate decides whether to keep each result or use its fallback.
"""

import json
import math
import os
import sys
import tempfile
from pathlib import Path

import camelot
import pypdfium2


def extract_tables(pdf_path: Path) -> list[dict]:
    document = pypdfium2.PdfDocument(str(pdf_path))
    try:
        page_count = len(document)
    finally:
        document.close()

    results = []
    for page_number in range(1, page_count + 1):
        try:
            tables = camelot.read_pdf(
                str(pdf_path), pages=str(page_number), flavor="lattice"
            )
        except Exception as error:
            print(f"Camelot page {page_number}: {error}", file=sys.stderr)
            continue
        for table in tables:
            accuracy = float(table.parsing_report.get("accuracy", 0))
            results.append(
                {
                    "page": page_number,
                    "flavor": "lattice",
                    "accuracy": accuracy if math.isfinite(accuracy) else 0,
                    "cells": table.df.fillna("").astype(str).values.tolist(),
                }
            )
    return results


def main() -> int:
    if len(sys.argv) != 4 or sys.argv[1] != "table":
        print("Usage: camelot_table_engine.py table INPUT.pdf OUTPUT.json", file=sys.stderr)
        return 64
    input_path, output_path = Path(sys.argv[2]), Path(sys.argv[3])
    if not input_path.is_file() or not output_path.parent.is_dir():
        return 66
    tables = extract_tables(input_path)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=output_path.parent, delete=False
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump({"tables": tables}, temporary, ensure_ascii=False, allow_nan=False)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, output_path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
