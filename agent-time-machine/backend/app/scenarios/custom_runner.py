import asyncio
from typing import Dict, Any, List
from app.core.models import ActionType
from app.core.transaction_manager import TransactionManager
from app.core.isolation_sandbox import IsolationSandbox
from app.core.ollama_client import OllamaClient

async def run_custom_user_scenario(
    tx_manager: TransactionManager,
    customer_id: str,
    customer_name: str,
    initial_balance: float,
    initial_stock: int,
    steps_config: List[Dict[str, Any]],
    step_delay: float = 0.8
) -> Dict[str, Any]:
    """
    Executes a dynamic custom transaction with user-defined initial state and steps.
    """
    # 1. Initialize custom sandbox state
    tx_manager.sandbox.update_db("customers", customer_id, {
        "id": customer_id,
        "name": customer_name,
        "balance": initial_balance,
        "status": "active"
    })
    tx_manager.sandbox.update_db("inventory", "custom_item", {
        "sku": "custom_item",
        "name": "Custom Inventory Item",
        "stock": initial_stock,
        "reserved": 0
    })
    # Capture fresh baseline snapshot at t=0
    snap0 = tx_manager.sandbox.capture_snapshot(0, "Initial Custom State", "User-defined starting parameters.")
    tx_manager.initial_snapshot = snap0
    tx_manager.wal.save_snapshot(0, snap0)

    # Register dynamic compensation handlers
    async def compensate_custom_balance(sandbox: IsolationSandbox, params: Dict[str, Any]):
        cid = params.get("customer_id", customer_id)
        bal = params.get("restore_balance", initial_balance)
        sandbox.update_db("customers", cid, {"balance": bal})
        sandbox.record_api_call(
            endpoint="/v1/custom/balance/compensate",
            method="POST",
            payload={"customer_id": cid, "restored_balance": bal},
            status_code=200,
            response={"status": "COMPENSATED"}
        )

    async def compensate_custom_stock(sandbox: IsolationSandbox, params: Dict[str, Any]):
        sku = params.get("sku", "custom_item")
        stock = params.get("restore_stock", initial_stock)
        sandbox.update_db("inventory", sku, {"stock": stock})
        sandbox.record_api_call(
            endpoint="/v1/custom/stock/compensate",
            method="POST",
            payload={"sku": sku, "restored_stock": stock},
            status_code=200,
            response={"status": "COMPENSATED"}
        )

    tx_manager.register_compensation_handler("compensate_custom_balance", compensate_custom_balance)
    tx_manager.register_compensation_handler("compensate_custom_stock", compensate_custom_stock)

    # Execute custom steps
    for idx, step_cfg in enumerate(steps_config, start=1):
        await asyncio.sleep(step_delay)
        step_name = step_cfg.get("step_name", f"Custom Step {idx}")
        action_type_str = step_cfg.get("action_type", "DB_MUTATION")
        action_type = ActionType[action_type_str] if action_type_str in ActionType.__members__ else ActionType.DB_MUTATION
        should_fail = step_cfg.get("should_fail", False)
        fail_msg = step_cfg.get("fail_message", "Custom Injected Failure")
        target = step_cfg.get("mutation_target", "balance")
        val = step_cfg.get("mutation_value", 50.0)

        comp_fn_name = None
        comp_params = None

        if target == "balance":
            comp_fn_name = "compensate_custom_balance"
            comp_params = {"customer_id": customer_id, "restore_balance": initial_balance}
        elif target == "inventory":
            comp_fn_name = "compensate_custom_stock"
            comp_params = {"sku": "custom_item", "restore_stock": initial_stock}

        async def make_action_fn(tgt=target, v=val, s_name=step_name):
            async def dynamic_action(sandbox: IsolationSandbox, ollama: OllamaClient):
                if tgt == "balance":
                    current_bal = sandbox.database.get("customers", {}).get(customer_id, {}).get("balance", initial_balance)
                    new_bal = current_bal - v
                    sandbox.update_db("customers", customer_id, {"balance": new_bal})
                    sandbox.record_api_call(
                        endpoint=f"/v1/ledger/mutate",
                        method="POST",
                        payload={"customer_id": customer_id, "delta": -v, "new_balance": new_bal},
                        status_code=200,
                        response={"status": "SUCCESS", "balance": new_bal}
                    )
                    sandbox.add_memory_node(f"node_cust_{idx}", "MUTATION", f"Balance adjusted to ${new_bal:.2f}")
                elif tgt == "inventory":
                    curr_stock = sandbox.database.get("inventory", {}).get("custom_item", {}).get("stock", initial_stock)
                    new_stock = curr_stock + int(v)
                    sandbox.update_db("inventory", "custom_item", {"stock": new_stock})
                    sandbox.record_api_call(
                        endpoint=f"/v1/inventory/mutate",
                        method="POST",
                        payload={"sku": "custom_item", "delta": int(v), "new_stock": new_stock},
                        status_code=200,
                        response={"status": "SUCCESS", "stock": new_stock}
                    )
                    sandbox.add_memory_node(f"node_inv_{idx}", "MUTATION", f"Stock adjusted to {new_stock} units")
                elif tgt == "file":
                    sandbox.write_file(f"/workspace/custom_output_{idx}.json", f'{{"step": "{s_name}", "value": {v}}}')
                return {"target": tgt, "value": v, "divergence_score": 0.94}
            return dynamic_action

        action_fn = await make_action_fn(target, val, step_name)

        res = await tx_manager.execute_step(
            step_name=step_name,
            action_type=action_type,
            action_fn=action_fn,
            compensation_fn_name=comp_fn_name,
            compensation_params=comp_params,
            fault_injection=should_fail,
            fault_message=fail_msg
        )

        if not res.get("success"):
            return {"status": "ROLLED_BACK", "failed_step": idx, "tx_id": tx_manager.tx_id}

    # If all steps succeeded
    await tx_manager.commit_transaction()
    return {"status": "COMMITTED", "tx_id": tx_manager.tx_id}
