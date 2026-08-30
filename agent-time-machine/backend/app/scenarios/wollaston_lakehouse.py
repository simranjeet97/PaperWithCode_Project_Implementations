import asyncio
from typing import Dict, Any
from app.core.models import ActionType
from app.core.transaction_manager import TransactionManager
from app.core.isolation_sandbox import IsolationSandbox
from app.core.ollama_client import OllamaClient

async def run_wollaston_scenario(
    tx_manager: TransactionManager,
    simulate_initial_inconsistency: bool = True,
    step_delay: float = 0.8
) -> Dict[str, Any]:
    """
    Executes the Wollaston Beach Research Paper Scenario (Sun et al. Figure 1 & 2).
    Demonstrates Confidence-Divergence Validation, Semantic Rollback of flawed aggregation,
    and durable commit of evidence-grounded data science analysis.
    """
    async def compensate_flawed_lakehouse(sandbox: IsolationSandbox, params: Dict[str, Any]):
        sandbox.delete_file("/workspace/wollaston_aggregated.parquet")
        sandbox.update_db("lakehouse_metrics", "wollaston_beach", {
            "observations": 0,
            "pearson_r": 0.0,
            "status": "ROLLED_BACK_FOR_RETRY"
        })
        sandbox.remove_memory_node("node_wollaston_flawed")

    tx_manager.register_compensation_handler("compensate_flawed_lakehouse", compensate_flawed_lakehouse)

    # STEP 1: Confidence-Guided Data Exploration
    await asyncio.sleep(step_delay)
    async def step1_action(sandbox: IsolationSandbox, ollama: OllamaClient):
        sandbox.write_file(
            "/workspace/datasheets_manifest.json",
            '{"datasheets": ["Milton Road", "Channing Street", "Sachem Street", "Rice Road"], "ej_population": 92.4}'
        )
        sandbox.add_memory_node("node_datasheets", "EVIDENCE", "Discovered 4 Boston Harbor location sheets (EJ > 90%)")
        return {
            "locations": ["Milton Road", "Channing Street", "Sachem Street", "Rice Road"],
            "ej_population_pct": 92.4,
            "divergence_score": 0.94
        }

    res1 = await tx_manager.execute_step(
        step_name="Confidence-Guided Data Exploration (4 Sheets)",
        action_type=ActionType.READ,
        action_fn=step1_action
    )
    if not res1.get("success"):
        return {"status": "FAILED", "step": 1}

    # STEP 2: Exploration-Execution (Flawed Aggregation vs Grounded Observation)
    await asyncio.sleep(step_delay)
    if simulate_initial_inconsistency:
        # Step 2 generates flawed aggregation with low confidence divergence
        async def step2_action_flawed(sandbox: IsolationSandbox, ollama: OllamaClient):
            sandbox.write_file(
                "/workspace/wollaston_aggregated.parquet",
                "binary_lakehouse_data_4_locations_collapsed_daily"
            )
            sandbox.update_db("lakehouse_metrics", "wollaston_beach", {
                "observations": 1904,
                "pearson_r": 0.261,
                "status": "COLLAPSED_DAILY"
            })
            sandbox.add_memory_node("node_wollaston_flawed", "MUTATION", "Flawed decision: Collapsed 4 locations into 1 (n=1904, r=0.261)")
            # Return low confidence divergence (< 0.25 threshold) to trigger semantic validation failure
            return {
                "observations": 1904,
                "pearson_r": 0.261,
                "compensation_params": {"target": "wollaston_beach"},
                "divergence_score": 0.14  # CRITICAL: Triggers Confidence Invariant Failure!
            }

        res2 = await tx_manager.execute_step(
            step_name="Synthesize Correlation Code (Collapsed Observations)",
            action_type=ActionType.REASONING,
            action_fn=step2_action_flawed,
            compensation_fn_name="compensate_flawed_lakehouse",
            compensation_params={"target": "wollaston_beach"}
        )
        # res2 will fail & trigger rollback due to low confidence divergence!
        
        # Now execute the ACID-Agent Evidence-Grounded Retry
        await asyncio.sleep(step_delay)
        await tx_manager.emit_event(
            event_type="ACID_RETRY_TRIGGERED",
            step_index=2,
            step_name="ACID-Agent Evidence Guided Retry",
            message="Consistency validator detected low evidence grounding. Retrying with partitioned location-date observations."
        )

        async def step2_action_corrected(sandbox: IsolationSandbox, ollama: OllamaClient):
            sandbox.write_file(
                "/workspace/wollaston_partitioned.parquet",
                "binary_lakehouse_data_7585_observations_preserved"
            )
            sandbox.update_db("lakehouse_metrics", "wollaston_beach", {
                "observations": 7585,
                "pearson_r": 0.206,
                "status": "VALIDATED_EVIDENCE_GROUNDED"
            })
            sandbox.add_memory_node("node_wollaston_valid", "VALIDATED", "Validated: Kept each location-date separately (n=7585, r=0.206)")
            return {
                "observations": 7585,
                "pearson_r": 0.206,
                "status": "GROUNDED_SUCCESS",
                "divergence_score": 0.96
            }

        res2_retry = await tx_manager.execute_step(
            step_name="Execute Partitioned Correlation (Location-Date Invariant)",
            action_type=ActionType.FILE_MUTATION,
            action_fn=step2_action_corrected
        )

    # STEP 3: Commit Validated Outcome
    await asyncio.sleep(step_delay)
    await tx_manager.commit_transaction()
    return {"status": "COMMITTED", "pearson_r": 0.206, "observations": 7585, "tx_id": tx_manager.tx_id}
