import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const TOKEN_KEY = "km_token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthWorkspace {
  id: string;
  slug: string;
  name: string;
  cogneeDataset: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
}

function loadToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  token: loadToken(),
  user: null,
  workspace: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        token: string;
        user: AuthUser;
        workspace: AuthWorkspace;
      }>,
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
      sessionStorage.setItem(TOKEN_KEY, action.payload.token);
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      sessionStorage.setItem(TOKEN_KEY, action.payload);
    },
    setSession(
      state,
      action: PayloadAction<{ user: AuthUser; workspace: AuthWorkspace }>,
    ) {
      state.user = action.payload.user;
      state.workspace = action.payload.workspace;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.workspace = null;
      sessionStorage.removeItem(TOKEN_KEY);
    },
  },
});

export const { setCredentials, setToken, setSession, logout } = authSlice.actions;
export default authSlice.reducer;
