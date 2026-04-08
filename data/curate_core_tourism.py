import pandas as pd
import json

# Kaynak dosya
df = pd.read_csv("istanbul_core_tourism.csv")

# Boşları temizle
df = df.fillna("unknown")

# İsim çok kısa olanları at
df = df[df["name"].str.len() > 2]

# İstenmeyen kelimeler
bad_keywords = [
    "sokak parkı",
    "caddesi parkı",
    "mahallesi",
    "anaokulu",
    "site içi",
    "oyun alanı",
    "çocuk parkı",
    "parkı",
]

# Büyük ve gerçekten bilinen parkları korumak için whitelist
good_parks = [
    "Gülhane Parkı",
    "Gulhane Park",
    "Yıldız Parkı",
    "Yildiz Park",
    "Emirgan Parkı",
    "Emirgan Park",
    "Pierre Loti",
    "Çamlıca",
    "Camlica",
    "Belgrad Ormanı",
    "Belgrad Forest",
    "Fethi Paşa Korusu",
    "Fethi Pasa Grove",
    "Maçka Parkı",
    "Macka Park",
]

def should_keep(row):
    name = str(row["name"]).lower()
    category = str(row["category"]).lower()

    # Museum / attraction / viewpoint / gallery / theme park direkt kalsın
    if category in ["museum", "attraction", "viewpoint", "gallery", "theme_park"]:
        return True

    # Park ise daha seçici ol
    if category == "park":
        for good in good_parks:
            if good.lower() in name:
                return True

        for bad in bad_keywords:
            if bad in name:
                return False

        return False

    return False

df = df[df.apply(should_keep, axis=1)]

# Tekrarları temizle
df = df.drop_duplicates(subset=["name", "latitude", "longitude"])

# Alfabetik sırala
df = df.sort_values(by="name").reset_index(drop=True)

# CSV kaydet
df.to_csv("istanbul_curated_core.csv", index=False, encoding="utf-8-sig")

# JSON üret
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

with open("istanbul_curated_core.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)

print("Curated dataset created")
print("Total curated places:", len(places))
print(df.head(20))