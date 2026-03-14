#!/usr/bin/env python3
"""
Scherbius Analytics — Portfolio-Update Upload Tool

Lädt eine PDF-Datei in den Supabase Storage Bucket "portfolio-updates" hoch.
Das Datum wird automatisch aus dem Dateinamen oder dem aktuellen Datum ermittelt.

Verwendung:
    python3 tools/upload_portfolio_update.py pfad/zur/datei.pdf
    python3 tools/upload_portfolio_update.py pfad/zur/datei.pdf --datum 2026-03-14

Das Dokument erscheint sofort im Dashboard aller aktiven Abonnenten.
"""

import os
import sys
import argparse
import mimetypes
from datetime import date
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL          = os.environ["SUPABASE_URL"] if "SUPABASE_URL" in os.environ else f"https://{os.environ['SUPABASE_PROJECT_REF']}.supabase.co"
SUPABASE_SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET                = "portfolio-updates"


def upload(local_path: Path, target_name: str) -> str:
    """Lädt die Datei hoch und gibt die Storage-URL zurück."""
    import urllib.request

    with open(local_path, "rb") as f:
        data = f.read()

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{target_name}"
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/pdf",
            "x-upsert": "true",          # Überschreiben falls Datei schon existiert
        },
        method="POST",
    )

    import ssl, certifi
    ctx = ssl.create_default_context(cafile=certifi.where())

    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        print(f"Fehler {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def list_uploads() -> list:
    """Listet alle hochgeladenen Dateien im Bucket."""
    import urllib.request, json, ssl, certifi

    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    req = urllib.request.Request(
        url,
        data=json.dumps({"prefix": "", "limit": 100, "sortBy": {"column": "created_at", "order": "desc"}}).encode(),
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    ctx = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


def main():
    parser = argparse.ArgumentParser(description="Portfolio-Update PDF hochladen")
    parser.add_argument("pdf", nargs="?", help="Pfad zur PDF-Datei")
    parser.add_argument("--datum", help="Datum im Format YYYY-MM-DD (Standard: heute)")
    parser.add_argument("--liste", action="store_true", help="Alle hochgeladenen Dateien anzeigen")
    args = parser.parse_args()

    if args.liste:
        files = list_uploads()
        if not files:
            print("Noch keine Dateien im Bucket.")
            return
        print(f"\n{'Dateiname':<45} {'Größe':>10}  Datum")
        print("─" * 75)
        for f in files:
            size_kb = round(f.get("metadata", {}).get("size", 0) / 1024, 1)
            created = f.get("created_at", "")[:10]
            print(f"{f['name']:<45} {size_kb:>8} KB  {created}")
        print()
        return

    if not args.pdf:
        parser.print_help()
        sys.exit(1)

    local_path = Path(args.pdf)
    if not local_path.exists():
        print(f"Datei nicht gefunden: {local_path}", file=sys.stderr)
        sys.exit(1)

    if local_path.suffix.lower() != ".pdf":
        print("Nur PDF-Dateien werden unterstützt.", file=sys.stderr)
        sys.exit(1)

    datum = args.datum or date.today().isoformat()
    # Zieldateiname: YYYY-MM-DD_Portfolio-Update.pdf
    target_name = f"{datum}_Portfolio-Update.pdf"

    print(f"Lade hoch: {local_path.name} → {target_name}")
    result = upload(local_path, target_name)
    print(f"Erfolgreich hochgeladen: {target_name}")
    print(f"Erscheint sofort im Dashboard aller aktiven Abonnenten.")


if __name__ == "__main__":
    main()
