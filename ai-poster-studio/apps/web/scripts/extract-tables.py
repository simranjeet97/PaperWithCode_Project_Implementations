#!/usr/bin/env python3
"""Extract tables from a PDF using pdfplumber.

Usage: python3 extract-tables.py <pdf-path>
Output: JSON array of {caption, page, headers, rows, raw_text}
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pdfplumber


def extract(pdf_path: str) -> list[dict]:
    out: list[dict] = []
    path = Path(pdf_path)
    if not path.exists():
        return out
    with pdfplumber.open(path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            # Find table captions
            caption_regex = __import__("re").compile(
                r"Table\s+(\d+)[:\.\s]+([^\n]{4,120})", __import__("re").IGNORECASE
            )
            captions = []
            for m in caption_regex.finditer(text):
                captions.append((m.start(), m.group(1), m.group(2).strip()))

            # Find tables
            try:
                tables = page.extract_tables() or []
            except Exception:
                tables = []
            for t_idx, table in enumerate(tables):
                if not table or not table[0]:
                    continue
                # Clean cells
                cleaned = [
                    [(c or "").strip().replace("\n", " ") for c in row]
                    for row in table
                ]
                headers = cleaned[0]
                rows = [r for r in cleaned[1:] if any(c for c in r)]
                if not rows:
                    continue
                # If rows are single strings (pdfplumber's "line-wrapped" output),
                # split by whitespace. Also do the same for headers.
                def maybe_split(cells: list[str]) -> list[str]:
                    if len(cells) == 1 and " " in cells[0]:
                        return cells[0].split()
                    return cells
                headers = maybe_split(headers)
                rows = [maybe_split(r) for r in rows]
                if not rows:
                    continue
                # Try to match caption by page-text position
                caption = f"Table {t_idx + 1} (page {page_idx})"
                table_num = None
                for start_pos, num, cap in captions:
                    if abs(start_pos) < 5000:  # arbitrary window
                        caption = f"Table {num}: {cap}"
                        table_num = num
                        break
                out.append(
                    {
                        "caption": caption,
                        "page": page_idx,
                        "table_number": table_num,
                        "headers": headers,
                        "rows": rows[:10],  # cap to 10 rows for poster
                        "column_count": len(headers),
                    }
                )
    # Filter: keep only tables with at least 2 columns AND at least 2 rows
    # AND a non-empty header
    out = [
        t
        for t in out
        if t["column_count"] >= 2
        and len(t["rows"]) >= 2
        and any(h.strip() for h in t["headers"])
        and not all(not r or all(not c.strip() for c in r) for r in t["rows"])
    ]
    return out


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: extract-tables.py <pdf-path>", file=sys.stderr)
        sys.exit(1)
    tables = extract(sys.argv[1])
    print(json.dumps(tables, ensure_ascii=False))


if __name__ == "__main__":
    main()
