import asyncio
from typing import Dict, Any
from app.core.models import ActionType
from app.core.transaction_manager import TransactionManager
from app.core.isolation_sandbox import IsolationSandbox
from app.core.ollama_client import OllamaClient

async def run_vacation_booking_scenario(
    tx_manager: TransactionManager,
    fault_on_car_rental: bool = True,
    step_delay: float = 0.8
) -> Dict[str, Any]:
    """
    Vacation Booking Transaction Workflow:
    Budget: $1,000.00
    - Step 1: Verify Bank Balance & Travel Eligibility ($1,000.00)
    - Step 2: Reserve Luxury Beachfront Hotel ($400.00) [Compensable]
    - Step 3: Book Roundtrip Flights ($500.00) [Compensable]
    - Step 4: Rent Convertible Car ($100.00) [Subject to Car Rental API Timeout]
    """
    # 1. Setup Vacation Ledger in Sandbox
    tx_manager.sandbox.update_db("travel_wallet", "wallet_user", {
        "id": "wallet_user",
        "user_name": "Sarah Jenkins",
        "balance": 1000.0,
        "currency": "USD"
    })
    tx_manager.sandbox.database["hotel_reservations"] = {}
    tx_manager.sandbox.database["flight_bookings"] = {}
    tx_manager.sandbox.database["car_rentals"] = {}

    # Capture initial baseline at t=0
    snap0 = tx_manager.sandbox.capture_snapshot(
        step_index=0,
        step_name="Initial Travel State",
        description="Traveler wallet balance: $1,000.00. No active reservations."
    )
    tx_manager.initial_snapshot = snap0
    tx_manager.wal.save_snapshot(0, snap0)

    # 2. Register Inverse Compensation Handlers
    async def compensate_hotel(sandbox: IsolationSandbox, params: Dict[str, Any]):
        res_id = params.get("reservation_id", "htl_res_771")
        refund_amount = params.get("amount", 400.0)
        curr_bal = sandbox.database.get("travel_wallet", {}).get("wallet_user", {}).get("balance", 0.0)
        sandbox.update_db("travel_wallet", "wallet_user", {"balance": curr_bal + refund_amount})
        sandbox.delete_db_record("hotel_reservations", res_id)
        sandbox.record_api_call(
            endpoint="/v1/hotel/cancel",
            method="POST",
            payload={"reservation_id": res_id, "refund_amount": refund_amount},
            status_code=200,
            response={"status": "CANCELLED_AND_REFUNDED", "refunded": refund_amount}
        )
        sandbox.remove_memory_node("node_hotel")

    async def compensate_flight(sandbox: IsolationSandbox, params: Dict[str, Any]):
        flight_pnr = params.get("pnr", "FL-HAWAII-902")
        refund_amount = params.get("amount", 500.0)
        curr_bal = sandbox.database.get("travel_wallet", {}).get("wallet_user", {}).get("balance", 0.0)
        sandbox.update_db("travel_wallet", "wallet_user", {"balance": curr_bal + refund_amount})
        sandbox.delete_db_record("flight_bookings", flight_pnr)
        sandbox.record_api_call(
            endpoint="/v1/airline/void-ticket",
            method="POST",
            payload={"pnr": flight_pnr, "refund_amount": refund_amount},
            status_code=200,
            response={"status": "TICKET_VOIDED_FULL_REFUND", "refunded": refund_amount}
        )
        sandbox.remove_memory_node("node_flight")

    tx_manager.register_compensation_handler("compensate_hotel", compensate_hotel)
    tx_manager.register_compensation_handler("compensate_flight", compensate_flight)

    # STEP 1: Verify Wallet & Passport Eligibility
    await asyncio.sleep(step_delay)
    async def step1_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        wallet = sandbox.database.get("travel_wallet", {}).get("wallet_user", {})
        llm_res = await ollama.generate_thought_and_action(
            prompt="Verify traveler wallet has $1,000.00 budget and valid traveler identity for Hawaii trip.",
            context={"wallet": wallet}
        )
        sandbox.add_memory_node("node_wallet_verified", "EVIDENCE", "Travel wallet verified: $1,000.00 USD available")
        return {
            "balance": 1000.0,
            "status": "ELIGIBLE",
            "thought": llm_res.get("thought"),
            "decision": llm_res.get("decision", "proceed"),
            "confidence": llm_res.get("confidence", 0.95),
            "divergence_score": 0.96,
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
        step_name="Verify Travel Budget & Passport ($1,000.00)",
        action_type=ActionType.READ,
        action_fn=step1_action
    )
    if not res1.get("success"):
        return {"status": "FAILED", "step": 1, "tx_id": tx_manager.tx_id}

    # STEP 2: Reserve Luxury Beachfront Hotel (-$400)
    await asyncio.sleep(step_delay)
    async def step2_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        sandbox.update_db("travel_wallet", "wallet_user", {"balance": 600.0})
        sandbox.update_db("hotel_reservations", "htl_res_771", {
            "id": "htl_res_771",
            "hotel": "Grand Waikiki Beachfront Resort",
            "nights": 4,
            "amount": 400.0,
            "status": "CONFIRMED"
        })
        sandbox.record_api_call(
            endpoint="/v1/hotels/book",
            method="POST",
            payload={"hotel": "Grand Waikiki", "nights": 4, "amount": 400.0},
            status_code=200,
            response={"reservation_id": "htl_res_771", "status": "CONFIRMED"}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Reserve 4-night stay at Grand Waikiki Beachfront Resort for $400.00.",
            context={"hotel": "Grand Waikiki", "nights": 4, "amount": 400.0, "wallet_balance": 1000.0}
        )
        sandbox.add_memory_node("node_hotel", "MUTATION", "Hotel booked: Grand Waikiki (-$400 -> Balance: $600.00)")
        return {
            "reservation_id": "htl_res_771",
            "amount": 400.0,
            "new_balance": 600.0,
            "thought": llm_res.get("thought"),
            "compensation_params": {"reservation_id": "htl_res_771", "amount": 400.0},
            "divergence_score": 0.94,
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
        step_name="Reserve Beachfront Hotel (-$400.00)",
        action_type=ActionType.DB_MUTATION,
        action_fn=step2_action,
        compensation_fn_name="compensate_hotel",
        compensation_params={"reservation_id": "htl_res_771", "amount": 400.0}
    )
    if not res2.get("success"):
        return {"status": "FAILED", "step": 2, "tx_id": tx_manager.tx_id}

    # STEP 3: Book Roundtrip Flights (-$500)
    await asyncio.sleep(step_delay)
    async def step3_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        sandbox.update_db("travel_wallet", "wallet_user", {"balance": 100.0})
        sandbox.update_db("flight_bookings", "FL-HAWAII-902", {
            "pnr": "FL-HAWAII-902",
            "airline": "Hawaiian Airlines Flight 402",
            "seats": "12A, 12B",
            "amount": 500.0,
            "status": "TICKETED"
        })
        sandbox.record_api_call(
            endpoint="/v1/airline/book-flight",
            method="POST",
            payload={"flight": "HA-402", "amount": 500.0},
            status_code=200,
            response={"pnr": "FL-HAWAII-902", "status": "ISSUED"}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Book roundtrip Hawaiian Airlines Flight HA-402 for $500.00.",
            context={"flight": "HA-402", "amount": 500.0, "wallet_balance": 600.0}
        )
        sandbox.add_memory_node("node_flight", "MUTATION", "Flight booked: Hawaiian Airlines HA-402 (-$500 -> Balance: $100.00)")
        return {
            "pnr": "FL-HAWAII-902",
            "amount": 500.0,
            "new_balance": 100.0,
            "thought": llm_res.get("thought"),
            "compensation_params": {"pnr": "FL-HAWAII-902", "amount": 500.0},
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
        step_name="Book Roundtrip Airline Tickets (-$500.00)",
        action_type=ActionType.API_CALL,
        action_fn=step3_action,
        compensation_fn_name="compensate_flight",
        compensation_params={"pnr": "FL-HAWAII-902", "amount": 500.0}
    )
    if not res3.get("success"):
        return {"status": "FAILED", "step": 3, "tx_id": tx_manager.tx_id}

    # STEP 4: Rent Convertible Car (-$100) (Subject to Fault Injection)
    await asyncio.sleep(step_delay)
    async def step4_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        sandbox.update_db("travel_wallet", "wallet_user", {"balance": 0.0})
        sandbox.update_db("car_rentals", "car_rent_99", {
            "id": "car_rent_99",
            "vehicle": "Ford Mustang Convertible",
            "days": 4,
            "amount": 100.0,
            "status": "CONFIRMED"
        })
        sandbox.record_api_call(
            endpoint="/v1/car-rental/reserve",
            method="POST",
            payload={"vehicle": "Mustang Convertible", "amount": 100.0},
            status_code=200,
            response={"rental_id": "car_rent_99", "status": "RESERVED"}
        )
        llm_res = await ollama.generate_thought_and_action(
            prompt="Rent Ford Mustang Convertible for 4 days at $100.00.",
            context={"vehicle": "Ford Mustang Convertible", "days": 4, "amount": 100.0, "wallet_balance": 100.0}
        )
        return {
            "rental_id": "car_rent_99",
            "status": "CONFIRMED",
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
        step_name="Rent Island Convertible Car (-$100.00)",
        action_type=ActionType.API_CALL,
        action_fn=step4_action,
        fault_injection=fault_on_car_rental,
        fault_message="504 Gateway Timeout: Car Rental Fleet API Service Outage"
    )

    if not res4.get("success"):
        return {"status": "ROLLED_BACK", "failed_step": 4, "tx_id": tx_manager.tx_id}

    await tx_manager.commit_transaction()
    return {"status": "COMMITTED", "tx_id": tx_manager.tx_id}
