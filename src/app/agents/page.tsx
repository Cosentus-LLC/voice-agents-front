"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAgents, getAgent } from "@/lib/api"
import type { Agent } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot } from "lucide-react"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const list = await getAgents()
        const details = await Promise.all(
          list.map((a) => getAgent(a.name).catch(() => null))
        )
        setAgents(details.filter(Boolean) as Agent[])
      } catch {
        setAgents([])
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voice agent configurations
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Bot size={40} className="text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No agents configured</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Agents are managed via YAML configuration files on the backend.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.name}
              href={`/agents/${encodeURIComponent(agent.name)}`}
              className="group"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold leading-tight group-hover:text-[var(--color-brand)]">
                      {agent.display_name}
                    </h3>
                    <StatusBadge status={agent.type} />
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {agent.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {agent.llm.model}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {agent.tts.provider}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {agent.stt.provider}
                    </Badge>
                  </div>

                  {agent.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tools.map((tool) => (
                        <Badge
                          key={tool}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {agent.post_call_analyses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {agent.post_call_analyses.length} analys{agent.post_call_analyses.length === 1 ? "is" : "es"} configured
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
