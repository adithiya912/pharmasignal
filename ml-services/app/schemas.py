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
