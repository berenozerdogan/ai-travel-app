import os
import re
from datetime import datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
}

CITY_MAP = {
    "istanbul": "İstanbul",
    "i̇stanbul": "İstanbul",
    "ankara": "Ankara",
    "izmir": "İzmir",
    "antalya": "Antalya",
    "bursa": "Bursa",
    "adana": "Adana",
    "eskisehir": "Eskişehir",
    "eskişehir": "Eskişehir",
    "konya": "Konya",
    "trabzon": "Trabzon",
    "samsun": "Samsun",
    "gaziantep": "Gaziantep",
    "kayseri": "Kayseri",
    "mugla": "Muğla",
    "muğla": "Muğla",
    "mersin": "Mersin",
    "diyarbakir": "Diyarbakır",
    "diyarbakır": "Diyarbakır",
    "cappadocia": "Nevşehir",
    "kapadokya": "Nevşehir",
}

TICKETMASTER_CITY_MAP = {
    "istanbul": "Istanbul",
    "i̇stanbul": "Istanbul",
    "ankara": "Ankara",
    "izmir": "Izmir",
    "antalya": "Antalya",
    "bursa": "Bursa",
}

CATEGORY_TR = {
    "Music": "Konser",
    "Arts & Theatre": "Sahne Sanatları",
    "Sports": "Spor",
    "Film": "Sinema",
    "Miscellaneous": "Etkinlik",
    "Live Event": "Canlı Etkinlik",
    "Culture": "Kültür Sanat",
    "Festival": "Festival",
}

def normalize_city(city: str) -> str:
    city_key = str(city or "Istanbul").strip().lower()
    return CITY_MAP.get(city_key, str(city or "Istanbul").strip().title())

def ticketmaster_city(city: str) -> str:
    city_key = str(city or "Istanbul").strip().lower()
    return TICKETMASTER_CITY_MAP.get(city_key, normalize_city(city).replace("İ", "I").replace("ı", "i"))

def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def localize_category(value: str) -> str:
    value = clean_text(value) or "Live Event"
    return CATEGORY_TR.get(value, value)

def parse_ticketmaster_event(item: dict, city: str) -> dict:
    venues = item.get("_embedded", {}).get("venues", []) or []
    venue = venues[0] if venues else {}

    classifications = item.get("classifications", []) or []
    segment = (
        classifications[0].get("segment", {}).get("name")
        if classifications and isinstance(classifications[0], dict)
        else "Live Event"
    )

    start = item.get("dates", {}).get("start", {}) or {}
    image_url = ""
    images = item.get("images", []) or []
    if images:
        sorted_images = sorted(images, key=lambda x: int(x.get("width", 0) or 0), reverse=True)
        image_url = sorted_images[0].get("url", "")

    return {
        "title": clean_text(item.get("name", "")),
        "venue": clean_text(venue.get("name", "")),
        "date": clean_text(start.get("localDate", "")),
        "time": clean_text(start.get("localTime", "")),
        "category": localize_category(segment),
        "city": normalize_city(city),
        "source": "Ticketmaster",
        "url": item.get("url", ""),
        "image": image_url,
        "description": clean_text(item.get("info", "") or item.get("pleaseNote", "")),
    }

def get_ticketmaster_events(city: str = "Istanbul", limit: int = 20) -> list:
    api_key = os.getenv("TICKETMASTER_API_KEY", "").strip()
    if not api_key:
        return []

    now = datetime.now(timezone.utc)
    end = now + timedelta(days=180)

    params = {
        "apikey": api_key,
        "city": ticketmaster_city(city),
        "countryCode": "TR",
        "size": min(max(int(limit or 20), 1), 50),
        "sort": "date,asc",
        "startDateTime": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endDateTime": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    response = requests.get(
        "https://app.ticketmaster.com/discovery/v2/events.json",
        params=params,
        headers=HEADERS,
        timeout=12,
    )

    if response.status_code != 200:
        return []

    data = response.json()
    raw_events = data.get("_embedded", {}).get("events", []) or []

    events = []
    for item in raw_events:
        parsed = parse_ticketmaster_event(item, city)
        if parsed["title"]:
            events.append(parsed)

    return events[:limit]

def scrape_ibb_events(limit: int = 20):
    url = "https://kultursanat.istanbul/etkinliklerimiz"
    response = requests.get(url, headers=HEADERS, timeout=20)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    text = soup.get_text("\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    events = []
    i = 0

    while i < len(lines):
        if i + 4 < len(lines):
            title = clean_text(lines[i])
            venue = clean_text(lines[i + 1])
            date = clean_text(lines[i + 2])
            time_line = clean_text(lines[i + 3])
            category = clean_text(lines[i + 4])

            if any(year in date for year in ["2025", "2026", "2027"]):
                banned = [
                    "Etkinlikleri Filtrele",
                    "Toplam",
                    "KÜLTÜR SANAT",
                    "Menü",
                    "SÖZLEŞMELER",
                    "SOSYAL MEDYA",
                    "Adres",
                    "Telefon",
                ]

                if not any(b in title for b in banned):
                    events.append(
                        {
                            "title": title,
                            "venue": venue,
                            "date": date,
                            "time": time_line,
                            "category": category or "Kültür Sanat",
                            "city": "İstanbul",
                            "source": "İBB Kültür Sanat",
                            "url": "https://kultursanat.istanbul/etkinliklerimiz",
                            "description": "",
                        }
                    )
                    i += 5
                    continue
        i += 1

    return dedupe_events(events)[:limit]

def scrape_biletix_events(city: str, limit: int = 20):
    city_display = normalize_city(city)

    url = "https://www.biletix.com/search/TURKIYE/tr"
    params = {
        "city_sb": city_display,
        "date_sb": "-1",
    }

    response = requests.get(url, params=params, headers=HEADERS, timeout=20)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    text = soup.get_text("\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    events = []
    banned_words = {
        "Sonuçları Filtrele",
        "Tüm Türkiye",
        "Etkinlik",
        "Mekan",
        "Tarih",
        "Daha Fazla Göster",
        "Kategoriye göre",
        "Alt Kategoriye göre",
        "Şehre göre",
        "Mekana göre",
        "Tarihe göre",
        "YARDIM EDELİM",
    }

    i = 0
    while i < len(lines):
        line = clean_text(lines[i])

        if "/" in line and len(line) < 60:
            i += 1
            continue

        bad_words_extra = [
            "Ankara /",
            "İzmir /",
            "Antalya /",
            "Türkiye",
            "Şehre göre",
            "Kategoriye göre",
            "Mekana göre",
            "Tarihe göre",
        ]

        if any(b in line for b in bad_words_extra):
            i += 1
            continue

        if line and line not in banned_words and len(line) > 2 and i + 2 < len(lines):
            next_1 = clean_text(lines[i + 1])
            next_2 = clean_text(lines[i + 2])

            looks_like_date = any(
                token in next_2.lower()
                for token in [
                    "oca", "şub", "mar", "nis", "may", "haz",
                    "tem", "ağu", "eyl", "eki", "kas", "ara", "/", "."
                ]
            )

            city_match = (
                city_display.lower() in next_1.lower()
                or city_display.lower() in next_2.lower()
            )

            if looks_like_date or city_match:
                venue = next_1
                date = next_2

                if city_display.lower() in venue.lower() or city_display.lower() in date.lower():
                    events.append(
                        {
                            "title": line,
                            "venue": venue,
                            "date": date,
                            "time": "",
                            "category": "Canlı Etkinlik",
                            "city": city_display,
                            "source": "Biletix",
                            "url": "https://www.biletix.com/search/TURKIYE/tr",
                            "description": "",
                        }
                    )
                    i += 3
                    continue

        i += 1

    return dedupe_events(events)[:limit]

def dedupe_events(events: list) -> list:
    unique = []
    seen = set()

    for event in events:
        key = (
            clean_text(event.get("title", "")).lower(),
            clean_text(event.get("venue", "")).lower(),
            clean_text(event.get("date", "")).lower(),
            clean_text(event.get("source", "")).lower(),
        )
        if key not in seen and event.get("title"):
            seen.add(key)
            unique.append(event)

    return unique

def get_events(city: str = "Istanbul", limit: int = 20):
    results = []

    # 1) En güvenilir gerçek API kaynağı
    try:
        results.extend(get_ticketmaster_events(city=city, limit=limit))
    except Exception as e:
        print("Ticketmaster events error:", e)

    # 2) İstanbul için resmi İBB kültür sanat sayfası
    city_normalized = str(city or "").strip().lower()
    if city_normalized in ["istanbul", "i̇stanbul", "İstanbul".lower()]:
        try:
            results.extend(scrape_ibb_events(limit=limit))
        except Exception as e:
            print("IBB events error:", e)

    # 3) Biletix fallback
    try:
        results.extend(scrape_biletix_events(city=city, limit=limit))
    except Exception as e:
        print("Biletix events error:", e)

    return dedupe_events(results)[:limit]
