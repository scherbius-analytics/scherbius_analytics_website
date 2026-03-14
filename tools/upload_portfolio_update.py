#!/usr/bin/env python3
"""
Scherbius Analytics — Portfolio-Update Upload Tool

Lädt eine PDF-Datei aus dem lokalen pdfs/ Ordner in den Supabase Storage Bucket
"portfolio-updates" hoch. Ohne Pfadangabe werden ALLE noch nicht hochgeladenen
PDFs aus dem pdfs/ Ordner verarbeitet.

Verwendung:
    python3 tools/upload_portfolio_update.py                        # alle neuen PDFs aus pdfs/
    python3 tools/upload_portfolio_update.py pdfs/datei.pdf         # einzelne Datei
    python3 tools/upload_portfolio_update.py --datum 2026-03-14     # mit Datum
    python3 tools/upload_portfolio_update.py --liste                 # Bucket-Inhalt anzeigen

Namenskonvention: YYYY-MM-DD_Portfolio-Update.pdf
Das Dokument erscheint sofort im Dashboard aller aktiven Abonnenten.
Im öffentlichen Archiv wird es nach 5 Handelstagen sichtbar.
"""

import os
import sys
import argparse
import json
from datetime import date
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL         = os.environ["SUPABASE_URL"] if "SUPABASE_URL" in os.environ else f"https://{os.environ['SUPABASE_PROJECT_REF']}.supabase.co"
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET               = "portfolio-updates"

# Pfad zum pdfs/ Ordner relativ zum Projektroot (tools/ liegt eine Ebene tiefer)
PDFS_DIR = Path(__file__).parent.parent / "pdfs"


def upload(local_path: Path, target_name: str) -> str:
    """Lädt die Datei hoch und gibt die Storage-URL zurück."""
    import urllib.request, ssl, certifi

    with open(local_path, "rb") as f:
        data = f.read()

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{target_name}"
    req = urllib.request.Request(
        url,
        data=data,
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
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        print(f"Fehler {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def list_uploads() -> list:
    """Listet alle hochgeladenen Dateien im Bucket."""
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
    """Gibt die Dateinamen aller bereits hochgeladenen Dateien zurück."""
    try:
        files = list_uploads()
        return {f["name"] for f in files}
    except Exception:
        return set()


def upload_single(local_path: Path, datum: str | None) -> None:
    """Verarbeitet eine einzelne PDF-Datei."""
    if not local_path.exists():
        print(f"Datei nicht gefunden: {local_path}", file=sys.stderr)
        sys.exit(1)

    if local_path.suffix.lower() != ".pdf":
        print("Nur PDF-Dateien werden unterstützt.", file=sys.stderr)
        sys.exit(1)

    target_datum = datum or date.today().isoformat()
    target_name = f"{target_datum}_Portfolio-Update.pdf"

    print(f"  Lade hoch: {local_path.name} → {target_name}")
    upload(local_path, target_name)
    print(f"  ✓ {target_name} — sofort im Dashboard, im Archiv nach 5 Handelstagen.")


def upload_all_new() -> None:
    """Lädt alle PDFs aus dem pdfs/ Ordner hoch, die noch nicht im Bucket sind."""
    if not PDFS_DIR.exists():
        print(f"pdfs/ Ordner nicht gefunden: {PDFS_DIR}", file=sys.stderr)
        sys.exit(1)

    local_pdfs = sorted(PDFS_DIR.glob("*.pdf"))
    if not local_pdfs:
        print("Keine PDF-Dateien im pdfs/ Ordner gefunden.")
        return

    print("Prüfe Bucket-Inhalt...")
    already_uploaded = get_uploaded_names()

    new_pdfs = [p for p in local_pdfs if p.name not in already_uploaded]

    if not new_pdfs:
        print(f"Alle {len(local_pdfs)} PDF(s) bereits hochgeladen. Nichts zu tun.")
        return

    print(f"\n{len(new_pdfs)} neue PDF(s) gefunden:\n")
    for pdf in new_pdfs:
        upload_single(pdf, datum=None)

    print(f"\n{len(new_pdfs)} Datei(en) erfolgreich hochgeladen.")


def main():
    parser = argparse.ArgumentParser(description="Portfolio-Update PDF hochladen")
    parser.add_argument("pdf", nargs="?", help="Pfad zur PDF-Datei (Standard: alle neuen aus pdfs/)")
    parser.add_argument("--datum", help="Datum im Format YYYY-MM-DD (nur bei einzelner Datei)")
    parser.add_argument("--liste", action="store_true", help="Alle hochgeladenen Dateien im Bucket anzeigen")
    args = parser.parse_args()

    if args.liste:
        files = list_uploads()
        if not files:
            print("Noch keine Dateien im Bucket.")
            return
        print(f"\n{'Dateiname':<45} {'Größe':>10}  Hochgeladen")
        print("─" * 75)
        for f in files:
            size_kb = round(f.get("metadata", {}).get("size", 0) / 1024, 1)
            created = f.get("created_at", "")[:10]
            print(f"{f['name']:<45} {size_kb:>8} KB  {created}")
        print()
        return

    if args.pdf:
        upload_single(Path(args.pdf), args.datum)
    else:
        upload_all_new()


if __name__ == "__main__":
    main()
