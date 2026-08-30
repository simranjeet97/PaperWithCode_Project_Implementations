import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_api_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "Agent Time Machine" in data["app"]

@pytest.mark.asyncio
async def test_api_models():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0

@pytest.mark.asyncio
async def test_api_run_scenario():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "scenario_type": "vacation_booking",
            "fault_injection": False,
            "model_name": "qwen2.5:7b",
            "step_delay": 0.01
        }
        response = await ac.post("/api/run-scenario", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "tx_id" in data
        assert data["status"] == "STARTED"

@pytest.mark.asyncio
async def test_api_chat_plan():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "user_message": "Book my vacation to Hawaii with hotel and flight",
            "model_name": "qwen2.5:7b"
        }
        response = await ac.post("/api/chat-plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["scenario_type"] in ["vacation_booking", "custom"]
        assert len(data["plan"]["steps"]) >= 3
