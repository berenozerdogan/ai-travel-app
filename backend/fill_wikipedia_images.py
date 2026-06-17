import json
import time
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLACES_PATH = ROOT / "data" / "places.json"

# HIZLI AYARLAR
MAX_CHECKS = 350          # En fazla kaç bozuk görsel denensin
REQUEST_SLEEP = 0.03      # Bekleme süresi
TIMEOUT = 4               # Wikipedia bekleme süresi

WIKI_LANGS = ["tr", "en"]

BAD_IMAGE_MARKERS = [
    "places.googleapis.com",
    "googleusercontent.com",
    "unknown",
    "undefined",
    "null",
    "placeholder",
]

IMPORTANT_CATEGORIES = {
    "attraction",
    "museum",
}

IMPORTANT_SUBCATEGORIES = {
    "historical",
    "landmark",
    "nature",
    "museum",
    "viewpoint",
    "beach",
}

SKIP_CATEGORIES = {
    "restaurant",
    "cafe",
    "hotel",
}

HEADERS = {
    "User-Agent": "AITravelApp/1.0 (educational project)"
}

MANUAL_WIKI_IMAGES = {
    "Pamukkale Travertenleri": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Pamukkale_Turkey.jpg/1280px-Pamukkale_Turkey.jpg",
    "Hierapolis": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hierapolis_theatre_2003.jpg/1280px-Hierapolis_theatre_2003.jpg",
    "Efes Antik Kenti": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Celsus_Library%2C_Ephesus.jpg/1280px-Celsus_Library%2C_Ephesus.jpg",
    "Celsus Kütüphanesi": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Celsus_Library%2C_Ephesus.jpg/1280px-Celsus_Library%2C_Ephesus.jpg",
    "Anıtkabir": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Anitkabir_Ankara.jpg/1280px-Anitkabir_Ankara.jpg",
    "Sultanahmet Camii": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg/1280px-Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg",
    "Kız Kulesi": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Maiden%27s_Tower_Bosphorus.jpg/1280px-Maiden%27s_Tower_Bosphorus.jpg",
    "Paşabağ Vadisi": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Pa%C5%9Faba%C4%9F%C4%B1.jpg/1280px-Pa%C5%9Faba%C4%9F%C4%B1.jpg",
    "Aşk Vadisi": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Love_Valley_Cappadocia.jpg/1280px-Love_Valley_Cappadocia.jpg",
    "Göbeklitepe": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/G%C3%B6bekli_Tepe%2C_Urfa.jpg/1280px-G%C3%B6bekli_Tepe%2C_Urfa.jpg",
    "Gobeklitepe": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/G%C3%B6bekli_Tepe%2C_Urfa.jpg/1280px-G%C3%B6bekli_Tepe%2C_Urfa.jpg",
}


def is_bad_image(url: str) -> bool:
    value = str(url or "").strip().lower()
    if not value:
        return True
    return any(marker in value for marker in BAD_IMAGE_MARKERS)


def get_main_name(place: dict) -> str:
    name = place.get("name")
    if isinstance(name, dict):
        return str(name.get("tr") or name.get("en") or "").strip()
    return str(name or "").strip()


def get_name_candidates(place: dict) -> list[str]:
    name = place.get("name")
    candidates = []

    if isinstance(name, dict):
        for lang in ["tr", "en"]:
            value = str(name.get(lang) or "").strip()
            if value and value not in candidates:
                candidates.append(value)
    else:
        value = str(name or "").strip()
        if value:
            candidates.append(value)

    city = str(place.get("city") or "").strip()
    for c in list(candidates):
        if city and f"{c} {city}" not in candidates:
            candidates.append(f"{c} {city}")

    return candidates


def fetch_wikipedia_image(title: str, lang: str) -> str:
    try:
        safe_title = requests.utils.quote(title)
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{safe_title}"
        res = requests.get(url, headers=HEADERS, timeout=TIMEOUT)

        if res.status_code != 200:
            return ""

        data = res.json()
        original = data.get("originalimage", {}) or {}
        thumbnail = data.get("thumbnail", {}) or {}
        image_url = original.get("source") or thumbnail.get("source") or ""

        return str(image_url or "").strip()
    except Exception:
        return ""


def find_wikipedia_image(place: dict) -> str:
    main_name = get_main_name(place)

    if main_name in MANUAL_WIKI_IMAGES:
        return MANUAL_WIKI_IMAGES[main_name]

    for title in get_name_candidates(place):
        for lang in WIKI_LANGS:
            image = fetch_wikipedia_image(title, lang)
            if image.startswith("http"):
                return image
            time.sleep(REQUEST_SLEEP)

    return ""


def should_process(place: dict) -> bool:
    category = str(place.get("category") or "").lower()
    subcategory = str(place.get("subcategory") or "").lower()

    if category in SKIP_CATEGORIES:
        return False

    if place.get("is_featured") is True:
        return True

    if category in IMPORTANT_CATEGORIES:
        return True

    if subcategory in IMPORTANT_SUBCATEGORIES:
        return True

    return False


def main():
    places = json.loads(PLACES_PATH.read_text(encoding="utf-8"))

    changed = 0
    checked = 0

    for index, place in enumerate(places, start=1):
        if checked >= MAX_CHECKS:
            print(f"MAX_CHECKS sınırına ulaşıldı: {MAX_CHECKS}")
            break

        old_image = place.get("image", "")

        if not is_bad_image(old_image):
            continue

        if not should_process(place):
            continue

        checked += 1
        title = get_main_name(place)

        print(f"[{index}/{len(places)}] Wikipedia görsel aranıyor: {title}")

        wiki_image = find_wikipedia_image(place)

        if wiki_image:
            place["image"] = wiki_image
            place["image_source"] = "wikipedia"
            changed += 1
            print(f"  ✅ bulundu")
        else:
            print("  ❌ bulunamadı")

        # Her 10 kontrolde bir dosyayı kaydet, boşa bekleme olmasın.
        if checked % 10 == 0:
            PLACES_PATH.write_text(
                json.dumps(places, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            print("  💾 ara kayıt alındı")

    PLACES_PATH.write_text(
        json.dumps(places, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print()
    print(f"Kontrol edilen önemli bozuk görsel: {checked}")
    print(f"Wikipedia ile güncellenen görsel: {changed}")
    print(f"Güncellendi: {PLACES_PATH}")


if __name__ == "__main__":
    main()
