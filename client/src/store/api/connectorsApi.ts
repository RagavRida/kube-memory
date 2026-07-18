import { baseApi } from "./baseApi";

export type ConnectorType =
  | "kubernetes"
  | "github"
  | "slack"
  | "pagerduty"
  | "prometheus"
  | "argocd"
  | "gcp"
  | "linear"
  | "notion";

export interface ConnectorSummary {
  type: ConnectorType;
  enabled: boolean;
  config: Record<string, unknown>;
  healthStatus: "healthy" | "degraded" | "error";
  configured: boolean;
  updatedAt?: string;
}

export const connectorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listConnectors: builder.query<{ connectors: Record<ConnectorType, ConnectorSummary> }, void>({
      query: () => "/connectors",
      providesTags: ["Connectors"],
    }),
    upsertConnector: builder.mutation<
      ConnectorSummary,
      { type: ConnectorType; enabled: boolean; config: Record<string, unknown>; secret?: string }
    >({
      query: ({ type, ...body }) => ({
        url: `/connectors/${type}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Connectors"],
    }),
    deleteConnector: builder.mutation<{ status: string }, ConnectorType>({
      query: (type) => ({ url: `/connectors/${type}`, method: "DELETE" }),
      invalidatesTags: ["Connectors"],
    }),
    testConnector: builder.mutation<{ ok: boolean; message: string }, ConnectorType>({
      query: (type) => ({ url: `/connectors/${type}/test`, method: "POST" }),
    }),
    startGcpOAuth: builder.mutation<{ url: string }, { projectId: string }>({
      query: ({ projectId }) => ({
        url: `/connectors/gcp/oauth/start?projectId=${encodeURIComponent(projectId)}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useListConnectorsQuery,
  useUpsertConnectorMutation,
  useDeleteConnectorMutation,
  useTestConnectorMutation,
  useStartGcpOAuthMutation,
} = connectorsApi;
