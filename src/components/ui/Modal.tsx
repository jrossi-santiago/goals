"use client";

import { useEffect } from "react";

export function Modal({
  onClose,
  children,
  wide = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`card animate-fade-in max-h-[85vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
