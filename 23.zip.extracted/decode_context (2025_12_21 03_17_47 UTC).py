import base64
import gzip
import json
import os
from typing import Tuple

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except Exception:
    _PIL_AVAILABLE = False

# Allow overriding deck directory via environment variable
_DECK_DIR = os.environ.get("WHISPER_DECK_DIR", "Whisper_Deck")

INPUT_BASE64 = os.path.join(_DECK_DIR, "Context_MasterInjection.base64")
INPUT_PNG = os.path.join(_DECK_DIR, "Context_MasterInjection.png")
OUTPUT_JSON = os.path.join(_DECK_DIR, "Context_MasterInjection.decoded.json")


def parse_header(payload: str) -> Tuple[str, str]:
    idx = payload.find(":")
    if idx == -1:
        raise ValueError("Missing header prefix '<HEADER>:<payload>'")
    return payload[:idx], payload[idx+1:]


def decode_envelope(header: str, body: str) -> str:
    if header == "B64+JSON":
        raw = base64.b64decode(body)
        return raw.decode("utf-8")
    if header == "B64+GZIP+JSON":
        comp = base64.b64decode(body)
        raw = gzip.decompress(comp)
        return raw.decode("utf-8")
    if header == "B85+GZIP+JSON":
        comp = base64.a85decode(body, adobe=False)
        raw = gzip.decompress(comp)
        return raw.decode("utf-8")
    raise ValueError(f"Unsupported header: {header}")


def decode_from_base64_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        payload = f.read().strip()
    header, body = parse_header(payload)
    return decode_envelope(header, body)


def decode_from_png_text(path: str) -> Tuple[str, str]:
    if not _PIL_AVAILABLE:
        raise RuntimeError("Pillow not installed; cannot decode PNG.")
    img = Image.open(path)
    # Prefer 'injection' then 'context'
    inj = img.text.get("injection") # pyright: ignore[reportAttributeAccessIssue]
    ctx = img.text.get("context")
    if inj:
        # envelope mode
        header, body = parse_header(inj)
        return decode_envelope(header, body), "injection"
    if ctx:
        # raw JSON mode
        return ctx, "context"
    raise ValueError("No text payload found in PNG ('injection' or 'context').")


def main():
    json_text = None
    source = None

    if os.path.exists(INPUT_BASE64):
        json_text = decode_from_base64_file(INPUT_BASE64)
        source = INPUT_BASE64
    elif os.path.exists(INPUT_PNG):
        json_text, which = decode_from_png_text(INPUT_PNG)
        source = f"{INPUT_PNG} [{which} chunk]"
    else:
        raise FileNotFoundError(
            f"No input found. Expected base64 or png under '{_DECK_DIR}'. "
            "Set WHISPER_DECK_DIR to override.")

    # Validate JSON
    _ = json.loads(json_text)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        f.write(json_text)

    print("[+] Decoded JSON written:")
    print(f" - {OUTPUT_JSON}")
    print("[+] Source:")
    print(f" - {source}")


if __name__ == "__main__":
    main()
