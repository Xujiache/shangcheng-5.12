#!/usr/bin/env python3
"""Verify locked extraction and the entry's original conversion steps."""

import importlib.util
import json
import marshal
import os
from pathlib import Path
import tempfile
import types
import unittest

MODULE_PATH = Path(__file__).with_name("restore-original-docengine.py")
spec = importlib.util.spec_from_file_location("restore_original_docengine", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OriginalDocengineTest(unittest.TestCase):
    def test_locked_entry_contains_original_steps(self):
        exe = os.environ.get("ORIGINAL_DOCENGINE_EXE")
        if not exe:
            self.skipTest("Set ORIGINAL_DOCENGINE_EXE to the locked core executable")
        entry = module.extract(Path(exe))
        code = marshal.loads(entry)
        self.assertIsInstance(code, types.CodeType)
        functions = {value.co_name: value for value in code.co_consts
                     if isinstance(value, types.CodeType)}
        self.assertTrue({"_preprocess_formulas", "_strip_headers_footers",
                         "cmd_convert", "cmd_table", "main"} <= functions.keys())
        self.assertIn("_preprocess_formulas", functions["cmd_convert"].co_names)
        self.assertIn("_strip_headers_footers", functions["cmd_convert"].co_names)
        self.assertIn("Converter", functions["cmd_convert"].co_names)

    def test_wrong_executable_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            module.extract(MODULE_PATH)

    def test_all_original_algorithm_modules_are_hash_locked(self):
        exe = os.environ.get("ORIGINAL_DOCENGINE_EXE")
        if not exe:
            self.skipTest("Set ORIGINAL_DOCENGINE_EXE to the locked core executable")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest_path = root / "manifest.json"
            module.restore_modules(Path(exe), root / "modules", manifest_path)
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["counts"], {"pdf2docx": 55, "camelot": 20})
            self.assertEqual(len(manifest["modules"]), 75)
            for item in manifest["modules"]:
                pyc = (root / "modules" / item["path"]).read_bytes()
                self.assertEqual(pyc[:4], module.PYTHON312_MAGIC)
                self.assertEqual(module.sha256(pyc), item["pycSha256"])


if __name__ == "__main__":
    unittest.main()
