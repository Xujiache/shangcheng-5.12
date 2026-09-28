#!/usr/bin/env python3
"""Linux/macOS entry point for the original pdf2docx layout engine."""

import sys

from pdf2docx import Converter


def main() -> int:
    if len(sys.argv) != 4 or sys.argv[1] != "convert":
        return 2
    converter = Converter(sys.argv[2])
    try:
        converter.convert(sys.argv[3], parse_stream_table=False)
    finally:
        converter.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
