from google.genai import types

from app.gemini_client import MODEL, get_gemini_client

# Fallback for the Drug Interaction Checker when neither the Neo4j graph
# nor the GNN has anything to say about a pair (see interaction-panel.tsx's
# "no known interaction" case) — the checker used to just stop there. This
# gives the user a general, clearly-labeled-as-unverified answer instead.
#
# Deliberately NOT using Gemini's Google Search grounding tool (which
# would let us cite the exact page an answer came from): verified directly
# that grounding hits a 429 RESOURCE_EXHAUSTED on the very first call on
# a free-tier key, even though plain generation works fine — it isn't
# reliably free. So this asks Gemini from its own general knowledge
# (explicitly labeled as such, both in the prompt and in the UI) and
# points to a fixed list of real, stable, reputable general-reference
# sites instead of fabricating a specific per-answer citation.
REFERENCE_SITES = [
    {"name": "Drugs.com Interaction Checker", "url": "https://www.drugs.com/drug_interactions.html"},
    {"name": "MedlinePlus (U.S. National Library of Medicine)", "url": "https://medlineplus.gov/druginformation.html"},
    {"name": "FDA DailyMed", "url": "https://dailymed.nlm.nih.gov/dailymed/"},
]

SYSTEM_PROMPT = (
    "You are a general medical-information assistant inside PharmaSignal, "
    "a drug-safety research prototype. The user is asking about a drug "
    "pair that has NO documented interaction in PharmaSignal's own "
    "verified Neo4j interaction graph and no trained-model signal either "
    "— this is explicitly a case where PharmaSignal's own data has "
    "nothing to say. Answer from your general medical knowledge: briefly "
    "state whether these two drugs are commonly known to interact, and "
    "how serious that's generally considered to be. Be plain about "
    "uncertainty — say so if you're not confident. Do not claim this "
    "answer is verified or sourced from a specific document; it is "
    "general knowledge only. Always end by recommending the user confirm "
    "with a pharmacist or doctor before acting on it."
)


def general_drug_pair_info(drug_a: str, drug_b: str) -> tuple[str, list[dict]]:
    client = get_gemini_client()  # raises ChatNotConfigured before any network call if unset

    response = client.models.generate_content(
        model=MODEL,
        contents=f"Are {drug_a} and {drug_b} known to interact?",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            # gemini-flash-latest spends a chunk of max_output_tokens on
            # invisible "thinking" tokens before the visible answer
            # (verified directly: ~470 thinking tokens for a 2-3 sentence
            # answer) — 512 truncated the answer mid-sentence in testing.
            # This model also rejects thinking_config(thinking_budget=0)
            # outright (400 INVALID_ARGUMENT), so headroom is the fix.
            max_output_tokens=2048,
        ),
    )

    answer = response.text or "No general information could be generated for this pair."
    return answer, REFERENCE_SITES
