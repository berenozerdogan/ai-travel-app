import json
from image_fetcher import get_place_image
import time

with open("../data/places.json", "r", encoding="utf-8") as f:
    places = json.load(f)

updated = []

for p in places:
    if not p.get("image"):
        img = get_place_image(p["name"], p["city"])
        if img:
            p["image"] = img
            print("✔", p["name"])
        else:
            print("✖", p["name"])

        time.sleep(0.3)

    updated.append(p)

with open("../data/places.json", "w", encoding="utf-8") as f:
    json.dump(updated, f, ensure_ascii=False, indent=2)

print("DONE")