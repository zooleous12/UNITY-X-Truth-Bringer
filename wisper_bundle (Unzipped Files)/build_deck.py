import json
import os
from pathlib import Path

# Create the folder (repo-local deck)
folder_name = os.environ.get("WHISPER_DECK_DIR", "Whisper_Deck")
folder = Path(folder_name)
if not folder.exists():
    folder.mkdir(parents=True, exist_ok=True)

# --- Define the Cards (Using the "Soft Context" Protocols) ---
cards = {
    "Card_1_Core.json": {
        "METADATA_TYPE": "Context_Core_Identity",
        "User_ID": "Cybersecurity Student (AZ/MS)",
        "Communication_Preferences": {
            "Pace": "Thoughtful (Allow pause for user)",
            "Style": "High-density, bulleted, no fluff",
            "Tone": "Professional but approachable"
        },
        "Interaction_Guidance": "Assume advanced technical/academic research context (Cybersecurity)."
    },
    "Card_2_Tech_Ops.json": {
        "METADATA_TYPE": "Context_Active_Projects",
        "Vehicles": [
            {"Model": "2007 BMW X3", "Focus": "Maintenance, Sensors (M54/N52)"},
            {"Model": "2003 Dodge Grand Caravan", "Focus": "Reliability, Towing"}
        ],
        "Cybersecurity_Topics": [
            "Windows 11 ICACLS/Permissions",
            "Android FRP Bypass",
            "SQL Syntax (Research)"
        ],
        "Vintage_Hardware": ["Audio (Sony/Optimus)", "Doll Valuation"]
    },
    "Card_3_Environment.json": {
        "METADATA_TYPE": "Context_Logistics",
        "Home_Base": "Maricopa, AZ 85138",
        "Cultural_Origin": "Mississippi (affects phrasing/pace)",
        "Key_Waypoints": ["Junction City, KS", "Pratt, KS"],
        "Priorities": [
            "Affordable Hotels",
            "Fuel-Efficient Routes",
            "DIY-Friendly Repair Shops"
        ]
    },
    "Card_4_Financial.json": {
        "METADATA_TYPE": "Context_Resource_Allocation",
        "Strategy": "Ingenious Workarounds over Replacement",
        "Constraint": "Cost-effective solutions required",
        "Goal": "Maximize value extraction from older assets"
    }
}
# --- Write the files ---
print(f"Building Deck in '{folder}'...")
for filename, content in cards.items():
    file_path = folder / filename
    with open(file_path, "w") as f:
        json.dump(content, f, indent=4)
    print(f"  [+] Created {file_path}")
print("\nSuccess. Your portable context deck is ready.")
