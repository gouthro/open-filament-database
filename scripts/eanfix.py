import json
import os
from pathlib import Path

def remove_short_eans(directory: str = "data/Hatchbox") -> None:
    """Remove EAN codes with length 10 from all Anycubic sizes.json files."""
    
    sizes_files = Path(directory).rglob("sizes.json")
    
    for sizes_file in sizes_files:
        try:
            with open(sizes_file, 'r') as f:
                sizes = json.load(f)
            
            modified = False
            for size in sizes:
                if "ean" in size and len(size["ean"]) == 12:
                    size["gtin"] = size["ean"]
                    del size["ean"]
                    modified = True
            
            if modified:
                with open(sizes_file, 'w') as f:
                    json.dump(sizes, f, indent=2)
                print(f"✓ Modified: {sizes_file}")
            else:
                print(f"  Skipped: {sizes_file} (no 10-digit EANs)")
            
        except (json.JSONDecodeError, IOError) as e:
            print(f"✗ Error processing {sizes_file}: {e}")

if __name__ == "__main__":
    remove_short_eans()
    print("\nDone!")