import copy
import time
from typing import Dict, Any, List, Optional
from app.core.models import StateSnapshot

class IsolationSandbox:
    """
    Copy-on-Write Virtual Sandbox.
    Enforces Semantic Isolation:
    Uncommitted modifications exist only in isolated execution branch.
    If a transaction fails or retries, this sandbox can discard dirty state instantly.
    """
    def __init__(self, name: str = "main"):
        self.name = name
        self.database: Dict[str, Dict[str, Any]] = {
            "customers": {
                "cust_101": {"id": "cust_101", "name": "Alice Walker", "balance": 100.0, "status": "active"}
            },
            "inventory": {
                "item_99": {"sku": "item_99", "name": "Mechanical Keyboard", "stock": 4, "reserved": 1}
            },
            "orders": {
                "ord_882": {"id": "ord_882", "customer_id": "cust_101", "sku": "item_99", "amount": 100.0, "status": "COMPLETED"}
            },
            "refunds": {},
            "lakehouse_metrics": {
                "wollaston_beach": {"observations": 7585, "pearson_r": 0.206, "status": "PENDING_VALIDATION"}
            }
        }
        self.api_calls: List[Dict[str, Any]] = []
        self.workspace_files: Dict[str, str] = {
            "/workspace/manifest.json": '{"version": "1.0", "task": "acid_agent_execution"}',
            "/workspace/orders_export.csv": "order_id,amount,status\nord_882,100,PAID\n"
        }
        self.memory_graph: List[Dict[str, Any]] = [
            {"id": "node_1", "type": "TASK", "label": "Customer Refund Protocol", "status": "ACTIVE"},
            {"id": "node_2", "type": "RESOURCE", "label": "Order ord_882 ($100.00)", "status": "LOCKED"}
        ]
        self.created_at = time.time()

    def clone(self) -> "IsolationSandbox":
        new_sandbox = IsolationSandbox(name=f"{self.name}_branch")
        new_sandbox.database = copy.deepcopy(self.database)
        new_sandbox.api_calls = copy.deepcopy(self.api_calls)
        new_sandbox.workspace_files = copy.deepcopy(self.workspace_files)
        new_sandbox.memory_graph = copy.deepcopy(self.memory_graph)
        return new_sandbox

    def update_db(self, table: str, record_id: Any, data: Dict[str, Any]):
        if table not in self.database:
            self.database[table] = {}
        if not isinstance(record_id, (str, int)):
            return
        if record_id in self.database[table]:
            self.database[table][record_id].update(data)
        else:
            self.database[table][record_id] = data

    def delete_db_record(self, table: str, record_id: Any):
        if not isinstance(record_id, (str, int)):
            return
        if table in self.database and record_id in self.database[table]:
            del self.database[table][record_id]

    def record_api_call(self, endpoint: str, method: str, payload: Dict[str, Any], status_code: int, response: Dict[str, Any]):
        self.api_calls.append({
            "call_id": f"api_{len(self.api_calls) + 1}",
            "endpoint": endpoint,
            "method": method,
            "payload": payload,
            "status_code": status_code,
            "response": response,
            "timestamp": time.time()
        })

    def write_file(self, path: str, content: str):
        self.workspace_files[path] = content

    def delete_file(self, path: str):
        if path in self.workspace_files:
            del self.workspace_files[path]

    def add_memory_node(self, node_id: str, node_type: str, label: str, status: str = "VALIDATED"):
        self.memory_graph.append({
            "id": node_id,
            "type": node_type,
            "label": label,
            "status": status,
            "timestamp": time.time()
        })

    def remove_memory_node(self, node_id: str):
        self.memory_graph = [n for n in self.memory_graph if n.get("id") != node_id]

    def capture_snapshot(self, step_index: int, step_name: str, description: str, llm_trace: Optional[Dict[str, Any]] = None) -> StateSnapshot:
        # Extract summary metrics
        customer = self.database.get("customers", {}).get("cust_101", {})
        wallet = self.database.get("travel_wallet", {}).get("wallet_user", {})
        inventory = self.database.get("inventory", {}).get("item_99", {})
        
        balance = customer.get("balance", wallet.get("balance", 0.0))
        
        metrics = {
            "customer_balance": balance,
            "inventory_stock": inventory.get("stock", 0),
            "active_refunds": len(self.database.get("refunds", {})),
            "api_call_count": len(self.api_calls),
            "file_count": len(self.workspace_files),
            "memory_node_count": len(self.memory_graph)
        }

        return StateSnapshot(
            step_index=step_index,
            step_name=step_name,
            timestamp=time.time(),
            description=description,
            database_state=copy.deepcopy(self.database),
            external_api_calls=copy.deepcopy(self.api_calls),
            workspace_files=copy.deepcopy(self.workspace_files),
            agent_memory_nodes=copy.deepcopy(self.memory_graph),
            summary_metrics=metrics,
            llm_trace=llm_trace
        )
