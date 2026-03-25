import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AnalysisFieldProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  borderColor?: string;
}

export function AnalysisField({ icon: Icon, label, value, iconColor = "text-primary", borderColor = "" }: AnalysisFieldProps) {
  return (
    <div className={cn("card-premium p-4", borderColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
