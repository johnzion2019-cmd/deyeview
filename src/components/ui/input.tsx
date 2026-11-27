import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3.5 text-base text-mist outline-none placeholder:text-muted focus:border-marigold",
        className,
      )}
      {...props}
    />
  );
}
