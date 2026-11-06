import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_stub(async_client: AsyncClient):
    response = await async_client.get("/api/v1/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert "Supabase Auth" in data["message"]
    assert data["user"] is None
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_not_found_error_envelope(async_client: AsyncClient):
    response = await async_client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data or "code" in data
