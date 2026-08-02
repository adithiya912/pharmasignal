from fastapi import FastAPI

from app.ner_extraction import extract_entities
from app.schemas import ExtractRequest, ExtractResponse

app = FastAPI(title="PharmaSignal ML Services")


@app.post("/extract", response_model=ExtractResponse)
def extract(request: ExtractRequest) -> ExtractResponse:
    return extract_entities(request.report_text)
