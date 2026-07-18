import { GoogleAuth } from "google-auth-library";
import { InstancesClient } from "@google-cloud/compute";
import { Storage } from "@google-cloud/storage";
import { Logging } from "@google-cloud/logging";
import { MetricServiceClient } from "@google-cloud/monitoring";
import { getEnv } from "../../config/env.js";
import { requireConnector } from "../connectors/connectorHttp.js";

interface GcpTokenSecret {
  refresh_token?: string;
  access_token?: string;
  expiry_date?: number;
}

function projectFromConfig(config: Record<string, unknown>, project?: string): string {
  const resolved = project ?? config.projectId;
  if (!resolved || typeof resolved !== "string") {
    throw new Error("GCP project ID is required (set default projectId in connector config or pass project)");
  }
  return resolved;
}

function buildLogFilter(options: {
  severity?: string;
  resourceType?: string;
  search?: string;
  from?: string;
  to?: string;
}): string {
  const filters: string[] = [];

  if (options.severity) {
    filters.push(`severity>=${options.severity}`);
  }

  if (options.resourceType) {
    filters.push(`resource.type="${options.resourceType}"`);
  }

  if (options.search) {
    const escaped = options.search.replace(/"/g, '\\"');

    filters.push(
      `(
        textPayload:"${escaped}" OR
        jsonPayload:"${escaped}" OR
        protoPayload:"${escaped}"
      )`.replace(/\n/g, " "),
    );
  }

  if (options.from) {
    filters.push(`timestamp>="${options.from}"`);
  }

  if (options.to) {
    filters.push(`timestamp<="${options.to}"`);
  }

  return filters.join(" AND ");
}

function normalizeInstance(instance: Record<string, unknown>, zone?: string) {
  const machineType = String(instance.machineType ?? "");
  const networkInterfaces = Array.isArray(instance.networkInterfaces)
    ? instance.networkInterfaces.map((ni: Record<string, unknown>) => ({
        network: ni.network,
        subnetwork: ni.subnetwork,
        networkIP: ni.networkIP,
        accessConfigs: ni.accessConfigs,
      }))
    : [];

  return {
    id: instance.id,
    name: instance.name,
    status: instance.status,
    zone: zone ?? extractZoneFromUrl(String(instance.zone ?? "")),
    machineType: machineType.split("/").pop() ?? machineType,
    creationTimestamp: instance.creationTimestamp,
    labels: instance.labels ?? {},
    networkInterfaces,
    metadata: instance.metadata,
    disks: instance.disks,
    tags: instance.tags,
  };
}

function normalizeStorageBucket(bucket: {
  name: string;
  metadata: Record<string, unknown>;
}) {
  return {
    name: bucket.name,
    location: bucket.metadata?.location,
    storageClass: bucket.metadata?.storageClass,
    created: bucket.metadata?.timeCreated,
    updated: bucket.metadata?.updated,
    labels: bucket.metadata?.labels,
    versioningEnabled: bucket.metadata?.versioning,
    // @ts-ignore
    publicAccessPrevention: bucket.metadata?.iamConfiguration?.publicAccessPrevention,
  }
}

function normalizeStorageObject(file: {
  name: string;
  metadata: Record<string, unknown>;
}) {
  return {
    name: file.name,
    size: file.metadata?.size,
    contentType: file.metadata?.contentType,
    storageClass: file.metadata?.storageClass,
    created: file.metadata?.timeCreated,
    updated: file.metadata?.updated,
    md5Hash: file.metadata?.md5Hash,
    etag: file.metadata?.etag,
  };
}

function normalizeLogEntry(entry: Record<string, unknown>) {
  return {
    insertId: entry.insertId,
    timestamp: entry.timestamp,
    severity: entry.severity,
    logName: entry.logName,
    resource: entry.resource,
    labels: entry.labels,
    textPayload: entry.textPayload,
    jsonPayload: entry.jsonPayload,
    protoPayload: entry.protoPayload,
  };
}

function normalizeMetricDescriptor(
  descriptor: Record<string, unknown>,
) {
  return {
    type: descriptor.type,
    displayName: descriptor.displayName,
    description: descriptor.description,
    metricKind: descriptor.metricKind,
    valueType: descriptor.valueType,
    unit: descriptor.unit,
    labels: descriptor.labels ?? [],
  };
}

function extractZoneFromUrl(zoneUrl: string): string {
  const parts = zoneUrl.split("/");
  return parts[parts.length - 1] ?? zoneUrl;
}

async function getInstancesClient(workspaceId: string): Promise<InstancesClient> {
  const { secret } = await requireConnector(workspaceId, "gcp");
  const tokens = JSON.parse(secret) as GcpTokenSecret;
  const env = getEnv();

  const auth = new GoogleAuth({
    credentials: {
      type: "authorized_user",
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    },
  });

  return new InstancesClient({ auth });
}

// Get a Google Cloud Storage client using the OAuth tokens from the connector
async function getStorageClient(workspaceId: string): Promise<Storage> {
  const { secret } = await requireConnector(workspaceId, "gcp");
  const tokens = JSON.parse(secret) as GcpTokenSecret;
  const env = getEnv();

  // Use GoogleAuth to create a Storage client with the OAuth tokens
  const auth = new GoogleAuth({
    credentials: {
      type: "authorized_user",
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    },
  });

  return new Storage({
    authClient: auth,
  });
}

// Get a Google Cloud Logging client using the OAuth tokens from the connector
async function getLoggingClient(workspaceId: string, project: string): Promise<Logging> {
  const { secret } = await requireConnector(workspaceId, "gcp");
  const tokens = JSON.parse(secret) as GcpTokenSecret;
  const env = getEnv();

  // Use GoogleAuth to create a Logging client with the OAuth tokens
  const auth = new GoogleAuth({
    credentials: {
      type: "authorized_user",
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    },
  });

  return new Logging({
    auth,
    projectId: project,
  })
}

// Get a Google Cloud Monitoring client using the OAuth tokens from the connector
async function getMonitoringClient(
  workspaceId: string,
): Promise<MetricServiceClient> {
  const { secret } = await requireConnector(workspaceId, "gcp");
  const tokens = JSON.parse(secret) as GcpTokenSecret;
  const env = getEnv();

  const auth = new GoogleAuth({
    credentials: {
      type: "authorized_user",
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    },
  });

  return new MetricServiceClient({
    // @ts-ignore
    auth,
  });
}

export async function isGcpAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "gcp");
    return true;
  } catch {
    return false;
  }
}

export async function listInstances(options: {
  workspaceId: string;
  project?: string;
  zone?: string;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");
  const project = projectFromConfig(config, options.project);
  const client = await getInstancesClient(options.workspaceId);

  if (options.zone) {
    const [instances] = await client.list({
      project,
      zone: options.zone,
    });
    return {
      project,
      zone: options.zone,
      instances: (instances ?? []).map((i) =>
        normalizeInstance(i as unknown as Record<string, unknown>, options.zone),
      ),
    };
  }

  const instances: unknown[] = [];
  for await (const [zoneKey, zoneData] of client.aggregatedListAsync({ project })) {
    const zoneInstances = zoneData.instances ?? [];
    const zoneName = zoneKey.replace("zones/", "");
    for (const inst of zoneInstances) {
      instances.push(normalizeInstance(inst as unknown as Record<string, unknown>, zoneName));
    }
  }

  return { project, instances };
}

export async function getInstance(options: {
  workspaceId: string;
  project?: string;
  zone: string;
  instance: string;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");
  const project = projectFromConfig(config, options.project);
  const client = await getInstancesClient(options.workspaceId);

  const [inst] = await client.get({
    project,
    zone: options.zone,
    instance: options.instance,
  });

  if (!inst) {
    throw new Error(`Instance ${options.instance} not found in ${options.zone}`);
  }

  return normalizeInstance(inst as unknown as Record<string, unknown>, options.zone);
}

// Get a list of storage buckets in the specified project
export async function listStorageBuckets(options: {
  workspaceId: string;
  project?: string;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");

  // Determine the project ID to use
  const project = projectFromConfig(config, options.project);

  // Get a Storage client using the OAuth tokens from the connector
  const storageClient = await getStorageClient(options.workspaceId);

  // List the storage buckets in the project
  const [buckets] = await storageClient.getBuckets({
    project,
  });
  
  return {
    project,
    buckets: buckets.map((bucket) => normalizeStorageBucket(bucket)),
  }
}

export async function getStorageBucket(options: {
  workspaceId: string;
  bucket: string;
}) : Promise<unknown> {
  const storage = await getStorageClient(options.workspaceId);

  // Get the bucket metadata
  const [metadata] = await storage.bucket(options.bucket).getMetadata();
  
  return normalizeStorageBucket({
    name: storage.bucket(options.bucket).name,
    metadata,
  });
}

export async function listBucketObjects(options: {
  workspaceId: string;
  bucket: string;
  prefix?: string;
  maxResults?: number;
}) : Promise<unknown> {
  const storage = await getStorageClient(options.workspaceId);

  const bucket = storage.bucket(options.bucket);

  const [files] = await bucket.getFiles({
    prefix: options.prefix,
    maxResults: options.maxResults ?? 100,
  });

  return {
    bucket: options.bucket,
    objects: files.map((file) => normalizeStorageObject({
        name: file.name,
        metadata: file.metadata,
      }),
    )
  };
}

export async function queryLogs(options: {
  workspaceId: string;
  project?: string;

  severity?:
    | "DEFAULT"
    | "DEBUG"
    | "INFO"
    | "NOTICE"
    | "WARNING"
    | "ERROR"
    | "CRITICAL"
    | "ALERT"
    | "EMERGENCY";

  resourceType?: string;

  search?: string;

  from?: string;

  to?: string;

  pageSize?: number;

  order?: "asc" | "desc";
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");

  const project = projectFromConfig(config, options.project);

  const logging = await getLoggingClient(
    options.workspaceId,
    project,
  );

  const filter = buildLogFilter(options);

  const [entries] = await logging.getEntries({
    resourceNames: [`projects/${project}`],
    filter: filter || undefined,
    pageSize: options.pageSize ?? 50,
    orderBy:
      options.order === "asc"
        ? "timestamp asc"
        : "timestamp desc",
  });

  return {
    project,
    filter,
    count: entries.length,
    entries: entries.map((entry) =>
      normalizeLogEntry(entry.metadata as Record<string, unknown>),
    ),
  };
}

// export async function listLogNames(options: {
//   workspaceId: string;
//   project?: string;
// }): Promise<unknown> {
//   const { config } = await requireConnector(options.workspaceId, "gcp");

//   // Determine the project ID to use
//   const project = projectFromConfig(config, options.project);

//   // Get a Logging client using the OAuth tokens from the connector
//   const loggingClient = await getLoggingClient(options.workspaceId, project);

//   // List the log names in the project
//   const [logNames] = await loggingClient.getLogs()
  
//   return { project, logNames };
// }

export async function listMetricDescriptors(options: {
  workspaceId: string;
  project?: string;
  filter?: string;
  pageSize?: number;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");

  const project = projectFromConfig(config, options.project);

  const client = await getMonitoringClient(options.workspaceId);

  const [descriptors] =
    await client.listMetricDescriptors({
      name: `projects/${project}`,
      filter: options.filter,
      pageSize: options.pageSize ?? 100,
    });

  return {
    project,
    count: descriptors.length,
    metrics: descriptors.map((d) =>
      normalizeMetricDescriptor(
        d as unknown as Record<string, unknown>,
      ),
    ),
  };
}

export async function queryMetrics(options: {
  workspaceId: string;
  project?: string;

  metricType: string;

  resourceType?: string;

  minutes?: number;

  pageSize?: number;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");

  const project = projectFromConfig(config, options.project);

  const client = await getMonitoringClient(
    options.workspaceId,
  );

  const now = {
    seconds: Math.floor(Date.now() / 1000),
  };

  const start = {
    seconds:
      Math.floor(Date.now() / 1000) -
      (options.minutes ?? 60) * 60,
  };

  let filter = `metric.type="${options.metricType}"`;

  if (options.resourceType) {
    filter += ` AND resource.type="${options.resourceType}"`;
  }

  const [series] = await client.listTimeSeries({
    name: `projects/${project}`,

    filter,

    interval: {
      startTime: start,
      endTime: now,
    },

    view: "FULL",

    pageSize: options.pageSize ?? 100,
  });

  return {
    project,
    filter,
    count: series.length,
    timeSeries: series,
  };
}

export async function testGcpConnection(workspaceId: string): Promise<void> {
  const { config } = await requireConnector(workspaceId, "gcp");
  const project = projectFromConfig(config);
  const client = await getInstancesClient(workspaceId);

  for await (const _entry of client.aggregatedListAsync({ project, maxResults: 1 })) {
    return;
  }
}
