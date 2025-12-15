import json
import urllib.parse

def update_purchase_links(data, preface):
    """
    Add a preface to purchase link URLs, URI-encode them, and set affiliate=True.

    Args:
        data (list[dict]): The product data list.
        preface (str): The prefix/preface to add to each URL (e.g. affiliate redirect domain).

    Returns:
        list[dict]: The updated data list.
    """
    for item in data:
        for link in item.get("purchase_links", []):
            original_url = link["url"]

            if not "esun3dstore.com" in original_url:
                continue
                
            encoded_url = urllib.parse.quote(original_url, safe='')
            link["url"] = f"{preface}{encoded_url}"
            link["affiliate"] = True
    return data


# Example usage:
from pathlib import Path
import json

path = Path("data/eSUN 3D")
l = list(path.glob("**/sizes.json"))
print(l)
for item in l:
    preface = "https://www.awin1.com/cread.php?awinmid=99267&awinaffid=2609884&ued="
    updated = update_purchase_links(json.loads(item.read_text()), preface)
    item.write_text(json.dumps(updated, indent=2))
