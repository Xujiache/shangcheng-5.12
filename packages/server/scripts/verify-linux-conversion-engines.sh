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
"$FLYINGMOUSE_DOCSTRUCTURE_ENGINE_PATH" --help
/opt/pdf2docx-venv/bin/pip check
/opt/docstructure-venv/bin/pip check
python3 /usr/local/libexec/verify-docstructure-models.py \
  "$FLYINGMOUSE_SOURCE_DIR/docstructure-engine-lock.json" "$FLYINGMOUSE_DOCSTRUCTURE_MODEL_DIR"
