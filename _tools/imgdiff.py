"""Compare two screenshots. usage: imgdiff.py a.png b.png [x0 y0 x1 y1]
Prints the mean per-channel change (b - a) and the share of pixels that differ by more than 8 levels."""
import sys
from PIL import Image, ImageChops, ImageStat

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size:
    print(f'size differs: {a.size} vs {b.size}')
    sys.exit(0)
if len(sys.argv) >= 7:
    box = tuple(int(v) for v in sys.argv[3:7])
    a, b = a.crop(box), b.crop(box)
ma, mb = ImageStat.Stat(a).mean, ImageStat.Stat(b).mean
diff = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 8 else 0)
share = ImageStat.Stat(diff).mean[0] / 255 * 100
print('mean change R %+.2f G %+.2f B %+.2f | pixels differing by more than 8 levels: %.3f%%' % (mb[0] - ma[0], mb[1] - ma[1], mb[2] - ma[2], share))
