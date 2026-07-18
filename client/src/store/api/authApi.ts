import { baseApi } from "./baseApi";
import { setCredentials, setSession, logout } from "../authSlice";
import { getApiBaseUrl } from "@/lib/api";

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
  workspace: { id: string; slug: string; name: string; cogneeDataset: string };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<
      AuthResponse,
      { email: string; password: string; name: string }
    >({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    me: builder.query<
      { user: AuthResponse["user"]; workspace: AuthResponse["workspace"] },
      void
    >({
      query: () => "/auth/me",
      providesTags: ["Auth"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSession(data));
      },
    }),
    logout: builder.mutation<{ status: string }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(logout());
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useMeQuery,
  useLogoutMutation,
} = authApi;

export function getGitHubAuthUrl(): string {
  return `${getApiBaseUrl()}/auth/github`;
}
