import json
import pandas as pd

with open("export.geojson", "r", encoding="utf-8") as f:
    data = json.load(f)

places = []

for feature in data["features"]:
    props = feature["properties"]
    geometry = feature.get("geometry")

    if not geometry:
        continue

    coords = geometry.get("coordinates")
    if not coords or len(coords) < 2:
        continue

    name = props.get("name")
    category = props.get("tourism") or props.get("amenity") or props.get("shop") or props.get("leisure")

    if not name or not category:
        continue

    place = {
        "name": str(name).strip(),
        "category": str(category).strip(),
        "latitude": coords[1],
        "longitude": coords[0],
        "district": props.get("addr:district"),
    }

    places.append(place)

df = pd.DataFrame(places)

# tekrarları temizle
df = df.drop_duplicates(subset=["name", "latitude", "longitude"])

# kısa ve anlamsız isimleri at
df = df[df["name"].str.len() > 2]

# sadece çekirdek turistik kategoriler
core_categories = [
    "attraction",
    "museum",
    "viewpoint",
    "gallery",
    "theme_park",
    "park"
]

df_core = df[df["category"].isin(core_categories)].copy()

# alfabetik sırala
df_core = df_core.sort_values(by="name")

df_core.to_csv("istanbul_core_tourism.csv", index=False, encoding="utf-8-sig")

print("Core tourism dataset created")
print("Total core places:", len(df_core))
print(df_core.head(20))