import base64
import json
import os
import gzip
from typing import Dict
# Paths (adjust if needed)
TEMP_DIR = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Temp")
SOURCE_FILENAME = "t2csmjpi..py"
SOURCE_PATH = os.path.join(TEMP_DIR, SOURCE_FILENAME)
OUTPUT_DIR = os.path.join("Whisper_Deck")
MASTER_OUTPUT = os.path.join(OUTPUT_DIR, "Context_MasterInjection.base64")
# Default placeholders to demonstrate replacement; extend as needed
DEFAULT_PLACEHOLDERS: Dict[str, str] = {
    "${USER_NAME}": "Charles Kendrick",
    "${USER_LOCATION}": "Maricopa, AZ",
}
# Toggle gzip before Base64 (smaller payload when JSON is large)
ENABLE_GZIP = True
def ensure_output_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
def read_source_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
def extract_json_text(raw: str) -> str:
    """
    The source file is a .py containing JSON text plus trailing comments.
    We attempt to slice from the first '{' to the last '}' for a robust extract.
    """
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Unable to locate JSON object braces in source text.")
    return raw[start : end + 1]
def validate_json(json_text: str) -> Dict:
    return json.loads(json_text)
def to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")
def write_text(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
def apply_placeholders(text: str, mapping: Dict[str, str]) -> str:
    for key, value in mapping.items():
        text = text.replace(key, value)
    return text
def condense_base64(b64: str) -> str:
    """
    Minimal condensation: remove whitespace/newlines. Base64 is already dense,
    but some generators add line breaks; we standardize to a single line.
    """
    return "".join(b64.split())
def compress_if_enabled(data: bytes) -> bytes:
    if not ENABLE_GZIP:
        return data
    return gzip.compress(data)
def build_master_payload(json_text: str) -> str:
    # 1) Placeholder substitution
    substituted = apply_placeholders(json_text, DEFAULT_PLACEHOLDERS)
    # 2) Optional compression
    payload_bytes = compress_if_enabled(substituted.encode("utf-8"))
    # 3) Base64 encode
    b64 = to_base64(payload_bytes)
    # 4) Condense
    return condense_base64(b64)
def main():
    ensure_output_dir()
    raw = read_source_text(SOURCE_PATH)
    json_text = extract_json_text(raw)
    # Validate JSON early (raises if invalid)
    _ = validate_json(json_text)
    master = build_master_payload(json_text)
    write_text(MASTER_OUTPUT, master)
    print("[+] Master injection written:")
    print(f" - {MASTER_OUTPUT}")
if __name__ == "__main__":
    main()
