import asyncio
from typing import Dict, Any
from app.core.models import ActionType
from app.core.transaction_manager import TransactionManager
from app.core.isolation_sandbox import IsolationSandbox
from app.core.ollama_client import OllamaClient

async def run_ecommerce_scenario(
    tx_manager: TransactionManager,
    fault_on_step4: bool = True,
    step_delay: float = 0.8
) -> Dict[str, Any]:
    """
    Executes the E-Commerce Customer Refund Scenario.
    Steps:
    1. Read Order & Verification
    2. Restock Inventory (+1 Item) [Compensable]
    3. Issue Payment Refund (-$100.00 Ledger balance) [Compensable]
    4. Send Email Confirmation [Can Fail with 504 Gateway Timeout]
    """
    # 1. Register Inverse Compensation Handlers
    async def compensate_refund(sandbox: IsolationSandbox, params: Dict[str, Any]):
        cust_id = params.get("customer_id", "cust_101")
        amount = params.get("amount", 100.0)
        refund_id = params.get("refund_id", "ref_901")
        # Inverse: restore balance & void refund record
        sandbox.update_db("customers", cust_id, {"balance": 100.0})
        sandbox.delete_db_record("refunds", refund_id)
        sandbox.record_api_call(
            endpoint="/v1/payments/refunds/void",
            method="POST",
            payload={"refund_id": refund_id, "reason": "SAGA_COMPENSATION_ROLLBACK"},
            status_code=200,
            response={"status": "VOIDED", "restored_amount": amount}
        )
        sandbox.remove_memory_node("node_refund")

    async def compensate_inventory(sandbox: IsolationSandbox, params: Dict[str, Any]):
        sku = params.get("sku", "item_99")
        # Inverse: decrement stock back to 4
        sandbox.update_db("inventory", sku, {"stock": 4, "reserved": 1})
        sandbox.record_api_call(
            endpoint="/v1/inventory/revert",
            method="POST",
            payload={"sku": sku, "delta": -1},
            status_code=200,
            response={"status": "REVERTED", "current_stock": 4}
        )
        sandbox.remove_memory_node("node_inventory")

    tx_manager.register_compensation_handler("compensate_refund", compensate_refund)
    tx_manager.register_compensation_handler("compensate_inventory", compensate_inventory)

    # STEP 1: Read Order & Customer Profile
    await asyncio.sleep(step_delay)
    async def step1_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        order = sandbox.database.get("orders", {}).get("ord_882", {})
        customer = sandbox.database.get("customers", {}).get("cust_101", {})
        llm_res = await ollama.generate_thought_and_action(
            prompt="Verify order ord_882 ($100.00) for Alice Walker eligibility for full refund.",
            context={"order": order, "customer": customer}
        )
        sandbox.add_memory_node("node_order_verified", "EVIDENCE", "Order ord_882 verified: $100.00 PAID")
        return {
            "order": order,
            "customer": customer,
            "eligible": True,
            "thought": llm_res.get("thought"),
            "decision": llm_res.get("decision", "proceed"),
            "confidence": llm_res.get("confidence", 0.95),
            "divergence_score": 0.92,
            "llm_trace": {
                "model_used": llm_res.get("model_used", "qwen2.5:7b"),
                "thought": llm_res.get("thought"),
                "decision": llm_res.get("decision", "proceed"),
                "confidence": llm_res.get("confidence", 0.95),
                "prompt_sent": llm_res.get("prompt_sent", ""),
                "raw_response": llm_res.get("raw_response", "{}"),
                "parsed_json": llm_res.get("parsed_json", {}),
                "duration_ms": llm_res.get("duration_ms", 0),
                "tokens_eval": llm_res.get("tokens_eval", 0)
            }
        }

    res1 = await tx_manager.execute_step(
        step_name="Read Order & Customer Profile",
        action_type=ActionType.READ,
        action_fn=step1_action
    )
    if not res1.get("success"):
        return {"status": "FAILED", "step": 1, "tx_id": tx_manager.tx_id}

    # STEP 2: Restock Inventory
    await asyncio.sleep(step_delay)
    async def step2_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        # Mutate stock 4 -> 5
        sandbox.update_db("inventory", "item_99", {"stock": 5, "reserved": 0})
        sandbox.record_api_call(
            endpoint="/v1/inventory/restock",
            method="POST",
            payload={"sku": "item_99", "quantity": 1, "order_id": "ord_882"},
            status_code=200,
            response={"status": "RESTOCKED", "new_stock": 5}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Restock inventory item_99 by +1 unit after refund approval.",
            context={"sku": "item_99", "current_stock": 4, "delta": 1}
        )
        sandbox.add_memory_node("node_inventory", "MUTATION", "Inventory item_99 restocked (+1 -> 5 total)")
        return {
            "sku": "item_99",
            "previous_stock": 4,
            "new_stock": 5,
            "thought": llm_res.get("thought"),
            "compensation_params": {"sku": "item_99", "quantity": 1},
            "divergence_score": 0.90,
            "llm_trace": {
                "model_used": llm_res.get("model_used", "qwen2.5:7b"),
                "thought": llm_res.get("thought"),
                "decision": llm_res.get("decision", "proceed"),
                "confidence": llm_res.get("confidence", 0.95),
                "prompt_sent": llm_res.get("prompt_sent", ""),
                "raw_response": llm_res.get("raw_response", "{}"),
                "parsed_json": llm_res.get("parsed_json", {}),
                "duration_ms": llm_res.get("duration_ms", 0),
                "tokens_eval": llm_res.get("tokens_eval", 0)
            }
        }

    res2 = await tx_manager.execute_step(
        step_name="Restock Inventory Unit (+1)",
        action_type=ActionType.DB_MUTATION,
        action_fn=step2_action,
        compensation_fn_name="compensate_inventory",
        compensation_params={"sku": "item_99"}
    )
    if not res2.get("success"):
        return {"status": "FAILED", "step": 2, "tx_id": tx_manager.tx_id}

    # STEP 3: Issue Payment Refund
    await asyncio.sleep(step_delay)
    async def step3_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        # Mutate customer balance $100 -> $0 and record refund
        sandbox.update_db("customers", "cust_101", {"balance": 0.0})
        sandbox.update_db("refunds", "ref_901", {
            "id": "ref_901",
            "customer_id": "cust_101",
            "order_id": "ord_882",
            "amount": 100.0,
            "status": "PROCESSED"
        })
        sandbox.record_api_call(
            endpoint="/v1/payments/refunds",
            method="POST",
            payload={"customer_id": "cust_101", "amount": 100.0, "reason": "Customer Request"},
            status_code=200,
            response={"refund_id": "ref_901", "amount": 100.0, "status": "succeeded"}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Issue payment refund of $100.00 to cust_101 for order ord_882.",
            context={"customer_id": "cust_101", "amount": 100.0, "balance_before": 100.0}
        )
        sandbox.add_memory_node("node_refund", "MUTATION", "Refund ref_901 issued ($100.00 -> balance: $0.00)")
        return {
            "refund_id": "ref_901",
            "amount": 100.0,
            "previous_balance": 100.0,
            "current_balance": 0.0,
            "thought": llm_res.get("thought"),
            "compensation_params": {"customer_id": "cust_101", "amount": 100.0, "refund_id": "ref_901"},
            "divergence_score": 0.95,
            "llm_trace": {
                "model_used": llm_res.get("model_used", "qwen2.5:7b"),
                "thought": llm_res.get("thought"),
                "decision": llm_res.get("decision", "proceed"),
                "confidence": llm_res.get("confidence", 0.95),
                "prompt_sent": llm_res.get("prompt_sent", ""),
                "raw_response": llm_res.get("raw_response", "{}"),
                "parsed_json": llm_res.get("parsed_json", {}),
                "duration_ms": llm_res.get("duration_ms", 0),
                "tokens_eval": llm_res.get("tokens_eval", 0)
            }
        }

    res3 = await tx_manager.execute_step(
        step_name="Issue Payment Refund ($100.00)",
        action_type=ActionType.API_CALL,
        action_fn=step3_action,
        compensation_fn_name="compensate_refund",
        compensation_params={"customer_id": "cust_101", "amount": 100.0, "refund_id": "ref_901"}
    )
    if not res3.get("success"):
        return {"status": "FAILED", "step": 3, "tx_id": tx_manager.tx_id}

    # STEP 4: Send Confirmation Email (Subject to Fault Injection)
    await asyncio.sleep(step_delay)
    async def step4_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        sandbox.record_api_call(
            endpoint="/v1/notifications/email",
            method="POST",
            payload={"to": "alice@example.com", "template": "refund_confirmation"},
            status_code=200,
            response={"message_id": "msg_441", "status": "DELIVERED"}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Dispatch refund confirmation notification to alice@example.com.",
            context={"to": "alice@example.com", "template": "refund_confirmation"}
        )
        sandbox.write_file("/workspace/receipt_ord_882.txt", "Refund confirmation dispatched to alice@example.com.")
        return {
            "status": "DELIVERED",
            "thought": llm_res.get("thought"),
            "divergence_score": 0.91,
            "llm_trace": {
                "model_used": llm_res.get("model_used", "qwen2.5:7b"),
                "thought": llm_res.get("thought"),
                "decision": llm_res.get("decision", "proceed"),
                "confidence": llm_res.get("confidence", 0.95),
                "prompt_sent": llm_res.get("prompt_sent", ""),
                "raw_response": llm_res.get("raw_response", "{}"),
                "parsed_json": llm_res.get("parsed_json", {}),
                "duration_ms": llm_res.get("duration_ms", 0),
                "tokens_eval": llm_res.get("tokens_eval", 0)
            }
        }

    res4 = await tx_manager.execute_step(
        step_name="Dispatch Confirmation Notification",
        action_type=ActionType.API_CALL,
        action_fn=step4_action,
        fault_injection=fault_on_step4,
        fault_message="504 Gateway Timeout: Notification Mailer Service Unreachable"
    )
    
    if not res4.get("success"):
        return {"status": "ROLLED_BACK", "failed_step": 4, "tx_id": tx_manager.tx_id}

    # If all succeeded, commit
    await tx_manager.commit_transaction()
    return {"status": "COMMITTED", "tx_id": tx_manager.tx_id}
