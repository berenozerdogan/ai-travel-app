import pandas as pd
import json

df = pd.read_csv("istanbul_core_tourism.csv")

# NaN değerleri temizle
df = df.fillna("unknown")

places = []

for i, row in df.iterrows():
    place = {
        "id": int(i + 1),
        "name": str(row["name"]),
        "category": str(row["category"]),
        "district": str(row["district"]),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "rating": 4.5,
        "price_level": "unknown",
        "description": "Touristic place in Istanbul",
        "tags": [str(row["category"])],
        "reviews": []
    }

    places.append(place)

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)

print("places.json created")
print("Total places:", len(places))