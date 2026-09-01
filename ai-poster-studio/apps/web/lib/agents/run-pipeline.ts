/**
 * The poster-generation pipeline.
 *
 * Runs the agent loop in-process. Idempotent enough that it can be triggered
 * from upload, feedback, or rerun.
 */

import "server-only"
import { appendEvent, createDraft, getProject, updateDraft, updateProject } from "@/lib/db/local"
import type { ContentBrief, PosterPlan, PosterTemplate } from "@aips/types"
import { critiqueDraft } from "./critic"
import { generatePosterHTML } from "./design"
import { extractContentBrief } from "./ingest"
import { generatePosterPlan } from "./plan"

export async function runPipeline(projectId: string, feedback?: string): Promise<void> {
  const project = await getProject(projectId)
  if (!project) return

  // Re-use the content brief and plan if we already have them; otherwise build them.
  let contentBrief = project.contentBrief as unknown as ContentBrief | null
  let posterPlan = project.posterPlan as unknown as PosterPlan | null

  if (!contentBrief || !posterPlan) {
    await appendEvent({
      projectId,
      runId: projectId,
      stage: "reading",
      message: "Reading paper.pdf…",
    })
    await updateProject(projectId, { status: "ingesting" })

    try {
      const brief = (await extractContentBrief(project.paperFileUrl)) as unknown as ContentBrief
      contentBrief = brief
      await updateProject(projectId, { contentBrief: brief })
      await appendEvent({
        projectId,
        runId: projectId,
        stage: "extracting",
        message: `Identified: ${contentBrief.sections.length} sections, ${contentBrief.figures.length} figures, ${contentBrief.claims.length} claims`,
      })
    } catch (err) {
      await appendEvent({
        projectId,
        runId: projectId,
        stage: "done",
        message: `Ingest failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      await updateProject(projectId, { status: "failed" })
      return
    }

    await updateProject(projectId, { status: "planning" })
    const plan = (await generatePosterPlan(
      contentBrief as Parameters<typeof generatePosterPlan>[0],
      project.template as PosterTemplate,
    )) as unknown as PosterPlan
    posterPlan = plan
    await updateProject(projectId, { posterPlan: plan })
    await appendEvent({
      projectId,
      runId: projectId,
      stage: "planning",
      message: `Planned ${posterPlan.panels.length} panels`,
    })
  }

  await updateProject(projectId, { status: "drafting" })

  // Cap revisions — feedback regenerations count, but cap at 5 total drafts
  const existingDrafts = project.drafts ?? []
  const startTurn = existingDrafts.length + 1
  const maxTurn = Math.min(startTurn + (feedback ? 2 : 3), 5)

  let lastFeedback = feedback ?? null
  let acceptedDraftId: string | null = null

  for (let turn = startTurn; turn <= maxTurn; turn++) {
    await appendEvent({
      projectId,
      runId: projectId,
      stage: "rendering",
      message: turn === 1 ? "Creating Draft 1..." : `Revising Draft ${turn}...`,
      draftNumber: turn,
    })

    const html = await generatePosterHTML({
      contentBrief,
      posterPlan,
      turnNumber: turn,
      previousFeedback: lastFeedback,
      template: project.template,
    })

    const draft = await createDraft({
      projectId,
      turnNumber: turn,
      htmlContent: html,
      previewPngUrl: null,
      pdfUrl: null,
      criticFeedback: null,
      score: null,
      accepted: false,
      durationMs: 0,
    })

    await appendEvent({
      projectId,
      runId: projectId,
      stage: "critique",
      message: `Draft ${turn} rendered. Running critic...`,
      draftNumber: turn,
    })

    const critic = await critiqueDraft(html, posterPlan)

    await appendEvent({
      projectId,
      runId: projectId,
      stage: "critique",
      message: critic.summary,
      draftNumber: turn,
    })

    await updateDraft(draft.id, {
      criticFeedback: {
        ruleChecks: critic.ruleChecks,
        vlmCritique: null,
        consolidated: critic.summary,
        blockingFailures: critic.blockingFailures,
      },
      score: critic.score,
      accepted: critic.accepted,
    })

    lastFeedback = critic.summary
    acceptedDraftId = draft.id

    if (critic.accepted) {
      await appendEvent({
        projectId,
        runId: projectId,
        stage: "done",
        message: `Draft ${turn} accepted. Finalizing.`,
        draftNumber: turn,
      })
      break
    }
  }

  await updateProject(projectId, {
    status: "completed",
    finalDraftId: acceptedDraftId,
    completedAt: new Date().toISOString(),
  })

  await appendEvent({
    projectId,
    runId: projectId,
    stage: "done",
    message: "Done. Open the poster preview to download.",
  })
}
