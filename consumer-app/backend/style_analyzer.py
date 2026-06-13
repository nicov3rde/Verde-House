"""Style cloning via OpenCV frame analysis → FFmpeg eq filter.

Pipeline:
  1. Sample up to 60 frames evenly from the reference video.
  2. Convert each frame to HSV; compute mean V (brightness) and S (saturation).
  3. Map averages to FFmpeg eq filter parameters.
  4. Also run basic scene-change detection to estimate pacing (average cut length).
  5. apply_eq_filter() re-encodes a clip through the eq filter.
"""
import subprocess
from pathlib import Path
from typing import Dict


def analyze_style(video_path: str) -> Dict:
    try:
        import cv2
        import numpy as np
    except ImportError:
        return {"eq_filter": "", "avg_cut_len": None, "note": "opencv not available"}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"eq_filter": "", "avg_cut_len": None, "note": "could not open reference video"}

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    sample_step  = max(1, total_frames // 60)

    brightness_vals = []
    saturation_vals = []
    prev_gray = None
    diffs = []

    for idx in range(0, total_frames, sample_step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            break

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        brightness_vals.append(float(np.mean(hsv[:, :, 2])))
        saturation_vals.append(float(np.mean(hsv[:, :, 1])))

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            diff = float(np.mean(cv2.absdiff(gray, prev_gray)))
            diffs.append((idx, diff))
        prev_gray = gray

    cap.release()

    if not brightness_vals:
        return {"eq_filter": "", "avg_cut_len": None}

    mean_v = sum(brightness_vals) / len(brightness_vals)
    mean_s = sum(saturation_vals) / len(saturation_vals)

    # Normalise to FFmpeg eq ranges:
    #   brightness: [-1.0 .. 1.0], 0 = neutral (128 V channel)
    #   saturation: [0.0 .. 3.0],  1 = neutral (no change)
    brightness = round((mean_v / 127.5) - 1.0, 3)
    brightness = max(-0.5, min(0.5, brightness))   # clamp to sane range
    saturation = round(mean_s / 127.5, 3)
    saturation = max(0.5, min(2.5, saturation))

    eq_filter = f"eq=brightness={brightness}:saturation={saturation}"

    # Estimate avg cut length from large frame diffs
    if diffs:
        threshold = sorted(d for _, d in diffs)[int(len(diffs) * 0.85)]
        cut_frames = [idx for idx, d in diffs if d > threshold]
        if len(cut_frames) > 1:
            gaps = [cut_frames[i + 1] - cut_frames[i] for i in range(len(cut_frames) - 1)]
            avg_cut_len = round(sum(gaps) / len(gaps) / fps, 1)
        else:
            avg_cut_len = None
    else:
        avg_cut_len = None

    return {
        "eq_filter":   eq_filter,
        "avg_cut_len": avg_cut_len,
        "mean_brightness": mean_v,
        "mean_saturation": mean_s,
    }


def apply_eq_filter(src_path: str, eq_filter: str, out_path: str) -> None:
    """Re-encode src_path through the eq filter into out_path."""
    if not eq_filter:
        return
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", src_path,
        "-vf", eq_filter,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "copy",
        out_path,
    ]
    subprocess.run(cmd, check=True)
