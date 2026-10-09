"""v1.2 UI icons in the flat style of make_art.py (white masks, tinted in the app): watering can, seed, garden tab segment."""
import math
from PIL import Image, ImageDraw
SS = 4
def canvas(n=128):
    S = n * SS; return Image.new("RGBA", (S, S), (0, 0, 0, 0)), S
def done(im, n=96): return im.resize((n, n), Image.LANCZOS)
W = (255, 255, 255, 255)

def can():
    im, S = canvas(); d = ImageDraw.Draw(im)
    d.rounded_rectangle([S * 0.2, S * 0.38, S * 0.66, S * 0.86], radius=S * 0.1, fill=W)          # body
    d.arc([S * 0.3, S * 0.16, S * 0.62, S * 0.52], 180, 360, fill=W, width=int(S * 0.07))          # handle
    d.polygon([(S * 0.62, S * 0.56), (S * 0.9, S * 0.3), (S * 0.95, S * 0.36), (S * 0.66, S * 0.7)], fill=W)  # spout
    d.ellipse([S * 0.84, S * 0.2, S * 0.98, S * 0.36], fill=W)
    for x, y in ((0.86, 0.5), (0.93, 0.6), (0.8, 0.62)):                                           # drops
        d.ellipse([S * (x - 0.025), S * (y - 0.035), S * (x + 0.025), S * (y + 0.035)], fill=W)
    return done(im)

def seed():
    im, S = canvas(); d = ImageDraw.Draw(im)
    d.polygon([(S * 0.5, S * 0.16), (S * 0.72, S * 0.48), (S * 0.66, S * 0.74), (S * 0.5, S * 0.84), (S * 0.34, S * 0.74), (S * 0.28, S * 0.48)], fill=W)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).line([(S * 0.5, S * 0.3), (S * 0.5, S * 0.72)], fill=255, width=int(S * 0.05))
    im.putalpha(Image.fromarray(__import__("numpy").clip(__import__("numpy").array(im.getchannel("A"), dtype=int) - __import__("numpy").array(m, dtype=int), 0, 255).astype("uint8")))
    return done(im)

def shovel():
    im, S = canvas(); d = ImageDraw.Draw(im)
    d.line([(S * 0.28, S * 0.2), (S * 0.56, S * 0.52)], fill=W, width=int(S * 0.08))
    d.rounded_rectangle([S * 0.16, S * 0.1, S * 0.4, S * 0.22], radius=S * 0.05, fill=W)
    d.polygon([(S * 0.5, S * 0.46), (S * 0.66, S * 0.36), (S * 0.92, S * 0.66), (S * 0.86, S * 0.86), (S * 0.66, S * 0.9), (S * 0.4, S * 0.6)], fill=W)
    return done(im)

can().save("assets/art/can.png", optimize=True)
seed().save("assets/art/seed.png", optimize=True)
shovel().save("assets/art/shovel.png", optimize=True)
print("v1.2 icons ok")
