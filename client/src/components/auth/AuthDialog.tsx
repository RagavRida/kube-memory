import { useState } from "react";
import githublogo from "@/assets/images/GitHub.png"
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  useLoginMutation,
  useRegisterMutation,
  getGitHubAuthUrl,
} from "@/store/api/authApi";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

export function AuthDialog({ open, onOpenChange, defaultTab = "login" }: AuthDialogProps) {
  const [tab, setTab] = useState(defaultTab);
  const [login, { isLoading: loginLoading, error: loginError }] = useLoginMutation();
  const [register, { isLoading: registerLoading, error: registerError }] = useRegisterMutation();

  function handleOpenChange(next: boolean) {
    if (next) setTab(defaultTab);
    onOpenChange(next);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await login({
      email: String(form.get("email")),
      password: String(form.get("password")),
    }).unwrap();
    onOpenChange(false);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await register({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    }).unwrap();
    onOpenChange(false);
  }

  const error = loginError ?? registerError;
  const isRegister = tab === "register";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="auth-dialog gap-0 overflow-hidden p-0 sm:max-w-[420px]">
        <div className="auth-dialog-header px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-display text-2xl font-normal tracking-tight">
              {isRegister ? "Create your workspace" : "Welcome back"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {isRegister
                ? "Connect integrations, create API keys, and wire up your IDE in minutes."
                : "Sign in to manage integrations and MCP keys."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="mb-5 h-9 w-fit">
              <TabsTrigger value="login" className="px-4">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className="px-4">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                    />
                  </Field>
                  <PasswordField
                    id="login-password"
                    name="password"
                    label="Password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </FieldGroup>
                {error && tab === "login" && (
                  <Alert variant="destructive">
                    <AlertDescription>Invalid email or password.</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={loginLoading}>
                  {loginLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="register-name">Full name</FieldLabel>
                    <Input
                      id="register-name"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="Alex Chen"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="register-email">Work email</FieldLabel>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                    />
                  </Field>
                  <PasswordField
                    id="register-password"
                    name="password"
                    label="Password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                </FieldGroup>
                {error && tab === "register" && (
                  <Alert variant="destructive">
                    <AlertDescription>Could not create account. Try a different email.</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={registerLoading}>
                  {registerLoading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <p className="relative mx-auto w-fit bg-background px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
              or
            </p>
          </div>

          <Button variant="outline" className="w-full gap-2" size="lg" asChild>
            <a href={getGitHubAuthUrl()}>
              <img src={githublogo} alt="GitHub" className="w-4 h-4 dark:invert" />
              Continue with GitHub
            </a>
          </Button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to use kube-memory for workspace memory and MCP access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
