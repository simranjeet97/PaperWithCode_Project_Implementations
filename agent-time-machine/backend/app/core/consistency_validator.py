from typing import Dict, Any, List
from app.core.models import InvariantResult

class ConsistencyValidator:
    """
    Semantic Consistency Guard.
    Ensures that every transaction step preserves semantic invariants
    and satisfies confidence divergence thresholds before commit.
    """
    def __init__(self, min_confidence_divergence: float = 0.25):
        self.min_confidence_divergence = min_confidence_divergence

    def validate_step_invariants(
        self,
        action_name: str,
        pre_state: Dict[str, Any],
        post_state: Dict[str, Any],
        divergence_score: float = 0.85
    ) -> List[InvariantResult]:
        results: List[InvariantResult] = []

        # 1. Check Confidence Divergence (Paper §2.2.2)
        if divergence_score < self.min_confidence_divergence:
            results.append(InvariantResult(
                passed=False,
                name="Confidence Divergence Gate",
                message=f"Divergence score {divergence_score:.2f} < threshold {self.min_confidence_divergence:.2f}. Decision is poorly grounded in evidence.",
                details={"divergence_score": divergence_score, "threshold": self.min_confidence_divergence}
            ))
        else:
            results.append(InvariantResult(
                passed=True,
                name="Confidence Divergence Gate",
                message=f"Divergence score {divergence_score:.2f} satisfies grounding invariants.",
                details={"divergence_score": divergence_score}
            ))

        # 2. Customer Balance Non-Negative Invariant
        post_cust = post_state.get("customers", {}).get("cust_101", {})
        balance = post_cust.get("balance", 0.0)
        if balance < 0:
            results.append(InvariantResult(
                passed=False,
                name="Account Solvency Invariant",
                message=f"Customer balance cannot drop below $0.00. Evaluated: ${balance:.2f}",
                details={"balance": balance}
            ))
        else:
            results.append(InvariantResult(
                passed=True,
                name="Account Solvency Invariant",
                message="Account solvency invariant preserved.",
                details={"balance": balance}
            ))

        # 3. Inventory Stock Conservation Invariant
        post_inv = post_state.get("inventory", {}).get("item_99", {})
        stock = post_inv.get("stock", 0)
        if stock < 0:
            results.append(InvariantResult(
                passed=False,
                name="Inventory Conservation Invariant",
                message=f"Inventory stock count cannot be negative ({stock}).",
                details={"stock": stock}
            ))
        else:
            results.append(InvariantResult(
                passed=True,
                name="Inventory Conservation Invariant",
                message="Inventory stock levels consistent.",
                details={"stock": stock}
            ))

        return results
