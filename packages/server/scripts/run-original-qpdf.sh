#!/bin/sh
set -eu
export LD_LIBRARY_PATH="/opt/qpdf-12.4.0/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec /opt/qpdf-12.4.0/bin/qpdf "$@"
