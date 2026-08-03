from typing import Literal

from pydantic import BaseModel

Severity = Literal["low", "medium", "high", "unknown"]


class ExtractRequest(BaseModel):
    report_text: str


class ExtractResponse(BaseModel):
    drugs: list[str]
    symptoms: list[str]
    dosages: list[str]
    duration: str
    severity: Severity


class ClassifyRequest(BaseModel):
    report_text: str
    extracted: ExtractResponse


class ClassifyResponse(BaseModel):
    is_adverse_event: bool
    confidence: float
    trigger: list[str]


class EmbedRequest(BaseModel):
    report_text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class ReportEmbedding(BaseModel):
    id: str
    embedding: list[float]


class ClusterRequest(BaseModel):
    reports: list[ReportEmbedding]


class ClusterInfo(BaseModel):
    cluster_id: str
    report_ids: list[str]
    label: str
    size: int


class ClusterResponse(BaseModel):
    clusters: list[ClusterInfo]


class EvidenceRequest(BaseModel):
    query: str


EvidenceSourceType = Literal["PubMed", "DrugBank", "FDA"]


class EvidenceSource(BaseModel):
    title: str
    source: EvidenceSourceType
    url: str
    relevance: float


class EvidenceResponse(BaseModel):
    sources: list[EvidenceSource]


class PredictInteractionRequest(BaseModel):
    drug_a: str
    drug_b: str


InteractionEvidenceTier = Literal["major", "moderate", "weak"]


class PredictInteractionResponse(BaseModel):
    interaction_predicted: bool
    confidence: float
    graph_path: list[str]
    evidence: InteractionEvidenceTier | None = None


RiskLevel = Literal["low", "medium", "high"]


class RiskScoreRequest(BaseModel):
    report_id: str
    classification: ClassifyResponse
    interaction: PredictInteractionResponse
    evidence: EvidenceResponse


class RiskScoreResponse(BaseModel):
    risk_level: RiskLevel
    explanation: str
    contributing_reports: list[str]
    contributing_sources: list[str]
