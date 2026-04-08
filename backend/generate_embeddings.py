import json
from sentence_transformers import SentenceTransformer

# Model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Dataset yükle
with open("../data/places.json", "r", encoding="utf-8") as f:
    places = json.load(f)

documents = []
for place in places:
    text = f"{place['name']}. Category: {place['category']}. Description: {place['description']}. Tags: {' '.join(place['tags'])}"
    documents.append(text)

# Embedding üret
embeddings = model.encode(documents).tolist()

# Kaydet
output = []
for place, emb in zip(places, embeddings):
    output.append({
        "id": place["id"],
        "name": place["name"],
        "embedding": emb
    })

with open("../data/place_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Embeddings created")
print("Total embeddings:", len(output))