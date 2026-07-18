import { useCallback, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
  toastMessage?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "outline",
  className,
  toastMessage,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (toastMessage) toast.success(toastMessage);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [value, toastMessage]);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("gap-1.5", className)}
      onClick={handleCopy}
      aria-live="polite"
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        strokeWidth={2}
        className="size-3.5"
      />
      {copied ? copiedLabel : label}
    </Button>
  );
}
