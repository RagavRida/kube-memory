import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSetupProgress } from "@/hooks/useSetupProgress";

export function SetupJourney() {
  const { steps, currentStep, isLoading } = useSetupProgress();

  if (isLoading) return null;

  return (
    <div className="border-b bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-left md:justify-center gap-2 px-6 py-3 sm:gap-4">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isLocked = step.locked && !step.done;

          return (
            <div key={step.id} className="flex items-center gap-2 sm:gap-4">
              {index > 0 && (
                <span className="hidden h-px w-6 bg-border sm:block" aria-hidden="true" />
              )}
              {isLocked ? (
                <span
                  className="flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
                  title="Complete the previous step first"
                >
                  <span className="flex size-5 items-center justify-center rounded-full border text-[10px]">
                    {index + 1}
                  </span>
                  {step.label}
                </span>
              ) : (
                <Link
                  to={step.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    isCurrent
                      ? "border-[var(--color-accent-signal)] bg-[var(--color-accent-signal-muted)] text-foreground"
                      : step.done
                        ? "border-border bg-card text-muted-foreground hover:text-foreground"
                        : "border-border bg-card hover:border-[var(--color-accent-signal)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 -ml-[4.5px] items-center justify-center rounded-full text-[10px]",
                      step.done
                        ? "bg-[var(--color-success)] text-background"
                        : isCurrent
                          ? "bg-[var(--color-accent-signal)] text-background"
                          : "border",
                    )}
                  >
                    {step.done ? (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {step.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
