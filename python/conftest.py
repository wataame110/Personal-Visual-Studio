# E2E テスト設定
import json
import pathlib
import pytest

BASE_URL = "http://localhost:4173"

ROOT = pathlib.Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def medical_credentials():
    """開発用プロファイルの資格情報を読み込む（実患者情報ではない）"""
    data = json.loads((ROOT / "json" / "auth" / "profiles.json").read_text())
    p = next(x for x in data["profiles"] if x["enabled"])
    return {"userId": p["userId"], "loginPassword": p["loginPassword"], "permitPassword": p["permitPassword"]}
