#!/usr/bin/env python3
"""Linux/macOS entry point for the original pdf2docx layout engine."""

import sys
import os
import re
import tempfile
from zipfile import ZipFile

from lxml import etree
from pdf2docx import Converter

WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": WORD}


def keep_page_number_on_page(output_path: str) -> None:
    """Avoid a standalone final page caused by pdf2docx's footer spacing."""
    with ZipFile(output_path) as source:
        document = etree.fromstring(source.read("word/document.xml"))
        paragraphs = document.xpath("./w:body/w:p", namespaces=NS)
        if not paragraphs:
            return
        last = paragraphs[-1]
        number = "".join(last.xpath(".//w:t/text()", namespaces=NS)).strip()
        align = last.find(f"{{{WORD}}}pPr/{{{WORD}}}jc")
        spacing = last.find(f"{{{WORD}}}pPr/{{{WORD}}}spacing")
        before = f"{{{WORD}}}before"
        if (not re.fullmatch(r"\d{1,4}", number) or align is None or
                align.get(f"{{{WORD}}}val") != "right" or spacing is None or
                int(spacing.get(before, "0")) <= 1800):
            return
        spacing.set(before, "1800")
        fd, temporary = tempfile.mkstemp(suffix=".docx", dir=os.path.dirname(output_path))
        os.close(fd)
        try:
            with ZipFile(temporary, "w") as target:
                for entry in source.infolist():
                    data = (etree.tostring(document, encoding="UTF-8", xml_declaration=True,
                                          standalone=True) if entry.filename == "word/document.xml"
                            else source.read(entry.filename))
                    target.writestr(entry, data)
            os.replace(temporary, output_path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def main() -> int:
    if len(sys.argv) != 4 or sys.argv[1] != "convert":
        return 2
    converter = Converter(sys.argv[2])
    try:
        converter.convert(sys.argv[3], parse_stream_table=False)
    finally:
        converter.close()
    keep_page_number_on_page(sys.argv[3])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
