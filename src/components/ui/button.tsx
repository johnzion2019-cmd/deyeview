import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold",
  {
    variants: {
      variant: {
        default: "bg-marigold text-ink shadow-[0_8px_24px_rgba(240,180,41,0.28)]",
        secondary: "bg-white/8 text-mist ring-1 ring-white/10",
        ghost: "bg-transparent text-mist",
        danger: "bg-clay text-white",
      },
      size: {
        default: "h-12 px-5 text-[15px]",
        sm: "h-9 px-3 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : type} {...props} />;
}
