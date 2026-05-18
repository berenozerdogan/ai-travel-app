from fastapi import FastAPI, Body, Query
import json
import math
import os
from dotenv import load_dotenv
import os

def build_image_url(image_url: str) -> str:
    if not image_url:
        return ""

    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()

    if not api_key:
        return image_url

    if "key=" in image_url:
        return image_url

    separator = "&" if "?" in image_url else "?"
    return f"{image_url}{separator}key={api_key}"
def get_lang(payload_or_value=None):
    if isinstance(payload_or_value, dict):
        lang = (payload_or_value.get("language") or "en").lower().strip()
    elif isinstance(payload_or_value, str):
        lang = payload_or_value.lower().strip()
    else:
        lang = "en"

    if lang not in ["tr", "en", "de", "ru"]:
        lang = "en"
    return lang


def tr_text(lang: str, texts: dict):
    return texts.get(lang) or texts.get("en") or ""
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from query_utils import (
    normalize_text,
    detect_city,
    get_city_aliases,
    is_event_query,
    is_hidden_gems_query,
    detect_category,
    detect_district,
)

from sklearn.feature_extraction.text import TfidfVectorizer
from openai import OpenAI
from events_service import get_events
from reviews_service import get_place_reviews
from insight_service import get_place_insight

print("GOOGLE PLACES KEY:", os.getenv("GOOGLE_PLACES_API_KEY"))
print("TAVILY KEY:", os.getenv("TAVILY_API_KEY"))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI()

DATA_DIR = os.path.join(BASE_DIR, "..", "data")
PLACES_PATH = os.path.join(DATA_DIR, "places.json")

REVIEW_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "review_translation_cache.json")


def load_review_cache():
    if not os.path.exists(REVIEW_CACHE_PATH):
        return {}

    try:
        with open(REVIEW_CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_review_cache(cache):
    with open(REVIEW_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def translate_review_text(text: str, target_lang: str):
    if not text or not text.strip():
        return ""

    cache = load_review_cache()
    cache_key = f"{target_lang}:{text}"

    if cache_key in cache:
        return cache[cache_key]

    language_names = {
        "tr": "Turkish",
        "en": "English",
        "de": "German",
        "ru": "Russian",
    }

    target_language = language_names.get(target_lang, "English")

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=f"Translate this travel review into {target_language}. Keep the meaning natural and concise. Return only the translated text:\n\n{text}",
        )

        translated = response.output_text.strip()

        cache[cache_key] = translated
        save_review_cache(cache)

        return translated
    except Exception:
        return text
@app.get("/")
def home():
    return {"message": "AI Tourism Backend Running"}


@app.get("/places")
def get_places():
    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    for place in places:
        place["image"] = build_image_url(place.get("image", ""))

    return places


@app.get("/places/{place_name}")
def get_place(place_name: str):
    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    for place in places:
        if place["name"].lower() == place_name.lower():
            place["image"] = build_image_url(place.get("image", ""))
            return place

    return {"error": "Place not found"}


@app.get("/analyze/{place_name}")
def analyze_place(place_name: str):
    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    for place in places:
        if place["name"].lower() == place_name.lower():
            reviews = place.get("reviews", [])

            if not reviews:
                return {"place": place_name, "keywords": []}

            vectorizer = TfidfVectorizer(stop_words="english")
            x = vectorizer.fit_transform(reviews)

            scores = x.sum(axis=0).A1
            words = vectorizer.get_feature_names_out()

            word_scores = list(zip(words, scores))
            word_scores.sort(key=lambda item: item[1], reverse=True)

            top_keywords = [word for word, _score in word_scores[:5]]

            return {
                "place": place["name"],
                "keywords": top_keywords,
                "review_count": len(reviews),
            }

    return {"error": "Place not found"}

@app.get("/reviews")
def reviews(place: str, language: str = Query("en")):
    lang = get_lang(language)

    try:
        data = get_place_reviews(place)

        if not data:
            return {
                "found": False,
                "query": place,
                "rating": None,
                "review_count": 0,
                "reviews": [],
                "message": tr_text(lang, {
                    "tr": "Yorum bulunamadı.",
                    "en": "No reviews found.",
                    "de": "Keine Bewertungen gefunden.",
                    "ru": "Отзывы не найдены.",
                }),
            }

        translated_reviews = []

        for review in data.get("reviews", [])[:5]:
            original_text = review.get("text", "") or ""

            translated_text = translate_review_text(original_text, lang)

            translated_reviews.append({
                "author": review.get("author", "Google user"),
                "rating": review.get("rating"),
                "text": translated_text,
                "original_text": original_text,
                "publish_time": review.get("publish_time"),
                "translated": translated_text != original_text,
            })

        data["reviews"] = translated_reviews
        data["language"] = lang

        return data

    except Exception as e:
        return {
            "found": False,
            "query": place,
            "rating": None,
            "review_count": 0,
            "reviews": [],
            "error": str(e),
            "message": tr_text(lang, {
                "tr": "Yorumlar alınamadı.",
                "en": "Could not fetch reviews.",
                "de": "Bewertungen konnten nicht abgerufen werden.",
                "ru": "Не удалось получить отзывы.",
            }),
        }
@app.get("/summary/{place_name}")
def summarize_place(place_name: str, language: str = Query("en")):
    lang = get_lang(language)

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    for place in places:
        if place["name"].lower() == place_name.lower():
            reviews = place.get("reviews", [])

            if not reviews:
                return {
                    "summary": tr_text(lang, {
                        "tr": "Yorum bulunamadı.",
                        "en": "No reviews available.",
                        "de": "Keine Bewertungen verfügbar.",
                        "ru": "Отзывы недоступны.",
                    })
                }

            positive_words = ["amazing", "beautiful", "great", "impressive", "nice"]
            negative_words = ["crowded", "queue", "expensive", "busy"]

            positive_count = sum(
                any(word in review.lower() for word in positive_words)
                for review in reviews
            )

            negative_count = sum(
                any(word in review.lower() for word in negative_words)
                for review in reviews
            )

            summary_map = {
                "tr": f"{place['name']} ziyaretçileri genel olarak atmosferi ve deneyimi beğeniyor. Birçok yorum tarihi ve görsel açıdan güçlü bir deneyim sunduğunu söylüyor. Yoğun saatlerde kalabalık olabileceği de belirtiliyor.",
                "en": f"Visitors generally appreciate the atmosphere and experience of {place['name']}. Many reviews highlight its historical and visual appeal. Some visitors also mention crowd levels during busy hours.",
                "de": f"Besucher schätzen im Allgemeinen die Atmosphäre und das Erlebnis von {place['name']}. Viele Bewertungen betonen den historischen und visuellen Reiz. Zu Stoßzeiten kann es allerdings voll werden.",
                "ru": f"Посетители в целом высоко оценивают атмосферу и впечатления от {place['name']}. Многие отзывы подчёркивают историческую и визуальную привлекательность. В часы пик здесь может быть многолюдно.",
            }

            return {
                "place": place["name"],
                "summary": summary_map[lang],
                "positive_mentions": positive_count,
                "negative_mentions": negative_count,
            }

    return {"error": "Place not found"}

@app.post("/chat")
def chat_with_ai(payload: dict = Body(...)):
    message = payload.get("message", "").lower()

    keyword_map = {
        "tarih": "history",
        "tarihi": "history",
        "historical": "history",
        "history": "history",
        "alışveriş": "shopping",
        "alisveris": "shopping",
        "shopping": "shopping",
        "shop": "shopping",
        "park": "park",
        "doğa": "nature",
        "doga": "nature",
        "nature": "nature",
        "natural": "nature",
        "müze": "museum",
        "muze": "museum",
        "museum": "museum",
        "museums": "museum",
        "manzara": "view",
        "view": "view",
        "views": "view",
        "scenic": "view",
        "architecture": "architecture",
        "architectural": "architecture",
        "mimari": "architecture",
    }

    detected_intents = []
    for key, value in keyword_map.items():
        if key in message and value not in detected_intents:
            detected_intents.append(value)

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    matched_places = []

    for place in places:
        tags = [t.lower() for t in place.get("tags", [])]
        category = place.get("category", "").lower()
        description = place.get("description", "").lower()

        if (
            ("history" in detected_intents and ("history" in tags or category == "historical" or "ottoman" in tags or "history" in description))
            or ("park" in detected_intents and category == "park")
            or ("shopping" in detected_intents and (category == "shopping" or "shopping" in tags or "street" in tags))
            or ("museum" in detected_intents and category == "museum")
            or ("architecture" in detected_intents and ("architecture" in tags or category == "historical" or "architecture" in description))
            or ("nature" in detected_intents and ("nature" in tags or category == "park" or "relax" in tags))
            or ("view" in detected_intents and ("view" in tags or "bosphorus" in tags or "landmark" in tags or "panoramic" in description))
        ):
            matched_places.append(place)

    if matched_places:
        matched_places = sorted(
            matched_places,
            key=lambda x: x.get("rating", 0),
            reverse=True,
        )

        selected = matched_places[:3]
        total_time = sum(p.get("estimated_visit_time", 0) for p in selected)

        turkish_words = [
            "tarih", "tarihi", "alışveriş", "alisveris",
            "müze", "muze", "doğa", "doga", "manzara", "öner",
        ]

        is_turkish = any(word in message for word in turkish_words)

        if is_turkish:
            reply = "Önerilen Günlük Plan:\n"
            for i, place in enumerate(selected, start=1):
                reply += f"{i}. {place['name']}\n"
            reply += f"\nTahmini toplam ziyaret süresi: {total_time} dakika"
        else:
            reply = "Recommended Day Plan:\n"
            for i, place in enumerate(selected, start=1):
                reply += f"{i}. {place['name']}\n"
            reply += f"\nEstimated total visit time: {total_time} min"

        return {
            "reply": reply,
            "places": [p["name"] for p in selected],
            "total_time": total_time,
        }

    if any(word in message for word in ["tarih", "tarihi", "alışveriş", "alisveris", "müze", "muze", "doğa", "doga", "manzara"]):
        return {
            "reply": "Tarih, park, alışveriş, müze, mimari, manzara veya doğa hakkında sorular sorabilirsin."
        }

    return {
        "reply": "You can ask about history, parks, shopping, museums, architecture, nature, or views in Istanbul."
    }


def distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)


@app.post("/route")
def optimize_route(payload: dict = Body(...)):
    place_names = payload.get("places", [])

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    selected_places = [p for p in places if p["name"] in place_names]

    if len(selected_places) < 2:
        return {"route": selected_places}

    route = [selected_places[0]]
    remaining = selected_places[1:]

    while remaining:
        last_place = route[-1]

        next_place = min(
            remaining,
            key=lambda p: distance(
                last_place["latitude"],
                last_place["longitude"],
                p["latitude"],
                p["longitude"],
            ),
        )

        route.append(next_place)
        remaining.remove(next_place)

    return {"route": route}


@app.get("/search")
def search_places(q: str):
    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    synonym_map = {
        "kapadokya": "cappadocia",
        "topkapi": "topkapi palace",
        "topkapi sarayi": "topkapi palace",
        "ayasofya": "hagia sophia",
        "anitkabir": "anitkabir",
        "efes": "ephesus",
        "pamukkale": "pamukkale",
        "sumela": "sumela monastery",
        "mevlana": "mevlana museum",
    }

    normalized_query = normalize_text(q)
    expanded_query = synonym_map.get(normalized_query, normalized_query)

    results = []

    for place in places:
        searchable_text = " ".join([
            place.get("name", ""),
            place.get("city", ""),
            place.get("district", ""),
            place.get("category", ""),
            place.get("subcategory", ""),
            " ".join(place.get("tags", [])),
            place.get("description", ""),
        ])

        normalized_place_text = normalize_text(searchable_text)

        if normalized_query in normalized_place_text or expanded_query in normalized_place_text:
            results.append(place)

    return results[:20]


@app.post("/ai-chat")
def ai_chat(payload: dict = Body(...)):
    message = payload.get("message", "")
    lang = get_lang(payload)

    detected_city = detect_city(message)
    detected_category = detect_category(message)
    detected_district = detect_district(message)

    language_rule_map = {
        "tr": "Respond in Turkish.",
        "en": "Respond in English.",
        "de": "Respond in German.",
        "ru": "Respond in Russian.",
    }
    language_rule = language_rule_map.get(lang, "Respond in English.")


    # ---------- EVENTS ----------
    if is_event_query(message) and detected_city:
        events_data = get_events(city=detected_city, limit=10)

        if not events_data:
            return {
                "reply": tr_text(lang, {
                    "tr": f"{detected_city.title()} için şu anda etkinlik bulunamadı.",
                    "en": f"No live events found for {detected_city.title()} right now.",
                    "de": f"Derzeit wurden keine Live-Events für {detected_city.title()} gefunden.",
                    "ru": f"Сейчас для {detected_city.title()} не найдено мероприятий.",
                }),
                "places": [],
                "days": [],
                "events": [],
                "total_time": 0
            }

        short_lines = []
        for event in events_data[:5]:
            short_lines.append(
                f"- {event['title']} | {event['venue']} | {event['date']} {event['time']}"
            )

        header = tr_text(lang, {
            "tr": f"{detected_city.title()} için etkinlikler:\n\n",
            "en": f"Here are live events in {detected_city.title()}:\n\n",
            "de": f"Hier sind aktuelle Events in {detected_city.title()}:\n\n",
            "ru": f"Вот актуальные мероприятия в {detected_city.title()}:\n\n",
        })

        return {
            "reply": header + "\n".join(short_lines),
            "places": [],
            "days": [],
            "events": events_data[:10],
            "total_time": 0
        }


    # ---------- HIDDEN GEMS ----------
    if is_hidden_gems_query(message) and detected_city:
        gems_response = hidden_gems(detected_city)
        gems = gems_response.get("places", [])

        if not gems:
            return {
                "reply": tr_text(lang, {
                    "tr": f"{detected_city.title()} için gizli kalmış yer bulunamadı.",
                    "en": f"No hidden gems found for {detected_city.title()} right now.",
                    "de": f"Keine Geheimtipps für {detected_city.title()} gefunden.",
                    "ru": f"Для {detected_city.title()} не найдено скрытых мест.",
                }),
                "places": [],
                "days": [],
                "events": [],
                "total_time": 0
            }

        gem_names = [g["name"] for g in gems[:5]]

        category_map = {
            "tr": {
                "restaurant": "restoran",
                "hotel": "otel",
                "attraction": "gezilecek yer",
                "cafe": "kafe",
                "museum": "müze",
            },
            "en": {
                "restaurant": "restaurant",
                "hotel": "hotel",
                "attraction": "attraction",
                "cafe": "cafe",
                "museum": "museum",
            },
            "de": {
                "restaurant": "Restaurant",
                "hotel": "Hotel",
                "attraction": "Sehenswürdigkeit",
                "cafe": "Café",
                "museum": "Museum",
            },
            "ru": {
                "restaurant": "ресторан",
                "hotel": "отель",
                "attraction": "достопримечательность",
                "cafe": "кафе",
                "museum": "музей",
            },
        }

        lines = []
        for gem in gems[:5]:
            cat = category_map.get(lang, {}).get(gem["category"], gem["category"])
            word_score = tr_text(lang, {
                "tr": "puan",
                "en": "score",
                "de": "Punktzahl",
                "ru": "оценка",
            })
            lines.append(f"- {gem['name']} ({cat}) • {word_score} {gem['hidden_gem_score']}")

        header = tr_text(lang, {
            "tr": f"{detected_city.title()} için gizli kalmış yerler:\n\n",
            "en": f"Here are some hidden gems in {detected_city.title()}:\n\n",
            "de": f"Hier sind einige Geheimtipps in {detected_city.title()}:\n\n",
            "ru": f"Вот несколько скрытых мест в {detected_city.title()}:\n\n",
        })

        return {
            "reply": header + "\n".join(lines),
            "places": gem_names,
            "days": [],
            "events": [],
            "total_time": 0
        }

    # ---------- PLACE / HOTEL / RESTAURANT AI ----------
    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    filtered_places = places

    if detected_city:
        allowed_cities = get_city_aliases(detected_city)
        filtered_places = [
            p for p in filtered_places
            if normalize_text(p.get("city", "")) in allowed_cities
        ]

    if detected_district:
        filtered_places = [
            p for p in filtered_places
            if detected_district in normalize_text(p.get("district", ""))
        ]

    if detected_category:
        narrowed = [
            p for p in filtered_places
            if normalize_text(p.get("category", "")) == detected_category
            or normalize_text(p.get("subcategory", "")) == detected_category
        ]
        if narrowed:
            filtered_places = narrowed

    place_names = [p["name"] for p in filtered_places]

    places_text = "\n".join(
        [
            f"{p.get('name', '')} | city={p.get('city', '')} | category={p.get('category', '')} | subcategory={p.get('subcategory', '')} | rating={p.get('rating', '')} | description={p.get('description', '')}"
            for p in filtered_places
        ]
    )

    prompt = f"""
You are an AI travel assistant for Turkey.

Use ONLY the places from the dataset below.
Do not invent places outside the dataset.

{language_rule}

Return valid JSON with this exact structure:

{{
  "reply": "short helpful answer for the user",
  "days": [
    {{
      "day": 1,
      "places": ["Place 1", "Place 2"]
    }}
  ]
}}

Rules:
- If the user asks for a multi-day plan, fill the "days" field.
- If the user asks a simple question like hotels, restaurants, or places in one city, return a normal short answer in "reply" and use "days": [].
- Mention place names exactly as they appear in the dataset.
- Output ONLY JSON. No markdown. No code block.

User request:
{message}

Dataset places:
{places_text}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    raw_text = response.output_text.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text.replace("```json", "", 1).strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```", "", 1).strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()

    try:
        parsed = json.loads(raw_text)
    except Exception:
        matched_place_names = []
        lower_reply = normalize_text(raw_text)

        for place in filtered_places:
            if normalize_text(place["name"]) in lower_reply:
                matched_place_names.append(place["name"])

        return {
            "reply": raw_text,
            "places": matched_place_names[:6],
            "days": [],
            "events": [],
            "total_time": 0,
        }

    reply = parsed.get("reply", "")
    days = parsed.get("days", [])

    flat_places = []

    for day_item in days:
        for place_name in day_item.get("places", []):
            if place_name in place_names and place_name not in flat_places:
                flat_places.append(place_name)

    if not flat_places:
        lower_reply = normalize_text(reply)
        for place in filtered_places:
            if normalize_text(place["name"]) in lower_reply and place["name"] not in flat_places:
                flat_places.append(place["name"])

    return {
        "reply": reply,
        "places": flat_places[:10],
        "days": days,
        "events": [],
        "total_time": 0,
    }
@app.get("/events")
def events(city: str = Query("Istanbul"), limit: int = Query(20)):
    try:
        data = get_events(city=city, limit=limit)
        return {
            "city": city,
            "count": len(data),
            "events": data
        }
    except Exception as e:
        return {
            "city": city,
            "count": 0,
            "events": [],
            "error": str(e)
        }





@app.get("/place-insight")
def place_insight(place: str, city: str = "", language: str = Query("en")):
    lang = get_lang(language)
    try:
        data = get_place_insight(place_name=place, city=city, language=lang)
        return data
    except Exception as e:
        return {
            "place": place,
            "city": city,
            "error": str(e),
        }

@app.get("/hidden-gems")
def hidden_gems(city: str):
    try:
        with open(PLACES_PATH, "r", encoding="utf-8") as f:
            places = json.load(f)

        normalized_city = normalize_text(city)
        allowed_cities = get_city_aliases(normalized_city)

        city_places = [
            p for p in places
            if normalize_text(p.get("city", "")) in allowed_cities
        ]

        scored = []
        major_landmarks = ["hagia sophia", "blue mosque", "topkapi palace", "galata tower", "dolmabahce palace", "basilica cistern"]

        for place in city_places:
            base_rating = float(place.get("rating", 0) or 0)
            place_name_lower = normalize_text(place.get("name", ""))

            # 🛑 ESKİ CANLI GOOGLE İSTEKLERİNİ KALDIRDIK!
            #places.json içindeki mevcut reviews dizisinin uzunluğunu kullanıyoruz (Sıfır network gecikmesi!)
            review_count = len(place.get("reviews", []))
            google_rating = base_rating # Eğer harici bir google_rating yoksa base_rating'i eşitle

            score = 0.0
            score += base_rating * 0.45
            score += google_rating * 0.35

            # İnceleme sayısına göre filtreleme (Lokal mekanları öne çıkarma)
            if review_count == 0:
                score += 1.5  # Hiç yorum yoksa gizlidir, puanı artır
            elif review_count < 5:
                score += 1.2
            elif review_count < 20:
                score += 0.8
            else:
                score -= 1.0  # Çok yorum varsa popülerdir, puanı kır

            if any(normalize_text(x) in place_name_lower for x in major_landmarks):
                score -= 2.5

            category = normalize_text(place.get("category", "") or "")
            if category in ["restaurant", "hotel", "cafe"]:
                score += 0.4

            if base_rating < 4.0:
                continue

            final_score = round(score, 2)

            scored.append({
                "id": place.get("id"),
                "name": place.get("name"),
                "city": place.get("city"),
                "district": place.get("district"),
                "category": place.get("category"),
                "subcategory": place.get("subcategory"),
                "rating": base_rating,
                "google_rating": google_rating,
                "review_count": review_count,
                "hidden_gem_score": final_score,
                "description": place.get("description"),
                "image": place.get("image"),
            })

        scored.sort(key=lambda x: x["hidden_gem_score"], reverse=True)

        return {
            "city": city,
            "count": len(scored[:10]),
            "places": scored[:10],
        }

    except Exception as e:
        return {
            "city": city,
            "count": 0,
            "places": [],
            "error": str(e),
        }

@app.get("/nearby")
def get_nearby(
    lat: float,
    lng: float,
    radius: float = 80,
    category: str = ""
):
    try:
        with open(PLACES_PATH, "r", encoding="utf-8") as f:
            places = json.load(f)

        results = []

        for place in places:
            p_lat = place.get("latitude")
            p_lng = place.get("longitude")

            if p_lat is None or p_lng is None:
                continue

            dist = math.sqrt((lat - p_lat) ** 2 + (lng - p_lng) ** 2) * 111

            if dist <= radius:
                if category and place.get("category") != category:
                    continue

                enriched_place = dict(place)
                enriched_place["image"] = build_image_url(
                    enriched_place.get("image", "")
                )
                enriched_place["distance_km"] = round(dist, 2)
                results.append(enriched_place)

        results.sort(key=lambda x: x["distance_km"])

        return {
            "count": len(results),
            "places": results[:30]
        }

    except Exception as e:
        return {
            "count": 0,
            "places": [],
            "error": str(e)
        }
@app.post("/trip-plan")
def trip_plan(payload: dict = Body(...)):
    city = payload.get("city", "").strip()
    days = int(payload.get("days", 1) or 1)
    interests = payload.get("interests", "").strip()
    lang = get_lang(payload)

    if days < 1:
        days = 1
    if days > 7:
        days = 7

    with open(PLACES_PATH, "r", encoding="utf-8") as f:
        places = json.load(f)

    normalized_city = normalize_text(city)
    allowed_cities = get_city_aliases(normalized_city)

    city_places = [
        p for p in places
        if normalize_text(p.get("city", "")) in allowed_cities
    ]

    if not city_places:
        return {
            "reply": f"{city} için veri bulunamadı.",
            "days": [],
            "places": []
        }

    places_text = "\n".join([
        f"{p.get('name','')} | category={p.get('category','')} | "
        f"subcategory={p.get('subcategory','')} | rating={p.get('rating','')} | "
        f"description={p.get('description','')}"
        for p in city_places[:250]
    ])

    language_rule_map = {
        "tr": "Respond in Turkish.",
        "en": "Respond in English.",
        "de": "Respond in German.",
        "ru": "Respond in Russian.",
    }

    language_rule = language_rule_map.get(lang, "Respond in English.")

    prompt = f"""
You are an AI travel planner for Turkey.

Use ONLY the places from the dataset below.
Do not invent places outside the dataset.

{language_rule}

Create a {days}-day trip plan for {city}.
User interests: {interests or "general travel, food, culture, nature"}.

Return ONLY valid JSON with this exact structure:

{{
  "reply": "short introduction",
  "days": [
    {{
      "day": 1,
      "title": "short day title",
      "places": ["Place 1", "Place 2", "Place 3"],
      "note": "short daily note"
    }}
  ]
}}

Rules:
- Use 3 or 4 places per day.
- Use place names exactly as written in the dataset.
- Prefer highly rated places.
- Balance attractions, restaurants/cafes and nature/historical places if possible.
- Do not use markdown.
- Output only JSON.

Dataset:
{places_text}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    raw_text = response.output_text.strip()

    if raw_text.startswith("```json"):
        raw_text = raw_text.replace("```json", "", 1).strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```", "", 1).strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()

    try:
        parsed = json.loads(raw_text)
    except Exception:
        return {
            "reply": raw_text,
            "days": [],
            "places": []
        }

    all_place_names = {p.get("name"): p for p in city_places}
    enriched_days = []
    flat_places = []

    for day_item in parsed.get("days", []):
        enriched_places = []

        for place_name in day_item.get("places", []):
            place = all_place_names.get(place_name)

            if place:
                enriched = dict(place)
                enriched["image"] = build_image_url(enriched.get("image", ""))
                enriched_places.append(enriched)

                if place_name not in flat_places:
                    flat_places.append(place_name)

        enriched_days.append({
            "day": day_item.get("day"),
            "title": day_item.get("title", ""),
            "note": day_item.get("note", ""),
            "places": enriched_places,
        })

    return {
        "reply": parsed.get("reply", ""),
        "days": enriched_days,
        "places": flat_places
    }