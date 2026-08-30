import pytest
import asyncio
from app.core.transaction_manager import TransactionManager
from app.core.models import TxStatus, ActionType
from app.core.isolation_sandbox import IsolationSandbox
from app.core.ollama_client import OllamaClient
from app.scenarios.ecommerce_refund import run_ecommerce_scenario

@pytest.mark.asyncio
async def test_atomicity_success():
    """Test normal successful transaction commit without faults."""
    tx = TransactionManager(task_name="Test Success Protocol")
    result = await run_ecommerce_scenario(tx, fault_on_step4=False, step_delay=0.01)
    
    assert result["status"] == "COMMITTED"
    assert tx.status == TxStatus.COMMITTED
    # Balance should be 0, inventory stock should be 5
    assert tx.sandbox.database["customers"]["cust_101"]["balance"] == 0.0
    assert tx.sandbox.database["inventory"]["item_99"]["stock"] == 5

@pytest.mark.asyncio
async def test_atomicity_rollback_on_step4_failure():
    """Test all-or-nothing rollback when step 4 encounters critical failure."""
    tx = TransactionManager(task_name="Test Failure Rollback")
    result = await run_ecommerce_scenario(tx, fault_on_step4=True, step_delay=0.01)
    
    assert result["status"] == "ROLLED_BACK"
    assert tx.status == TxStatus.ROLLED_BACK
    
    # Verify state was restored 100% to baseline
    assert tx.sandbox.database["customers"]["cust_101"]["balance"] == 100.0
    assert tx.sandbox.database["inventory"]["item_99"]["stock"] == 4
    assert len(tx.sandbox.database["refunds"]) == 0
    
    # Check WAL records
    compensable = tx.wal.get_compensable_records()
    # At least step 2 and step 3 should have been registered as compensable
    assert len(compensable) >= 2
