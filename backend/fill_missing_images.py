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


def load_places():
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


def search_place_for_photo(query: str):
    if not GOOGLE_PLACES_API_KEY:
        raise ValueError("GOOGLE_PLACES_API_KEY not found in .env")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": ",".join([
            "places.displayName",
            "places.formattedAddress",
            "places.photos",
            "places.id",
        ]),
    }

    payload = {
        "textQuery": query,
        "maxResultCount": 3,
    }

    response = requests.post(TEXT_SEARCH_URL, headers=headers, json=payload, timeout=25)

    if response.status_code != 200:
        raise ValueError(f"Google Places error {response.status_code}: {response.text}")

    data = response.json()
    return data.get("places", [])


def main():
    places = load_places()

    if not places:
        print("No places found.")
        return

    total = len(places)
    updated = 0
    skipped = 0

    for i, place in enumerate(places, start=1):
        current_image = (place.get("image") or "").strip()

        if current_image:
            skipped += 1
            continue

        name = place.get("name", "")
        city = place.get("city", "")
        district = place.get("district", "")

        query = f"{name} {district} {city} Turkey".strip()

        print(f"[{i}/{total}] Searching image for: {query}")

        try:
            results = search_place_for_photo(query)

            photo_url = ""

            for result in results:
                photos = result.get("photos", []) or []
                if photos:
                    photo_name = photos[0].get("name", "")
                    photo_url = build_photo_url(photo_name)
                    if photo_url:
                        break

            if photo_url:
                place["image"] = photo_url
                updated += 1
                print("   -> image added")
            else:
                print("   -> no photo found")

            time.sleep(0.6)

        except Exception as e:
            print(f"   -> ERROR: {e}")

    save_places(places)

    print("\nDone.")
    print(f"Updated images: {updated}")
    print(f"Skipped (already had image): {skipped}")
    print(f"Total places: {total}")
    print(f"Saved to: {PLACES_PATH}")


if __name__ == "__main__":
    main()