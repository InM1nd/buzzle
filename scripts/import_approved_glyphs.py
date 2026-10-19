"""Import the selected v2/v4 glyph sets. Run from the repository root.

Sources: design/art/glyph-contrast-options-v{2,4}/{normal,halloween}/*.png.
Older themes and their sprites are not changed.
"""
from pathlib import Path
from PIL import Image


def main():
    out = Path("assets/art/tiles")
    out.mkdir(parents=True, exist_ok=True)
    for version, style in [(2, "balanced"), (4, "mellow")]:
        for folder, prefix in [("normal", style), ("halloween", "h" + style)]:
            source = Path(f"design/art/glyph-contrast-options-v{version}") / folder
            for key in ["cell0", "cell1", "cell2", "cell3", "cell4", "cell_wild", "bomb", "cell_pumpkin"]:
                im = Image.open(source / (key + ".png")).convert("RGBA")
                if key == "bomb":
                    # Same scale as existing bomb512 importer; retain the alpha padding.
                    assert im.size == (512, 512)
                    n = round(512 * (208 * 0.8 / 368))
                    im = im.resize((n, n), Image.Resampling.LANCZOS)
                    sprite = Image.new("RGBA", (240, 208))
                    sprite.alpha_composite(im, ((240 - n) // 2, (208 - n) // 2 - 2))
                else:
                    assert im.size == (720, 624)
                    sprite = im.crop((8, 7, 712, 617)).resize((240, 208), Image.Resampling.LANCZOS)
                sprite.save(out / f"{prefix}_{key}.webp", "WEBP", quality=94, method=6)
    print("Imported32 approved glyph sprites")


if __name__ == "__main__":
    main()
