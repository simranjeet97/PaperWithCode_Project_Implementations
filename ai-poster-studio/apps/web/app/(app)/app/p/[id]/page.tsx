import { WorkspaceShell } from "@/components/workspace/workspace-shell"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const { id } = await params
  return <WorkspaceShell projectId={id} />
}
