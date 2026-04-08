import csv
import json

all_places = []

def load_csv(filename):
    items = []
    with open(filename, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)

        for row in reader:
            if not row:
                continue

            if len(row) == 1:
                row = next(csv.reader([row[0]]))

            # başlık satırı tekrar geldiyse atla
            if row[0].strip().lower() == "id":
                continue

            if len(row) < 14:
                print("Skipping bad row:", row)
                continue

            tags = row[11].split("|") if row[11] else []

            item = {
                "id": int(row[0]),
                "name": row[1],
                "city": row[2],
                "district": row[3] if row[3] else "unknown",
                "category": row[4],
                "subcategory": row[5],
                "latitude": float(row[6]),
                "longitude": float(row[7]),
                "rating": float(row[8]) if row[8] else 4.5,
                "price_level": row[9] if row[9] else "unknown",
                "description": row[10] if row[10] else "",
                "tags": tags,
                "image": row[12] if row[12] else "",
                "estimated_visit_time": int(row[13]) if row[13] else 60,
                "reviews": []
            }

            items.append(item)

    return items


attractions = load_csv("turkey_attractions.csv")
restaurants = load_csv("turkey_restaurants.csv")
hotels = load_csv("turkey_hotels.csv")

current_id = 1
for group in [attractions, restaurants, hotels]:
    for item in group:
        item["id"] = current_id
        current_id += 1

all_places = attractions + restaurants + hotels

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(all_places, f, ensure_ascii=False, indent=2)

print("Merged places.json created")
print("Attractions:", len(attractions))
print("Restaurants:", len(restaurants))
print("Hotels:", len(hotels))
print("Total:", len(all_places))