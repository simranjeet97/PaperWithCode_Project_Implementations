import pytest
from app.core.isolation_sandbox import IsolationSandbox

def test_isolation_sandbox_cloning():
    sandbox1 = IsolationSandbox("main")
    sandbox1.update_db("customers", "cust_101", {"balance": 100.0})
    
    # Clone for an isolated branch
    sandbox2 = sandbox1.clone()
    sandbox2.update_db("customers", "cust_101", {"balance": 0.0})
    sandbox2.write_file("/workspace/dirty.txt", "uncommitted dirty write")
    
    # Ensure sandbox1 is pristine (no dirty reads or write leakage)
    assert sandbox1.database["customers"]["cust_101"]["balance"] == 100.0
    assert "/workspace/dirty.txt" not in sandbox1.workspace_files
    
    # Ensure sandbox2 has its isolated branch mutations
    assert sandbox2.database["customers"]["cust_101"]["balance"] == 0.0
    assert "/workspace/dirty.txt" in sandbox2.workspace_files

def test_isolation_memory_node_pruning():
    sandbox = IsolationSandbox()
    sandbox.add_memory_node("temp_failed_retry", "EXPERIMENT", "Failed aggregation trial")
    assert any(n["id"] == "temp_failed_retry" for n in sandbox.memory_graph)
    
    # Prune unvalidated/failed attempt
    sandbox.remove_memory_node("temp_failed_retry")
    assert not any(n["id"] == "temp_failed_retry" for n in sandbox.memory_graph)
