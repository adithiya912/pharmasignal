from google.genai import types

from app.evidence import retrieve_evidence
from app.gemini_client import MODEL, ChatNotConfigured, get_gemini_client

# Per docs/api-contracts.md's non-negotiable rule ("no endpoint returns a
# bare score with nothing backing it"), this endpoint retrieves real
# evidence via the same corpus/embeddings as /retrieve-evidence and asks
# Gemini to synthesize an answer ONLY from that evidence — never from
# unaided model knowledge. See CLAUDE.md: "NEVER fabricate drug
# interaction data or risk scores."

SYSTEM_PROMPT = (
    "You are PharmaSignal's medicine information assistant. Answer the "
    "user's question using ONLY the evidence excerpts provided below "
    "(PubMed, DrugBank, and FDA/DailyMed sources) — cite them inline as "
    "[1], [2], etc. matching the numbered list. If the evidence doesn't "
    "cover the question, say so plainly rather than answering from general "
    "knowledge. You are not a doctor — always suggest the user confirm any "
    "personal medical decision with a healthcare professional. This "
    "evidence corpus is a research prototype and currently only covers a "
    "handful of drugs (ibuprofen, metformin, warfarin, amoxicillin, and a "
    "few others) — say so plainly if the question falls outside it."
)


def _to_gemini_history(history: list[dict]) -> list[types.Content]:
    # Gemini's roles are "user"/"model", not Anthropic's "user"/"assistant"
    # (the shape ChatMessage/ChatRequest already use, per api-contracts.md).
    return [
        types.Content(
            role="model" if h["role"] == "assistant" else "user",
            parts=[types.Part(text=h["content"])],
        )
        for h in history
    ]


def answer_question(message: str, history: list[dict]) -> tuple[str, list[dict]]:
    sources = retrieve_evidence(message, top_k=5)
    relevant = [s for s in sources if s["relevance"] >= 0.3]

    evidence_block = (
        "\n\n".join(
            f"[{i + 1}] {s['title']} ({s['source']}): {s['url']}" for i, s in enumerate(relevant)
        )
        or "No matching evidence was found in the corpus for this question."
    )

    client = get_gemini_client()  # raises ChatNotConfigured before any network call if unset

    contents = _to_gemini_history(history) + [
        types.Content(
            role="user",
            parts=[types.Part(text=f"Evidence:\n{evidence_block}\n\nQuestion: {message}")],
        )
    ]

    response = client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            # See app/general_info.py for why this is 2048, not a smaller
            # number: gemini-flash-latest's invisible "thinking" tokens
            # share this same budget with the visible answer.
            max_output_tokens=2048,
        ),
    )

    # response.text returns None (never raises) when the response has no
    # text part — e.g. blocked by safety filters — verified directly
    # against the installed SDK's _get_text() implementation.
    answer = response.text
    if not answer:
        return (
            "I wasn't able to answer that question. Please rephrase it or ask something else.",
            relevant,
        )

    return answer, relevant
