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
        "w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10",
        maxWidth === "default" && "max-w-[1480px] mx-auto",
        maxWidth === "narrow" && "max-w-4xl mx-auto",
        maxWidth === "full" && "max-w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
