export type PublicUser = {
  name: string
  email?: string
}

export type PublicSession = {
  id: string
  user: PublicUser | null
  hasPersistedKey: boolean
}

export type ModelOption = {
  id: string
  label: string
  description?: string
}

export type RepositoryOption = {
  id: string
  label: string
  url: string
  owner?: string
  name?: string
  defaultBranch?: string
}

export type PrStatus = "none" | "open" | "closed" | "merged" | "draft" | "unknown"

export type ArtifactPreview = {
  path: string
  name: string
  size?: number
  contentType?: string
  mediaUrl?: string
  previewKind: "image" | "video" | "file"
}

export type AgentCard = {
  id: string
  title: string
  status: string
  latestRunId?: string
  durationMs?: number
  repository: string
  repositoryUrl?: string
  branch?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  prUrl?: string
  prStatus?: PrStatus
  latestMessage?: string
  artifacts: ArtifactPreview[]
}

export type AgentListResponse = {
  agents: AgentCard[]
  nextCursor?: string
}

export type CreateAgentInput = {
  name?: string
  prompt: string
  repositoryId: string
  modelId?: string
  branch?: string
  autoCreatePR?: boolean
}

export type CreateAgentResponse = {
  agent: AgentCard
}

export type AgentRunSummary = {
  id: string
  status?: string
  createdAt?: string
  durationMs?: number
  result?: string
  branch?: string
  prUrl?: string
  prStatus?: PrStatus
}

export type AgentDetailResponse = {
  agent: AgentCard
  runs: AgentRunSummary[]
}

export type AgentStreamEvent =
  | { type: "user"; text: string }
  | { type: "assistant"; text: string }
  | { type: "thinking"; text: string; id?: string }
  | {
      type: "tool"
      callId: string
      name: string
      status: string
      args?: string
      result?: string
    }
  | { type: "status"; status: string; message?: string }
  | { type: "task"; status?: string; text?: string }
  | {
      type: "run_status"
      status: string
      result?: string
      durationMs?: number
    }
