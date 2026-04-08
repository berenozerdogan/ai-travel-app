import json
import re

path = "data/places.json"

with open(path, "r", encoding="utf-8") as f:
    places = json.load(f)

for place in places:
    image = place.get("image", "")
    if image and "&key=" in image:
        place["image"] = re.sub(r"&key=[^&]+", "", image)

with open(path, "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)

print("Done: removed keys from image URLs")