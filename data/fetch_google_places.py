import json
import os
import time
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

load_dotenv(os.path.join(ROOT_DIR, "backend", ".env"), override=True)

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

PLACES_PATH = os.path.join(BASE_DIR, "places.json")
TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# TÜM TÜRKİYE ŞEHİRLERİ
CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray",
    "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
    "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
    "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
    "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
    "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
    "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars",
    "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
    "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya",
    "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
    "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize",
    "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
    "Şırnak", "Sivas", "Tekirdağ", "Tokat", "Trabzon",
    "Tunceli", "Uşak", "Van", "Yalova", "Yozgat",
    "Zonguldak"
]

# KATEGORİLER
SEARCH_GROUPS = [
    {
        "query": "tourist attractions",
        "category": "attraction",
        "subcategory": "tourism",
        "tags": ["tourism", "landmark", "sightseeing"],
    },
    {
        "query": "historical places",
        "category": "attraction",
        "subcategory": "historical",
        "tags": ["history", "culture", "historical"],
    },
    {
        "query": "best restaurants",
        "category": "restaurant",
        "subcategory": "restaurant",
        "tags": ["food", "restaurant", "local"],
    },
    {
        "query": "hotels",
        "category": "hotel",
        "subcategory": "hotel",
        "tags": ["hotel", "stay"],
    },
    {
        "query": "cafes",
        "category": "cafe",
        "subcategory": "cafe",
        "tags": ["cafe", "coffee"],
    },
]

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.photos",
])


def load_places():
    if not os.path.exists(PLACES_PATH):
        return []

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_places(places):
    with open(PLACES_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)


def normalize(value):
    return str(value or "").strip().lower()


def place_key(place):
    return (
        normalize(place.get("name")),
        normalize(place.get("city")),
    )


def next_id(places):
    if not places:
        return 1

    return max(int(p.get("id", 0) or 0) for p in places) + 1


def build_photo_url(photo_name):
    if not photo_name:
        return ""

    return (
        f"https://places.googleapis.com/v1/{photo_name}/media"
        f"?maxHeightPx=800&maxWidthPx=1200"
        f"&key={GOOGLE_PLACES_API_KEY}"
    )


def search_google_places(text_query):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    payload = {
        "textQuery": text_query,

        #fazla para gitmesin
        "maxResultCount": 10,

        "languageCode": "en",
        "regionCode": "TR",
    }

    response = requests.post(
        TEXT_SEARCH_URL,
        headers=headers,
        json=payload,
        timeout=25,
    )

    if response.status_code != 200:
        print("Google API Error:", response.text)
        return []

    data = response.json()
    return data.get("places", [])


def convert_place(item, city, group, new_id):
    location = item.get("location", {}) or {}
    photos = item.get("photos", []) or []

    image = ""

    if photos:
        image = build_photo_url(photos[0].get("name", ""))

    return {
        "id": new_id,
        "name": item.get("displayName", {}).get("text", ""),
        "city": city,
        "district": "",
        "category": group["category"],
        "subcategory": group["subcategory"],
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "rating": item.get("rating", 0),
        "review_count": item.get("userRatingCount", 0),
        "price_level": "unknown",
        "image": image,
        "description": f"{group['subcategory']} in {city}",
        "source": "google_places",
        "tags": group["tags"],
        "estimated_visit_time": 60,
        "reviews": [],
    }


def main():
    places = load_places()

    existing_keys = {place_key(p) for p in places}

    current_id = next_id(places)

    added = 0

    print(f"Existing places: {len(places)}")

    for city in CITIES:
        print(f"\n========== {city} ==========")

        for group in SEARCH_GROUPS:
            query = f"{group['query']} in {city}, Turkey"

            print(f"Searching: {query}")

            try:
                results = search_google_places(query)

                for item in results:
                    name = item.get("displayName", {}).get("text", "")

                    if not name:
                        continue

                    temp_place = {
                        "name": name,
                        "city": city,
                    }

                    key = place_key(temp_place)

                    # DUPLICATE ENGELLE
                    if key in existing_keys:
                        continue

                    new_place = convert_place(
                        item,
                        city,
                        group,
                        current_id,
                    )

                    places.append(new_place)
                    existing_keys.add(key)

                    current_id += 1
                    added += 1

                print(f"Added: {len(results)}")

            except Exception as e:
                print("ERROR:", e)

            # API SPAM OLMASIN
            time.sleep(1)

    save_places(places)

    print("\nDONE")
    print(f"New places added: {added}")
    print(f"Total places: {len(places)}")


if __name__ == "__main__":
    main()