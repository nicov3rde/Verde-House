import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def _conn(data_dir: Path) -> sqlite3.Connection:
    db_path = data_dir / "verde_clip.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(data_dir: Path) -> None:
    with _conn(data_dir) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS jobs (
                id           TEXT PRIMARY KEY,
                status       TEXT NOT NULL DEFAULT 'queued',
                input_type   TEXT NOT NULL,
                url          TEXT,
                source_path  TEXT,
                style_ref_path TEXT,
                num_clips    INTEGER NOT NULL DEFAULT 5,
                aspect_ratio TEXT NOT NULL DEFAULT '9:16',
                job_dir      TEXT,
                error_msg    TEXT,
                created_at   TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS clips (
                id           TEXT PRIMARY KEY,
                job_id       TEXT NOT NULL,
                index_num    INTEGER NOT NULL,
                title        TEXT,
                score        INTEGER DEFAULT 0,
                hook_sentence TEXT,
                start_time   REAL DEFAULT 0,
                end_time     REAL DEFAULT 0,
                clip_path    TEXT,
                status       TEXT NOT NULL DEFAULT 'pending',
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            );
        """)


def create_job(data_dir: Path, job_id: str, data: Dict[str, Any]) -> None:
    with _conn(data_dir) as conn:
        conn.execute(
            """INSERT INTO jobs
               (id, status, input_type, url, source_path, style_ref_path,
                num_clips, aspect_ratio, job_dir, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (job_id, "queued", data["input_type"], data.get("url", ""),
             data.get("source_path", ""), data.get("style_ref_path", ""),
             data.get("num_clips", 5), data.get("aspect_ratio", "9:16"),
             data.get("job_dir", ""), datetime.utcnow().isoformat()),
        )
        conn.commit()


def get_job(data_dir: Path, job_id: str) -> Optional[Dict]:
    with _conn(data_dir) as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row) if row else None


def update_job(data_dir: Path, job_id: str, updates: Dict[str, Any]) -> None:
    if not updates:
        return
    fields = ", ".join(f"{k} = ?" for k in updates)
    with _conn(data_dir) as conn:
        conn.execute(f"UPDATE jobs SET {fields} WHERE id = ?", [*updates.values(), job_id])
        conn.commit()


def list_jobs(data_dir: Path) -> List[Dict]:
    with _conn(data_dir) as conn:
        rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50").fetchall()
        return [dict(r) for r in rows]


def save_clip(data_dir: Path, clip_id: str, job_id: str, index_num: int, data: Dict[str, Any]) -> None:
    with _conn(data_dir) as conn:
        conn.execute(
            """INSERT OR REPLACE INTO clips
               (id, job_id, index_num, title, score, hook_sentence,
                start_time, end_time, clip_path, status)
               VALUES (?,?,?,?,?,?,?,?,?,'pending')""",
            (clip_id, job_id, index_num,
             data.get("title", f"Clip {index_num}"),
             int(data.get("score", 0)),
             data.get("hook_sentence", data.get("hook", "")),
             float(data.get("start_time", 0)),
             float(data.get("end_time", 0)),
             data.get("clip_path", "")),
        )
        conn.commit()


def get_clips(data_dir: Path, job_id: str) -> List[Dict]:
    with _conn(data_dir) as conn:
        rows = conn.execute(
            "SELECT * FROM clips WHERE job_id = ? ORDER BY score DESC", (job_id,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_clip(data_dir: Path, clip_id: str) -> Optional[Dict]:
    with _conn(data_dir) as conn:
        row = conn.execute("SELECT * FROM clips WHERE id = ?", (clip_id,)).fetchone()
        return dict(row) if row else None


def update_clip(data_dir: Path, clip_id: str, updates: Dict[str, Any]) -> None:
    if not updates:
        return
    fields = ", ".join(f"{k} = ?" for k in updates)
    with _conn(data_dir) as conn:
        conn.execute(f"UPDATE clips SET {fields} WHERE id = ?", [*updates.values(), clip_id])
        conn.commit()
