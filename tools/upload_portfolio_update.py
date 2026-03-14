#!/usr/bin/env python3
"""
Scherbius Analytics — Portfolio-Update Upload Tool

Lädt PDFs aus dem lokalen pdfs/ Ordner in Supabase Storage hoch.
Das Datum wird automatisch aus dem Dateinamen extrahiert (DD.MM.YYYY oder YYYY-MM-DD).

Verwendung:
    python3 tools/upload_portfolio_update.py              # alle neuen PDFs aus pdfs/
    python3 tools/upload_portfolio_update.py pdfs/x.pdf  # einzelne Datei
    python3 tools/upload_portfolio_update.py --liste      # Bucket-Inhalt anzeigen

Zielname in Supabase: YYYY-MM-DD_Portfolio-Update-NR.pdf
Im Dashboard sofort sichtbar, im Archiv nach 5 Handelstagen.
"""

import os
import sys
import re
import argparse
import json
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL         = os.environ["SUPABASE_URL"] if "SUPABASE_URL" in os.environ else f"https://{os.environ['SUPABASE_PROJECT_REF']}.supabase.co"
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET               = "portfolio-updates"
PDFS_DIR             = Path(__file__).parent.parent / "pdfs"


def extract_date_from_filename(filename: str) -> str | None:
    """
    Extrahiert das Datum aus typischen Dateinamen.
    Unterstützt: '02.03.2026', '2026-03-02', '20260302'
    Gibt ISO-String zurück: '2026-03-02' oder None.
    """
    # DD.MM.YYYY
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', filename)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

    # YYYY-MM-DD
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # YYYYMMDD
    m = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # "11. März 2026" etc. (deutsches Langformat)
    months = {
        'januar': '01', 'februar': '02', 'märz': '03', 'april': '04',
        'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
    }
    m = re.search(r'(\d{1,2})\.\s*([A-Za-zä]+)\s+(\d{4})', filename, re.IGNORECASE)
    if m:
        mon = months.get(m.group(2).lower())
        if mon:
            return f"{m.group(3)}-{mon}-{m.group(1).zfill(2)}"

    return None


def extract_number_from_filename(filename: str) -> str | None:
    """Extrahiert die Update-Nummer (#56 → '56')."""
    m = re.search(r'#\s*(\d+)', filename)
    return m.group(1) if m else None


def make_target_name(local_path: Path) -> str:
    """Baut den Supabase-Zieldateinamen aus Datum + Nummer."""
    stem = local_path.stem
    datum = extract_date_from_filename(stem) or date.today().isoformat()
    nummer = extract_number_from_filename(stem)
    if nummer:
        return f"{datum}_Portfolio-Update-{nummer}.pdf"
    return f"{datum}_Portfolio-Update.pdf"


def upload(local_path: Path, target_name: str) -> None:
    import urllib.request, ssl, certifi

    with open(local_path, "rb") as f:
        data = f.read()

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{target_name}"
    req = urllib.request.Request(
        url, data=data,
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/pdf",
            "x-upsert": "true",
        },
        method="POST",
    )
    ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        print(f"  ✗ Fehler {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def list_uploads() -> list:
    import urllib.request, ssl, certifi

    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    req = urllib.request.Request(
        url,
        data=json.dumps({"prefix": "", "limit": 200, "sortBy": {"column": "created_at", "order": "desc"}}).encode(),
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    ctx = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


def get_uploaded_names() -> set:
    try:
        return {f["name"] for f in list_uploads()}
    except Exception:
        return set()


def upload_single(local_path: Path) -> None:
    if not local_path.exists():
        print(f"Datei nicht gefunden: {local_path}", file=sys.stderr)
        sys.exit(1)
    if local_path.suffix.lower() != ".pdf":
        print("Nur PDF-Dateien.", file=sys.stderr)
        sys.exit(1)

    target_name = make_target_name(local_path)
    print(f"  Lade hoch: {local_path.name}")
    print(f"          → {target_name}")
    upload(local_path, target_name)
    print(f"  ✓ Fertig")


def upload_all_new() -> None:
    if not PDFS_DIR.exists():
        print(f"pdfs/ Ordner nicht gefunden: {PDFS_DIR}", file=sys.stderr)
        sys.exit(1)

    local_pdfs = sorted(PDFS_DIR.glob("*.pdf"))
    if not local_pdfs:
        print("Keine PDFs im pdfs/ Ordner.")
        return

    print(f"Prüfe Bucket ({len(local_pdfs)} lokale PDF(s))...")
    already = get_uploaded_names()

    # Prüfung: lokale Datei → würde zu welchem Zieldateinamen werden?
    new_pdfs = [p for p in local_pdfs if make_target_name(p) not in already]

    if not new_pdfs:
        print(f"Alle {len(local_pdfs)} PDF(s) bereits hochgeladen.")
        return

    print(f"\n{len(new_pdfs)} neue PDF(s):\n")
    for pdf in new_pdfs:
        upload_single(pdf)
        print()

    print(f"{len(new_pdfs)} Datei(en) hochgeladen.")
    print("Dashboard: sofort sichtbar | Archiv: nach 5 Handelstagen")


def main():
    parser = argparse.ArgumentParser(description="Portfolio-Update hochladen")
    parser.add_argument("pdf", nargs="?", help="Einzelne PDF (Standard: alle aus pdfs/)")
    parser.add_argument("--liste", action="store_true", help="Bucket-Inhalt anzeigen")
    args = parser.parse_args()

    if args.liste:
        files = list_uploads()
        if not files:
            print("Bucket ist leer.")
            return
        print(f"\n{'Dateiname':<55} {'KB':>8}  Datum")
        print("─" * 75)
        for f in files:
            size_kb = round(f.get("metadata", {}).get("size", 0) / 1024, 1)
            created = f.get("created_at", "")[:10]
            print(f"{f['name']:<55} {size_kb:>6} KB  {created}")
        print()
        return

    if args.pdf:
        upload_single(Path(args.pdf))
    else:
        upload_all_new()


if __name__ == "__main__":
    main()
