import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_ready_endpoint(async_client: AsyncClient):
    response = await async_client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["db"] == "connected"
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_request_id_propagation(async_client: AsyncClient):
    custom_req_id = "req-custom-test-12345"
    response = await async_client.get("/health", headers={"X-Request-ID": custom_req_id})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == custom_req_id
