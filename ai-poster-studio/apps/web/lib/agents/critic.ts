/**
 * Deterministic critic for the local $0 stack.
 *
 * Runs simple rule checks on the generated HTML:
 *  - has <h1> title
 *  - has <h2> section headers
 *  - contains abstract
 *  - includes figures
 *  - includes claims
 *
 * Returns a CriticResult with a short summary message that gets streamed
 * back to the UI as the agent's reasoning.
 */

export type CriticResult = {
  blockingFailures: number
  accepted: boolean
  score: number
  summary: string
  ruleChecks: Array<{ name: string; blocking: boolean; passed: boolean; message: string }>
}

export function critiqueDraft(html: string, _plan: unknown): CriticResult {
  const checks: CriticResult["ruleChecks"] = []

  checks.push({
    name: "has_title",
    blocking: true,
    passed: /<h1[^>]*>[^<]+<\/h1>/.test(html),
    message: "Has h1 title",
  })
  checks.push({
    name: "has_sections",
    blocking: false,
    passed: (html.match(/<h2/g) ?? []).length >= 2,
    message: "Has multiple h2 sections",
  })
  checks.push({
    name: "has_abstract",
    blocking: true,
    passed: /Abstract/i.test(html),
    message: "Contains abstract",
  })
  checks.push({
    name: "has_figures",
    blocking: false,
    passed: /<figure/g.test(html),
    message: "Includes figures",
  })
  checks.push({
    name: "has_claims",
    blocking: false,
    passed: /class="claim"/g.test(html),
    message: "Includes claims",
  })
  checks.push({
    name: "html_size",
    blocking: true,
    passed: html.length > 1500,
    message: "HTML is non-trivial",
  })
  checks.push({
    name: "uses_accent",
    blocking: false,
    passed: /var\(--accent\)/.test(html),
    message: "Uses accent color variable",
  })

  const blockingFailures = checks.filter((c) => c.blocking && !c.passed).length
  const passedChecks = checks.filter((c) => c.passed).length
  const score = Math.round((passedChecks / checks.length) * 10 * 10) / 10

  let summary = ""
  if (blockingFailures === 0 && score >= 8) {
    summary = `All checks pass. Score ${score}/10. Density on target.`
  } else if (blockingFailures === 0) {
    const failed = checks.filter((c) => !c.passed).map((c) => c.name)
    summary = `Score ${score}/10. Refining: ${failed.join(", ")}.`
  } else {
    const blocking = checks.filter((c) => c.blocking && !c.passed).map((c) => c.name)
    summary = `Blocking issues: ${blocking.join(", ")}. Reworking.`
  }

  return {
    blockingFailures,
    accepted: blockingFailures === 0 && score >= 7,
    score,
    summary,
    ruleChecks: checks,
  }
}
