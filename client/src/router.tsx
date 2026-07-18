import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { ConnectorsPage } from "@/pages/ConnectorsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocsPage } from "@/pages/DocsPage";
import { GitHubCallbackPage } from "@/pages/GitHubCallbackPage";
import { LandingPage } from "@/pages/LandingPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="integrations" element={<ConnectorsPage />} />
          <Route path="connectors" element={<Navigate to="/dashboard/integrations" replace />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
