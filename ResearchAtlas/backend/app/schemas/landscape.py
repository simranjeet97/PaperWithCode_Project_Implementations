from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from .paper import ExtractedPaperDossier, CandidatePaper


class GraphNode(BaseModel):
    id: str
    label: str
    title: str
    cluster: str
    year: int
    score: float
    citation_count: int
    is_seminal: bool = False
    x: float = 0.0
    y: float = 0.0
    summary_snippet: str
    arxiv_url: str


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str = Field(..., description="e.g. 'extends', 'benchmarks_against', 'inspired_by', 'combines'")
    description: str


class ClusterTaxonomy(BaseModel):
    id: str
    name: str
    description: str
    color: str
    paper_ids: List[str] = Field(default_factory=list)
    key_characteristics: List[str] = Field(default_factory=list)


class ScientificTension(BaseModel):
    id: str
    topic: str
    approach_a: str
    approach_b: str
    trade_off_summary: str
    key_papers_a: List[str] = Field(default_factory=list)
    key_papers_b: List[str] = Field(default_factory=list)
    open_question: str


class OpenFrontier(BaseModel):
    id: str
    title: str
    description: str
    severity_or_importance: str = "High"  # High | Medium | Critical
    why_problem_exists: str = ""
    why_existing_methods_fail: str = ""
    concrete_failure_example: str = ""
    promising_directions: str = ""
    relevant_papers: List[str] = Field(default_factory=list)


class ReadingRoadmapItem(BaseModel):
    step: int
    paper_id: str
    title: str
    category_label: str
    difficulty: str  # Foundational | Intermediate | Advanced
    recommended_focus: str
    key_takeaway: str = ""
    prerequisites: List[str] = Field(default_factory=list)
    estimated_read_time_mins: int = 20


class FieldMaturityMetrics(BaseModel):
    saturation_score_pct: int = 65  # 0 to 100%
    saturation_verdict: str = "Moderate Saturation — High Frontier Potential"
    saturation_breakdown: Dict[str, str] = Field(default_factory=dict)
    research_velocity_multiplier: float = 2.4  # YoY publication multiplier
    technology_readiness_level: int = 7  # TRL 1-9
    trl_label: str = "TRL 7 — Production Deployed / Enterprise Integrated"
    white_space_opportunity_index: float = 8.2  # 0 to 10
    time_to_next_breakthrough: str = "6–12 months"
    key_breakthrough_catalysts: List[str] = Field(default_factory=list)


class ResearchLandscape(BaseModel):
    id: str
    query: str
    generated_at: str
    field_summary: str
    total_candidates_analyzed: int = 0
    synthesized_papers_count: int = 0
    clusters: List[ClusterTaxonomy] = Field(default_factory=list)
    tensions: List[ScientificTension] = Field(default_factory=list)
    open_frontiers: List[OpenFrontier] = Field(default_factory=list)
    reading_roadmap: List[ReadingRoadmapItem] = Field(default_factory=list)
    maturity_metrics: Optional[FieldMaturityMetrics] = None
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    papers: List[ExtractedPaperDossier] = Field(default_factory=list)
