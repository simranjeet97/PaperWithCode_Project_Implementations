import re
from typing import Dict
from ..schemas.landscape import ResearchLandscape


class ExportService:
    """Exports synthesized research landscapes into Markdown, BibTeX, and Obsidian-ready notes."""

    @staticmethod
    def to_markdown(landscape: ResearchLandscape) -> str:
        """Generates a rich, publication-ready research landscape markdown document."""
        md = []
        md.append(f"# 🗺️ Research Field Atlas: {landscape.query.title()}")
        md.append(f"**Synthesized by ResearchAtlas on**: `{landscape.generated_at}`")
        md.append(f"**Coverage**: {landscape.synthesized_papers_count} Seminal Papers synthesized from {landscape.total_candidates_analyzed} arXiv candidates.\n")
        
        md.append("## 📋 Executive Field Synthesis")
        md.append(landscape.field_summary + "\n")

        md.append("## 🏷️ Research Taxonomies & Clusters")
        for c in landscape.clusters:
            md.append(f"### 🔹 {c.name}")
            md.append(f"{c.description}\n")
            if c.key_characteristics:
                md.append("**Key Characteristics**:")
                for char in c.key_characteristics:
                    md.append(f"- {char}")
            md.append("")

        md.append("## ⚔️ Scientific Tensions & Methodological Trade-offs")
        for t in landscape.tensions:
            md.append(f"### ⚖️ {t.topic}")
            md.append(f"- **Approach A**: `{t.approach_a}`")
            md.append(f"- **Approach B**: `{t.approach_b}`")
            md.append(f"- **Trade-off**: {t.trade_off_summary}")
            md.append(f"- **Open Question**: *{t.open_question}*\n")

        md.append("## 🔭 Unsolved Research Frontiers")
        for f in landscape.open_frontiers:
            md.append(f"### 🚩 {f.title} `[{f.severity_or_importance}]`")
            md.append(f"{f.description}\n")

        md.append("## 📚 Curated Step-by-Step Reading Roadmap")
        for r in landscape.reading_roadmap:
            md.append(f"### Step {r.step}: [{r.difficulty}] {r.title}")
            md.append(f"- **Focus**: {r.recommended_focus}")
            md.append(f"- **Estimated Time**: ~{r.estimated_read_time_mins} minutes\n")

        md.append("## 📄 Deep Paper Dossiers")
        for idx, p in enumerate(landscape.papers, start=1):
            md.append(f"### {idx}. [{p.published_year}] {p.title}")
            md.append(f"- **Authors**: {', '.join(p.authors)}")
            md.append(f"- **ArXiv Link**: [{p.arxiv_url}]({p.arxiv_url})")
            if p.pdf_url:
                md.append(f"- **PDF**: [{p.pdf_url}]({p.pdf_url})")
            if p.code_url:
                md.append(f"- **Code**: [{p.code_url}]({p.code_url})")
            md.append(f"- **Cross-Encoder Score**: `{p.cross_encoder_score:.3f}` | **Citations**: `{p.citation_count}`")
            md.append(f"- **Problem**: {p.problem_statement}")
            md.append(f"- **Method**: {p.proposed_method}")
            md.append(f"- **Key Results**: {p.key_results}")
            md.append(f"- **Main Contribution**: {p.main_contribution}")
            if p.limitations:
                md.append(f"- **Limitations**: {p.limitations}")
            md.append("")

        return "\n".join(md)

    @staticmethod
    def to_bibtex(landscape: ResearchLandscape) -> str:
        """Generates standard BibTeX entries for all synthesized papers."""
        bibtex_entries = []
        for p in landscape.papers:
            # Generate clean bibtex key
            first_author = re.sub(r"\W+", "", (p.authors[0] if p.authors else "author").split()[-1].lower())
            first_word = re.sub(r"\W+", "", p.title.split()[0].lower())
            key = f"{first_author}{p.published_year}{first_word}"
            
            entry = f"""@article{{{key},
  title = {{{{{p.title}}}}},
  author = {{{' and '.join(p.authors)}}},
  journal = {{arXiv preprint arXiv:{p.id}}},
  year = {{{p.published_year}}},
  url = {{{p.arxiv_url}}}
}}"""
            bibtex_entries.append(entry)

        return "\n\n".join(bibtex_entries)

    @staticmethod
    def to_obsidian_markdown(landscape: ResearchLandscape) -> str:
        """Generates Obsidian-ready Markdown with internal [[wikilinks]]."""
        raw_md = ExportService.to_markdown(landscape)
        # Convert cluster headers and paper titles to wikilinks
        for c in landscape.clusters:
            raw_md = raw_md.replace(f"🔹 {c.name}", f"🔹 [[{c.name}]]")
        return raw_md
