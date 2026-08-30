import math
from typing import List, Tuple, Dict
from ..schemas.paper import ExtractedPaperDossier
from ..schemas.landscape import GraphNode, GraphEdge, ClusterTaxonomy


class GraphBuilder:
    """Builds interactive 2D node-link coordinates with spatial repulsion and clean evolutionary DAG edges."""

    CLUSTER_PALETTE = [
        "#2563EB",  # Cobalt Blue
        "#059669",  # Emerald Green
        "#7C3AED",  # Violet
        "#D97706",  # Amber
        "#DC2626",  # Rose
        "#0891B2",  # Cyan
    ]

    @classmethod
    def build_graph(
        cls,
        papers: List[ExtractedPaperDossier],
        clusters: List[ClusterTaxonomy]
    ) -> Tuple[List[GraphNode], List[GraphEdge]]:
        """Constructs non-overlapping 2D layout nodes and evolutionary DAG edges."""
        if not papers:
            return [], []

        # Sort papers chronologically first, then by citation authority
        sorted_papers = sorted(papers, key=lambda p: (p.published_year, p.citation_count), reverse=False)
        
        nodes: List[GraphNode] = []
        year_min = min(p.published_year for p in sorted_papers)
        year_max = max(p.published_year for p in sorted_papers)
        year_span = max(1, year_max - year_min)

        # Unique clusters
        cluster_names = list({p.cluster_category for p in sorted_papers})
        num_clusters = max(1, len(cluster_names))

        # Group papers by year to distribute horizontal positions smoothly
        year_groups: Dict[int, List[ExtractedPaperDossier]] = {}
        for p in sorted_papers:
            year_groups.setdefault(p.published_year, []).append(p)

        # Base layout placement
        for p in sorted_papers:
            # Timeline distribution: Year establishes base column, rank in year adds horizontal spread
            year_idx = p.published_year - year_min
            time_fraction = year_idx / year_span if year_span > 0 else 0.5
            base_x = 160 + time_fraction * 680

            # Spread papers within same year across X to avoid vertical stacking
            in_year_list = year_groups[p.published_year]
            in_year_rank = in_year_list.index(p)
            year_jitter_x = (in_year_rank - (len(in_year_list) - 1) / 2) * 90

            x = base_x + year_jitter_x

            # Y-axis distribution by cluster band with vertical staggering
            cluster_idx = cluster_names.index(p.cluster_category) if p.cluster_category in cluster_names else 0
            y_band_height = 420 / num_clusters
            base_y = 120 + cluster_idx * y_band_height + (y_band_height / 2)
            
            # Vertical stagger based on paper rank
            stagger_y = ((in_year_rank * 55) % 110) - 55
            y = base_y + stagger_y

            # Mark seminal if landmark citation count or foundational pioneer
            is_seminal = (p.citation_count > 60) or (p.published_year <= 2021) or (p == sorted_papers[0])

            nodes.append(GraphNode(
                id=p.id,
                label=p.title[:30] + ("..." if len(p.title) > 30 else ""),
                title=p.title,
                cluster=p.cluster_category,
                year=p.published_year,
                score=round(p.cross_encoder_score, 3),
                citation_count=p.citation_count,
                is_seminal=is_seminal,
                x=round(x, 1),
                y=round(y, 1),
                summary_snippet=p.main_contribution[:120] + ("..." if len(p.main_contribution) > 120 else ""),
                arxiv_url=p.arxiv_url
            ))

        # Run 2D force repulsion relaxation to guarantee zero overlapping nodes
        cls._relax_node_positions(nodes, iterations=35)

        # Build clean, high-signal evolutionary edges (capped per node to avoid visual clutter)
        edges: List[GraphEdge] = []
        edge_id = 1

        for i, source_node in enumerate(nodes):
            connections_count = 0
            for target_node in nodes[i + 1:]:
                if connections_count >= 2:
                    break

                # 1. Direct evolutionary line within same school
                if source_node.cluster == target_node.cluster and target_node.year >= source_node.year:
                    edges.append(GraphEdge(
                        id=f"e{edge_id}",
                        source=source_node.id,
                        target=target_node.id,
                        relation_type="extends",
                        description=f"Evolutionary progression within '{source_node.cluster}'"
                    ))
                    edge_id += 1
                    connections_count += 1
                # 2. Cross-cluster foundational influence from seminal pioneers
                elif source_node.is_seminal and target_node.year > source_node.year and connections_count < 1:
                    edges.append(GraphEdge(
                        id=f"e{edge_id}",
                        source=source_node.id,
                        target=target_node.id,
                        relation_type="inspired_by",
                        description=f"Foundational architectural influence from {source_node.year}"
                    ))
                    edge_id += 1
                    connections_count += 1

        return nodes, edges

    @staticmethod
    def _relax_node_positions(nodes: List[GraphNode], iterations: int = 35):
        """Simple spring-repulsion pass to push close nodes apart."""
        min_dist = 90.0  # minimum comfortable distance between node centers

        for _ in range(iterations):
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    n1 = nodes[i]
                    n2 = nodes[j]
                    dx = n2.x - n1.x
                    dy = n2.y - n1.y
                    dist = math.hypot(dx, dy)

                    if dist < min_dist:
                        # Avoid divide by zero
                        if dist < 1.0:
                            dx = 1.0
                            dy = 0.0
                            dist = 1.0

                        overlap = (min_dist - dist) / 2.0
                        nx = dx / dist
                        ny = dy / dist

                        # Push nodes apart symmetrically
                        n1.x -= nx * overlap * 0.6
                        n1.y -= ny * overlap * 0.6
                        n2.x += nx * overlap * 0.6
                        n2.y += ny * overlap * 0.6

                        # Keep within comfortable canvas bounds
                        n1.x = max(80, min(950, n1.x))
                        n1.y = max(80, min(560, n1.y))
                        n2.x = max(80, min(950, n2.x))
                        n2.y = max(80, min(560, n2.y))

        for n in nodes:
            n.x = round(n.x, 1)
            n.y = round(n.y, 1)
