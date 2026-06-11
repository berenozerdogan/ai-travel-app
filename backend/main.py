from fastapi import FastAPI, Body, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import math
import os
import time
import logging
import sqlite3
from urllib.parse import unquote
from dotenv import load_dotenv

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:
    TfidfVectorizer = None

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


# 📜 LOGLAMA
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler()
    ],
)

# --- BAŞLATMA ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

DB_PATH = os.path.join(BASE_DIR, "tourism.db")

# SADECE places.json kullanılacak.
# places_translated.json artık kullanılmıyor.
PLACES_NORMAL_PATH = os.path.join(PROJECT_ROOT, "data", "places.json")
PLACES_PATH = PLACES_NORMAL_PATH

REVIEW_CACHE_PATH = os.path.join(BASE_DIR, "review_translation_cache.json")
NEARBY_CACHE = {}
CACHE_DURATION_SECONDS = 60 * 5

client = None
if OpenAI and os.getenv("OPENAI_API_KEY"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- OPSİYONEL SERVİSLER / FALLBACK ---
try:
    from query_utils import (
        normalize_text,
        detect_city,
        get_city_aliases,
        is_event_query,
        is_hidden_gems_query,
        detect_category,
        detect_district,
    )
except Exception:
    import unicodedata

    def normalize_text(value: str) -> str:
        value = str(value or "").lower().strip()
        value = unicodedata.normalize("NFKD", value)
        value = "".join(ch for ch in value if not unicodedata.combining(ch))
        value = value.replace("ı", "i").replace("İ", "i")
        return value

    def detect_city(message: str):
        m = normalize_text(message)
        for city in ["istanbul", "izmir", "ankara", "antalya"]:
            if city in m:
                return city
        return None

    def get_city_aliases(city: str):
        n = normalize_text(city)
        aliases = {
            "istanbul": ["istanbul"],
            "izmir": ["izmir"],
            "ankara": ["ankara"],
            "antalya": ["antalya"],
        }
        return aliases.get(n, [n])

    def detect_category(message: str):
        m = normalize_text(message)
        mapping = {
            "restaurant": ["restaurant", "restoran", "yemek"],
            "hotel": ["hotel", "otel"],
            "cafe": ["cafe", "kafe"],
            "museum": ["museum", "müze", "muze"],
            "shopping": ["shopping", "alışveriş", "alisveris"],
            "park": ["park"],
            "attraction": ["attraction", "gezilecek", "turistik"],
        }
        for key, words in mapping.items():
            if any(w in m for w in words):
                return key
        return None

    def detect_district(message: str):
        return None

    def is_event_query(message: str):
        return "event" in normalize_text(message) or "etkinlik" in normalize_text(message)

    def is_hidden_gems_query(message: str):
        return "hidden" in normalize_text(message) or "gizli" in normalize_text(message)


try:
    from events_service import get_events
except Exception:
    def get_events(city="Istanbul", limit=20):
        return []

try:
    from reviews_service import get_place_reviews
except Exception:
    def get_place_reviews(place_name: str):
        return {"found": False, "reviews": []}

try:
    from insight_service import get_place_insight
except Exception:
    def get_place_insight(place_name: str, city: str = "", language: str = "en"):
        return {
            "smart_score": None,
            "score_breakdown": {},
            "ai_insight": None,
            "web_mentions": [],
        }


# --- YARDIMCI FONKSİYONLAR ---
def get_localized(json_field, lang):
    try:
        if isinstance(json_field, dict):
            return json_field.get(lang) or json_field.get("en") or next(iter(json_field.values()), "")
        if isinstance(json_field, str):
            try:
                data = json.loads(json_field)
                if isinstance(data, dict):
                    return data.get(lang) or data.get("en") or next(iter(data.values()), "")
                return data
            except Exception:
                return json_field
        return json_field
    except Exception:
        return json_field


def get_lang(payload_or_value=None):
    if isinstance(payload_or_value, dict):
        lang = (payload_or_value.get("language") or "en").lower().strip()
    elif isinstance(payload_or_value, str):
        lang = payload_or_value.lower().strip()
    else:
        lang = "en"
    return lang if lang in ["tr", "en", "de", "ru"] else "en"


def tr_text(lang: str, texts: dict):
    return texts.get(lang) or texts.get("en") or ""


def build_image_url(image_url: str) -> str:
    if not image_url:
        return ""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
    if not api_key or "key=" in image_url:
        return image_url
    # Google Places photo media URL'leri API key isteyebilir.
    if "places.googleapis.com" in image_url:
        separator = "&" if "?" in image_url else "?"
        return f"{image_url}{separator}key={api_key}"
    return image_url


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(float(lat1)))
        * math.cos(math.radians(float(lat2)))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def safe_json_loads(value, default):
    try:
        if value is None:
            return default
        if isinstance(value, (list, dict)):
            return value
        return json.loads(value)
    except Exception:
        return default


def translate_review_text(text: str, lang: str):
    # Şimdilik yorum çevirisi yapmıyoruz; hata vermesin diye güvenli döndürüyoruz.
    return text or ""


def clean_old_cache():
    now = time.time()
    old_keys = [
        key for key, value in NEARBY_CACHE.items()
        if now - value.get("time", 0) > CACHE_DURATION_SECONDS
    ]
    for key in old_keys:
        NEARBY_CACHE.pop(key, None)


# --- DATABASE ---
def init_db_from_json():
    logging.info(f"DEBUG: Veritabanı dosyası: {DB_PATH}")
    logging.info(f"DEBUG: JSON dosyası: {PLACES_PATH}")

    if not os.path.exists(PLACES_PATH):
        logging.error("❌ HATA: JSON dosyası bulunamadı.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("DROP TABLE IF EXISTS places")
        cursor.execute("""
            CREATE TABLE places (
                id INTEGER PRIMARY KEY,
                name TEXT,
                city TEXT,
                district TEXT,
                category TEXT,
                subcategory TEXT,
                latitude REAL,
                longitude REAL,
                rating REAL,
                review_count INTEGER,
                price_level TEXT,
                description TEXT,
                image TEXT,
                source TEXT,
                reviews_json TEXT,
                tags_json TEXT,
                estimated_visit_time INTEGER
            )
        """)

        with open(PLACES_PATH, "r", encoding="utf-8") as f:
            places_data = json.load(f)

        logging.info(f"DEBUG: {len(places_data)} adet yer yüklendi.")

        for p in places_data:
            name_raw = p.get("name", "")
            desc_raw = p.get("description", "")

            name_val = json.dumps(name_raw, ensure_ascii=False) if isinstance(name_raw, (dict, list)) else json.dumps({"en": name_raw}, ensure_ascii=False)
            desc_val = json.dumps(desc_raw, ensure_ascii=False) if isinstance(desc_raw, (dict, list)) else json.dumps({"en": desc_raw}, ensure_ascii=False)

            cursor.execute("""
                INSERT OR REPLACE INTO places (
                    id, name, city, district, category, subcategory,
                    latitude, longitude, rating, review_count, price_level,
                    description, image, source, reviews_json, tags_json,
                    estimated_visit_time
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p.get("id"),
                name_val,
                p.get("city", ""),
                p.get("district", ""),
                p.get("category", ""),
                p.get("subcategory", ""),
                p.get("latitude"),
                p.get("longitude"),
                p.get("rating", 0),
                p.get("review_count", 0),
                p.get("price_level", "unknown"),
                desc_val,
                p.get("image", ""),
                p.get("source", ""),
                json.dumps(p.get("reviews", []), ensure_ascii=False),
                json.dumps(p.get("tags", []), ensure_ascii=False),
                p.get("estimated_visit_time", 60),
            ))

        conn.commit()
        logging.info("✅ Veritabanı başarıyla oluşturuldu.")
    except Exception as e:
        logging.error(f"❌ KRİTİK VERİTABANI HATASI: {e}")
    finally:
        conn.close()


def get_places_from_db(lang="en"):
    if not os.path.exists(DB_PATH):
        init_db_from_json()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM places")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        p = dict(r)
        results.append({
            "id": p["id"],
            "name": get_localized(p["name"], lang),
            "city": p.get("city", ""),
            "district": p.get("district", ""),
            "category": p.get("category", ""),
            "subcategory": p.get("subcategory", ""),
            "latitude": p.get("latitude"),
            "longitude": p.get("longitude"),
            "rating": p.get("rating"),
            "review_count": p.get("review_count", 0),
            "price_level": p.get("price_level", "unknown"),
            "description": get_localized(p["description"], lang),
            "image": build_image_url(p.get("image", "")),
            "source": p.get("source", ""),
            "reviews": safe_json_loads(p.get("reviews_json"), []),
            "tags": safe_json_loads(p.get("tags_json"), []),
            "estimated_visit_time": p.get("estimated_visit_time") or 60,
        })
    return results


def get_place_from_db(place_name: str, lang="en"):
    target = normalize_text(unquote(str(place_name or "")))
    all_places = get_places_from_db(lang=lang)

    # Önce seçili dilde ara.
    place = next((p for p in all_places if normalize_text(p["name"]) == target), None)
    if place:
        return place

    place = next((p for p in all_places if target in normalize_text(p["name"]) or normalize_text(p["name"]) in target), None)
    if place:
        return place

    # Bulamazsa İngilizce isimlerde ara, ama cevabı seçili dilde döndür.
    en_places = get_places_from_db(lang="en")
    en_match = next((p for p in en_places if normalize_text(p["name"]) == target), None)
    if not en_match:
        en_match = next((p for p in en_places if target in normalize_text(p["name"]) or normalize_text(p["name"]) in target), None)

    if en_match:
        return next((p for p in all_places if p["id"] == en_match["id"]), None)

    return None


@app.on_event("startup")
async def startup_event():
    init_db_from_json()
    logging.info("🚀 Uygulama başladı ve veritabanı kuruldu.")


@app.get("/")
def home():
    return {
        "message": "AI Tourism Backend Running",
        "db_path": DB_PATH,
        "places_path": PLACES_PATH,
    }


@app.get("/places")
def get_all_places(language: str = Query("en")):
    lang = get_lang(language)
    return get_places_from_db(lang=lang)


# ✅ Detay sayfası için asıl kullanacağımız endpoint budur.
@app.get("/place-by-id/{place_id}")
def get_place_by_id(place_id: int, language: str = Query("en")):
    lang = get_lang(language)
    all_places = get_places_from_db(lang=lang)

    place = next((p for p in all_places if int(p.get("id")) == int(place_id)), None)

    if not place:
        logging.warning(f"❌ ID ile mekan bulunamadı: {place_id}")
        return {"error": "Place not found"}

    return place


# Eski name endpoint'i de dursun; başka sayfaların bozulmasını engeller.
@app.get("/places/{place_name}")
def get_single_place(place_name: str, language: str = Query("en")):
    lang = get_lang(language)
    target = unquote(place_name).strip()
    place = get_place_from_db(target, lang=lang)

    if not place:
        logging.warning(f"❌ Mekan bulunamadı: {target}")
        return {"error": "Place not found"}

    return place


@app.get("/analyze/{place_name}")
def analyze_place(place_name: str, language: str = Query("en")):
    lang = get_lang(language)
    p_data = get_place_from_db(place_name, lang=lang)

    if not p_data:
        return {"error": "Place not found"}

    reviews = p_data.get("reviews", [])
    if not reviews:
        return {"place": p_data["name"], "keywords": [], "review_count": 0}

    if not TfidfVectorizer:
        return {"place": p_data["name"], "keywords": [], "review_count": len(reviews)}

    vectorizer = TfidfVectorizer(stop_words="english")
    x = vectorizer.fit_transform(reviews)

    scores = x.sum(axis=0).A1
    words = vectorizer.get_feature_names_out()

    word_scores = list(zip(words, scores))
    word_scores.sort(key=lambda item: item[1], reverse=True)

    top_keywords = [word for word, _score in word_scores[:5]]

    return {
        "place": p_data["name"],
        "keywords": top_keywords,
        "review_count": len(reviews),
    }


@app.get("/summary/{place_name}")
def summarize_place(place_name: str, language: str = Query("en")):
    lang = get_lang(language)
    p_data = get_place_from_db(place_name, lang=lang)

    if not p_data:
        return {"error": "Place not found"}

    reviews = p_data.get("reviews", [])
    if not reviews:
        return {
            "place": p_data["name"],
            "summary": tr_text(lang, {
                "tr": "Yorum bulunamadı.",
                "en": "No reviews available.",
                "de": "Keine Bewertungen verfügbar.",
                "ru": "Отзывы недоступны.",
            }),
        }

    positive_words = ["amazing", "beautiful", "great", "impressive", "nice", "harika", "güzel", "muhteşem"]
    negative_words = ["crowded", "queue", "expensive", "busy", "kalabalık", "sıra", "pahalı"]

    full_text = " ".join(reviews).lower()

    positive_count = sum(full_text.count(word) for word in positive_words)
    negative_count = sum(full_text.count(word) for word in negative_words)

    summary = tr_text(lang, {
        "tr": f"{p_data['name']} ziyaretçileri genel olarak deneyimden memnun. Olumlu yorum sayısı: {positive_count}.",
        "en": f"Visitors generally enjoy {p_data['name']}. Positive mentions: {positive_count}.",
        "de": f"Besucher schätzen im Allgemeinen {p_data['name']}.",
        "ru": f"Посетители в целом высоко оценивают {p_data['name']}.",
    })

    if negative_count > 0 and lang == "tr":
        summary += f" Ancak {negative_count} yorumda kalabalık, sıra veya fiyat gibi konular geçiyor."

    return {
        "place": p_data["name"],
        "summary": summary,
        "positive_mentions": positive_count,
        "negative_mentions": negative_count,
    }


@app.get("/reviews")
def reviews(place: str, language: str = Query("en")):
    lang = get_lang(language)

    p_data = get_place_from_db(place, lang="en")
    search_name = p_data["name"] if p_data else place

    try:
        data = get_place_reviews(search_name)

        if not data or not data.get("reviews"):
            return {
                "found": False,
                "query": search_name,
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
        data["place_name"] = search_name

        return data

    except Exception as e:
        logging.error(f"🚨 İnceleme Hatası: {str(e)}")
        return {"found": False, "error": str(e)}


@app.get("/place-insight")
def place_insight(place: str, city: str = "", language: str = Query("en")):
    lang = get_lang(language)

    p_data = get_place_from_db(place, lang="en")
    search_name = p_data["name"] if p_data else place

    try:
        insight = get_place_insight(place_name=search_name, city=city, language=lang)
        return {
            "place": search_name,
            "insight": insight,
            **(insight if isinstance(insight, dict) else {}),
        }
    except Exception as e:
        logging.error(f"🚨 Insight servis hatası: {str(e)}")
        return {
            "place": search_name,
            "smart_score": None,
            "score_breakdown": {},
            "ai_insight": None,
            "web_mentions": [],
            "insight": tr_text(lang, {
                "tr": "Bu mekan için analiz bilgisi şu an alınamıyor.",
                "en": "Insight information is currently unavailable for this place.",
                "de": "Insight-Informationen sind derzeit nicht verfügbar.",
                "ru": "Аналитическая информация сейчас недоступна.",
            }),
        }


@app.post("/chat")
def chat_with_ai(payload: dict = Body(...)):
    message = payload.get("message", "").lower()
    lang = get_lang(payload)

    keyword_map = {
        "tarih": "history", "tarihi": "history", "historical": "history", "history": "history",
        "alışveriş": "shopping", "alisveris": "shopping", "shopping": "shopping", "shop": "shopping",
        "park": "park", "doğa": "nature", "doga": "nature", "nature": "nature", "natural": "nature",
        "müze": "museum", "muze": "museum", "museum": "museum", "museums": "museum",
        "manzara": "view", "view": "view", "views": "view", "scenic": "view",
        "architecture": "architecture", "architectural": "architecture", "mimari": "architecture",
        "restaurant": "restaurant", "restoran": "restaurant", "otel": "hotel", "hotel": "hotel",
    }

    detected_intents = []
    for key, value in keyword_map.items():
        if key in message and value not in detected_intents:
            detected_intents.append(value)

    places_list = get_places_from_db(lang=lang)
    matched_places = []

    for place in places_list:
        tags = [str(t).lower() for t in place.get("tags", [])]
        category = str(place.get("category", "")).lower()
        subcategory = str(place.get("subcategory", "")).lower()
        description = str(place.get("description", "")).lower()

        if (
            ("history" in detected_intents and ("history" in tags or category in ["historical", "attraction"] or "ottoman" in tags or "history" in description))
            or ("park" in detected_intents and category == "park")
            or ("shopping" in detected_intents and (category == "shopping" or "shopping" in tags or "street" in tags))
            or ("museum" in detected_intents and (category == "museum" or subcategory == "museum"))
            or ("architecture" in detected_intents and ("architecture" in tags or category == "historical" or "architecture" in description))
            or ("nature" in detected_intents and ("nature" in tags or category == "park" or "relax" in tags))
            or ("view" in detected_intents and ("view" in tags or "bosphorus" in tags or "landmark" in tags or "panoramic" in description))
            or ("restaurant" in detected_intents and category == "restaurant")
            or ("hotel" in detected_intents and category == "hotel")
        ):
            matched_places.append(place)

    if matched_places:
        matched_places = sorted(matched_places, key=lambda x: x.get("rating") or 0, reverse=True)
        selected = matched_places[:3]
        total_time = sum(int(p.get("estimated_visit_time") or 0) for p in selected)

        if lang == "tr":
            reply = "Önerilen Günlük Plan:\n" + "\n".join([f"{i}. {p['name']}" for i, p in enumerate(selected, 1)])
            reply += f"\n\nTahmini toplam ziyaret süresi: {total_time} dakika"
        else:
            reply = "Recommended Day Plan:\n" + "\n".join([f"{i}. {p['name']}" for i, p in enumerate(selected, 1)])
            reply += f"\n\nEstimated total visit time: {total_time} min"

        return {
            "reply": reply,
            "places": selected,
            "total_time": total_time,
        }

    return {
        "reply": tr_text(lang, {
            "tr": "Tarih, park, alışveriş, müze, mimari, doğa, manzara, restoran veya otel hakkında soru sorabilirsin.",
            "en": "You can ask about history, parks, shopping, museums, architecture, nature, views, restaurants, or hotels.",
            "de": "Du kannst nach Geschichte, Parks, Shopping, Museen, Architektur, Natur, Aussicht, Restaurants oder Hotels fragen.",
            "ru": "Вы можете спросить об истории, парках, магазинах, музеях, архитектуре, природе, видах, ресторанах или отелях.",
        })
    }


@app.post("/route")
def optimize_route(payload: dict = Body(...)):
    place_names = payload.get("places", [])
    lang = get_lang(payload)

    places_list = get_places_from_db(lang=lang)
    normalized_names = [normalize_text(n) for n in place_names]

    selected_places = [
        p for p in places_list
        if normalize_text(p["name"]) in normalized_names
    ]

    if len(selected_places) < 2:
        return {"route": selected_places}

    route = [selected_places[0]]
    remaining = selected_places[1:]

    while remaining:
        last_place = route[-1]
        next_place = min(
            remaining,
            key=lambda p: haversine_distance(
                last_place["latitude"],
                last_place["longitude"],
                p["latitude"],
                p["longitude"],
            ),
        )
        route.append(next_place)
        remaining.remove(next_place)

    return {"route": route}


@app.post("/ai-chat")
def ai_chat(payload: dict = Body(...)):
    message = payload.get("message", "")
    lang = get_lang(payload)

    places_list = get_places_from_db(lang=lang)

    detected_city = detect_city(message)
    detected_category = detect_category(message)
    detected_district = detect_district(message)

    filtered_places = places_list

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
        filtered_places = [
            p for p in filtered_places
            if normalize_text(p.get("category", "")) == detected_category
            or normalize_text(p.get("subcategory", "")) == detected_category
        ]

    if not filtered_places:
        return {
            "reply": tr_text(lang, {
                "tr": "Bu kritere uygun mekan bulamadım.",
                "en": "I couldn't find any places matching this criteria.",
                "de": "Ich konnte keine passenden Orte finden.",
                "ru": "Я не нашел подходящих мест.",
            }),
            "places": [],
            "days": [],
        }

    # OpenAI yoksa güvenli fallback.
    if not client:
        selected = sorted(filtered_places, key=lambda p: p.get("rating") or 0, reverse=True)[:5]
        return {
            "reply": tr_text(lang, {
                "tr": "API anahtarı olmadığı için en yüksek puanlı mekanları listeledim.",
                "en": "No API key found, so I listed the top-rated places.",
                "de": "Kein API-Schlüssel gefunden, daher liste ich die bestbewerteten Orte auf.",
                "ru": "API-ключ не найден, поэтому я показал места с высоким рейтингом.",
            }),
            "places": selected,
            "days": [{"day": 1, "places": selected}],
        }

    places_text = "\n".join([
        f"{p.get('name', '')} | category={p.get('category', '')} | rating={p.get('rating', '')}"
        for p in filtered_places[:100]
    ])

    language_rule = {
        "tr": "Cevabını Türkçe ver.",
        "en": "Respond in English.",
        "de": "Antworte auf Deutsch.",
        "ru": "Ответьте на русском.",
    }.get(lang, "Respond in English.")

    prompt = f"""
Sen bir Türkiye turizm asistanısın. Sadece aşağıdaki veri setindeki yerleri kullan.
{language_rule}

Kullanıcı isteği: {message}

Mekanlar:
{places_text}

Kurallar:
Sadece JSON formatında yanıt ver:
{{"reply": "...", "days": [{{"day": 1, "places": ["..."]}}]}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen yardımsever bir turizm asistanısın."},
                {"role": "user", "content": prompt},
            ],
        )

        raw_text = response.choices[0].message.content.strip()
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)

        days = parsed.get("days", [])
        flat_names = []
        for day in days:
            for name in day.get("places", []):
                if name not in flat_names:
                    flat_names.append(name)

        enriched_places = []
        for name in flat_names:
            found = next(
                (p for p in filtered_places if normalize_text(p["name"]) == normalize_text(name)),
                None,
            )
            if found:
                enriched_places.append(found)

        return {
            "reply": parsed.get("reply", ""),
            "places": enriched_places[:10],
            "days": days,
        }

    except Exception as e:
        logging.error(f"AI chat hata: {e}")
        selected = sorted(filtered_places, key=lambda p: p.get("rating") or 0, reverse=True)[:5]
        return {
            "reply": tr_text(lang, {
                "tr": "Yapay zeka yanıtı alınamadı, en iyi mekanları listeledim.",
                "en": "AI response failed, so I listed the best places.",
                "de": "KI-Antwort fehlgeschlagen, daher liste ich die besten Orte auf.",
                "ru": "Ответ ИИ не получен, поэтому я показал лучшие места.",
            }),
            "places": selected,
            "days": [{"day": 1, "places": selected}],
        }


@app.get("/events")
def events(city: str = Query("Istanbul"), limit: int = Query(20), language: str = Query("en")):
    lang = get_lang(language)

    try:
        data = get_events(city=city, limit=limit)

        if not data:
            return {
                "city": city,
                "count": 0,
                "events": [],
                "message": tr_text(lang, {
                    "tr": f"{city} için şu an etkinlik bulunamadı.",
                    "en": f"No events found for {city} right now.",
                    "de": f"Für {city} wurden derzeit keine Veranstaltungen gefunden.",
                    "ru": f"Для {city} сейчас нет событий.",
                }),
            }

        return {
            "city": city,
            "count": len(data),
            "events": data,
        }
    except Exception as e:
        logging.error(f"🚨 Etkinlik servis hatası: {str(e)}")
        return {
            "city": city,
            "count": 0,
            "events": [],
            "message": tr_text(lang, {
                "tr": "Etkinlikler şu an alınamıyor.",
                "en": "Events could not be fetched.",
                "de": "Veranstaltungen konnten nicht geladen werden.",
                "ru": "Не удалось получить события.",
            }),
        }


@app.get("/hidden-gems")
def hidden_gems(city: str, language: str = Query("en")):
    lang = get_lang(language)

    try:
        places_list = get_places_from_db(lang=lang)
        normalized_city = normalize_text(city)
        allowed_cities = get_city_aliases(normalized_city)

        city_places = [
            p for p in places_list
            if normalize_text(p.get("city", "")) in allowed_cities
        ]

        scored = []
        major_landmarks = [
            "hagia sophia", "blue mosque", "topkapi palace",
            "galata tower", "dolmabahce palace", "basilica cistern"
        ]

        for place in city_places:
            base_rating = float(place.get("rating") or 0)
            place_name_lower = normalize_text(place.get("name", ""))
            review_count = int(place.get("review_count") or 0)

            score = 0.0
            score += base_rating * 0.8

            if review_count == 0:
                score += 1.5
            elif review_count < 50:
                score += 1.2
            elif review_count < 300:
                score += 0.5
            else:
                score -= 0.5

            if any(normalize_text(x) in place_name_lower for x in major_landmarks):
                score -= 2.5

            category = normalize_text(place.get("category", "") or "")
            if category in ["restaurant", "hotel", "cafe"]:
                score += 0.4

            if base_rating < 4.0:
                continue

            scored.append({
                **place,
                "hidden_gem_score": round(score, 2),
            })

        scored.sort(key=lambda x: x["hidden_gem_score"], reverse=True)

        return {
            "city": city,
            "language": lang,
            "count": len(scored[:10]),
            "places": scored[:10],
        }

    except Exception as e:
        logging.error(f"🚨 Hidden Gems hata: {str(e)}")
        return {"city": city, "count": 0, "places": [], "error": str(e)}


@app.get("/nearby")
def get_nearby(
    lat: float,
    lng: float,
    radius: float = 80,
    category: str = "",
    language: str = Query("en")
):
    lang = get_lang(language)
    clean_old_cache()
    current_time = time.time()

    cache_key = (round(lat, 2), round(lng, 2), category, lang)
    if cache_key in NEARBY_CACHE:
        cache_item = NEARBY_CACHE[cache_key]
        if current_time - cache_item["time"] < CACHE_DURATION_SECONDS:
            return cache_item["data"]

    try:
        places = get_places_from_db(lang=lang)
        results = []

        for p in places:
            if p.get("latitude") is None or p.get("longitude") is None:
                continue

            if category and normalize_text(p.get("category", "")) != normalize_text(category):
                continue

            dist = haversine_distance(lat, lng, p["latitude"], p["longitude"])

            if dist <= radius:
                results.append({
                    **p,
                    "distance_km": round(dist, 2),
                })

        results.sort(key=lambda x: x["distance_km"])
        response_data = {"count": len(results), "places": results[:30]}

        NEARBY_CACHE[cache_key] = {"time": current_time, "data": response_data}
        return response_data

    except Exception as e:
        logging.error(f"🚨 Nearby Hatası: {str(e)}")
        return {"count": 0, "places": [], "error": str(e)}


@app.post("/trip-plan")
def trip_plan(payload: dict = Body(...)):
    city = payload.get("city", "").strip()
    days_count = min(max(int(payload.get("days", 1) or 1), 1), 7)
    lang = get_lang(payload)

    places_list = get_places_from_db(lang=lang)

    normalized_city = normalize_text(city)
    allowed_cities = get_city_aliases(normalized_city)

    city_places = [
        p for p in places_list
        if normalize_text(p.get("city", "")) in allowed_cities
    ]

    if not city_places:
        return {
            "reply": tr_text(lang, {
                "tr": f"{city} için veri yok.",
                "en": f"No data for {city}.",
                "de": f"Keine Daten für {city}.",
                "ru": f"Нет данных для {city}.",
            }),
            "days": [],
            "places": [],
        }

    sorted_places = sorted(city_places, key=lambda p: p.get("rating") or 0, reverse=True)
    per_day = max(1, min(4, math.ceil(len(sorted_places[:days_count * 4]) / days_count)))

    plan_days = []
    used_places = []

    for i in range(days_count):
        day_places = sorted_places[i * per_day:(i + 1) * per_day]
        used_places.extend(day_places)
        plan_days.append({
            "day": i + 1,
            "places": day_places,
        })

    return {
        "reply": tr_text(lang, {
            "tr": f"{city} için {days_count} günlük gezi planı hazır.",
            "en": f"{days_count}-day trip plan for {city} is ready.",
            "de": f"{days_count}-Tage-Reiseplan für {city} ist bereit.",
            "ru": f"План поездки на {days_count} дней для {city} готов.",
        }),
        "days": plan_days,
        "places": used_places,
    }

# --- EK ÖZELLİKLER: BÜTÇE, HAVA DURUMU, ACİL BİLGİ ---
def _budget_category_multiplier(category: str, subcategory: str = ""):
    c = normalize_text(category or "")
    s = normalize_text(subcategory or "")
    if c == "hotel":
        return 1.0
    if c in ["restaurant", "cafe"]:
        return 0.45
    if c in ["shopping"]:
        return 0.65
    if c in ["museum", "attraction"] or s in ["museum", "historical"]:
        return 0.25
    return 0.2

@app.post("/budget-estimate")
def budget_estimate(payload: dict = Body(...)):
    lang = get_lang(payload)
    places = payload.get("places", []) or []
    days = max(int(payload.get("days", 1) or 1), 1)
    traveler_count = max(int(payload.get("traveler_count", 1) or 1), 1)

    if not places:
        return {
            "currency": "TRY",
            "min_total": 0,
            "max_total": 0,
            "daily_average": 0,
            "breakdown": [],
            "note": tr_text(lang, {"tr": "Bütçe için rota veya mekan seçmelisin.", "en": "Select places or a route to estimate a budget."})
        }

    breakdown = []
    min_total = 0
    max_total = 0

    for p in places:
        category = p.get("category", "")
        subcategory = p.get("subcategory", "")
        multiplier = _budget_category_multiplier(category, subcategory)
        visit_time = int(p.get("estimated_visit_time", 60) or 60)
        rating_bonus = 1.15 if float(p.get("rating", 0) or 0) >= 4.7 else 1.0

        # Basit ve savunulabilir tahmin: kategori + süre + puan etkisi.
        low = int((180 + visit_time * 3) * multiplier * rating_bonus)
        high = int((420 + visit_time * 5) * multiplier * rating_bonus)

        if category == "hotel":
            low, high = 1800, 4200
        elif category in ["restaurant", "cafe"]:
            low, high = 350, 1100
        elif category == "shopping":
            low, high = 500, 2500

        min_total += low * traveler_count
        max_total += high * traveler_count
        breakdown.append({
            "place": p.get("name"),
            "category": category,
            "min": low * traveler_count,
            "max": high * traveler_count,
        })

    daily_average = int(((min_total + max_total) / 2) / days)
    return {
        "currency": "TRY",
        "min_total": min_total,
        "max_total": max_total,
        "daily_average": daily_average,
        "traveler_count": traveler_count,
        "days": days,
        "breakdown": breakdown,
        "note": tr_text(lang, {
            "tr": "Bu tutarlar yaklaşık tahmindir; ulaşım, sezon ve kişisel harcamalara göre değişebilir.",
            "en": "These are rough estimates and may vary by transport, season and personal spending.",
            "de": "Dies sind grobe Schätzungen und können je nach Transport, Saison und persönlichen Ausgaben variieren.",
            "ru": "Это примерная оценка; сумма зависит от транспорта, сезона и личных расходов."
        })
    }

@app.get("/weather-advice")
def weather_advice(lat: float = Query(...), lng: float = Query(...), language: str = Query("tr")):
    lang = get_lang(language)
    try:
        import urllib.request
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,precipitation,weather_code&timezone=auto"
        with urllib.request.urlopen(url, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
        current = data.get("current", {})
        temp = current.get("temperature_2m")
        precipitation = current.get("precipitation", 0) or 0
        weather_code = current.get("weather_code", 0)
        rainy = precipitation > 0 or weather_code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]
        hot = temp is not None and temp >= 30
        cold = temp is not None and temp <= 8

        if rainy:
            advice = tr_text(lang, {
                "tr": "Bugün yağış ihtimali var. Müze, kapalı tarihi mekanlar, kafeler ve alışveriş noktaları daha iyi olabilir.",
                "en": "There may be rain today. Museums, indoor historic sites, cafés and shopping spots may be better choices.",
                "de": "Heute kann es regnen. Museen, geschlossene historische Orte, Cafés und Einkaufsorte sind gute Optionen.",
                "ru": "Сегодня возможен дождь. Лучше выбрать музеи, крытые исторические места, кафе и торговые точки."
            })
        elif hot:
            advice = tr_text(lang, {
                "tr": "Bugün hava sıcak. Sabah erken saatlerde açık alanları gezip öğlen kapalı/serin mekanlara geçmeni öneririm.",
                "en": "It is hot today. Visit outdoor places early, then switch to indoor or cooler spots around noon.",
                "de": "Heute ist es heiß. Besuche Außenbereiche früh und wechsle mittags zu kühleren Orten.",
                "ru": "Сегодня жарко. Лучше гулять утром, а днем выбрать прохладные закрытые места."
            })
        elif cold:
            advice = tr_text(lang, {
                "tr": "Bugün hava serin. Kısa yürüyüşler, müzeler ve sıcak içecek molalarıyla plan yapmak iyi olur.",
                "en": "It is chilly today. Short walks, museums and warm drink breaks would work well.",
                "de": "Heute ist es kühl. Kurze Spaziergänge, Museen und warme Pausen passen gut.",
                "ru": "Сегодня прохладно. Подойдут короткие прогулки, музеи и перерывы с горячими напитками."
            })
        else:
            advice = tr_text(lang, {
                "tr": "Hava gezi için uygun görünüyor. Açık alanlar, manzara noktaları ve yürüyüş rotaları iyi seçenekler.",
                "en": "The weather looks suitable for sightseeing. Outdoor spots, viewpoints and walking routes are good options.",
                "de": "Das Wetter ist gut für Besichtigungen. Aussichtspunkte und Spaziergänge sind gute Optionen.",
                "ru": "Погода подходит для прогулок. Открытые места, смотровые площадки и пешие маршруты — хороший выбор."
            })

        return {"temperature": temp, "precipitation": precipitation, "weather_code": weather_code, "advice": advice}
    except Exception as e:
        logging.error(f"Weather advice error: {str(e)}")
        return {"temperature": None, "precipitation": None, "weather_code": None, "advice": tr_text(lang, {"tr": "Hava durumu şu an alınamadı.", "en": "Weather advice is currently unavailable."})}

@app.get("/useful-info")
def useful_info(lat: float = Query(...), lng: float = Query(...), language: str = Query("tr")):
    lang = get_lang(language)
    labels = {
        "tr": {"hospital": "Yakındaki hastaneler", "pharmacy": "Yakındaki eczaneler", "police": "Yakındaki polis merkezleri", "transport": "Yakındaki toplu taşıma"},
        "en": {"hospital": "Nearby hospitals", "pharmacy": "Nearby pharmacies", "police": "Nearby police stations", "transport": "Nearby public transport"},
        "de": {"hospital": "Krankenhäuser in der Nähe", "pharmacy": "Apotheken in der Nähe", "police": "Polizeistationen in der Nähe", "transport": "Öffentliche Verkehrsmittel in der Nähe"},
        "ru": {"hospital": "Больницы рядом", "pharmacy": "Аптеки рядом", "police": "Полиция рядом", "transport": "Общественный транспорт рядом"},
    }.get(lang, {})
    def maps_url(q):
        return f"https://www.google.com/maps/search/{q}/@{lat},{lng},15z"
    return {
        "items": [
            {"type": "hospital", "label": labels.get("hospital", "Nearby hospitals"), "url": maps_url("hospital")},
            {"type": "pharmacy", "label": labels.get("pharmacy", "Nearby pharmacies"), "url": maps_url("pharmacy")},
            {"type": "police", "label": labels.get("police", "Nearby police stations"), "url": maps_url("police")},
            {"type": "transport", "label": labels.get("transport", "Nearby public transport"), "url": maps_url("public transport")},
        ]
    }
