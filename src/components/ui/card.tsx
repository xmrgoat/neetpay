import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({
  className,
  elevated,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-6",
        elevated ? "bg-elevated" : "bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
