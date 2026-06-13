"""Third-party download backends for Twitch and Kick.

Both functions check whether the required CLI tool is installed and raise a
clear RuntimeError if not, so the job fails fast with a readable message.
"""
import os
import re
import shutil
import subprocess
from pathlib import Path


# ── Twitch (TwitchDownloaderCLI) ──────────────────────────────────────────────

def download_twitch(url: str, out_dir: str) -> str:
    """Download a Twitch VOD using TwitchDownloaderCLI.

    Install: https://github.com/lay295/TwitchDownloader/releases
    Put TwitchDownloaderCLI (or TwitchDownloaderCLI.exe) on your PATH.
    """
    cli = shutil.which("TwitchDownloaderCLI") or shutil.which("TwitchDownloaderCLI.exe")
    if not cli:
        raise RuntimeError(
            "TwitchDownloaderCLI not found on PATH.\n"
            "Download it from https://github.com/lay295/TwitchDownloader/releases "
            "and place the binary on your system PATH."
        )

    # Extract VOD id from URL: twitch.tv/videos/123456789
    m = re.search(r"twitch\.tv/videos/(\d+)", url)
    if not m:
        raise RuntimeError(f"Could not extract Twitch VOD ID from URL: {url}")
    vod_id = m.group(1)

    out_path = str(Path(out_dir) / f"source_{vod_id}.mp4")
    if Path(out_path).exists():
        print(f"[twitch] reusing cached: {out_path}", flush=True)
        return out_path

    print(f"[twitch] downloading VOD {vod_id}…", flush=True)
    subprocess.run(
        [cli, "videodownload", "--id", vod_id, "-o", out_path, "--quality", "720p"],
        check=True,
    )
    return out_path


# ── Kick (kick-dl) ────────────────────────────────────────────────────────────

def download_kick(url: str, out_dir: str) -> str:
    """Download a Kick VOD using kick-dl.

    Install: pip install kick-dl  (https://github.com/juliogarciape/kick-dl)
    Or: npm install -g kick-dl
    """
    cli = shutil.which("kick-dl") or shutil.which("kick-dl.cmd")
    if not cli:
        raise RuntimeError(
            "kick-dl not found on PATH.\n"
            "Install it with: pip install kick-dl\n"
            "or: npm install -g kick-dl\n"
            "See https://github.com/juliogarciape/kick-dl"
        )

    # Extract slug from URL
    m = re.search(r"kick\.com/(?:video/)?([^/?#]+)", url)
    slug = m.group(1) if m else url

    out_path = str(Path(out_dir) / f"source_kick_{slug[:20]}.mp4")
    if Path(out_path).exists():
        print(f"[kick] reusing cached: {out_path}", flush=True)
        return out_path

    print(f"[kick] downloading {slug}…", flush=True)
    subprocess.run([cli, url, "-o", out_path], check=True)
    return out_path
