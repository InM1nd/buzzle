"""Turn `expo export -p web` output into the Telegram Mini App / mobile web build.

python3 scripts/telegram/postprocess.py DIST
- loads telegram-web-app.js before the bundle (window.Telegram.WebApp exists at startup)
- mobile viewport (no zoom, viewport-fit=cover), no overscroll / pull-to-refresh, no text selection,
  touch-action: none on the puzzle board so drags never scroll or close the webview
- Nunito web fonts (relative URLs, so any base path works)
- an HTML boot screen with Жужа that the app removes once the save is loaded
- .nojekyll (GitHub Pages would otherwise drop the `_expo/` folder)
"""
import os, re, shutil, sys
from PIL import Image

D = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BG = "#FFF6E3"

os.makedirs(f"{D}/fonts", exist_ok=True)
for w in ("Bold", "ExtraBold", "Black"):
    shutil.copy(f"{ROOT}/assets/fonts/Nunito-{w}.ttf", f"{D}/fonts/")
shutil.copy(f"{ROOT}/assets/fonts/LICENSE.txt", f"{D}/fonts/")
im = Image.open(f"{ROOT}/assets/splash-icon.png").convert("RGBA")
bb = im.getbbox()
im = im.crop(bb)
im.thumbnail((360, 360), Image.LANCZOS)
im.save(f"{D}/boot.webp", quality=88, method=6)
bw, bh = im.size
open(f"{D}/.nojekyll", "w").close()

head = f'''
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="{BG}" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="description" content="Buzzle — уютный улей и медовая головоломка" />
    <script src="https://telegram.org/js/telegram-web-app.js?59"></script>
    <link rel="preload" href="fonts/Nunito-ExtraBold.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="preload" href="fonts/Nunito-Black.ttf" as="font" type="font/ttf" crossorigin />
    <style id="bzz-web">
      @font-face{{font-family:"Nunito";font-weight:700;font-display:swap;src:url(fonts/Nunito-Bold.ttf) format("truetype")}}
      @font-face{{font-family:"Nunito";font-weight:800;font-display:swap;src:url(fonts/Nunito-ExtraBold.ttf) format("truetype")}}
      @font-face{{font-family:"Nunito";font-weight:900;font-display:swap;src:url(fonts/Nunito-Black.ttf) format("truetype")}}
      html,body{{background:{BG};overscroll-behavior:none;-webkit-text-size-adjust:100%}}
      body{{position:fixed;inset:0;margin:0}}
      *{{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-user-drag:none;-webkit-touch-callout:none}}
      img{{-webkit-user-drag:none;pointer-events:none}}
      [aria-label="Игровое поле"]{{touch-action:none}}
      #bzz-boot{{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:{BG};transition:opacity .3s ease;font-family:Nunito,system-ui,sans-serif}}
      #bzz-boot img{{width:{bw // 2}px;height:{bh // 2}px;animation:bzz-hover 1.6s ease-in-out infinite}}
      #bzz-boot .bar{{margin-top:22px;width:120px;height:8px;border-radius:4px;background:#F3DDB2;overflow:hidden}}
      #bzz-boot .bar i{{display:block;height:100%;width:40%;border-radius:4px;background:#F2A516;animation:bzz-load 1.1s ease-in-out infinite}}
      #bzz-boot p{{margin:12px 0 0;color:#A07A4C;font-weight:800;font-size:15px}}
      @keyframes bzz-hover{{0%,100%{{transform:translateY(0) rotate(-2deg)}}50%{{transform:translateY(-8px) rotate(2deg)}}}}
      @keyframes bzz-load{{0%{{transform:translateX(-100%)}}100%{{transform:translateX(250%)}}}}
    </style>'''
boot = f'''
    <div id="bzz-boot"><img src="boot.webp" alt="" /><div class="bar"><i></i></div><p>Пчёлы просыпаются…</p></div>'''

p = f"{D}/index.html"
t = open(p, encoding="utf-8").read()
if "bzz-web" not in t:
    t = t.replace('<html lang="en">', '<html lang="ru">', 1)
    t = re.sub(r'\s*<meta name="viewport"[^>]*>', "", t, count=1)
    t = t.replace('<meta httpEquiv="X-UA-Compatible" content="IE=edge" />', '<meta http-equiv="X-UA-Compatible" content="IE=edge" />')
    t = t.replace("</head>", head + "\n  </head>", 1)
    t = t.replace('<div id="root"></div>', '<div id="root"></div>' + boot, 1)
    open(p, "w", encoding="utf-8").write(t)
print("postprocess ok:", D)
