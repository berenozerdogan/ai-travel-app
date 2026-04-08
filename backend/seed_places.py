import json
import os
import time
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

DATA_DIR = os.path.join(BASE_DIR, "..", "data")
PLACES_PATH = os.path.join(DATA_DIR, "places.json")

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


CITIES = [
    "Istanbul",
    "Antalya",
    "Ankara",
    "Izmir",
    "Nevsehir",
]

CATEGORY_QUERIES = {
    "attraction": [
        "best tourist attractions in {city}",
        "historic places in {city}",
        "landmarks in {city}",
    ],
    "museum": [
        "museums in {city}",
    ],
    "restaurant": [
        "best restaurants in {city}",
        "local restaurants in {city}",
    ],
    "cafe": [
        "cafes in {city}",
        "coffee shops in {city}",
    ],
    "hotel": [
        "hotels in {city}",
        "best hotels in {city}",
        "boutique hotels in {city}",
    ],
}

CATEGORY_MAP = {
    "attraction": "attraction",
    "museum": "museum",
    "restaurant": "restaurant",
    "cafe": "cafe",
    "hotel": "hotel",
}


def load_existing_places():
    if not os.path.exists(PLACES_PATH):
        return []

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_places(places):
    with open(PLACES_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)


def build_photo_url(photo_name: str):
    if not photo_name or not GOOGLE_PLACES_API_KEY:
        return ""

    return (
        f"https://places.googleapis.com/v1/{photo_name}/media"
        f"?maxHeightPx=800&maxWidthPx=1200&key={GOOGLE_PLACES_API_KEY}"
    )


def infer_subcategory(category: str, place_types: list, name: str = ""):
    types_lower = [t.lower() for t in place_types]
    name_lower = (name or "").lower()

    if category == "hotel":
        if "resort_hotel" in types_lower or "resort" in name_lower:
            return "resort"
        if "boutique" in name_lower:
            return "boutique"
        if "hostel" in name_lower:
            return "hostel"
        if "cave" in name_lower:
            return "cave"
        return "city"

    if category == "restaurant":
        if "seafood_restaurant" in types_lower:
            return "seafood"
        if "turkish_restaurant" in types_lower:
            return "turkish"
        if "fine_dining" in name_lower:
            return "fine_dining"
        return "restaurant"

    if category == "cafe":
        return "cafe"

    if category == "museum":
        return "museum"

    if category == "attraction":
        if "historical_landmark" in types_lower:
            return "historical"
        if "park" in types_lower:
            return "park"
        if "beach" in types_lower:
            return "beach"
        return "landmark"

    return category


def clean_city_name(city: str):
    city_map = {
        "Nevsehir": "Cappadocia",
    }
    return city_map.get(city, city)


def search_places(query: str, max_results: int = 10):
    if not GOOGLE_PLACES_API_KEY:
        raise ValueError("GOOGLE_PLACES_API_KEY not found in .env")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": ",".join([
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.primaryType",
            "places.types",
            "places.photos",
        ]),
    }

    payload = {
        "textQuery": query,
        "maxResultCount": max_results,
    }

    response = requests.post(TEXT_SEARCH_URL, headers=headers, json=payload, timeout=25)

    if response.status_code != 200:
        raise ValueError(f"Google Places error {response.status_code}: {response.text}")

    data = response.json()
    return data.get("places", [])


def place_to_record(place: dict, city: str, category: str, next_id: int):
    name = place.get("displayName", {}).get("text", "")
    address = place.get("formattedAddress", "")
    location = place.get("location", {})
    rating = place.get("rating", 0)
    review_count = place.get("userRatingCount", 0)
    price_level = str(place.get("priceLevel", "unknown")).lower()

    place_types = place.get("types", []) or []
    subcategory = infer_subcategory(category, place_types, name)

    district = ""
    if address:
        address_parts = [p.strip() for p in address.split(",")]
        if len(address_parts) >= 2:
            district = address_parts[-2]

    photo_url = ""
    photos = place.get("photos", [])
    if photos:
        photo_name = photos[0].get("name", "")
        photo_url = build_photo_url(photo_name)

    return {
        "id": next_id,
        "name": name,
        "city": clean_city_name(city),
        "district": district,
        "category": category,
        "subcategory": subcategory,
        "latitude": location.get("latitude", 0),
        "longitude": location.get("longitude", 0),
        "rating": rating or 0,
        "review_count": review_count or 0,
        "price_level": price_level,
        "image": photo_url,
        "description": f"{subcategory.replace('_', ' ').title()} in {clean_city_name(city)}",
        "source": "google_places",
        "tags": [category, subcategory],
        "estimated_visit_time": estimate_visit_time(category),
        "reviews": [],
    }


def estimate_visit_time(category: str):
    mapping = {
        "attraction": 90,
        "museum": 90,
        "restaurant": 75,
        "cafe": 60,
        "hotel": 45,
    }
    return mapping.get(category, 60)


def deduplicate_places(places: list):
    unique = []
    seen = set()

    for place in places:
        key = (
            (place.get("name") or "").strip().lower(),
            (place.get("city") or "").strip().lower(),
            round(float(place.get("latitude", 0) or 0), 4),
            round(float(place.get("longitude", 0) or 0), 4),
        )

        if key not in seen:
            seen.add(key)
            unique.append(place)

    return unique


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    existing_places = load_existing_places()
    all_places = existing_places[:]

    next_id = max([p.get("id", 0) for p in all_places], default=0) + 1

    for city in CITIES:
        print(f"\n=== CITY: {city} ===")

        for category, query_templates in CATEGORY_QUERIES.items():
            print(f"  -> Category: {category}")

            for template in query_templates:
                query = template.format(city=city)
                print(f"     Searching: {query}")

                try:
                    results = search_places(query, max_results=10)

                    for item in results:
                        record = place_to_record(
                            place=item,
                            city=city,
                            category=CATEGORY_MAP[category],
                            next_id=next_id,
                        )
                        next_id += 1
                        all_places.append(record)

                    time.sleep(1)

                except Exception as e:
                    print(f"     ERROR: {e}")

    all_places = deduplicate_places(all_places)

    save_places(all_places)

    print(f"\nDone. Total places saved: {len(all_places)}")
    print(f"Saved to: {PLACES_PATH}")


if __name__ == "__main__":
    main()