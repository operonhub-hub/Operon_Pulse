"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-xs font-medium",
  lg: "h-10 w-10 text-sm font-medium",
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-zinc-200/80 bg-zinc-100 text-zinc-700",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || fallback}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="leading-none">{fallback}</span>
      )}
    </div>
  );
}
