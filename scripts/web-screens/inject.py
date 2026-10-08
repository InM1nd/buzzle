# Inject web fonts + harness CSS into the exported index.html (screenshots only).
p = 'dist/index.html'
t = open(p).read()
css = '''<style>
@font-face{font-family:"Nunito";font-weight:700;src:url(/fonts/Nunito-Bold.ttf)}
@font-face{font-family:"Nunito";font-weight:800;src:url(/fonts/Nunito-ExtraBold.ttf)}
@font-face{font-family:"Nunito";font-weight:900;src:url(/fonts/Nunito-Black.ttf)}
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-user-drag:none} img{-webkit-user-drag:none;pointer-events:none}
</style>'''
if 'Nunito-Bold' not in t:
    t = t.replace('</head>', css + '</head>', 1)
open(p, 'w').write(t)
