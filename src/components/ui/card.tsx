import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ className, children, hover, onClick, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-elevated border border-border rounded-xl p-6",
        hover && "hover:border-border-hover transition-colors duration-150",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
