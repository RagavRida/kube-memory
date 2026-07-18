import type * as k8s from "@kubernetes/client-node";

export type PodStatusSummary = {
  name: string;
  namespace: string;
  phase?: string;
  reason?: string;
  message?: string;
  startTime?: string;
  conditions?: Array<{ type?: string; status?: string; reason?: string; message?: string }>;
  containers: Array<{
    name?: string;
    ready?: boolean;
    restartCount?: number;
    state?: string;
    reason?: string;
    message?: string;
    oomKilled?: boolean;
  }>;
  terminalFailure: boolean;
  healthy: boolean;
};

function containerState(state?: k8s.V1ContainerState): {
  state?: string;
  reason?: string;
  message?: string;
  oomKilled?: boolean;
} {
  if (!state) return {};
  if (state.waiting) {
    return { state: "waiting", reason: state.waiting.reason, message: state.waiting.message };
  }
  if (state.running) {
    return { state: "running" };
  }
  if (state.terminated) {
    return {
      state: "terminated",
      reason: state.terminated.reason,
      message: state.terminated.message,
      oomKilled: state.terminated.reason === "OOMKilled",
    };
  }
  return {};
}

export function summarizePodStatus(pod: k8s.V1Pod): PodStatusSummary {
  const namespace = pod.metadata?.namespace ?? "default";
  const name = pod.metadata?.name ?? "unknown";
  const phase = pod.status?.phase;
  const reason = pod.status?.reason;
  const message = pod.status?.message;

  const containers = (pod.status?.containerStatuses ?? []).map((c) => {
    const current = containerState(c.state);
    const last = containerState(c.lastState);
    const oomFromLast = last.oomKilled || last.reason === "OOMKilled";
    const oomRestarting = (c.restartCount ?? 0) > 0 && oomFromLast;
    return {
      name: c.name,
      ready: c.ready,
      restartCount: c.restartCount,
      ...current,
      oomKilled: current.oomKilled || oomFromLast || oomRestarting,
      reason: current.reason ?? (oomFromLast || oomRestarting ? "OOMKilled" : last.reason),
    };
  });

  const initContainers = (pod.status?.initContainerStatuses ?? []).map((c) => ({
    name: c.name,
    ready: c.ready,
    restartCount: c.restartCount,
    ...containerState(c.state),
  }));

  const allContainers = [...initContainers, ...containers];
  const oomKilled = allContainers.some((c) => c.oomKilled || c.reason === "OOMKilled");
  const crashLoop = allContainers.some((c) => c.reason === "CrashLoopBackOff");
  const oomRestarting = allContainers.some(
    (c) => (c.restartCount ?? 0) > 0 && (c.oomKilled || c.reason === "OOMKilled"),
  );
  const failedPhase = phase === "Failed";
  const terminalFailure =
    failedPhase || oomKilled || crashLoop || oomRestarting || reason === "Evicted";
  const healthy =
    (phase === "Running" && allContainers.every((c) => c.ready !== false)) ||
    phase === "Succeeded";

  return {
    name,
    namespace,
    phase,
    reason,
    message,
    startTime: pod.status?.startTime?.toISOString(),
    conditions: pod.status?.conditions?.map((c) => ({
      type: c.type,
      status: c.status,
      reason: c.reason,
      message: c.message,
    })),
    containers: allContainers,
    terminalFailure,
    healthy,
  };
}
