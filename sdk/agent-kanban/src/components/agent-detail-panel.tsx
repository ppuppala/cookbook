"use client"

import * as React from "react"
import {
  ArrowClockwiseIcon,
  BrainIcon,
  CirclesFourIcon,
  GitBranchIcon,
  LinkIcon,
  WrenchIcon,
  XIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AgentCard,
  AgentDetailResponse,
  AgentRunSummary,
  AgentStreamEvent,
  PrStatus,
} from "@/lib/agents/types"
import { cn } from "@/lib/utils"

type TimelineEntry = {
  id: string
  kind: "user" | "assistant" | "thinking" | "tool" | "status" | "task"
  text: string
  toolName?: string
  toolStatus?: string
  toolArgs?: string
  toolResult?: string
  isActive?: boolean
}

type AgentDetailPanelProps = {
  agent: AgentCard
  sessionId: string
  onClose: () => void
  onAgentUpdated: (agent: AgentCard) => void
}

export function AgentDetailPanel({
  agent,
  sessionId,
  onClose,
  onAgentUpdated,
}: AgentDetailPanelProps) {
  const [detail, setDetail] = React.useState<AgentDetailResponse | null>(null)
  const [selectedRunId, setSelectedRunId] = React.useState<string | undefined>(
    agent.latestRunId
  )
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(true)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [runStatus, setRunStatus] = React.useState(agent.status)

  const loadDetail = React.useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      if (options.showLoading !== false) {
        setIsLoadingDetail(true)
      }
      setStreamError(null)
      try {
        const response = await apiFetch<AgentDetailResponse>(
          `/api/agents/${encodeURIComponent(agent.id)}`,
          sessionId
        )
        setDetail(response)
        onAgentUpdated(response.agent)
        const nextRunId = response.runs[0]?.id ?? response.agent.latestRunId
        if (nextRunId) {
          setSelectedRunId((current) =>
            current && response.runs.some((run) => run.id === current)
              ? current
              : nextRunId
          )
        }
        setRunStatus(response.agent.status)
      } catch (error) {
        setStreamError(errorMessage(error, "Failed to load agent details."))
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [agent.id, onAgentUpdated, sessionId]
  )

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const response = await apiFetch<AgentDetailResponse>(
          `/api/agents/${encodeURIComponent(agent.id)}`,
          sessionId
        )
        if (cancelled) {
          return
        }

        setDetail(response)
        onAgentUpdated(response.agent)
        const nextRunId = response.runs[0]?.id ?? response.agent.latestRunId
        if (nextRunId) {
          setSelectedRunId((current) =>
            current && response.runs.some((run) => run.id === current)
              ? current
              : nextRunId
          )
        }
        setRunStatus(response.agent.status)
      } catch (error) {
        if (!cancelled) {
          setStreamError(errorMessage(error, "Failed to load agent details."))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [agent.id, onAgentUpdated, sessionId])

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const activeAgent = detail?.agent ?? agent
  const runs = detail?.runs ?? []
  const selectedRun =
    runs.find((run) => run.id === selectedRunId) ??
    (selectedRunId
      ? ({
          id: selectedRunId,
          status: runStatus,
        } satisfies AgentRunSummary)
      : undefined)

  return (
    <>
      <button
        type="button"
        aria-label="Close agent details"
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-background shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="agent-detail-title" className="truncate text-lg font-semibold">
                {activeAgent.title}
              </h2>
              <StatusBadge status={runStatus} />
              {isStreaming ? <Badge variant="secondary">Live</Badge> : null}
            </div>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <GitBranchIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{activeAgent.repository}</span>
              {activeAgent.branch ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{activeAgent.branch}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void loadDetail()}
              disabled={isLoadingDetail}
              aria-label="Refresh agent details"
            >
              <ArrowClockwiseIcon className={cn(isLoadingDetail && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <XIcon />
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3">
          {runs.length > 1 ? (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Run
              <Select
                items={runs.map((run) => ({
                  label: formatRunLabel(run),
                  value: run.id,
                }))}
                value={selectedRunId}
                onValueChange={(value) => {
                  if (value) {
                    setSelectedRunId(value)
                  }
                }}
              >
                <SelectTrigger aria-label="Agent run" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {formatRunLabel(run)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {selectedRun?.createdAt ? (
              <span>Started {formatTimestamp(selectedRun.createdAt)}</span>
            ) : null}
            {selectedRun?.durationMs ? (
              <span>· {formatDuration(selectedRun.durationMs)}</span>
            ) : null}
            {activeAgent.prStatus && activeAgent.prStatus !== "none" ? (
              <span>{formatPrStatusLabel(activeAgent.prStatus)}</span>
            ) : null}
            {activeAgent.prUrl ? (
              <a
                href={activeAgent.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                Pull request
                <LinkIcon aria-hidden="true" className="size-3" />
              </a>
            ) : null}
          </div>

          {activeAgent.latestMessage ? (
            <Card size="sm" className="bg-muted/30">
              <CardHeader className="gap-1 pb-2">
                <CardDescription>Latest prompt or summary</CardDescription>
                <CardTitle className="text-sm font-normal leading-relaxed">
                  {activeAgent.latestMessage}
                </CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </div>

        {selectedRunId ? (
          <RunActivityFeed
            key={`${agent.id}-${selectedRunId}`}
            agentId={agent.id}
            runId={selectedRunId}
            sessionId={sessionId}
            isLoadingDetail={isLoadingDetail}
            onRunStatus={setRunStatus}
            onStreamingChange={setIsStreaming}
            onStreamError={setStreamError}
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4 text-sm text-muted-foreground">
              {isLoadingDetail
                ? "Loading agent activity…"
                : "No runs are available for this agent yet."}
            </div>
          </ScrollArea>
        )}

        {streamError ? (
          <div className="shrink-0 border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {streamError}
          </div>
        ) : null}
      </aside>
    </>
  )
}

function RunActivityFeed({
  agentId,
  runId,
  sessionId,
  isLoadingDetail,
  onRunStatus,
  onStreamingChange,
  onStreamError,
}: {
  agentId: string
  runId: string
  sessionId: string
  isLoadingDetail: boolean
  onRunStatus: React.Dispatch<React.SetStateAction<string>>
  onStreamingChange: (isStreaming: boolean) => void
  onStreamError: (message: string) => void
}) {
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([])
  const [isStreaming, setIsStreaming] = React.useState(true)
  const scrollAnchorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    onStreamingChange(true)

    const streamUrl = new URL(
      `/api/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/stream`,
      window.location.origin
    )
    streamUrl.searchParams.set("session", sessionId)

    const source = new EventSource(streamUrl, { withCredentials: true })

    source.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as AgentStreamEvent
        applyStreamEvent(payload, setTimeline, onRunStatus)
      } catch {
        // Ignore malformed stream chunks.
      }
    })

    source.addEventListener("error", (event) => {
      if ("data" in event && typeof event.data === "string" && event.data) {
        try {
          const payload = JSON.parse(event.data) as { message?: string }
          if (payload.message) {
            onStreamError(payload.message)
          }
        } catch {
          // Fall through to generic handling below.
        }
      }
    })

    source.addEventListener("done", () => {
      setIsStreaming(false)
      onStreamingChange(false)
      source.close()
    })

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setIsStreaming(false)
        onStreamingChange(false)
        return
      }

      setIsStreaming(false)
      onStreamingChange(false)
      onStreamError("Lost connection to the agent stream.")
      source.close()
    }

    return () => {
      source.close()
      onStreamingChange(false)
    }
  }, [agentId, onRunStatus, onStreamError, onStreamingChange, runId, sessionId])

  React.useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [timeline])

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-3 p-4">
        {isLoadingDetail && timeline.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading agent activity…</div>
        ) : null}

        {timeline.length === 0 && !isLoadingDetail && !isStreaming ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No streamed activity yet for this run. Refresh if the agent is still working.
          </div>
        ) : null}

        {timeline.map((entry) => (
          <TimelineEntryCard key={entry.id} entry={entry} />
        ))}
        <div ref={scrollAnchorRef} />
      </div>
    </ScrollArea>
  )
}

function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  const Icon =
    entry.kind === "thinking"
      ? BrainIcon
      : entry.kind === "tool"
        ? WrenchIcon
        : entry.kind === "status" || entry.kind === "task"
          ? CirclesFourIcon
          : undefined

  return (
    <Card
      size="sm"
      className={cn(
        "gap-2",
        entry.kind === "thinking" && "border-dashed bg-muted/20",
        entry.kind === "tool" && "bg-muted/15",
        entry.kind === "user" && "bg-primary/5"
      )}
    >
      <CardHeader className="gap-1 pb-0">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
          <span>{timelineKindLabel(entry)}</span>
          {entry.isActive ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[0.65rem]">
              Updating
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {entry.text}
        </pre>
        {entry.toolArgs ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Input:</span> {entry.toolArgs}
          </p>
        ) : null}
        {entry.toolResult ? (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Result:</span> {entry.toolResult}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function applyStreamEvent(
  event: AgentStreamEvent,
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>,
  setRunStatus: React.Dispatch<React.SetStateAction<string>>
) {
  if (event.type === "run_status") {
    if (event.status) {
      setRunStatus(event.status)
    }
    return
  }

  setTimeline((current) => {
    switch (event.type) {
      case "thinking": {
        const thinkingId = event.id ? `thinking-${event.id}` : "thinking-active"
        const nextEntry: TimelineEntry = {
          id: thinkingId,
          kind: "thinking",
          text: event.text,
          isActive: true,
        }
        const existingIndex = current.findIndex((entry) => entry.id === thinkingId)
        if (existingIndex >= 0) {
          const updated = [...current]
          updated[existingIndex] = {
            ...updated[existingIndex],
            text: event.text,
            isActive: true,
          }
          return updated
        }
        return [...finalizeThinkingEntries(current), nextEntry]
      }
      case "assistant": {
        return [
          ...finalizeThinkingEntries(current),
          {
            id: `assistant-${current.length}-${event.text.length}`,
            kind: "assistant",
            text: event.text,
          },
        ]
      }
      case "user":
        return [
          ...finalizeThinkingEntries(current),
          {
            id: `user-${current.length}`,
            kind: "user",
            text: event.text,
          },
        ]
      case "tool": {
        const toolId = `tool-${event.callId}`
        const nextEntry: TimelineEntry = {
          id: toolId,
          kind: "tool",
          text: formatToolLabel(event.name, event.status),
          toolName: event.name,
          toolStatus: event.status,
          toolArgs: event.args,
          toolResult: event.result,
        }
        const existingIndex = current.findIndex((entry) => entry.id === toolId)
        if (existingIndex >= 0) {
          const updated = [...current]
          updated[existingIndex] = nextEntry
          return updated
        }
        return [...finalizeThinkingEntries(current), nextEntry]
      }
      case "status":
        return [
          ...finalizeThinkingEntries(current),
          {
            id: `status-${current.length}-${event.status}`,
            kind: "status",
            text: event.message
              ? `${formatStatusLabel(event.status)} — ${event.message}`
              : formatStatusLabel(event.status),
          },
        ]
      case "task":
        return [
          ...finalizeThinkingEntries(current),
          {
            id: `task-${current.length}`,
            kind: "task",
            text:
              event.text ??
              (event.status ? `Task ${formatStatusLabel(event.status)}` : "Task update"),
          },
        ]
      default:
        return current
    }
  })
}

function finalizeThinkingEntries(entries: TimelineEntry[]) {
  let changed = false
  const finalized = entries.map((entry) => {
    if (entry.kind === "thinking" && entry.isActive) {
      changed = true
      return { ...entry, isActive: false }
    }
    return entry
  })
  return changed ? finalized : entries
}

function timelineKindLabel(entry: TimelineEntry) {
  if (entry.kind === "thinking") {
    return "Thinking"
  }
  if (entry.kind === "tool") {
    return entry.toolName ? `Tool · ${entry.toolName}` : "Tool"
  }
  if (entry.kind === "status") {
    return "Status"
  }
  if (entry.kind === "task") {
    return "Task"
  }
  if (entry.kind === "user") {
    return "You"
  }
  return "Assistant"
}

function formatToolLabel(name: string, status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "running") {
    return `Running ${name}…`
  }
  if (normalized === "completed") {
    return `Finished ${name}`
  }
  if (normalized === "error") {
    return `${name} failed`
  }
  return `${name} (${status})`
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const variant =
    normalized.includes("fail") || normalized.includes("error")
      ? "destructive"
      : normalized.includes("complete") || normalized.includes("done")
        ? "secondary"
        : normalized === "no_status"
          ? "ghost"
          : "outline"

  return <Badge variant={variant}>{formatStatusLabel(status)}</Badge>
}

function formatStatusLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === "unknown" || normalized === "no_status") {
    return "No status"
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPrStatusLabel(status: PrStatus) {
  switch (status) {
    case "none":
      return "No PR"
    case "open":
      return "Open"
    case "draft":
      return "Draft"
    case "merged":
      return "Merged"
    case "closed":
      return "Closed"
    case "unknown":
      return "Unknown"
  }
}

function formatRunLabel(run: AgentRunSummary) {
  const status = run.status ? formatStatusLabel(run.status) : "Run"
  if (!run.createdAt) {
    return `${status} · ${run.id.slice(0, 8)}`
  }
  return `${status} · ${formatTimestamp(run.createdAt)}`
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

function formatDuration(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1000))
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

async function apiFetch<T>(
  input: string,
  sessionId: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      "x-agent-kanban-session": sessionId,
    },
  })
  const payload = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}.`)
  }

  return payload as T
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
