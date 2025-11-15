/**
 * Timeline Chart Component
 *
 * Visualizes major milestones and changes in repository history using ECharts.
 * Displays events on an interactive timeline with different colors for event types.
 *
 * @module components/TimelineChart
 */

"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import type { TimelineEvent } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface TimelineChartProps {
  timeline?: TimelineEvent[]
}

/**
 * Type colors for different event categories
 */
const EVENT_TYPE_COLORS: Record<TimelineEvent["type"], string> = {
  milestone: "#8b5cf6", // Purple
  feature: "#3b82f6", // Blue
  refactor: "#f59e0b", // Orange
  architecture: "#ef4444", // Red
  release: "#10b981", // Green
}

const EVENT_TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  milestone: "Milestone",
  feature: "Feature",
  refactor: "Refactor",
  architecture: "Architecture",
  release: "Release",
}

export function TimelineChart({ timeline = [] }: TimelineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || timeline.length === 0) return

    const chart = echarts.init(chartRef.current)

    // Prepare data for ECharts - one-dimensional timeline (all on same Y level)
    const seriesData = timeline.map((event) => ({
      value: [event.date, 0], // All events on Y=0 for 1D timeline
      itemStyle: {
        color: EVENT_TYPE_COLORS[event.type],
      },
      name: event.title,
      description: event.description,
      type: event.type,
      commits: event.commits,
    }))

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          if (Array.isArray(params)) return ""
          const p = params as {
            data: {
              type: TimelineEvent["type"]
              name: string
              value: (string | number)[]
              description: string
              commits: string[]
            }
          }
          const data = p.data
          const eventType = data.type
          return `
            <div style="max-width: 300px;">
              <strong style="color: ${EVENT_TYPE_COLORS[eventType]};">${data.name}</strong><br/>
              <span style="color: #666;">Type: ${EVENT_TYPE_LABELS[eventType]}</span><br/>
              <span style="color: #666;">Date: ${data.value[0]}</span><br/>
              <span style="color: #999; font-size: 11px;">${data.commits.length} commit${data.commits.length > 1 ? "s" : ""}</span>
            </div>
          `
        },
      },
      grid: {
        left: "60px",
        right: "60px",
        bottom: "60px",
        top: "40px",
        containLabel: false,
      },
      xAxis: {
        type: "time",
        axisLine: {
          lineStyle: {
            color: "#cbd5e1",
            width: 2,
          },
        },
        axisLabel: {
          formatter: "{yyyy}-{MM}-{dd}",
          fontSize: 11,
          color: "#64748b",
        },
        splitLine: {
          show: false,
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: "#cbd5e1",
          },
        },
      },
      yAxis: {
        type: "value",
        show: false,
        min: -1,
        max: 1,
      },
      series: [
        {
          type: "scatter",
          data: seriesData,
          symbolSize: 12,
          emphasis: {
            scale: 1.8,
            focus: "self",
          },
          label: {
            show: false,
          },
        },
      ],
    }

    chart.setOption(option)

    // Handle resize
    const handleResize = () => chart.resize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.dispose()
    }
  }, [timeline])

  if (!timeline || timeline.length === 0) {
    return null // Don't show component if no timeline data
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Project Timeline
        </CardTitle>
        <CardDescription>
          Major milestones and changes in project history ({timeline.length} events)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart - 1D Timeline */}
        <div ref={chartRef} style={{ width: "100%", height: "120px" }} />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: EVENT_TYPE_COLORS[type as TimelineEvent["type"]] }}
              />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Event List */}
        <div className="mt-6 space-y-4">
          <h4 className="font-semibold text-sm">Timeline Events</h4>
          <div className="space-y-3">
            {timeline.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full mt-2 shrink-0"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {EVENT_TYPE_LABELS[event.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{event.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {event.commits.length} commit{event.commits.length > 1 ? "s" : ""}:{" "}
                    {event.commits.slice(0, 3).join(", ")}
                    {event.commits.length > 3 && ` +${event.commits.length - 3} more`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
