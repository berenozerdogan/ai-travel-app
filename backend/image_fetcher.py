import requests
import os

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def get_place_image(place_name, city):
    try:
        query = f"{place_name} {city}"

        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"

        res = requests.get(url, params={
            "query": query,
            "key": GOOGLE_API_KEY
        })

        data = res.json()

        if not data.get("results"):
            return None

        place = data["results"][0]

        photos = place.get("photos")
        if not photos:
            return None

        photo_ref = photos[0]["photo_reference"]

        image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_ref}&key={GOOGLE_API_KEY}"

        return image_url

    except Exception as e:
        print("Image error:", e)
        return None