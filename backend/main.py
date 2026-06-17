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


def _place_ai_insight_fallback(p_data: dict, lang: str):
    name = p_data.get("name", "")
    city = p_data.get("city", "")
    district = p_data.get("district", "")
    category = normalize_text(p_data.get("category", ""))
    subcategory = normalize_text(p_data.get("subcategory", ""))
    description = p_data.get("description", "")

    is_hotel = category == "hotel"
    is_food = category in ["restaurant", "cafe"]
    is_museum = category == "museum" or subcategory == "museum"
    is_nature = subcategory in ["nature", "beach", "viewpoint"] or category in ["park", "nature"]
    is_historical = subcategory in ["historical", "landmark"] or any(
        word in normalize_text(description)
        for word in ["tarih", "historical", "history", "palace", "saray", "mosque", "cami", "castle", "kale"]
    )

    if lang == "tr":
        if is_hotel:
            return {
                "summary": f"{name}, {city} içinde konaklama için değerlendirilebilecek bir oteldir. Konumu, ulaşım kolaylığı ve çevresindeki gezi noktalarına yakınlığı rota planı yaparken avantaj sağlayabilir.",
                "best_for": ["Konaklama odaklı seyahat edenler", "Şehir içinde rahat ulaşım isteyenler"],
                "strengths": ["Konaklama için pratik bir durak olması", "Yakındaki gezi noktalarıyla birlikte planlanabilmesi", "Şehir rotasına kolayca eklenebilmesi"],
                "watch_out": ["Fiyatlar sezona göre değişebilir", "Rezervasyon ve müsaitlik önceden kontrol edilmelidir"],
            }
        if is_food:
            return {
                "summary": f"{name}, {city} içinde yeme içme molası için tercih edilebilecek bir mekandır. Gezi sırasında kısa bir dinlenme veya öğün molası için rotaya eklenebilir.",
                "best_for": ["Yeme içme molası vermek isteyenler", "Yakındaki yerleri gezerken kısa ara planlayanlar"],
                "strengths": ["Rota içinde mola noktası olarak kullanılabilmesi", "Yakındaki mekanlarla birlikte kolay planlanması", "Günlük gezi akışını desteklemesi"],
                "watch_out": ["Yoğun saatlerde yer bulmak zor olabilir", "Fiyat ve menü bilgisi gitmeden önce kontrol edilmelidir"],
            }
        if is_museum:
            return {
                "summary": f"{name}, {city} içinde kültür ve tarih odaklı gezi yapmak isteyenler için uygun bir müzedir. Ziyaret sırasında bölgenin geçmişi, sanatı veya kültürel yapısı hakkında bilgi edinilebilir.",
                "best_for": ["Kültür ve tarih meraklıları", "Müze gezmeyi seven ziyaretçiler"],
                "strengths": ["Bilgi verici ve öğretici bir durak olması", "Kültür rotalarına kolayca eklenebilmesi", "Kapalı mekan alternatifi sunması"],
                "watch_out": ["Ziyaret saatleri önceden kontrol edilmelidir", "Yoğun dönemlerde kalabalık olabilir"],
            }
        if is_nature:
            return {
                "summary": f"{name}, {city} içinde açık alan ve manzara odaklı bir gezi noktasıdır. Yürüyüş, fotoğraf çekimi ve kısa keşifler için rotaya eklenebilir.",
                "best_for": ["Doğa ve manzara sevenler", "Açık alanda vakit geçirmek isteyenler"],
                "strengths": ["Fotoğraf için uygun bir ortam sunması", "Açık hava rotalarına uyum sağlaması", "Kısa keşifler için ideal olması"],
                "watch_out": ["Hava durumuna göre plan yapılmalıdır", "Rahat ayakkabı tercih edilmelidir"],
            }
        if is_historical:
            return {
                "summary": f"{name}, {city} içinde tarihi ve turistik değeri olan önemli bir duraktır. Bölgenin geçmişini tanımak ve mimari dokusunu görmek isteyenler için gezi rotasına eklenebilir.",
                "best_for": ["Tarih meraklıları", "Kültürel gezi yapmak isteyenler"],
                "strengths": ["Tarihi atmosfer sunması", "Fotoğraf ve keşif için uygun olması", "Şehir rotasında anlamlı bir durak olması"],
                "watch_out": ["Kalabalık saatler tercih edilmemelidir", "Ziyaret süresi rota yoğunluğuna göre ayarlanmalıdır"],
            }

        return {
            "summary": f"{name}, {city} içinde gezi rotasına eklenebilecek bir noktadır. {district + ' bölgesindeki' if district else 'Şehirdeki'} diğer yerlerle birlikte planlandığında daha verimli bir rota oluşturulabilir.",
            "best_for": ["Şehri keşfetmek isteyenler", "Yakındaki yerlerle birlikte rota planlayanlar"],
            "strengths": ["Rota içine kolay eklenebilmesi", "Yakındaki yerlerle birlikte gezilebilmesi", "Kısa keşifler için uygun olması"],
            "watch_out": ["Gitmeden önce konum ve ziyaret bilgisi kontrol edilmelidir", "Yoğun saatlerde planlama yapmak gerekebilir"],
        }

    if lang == "de":
        return {
            "summary": f"{name} ist ein Reiseziel in {city}, das je nach Kategorie gut in eine Tagesroute aufgenommen werden kann.",
            "best_for": ["Reisende, die die Stadt entdecken möchten", "Besucher, die nahegelegene Orte kombinieren wollen"],
            "strengths": ["Gute Ergänzung für eine Route", "Lässt sich mit Orten in der Nähe planen", "Praktisch für kurze Besuche"],
            "watch_out": ["Öffnungszeiten und aktuelle Informationen vorher prüfen", "Besuchszeit je nach Route planen"],
        }

    if lang == "ru":
        return {
            "summary": f"{name} — место в городе {city}, которое можно добавить в маршрут в зависимости от типа поездки.",
            "best_for": ["Путешественники, которые хотят познакомиться с городом", "Те, кто планирует маршрут с ближайшими местами"],
            "strengths": ["Легко добавить в маршрут", "Можно совместить с ближайшими точками", "Подходит для короткого посещения"],
            "watch_out": ["Перед поездкой проверьте часы работы и актуальную информацию", "Время посещения лучше планировать заранее"],
        }

    return {
        "summary": f"{name} is a place in {city} that can be added to a travel route depending on the trip style.",
        "best_for": ["Travelers who want to explore the city", "Visitors planning a route with nearby places"],
        "strengths": ["Easy to add to a daily route", "Can be planned together with nearby places", "Suitable for a short visit"],
        "watch_out": ["Check current visit information before going", "Plan the visit time according to your route"],
    }


@app.get("/place-insight")
def place_insight(place: str, city: str = "", language: str = Query("en")):
    lang = get_lang(language)

    # Önce seçili dilde gerçek mekan bilgisini buluyoruz.
    p_data = get_place_from_db(place, lang=lang)
    if not p_data:
        p_data = get_place_from_db(place, lang="en")

    if not p_data:
        return {
            "place": place,
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

    search_name = p_data.get("name", place)

    # Eski insight_service bazen yanlış web sonucu/şirket bilgisi döndürüyordu.
    # Bu yüzden burada sadece kendi veritabanındaki mekan bilgisiyle güvenli yorum üretiyoruz.
    safe_insight = _place_ai_insight_fallback(p_data, lang)

    return {
        "place": search_name,
        "smart_score": None,
        "score_breakdown": {},
        "ai_insight": safe_insight,
        "web_mentions": [],
        "insight": safe_insight,
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


def detect_days_count(message: str) -> int:
    msg = normalize_text(message)
    import re

    digit_match = re.search(r"(\d+)\s*(gun|gün|day|days|gunluk|günlük)", msg)
    if digit_match:
        return min(max(int(digit_match.group(1)), 1), 7)

    word_numbers = {
        "bir": 1,
        "iki": 2,
        "uc": 3,
        "üç": 3,
        "dort": 4,
        "dört": 4,
        "bes": 5,
        "beş": 5,
        "alti": 6,
        "altı": 6,
        "yedi": 7,
    }

    for word, number in word_numbers.items():
        if re.search(rf"\b{word}\b\s*(gun|gün|gunluk|günlük|day|days)", msg):
            return number

    return 1


def detect_persona_from_message(message: str) -> str:
    msg = normalize_text(message)

    if any(w in msg for w in ["cocuklu", "çocuklu", "cocuk", "çocuk", "aile", "family", "kids", "children"]):
        return "family"
    if any(w in msg for w in ["romantik", "romantic", "sevgili", "couple", "partner"]):
        return "romantic"
    if any(w in msg for w in ["ogrenci", "öğrenci", "student", "ucuz", "cheap", "budget", "ekonomik"]):
        return "student"
    if any(w in msg for w in ["luks", "lüks", "luxury", "premium", "konfor"]):
        return "luxury"
    if any(w in msg for w in ["yagmur", "yağmur", "rain", "rainy", "kapali", "kapalı"]):
        return "rainy"
    return "general"


def detect_interest_words(message: str):
    msg = normalize_text(message)
    intents = []

    groups = {
        "history": ["tarih", "tarihi", "historical", "history", "kultur", "kültür", "culture", "museum", "muze", "müze", "saray", "mosque", "cami"],
        "nature": ["doga", "doğa", "nature", "park", "orman", "forest", "sahil", "beach", "manzara", "view"],
        "food": ["yemek", "food", "restaurant", "restoran", "cafe", "kafe", "lezzet"],
        "shopping": ["alisveris", "alışveriş", "shopping", "avm", "mall", "market", "bazaar", "çarşı", "carsi"],
        "hotel": ["hotel", "otel", "konaklama"],
    }

    for intent, words in groups.items():
        if any(w in msg for w in words):
            intents.append(intent)

    return intents


@app.post("/ai-chat")
def ai_chat(payload: dict = Body(...)):
    message = payload.get("message", "")
    lang = get_lang(payload)

    places_list = get_places_from_db(lang=lang)

    detected_city = detect_city(message)
    detected_category = detect_category(message)
    detected_district = detect_district(message)

    msg_norm = normalize_text(message)

    # Persona / gezi tipi ve gün sayısı algılama
    persona = detect_persona_from_message(message)
    detected_intents = detect_interest_words(message)
    days_count = detect_days_count(message)

    # Bütçe algılama
    budget = None
    import re
    budget_match = re.search(r"(\d{3,6})\s*(tl|try|₺)?", msg_norm)
    if budget_match:
        try:
            budget = int(budget_match.group(1))
        except Exception:
            budget = None

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

    # Persona bazlı filtre/öncelik
    def persona_score(place):
        score = float(place.get("rating") or 0) * 10
        category = normalize_text(place.get("category", ""))
        subcategory = normalize_text(place.get("subcategory", ""))
        desc = normalize_text(place.get("description", ""))
        tags = " ".join([normalize_text(x) for x in place.get("tags", [])])

        text = f"{category} {subcategory} {desc} {tags}"

        if persona == "romantic":
            if any(w in text for w in ["view", "manzara", "bosphorus", "deniz", "restaurant", "cafe"]):
                score += 20
        elif persona == "family":
            if any(w in text for w in ["park", "museum", "nature", "aquarium", "family", "çocuk", "cocuk"]):
                score += 20
        elif persona == "student":
            if category in ["museum", "park", "attraction", "cafe"]:
                score += 18
            if category == "hotel":
                score -= 15
        elif persona == "luxury":
            if category in ["hotel", "restaurant"]:
                score += 25
            if float(place.get("rating") or 0) >= 4.6:
                score += 10
        elif persona == "rainy":
            if category in ["museum", "shopping", "cafe", "restaurant", "hotel"]:
                score += 25
            if any(w in text for w in ["indoor", "kapalı", "kapali", "museum", "mall"]):
                score += 15

        return score

    if not filtered_places:
        return {
            "reply": tr_text(lang, {
                "tr": "Bu kritere uygun mekan bulamadım. Şehir veya kategori bilgisini biraz daha net yazabilir misin?",
                "en": "I couldn't find any places matching this criteria. Could you specify the city or category more clearly?",
                "de": "Ich konnte keine passenden Orte finden. Kannst du Stadt oder Kategorie genauer angeben?",
                "ru": "Я не нашел подходящих мест. Можете точнее указать город или категорию?",
            }),
            "places": [],
            "days": [],
            "persona": persona,
            "budget": budget,
        }

    sorted_places = sorted(filtered_places, key=persona_score, reverse=True)

    max_places = min(max(days_count * 4, days_count), 16)
    selected_places = sorted_places[:max_places]

    # Günlere böl
    days = []
    per_day = max(1, math.ceil(len(selected_places) / days_count))

    for i in range(days_count):
        day_places = selected_places[i * per_day:(i + 1) * per_day]
        if day_places:
            days.append({
                "day": i + 1,
                "places": [p.get("name") for p in day_places],
            })

    # Basit bütçe tahmini
    estimated_budget = 0
    for p in selected_places:
        cat = normalize_text(p.get("category", ""))
        if cat == "hotel":
            estimated_budget += 3500
        elif cat in ["restaurant", "cafe"]:
            estimated_budget += 700
        elif cat == "shopping":
            estimated_budget += 1000
        else:
            estimated_budget += 300

    persona_labels = {
        "tr": {
            "general": "genel",
            "romantic": "romantik",
            "family": "aile dostu",
            "student": "öğrenci bütçesine uygun",
            "luxury": "lüks",
            "rainy": "yağmurlu havaya uygun",
        },
        "en": {
            "general": "general",
            "romantic": "romantic",
            "family": "family-friendly",
            "student": "student-budget",
            "luxury": "luxury",
            "rainy": "rainy-day",
        },
        "de": {
            "general": "allgemeinen",
            "romantic": "romantischen",
            "family": "familienfreundlichen",
            "student": "studentischen Budget",
            "luxury": "luxuriösen",
            "rainy": "regnerischen Tag",
        },
        "ru": {
            "general": "общий",
            "romantic": "романтический",
            "family": "семейный",
            "student": "студенческий бюджет",
            "luxury": "люкс",
            "rainy": "для дождливой погоды",
        },
    }

    persona_text = persona_labels.get(lang, persona_labels["en"]).get(persona, persona)

    if lang == "tr":
        reply = f"{days_count} günlük {persona_text} gezi planı hazırladım."
        if detected_city:
            reply += f" Şehir: {detected_city.title()}."
        if budget:
            reply += f" Belirttiğin bütçe: yaklaşık {budget} TL."
        reply += f" Tahmini toplam harcama: {estimated_budget} TL civarı."
        reply += "\n\nPlan:"
        for d in days:
            reply += f"\n\nGün {d['day']}:\n"
            for idx, place_name in enumerate(d["places"], 1):
                reply += f"{idx}. {place_name}\n"

    elif lang == "de":
        reply = f"Ich habe einen {days_count}-Tage-Reiseplan für einen {persona_text} vorbereitet."
        if budget:
            reply += f" Dein Budget: ca. {budget} TL."
        reply += f" Geschätzte Gesamtkosten: etwa {estimated_budget} TL."
        reply += "\n\nPlan:"
        for d in days:
            reply += f"\n\nTag {d['day']}:\n"
            for idx, place_name in enumerate(d["places"], 1):
                reply += f"{idx}. {place_name}\n"

    elif lang == "ru":
        reply = f"Я подготовил маршрут на {days_count} дн. Тип поездки: {persona_text}."
        if budget:
            reply += f" Ваш бюджет: около {budget} TL."
        reply += f" Примерная стоимость: около {estimated_budget} TL."
        reply += "\n\nПлан:"
        for d in days:
            reply += f"\n\nДень {d['day']}:\n"
            for idx, place_name in enumerate(d["places"], 1):
                reply += f"{idx}. {place_name}\n"

    else:
        reply = f"I prepared a {days_count}-day {persona_text} trip plan."
        if budget:
            reply += f" Your budget: around {budget} TL."
        reply += f" Estimated total cost: around {estimated_budget} TL."
        reply += "\n\nPlan:"
        for d in days:
            reply += f"\n\nDay {d['day']}:\n"
            for idx, place_name in enumerate(d["places"], 1):
                reply += f"{idx}. {place_name}\n"

    # OpenAI varsa cevabı daha doğal hale getirsin ama rota verisi yine bizim dataset'ten gelsin.
    # Önemli: AI sadece metni güzelleştirir; gün sayısını ve mekan listesini değiştirmemesi istenir.
    if client:
        try:
            system_text = {
                "tr": (
                    "Sen profesyonel bir Türkiye seyahat danışmanısın. "
                    "Sana verilen gezi planını daha doğal ve anlaşılır hale getir. "
                    "KESİNLİKLE gün sayısını değiştirme. "
                    "KESİNLİKLE mekan isimlerini değiştirme, silme veya yeni mekan ekleme. "
                    "Cevapta verilen JSON içindeki requested_days kadar gün başlığı olmalı. "
                    "Planı kısa ve sunuma uygun yaz."
                ),
                "en": (
                    "You are a professional Turkey travel advisor. "
                    "Polish the given trip plan naturally. "
                    "Do not change the number of days. "
                    "Do not change, remove, or add place names."
                ),
                "de": (
                    "Du bist ein professioneller Türkei-Reiseberater. "
                    "Formuliere den Plan natürlich, aber ändere weder Tagesanzahl noch Ortsnamen."
                ),
                "ru": (
                    "Вы профессиональный консультант по Турции. "
                    "Сделайте план естественным, но не меняйте количество дней и названия мест."
                ),
            }.get(lang, "Polish the plan without changing days or place names.")

            locked_plan = {
                "requested_days": days_count,
                "persona": persona,
                "days": days,
                "place_names": [p.get("name") for p in selected_places],
                "draft_reply": reply,
            }

            ai_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": json.dumps(locked_plan, ensure_ascii=False)},
                ],
            )

            polished = ai_response.choices[0].message.content.strip()
            if polished:
                reply = polished

        except Exception as e:
            logging.error(f"AI polish hata: {e}")

    return {
        "reply": reply,
        "places": selected_places,
        "days": days,
        "persona": persona,
        "budget": budget,
        "estimated_budget": estimated_budget,
        "requested_days": days_count,
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



def _place_search_text(p: dict) -> str:
    return normalize_text(" ".join([
        str(p.get("name", "")),
        str(p.get("city", "")),
        str(p.get("district", "")),
        str(p.get("category", "")),
        str(p.get("subcategory", "")),
        str(p.get("description", "")),
        " ".join([str(t) for t in p.get("tags", [])]),
    ]))


def _matches_any_place_text(p: dict, words: list[str]) -> bool:
    text = _place_search_text(p)
    return any(normalize_text(w) in text for w in words)


def _category_filtered_places(places: list, category: str, interests: str = "") -> list:
    category = normalize_text(category or "")
    interests = normalize_text(interests or "")

    # Frontend category values:
    # mixed, nature, culture, food, shopping
    # Eğer kategori seçilmediyse ilgi alanından tahmin etmeyi dene.
    if not category or category == "mixed":
        if any(w in interests for w in ["tarih", "tarihi", "history", "historical", "museum", "muze", "müze", "culture", "kultur", "kültür"]):
            category = "culture"
        elif any(w in interests for w in ["doga", "doğa", "nature", "park", "orman", "forest", "sahil", "beach", "manzara", "view"]):
            category = "nature"
        elif any(w in interests for w in ["yemek", "food", "restaurant", "restoran", "cafe", "kafe"]):
            category = "food"
        elif any(w in interests for w in ["alisveris", "alışveriş", "shopping", "avm", "mall", "market", "bazaar", "çarşı", "carsi"]):
            category = "shopping"
        else:
            return places

    allowed_words = {
        "culture": [
            "museum", "müze", "muze", "historical", "history", "tarihi", "tarih",
            "palace", "saray", "mosque", "cami", "church", "kilise",
            "gallery", "galeri", "culture", "kultur", "kültür",
            "monument", "anıt", "anit", "opera", "theatre", "tiyatro",
            "station", "gar", "library", "kütüphane", "kutuphane",
        ],
        "nature": [
            "nature", "doğa", "doga", "park", "forest", "orman",
            "beach", "plaj", "sahil", "garden", "bahçe", "bahce",
            "view", "manzara", "sea", "deniz", "lake", "göl", "gol",
            "valley", "vadi", "coast", "waterfront",
        ],
        "food": [
            "restaurant", "restoran", "cafe", "kafe", "food", "yemek",
            "bakery", "pastane", "dessert", "tatlı", "tatli",
        ],
        "shopping": [
            "shopping", "alışveriş", "alisveris", "mall", "avm",
            "market", "bazaar", "çarşı", "carsi", "store", "mağaza", "magaza",
        ],
    }

    # Kategori seçiliyken alakasız otelleri/restoranları kesin çıkar.
    def is_bad_for_selected_category(p: dict) -> bool:
        c = normalize_text(p.get("category", ""))
        s = normalize_text(p.get("subcategory", ""))
        text = _place_search_text(p)

        is_hotel = c == "hotel" or s == "hotel" or " hotel " in f" {text} " or " otel " in f" {text} "
        is_food = c in ["restaurant", "cafe"] or s in ["restaurant", "cafe"] or any(w in text for w in ["restaurant", "restoran", "cafe", "kafe"])

        if category in ["culture", "nature", "shopping"] and is_hotel:
            return True

        if category in ["culture", "nature", "shopping"] and is_food:
            return True

        return False

    words = allowed_words.get(category)
    if not words:
        return places

    strict = [
        p for p in places
        if not is_bad_for_selected_category(p) and _matches_any_place_text(p, words)
    ]

    # Eğer strict filtre tamamen boş kalırsa, en azından otel/restoranları çıkarılmış sonuçları döndür.
    if strict:
        return strict

    relaxed = [p for p in places if not is_bad_for_selected_category(p)]
    return relaxed if relaxed else places


def _sort_places_for_trip(places: list, category: str, district: str = "") -> list:
    category = normalize_text(category or "")
    district = normalize_text(district or "")

    def score(p: dict) -> float:
        base = float(p.get("rating") or 0) * 10
        text = _place_search_text(p)
        c = normalize_text(p.get("category", ""))
        s = normalize_text(p.get("subcategory", ""))

        value = base

        if district and district in normalize_text(p.get("district", "")):
            value += 40

        # kategoriye göre güçlü öncelik
        if category == "culture":
            if c in ["museum", "historical", "attraction"] or s in ["museum", "historical"]:
                value += 35
            if any(w in text for w in ["museum", "müze", "muze", "historical", "tarihi", "palace", "saray", "opera", "gar"]):
                value += 25
            if c in ["hotel", "restaurant", "cafe"]:
                value -= 100

        elif category == "nature":
            if c in ["park", "nature", "beach", "attraction"]:
                value += 35
            if any(w in text for w in ["park", "nature", "doğa", "doga", "sahil", "beach", "garden", "bahçe", "manzara", "view"]):
                value += 25
            if c in ["hotel", "restaurant", "cafe"]:
                value -= 100

        elif category == "food":
            if c in ["restaurant", "cafe"]:
                value += 45
            if any(w in text for w in ["restaurant", "restoran", "cafe", "kafe", "food", "yemek"]):
                value += 25
            if c == "hotel":
                value -= 50

        elif category == "shopping":
            if c == "shopping":
                value += 45
            if any(w in text for w in ["shopping", "alışveriş", "alisveris", "mall", "avm", "bazaar", "çarşı", "carsi"]):
                value += 25
            if c in ["hotel", "restaurant", "cafe"]:
                value -= 100

        else:
            if c == "hotel":
                value -= 30

        return value

    return sorted(places, key=score, reverse=True)


def _fallback_relax_district(all_city_places: list, district_places: list) -> list:
    # Önce ilçe sonuçları denenir.
    # İlçede seçilen kategoriye uygun yer yoksa trip_plan içinde şehir geneline düşülür.
    return district_places

@app.post("/trip-plan")
def trip_plan(payload: dict = Body(...)):
    city = payload.get("city", "").strip()
    district_raw = payload.get("district", "").strip()
    category_raw = payload.get("category", "").strip()

    days_count = min(max(int(payload.get("days", 1) or 1), 1), 7)
    lang = get_lang(payload)
    interests = normalize_text(payload.get("interests", ""))

    normalized_city = normalize_text(city)
    normalized_district = normalize_text(district_raw)
    normalized_category = normalize_text(category_raw)

    category_label_tr = {
        "culture": "tarih/müze",
        "nature": "doğa",
        "food": "yeme-içme",
        "shopping": "alışveriş",
        "mixed": "karma",
    }.get(normalized_category, normalized_category or "karma")

    category_label_en = {
        "culture": "history/museum",
        "nature": "nature",
        "food": "food",
        "shopping": "shopping",
        "mixed": "mixed",
    }.get(normalized_category, normalized_category or "mixed")

    places_list = get_places_from_db(lang=lang)
    allowed_cities = get_city_aliases(normalized_city)

    city_places_all = [
        p for p in places_list
        if normalize_text(p.get("city", "")) in allowed_cities
    ]

    district_places = []
    if normalized_district:
        district_places = [
            p for p in city_places_all
            if normalized_district in normalize_text(p.get("district", ""))
        ]

    def build_category_places(source_places: list):
        filtered = _category_filtered_places(source_places, normalized_category, interests)
        sorted_list = _sort_places_for_trip(filtered, normalized_category, normalized_district)

        # Food dışındaki kategorilerde otel/restoran/kafe kesinlikle gösterilmez.
        if normalized_category in ["culture", "nature", "shopping"]:
            sorted_list = [
                p for p in sorted_list
                if normalize_text(p.get("category", "")) not in ["hotel", "restaurant", "cafe"]
            ]

        return sorted_list

    # 1) Önce ilçe + kategori dene
    used_city_fallback = False

    if normalized_district and district_places:
        sorted_places = build_category_places(district_places)

        # İlçede kategoriye uygun yer yoksa şehir geneline geç
        if not sorted_places:
            sorted_places = build_category_places(city_places_all)
            used_city_fallback = True
    else:
        # İlçe yoksa veya ilçeye ait kayıt yoksa şehir geneline geç
        sorted_places = build_category_places(city_places_all)
        used_city_fallback = bool(normalized_district)

    if not sorted_places:
        return {
            "reply": tr_text(lang, {
                "tr": f"{city} için uygun {category_label_tr} rotası bulunamadı. Otel/restoran önermemek için boş sonuç döndürdüm.",
                "en": f"No suitable {category_label_en} route found for {city}. I returned an empty result to avoid irrelevant hotels/restaurants.",
                "de": f"Keine passende {category_label_en}-Route für {city} gefunden.",
                "ru": f"Подходящий маршрут для {city} не найден.",
            }),
            "days": [],
            "places": [],
            "district": district_raw,
            "category": category_raw,
            "requested_days": days_count,
        }

    max_total_places = min(days_count * 4, len(sorted_places))
    selected_places = sorted_places[:max_total_places]

    plan_days = []
    used_places = []

    per_day = max(1, min(4, math.ceil(len(selected_places) / days_count)))

    for i in range(days_count):
        day_places = selected_places[i * per_day:(i + 1) * per_day]
        if not day_places and selected_places:
            day_places = selected_places[:min(4, len(selected_places))]

        used_places.extend(day_places)
        plan_days.append({
            "day": i + 1,
            "places": day_places,
        })

    fallback_note = ""
    if used_city_fallback and normalized_district:
        if district_places:
            fallback_note = tr_text(lang, {
                "tr": f" {district_raw} içinde bu kategoriye uygun yer az olduğu için İstanbul geneline göre öneri oluşturdum.",
                "en": f" Since there were not enough matching places in {district_raw}, I used city-wide results.",
                "de": f" Da es in {district_raw} nicht genug passende Orte gab, wurden stadtweite Ergebnisse verwendet.",
                "ru": f" Так как в районе {district_raw} мало подходящих мест, использованы результаты по всему городу.",
            })
        else:
            fallback_note = tr_text(lang, {
                "tr": f" {district_raw} için veri bulunamadığı için İstanbul geneline göre öneri oluşturdum.",
                "en": f" Since there was no data for {district_raw}, I used city-wide results.",
                "de": f" Da keine Daten für {district_raw} gefunden wurden, wurden stadtweite Ergebnisse verwendet.",
                "ru": f" Так как данных по району {district_raw} нет, использованы результаты по всему городу.",
            })

    if lang == "tr":
        reply = f"{city} için {days_count} günlük gezi planı hazır."
        if district_raw:
            reply += f" İlçe/bölge: {district_raw}."
        if category_raw and category_raw != "mixed":
            reply += f" Kategori: {category_label_tr}."
        reply += fallback_note
    elif lang == "de":
        reply = f"Der {days_count}-Tage-Reiseplan für {city} ist bereit."
        if district_raw:
            reply += f" Bezirk/Gebiet: {district_raw}."
        if category_raw and category_raw != "mixed":
            reply += f" Kategorie: {category_label_en}."
        reply += fallback_note
    elif lang == "ru":
        reply = f"План поездки на {days_count} дн. для {city} готов."
        if district_raw:
            reply += f" Район: {district_raw}."
        if category_raw and category_raw != "mixed":
            reply += f" Категория: {category_label_en}."
        reply += fallback_note
    else:
        reply = f"{days_count}-day trip plan for {city} is ready."
        if district_raw:
            reply += f" District/area: {district_raw}."
        if category_raw and category_raw != "mixed":
            reply += f" Category: {category_label_en}."
        reply += fallback_note

    return {
        "reply": reply,
        "days": plan_days,
        "places": used_places,
        "district": district_raw,
        "category": category_raw,
        "requested_days": days_count,
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
@app.post("/voice-guide")
def voice_guide(payload: dict = Body(...)):
    lang = get_lang(payload)

    place_name = payload.get("name", "")
    city = payload.get("city", "")
    category = payload.get("category", "")
    description = payload.get("description", "")

    if not client:
        return {
            "guide": f"{place_name} hakkında sesli rehber şu anda oluşturulamıyor."
        }

    try:
        system_prompt = {
            "tr": "Sen profesyonel bir turist rehberisin. Verilen yer hakkında 4-5 cümlelik doğal ve ilgi çekici bir sesli rehber oluştur. Mekanı ziyaret eden kişiye bilgi ver. Robotik konuşma kullanma.",
            "en": "You are a professional tourist guide. Create a natural and engaging audio guide in 4-5 sentences.",
            "de": "Du bist ein professioneller Reiseführer. Erstelle einen natürlichen Audioguide in 4-5 Sätzen.",
            "ru": "Вы профессиональный гид. Создайте естественный аудиогид из 4-5 предложений."
        }.get(lang)

        user_prompt = f"""
Yer: {place_name}
Şehir: {city}
Kategori: {category}
Açıklama: {description}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        return {
            "guide": response.choices[0].message.content
        }

    except Exception as e:
        return {"guide": str(e)}
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
# --- Wikipedia + Nearby Places endpoints ---
# Bunu backend/main.py dosyanın en altına ekleyebilirsin.

import math
import sqlite3
import requests
from fastapi import Query

WIKI_LANG_MAP = {
    "tr": "tr",
    "en": "en",
    "de": "de",
    "ru": "ru",
}

def _extra_db_path():
    # main.py içinde DB_PATH varsa onu kullanır, yoksa backend/tourism.db dener.
    try:
        return DB_PATH
    except NameError:
        import os
        return os.path.join(os.path.dirname(__file__), "tourism.db")

def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000
    p1 = math.radians(float(lat1))
    p2 = math.radians(float(lat2))
    dp = math.radians(float(lat2) - float(lat1))
    dl = math.radians(float(lon2) - float(lon1))

    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _row_to_dict(cursor, row):
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))

@app.get("/wikipedia-summary")
def wikipedia_summary(
    title: str = Query(...),
    language: str = Query("tr")
):
    lang = WIKI_LANG_MAP.get(str(language).lower(), "en")
    safe_title = str(title or "").strip()

    if not safe_title:
        return {"error": True, "message": "title required"}

    # Önce seçili dilde dener.
    # Bulamazsa İngilizceye düşer.
    for current_lang in [lang, "en"]:
        try:
            url = f"https://{current_lang}.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(safe_title)}"
            res = requests.get(
                url,
                headers={"User-Agent": "AITravelApp/1.0"},
                timeout=8,
            )

            if res.status_code != 200:
                continue

            data = res.json()
            extract = data.get("extract") or ""

            if not extract:
                continue

            return {
                "title": data.get("title") or safe_title,
                "extract": extract,
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "thumbnail": data.get("thumbnail", {}).get("source", ""),
                "source": "Wikipedia",
                "language": current_lang,
            }

        except Exception as e:
            print("Wikipedia error:", e)

    return {"error": True, "message": "Wikipedia summary not found"}

@app.get("/nearby-places")
def nearby_places(
    id: int = Query(...),
    language: str = Query("tr"),
    limit: int = Query(20)
):
    db_path = _extra_db_path()

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM places WHERE id = ?", (id,))
        current_row = cursor.fetchone()

        if not current_row:
            conn.close()
            return {"places": []}

        current = _row_to_dict(cursor, current_row)
        current_lat = current.get("latitude")
        current_lng = current.get("longitude")

        if current_lat is None or current_lng is None:
            conn.close()
            return {"places": []}

        cursor.execute("SELECT * FROM places WHERE id != ?", (id,))
        rows = cursor.fetchall()
        all_places = [_row_to_dict(cursor, row) for row in rows]
        conn.close()

        nearby = []

        for place in all_places:
            lat = place.get("latitude")
            lng = place.get("longitude")

            if lat is None or lng is None:
                continue

            try:
                distance = _haversine_m(current_lat, current_lng, lat, lng)
            except Exception:
                continue

            # Çok uzak yerleri yakınlarda göstermeyelim.
            if distance > 3000:
                continue

            item = {
                "id": place.get("id"),
                "name": place.get("name"),
                "city": place.get("city"),
                "district": place.get("district"),
                "category": place.get("category"),
                "subcategory": place.get("subcategory"),
                "latitude": place.get("latitude"),
                "longitude": place.get("longitude"),
                "rating": place.get("rating"),
                "image": place.get("image"),
                "distance_m": round(distance),
            }

            nearby.append(item)

        nearby.sort(key=lambda x: x.get("distance_m", 999999))

        return {
            "places": nearby[: max(1, min(limit, 50))]
        }

    except Exception as e:
        print("Nearby places error:", e)
        return {"places": []}
