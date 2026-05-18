import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_PATH = os.path.join(BASE_DIR, "places.json")


BEACH_WORDS = [
    "beach", "plaj", "sahil", "kumsal", "coast", "coastal",
    "konyaaltı", "lara", "kaputaş", "patara", "olimpos", "çıralı",
    "ölüdeniz", "akçakese", "akyaka", "altınkum", "ılıca"
]

SHOPPING_WORDS = [
    "mall", "avm", "bazaar", "bazar", "market", "shopping",
    "çarşı", "pazar", "kapalıçarşı", "mısır çarşısı", "forum",
    "optimum", "kanyon", "istinye", "akmerkez", "zorlu"
]

NATURE_WORDS = [
    "park", "forest", "orman", "national park", "milli park",
    "lake", "göl", "waterfall", "şelale", "canyon", "kanyon",
    "valley", "vadi", "mountain", "dağ", "plateau", "yayla",
    "river", "nehir", "dere", "nature", "doğa"
]

HISTORICAL_WORDS = [
    "museum", "müze", "castle", "kale", "palace", "saray",
    "mosque", "cami", "church", "kilise", "monastery", "manastır",
    "ancient", "antik", "ruins", "ören", "archaeological",
    "arkeoloji", "tomb", "türbe", "han", "hamam", "medrese"
]

MUSEUM_WORDS = [
    "museum", "müze", "archaeology", "arkeoloji"
]


def text_of(place):
    return " ".join([
        str(place.get("name", "")),
        str(place.get("city", "")),
        str(place.get("district", "")),
        str(place.get("category", "")),
        str(place.get("subcategory", "")),
        str(place.get("description", "")),
        " ".join(place.get("tags", []) or []),
    ]).lower()


def add_tag(place, tag):
    tags = place.get("tags") or []
    if tag not in tags:
        tags.append(tag)
    place["tags"] = tags


def has_any(text, words):
    return any(word.lower() in text for word in words)


def main():
    if not os.path.exists(PLACES_PATH):
        print("places.json not found")
        return

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    updated = 0

    for place in places:
        before = json.dumps(place, ensure_ascii=False, sort_keys=True)
        text = text_of(place)

        if has_any(text, BEACH_WORDS):
            add_tag(place, "beach")
            place["subcategory"] = "beach"

        if has_any(text, SHOPPING_WORDS):
            add_tag(place, "shopping")
            place["category"] = "shopping"
            place["subcategory"] = "shopping"

        if has_any(text, NATURE_WORDS):
            add_tag(place, "nature")
            if place.get("category") == "attraction":
                place["subcategory"] = place.get("subcategory") or "nature"

        if has_any(text, HISTORICAL_WORDS):
            add_tag(place, "historical")
            if place.get("category") == "attraction":
                place["subcategory"] = place.get("subcategory") or "historical"

        if has_any(text, MUSEUM_WORDS):
            add_tag(place, "museum")
            if place.get("category") == "attraction":
                place["category"] = "museum"
                place["subcategory"] = "museum"

        after = json.dumps(place, ensure_ascii=False, sort_keys=True)

        if before != after:
            updated += 1

    with open(PLACES_PATH, "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)

    print("Done.")
    print(f"Updated places: {updated}")
    print(f"Total places: {len(places)}")


if __name__ == "__main__":
    main()