import os
import requests

TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def _empty_response(query: str, reason: str = ""):
    return {
        "found": False,
        "query": query,
        "rating": None,
        "review_count": 0,
        "reviews": [],
        "place_name": None,
        "address": None,
        "reason": reason,
    }


def get_google_places_api_key():
    return os.getenv("GOOGLE_PLACES_API_KEY", "").strip()


def search_place_by_text(query: str):
    key = get_google_places_api_key()
    if not key:
        print("GOOGLE_PLACES_API_KEY missing")
        return None

    # Bazı mekanlar kısa isimle bulunmayabiliyor.
    # Bu yüzden aynı query'yi birkaç farklı şekilde deniyoruz.
    queries_to_try = [
        query,
        f"{query} Turkey",
        f"{query} Istanbul Turkey",
        f"{query} hotel restaurant Turkey",
    ]

    for q in queries_to_try:
        try:
            params = {
                "query": q,
                "language": "en",
                "key": key,
            }

            response = requests.get(TEXT_SEARCH_URL, params=params, timeout=12)

            print("\n--- GOOGLE TEXT SEARCH DEBUG ---")
            print("QUERY:", q)
            print("TEXT SEARCH URL:", response.url)
            print("TEXT SEARCH STATUS:", response.status_code)
            print("TEXT SEARCH RESPONSE:", response.text[:1000])
            print("--- END TEXT SEARCH DEBUG ---\n")

            if response.status_code != 200:
                continue

            data = response.json()
            status = data.get("status")

            if status == "OK":
                results = data.get("results", [])
                if results:
                    return results[0]

            if status == "ZERO_RESULTS":
                continue

            print("Google Text Search disabled/error:", status, data.get("error_message", ""))

            # REQUEST_DENIED, OVER_QUERY_LIMIT gibi durumlarda diğer query'leri denemek anlamsız.
            if status in ["REQUEST_DENIED", "OVER_QUERY_LIMIT"]:
                return None

        except Exception as e:
            print("Google Text Search fallback:", e)
            continue

    return None


def get_place_reviews(query: str):
    key = get_google_places_api_key()
    if not key:
        return _empty_response(query, "GOOGLE_PLACES_API_KEY missing")

    place = search_place_by_text(query)
    if not place:
        return _empty_response(query, "Place not found or Google service unavailable")

    place_id = place.get("place_id")
    if not place_id:
        return _empty_response(query, "place_id missing")

    try:
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,rating,user_ratings_total,reviews",
            "reviews_sort": "most_relevant",
            "key": key,
        }

        response = requests.get(DETAILS_URL, params=params, timeout=12)

        print("\n--- GOOGLE DETAILS DEBUG ---")
        print("DETAILS URL:", response.url)
        print("DETAILS STATUS:", response.status_code)
        print("DETAILS RESPONSE:", response.text[:1000])
        print("--- END DETAILS DEBUG ---\n")

        if response.status_code != 200:
            return _empty_response(query, f"HTTP {response.status_code}")

        data = response.json()
        status = data.get("status")

        if status not in ["OK", "ZERO_RESULTS"]:
            print("Google Place Details disabled/error:", status, data.get("error_message", ""))
            return _empty_response(query, status or "Google Details error")

        result = data.get("result", {})

        reviews = []
        for r in result.get("reviews", []) or []:
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

    except Exception as e:
        print("Google Reviews fallback:", e)
        return _empty_response(query, str(e))
