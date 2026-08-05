# Portable across Render/Koyeb/Cloud Run/HF Spaces — all inject the
# listen port via a $PORT env var except HF Spaces, which fixes it via
# README.md's app_port instead; defaulting to 7860 keeps HF Spaces working
# unmodified while every $PORT-based host overrides it at runtime.
# Runs the same FastAPI app used for local dev (app/main.py) — no code
# path is deploy-specific.
FROM python:3.10-slim

WORKDIR /app

# CPU-only torch: the plain PyPI wheel pulls a CUDA build (multi-GB) that
# this app never uses — no GPU anywhere in the pipeline. Installed before
# requirements.txt (which also lists a bare, unpinned "torch") so pip
# leaves this exact build alone rather than resolving a different one.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
ENV PORT=7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
