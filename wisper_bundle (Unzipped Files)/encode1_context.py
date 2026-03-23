import base64
import json
import os
import gzip
from typing import Dict, Tuple, Callable
# Optional image embedding (PNG text chunks). Guarded import.
try:
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo
    _PIL_AVAILABLE = True
except Exception:
    _PIL_AVAILABLE = False
from io import BytesIO
# Paths (adjust if needed)
TEMP_DIR = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Temp")
SOURCE_FILENAME = "t2csmjpi..py"
FALLBACK_SOURCE_FILENAME = "tmpDFF8.tmp.py"
SOURCE_PATH = os.path.join(TEMP_DIR, SOURCE_FILENAME)
FALLBACK_SOURCE_PATH = os.path.join(TEMP_DIR, FALLBACK_SOURCE_FILENAME)
# Repo-local fallback (current working directory)
REPO_SOURCE_PATH = os.path.join(os.getcwd(), "tmpDFF8.tmp.py")
# Allow override via environment variable
ENV_SOURCE_PATH = os.environ.get("CONTEXT_SOURCE_PATH")
OUTPUT_DIR = os.path.join("Whisper_Deck")
MASTER_OUTPUT = os.path.join(OUTPUT_DIR, "Context_MasterInjection.base64")
PNG_OUTPUT = os.path.join(OUTPUT_DIR, "Context_MasterInjection.png")
# Default placeholders to demonstrate replacement; extend as needed
DEFAULT_PLACEHOLDERS: Dict[str, str] = {
    "${USER_NAME}": "Charles Kendrick",
    "${USER_LOCATION}": "Maricopa, AZ",
}
# Toggle gzip before Base64 (smaller payload when JSON is large)
ENABLE_GZIP = True
# Choose smallest envelope automatically among strategies
AUTO_SELECT_SMALLEST = True
# Image payload selection: 'auto' | 'json' | 'envelope'
IMAGE_EMBED_MODE = "auto"
def ensure_output_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
def resolve_source_path() -> str:
    # Env override first
    if ENV_SOURCE_PATH and os.path.exists(ENV_SOURCE_PATH):
        return ENV_SOURCE_PATH
    # Repo-local file next
    if os.path.exists(REPO_SOURCE_PATH):
        return REPO_SOURCE_PATH
    # Preferred source in Temp
    if os.path.exists(SOURCE_PATH):
        return SOURCE_PATH
    # Fallback temp file seen in context
    if os.path.exists(FALLBACK_SOURCE_PATH):
        return FALLBACK_SOURCE_PATH
    raise FileNotFoundError(
        (
            "No source file found. Checked: "
            f"{REPO_SOURCE_PATH}, {SOURCE_PATH} and {FALLBACK_SOURCE_PATH}. "
            "Set CONTEXT_SOURCE_PATH to an existing file path to override."
        )
    )
def read_source_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
def extract_json_text(raw: str, src_path: str) -> str:
    """
    Extract the root JSON object from a mixed file by matching braces.
    Handles strings and escapes to avoid counting braces inside strings.
    """
    start = raw.find("{")
    if start == -1:
        preview = raw[:200].replace("\n", " ")
        raise ValueError(
            f"Unable to locate opening brace in source text from '{src_path}'. "
            f"First 200 chars: '{preview}'"
        )
    depth = 0
    in_string = False
    escape = False
    end = None
    for i in range(start, len(raw)):
        ch = raw[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
    if end is None:
        preview = raw[start:start+200].replace("\n", " ")
        raise ValueError(
            f"Failed to match closing brace for root JSON in '{src_path}'. "
            f"Around start: '{preview}'"
        )
    return raw[start:end+1]
def validate_json(json_text: str) -> Dict:
    return json.loads(json_text)
def to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")
def to_base85(data: bytes) -> str:
    # Ascii85 has ~25% overhead vs 33% for Base64, may be smaller payload
    return base64.a85encode(data, adobe=False).decode("ascii")
def write_text(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
def apply_placeholders(text: str, mapping: Dict[str, str]) -> str:
    for key, value in mapping.items():
        text = text.replace(key, value)
    return text
def condense_string(s: str) -> str:
    return "".join(s.split())
def compress_gzip(data: bytes) -> bytes:
    return gzip.compress(data)
def build_envelopes(json_text: str) -> Dict[str, str]:
    """
    Build multiple envelope variants and return mapping of header->payload string.
    Headers describe decoding steps for downstream tools.
    """
    variants: Dict[str, str] = {}
    raw = json_text.encode("utf-8")
    gz = compress_gzip(raw)
    # Strategy 1: B64+JSON
    b64_json = to_base64(raw)
    variants["B64+JSON"] = f"B64+JSON:{condense_string(b64_json)}"
    # Strategy 2: B64+GZIP+JSON
    b64_gzip_json = to_base64(gz)
    variants["B64+GZIP+JSON"] = f"B64+GZIP+JSON:{condense_string(b64_gzip_json)}"
    # Strategy 3: B85+GZIP+JSON (Ascii85)
    try:
        b85_gzip_json = to_base85(gz)
        variants["B85+GZIP+JSON"] = f"B85+GZIP+JSON:{condense_string(b85_gzip_json)}"
    except Exception:
        pass
    return variants
def select_smallest(envelopes: Dict[str, str]) -> Tuple[str, str]:
    """Return (header, envelope_string) for the smallest total length."""
    smallest_key = min(envelopes.keys(), key=lambda k: len(envelopes[k]))
    return smallest_key, envelopes[smallest_key]
def build_master_payload(json_text: str) -> Tuple[str, str]:
    # 1) Placeholder substitution
    substituted = apply_placeholders(json_text, DEFAULT_PLACEHOLDERS)
    # 2) Build candidate envelopes
    envelopes = build_envelopes(substituted)
    # 3) Respect ENABLE_GZIP if explicitly disabled (filter non-gzip if desired)
    if not ENABLE_GZIP:
        # keep non-gzip candidates only
        envelopes = {k: v for k, v in envelopes.items() if "+GZIP" not in k}
        if not envelopes:
            # fallback to B64+JSON
            raw_b64 = to_base64(substituted.encode("utf-8"))
            envelopes["B64+JSON"] = f"B64+JSON:{condense_string(raw_b64)}"
    # 4) Auto-select smallest or default to B64+GZIP+JSON
    if AUTO_SELECT_SMALLEST and envelopes:
        key, env = select_smallest(envelopes)
        return key, env
    else:
        # default preference
        env = envelopes.get("B64+GZIP+JSON") or envelopes.get("B64+JSON") or next(iter(envelopes.values()))
        key = next(k for k, v in envelopes.items() if v == env)
        return key, env
def png_bytes_with_text(key: str, text: str) -> bytes:
    if not _PIL_AVAILABLE:
        return b""
    img = Image.new("RGB", (1, 1), color=(0, 0, 0))
    meta = PngInfo()
    # zip=True uses zlib deflate, reducing PNG size
    meta.add_text(key, text, zip=True)
    buf = BytesIO()
    img.save(buf, format="PNG", pnginfo=meta)
    return buf.getvalue()
def write_png_auto(json_text: str, envelope_text: str) -> None:
    if not _PIL_AVAILABLE:
        print("[!] Pillow not installed; skipping PNG embedding.")
        return
    choice_key = "injection"
    payload_text = envelope_text
    if IMAGE_EMBED_MODE == "json":
        payload_text = json_text
        choice_key = "context"
    elif IMAGE_EMBED_MODE == "envelope":
        payload_text = envelope_text
        choice_key = "injection"
    else:  # auto
        # Compare sizes by rendering both variants to memory
        png_env = png_bytes_with_text("injection", envelope_text)
        png_json = png_bytes_with_text("context", json_text)
        if png_json and png_env and len(png_json) < len(png_env):
            payload_text = json_text
            choice_key = "context"
        else:
            payload_text = envelope_text
            choice_key = "injection"
    data = png_bytes_with_text(choice_key, payload_text)
    if data:
        with open(PNG_OUTPUT, "wb") as f:
            f.write(data)
        print(f"[+] PNG written: {PNG_OUTPUT} ({len(data)} bytes)")
def extract_json_text_with_fallback(primary_raw: str, primary_path: str) -> Tuple[str, str]:
    """Try extracting from primary; if it fails, attempt fallback source automatically."""
    try:
        return extract_json_text(primary_raw, primary_path), primary_path
    except ValueError:
        # Try fallback path if available
        if os.path.exists(FALLBACK_SOURCE_PATH):
            fb_raw = read_source_text(FALLBACK_SOURCE_PATH)
            try:
                return extract_json_text(fb_raw, FALLBACK_SOURCE_PATH), FALLBACK_SOURCE_PATH
            except ValueError as e2:
                # bubble up second error
                raise e2
        # If env override exists but wasn't chosen (e.g., missing), try it
        if ENV_SOURCE_PATH and os.path.exists(ENV_SOURCE_PATH):
            env_raw = read_source_text(ENV_SOURCE_PATH)
            return extract_json_text(env_raw, ENV_SOURCE_PATH), ENV_SOURCE_PATH
        # No viable fallback
        raise
def main():
    ensure_output_dir()
    src_path = resolve_source_path()
    raw = read_source_text(src_path)
    json_text, used_path = extract_json_text_with_fallback(raw, src_path)
    # Validate JSON early (raises if invalid)
    _ = validate_json(json_text)
    header, master = build_master_payload(json_text)
    write_text(MASTER_OUTPUT, master)
    print("[+] Source:")
    print(f" - {used_path}")
    print("[+] Master injection written:")
    print(f" - {MASTER_OUTPUT} [{header}, {len(master)} chars]")
    # Also create a tiny PNG embedding either the envelope (default) or raw JSON
    write_png_auto(json_text, master)
if __name__ == "__main__":
    main()
