import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useMeQuery } from "@/store/api/authApi";
import { DotmSquare14 } from "../ui/dotm-square-14";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSelector((state: RootState) => state.auth.token);
  const location = useLocation();
  const { isLoading, isError } = useMeQuery(undefined, { skip: !token });

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <DotmSquare14 />
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/" replace />;
  }

  return children;
}
