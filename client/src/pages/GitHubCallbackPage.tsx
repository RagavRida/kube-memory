import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { setToken } from "@/store/authSlice";
import { useMeQuery } from "@/store/api/authApi";

export function GitHubCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = params.get("token");

  useEffect(() => {
    if (token) {
      dispatch(setToken(token));
    }
  }, [token, dispatch]);

  const { isSuccess, isError } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    if (isSuccess) navigate("/dashboard", { replace: true });
    if (isError) navigate("/", { replace: true });
  }, [isSuccess, isError, navigate]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-5 animate-spin" />
      <p>Completing GitHub sign-in…</p>
    </div>
  );
}
