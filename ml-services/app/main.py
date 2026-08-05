from fastapi import FastAPI, HTTPException

from app.chat import answer_question
from app.classify import classify_report
from app.cluster import cluster_reports
from app.embeddings import embed_text
from app.evidence import retrieve_evidence
from app.gemini_client import ChatNotConfigured
from app.general_info import general_drug_pair_info
from app.graph import get_full_graph
from app.model_info import get_model_eval
from app.ner_extraction import extract_entities
from app.predict_interaction import predict_interaction
from app.risk_score import compute_risk_score
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ClassifyRequest,
    ClassifyResponse,
    ClusterInfo,
    ClusterRequest,
    ClusterResponse,
    EmbedRequest,
    EmbedResponse,
    EvidenceRequest,
    EvidenceResponse,
    EvidenceSource,
    ExtractRequest,
    ExtractResponse,
    GeneralInfoRequest,
    GeneralInfoResponse,
    GraphEdge,
    GraphNode,
    GraphResponse,
    ModelInfoResponse,
    PredictInteractionRequest,
    PredictInteractionResponse,
    ReferenceSite,
    RiskScoreRequest,
    RiskScoreResponse,
)

app = FastAPI(title="PharmaSignal ML Services")


@app.post("/extract", response_model=ExtractResponse)
def extract(request: ExtractRequest) -> ExtractResponse:
    return extract_entities(request.report_text)


@app.post("/classify", response_model=ClassifyResponse)
def classify(request: ClassifyRequest) -> ClassifyResponse:
    is_adverse_event, confidence, trigger = classify_report(request.report_text, request.extracted)
    return ClassifyResponse(is_adverse_event=is_adverse_event, confidence=confidence, trigger=trigger)


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest) -> EmbedResponse:
    return EmbedResponse(embedding=embed_text(request.report_text))


@app.post("/cluster", response_model=ClusterResponse)
def cluster(request: ClusterRequest) -> ClusterResponse:
    reports = [r.model_dump() for r in request.reports]
    clusters = cluster_reports(reports)
    return ClusterResponse(clusters=[ClusterInfo(**c) for c in clusters])


@app.post("/retrieve-evidence", response_model=EvidenceResponse)
def retrieve_evidence_endpoint(request: EvidenceRequest) -> EvidenceResponse:
    sources = retrieve_evidence(request.query)
    return EvidenceResponse(sources=[EvidenceSource(**s) for s in sources])


@app.post("/predict-interaction", response_model=PredictInteractionResponse)
def predict_interaction_endpoint(request: PredictInteractionRequest) -> PredictInteractionResponse:
    interaction_predicted, confidence, graph_path, evidence = predict_interaction(request.drug_a, request.drug_b)
    return PredictInteractionResponse(
        interaction_predicted=interaction_predicted,
        confidence=confidence,
        graph_path=graph_path,
        evidence=evidence,
    )


@app.post("/risk-score", response_model=RiskScoreResponse)
def risk_score_endpoint(request: RiskScoreRequest) -> RiskScoreResponse:
    risk_level, explanation, contributing_reports, contributing_sources = compute_risk_score(
        request.classification, request.interaction, request.evidence
    )
    return RiskScoreResponse(
        risk_level=risk_level,
        explanation=explanation,
        contributing_reports=contributing_reports,
        contributing_sources=contributing_sources,
    )


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest) -> ChatResponse:
    history = [{"role": m.role, "content": m.content} for m in request.history]
    try:
        answer, sources = answer_question(request.message, history)
    except ChatNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="AI assistant is not configured (no Gemini API credentials)."
        ) from exc
    return ChatResponse(answer=answer, sources=[EvidenceSource(**s) for s in sources])


@app.post("/general-drug-info", response_model=GeneralInfoResponse)
def general_drug_info_endpoint(request: GeneralInfoRequest) -> GeneralInfoResponse:
    try:
        answer, reference_sites = general_drug_pair_info(request.drug_a, request.drug_b)
    except ChatNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="AI assistant is not configured (no Gemini API credentials)."
        ) from exc
    return GeneralInfoResponse(answer=answer, reference_sites=[ReferenceSite(**r) for r in reference_sites])


@app.get("/graph", response_model=GraphResponse)
def graph_endpoint() -> GraphResponse:
    nodes, edges = get_full_graph()
    return GraphResponse(
        nodes=[GraphNode(**n) for n in nodes],
        edges=[GraphEdge(**e) for e in edges],
    )


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info_endpoint() -> ModelInfoResponse:
    return ModelInfoResponse(**get_model_eval())
