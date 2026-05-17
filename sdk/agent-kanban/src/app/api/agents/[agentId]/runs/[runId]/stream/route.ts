import { jsonError } from "@/lib/agents/http"
import { requireSession, streamCloudRunEvents } from "@/lib/agents/server"
import type { AgentStreamEvent } from "@/lib/agents/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ agentId: string; runId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request)
    const { agentId, runId } = await context.params

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (event: AgentStreamEvent) => {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
          )
        }

        try {
          await streamCloudRunEvents(session.apiKey, agentId, runId, send)
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`))
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to stream agent progress."
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    return jsonError(error, "Failed to start agent progress stream.")
  }
}
