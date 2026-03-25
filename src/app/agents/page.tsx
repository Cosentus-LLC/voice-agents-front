"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAgents, getAgent } from "@/lib/api"
import type { Agent } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, ChevronRight } from "lucide-react"

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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
        <div className="divide-y divide-border rounded-lg border bg-white">
          {agents.map((agent) => (
            <Link
              key={agent.name}
              href={`/agents/${encodeURIComponent(agent.name)}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                <Bot size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-semibold group-hover:text-[var(--color-brand)]">
                    {agent.display_name}
                  </h3>
                  <StatusBadge status={agent.type} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {agent.description}
                </p>
              </div>

              <div className="hidden items-center gap-1.5 md:flex">
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

              <div className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
                <span>{agent.tools.length} tool{agent.tools.length !== 1 ? "s" : ""}</span>
                <span className="text-border">|</span>
                <span>{agent.post_call_analyses.length} analys{agent.post_call_analyses.length === 1 ? "is" : "es"}</span>
              </div>

              <ChevronRight size={16} className="shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
