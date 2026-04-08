import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")

PLACES_PATH = os.path.join(DATA_DIR, "places.json")
EMBEDDINGS_PATH = os.path.join(DATA_DIR, "place_embeddings.json")

model = SentenceTransformer("all-MiniLM-L6-v2")

with open(EMBEDDINGS_PATH, "r", encoding="utf-8") as f:
    embeddings = json.load(f)

with open(PLACES_PATH, "r", encoding="utf-8") as f:
    places = json.load(f)

place_vectors = np.array([e["embedding"] for e in embeddings])


def recommend_places(query, top_k=3):
    query_vector = model.encode([query])
    similarities = cosine_similarity(query_vector, place_vectors)[0]
    top_indices = similarities.argsort()[-top_k:][::-1]

    results = []
    for idx in top_indices:
        place_id = embeddings[idx]["id"]
        for p in places:
            if p["id"] == place_id:
                results.append(p)
                break

    return results