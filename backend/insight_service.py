import os
import json
import requests
from dotenv import load_dotenv

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

try:
    from reviews_service import get_place_reviews
except Exception:
    def get_place_reviews(query: str):
        return {
            "found": False,
            "query": query,
            "rating": None,
            "review_count": 0,
            "reviews": [],
            "place_name": None,
            "address": None,
        }

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

client = None
if OpenAI and os.getenv("OPENAI_API_KEY"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GOOGLE_CSE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY")
GOOGLE_CSE_CX = os.getenv("GOOGLE_CSE_CX")
CSE_URL = "https://www.googleapis.com/customsearch/v1"


def _txt(language: str, texts: dict):
    language = (language or "en").lower().strip()
    return texts.get(language) or texts.get("en") or ""


def search_web_mentions(query: str, num: int = 5):
    if not GOOGLE_CSE_API_KEY or not GOOGLE_CSE_CX:
        return []

    try:
        params = {
            "key": GOOGLE_CSE_API_KEY,
            "cx": GOOGLE_CSE_CX,
            "q": query,
            "num": num,
        }

        response = requests.get(CSE_URL, params=params, timeout=12)
        if response.status_code != 200:
            print("CSE disabled/error:", response.status_code, response.text[:250])
            return []

        data = response.json()
        items = data.get("items", [])

        return [
            {
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link": item.get("link", ""),
                "displayLink": item.get("displayLink", ""),
            }
            for item in items
        ]
    except Exception as e:
        print("CSE fallback:", e)
        return []


def build_fallback_insight(place_name: str, city: str = "", category: str = "", language: str = "en"):
    city_text = city or _txt(language, {"tr": "Türkiye", "en": "Turkey", "de": "Türkei", "ru": "Турция"})
    category_text = category or _txt(language, {"tr": "turistik nokta", "en": "travel spot", "de": "Reiseziel", "ru": "туристическое место"})

    return {
        "summary": _txt(language, {
            "tr": f"{place_name}, {city_text} içinde rota planına eklenebilecek {category_text} kategorisinde bir noktadır. Google yorumları şu an alınamadığı için değerlendirme veri setindeki kategori, şehir ve puan bilgilerine göre oluşturuldu.",
            "en": f"{place_name} is a {category_text} in {city_text} that can be added to a travel route. Google reviews are currently unavailable, so this insight is generated from dataset category, city and rating data.",
            "de": f"{place_name} ist ein Ort der Kategorie {category_text} in {city_text} und kann in eine Reiseroute aufgenommen werden. Google-Bewertungen sind derzeit nicht verfügbar, daher basiert diese Einschätzung auf Datensatzinformationen.",
            "ru": f"{place_name} — место категории {category_text} в {city_text}, которое можно добавить в маршрут. Отзывы Google сейчас недоступны, поэтому анализ создан на основе данных набора.",
        }),
        "strengths": [
            _txt(language, {"tr": "Rota planına kolayca eklenebilir", "en": "Easy to add to a route", "de": "Einfach in eine Route integrierbar", "ru": "Легко добавить в маршрут"}),
            _txt(language, {"tr": "Konum ve kategori bilgisi mevcut", "en": "Location and category data available", "de": "Standort- und Kategoriedaten verfügbar", "ru": "Есть данные о месте и категории"}),
            _txt(language, {"tr": "Kısa gezi molaları için uygun olabilir", "en": "May fit short sightseeing stops", "de": "Geeignet für kurze Stopps", "ru": "Подходит для короткой остановки"}),
        ],
        "watch_out": [
            _txt(language, {"tr": "Canlı Google yorumları şu an alınamadı", "en": "Live Google reviews are currently unavailable", "de": "Live-Google-Bewertungen sind derzeit nicht verfügbar", "ru": "Отзывы Google сейчас недоступны"}),
            _txt(language, {"tr": "Gitmeden önce güncel saat ve yoğunluk kontrol edilmeli", "en": "Check opening hours and crowd levels before visiting", "de": "Öffnungszeiten und Auslastung vorher prüfen", "ru": "Перед визитом проверьте часы работы и загруженность"}),
        ],
        "best_for": [
            _txt(language, {"tr": "Rota planlayan gezginler", "en": "Route planners", "de": "Reiseplaner", "ru": "Путешественники с маршрутом"}),
            _txt(language, {"tr": "Şehir keşfi yapanlar", "en": "City explorers", "de": "Stadtentdecker", "ru": "Исследователи города"}),
        ],
    }


def build_ai_insight(place_name: str, city: str, google_reviews: dict, web_mentions: list, language: str = "en"):
    if not client:
        return build_fallback_insight(place_name, city, language=language)

    google_rating = google_reviews.get("rating")
    review_count = google_reviews.get("review_count")
    review_texts = [r.get("text", "") for r in google_reviews.get("reviews", [])[:3] if r.get("text")]
    web_snippets = [w.get("snippet", "") for w in web_mentions[:5] if w.get("snippet")]

    language_rule_map = {
        "tr": "Respond in Turkish.",
        "en": "Respond in English.",
        "de": "Respond in German.",
        "ru": "Respond in Russian.",
    }

    language = (language or "en").lower().strip()
    if language not in language_rule_map:
        language = "en"

    prompt = f"""
You are an AI travel analyst.
{language_rule_map[language]}

Create a helpful short travel insight. If Google reviews or web snippets are empty, still create a useful fallback using place name and city.

Place: {place_name}
City: {city}

Google rating: {google_rating}
Google review count: {review_count}

Google reviews:
{chr(10).join(review_texts)}

Web mentions:
{chr(10).join(web_snippets)}

Return valid JSON only:
{{
  "summary": "2-3 sentence overall verdict",
  "strengths": ["item1", "item2", "item3"],
  "watch_out": ["item1", "item2"],
  "best_for": ["item1", "item2"]
}}
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        raw = response.output_text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print("OpenAI insight fallback:", e)
        return build_fallback_insight(place_name, city, language=language)


def get_place_insight(
    place_name: str,
    city: str = "",
    language: str = "en",
    dataset_rating=None,
    category: str = "",
    description: str = "",
):
    full_query = f"{place_name} {city}".strip()

    google_reviews = get_place_reviews(full_query)
    web_mentions = search_web_mentions(f"{full_query} travel review OR blog OR guide", num=5)

    ai_insight = build_ai_insight(
        place_name=place_name,
        city=city,
        google_reviews=google_reviews,
        web_mentions=web_mentions,
        language=language,
    )

    try:
        ds_rating = float(dataset_rating or 0)
    except Exception:
        ds_rating = 0

    try:
        google_rating = float(google_reviews.get("rating") or 0)
    except Exception:
        google_rating = 0

    try:
        review_count = int(google_reviews.get("review_count") or 0)
    except Exception:
        review_count = 0

    if google_rating > 0:
        smart_score = round(((ds_rating * 0.45) + (google_rating * 0.45) + min(review_count / 10000, 1) * 5 * 0.10), 1)
    elif ds_rating > 0:
        smart_score = round(ds_rating, 1)
    else:
        smart_score = None

    return {
        "place": place_name,
        "city": city,
        "smart_score": smart_score,
        "score_breakdown": {
            "dataset_rating": ds_rating,
            "google_rating": google_rating,
            "review_count": review_count,
        },
        "google": {
            "rating": google_reviews.get("rating"),
            "review_count": google_reviews.get("review_count"),
            "reviews": google_reviews.get("reviews", [])[:3],
            "found": google_reviews.get("found", False),
        },
        "web_mentions": web_mentions,
        "ai_insight": ai_insight,
    }
