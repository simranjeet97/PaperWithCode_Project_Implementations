import pytest
from app.core.consistency_validator import ConsistencyValidator

def test_consistency_validator_success():
    validator = ConsistencyValidator(min_confidence_divergence=0.25)
    pre_state = {"customers": {"cust_101": {"balance": 100.0}}, "inventory": {"item_99": {"stock": 4}}}
    post_state = {"customers": {"cust_101": {"balance": 0.0}}, "inventory": {"item_99": {"stock": 5}}}
    
    results = validator.validate_step_invariants(
        action_name="Valid Step",
        pre_state=pre_state,
        post_state=post_state,
        divergence_score=0.85
    )
    
    for r in results:
        assert r.passed is True

def test_consistency_validator_low_divergence():
    validator = ConsistencyValidator(min_confidence_divergence=0.25)
    pre_state = {"customers": {"cust_101": {"balance": 100.0}}, "inventory": {"item_99": {"stock": 4}}}
    post_state = {"customers": {"cust_101": {"balance": 100.0}}, "inventory": {"item_99": {"stock": 4}}}
    
    results = validator.validate_step_invariants(
        action_name="Poorly Grounded Step",
        pre_state=pre_state,
        post_state=post_state,
        divergence_score=0.10 # Below 0.25 threshold
    )
    
    failed = [r for r in results if not r.passed]
    assert len(failed) == 1
    assert "Confidence Divergence" in failed[0].name

def test_consistency_validator_negative_balance():
    validator = ConsistencyValidator(min_confidence_divergence=0.25)
    pre_state = {"customers": {"cust_101": {"balance": 100.0}}}
    post_state = {"customers": {"cust_101": {"balance": -50.0}}}
    
    results = validator.validate_step_invariants(
        action_name="Overdraft Step",
        pre_state=pre_state,
        post_state=post_state,
        divergence_score=0.90
    )
    
    failed = [r for r in results if not r.passed]
    assert len(failed) == 1
    assert "Account Solvency" in failed[0].name
