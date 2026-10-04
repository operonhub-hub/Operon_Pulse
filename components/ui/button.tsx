import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 active:bg-zinc-950",
        brand:
          "bg-amber-500 text-zinc-950 font-semibold shadow-xs hover:bg-amber-400 active:bg-amber-600",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-500 active:bg-rose-700",
        outline:
          "border border-zinc-200/90 bg-white text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 hover:border-zinc-300",
        secondary:
          "bg-zinc-100 text-zinc-900 shadow-2xs hover:bg-zinc-200/80",
        ghost:
          "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900",
        link: "text-zinc-900 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs sm:text-sm",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-10 sm:h-11 px-6 sm:px-8 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props?.className),
        // @ts-expect-error ref forwarding for cloned child element
        ref,
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
