import os
import shutil
from pathlib import Path
# Sync Whisper Deck between repo and external directory set by WHISPER_DECK_DIR
# - Copies inputs from external dir to repo Whisper_Deck (if newer)
# - Copies outputs from repo to external dir (decoded json)
REPO_DECK = Path("Whisper_Deck")
EXT_DECK = Path(os.environ.get("WHISPER_DECK_DIR", ""))
FILES_IN = [
    "Context_MasterInjection.base64",
    "Context_MasterInjection.png",
]
FILES_OUT = [
    "Context_MasterInjection.decoded.json",
]
def ensure_repo_deck():
    REPO_DECK.mkdir(parents=True, exist_ok=True)
def newer(src: Path, dst: Path) -> bool:
    if not src.exists():
        return False
    if not dst.exists():
        return True
    return src.stat().st_mtime > dst.stat().st_mtime
def sync_inputs():
    if not EXT_DECK:
        return
    for name in FILES_IN:
        src = EXT_DECK / name
        dst = REPO_DECK / name
        if newer(src, dst):
            ensure_repo_deck()
            shutil.copy2(src, dst)
            print(f"[+] Copied input -> repo: {src} -> {dst}")
def sync_outputs():
    if not EXT_DECK:
        return
    for name in FILES_OUT:
        src = REPO_DECK / name
        dst = EXT_DECK / name
        if newer(src, dst):
            EXT_DECK.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            print(f"[+] Copied output -> external: {src} -> {dst}")
def main():
    if not EXT_DECK:
        print("[!] WHISPER_DECK_DIR not set; skipping external sync.")
        return
    print(f"[+] Repo deck: {REPO_DECK.resolve()}")
    print(f"[+] External deck: {EXT_DECK}")
    sync_inputs()
    sync_outputs()
    print("[+] Sync complete.")
if __name__ == "__main__":
    main()
