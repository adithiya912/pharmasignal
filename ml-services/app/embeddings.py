from functools import lru_cache

from sentence_transformers import SentenceTransformer

# d4data/biomedical-ner-all (the /extract model) was tried here first and
# rejected: it's fine-tuned purely for per-token classification, and its
# hidden states don't encode sentence-level semantic similarity (verified
# empirically — unrelated symptoms like "skin rash" came back more similar
# to "abdominal pain" than genuinely matching phrases were to each other,
# across every pooling strategy and layer tested). all-MiniLM-L6-v2 is
# pretrained specifically for cosine-similarity tasks and needs no
# fine-tuning/dataset to be usable at this scale.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def embed_text(text: str) -> list[float]:
    return _get_model().encode(text, normalize_embeddings=True).tolist()
