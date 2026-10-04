import * as React from "react";
import { LucideIcon, Hammer } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlaceholderViewProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  phaseLabel?: string;
}

export function PlaceholderView({
  title,
  description,
  icon: Icon = Hammer,
  phaseLabel = "Coming in Future Phase",
}: PlaceholderViewProps) {
  return (
    <PageContainer>
      <Card className="border-dashed border-zinc-300/80 bg-zinc-50/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-xs border border-zinc-200">
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className="mt-4 border-amber-300 bg-amber-50 text-amber-800">
            {phaseLabel}
          </Badge>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-zinc-900">
            {title}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-zinc-500 leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
