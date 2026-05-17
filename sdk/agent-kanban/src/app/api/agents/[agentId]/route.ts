import { jsonError } from "@/lib/agents/http"
import { getCloudAgentDetail, requireSession } from "@/lib/agents/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ agentId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request)
    const { agentId } = await context.params

    return Response.json(await getCloudAgentDetail(session.apiKey, agentId))
  } catch (error) {
    return jsonError(error, "Failed to load agent details.")
  }
}
