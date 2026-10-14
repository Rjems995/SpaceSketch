import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ComponentProps } from "react";
export function Button({
  asChild = false,
  className,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50",
          className,
        ),
      )}
      {...props}
    />
  );
}
