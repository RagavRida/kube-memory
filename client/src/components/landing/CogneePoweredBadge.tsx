import { Badge } from "@/components/ui/badge";

export function CogneePoweredBadge() {
  return (
    <div className="flex justify-center py-8">
      <Badge variant="outline" className="px-4 py-2 text-sm font-normal">
        Powered by{" "}
        <a
          href="https://docs.cognee.ai"
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline underline-offset-4"
        >
          Cognee Cloud
        </a>
      </Badge>
    </div>
  );
}
