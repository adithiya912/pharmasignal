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
