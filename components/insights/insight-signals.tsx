"use client";

import { InsightSignal } from "@/lib/insights/types";
import { Sparkles, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface InsightSignalsProps {
  signals: InsightSignal[];
}

export function InsightSignals({ signals }: InsightSignalsProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="p-4 bg-card border border-border rounded-lg flex items-center gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-muted-foreground shrink-0" />
        <span>No significant attention anomalies or trend signals detected for this timeframe.</span>
      </div>
    );
  }

  const getIcon = (type: InsightSignal["type"]) => {
    switch (type) {
      case "positive":
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  const getBorderColor = (type: InsightSignal["type"]) => {
    switch (type) {
      case "positive":
        return "border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/10";
      case "warning":
        return "border-amber-200 dark:border-amber-950/60 bg-amber-50/40 dark:bg-amber-950/10";
      default:
        return "border-blue-200 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/10";
    }
  };

  return (
    <div className="p-5 bg-card border border-border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Attention Signals & Operational Observations
        </h3>
        <span className="text-[11px] text-muted-foreground">Deterministic Rule-Based Insights</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {signals.map((sig) => (
          <div
            key={sig.id}
            className={`p-3.5 border rounded-lg flex items-start gap-3 text-xs ${getBorderColor(
              sig.type
            )}`}
          >
            {getIcon(sig.type)}
            <div>
              <h4 className="font-semibold text-foreground mb-0.5">{sig.title}</h4>
              <p className="text-muted-foreground leading-relaxed">{sig.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
