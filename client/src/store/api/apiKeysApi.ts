import { baseApi } from "./baseApi";

export interface ApiKeySummary {
  id: string;
  prefix: string;
  role: "reader" | "admin";
  label: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  prefix: string;
  role: "reader" | "admin";
  label: string;
}

export const apiKeysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listApiKeys: builder.query<{ keys: ApiKeySummary[] }, void>({
      query: () => "/api-keys",
      providesTags: ["ApiKeys"],
    }),
    createApiKey: builder.mutation<
      CreateApiKeyResponse,
      { label: string; role: "reader" | "admin" }
    >({
      query: (body) => ({ url: "/api-keys", method: "POST", body }),
      invalidatesTags: ["ApiKeys"],
    }),
    revokeApiKey: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `/api-keys/${id}`, method: "DELETE" }),
      invalidatesTags: ["ApiKeys"],
    }),
  }),
});

export const {
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
} = apiKeysApi;
