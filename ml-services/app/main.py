from fastapi import FastAPI

from app.classify import classify_report
from app.cluster import cluster_reports
from app.ner_extraction import extract_entities
from app.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    ClusterInfo,
    ClusterRequest,
    ClusterResponse,
    ExtractRequest,
    ExtractResponse,
)

app = FastAPI(title="PharmaSignal ML Services")


@app.post("/extract", response_model=ExtractResponse)
def extract(request: ExtractRequest) -> ExtractResponse:
    return extract_entities(request.report_text)


@app.post("/classify", response_model=ClassifyResponse)
def classify(request: ClassifyRequest) -> ClassifyResponse:
    is_adverse_event, confidence, trigger = classify_report(request.report_text, request.extracted)
    return ClassifyResponse(is_adverse_event=is_adverse_event, confidence=confidence, trigger=trigger)


@app.post("/cluster", response_model=ClusterResponse)
def cluster(request: ClusterRequest) -> ClusterResponse:
    reports = [r.model_dump() for r in request.reports]
    clusters = cluster_reports(reports)
    return ClusterResponse(clusters=[ClusterInfo(**c) for c in clusters])
