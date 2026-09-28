#!/bin/sh
# Fail the image build when a native engine or its shared libraries cannot load.
set -eu

"$FLYINGMOUSE_FFMPEG_PATH" -version
/opt/ffmpeg-8.1.1/bin/ffprobe -version
"$FLYINGMOUSE_PDFTOPPM_PATH" -v
"$FLYINGMOUSE_LIBREOFFICE_PATH" --version
"$FLYINGMOUSE_QPDF_PATH" --version
"$FLYINGMOUSE_PANDOC_PATH" --version
# The locked original docengine prints usage and returns 1 for an unknown command.
docengine_status=0
docengine_usage=$("$FLYINGMOUSE_DOCENGINE_PATH" --help 2>&1) || docengine_status=$?
printf '%s\n' "$docengine_usage"
test "$docengine_status" -eq 1
test "$docengine_usage" = 'usage: docengine convert <pdf> <docx> | docengine table <pdf> <json> [pages]'
test -x "$FLYINGMOUSE_DOCSTRUCTURE_ENGINE_PATH"
PYTHONPATH="$FLYINGMOUSE_SOURCE_DIR/tools/docstructure-engine" \
  PYTHONDONTWRITEBYTECODE=1 PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
  "$FLYINGMOUSE_DOCSTRUCTURE_PYTHON" -c \
  'import paddle, paddleocr, cv2, fitz; from flyingmouse_docstructure import __version__; from flyingmouse_docstructure.__main__ import main; print("docstructure", __version__, "paddle", paddle.__version__)'
/opt/pdf2docx-venv/bin/pip check
/opt/docstructure-venv/bin/pip check
python3 /usr/local/libexec/verify-docstructure-models.py \
  "$FLYINGMOUSE_SOURCE_DIR/docstructure-engine-lock.json" "$FLYINGMOUSE_DOCSTRUCTURE_MODEL_DIR"
