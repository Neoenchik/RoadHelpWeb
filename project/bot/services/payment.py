from __future__ import annotations

import uuid


async def process(order_id: uuid.UUID, amount: float, user_id: uuid.UUID) -> dict:
    """Mock payment — always succeeds."""
    return {"transaction_id": str(uuid.uuid4()), "status": "SUCCESS"}
