"""Background job processor.

Runs clip-bot as a subprocess per job, streams stdout lines as SSE events,
reads --output-json results when done, and saves clips to the DB.
"""
import json
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Callable, Dict

from database import DATA_DIR as _UNUSED, get_job, save_clip, update_job

# Resolve clip-bot location. Override with CLIP_BOT_DIR env var for deployment.
_DEFAULT_CLIP_BOT = Path(__file__).parent.parent.parent / "clip-bot"
CLIP_BOT_DIR = Path(os.getenv("CLIP_BOT_DIR", str(_DEFAULT_CLIP_BOT))).resolve()


def _python_bin() -> str:
    """Return the clip-bot venv Python binary for this platform."""
    win = CLIP_BOT_DIR / "venv" / "Scripts" / "python.exe"
    nix = CLIP_BOT_DIR / "venv" / "bin" / "python"
    if win.exists():
        return str(win)
    if nix.exists():
        return str(nix)
    return sys.executable  # fallback: current interpreter


def _parse_progress(line: str) -> tuple[str, int]:
    """Map a clip-bot stdout line → (message, percent). Returns ('', 0) to skip."""
    l = line.lower()
    if "[download/local]" in l:
        if "reusing" in l:
            return "Using cached download", 12
        return "Downloading video…", 8
    if "[transcribe/local]" in l:
        if "reusing" in l:
            return "Using cached transcript", 32
        if "segments" in l and "audio" in l:
            return "Transcription complete", 45
        return "Transcribing audio with Whisper…", 28
    if "[highlights] content=" in l:
        return "Detecting content type…", 50
    if "[highlights] long video" in l:
        return "Chunking long video for analysis…", 52
    if "[highlights] chunk" in l:
        m = re.search(r"chunk (\d+)/(\d+)", line)
        if m:
            i, total = int(m.group(1)), int(m.group(2))
            pct = 52 + int((i / total) * 18)
            return f"Finding highlights — chunk {i}/{total}", pct
        return "Finding viral moments…", 55
    if "[pipeline/local] cropping" in l:
        return "Rendering clips…", 72
    if "[clip/local]" in l:
        m = re.search(r"(\d+)/(\d+):", line)
        if m:
            i, total = int(m.group(1)), int(m.group(2))
            pct = 72 + int((i / total) * 25)
            return f"Rendering clip {i} of {total}…", pct
        return "Rendering clip…", 78
    return "", 0


def process_job_sync(job_id: str, emit: Callable, data_dir: Path) -> None:
    def _emit(step: str, message: str, pct: int):
        emit({"event": "progress", "data": json.dumps({"step": step, "message": message, "pct": pct})})

    try:
        job = get_job(data_dir, job_id)
        if not job:
            raise RuntimeError(f"Job {job_id} not found in DB")

        update_job(data_dir, job_id, {"status": "running"})
        job_dir = Path(job["job_dir"])
        job_dir.mkdir(parents=True, exist_ok=True)

        _emit("init", "Starting up…", 2)

        # Resolve source URL / path
        input_type = job["input_type"]
        source_url  = job.get("url") or ""

        if input_type == "youtube":
            _emit("download", "Downloading from YouTube…", 5)
        elif input_type == "twitch":
            _emit("download", "Downloading Twitch VOD…", 5)
            from downloader import download_twitch
            source_url = download_twitch(source_url, str(job_dir))
        elif input_type == "kick":
            _emit("download", "Downloading Kick VOD…", 5)
            from downloader import download_kick
            source_url = download_kick(source_url, str(job_dir))
        elif input_type == "file":
            source_url = job.get("source_path") or ""
            _emit("upload", "Reading uploaded file…", 5)

        # Style analysis (optional)
        style_eq = ""
        style_ref = job.get("style_ref_path") or ""
        if style_ref and Path(style_ref).exists():
            _emit("style", "Analyzing style reference…", 7)
            try:
                from style_analyzer import analyze_style
                profile = analyze_style(style_ref)
                style_eq = profile.get("eq_filter", "")
            except Exception as se:
                print(f"[worker] style analysis failed (non-fatal): {se}", flush=True)

        # Build env for subprocess
        env = os.environ.copy()
        env["LOCAL_OUTPUT_DIR"] = str(job_dir)
        env["PYTHONUNBUFFERED"]  = "1"

        # Load clip-bot .env values (don't override existing env)
        clip_env_path = CLIP_BOT_DIR / ".env"
        if clip_env_path.exists():
            for raw in clip_env_path.read_text(encoding="utf-8").splitlines():
                raw = raw.strip()
                if not raw or raw.startswith("#") or "=" not in raw:
                    continue
                k, _, v = raw.partition("=")
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))

        results_json = str(job_dir / "results.json")
        cmd = [
            _python_bin(),
            str(CLIP_BOT_DIR / "main.py"),
            source_url,
            "--mode", "local",
            "--num-clips", str(job.get("num_clips", 5)),
            "--aspect-ratio", job.get("aspect_ratio", "9:16"),
            "--language", "en",
            "--output-json", results_json,
        ]

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(CLIP_BOT_DIR),
            env=env,
        )

        for raw_line in proc.stdout:
            line = raw_line.rstrip()
            if line:
                print(f"[clipbot/{job_id}] {line}", flush=True)
                msg, pct = _parse_progress(line)
                if msg:
                    _emit("running", msg, pct)
                else:
                    # Forward raw log lines too so the UI can show them
                    emit({"event": "log", "data": json.dumps({"line": line})})

        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"clip-bot exited with code {proc.returncode}")

        # Read structured results
        if not Path(results_json).exists():
            raise RuntimeError("clip-bot did not write results.json")

        with open(results_json, encoding="utf-8") as f:
            results = json.load(f)

        shorts = results.get("shorts", [])
        clips_out = []

        for i, short in enumerate(shorts, 1):
            clip_abs = short.get("clip_url") or ""
            if not clip_abs or not Path(clip_abs).exists():
                continue

            # Apply style eq filter if we have one
            if style_eq:
                try:
                    from style_analyzer import apply_eq_filter
                    styled_abs = str(Path(clip_abs).parent / f"styled_{Path(clip_abs).name}")
                    apply_eq_filter(clip_abs, style_eq, styled_abs)
                    if Path(styled_abs).exists():
                        clip_abs = styled_abs
                except Exception as se:
                    print(f"[worker] style apply failed (non-fatal): {se}", flush=True)

            # Store path relative to data_dir for portability
            try:
                clip_rel = str(Path(clip_abs).resolve().relative_to(data_dir.resolve()))
            except ValueError:
                clip_rel = str(Path(clip_abs))

            clip_id = f"{job_id}_{i:02d}"
            save_clip(data_dir, clip_id, job_id, i, {
                "title": short.get("title", f"Clip {i}"),
                "score": int(short.get("score", 0)),
                "hook_sentence": short.get("hook_sentence", ""),
                "start_time": float(short.get("start_time", 0)),
                "end_time": float(short.get("end_time", 0)),
                "clip_path": clip_rel,
            })
            clips_out.append({
                "id": clip_id,
                "title": short.get("title"),
                "score": int(short.get("score", 0)),
                "hook_sentence": short.get("hook_sentence", ""),
                "clip_path": clip_rel,
                "status": "pending",
            })

        update_job(data_dir, job_id, {"status": "done"})
        _emit("done", f"Done — {len(clips_out)} clip(s) ready", 100)
        emit({"event": "done", "data": json.dumps({"status": "done", "clips": clips_out})})

    except Exception as exc:
        import traceback
        traceback.print_exc()
        update_job(data_dir, job_id, {"status": "error", "error_msg": str(exc)})
        emit({"event": "error", "data": json.dumps({"message": str(exc)})})


def trim_clip_sync(clip_rel: str, start: float, end: float, data_dir: Path) -> str:
    """Re-encode clip trimmed to [start, end]. Returns new relative path."""
    src = (data_dir / clip_rel).resolve()
    out = src.parent / f"trimmed_{src.stem}_{uuid.uuid4().hex[:6]}.mp4"
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(src),
        "-ss", f"{start:.3f}",
        "-to", f"{end:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        str(out),
    ]
    subprocess.run(cmd, check=True)
    try:
        return str(out.relative_to(data_dir.resolve()))
    except ValueError:
        return str(out)
