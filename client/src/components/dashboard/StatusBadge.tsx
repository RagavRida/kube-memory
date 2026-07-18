import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusKind = "active" | "inactive" | "warning" | "configured" | "not-set";

interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
  className?: string;
}

const labels: Record<StatusKind, string> = {
  active: "Active",
  inactive: "Inactive",
  warning: "Needs attention",
  configured: "Configured",
  "not-set": "Not set",
};

const dotStatus: Record<StatusKind, "active" | "inactive" | "warning"> = {
  active: "active",
  inactive: "inactive",
  warning: "warning",
  configured: "active",
  "not-set": "inactive",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 font-normal", className)}>
      <span className="status-dot -ml-[1.8px]" data-status={dotStatus[status]} aria-hidden="true" />
      {label ?? labels[status]}
    </Badge>
  );
}
