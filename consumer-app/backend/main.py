import asyncio
import json
import os
import sys
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from database import init_db, create_job, get_job, update_job, get_clips, get_clip, update_clip, save_clip

BASE_DIR   = Path(__file__).parent
DATA_DIR   = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
JOBS_DIR   = DATA_DIR / "jobs"
FRONT_DIST = BASE_DIR.parent / "frontend" / "dist"

app = FastAPI(title="Verde Clip")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

executor = ThreadPoolExecutor(max_workers=3)
job_queues: dict[str, asyncio.Queue] = {}


@app.on_event("startup")
async def startup():
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    init_db(DATA_DIR)


# ── Create job ────────────────────────────────────────────────────────────────

@app.post("/api/jobs")
async def api_create_job(
    input_type: str = Form(...),
    url: Optional[str] = Form(None),
    num_clips: int = Form(5),
    aspect_ratio: str = Form("9:16"),
    video: Optional[UploadFile] = File(None),
    style_ref: Optional[UploadFile] = File(None),
):
    job_id = str(uuid.uuid4())[:8]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True)

    source_path = ""
    if video and video.filename:
        suffix = Path(video.filename).suffix.lower() or ".mp4"
        source_path = str(job_dir / f"source{suffix}")
        content = await video.read()
        async with aiofiles.open(source_path, "wb") as f:
            await f.write(content)

    style_ref_path = ""
    if style_ref and style_ref.filename:
        suffix = Path(style_ref.filename).suffix.lower() or ".mp4"
        style_ref_path = str(job_dir / f"style_ref{suffix}")
        content = await style_ref.read()
        async with aiofiles.open(style_ref_path, "wb") as f:
            await f.write(content)

    create_job(DATA_DIR, job_id, {
        "input_type": input_type,
        "url": url or "",
        "source_path": source_path,
        "style_ref_path": style_ref_path,
        "num_clips": num_clips,
        "aspect_ratio": aspect_ratio,
        "job_dir": str(job_dir),
    })

    queue: asyncio.Queue = asyncio.Queue()
    job_queues[job_id] = queue
    loop = asyncio.get_event_loop()

    def emit(event: dict):
        loop.call_soon_threadsafe(queue.put_nowait, event)

    asyncio.create_task(_run_job(job_id, emit))
    return {"job_id": job_id}


async def _run_job(job_id: str, emit):
    loop = asyncio.get_event_loop()
    from worker import process_job_sync
    await loop.run_in_executor(executor, process_job_sync, job_id, emit, DATA_DIR)


# ── Job status ────────────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}")
async def api_get_job(job_id: str):
    job = get_job(DATA_DIR, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    job["clips"] = get_clips(DATA_DIR, job_id)
    return job


@app.get("/api/jobs")
async def api_list_jobs():
    from database import list_jobs
    jobs = list_jobs(DATA_DIR)
    return jobs


# ── SSE progress stream ───────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}/stream")
async def api_job_stream(job_id: str):
    job = get_job(DATA_DIR, job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    async def generator():
        if job_id in job_queues:
            queue = job_queues[job_id]
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield event
                    if event.get("event") in ("done", "error"):
                        job_queues.pop(job_id, None)
                        break
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        else:
            current = get_job(DATA_DIR, job_id)
            current["clips"] = get_clips(DATA_DIR, job_id)
            yield {"event": "done", "data": json.dumps(current)}

    return EventSourceResponse(
        generator(),
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Clip actions ──────────────────────────────────────────────────────────────

@app.post("/api/clips/{clip_id}/approve")
async def api_approve(clip_id: str):
    update_clip(DATA_DIR, clip_id, {"status": "approved"})
    return {"ok": True}


@app.post("/api/clips/{clip_id}/reject")
async def api_reject(clip_id: str):
    update_clip(DATA_DIR, clip_id, {"status": "rejected"})
    return {"ok": True}


@app.post("/api/clips/{clip_id}/trim")
async def api_trim(clip_id: str, body: dict):
    clip = get_clip(DATA_DIR, clip_id)
    if not clip:
        raise HTTPException(404, "Clip not found")
    start = float(body.get("start", 0))
    end   = float(body.get("end", clip["end_time"] - clip["start_time"]))
    from worker import trim_clip_sync
    loop = asyncio.get_event_loop()
    new_rel = await loop.run_in_executor(executor, trim_clip_sync, clip["clip_path"], start, end, DATA_DIR)
    update_clip(DATA_DIR, clip_id, {"clip_path": new_rel, "status": "approved"})
    return {"ok": True, "clip_path": new_rel}


# ── Bulk download ─────────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}/download")
async def api_download(job_id: str):
    clips = get_clips(DATA_DIR, job_id)
    approved = [c for c in clips if c["status"] == "approved"]
    if not approved:
        raise HTTPException(400, "No approved clips to download")
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, clip in enumerate(approved, 1):
            fp = DATA_DIR / clip["clip_path"]
            if fp.exists():
                safe_title = "".join(c for c in clip.get("title", "clip") if c.isalnum() or c in " _-")[:30]
                zf.write(str(fp), f"{i:02d}_{safe_title}.mp4")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="verde_clips_{job_id}.zip"'},
    )


# ── Media serving ─────────────────────────────────────────────────────────────

@app.get("/media/{file_path:path}")
async def serve_media(file_path: str):
    full = (DATA_DIR / file_path).resolve()
    if not str(full).startswith(str(DATA_DIR.resolve())):
        raise HTTPException(403, "Forbidden")
    if not full.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(full), media_type="video/mp4")


# ── Frontend SPA ──────────────────────────────────────────────────────────────

if FRONT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONT_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(str(FRONT_DIST / "index.html"))
