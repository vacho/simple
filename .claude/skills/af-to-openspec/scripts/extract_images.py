#!/usr/bin/env python3
"""Move the images embedded in a Markdown file (base64 data: URIs) into files, and drop the
noise that document exports leave behind. Standard library only.

    python3 -I extract_images.py <input.md> <output.md> <images-dir>

- Images in both forms are extracted: inline ![alt](data:image/png;base64,...) and
  reference-style ![alt][image7] with a definition [image7]: <data:image/png;base64,...>
  (the Google Docs export). Each file is named after the section where the image is first
  used: 4.7-1.png, 4.7-2.png... (or 0-1.png before the first numbered heading). Links are
  written relative to <output.md>.
- Heading anchors {#...} are removed, and headings with no text are dropped.
- Nothing else changes: the text is kept word for word.

It never overwrites: it refuses an existing <output.md> or a non-empty <images-dir>.
It prints one line per image (file, section, size) and a summary.
"""
import base64
import os
import re
import sys

DATA_URI = r"data:image/(?P<ext>[a-zA-Z0-9.+-]+);base64,(?P<data>[A-Za-z0-9+/=\s]+)"
INLINE = re.compile(r"!\[(?P<alt>[^\]]*)\]\(\s*<?" + DATA_URI + r">?\s*\)")
REF_USE = re.compile(r"!\[(?P<alt>[^\]]*)\]\[(?P<ref>[^\]]+)\]")
REF_DEF = re.compile(r"^\[(?P<ref>[^\]]+)\]:\s*<?" + DATA_URI + r">?\s*$")
# Also "1. # Title": a heading inside a numbered list, as some exports write it.
HEADING = re.compile(r"^(?:\d+\.\s+)?(?P<hashes>#{1,6})\s*(?P<text>.*?)\s*$")
ANCHOR = re.compile(r"\s*\{#[^}]*\}")
NUMBER = re.compile(r"(\d+(?:\.\d+)*)")
EXTENSIONS = {"jpeg": "jpg", "svg+xml": "svg"}


def heading_text(text: str) -> str:
    """The visible text of a heading, without anchors, emphasis or escapes."""
    text = ANCHOR.sub("", text)
    text = re.sub(r"[*_`\\]", "", text)
    text = re.sub(r"!\[[^\]]*\]\[[^\]]*\]|!\[[^\]]*\]\([^)]*\)", "", text)
    return text.strip()


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__.strip().splitlines()[3].strip(), file=sys.stderr)
        return 2
    src, out, images = sys.argv[1:]
    if os.path.exists(out):
        print(f"{out} already exists; choose a new output file.", file=sys.stderr)
        return 1
    if os.path.isdir(images) and os.listdir(images):
        print(f"{images} is not empty; choose a new images folder.", file=sys.stderr)
        return 1

    with open(src, encoding="utf-8") as f:
        lines = f.read().split("\n")

    # Reference definitions: collected, then removed from the text.
    definitions, body = {}, []
    for line in lines:
        match = REF_DEF.match(line)
        if match:
            definitions[match["ref"]] = (match["ext"], match["data"])
        else:
            body.append(line)

    os.makedirs(images, exist_ok=True)
    link_base = os.path.relpath(images, os.path.dirname(os.path.abspath(out)) or ".")
    section, counters, written, ref_files = "0", {}, [], {}

    def save(ext: str, data: str) -> str:
        counters[section] = counters.get(section, 0) + 1
        ext = EXTENSIONS.get(ext.lower(), ext.lower())
        name = f"{section}-{counters[section]}.{ext}"
        raw = base64.b64decode(re.sub(r"\s", "", data))
        with open(os.path.join(images, name), "wb") as f:
            f.write(raw)
        written.append((name, section, len(raw)))
        return f"{link_base}/{name}".replace(os.sep, "/")

    def inline(match: re.Match) -> str:
        return f"![{match['alt']}]({save(match['ext'], match['data'])})"

    def reference(match: re.Match) -> str:
        ref = match["ref"]
        if ref not in definitions:
            return match[0]  # not an embedded image: leave it alone
        if ref not in ref_files:
            ref_files[ref] = save(*definitions[ref])
        return f"![{match['alt']}]({ref_files[ref]})"

    result, dropped = [], 0
    for line in body:
        heading = HEADING.match(line)
        if heading:
            text = heading_text(heading["text"])
            if not text:
                # An empty heading may still carry an image: keep the image as a paragraph.
                rest = REF_USE.sub(reference, INLINE.sub(inline, heading["text"])).strip()
                if "](" in rest:
                    result.append(ANCHOR.sub("", rest))
                else:
                    dropped += 1
                continue
            number = NUMBER.match(text)
            if number:
                section = number[1]
            line = ANCHOR.sub("", line)
        line = REF_USE.sub(reference, INLINE.sub(inline, line))
        result.append(line)

    unused = sorted(set(definitions) - set(ref_files))
    for ref in unused:  # defined but never shown: keep the file, say so
        section_before, section = section, "unused"
        ref_files[ref] = save(*definitions[ref])
        section = section_before

    text = re.sub(r"\n{3,}", "\n\n", "\n".join(result)).strip() + "\n"
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)

    for name, where, size in written:
        print(f"{name}\tsection {where}\t{size // 1024} KB")
    print(
        f"{len(written)} images written to {images}; {dropped} empty headings dropped; "
        f"{len(unused)} unused definitions; {os.path.getsize(src) // 1024} KB -> "
        f"{os.path.getsize(out) // 1024} KB"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
