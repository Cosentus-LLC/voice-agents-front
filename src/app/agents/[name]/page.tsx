"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { getAgent } from "@/lib/api"
import type { Agent } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Mic, Brain, Volume2, Radio, Wrench, Variable, FileText, BarChart3 } from "lucide-react"

const TOOL_DESCRIPTIONS: Record<string, string> = {
  end_call: "Ends the call gracefully",
  press_digit: "DTMF tones for IVR navigation",
  transfer_call: "Transfers to another number",
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const decodedName = decodeURIComponent(name)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchAgent() {
      setLoading(true)
      try {
        const data = await getAgent(decodedName)
        setAgent(data)
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    }
    fetchAgent()
  }, [decodedName])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Agent not found.</p>
        <Button variant="link" className="mt-2" render={<Link href="/agents" />}>
          Back to Agents
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/agents" />}>
          <ArrowLeft size={16} className="mr-1" />
          Agents
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {agent.display_name}
          </h1>
          <StatusBadge status={agent.type} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {agent.description}
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain size={16} />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ConfigRow icon={<Brain size={14} />} label="LLM" value={`${agent.llm.provider} / ${agent.llm.model}`} />
            <ConfigRow icon={<Volume2 size={14} />} label="TTS" value={`${agent.tts.provider} / ${agent.tts.model}`} />
            <ConfigRow icon={<Mic size={14} />} label="STT" value={agent.stt.provider} />
            <ConfigRow
              icon={<Radio size={14} />}
              label="Recording"
              value={
                <span className="flex items-center gap-2">
                  <Badge variant={agent.recording.enabled ? "default" : "secondary"} className="text-xs">
                    {agent.recording.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {agent.recording.channels} ch
                  </span>
                </span>
              }
            />
          </div>

          {agent.tts.voice_id && (
            <div className="text-xs text-muted-foreground">
              Voice ID: <span className="font-mono">{agent.tts.voice_id}</span>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              First Message
            </h4>
            <blockquote className="border-l-2 border-[var(--color-brand)] pl-4 italic text-sm leading-relaxed text-muted-foreground">
              {agent.first_message}
            </blockquote>
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      {agent.tools.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench size={16} />
              Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {agent.tools.map((tool) => (
                <div key={tool} className="flex items-center gap-3">
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {tool}
                  </Badge>
                  {TOOL_DESCRIPTIONS[tool] && (
                    <span className="text-sm text-muted-foreground">
                      {TOOL_DESCRIPTIONS[tool]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Variables */}
      {agent.prompt_variables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Variable size={16} />
              Dynamic Variables
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Populated from batch Excel data at call time
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.prompt_variables.map((v) => (
                <Badge key={v} variant="secondary" className="font-mono text-xs">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Preview */}
      {agent.prompt_preview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText size={16} />
              System Prompt (Preview)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-4 font-mono text-xs leading-relaxed">
              {agent.prompt_preview.length > 500
                ? agent.prompt_preview.slice(0, 500) + "\n\n... (truncated)"
                : agent.prompt_preview}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Post-Call Analyses */}
      {agent.post_call_analyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 size={16} />
              Post-Call Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Output Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.post_call_analyses.map((a) => (
                  <TableRow key={a.name}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.model}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {a.output_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ConfigRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
