import unicodedata


def normalize_text(text: str) -> str:
    if not text:
        return ""

    text = text.lower().strip()

    replacements = {
        "ç": "c",
        "ğ": "g",
        "ı": "i",
        "İ": "i",
        "ö": "o",
        "ş": "s",
        "ü": "u",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    return text.strip()


CITY_ALIASES = {
    "istanbul": ["istanbul"],
    "ankara": ["ankara"],
    "izmir": ["izmir", "i̇zmir"],
    "antalya": ["antalya"],
    "bursa": ["bursa"],
    "adana": ["adana"],
    "eskisehir": ["eskisehir", "eskişehir"],
    "konya": ["konya"],
    "trabzon": ["trabzon"],
    "samsun": ["samsun"],
    "gaziantep": ["gaziantep"],
    "kayseri": ["kayseri"],
    "mugla": ["mugla", "muğla"],
    "mersin": ["mersin"],
    "diyarbakir": ["diyarbakir", "diyarbakır"],
    "cappadocia": ["cappadocia", "kapadokya", "nevsehir", "nevşehir", "goreme", "göreme", "urgup", "ürgüp", "uchisar", "uçhisar", "avanos"],
}


def detect_city(text: str):
    normalized = normalize_text(text)

    for canonical_city, aliases in CITY_ALIASES.items():
        for alias in aliases:
            if normalize_text(alias) in normalized:
                return canonical_city

    return None


def get_city_aliases(city: str):
    if not city:
        return []

    city = normalize_text(city)
    aliases = CITY_ALIASES.get(city, [city])
    return [normalize_text(a) for a in aliases]


def is_event_query(text: str) -> bool:
    normalized = normalize_text(text)

    keywords = [
        "event", "events", "concert", "concerts", "festival", "festivals",
        "theatre", "theater", "show", "shows", "exhibition", "exhibitions",
        "etkinlik", "etkinlikler", "konser", "konserler",
        "tiyatro", "sergi", "gosteri", "gösteri"
    ]

    return any(k in normalized for k in keywords)


def is_hidden_gems_query(text: str) -> bool:
    normalized = normalize_text(text)

    keywords = [
        # English
        "hidden gem", "hidden gems", "underrated", "local favorite",
        "local favorites", "secret spot", "secret spots",
        "quiet places", "less known places",

        # Turkish
        "gizli yer", "gizli yerler", "az bilinen", "kesfedilmemis",
        "keşfedilmemiş", "yerel favoriler", "sakli", "saklı",
        "bilinmeyen yerler", "sakin yerler"
    ]

    return any(normalize_text(k) in normalized for k in keywords)


def detect_category(text: str):
    normalized = normalize_text(text)

    category_map = {
        "hotel": ["hotel", "hotels", "otel", "oteller", "resort", "hostel", "lodging"],
        "restaurant": ["restaurant", "restaurants", "restoran", "restoranlar", "food", "yemek", "dining"],
        "cafe": ["cafe", "cafes", "kahve", "coffee", "coffee shop"],
        "museum": ["museum", "museums", "muze", "müze"],
        "attraction": ["attraction", "attractions", "place", "places", "yer", "yerler", "landmark"],
        "beach": ["beach", "beaches", "plaj", "plajlar"],
        "park": ["park", "parks"],
        "shopping": ["shopping", "alisveris", "alışveriş", "mall"],
    }

    for category, keywords in category_map.items():
        for keyword in keywords:
            if normalize_text(keyword) in normalized:
                return category

    return None

def detect_district(text: str):
    normalized = normalize_text(text)

    districts = [
        "kadikoy",
        "beyoglu",
        "besiktas",
        "fatih",
        "uskudar",
        "sisli",
        "bakirkoy",
        "sariyer",
        "eyup",
        "muratpasa",
        "konyaalti",
        "goreme",
        "uchisar",
        "urgup",
        "avanos",
        "cankaya",
        "selcuklu",
        "ortahisar",
    ]

    for district in districts:
        if district in normalized:
            return district

    return None