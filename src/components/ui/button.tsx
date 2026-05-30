import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none border-2 border-black shadow-[4px_4px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-[#F939A3] text-black shadow-[4px_4px_0px_#6B2E77] hover:bg-[#ff55bb] hover:shadow-[2px_2px_0px_#6B2E77] hover:translate-x-[2px] hover:translate-y-[2px]",
        destructive:
          "bg-[#FC6B48] text-black shadow-[4px_4px_0px_#000000]",
        outline:
          "border-2 border-black bg-transparent text-[#F939A3] shadow-[4px_4px_0px_#000000] hover:bg-[#F939A3] hover:text-black",
        secondary:
          "bg-[#FDE601] text-black shadow-[4px_4px_0px_#6B2E77] hover:bg-[#ffed33]",
        ghost:
          "bg-transparent text-[#F939A3] shadow-none border-transparent hover:bg-[#F939A3]/10 hover:border-[#F939A3]/50 hover:shadow-none",
        link: "text-[#00F3B2] underline-offset-4 hover:underline shadow-none border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-sm px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
