"""Generate the KK Desk wordmark and Windows icons (requires Pillow)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONT = Path("C:/Windows/Fonts/arialbd.ttf")
NAVY = (15, 23, 48, 255)
ORANGE = (255, 155, 65, 255)
WHITE = (255, 255, 255, 255)


def icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    margin = round(size * 0.025)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=round(size * 0.23),
        fill=NAVY,
    )
    # Keep the initials readable and give the launch arrow its own space on the right.
    font = ImageFont.truetype(str(FONT), round(size * 0.40))
    draw.text((size * 0.37, size * 0.51), "kk", font=font, fill=WHITE, anchor="mm")

    scale = lambda x, y: (round(size * x), round(size * y))
    shaft = round(size * 0.085)
    draw.line([scale(0.58, 0.72), scale(0.79, 0.35)], fill=ORANGE, width=shaft, joint="curve")
    draw.ellipse((size * 0.58 - shaft / 2, size * 0.72 - shaft / 2,
                  size * 0.58 + shaft / 2, size * 0.72 + shaft / 2), fill=ORANGE)
    draw.polygon([scale(0.63, 0.34), scale(0.86, 0.27), scale(0.85, 0.53)], fill=ORANGE)
    return image


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    large_icon = icon(1024)
    icon_sizes = [16, 24, 32, 48, 64, 128, 256]
    large_icon.save(PUBLIC / "logo.ico", sizes=[(n, n) for n in icon_sizes])
    large_icon.save(PUBLIC / "tray.ico", sizes=[(n, n) for n in [16, 24, 32, 48]])

    wordmark = Image.new("RGBA", (960, 300))
    draw = ImageDraw.Draw(wordmark)
    draw.rounded_rectangle((0, 0, 959, 299), radius=70, fill=NAVY)
    emblem = icon(228)
    wordmark.alpha_composite(emblem, (36, 36))
    font_size = 136
    while True:
        font = ImageFont.truetype(str(FONT), font_size)
        if draw.textlength("Desk", font=font) <= 650:
            break
        font_size -= 1
    draw.text((278, 149), "Desk", font=font, fill=WHITE, anchor="lm")
    wordmark.save(PUBLIC / "logo-transparent.png", optimize=True)


if __name__ == "__main__":
    main()
