import csv
import json

places = []

with open("turkey_attractions.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    header = next(reader)  # ilk satır başlık

    for row in reader:
        if not row:
            continue

        # Eğer bütün satır tek hücreye düşmüşse tekrar parçala
        if len(row) == 1:
            row = next(csv.reader([row[0]]))

        if len(row) < 14:
            print("Skipping bad row:", row)
            continue

        tags = row[11].split("|") if row[11] and row[11] != "unknown" else []

        place = {
            "id": int(row[0]),
            "name": row[1],
            "city": row[2],
            "district": row[3] if row[3] else "unknown",
            "category": row[4],
            "subcategory": row[5],
            "latitude": float(row[6]),
            "longitude": float(row[7]),
            "rating": float(row[8]) if row[8] and row[8] != "unknown" else 4.5,
            "price_level": row[9] if row[9] else "unknown",
            "description": row[10] if row[10] else "",
            "tags": tags,
            "image": row[12] if row[12] else "",
            "estimated_visit_time": int(row[13]) if row[13] and row[13] != "unknown" else 60,
            "reviews": []
        }

        places.append(place)

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)

print("places.json created")
print("Total places:", len(places))