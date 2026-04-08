import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CITY_MAP = {
    "istanbul": "İstanbul",
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


def normalize_city(city: str) -> str:
    city = city.strip().lower()
    return CITY_MAP.get(city, city.title())


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
            title = lines[i]
            venue = lines[i + 1]
            date = lines[i + 2]
            time_line = lines[i + 3]
            category = lines[i + 4]

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
                            "category": category,
                            "city": "Istanbul",
                            "source": "IBB Kultur Sanat",
                        }
                    )
                    i += 5
                    continue
        i += 1

    unique = []
    seen = set()

    for event in events:
        key = (event["title"], event["venue"], event["date"], event["time"])
        if key not in seen:
            seen.add(key)
            unique.append(event)

    return unique[:limit]


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
        line = lines[i]

        # kötü filtre / bölge satırlarını atla
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

        # Biletix text çıktısında genelde başlık satırını takiben mekan/şehir ve tarih geliyor
        if (
            line
            and line not in banned_words
            and len(line) > 2
            and i + 2 < len(lines)
        ):
            next_1 = lines[i + 1]
            next_2 = lines[i + 2]

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

                if (
                    city_display.lower() in venue.lower()
                    or city_display.lower() in date.lower()
                    or city.lower() == "turkiye"
                ):
                    events.append(
                        {
                            "title": line,
                            "venue": venue,
                            "date": date,
                            "time": "",
                            "category": "Live Event",
                            "city": city_display,
                            "source": "Biletix",
                        }
                    )
                    i += 3
                    continue

        i += 1

    unique = []
    seen = set()

    for event in events:
        key = (event["title"], event["venue"], event["date"])
        if key not in seen:
            seen.add(key)
            unique.append(event)

    return unique[:limit]


def get_events(city: str = "Istanbul", limit: int = 20):
    city_normalized = city.strip().lower()
    results = []

    if city_normalized in ["istanbul", "i̇stanbul"]:
        results.extend(scrape_ibb_events(limit=limit))

    try:
        results.extend(scrape_biletix_events(city=city, limit=limit))
    except Exception:
        pass

    unique = []
    seen = set()

    for event in results:
        key = (
            event.get("title", ""),
            event.get("venue", ""),
            event.get("date", ""),
            event.get("source", ""),
        )
        if key not in seen:
            seen.add(key)
            unique.append(event)

    return unique[:limit]