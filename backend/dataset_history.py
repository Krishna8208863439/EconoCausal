"""
backend/dataset_history.py
==========================
CSV dataset history manager for EconoCausal.
Manages uploaded CSV history, historical snapshots, active dataset switching,
and file downloads.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

_ROOT = Path(__file__).resolve().parents[1]
HISTORY_DIR = _ROOT / "data" / "history"
MANIFEST_PATH = HISTORY_DIR / "manifest.json"
DATA_PATH = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
FALLBACK_RAW_PATH = _ROOT / "data" / "raw" / "mock_retail_campaign.csv"

log = logging.getLogger(__name__)

REQUIRED_COLUMNS = [
    "customer_id", "age_group", "past_purchases", "avg_order_value",
    "website_visits", "customer_segment", "discount_offered",
    "discount_amount", "purchased", "revenue", "campaign_date"
]


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def _format_date(dt: datetime.datetime) -> str:
    return dt.strftime("%d %b %Y, %I:%M %p")


class DatasetHistoryManager:
    def __init__(self, history_dir: Path = HISTORY_DIR, manifest_path: Path = MANIFEST_PATH):
        self.history_dir = history_dir
        self.manifest_path = manifest_path
        self._ensure_init()

    def _ensure_init(self) -> None:
        """Create history dir and ensure default benchmark is registered."""
        self.history_dir.mkdir(parents=True, exist_ok=True)
        manifest = self._load_manifest()

        # Check if default benchmark exists in manifest
        has_default = any(item.get("id") == "default_benchmark" for item in manifest)
        if not has_default:
            source_file = DATA_PATH if DATA_PATH.exists() else FALLBACK_RAW_PATH
            if source_file.exists():
                dest_file = self.history_dir / "cleaned_retail_campaign_default.csv"
                if not dest_file.exists():
                    shutil.copyfile(source_file, dest_file)

                try:
                    df = pd.read_csv(dest_file)
                    row_count = len(df)
                    treated = int((df["discount_offered"] == 1).sum()) if "discount_offered" in df.columns else 0
                    control = int((df["discount_offered"] == 0).sum()) if "discount_offered" in df.columns else 0
                except Exception:
                    row_count = 2200
                    treated = 1293
                    control = 907

                stat = dest_file.stat()
                now = datetime.datetime.now()
                default_entry = {
                    "id": "default_benchmark",
                    "filename": "cleaned_retail_campaign.csv",
                    "storage_filename": dest_file.name,
                    "name": "Benchmark Observational Cohort (Default)",
                    "upload_time": now.isoformat(),
                    "formatted_date": _format_date(now),
                    "rows": row_count,
                    "size_bytes": stat.st_size,
                    "size_formatted": _format_size(stat.st_size),
                    "is_default": True,
                    "is_active": True,
                    "columns_count": 11,
                    "treated_count": treated,
                    "control_count": control,
                    "source": "Benchmark Synthetic",
                }
                manifest.insert(0, default_entry)
                self._save_manifest(manifest)

    def _load_manifest(self) -> List[Dict[str, Any]]:
        if not self.manifest_path.exists():
            return []
        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.warning("Failed to load manifest, resetting: %s", e)
            return []

    def _save_manifest(self, manifest: List[Dict[str, Any]]) -> None:
        try:
            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)
        except Exception as e:
            log.error("Failed to save manifest: %s", e)

    def list_history(self) -> List[Dict[str, Any]]:
        self._ensure_init()
        return self._load_manifest()

    def save_upload(self, file_content: bytes, original_filename: str, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """Save a new uploaded CSV file to history and make it the active dataset."""
        self._ensure_init()
        file_id = f"csv_{uuid.uuid4().hex[:10]}"
        safe_name = "".join(c for c in original_filename if c.isalnum() or c in (".", "_", "-")).strip()
        if not safe_name.lower().endswith(".csv"):
            safe_name += ".csv"

        storage_filename = f"{file_id}_{safe_name}"
        target_path = self.history_dir / storage_filename

        with open(target_path, "wb") as f:
            f.write(file_content)

        # Validate CSV content
        try:
            df = pd.read_csv(target_path)
            missing = [c for c in ["discount_offered", "purchased"] if c not in df.columns]
            if missing:
                target_path.unlink(missing_ok=True)
                raise ValueError(f"Uploaded CSV is missing critical causal columns: {missing}")

            row_count = len(df)
            treated = int((df["discount_offered"] == 1).sum()) if "discount_offered" in df.columns else 0
            control = int((df["discount_offered"] == 0).sum()) if "discount_offered" in df.columns else 0
            cols_count = len(df.columns)
        except Exception as e:
            target_path.unlink(missing_ok=True)
            raise ValueError(f"Invalid CSV structure: {e}")

        # Update active dataset
        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(target_path, DATA_PATH)

        now = datetime.datetime.now()
        stat = target_path.stat()
        entry_name = custom_name.strip() if custom_name and custom_name.strip() else original_filename

        entry = {
            "id": file_id,
            "filename": original_filename,
            "storage_filename": storage_filename,
            "name": entry_name,
            "upload_time": now.isoformat(),
            "formatted_date": _format_date(now),
            "rows": row_count,
            "size_bytes": stat.st_size,
            "size_formatted": _format_size(stat.st_size),
            "is_default": False,
            "is_active": True,
            "columns_count": cols_count,
            "treated_count": treated,
            "control_count": control,
            "source": "User Upload",
        }

        manifest = self._load_manifest()
        # Mark all others as inactive
        for item in manifest:
            item["is_active"] = False

        manifest.insert(0, entry)
        self._save_manifest(manifest)
        return entry

    def save_current_snapshot(self, snapshot_name: str) -> Dict[str, Any]:
        """Save a snapshot of the current active dataset to history."""
        self._ensure_init()
        source_file = DATA_PATH if DATA_PATH.exists() else FALLBACK_RAW_PATH
        if not source_file.exists():
            raise FileNotFoundError("No active dataset available to snapshot.")

        file_id = f"snap_{uuid.uuid4().hex[:10]}"
        storage_filename = f"{file_id}_snapshot.csv"
        target_path = self.history_dir / storage_filename

        shutil.copyfile(source_file, target_path)

        df = pd.read_csv(target_path)
        row_count = len(df)
        treated = int((df["discount_offered"] == 1).sum()) if "discount_offered" in df.columns else 0
        control = int((df["discount_offered"] == 0).sum()) if "discount_offered" in df.columns else 0

        now = datetime.datetime.now()
        stat = target_path.stat()

        entry = {
            "id": file_id,
            "filename": f"{snapshot_name.replace(' ', '_').lower()}.csv",
            "storage_filename": storage_filename,
            "name": snapshot_name.strip(),
            "upload_time": now.isoformat(),
            "formatted_date": _format_date(now),
            "rows": row_count,
            "size_bytes": stat.st_size,
            "size_formatted": _format_size(stat.st_size),
            "is_default": False,
            "is_active": True,
            "columns_count": len(df.columns),
            "treated_count": treated,
            "control_count": control,
            "source": "Saved Snapshot",
        }

        manifest = self._load_manifest()
        for item in manifest:
            item["is_active"] = False

        manifest.insert(0, entry)
        self._save_manifest(manifest)
        return entry

    def activate(self, file_id: str) -> Dict[str, Any]:
        """Set a historical CSV as the current active dataset."""
        self._ensure_init()
        manifest = self._load_manifest()
        target_item = None

        for item in manifest:
            if item["id"] == file_id:
                target_item = item
                item["is_active"] = True
            else:
                item["is_active"] = False

        if not target_item:
            raise KeyError(f"Dataset with ID '{file_id}' not found in history.")

        stored_file = self.history_dir / target_item["storage_filename"]
        if not stored_file.exists():
            raise FileNotFoundError(f"Storage file for '{file_id}' does not exist on disk.")

        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(stored_file, DATA_PATH)

        self._save_manifest(manifest)
        return target_item

    def delete(self, file_id: str) -> bool:
        """Delete a historical dataset. Cannot delete the default benchmark."""
        self._ensure_init()
        manifest = self._load_manifest()
        target_item = next((item for item in manifest if item["id"] == file_id), None)

        if not target_item:
            raise KeyError(f"Dataset with ID '{file_id}' not found.")

        if target_item.get("is_default"):
            raise ValueError("Cannot delete the default benchmark dataset.")

        stored_file = self.history_dir / target_item["storage_filename"]
        stored_file.unlink(missing_ok=True)

        new_manifest = [item for item in manifest if item["id"] != file_id]

        # If deleted item was active, make default active
        if target_item.get("is_active") and new_manifest:
            new_manifest[0]["is_active"] = True
            first_file = self.history_dir / new_manifest[0]["storage_filename"]
            if first_file.exists():
                shutil.copyfile(first_file, DATA_PATH)

        self._save_manifest(new_manifest)
        return True

    def get_file_path(self, file_id: str) -> Path:
        """Return path of the historical CSV for download."""
        self._ensure_init()
        manifest = self._load_manifest()
        target_item = next((item for item in manifest if item["id"] == file_id), None)
        if not target_item:
            raise KeyError(f"Dataset with ID '{file_id}' not found.")

        file_path = self.history_dir / target_item["storage_filename"]
        if not file_path.exists():
            raise FileNotFoundError("Dataset file missing from disk.")
        return file_path


# Global singleton
history_manager = DatasetHistoryManager()
