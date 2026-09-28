#!/usr/bin/env python3
"""Exercise the Linux docengine margin repair against real PDF conversions."""

import html
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import fitz


ROOT = Path(os.environ.get("FLYINGMOUSE_TEST_ROOT", Path(__file__).resolve().parents[1]))
RUNNER = Path(os.environ.get("FLYINGMOUSE_TEST_DOCENGINE_RUNNER",
                             ROOT / "packages/server/scripts/run-original-docengine.py"))
NATIVE = ROOT / "packages/server/test/fixtures/platform-parity/native-table.pdf"
SOURCE = Path(os.environ.get("FLYINGMOUSE_SOURCE_DIR", ROOT / "vendor/flyingmouse-format/upstream-a7b9b15"))
BASELINE = (
    "import importlib.util,sys; "
    "spec=importlib.util.spec_from_file_location('docengine_runner',sys.argv[1]); "
    "module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); "
    "module.keep_visible_content_inside_margins=lambda:None; "
    "sys.argv=sys.argv[1:]; module.main()"
)
TEXT = (
    "量窗助手转换验收：这是第一段中文正文，包含门窗订单、客户资料和成本记录。"
    "请保留文字顺序、标点与数字 12345。\n\n第二段记录经营分析：本月营收 67890 元，"
    "订单数量 37，平均利润 245 元。转换后必须能够正常编辑这些完整内容。\n\n"
    "第三段再次检查长句和中文字符：铝合金门窗、玻璃、五金配件与安装工序均应完整保留。\n"
)


def convert(engine, source, output):
    subprocess.run([*engine, "convert", str(source), str(output)], check=True,
                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def convert_baseline(source, output):
    convert([sys.executable, "-c", BASELINE, str(RUNNER)], source, output)


def document(path):
    with ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
        text = "".join(html.unescape(value) for value in
                       re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", xml.decode()))
        media = [name for name in archive.namelist() if name.startswith("word/media/")]
    return xml, "".join(text.split()), media


def main():
    with TemporaryDirectory(prefix="docengine-margin-test-") as directory:
        work = Path(directory)
        source_text = work / "source.txt"
        long_pdf = work / "long-line.pdf"
        source_text.write_text(TEXT)
        subprocess.run(["node", str(SOURCE / "cli.js"), "convert", str(source_text),
                        "--to", "pdf", "--output", str(long_pdf), "--json"],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        with fitz.open(long_pdf) as pdf:
            assert len(pdf) == 1
            source = "".join(pdf[0].get_text().split())
            edge_chars = [char for block in pdf[0].get_text("rawdict")["blocks"]
                          for line in block.get("lines", []) for span in line["spans"]
                          for char in span["chars"] if char["c"] in ("数", "这")
                          and char["bbox"][2] > pdf[0].rect.width - 65]
            assert len(edge_chars) == 2, "fixture did not exercise two right-edge Chinese glyphs"
        repaired = work / "long-line.docx"
        baseline = work / "long-line-baseline.docx"
        convert_baseline(long_pdf, baseline)
        convert([sys.executable, str(RUNNER)], long_pdf, repaired)
        _, baseline_text, _ = document(baseline)
        _, output, _ = document(repaired)
        assert baseline_text != source and "数字" not in baseline_text and "这些" not in baseline_text
        assert source == output and "数字" in output and "这些" in output

        for label, pdf in (("native", NATIVE), ("blank", work / "blank.pdf")):
            if label == "blank":
                with fitz.open() as empty:
                    empty.new_page(width=595, height=842)
                    empty.save(pdf)
            original_docx = work / f"{label}-original.docx"
            repaired_docx = work / f"{label}-repaired.docx"
            convert_baseline(pdf, original_docx)
            convert([sys.executable, str(RUNNER)], pdf, repaired_docx)
            old_xml, old_text, old_media = document(original_docx)
            new_xml, new_text, new_media = document(repaired_docx)
            assert old_xml == new_xml and old_text == new_text and old_media == new_media
            if label == "native":
                assert old_xml.count(b"<w:tbl>") == 1 and len(old_media) == 1
    print("PASS docengine margin: long-line glyphs retained; native table/image and blank page unchanged")


if __name__ == "__main__":
    main()
