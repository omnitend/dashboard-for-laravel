#!/usr/bin/env python3
"""Subset the bundled Poppins woff2 files to Latin, and check a subset's coverage.

Poppins ships Devanagari as well as Latin; the theme only sets English/UK
headings and product names in it, so the bundled files keep Latin and the
punctuation, currency and number symbols those need. Poppins is SIL OFL 1.1
with no Reserved Font Name, so a subset may keep the name. Maven Pro DOES have
a Reserved Font Name: never subset or otherwise modify its files.

Build (needs fontTools and the Python `brotli` module for woff2 output):

    python3 scripts/subset-poppins.py build ~/Library/Fonts/Poppins-Medium.ttf \
        ~/Library/Fonts/Poppins-SemiBold.ttf

Check only (exit 1 on any missing character, Devanagari present, or a lost
licence record):

    python3 scripts/subset-poppins.py check resources/fonts/poppins/*.woff2
"""

import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "resources", "fonts", "poppins")

# Ranges kept. A codepoint the font lacks is simply skipped by the subsetter.
# Poppins has no arrows (U+2190–U+21FF) or check marks (U+2714); the ranges
# stay listed so a future Poppins release that adds them keeps them.
KEPT_UNICODES = ",".join(
    [
        "U+0000-00FF",  # Basic Latin + Latin-1 Supplement (incl. £ · é ñ ö)
        "U+0100-017F",  # Latin Extended-A
        "U+018F,U+0192,U+01FC-01FD,U+0218-021B,U+0259",  # schwa, ƒ, Ǽ, ș ț
        "U+02BC,U+02C6-02DD",  # modifier apostrophe, spacing accents
        "U+03C0",  # π (a maths symbol in Poppins' set)
        "U+1E00-1EFF",  # Latin Extended Additional (Welsh ẁ ẃ ẅ ỳ)
        "U+2000-206F",  # General Punctuation: – — ‘ ’ “ ” … • ‹ ›
        "U+20A0-20CF",  # Currency Symbols (€ and others)
        "U+2100-214F",  # Letterlike: ™ ℓ Ω ℮
        "U+2190-21FF",  # Arrows (none in Poppins today)
        "U+2200-22FF",  # Mathematical Operators: − ≤ ≥ ≠ ∞
        "U+25CA",  # lozenge
        "U+2713-2714",  # check marks (none in Poppins today)
        "U+FB01-FB02",  # fi / fl ligature codepoints
    ]
)

# Every character a heading or product name needs in English/UK use.
REQUIRED_CHARACTERS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "£€&'’‘\"“”–—…·•%/()"
    "éèàçñöüä"
)
DEVANAGARI = range(0x0900, 0x0980)
LICENCE_NAME_IDS = (0, 13, 14)  # copyright, licence description, licence URL


def check(path):
    """Return a list of problems with the font at `path` (empty means it passes)."""
    font = TTFont(path)
    cmap = font.getBestCmap()
    problems = []
    missing = [character for character in REQUIRED_CHARACTERS if ord(character) not in cmap]
    if missing:
        problems.append("missing " + " ".join(f"{c} (U+{ord(c):04X})" for c in missing))
    devanagari = [codepoint for codepoint in DEVANAGARI if codepoint in cmap]
    if devanagari:
        problems.append(f"{len(devanagari)} Devanagari codepoints still present")
    name_ids = {record.nameID for record in font["name"].names}
    lost = [name_id for name_id in LICENCE_NAME_IDS if name_id not in name_ids]
    if lost:
        problems.append(f"name records lost: {lost}")
    print(
        f"{os.path.basename(path)}: {os.path.getsize(path)} bytes, "
        f"{len(font.getGlyphOrder())} glyphs, {len(cmap)} codepoints, "
        f"{len(REQUIRED_CHARACTERS) - len(missing)}/{len(REQUIRED_CHARACTERS)} required"
        + ("" if problems else ", OK")
    )
    for problem in problems:
        print(f"  FAIL: {problem}")
    return problems


def build(source_path):
    stem = os.path.splitext(os.path.basename(source_path))[0]
    output_path = os.path.normpath(os.path.join(OUTPUT_DIR, f"{stem}.woff2"))
    subset.main(
        [
            source_path,
            f"--unicodes={KEPT_UNICODES}",
            "--layout-features=*",  # kerning, ligatures, stylistic sets
            "--name-IDs=*",  # keep every name record, licence included
            "--name-legacy",
            "--name-languages=*",
            "--notdef-outline",
            "--flavor=woff2",
            f"--output-file={output_path}",
        ]
    )
    return output_path


def main(arguments):
    if len(arguments) < 2 or arguments[0] not in ("build", "check"):
        print(__doc__)
        return 2
    mode, paths = arguments[0], arguments[1:]
    if mode == "build":
        paths = [build(os.path.expanduser(path)) for path in paths]
    failures = sum(1 for path in paths if check(path))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
