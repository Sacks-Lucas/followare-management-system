"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  console.log("solo molesto")
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
