import os
import requests

TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def get_google_places_api_key():
    key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not key:
        raise ValueError("GOOGLE_PLACES_API_KEY not found in environment variables.")
    return key


def search_place_by_text(query: str):
    key = get_google_places_api_key()

    params = {
        "query": query,
        "language": "en",
        "key": key,
    }

    response = requests.get(TEXT_SEARCH_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()

    status = data.get("status")
    if status not in ["OK", "ZERO_RESULTS"]:
        raise ValueError(f"Google Text Search error: {status} | {data.get('error_message', '')}")

    results = data.get("results", [])
    if not results:
        return None

    return results[0]


def get_place_reviews(query: str):
    key = get_google_places_api_key()
    place = search_place_by_text(query)

    if not place:
        return {
            "found": False,
            "query": query,
            "rating": None,
            "review_count": 0,
            "reviews": [],
            "place_name": None,
            "address": None,
        }

    place_id = place.get("place_id")
    if not place_id:
        return {
            "found": False,
            "query": query,
            "rating": None,
            "review_count": 0,
            "reviews": [],
            "place_name": None,
            "address": None,
        }

    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,rating,user_ratings_total,reviews",
        "reviews_sort": "most_relevant",
        "key": key,
    }

    response = requests.get(DETAILS_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()

    status = data.get("status")
    if status not in ["OK", "ZERO_RESULTS"]:
        raise ValueError(f"Google Place Details error: {status} | {data.get('error_message', '')}")

    result = data.get("result", {})

    reviews = []
    for r in result.get("reviews", []):
        reviews.append(
            {
                "author": r.get("author_name", "Anonymous"),
                "rating": r.get("rating"),
                "text": r.get("text", ""),
                "publish_time": r.get("relative_time_description"),
            }
        )

    return {
        "found": True,
        "query": query,
        "place_name": result.get("name"),
        "address": result.get("formatted_address"),
        "rating": result.get("rating"),
        "review_count": result.get("user_ratings_total", 0),
        "reviews": reviews,
    }