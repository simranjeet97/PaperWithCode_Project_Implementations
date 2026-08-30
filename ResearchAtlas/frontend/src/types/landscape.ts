export interface PipelineEvent {
  task_id: string;
  stage: string;
  progress: number;
  message: string;
  payload?: any;
}

export interface GraphNode {
  id: string;
  label: string;
  title: string;
  cluster: string;
  year: number;
  score: number;
  citation_count: number;
  is_seminal: boolean;
  x: number;
  y: number;
  summary_snippet: string;
  arxiv_url: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  description: string;
}

export interface ClusterTaxonomy {
  id: string;
  name: string;
  description: string;
  color: string;
  paper_ids: string[];
  key_characteristics: string[];
}

export interface ScientificTension {
  id: string;
  topic: string;
  approach_a: string;
  approach_b: string;
  trade_off_summary: string;
  key_papers_a: string[];
  key_papers_b: string[];
  open_question: string;
}

export interface OpenFrontier {
  id: string;
  title: string;
  description: string;
  severity_or_importance: 'Critical' | 'High' | 'Medium';
  why_problem_exists?: string;
  why_existing_methods_fail?: string;
  concrete_failure_example?: string;
  promising_directions?: string;
  relevant_papers: string[];
}

export interface ReadingRoadmapItem {
  step: number;
  paper_id: string;
  title: string;
  category_label: string;
  recommended_focus: string;
  key_takeaway?: string;
  prerequisites?: string[];
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' | 'Frontier';
  estimated_read_time_mins: number;
}

export interface FieldMaturityMetrics {
  saturation_score_pct: number;
  saturation_verdict: string;
  saturation_breakdown: Record<string, string>;
  research_velocity_multiplier: number;
  technology_readiness_level: number;
  trl_label: string;
  white_space_opportunity_index: number;
  time_to_next_breakthrough: string;
  key_breakthrough_catalysts: string[];
}

export interface ExtractedPaperDossier {
  id: string;
  title: string;
  authors: string[];
  published_year: number;
  published_date: string;
  arxiv_url: string;
  pdf_url?: string;
  primary_category: string;
  citation_count: number;
  cross_encoder_score: number;
  problem_statement: string;
  proposed_method: string;
  key_results: string;
  main_contribution: string;
  limitations?: string;
  code_url?: string;
  cluster_category: string;
  influences: string[];
}

export interface ResearchLandscape {
  id: string;
  query: string;
  generated_at: string;
  field_summary: string;
  total_candidates_analyzed: number;
  synthesized_papers_count: number;
  clusters: ClusterTaxonomy[];
  tensions: ScientificTension[];
  open_frontiers: OpenFrontier[];
  reading_roadmap: ReadingRoadmapItem[];
  maturity_metrics?: FieldMaturityMetrics;
  nodes: GraphNode[];
  edges: GraphEdge[];
  papers: ExtractedPaperDossier[];
}
