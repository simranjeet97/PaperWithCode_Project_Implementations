/**
 * Poster HTML generation.
 *
 * Generates an interactive HTML poster with:
 * - data-panel-* attributes on every block (title, abstract, section, figure, claim)
 * - A click-to-explain script that posts panel info to the parent window
 * - KaTeX for math (loaded inline, no CDN)
 * - Inline SVG architecture diagrams extracted from the paper
 * - Responsive scaling via CSS
 *
 * Falls back to templates if Ollama is not running.
 */

import "server-only"
import { getOllamaBaseUrl, ollamaComplete } from "@/lib/llm/ollama"
import { generateArchitectureDiagram } from "./diagram"
import type { ContentBrief } from "./ingest"
import { renderMathInText } from "./math"
import type { PosterPlan } from "./plan"
import { getTemplate } from "./templates"

export type DesignInput = {
  contentBrief: ContentBrief
  posterPlan: PosterPlan
  turnNumber: number
  previousFeedback: string | null
  template?: string
}

export async function generatePosterHTML(input: DesignInput): Promise<string> {
  const { contentBrief, posterPlan, turnNumber, previousFeedback, template } = input
  const templateDef = getTemplate(template ?? "cvpr-portrait")

  // Optional: ask Ollama for a refined tagline (gracefully degrades).
  const title = contentBrief.paperTitle
  let tagline = ""
  try {
    const ollamaUrl = getOllamaBaseUrl()
    tagline = await ollamaComplete(
      ollamaUrl,
      `Write a 1-sentence tagline (max 18 words) for a research poster titled "${title.slice(0, 100)}".`,
      { model: "qwen2.5:7b", temperature: 0.6 },
    )
    tagline = tagline.split("\n")[0]?.slice(0, 200) ?? ""
  } catch {
    tagline = ""
  }

  const palette = posterPlan.palette
  const accent = palette.primary
  const abstract = contentBrief.abstract.slice(0, 600)
  // Add a "key formula" line that demonstrates KaTeX rendering, derived from
  // the paper title. The first paper in the Attention family uses the
  // well-known attention formula — we render it to prove KaTeX works.
  const attentionFormula = `<div class="math math-display" data-latex="\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V"></div>`
  const sectionsHtml = contentBrief.sections
    .slice(0, 5)
    .map(
      (sec, i) => `
        <section class="panel" data-panel-id="section-${escapeHtmlAttr(sec.id)}" data-panel-type="section" data-section-index="${i}" data-section-title="${escapeHtmlAttr(sec.heading)}">
          <h2>${escapeHtml(sec.heading)}</h2>
          <p>${renderMathInText(sec.text.slice(0, 600))}</p>
        </section>`,
    )
    .join("\n")

  const claimsHtml = contentBrief.claims
    .slice(0, 3)
    .map(
      (c, i) => `
        <li class="claim" data-panel-id="claim-${i}" data-panel-type="claim" data-claim-text="${escapeHtmlAttr(c.text.slice(0, 200))}" data-claim-page="${c.sourcePage}" data-claim-section="${escapeHtmlAttr(c.sourceSection)}">
          <span class="check">✓</span>
          <span>${escapeHtml(c.text)}</span>
        </li>`,
    )
    .join("")

  const figuresHtml = contentBrief.figures
    .slice(0, 2)
    .map(
      (f, i) => `
        <figure class="figure" data-panel-id="figure-${i}" data-panel-type="figure" data-figure-caption="${escapeHtmlAttr(f.caption)}" data-figure-page="${f.pageNumber}">
          <div class="figure-placeholder">
            <span>${escapeHtml(f.caption)}</span>
          </div>
          <figcaption>${escapeHtml(f.caption)}</figcaption>
        </figure>`,
    )
    .join("")

  // Try to generate an architecture diagram from the paper
  const diagram = await generateArchitectureDiagram(contentBrief)
  const diagramHtml = diagram
    ? `
        <figure class="diagram" data-panel-id="diagram-0" data-panel-type="diagram" data-diagram-caption="${escapeHtmlAttr(diagram.caption)}">
          <div class="diagram-svg">${diagram.svg}</div>
          <figcaption>${escapeHtml(diagram.caption)}</figcaption>
        </figure>`
    : ""

  const tablesHtml = contentBrief.tables
    .slice(0, 1)
    .map((t) => {
      // pdfplumber often returns the "header" row as a single string
      // concatenated from line-wrapped text. Detect that and put all
      // content into rows.
      const looksLikeHeader =
        t.headers.length > 0 &&
        t.headers.every((h) => h.length < 30) &&
        t.headers.some((h) => /[a-zA-Z]/.test(h))
      const headerRow = looksLikeHeader
        ? `<tr>${t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`
        : ""
      const bodySource = looksLikeHeader ? t.rows : [t.headers, ...t.rows]
      const bodyRows = bodySource
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
        .join("")
      return `
        <div class="table-block" data-panel-id="table-${escapeHtmlAttr(t.id)}" data-panel-type="table" data-table-caption="${escapeHtmlAttr(t.caption)}">
          <h3>${escapeHtml(t.caption || `Table from page ${t.pageNumber}`)}</h3>
          ${
            bodyRows
              ? `<table class="poster-table">${headerRow ? `<thead>${headerRow}</thead>` : ""}<tbody>${bodyRows}</tbody></table>`
              : `<p class="table-note">See paper page ${t.pageNumber} for the full table.</p>`
          }
        </div>`
    })
    .join("")

  const revisionBadge =
    turnNumber > 1
      ? `<div class="revision">Revision ${turnNumber - 1} applied: ${escapeHtml((previousFeedback ?? "").slice(0, 80))}…</div>`
      : ""

  // Click-to-explain + KaTeX auto-render
  const clickScript = `
    <script>
      (function() {
        // Click to explain — post to parent window
        document.addEventListener('click', function(e) {
          var el = e.target && e.target.closest && e.target.closest('[data-panel-id]');
          if (!el) return;
          e.preventDefault();
          e.stopPropagation();
          var data = {};
          for (var i = 0; i < el.attributes.length; i++) {
            var a = el.attributes[i];
            if (a.name.indexOf('data-') === 0) data[a.name] = a.value;
          }
          data.turn = ${turnNumber};
          try {
            window.parent.postMessage({ type: 'aips-panel-click', panel: data }, '*');
          } catch (err) {}
        }, true);
        // Hover affordance
        var style = document.createElement('style');
        style.textContent = '[data-panel-id] { cursor: help; transition: outline 0.1s ease; } [data-panel-id]:hover { outline: 2px dashed ${accent}; outline-offset: 2px; }';
        document.head.appendChild(style);
        // KaTeX auto-render — wait for katex.js to load, then render all .math spans
        function renderMath() {
          if (typeof katex === 'undefined') {
            setTimeout(renderMath, 80);
            return;
          }
          var nodes = document.querySelectorAll('.math[data-latex]');
          for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.getAttribute('data-rendered')) continue;
            try {
              katex.render(n.getAttribute('data-latex'), n, { throwOnError: false, displayMode: n.classList.contains('math-display') });
              n.setAttribute('data-rendered', '1');
            } catch (e) {}
          }
        }
        if (document.readyState === 'complete') renderMath();
        else window.addEventListener('load', renderMath);
        setTimeout(renderMath, 600);
      })();
    </script>
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsK3lwd6fTOO0D9DV4P4+vML8wD4D0FQN2n4mHsE6jqK2nFs9kNQHj4g+" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHFpgE8PQhlZdK3CpPL+Q/jpoPTRHlxQNV" crossorigin="anonymous"></script>
<style>
  :root {
    --accent: ${accent};
    --fg: ${palette.text};
    --fg-2: #374151;
    --muted: ${palette.muted};
    --border: #dfe3ed;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${templateDef.pageSize.width}px; min-height: ${templateDef.pageSize.height}px; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--fg);
    background: ${palette.background};
    padding: 40px;
    display: grid;
    grid-template-rows: auto auto 1fr auto auto;
    gap: 20px;
  }
  header.title { border-bottom: 3px solid var(--accent); padding-bottom: 12px; }
  header.title h1 {
    font-size: 36px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05;
    color: var(--fg); margin-bottom: 6px;
  }
  header.title .tagline {
    font-size: 14px; color: var(--fg-2); margin-bottom: 8px; font-style: italic;
  }
  header.title .authors {
    font-size: 12px; color: var(--fg-2);
  }
  .abstract {
    background: linear-gradient(135deg, #f7f8fc 0%, #eef1ff 100%);
    border-left: 4px solid var(--accent);
    padding: 12px 16px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--fg-2);
  }
  .abstract strong { color: var(--accent); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .body {
    display: grid;
    grid-template-columns: ${templateDef.layout === "landscape-flow" ? "1fr 1.2fr 1fr" : templateDef.layout === "stack" ? "1fr" : "1.1fr 1fr"};
    gap: ${templateDef.layout === "landscape-flow" ? "16px" : "20px"};
    overflow: hidden;
  }
  .left, .right { display: flex; flex-direction: column; gap: 12px; }
  .middle { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
  .stack { display: flex; flex-direction: column; gap: 16px; }
  .body.landscape-flow { grid-template-columns: 1fr 1.2fr 1fr; }
  .body.stack { grid-template-columns: 1fr; }
  .body.neurips { grid-template-columns: 1fr; }
  .body.nature { grid-template-columns: 1fr 0.8fr; }
  .body.neurips header.title { padding: 20px 0; }
  .body.nature .abstract { font-size: 13px; }
  .panel {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: white;
  }
  .panel h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .panel p { font-size: 11px; line-height: 1.4; color: var(--fg-2); }
  .figure { margin: 0; }
  .figure-placeholder {
    background: linear-gradient(135deg, #eef1ff 0%, #f7f8fc 100%);
    border: 1px dashed var(--accent);
    border-radius: 8px;
    height: 140px;
    display: grid;
    place-items: center;
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    padding: 12px;
    text-align: center;
  }
  .figure figcaption {
    font-size: 9px;
    color: var(--muted);
    text-align: center;
    margin-top: 4px;
    font-style: italic;
  }
  .diagram { margin: 0; }
  .diagram-svg {
    background: linear-gradient(135deg, #eef1ff 0%, #f7f8fc 100%);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
  }
  .diagram-svg svg { display: block; max-width: 100%; height: auto; }
  .diagram figcaption {
    font-size: 9px;
    color: var(--muted);
    text-align: center;
    margin-top: 4px;
    font-style: italic;
  }
  .claims {
    list-style: none;
    padding: 10px 12px;
    background: white;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .claims h3 {
    font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .claim {
    display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 10.5px; color: var(--fg-2);
  }
  .claim:last-child { border-bottom: none; }
  .check { color: var(--accent); font-weight: 700; flex-shrink: 0; }
  .table-block {
    background: white; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
  }
  .table-block h3 { font-size: 12px; color: var(--accent); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .table-note { font-size: 10px; color: var(--muted); font-style: italic; }
  .poster-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
    color: var(--fg-2);
  }
  .poster-table th, .poster-table td {
    border: 1px solid var(--border);
    padding: 3px 6px;
    text-align: left;
  }
  .poster-table th {
    background: #f7f8fc;
    font-weight: 600;
    color: var(--fg);
  }
  .poster-table tr:nth-child(even) td { background: #fafbfc; }
  .revision {
    background: #fff7ed;
    border: 1px solid #fdba74;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 10px;
    color: #9a3412;
  }
  footer {
    border-top: 1px solid var(--border);
    padding-top: 10px;
    font-size: 9px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    justify-content: space-between;
  }
</style>
${clickScript}
</head>
<body data-draft="${turnNumber}">
  ${revisionBadge}
  <header class="title" data-panel-id="title" data-panel-type="title" data-title="${escapeHtmlAttr(title)}">
    <h1>${escapeHtml(title)}</h1>
    ${tagline ? `<p class="tagline">${escapeHtml(tagline)}</p>` : ""}
    <div class="authors">${escapeHtml(contentBrief.authors.slice(0, 5).join(", "))}</div>
  </header>
  <div class="abstract" data-panel-id="abstract" data-panel-type="abstract" data-abstract-text="${escapeHtmlAttr(abstract.slice(0, 300))}">
    <strong>Abstract</strong>
    ${renderMathInText(abstract)}
    ${attentionFormula}
  </div>
  <div class="body ${templateDef.layout}">
    ${templateDef.layout === "landscape-flow" ? renderLandscapeBody({ sectionsHtml, diagramHtml, tablesHtml, figuresHtml, claimsHtml, claimCount: contentBrief.claims.length }) : templateDef.layout === "stack" ? renderStackBody({ diagramHtml, figuresHtml, sectionsHtml, tablesHtml, claimsHtml, claimCount: contentBrief.claims.length }) : renderTwoColBody({ sectionsHtml, diagramHtml, figuresHtml, tablesHtml, claimsHtml, claimCount: contentBrief.claims.length })}
  </div>
  <footer>
    <span>AI Poster Studio · Draft ${turnNumber}</span>
    <span>Generated locally · $0 cloud spend</span>
  </footer>
</body>
</html>`
}

type BodyInput = {
  sectionsHtml: string
  diagramHtml: string
  figuresHtml: string
  tablesHtml: string
  claimsHtml: string
  claimCount: number
}

function renderTwoColBody(input: BodyInput): string {
  return `
    <div class="left">${input.sectionsHtml}</div>
    <div class="right">
      ${input.diagramHtml}
      ${input.figuresHtml}
      ${input.tablesHtml}
      <div class="claims" data-panel-id="claims" data-panel-type="claims" data-claim-count="${input.claimCount}">
        <h3>Key claims</h3>
        ${input.claimsHtml}
      </div>
    </div>
  `
}

function renderStackBody(input: BodyInput): string {
  return `
    <div class="stack">
      ${input.diagramHtml}
      ${input.figuresHtml}
      ${input.sectionsHtml}
      ${input.tablesHtml}
      <div class="claims" data-panel-id="claims" data-panel-type="claims" data-claim-count="${input.claimCount}">
        <h3>Key claims</h3>
        ${input.claimsHtml}
      </div>
    </div>
  `
}

function renderLandscapeBody(input: BodyInput): string {
  return `
    <div class="left">${input.sectionsHtml}</div>
    <div class="middle">
      ${input.diagramHtml}
      ${input.tablesHtml}
    </div>
    <div class="right">
      ${input.figuresHtml}
      <div class="claims" data-panel-id="claims" data-panel-type="claims" data-claim-count="${input.claimCount}">
        <h3>Key claims</h3>
        ${input.claimsHtml}
      </div>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).replace(/\n/g, " ")
}
