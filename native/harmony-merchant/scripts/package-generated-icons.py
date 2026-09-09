"""Package generated artwork only: key matte, crop, resize. Never draw icon shapes."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest_path = root / 'scripts/generated-ui-icons.sources.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
dest = root / 'entry/src/main/resources/base/media'
if 'launcher' in manifest:
    item = manifest['launcher']
    source = Path(item['source'])
    output = root / 'AppScope/resources/base/media/app_icon.png'
    Image.open(source).convert('RGBA').resize((512,512), Image.Resampling.LANCZOS).save(output, optimize=True)
    item['asset'] = str(output.relative_to(root)).replace('\\','/')
    item['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    item['sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
for item in manifest['icons']:
    source = Path(item['source'])
    rgb = np.asarray(Image.open(source).convert('RGB')).astype(float)
    maximum = np.maximum(rgb[:,:,0], rgb[:,:,2])
    green = rgb[:,:,1]
    # The generated backgrounds are chroma green, not actual transparency.
    key = np.clip((green - maximum - 12) / 65, 0, 1)
    alpha = 1 - key
    rgb[:,:,1] = np.minimum(green, maximum + 12)
    rgba = np.dstack((rgb, alpha * 255)).astype('uint8')
    im = Image.fromarray(rgba, 'RGBA')
    bounds = im.getchannel('A').point(lambda a: 255 if a > 30 else 0).getbbox()
    if not bounds: raise ValueError('Empty generated icon: ' + item['name'])
    im = im.crop(bounds)
    im.thumbnail((224,224), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA',(256,256))
    canvas.alpha_composite(im, ((256-im.width)//2,(256-im.height)//2))
    output = dest / ('ui_' + item['name'] + '.png')
    canvas.save(output, optimize=True)
    item['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    item['asset'] = str(output.relative_to(root)).replace('\\','/')
    item['sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Packaged',len(manifest['icons']),'generated icons')
