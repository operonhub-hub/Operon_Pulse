import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: "default" | "full" | "narrow";
}

export function PageContainer({
  children,
  className,
  maxWidth = "default",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 py-6 md:px-8 md:py-8",
        maxWidth === "default" && "max-w-7xl mx-auto",
        maxWidth === "narrow" && "max-w-5xl mx-auto",
        maxWidth === "full" && "max-w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
