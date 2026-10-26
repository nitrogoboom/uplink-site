"""Puts the Barlow letters a hand-made SVG uses inside it (see svgfont.py). Safe to run again after editing.
usage: python tools/embed_font.py site/assets/img/office.svg [more.svg ...]
The gen_*.py drawings do this themselves."""
import re, sys
from svgfont import font_style

for path in sys.argv[1:]:
    text = open(path, encoding='utf-8').read()
    text = re.sub(r'<style>@font-face.*?</style>\n?', '', text, flags=re.S)
    style = font_style(text)
    if style:
        text = re.sub(r'(<svg[^>]*>\n?(?:<title>.*?</title>\n?)?)', lambda m: m.group(1) + style + '\n', text, count=1, flags=re.S)
    open(path, 'w', encoding='utf-8', newline='').write(text)
    print(path, 'font added' if style else 'no text')
