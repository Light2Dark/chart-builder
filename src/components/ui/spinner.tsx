import { cn } from "@/lib/utils";
import { Loader2, type LucideProps } from "lucide-react";

export const Spinner = ({
  className,
  ...props
}: { className?: string } & LucideProps) => {
  return <Loader2 className={cn("animate-spin", className)} {...props} />;
};
