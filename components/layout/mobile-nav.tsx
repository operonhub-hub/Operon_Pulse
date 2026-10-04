"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/types";

interface MobileNavProps {
  user?: UserProfile;
}

export function MobileNav({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close when ESC is pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden text-zinc-600 hover:text-zinc-900"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4 z-10">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </Button>
        </div>
        <Sidebar
          user={user}
          className="w-full border-r-0"
          onNavigate={() => setIsOpen(false)}
        />
      </div>
    </>
  );
}
