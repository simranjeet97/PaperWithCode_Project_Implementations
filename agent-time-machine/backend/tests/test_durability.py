import pytest
import asyncio
from app.core.transaction_manager import TransactionManager
from app.scenarios.ecommerce_refund import run_ecommerce_scenario

@pytest.mark.asyncio
async def test_durability_and_time_travel_snapshots():
    tx = TransactionManager(task_name="Durability Test")
    await run_ecommerce_scenario(tx, fault_on_step4=False, step_delay=0.01)
    
    # Check baseline snapshot at t=0
    snap0 = tx.get_time_travel_snapshot(0)
    assert snap0 is not None
    assert snap0.summary_metrics["customer_balance"] == 100.0
    assert snap0.summary_metrics["inventory_stock"] == 4
    
    # Check intermediate snapshot at step 2 (restocked item)
    snap2 = tx.get_time_travel_snapshot(2)
    assert snap2 is not None
    assert snap2.summary_metrics["inventory_stock"] == 5
    
    # Check intermediate snapshot at step 3 (refund issued)
    snap3 = tx.get_time_travel_snapshot(3)
    assert snap3 is not None
    assert snap3.summary_metrics["customer_balance"] == 0.0
    
    # Check all snapshots exported
    all_snaps = tx.wal.get_all_snapshots()
    assert len(all_snaps) >= 4
