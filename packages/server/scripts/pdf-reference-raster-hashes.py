#!/usr/bin/env python3
"""Hash source PDF page pixels using the original docstructure 2x raster rule."""
import hashlib
import json
import sys

import fitz


document = fitz.open(sys.argv[1])
pages = []
for page in document:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pages.append({"width": pixmap.width, "height": pixmap.height,
                  "pixelSha256": hashlib.sha256(pixmap.samples).hexdigest()})
print(json.dumps(pages))
