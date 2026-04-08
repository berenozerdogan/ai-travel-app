import os
import json
import requests
from dotenv import load_dotenv
from openai import OpenAI
from reviews_service import get_place_reviews

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GOOGLE_CSE_API_KEY = os.getenv("GOOGLE_CSE_API_KEY")
GOOGLE_CSE_CX = os.getenv("GOOGLE_CSE_CX")

CSE_URL = "https://www.googleapis.com/customsearch/v1"


def search_web_mentions(query: str, num: int = 5):
    if not GOOGLE_CSE_API_KEY or not GOOGLE_CSE_CX:
        return []

    params = {
        "key": GOOGLE_CSE_API_KEY,
        "cx": GOOGLE_CSE_CX,
        "q": query,
        "num": num,
    }

    response = requests.get(CSE_URL, params=params, timeout=20)

    if response.status_code != 200:
        try:
            error_json = response.json()
        except Exception:
            error_json = {"raw": response.text}
        raise ValueError(f"CSE error {response.status_code}: {error_json}")

    data = response.json()
    items = data.get("items", [])

    results = []
    for item in items:
        results.append(
            {
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link": item.get("link", ""),
                "displayLink": item.get("displayLink", ""),
            }
        )

    return results


def build_ai_insight(
    place_name: str,
    city: str,
    google_reviews: dict,
    web_mentions: list,
    language: str = "en",
):
    google_rating = google_reviews.get("rating")
    review_count = google_reviews.get("review_count")
    review_texts = [r.get("text", "") for r in google_reviews.get("reviews", [])[:3]]
    web_snippets = [w.get("snippet", "") for w in web_mentions[:5]]

    language_rule_map = {
        "tr": "Respond in Turkish.",
        "en": "Respond in English.",
        "de": "Respond in German.",
        "ru": "Respond in Russian.",
    }

    language = (language or "en").lower().strip()
    if language not in language_rule_map:
        language = "en"

    language_rule = language_rule_map[language]

    prompt = f"""
You are an AI travel analyst.

{language_rule}

Create a short insight for this place based on:
- Google rating
- Google review count
- Google review texts
- web/blog snippets

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

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    raw = response.output_text.strip()

    if raw.startswith("```json"):
        raw = raw.replace("```json", "", 1).strip()
    if raw.startswith("```"):
        raw = raw.replace("```", "", 1).strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    try:
        return json.loads(raw)
    except Exception:
        fallback_summary = {
            "tr": "AI içgörüsü şu anda oluşturulamadı.",
            "en": "No AI insight available.",
            "de": "Derzeit ist keine AI-Einschätzung verfügbar.",
            "ru": "AI-анализ сейчас недоступен.",
        }

        return {
            "summary": fallback_summary.get(language, "No AI insight available."),
            "strengths": [],
            "watch_out": [],
            "best_for": [],
        }


def get_place_insight(place_name: str, city: str = "", language: str = "en"):
    full_query = f"{place_name} {city}".strip()

    google_reviews = get_place_reviews(full_query)
    web_mentions = search_web_mentions(
        f"{full_query} travel review OR blog OR guide",
        num=5,
    )

    ai_insight = build_ai_insight(
        place_name=place_name,
        city=city,
        google_reviews=google_reviews,
        web_mentions=web_mentions,
        language=language,
    )

    dataset_rating = 0
    try:
        dataset_rating = float(google_reviews.get("rating") or 0)
    except Exception:
        dataset_rating = 0

    google_rating = 0
    try:
        google_rating = float(google_reviews.get("rating") or 0)
    except Exception:
        google_rating = 0

    review_count = 0
    try:
        review_count = int(google_reviews.get("review_count") or 0)
    except Exception:
        review_count = 0

    smart_score = round(((dataset_rating * 0.4) + (google_rating * 0.4) + min(review_count / 10000, 1) * 5 * 0.2), 1)

    return {
        "place": place_name,
        "city": city,
        "smart_score": smart_score,
        "score_breakdown": {
            "dataset_rating": dataset_rating,
            "google_rating": google_rating,
            "review_count": review_count,
        },
        "google": {
            "rating": google_reviews.get("rating"),
            "review_count": google_reviews.get("review_count"),
            "reviews": google_reviews.get("reviews", [])[:3],
        },
        "web_mentions": web_mentions,
        "ai_insight": ai_insight,
    }