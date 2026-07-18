import type { FailureCategory } from "../../schemas/graph/index.js";

interface FailureRule {
  category: FailureCategory;
  patterns: RegExp[];
  suggestion?: string;
}

const RULES: FailureRule[] = [
  {
    category: "Resource Limit",
    patterns: [/OOMKilled/i, /out of memory/i, /memory limit/i, /cpu thrott/i, /exceeded quota/i],
    suggestion: "Raise memory or CPU limits for the affected workload.",
  },
  {
    category: "Configuration Error",
    patterns: [
      /invalid configuration/i,
      /wrong api version/i,
      /bad env/i,
      /missing secret/i,
      /configmap.*not found/i,
      /CreateContainerConfigError/i,
    ],
    suggestion: "Verify ConfigMaps, Secrets, and environment variables.",
  },
  {
    category: "Dependency Failure",
    patterns: [/connection refused/i, /upstream connect error/i, /database.*unreachable/i, /redis.*error/i],
    suggestion: "Check downstream service health and network policies.",
  },
  {
    category: "Network / DNS",
    patterns: [/no such host/i, /dns lookup/i, /network partition/i, /timeout.*connect/i, /i\/o timeout/i],
    suggestion: "Inspect DNS, service endpoints, and network policies.",
  },
  {
    category: "CrashLoop / App Exception",
    patterns: [/CrashLoopBackOff/i, /Back-off restarting/i, /panic:/i, /fatal exception/i, /exit code [1-9]/i],
    suggestion: "Review container logs and recent code or config changes.",
  },
  {
    category: "Timeout / Latency",
    patterns: [/context deadline exceeded/i, /request timeout/i, /deadline exceeded/i, /hung test/i],
    suggestion: "Increase timeouts or investigate slow dependencies.",
  },
  {
    category: "Permission / Auth",
    patterns: [/403 forbidden/i, /access denied/i, /unauthorized/i, /forbidden/i, /permission denied/i],
    suggestion: "Verify RBAC, service accounts, and secret access.",
  },
  {
    category: "CI/CD Pipeline",
    patterns: [/pipeline failed/i, /build failed/i, /test suite failed/i, /lint error/i],
    suggestion: "Review CI logs and the triggering commit.",
  },
  {
    category: "Cluster Issues",
    patterns: [/disk full/i, /no nodes available/i, /version mismatch/i, /failed scheduling/i, /Evicted/i],
    suggestion: "Check node capacity, disk pressure, and cluster version skew.",
  },
  {
    category: "Agent Error",
    patterns: [/malformed json/i, /tool call loop/i, /hallucin/i, /invalid tool/i],
    suggestion: "Review agent prompt and tool schema definitions.",
  },
];

export interface ClassificationResult {
  category: FailureCategory;
  matchedPattern?: string;
  suggestion?: string;
  confidence: "high" | "medium" | "low";
}

export function classifyFailure(text: string): ClassificationResult {
  const normalized = text.trim();
  if (!normalized) {
    return { category: "Unknown", confidence: "low" };
  }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          category: rule.category,
          matchedPattern: match[0],
          suggestion: rule.suggestion,
          confidence: "high",
        };
      }
    }
  }

  return { category: "Unknown", confidence: "low" };
}

export function classifyFailureCategories(text: string): FailureCategory[] {
  const normalized = text.trim();
  const categories = new Set<FailureCategory>();

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      categories.add(rule.category);
    }
  }

  return categories.size > 0 ? [...categories] : ["Unknown"];
}
