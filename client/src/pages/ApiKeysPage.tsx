import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { McpClientGuide } from "@/components/dashboard/McpClientGuide";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import {
  useCreateApiKeyMutation,
  useListApiKeysQuery,
  useRevokeApiKeyMutation,
} from "@/store/api/apiKeysApi";

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ApiKeysPage() {
  const { hasIntegration, hasApiKey, isLoading: setupLoading } = useSetupProgress();
  const { data, isLoading: keysLoading } = useListApiKeysQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<"reader" | "admin">("reader");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [createKey, { isLoading: creating }] = useCreateApiKeyMutation();
  const [revokeKey] = useRevokeApiKeyMutation();

  const keys = data?.keys ?? [];
  const isLoading = setupLoading || keysLoading;
  const showIdeGuide = hasApiKey || createdKey;

  const latestKeyForGuide = useMemo(() => createdKey ?? undefined, [createdKey]);

  function tryOpenCreate() {
    if (!hasIntegration) {
      toast.error("Connect at least one integration first");
      return;
    }
    setCreateOpen(true);
  }

  async function handleCreate() {
    const result = await createKey({ label, role }).unwrap();
    setCreatedKey(result.key);
    setCreateOpen(false);
    setLabel("");
    toast.success("API key created — set up your IDE below");
  }

  async function handleRevoke() {
    if (!revokeId) return;
    await revokeKey(revokeId).unwrap();
    setRevokeId(null);
    toast.success("API key revoked");
  }

  return (
    <div className="dashboard-main space-y-8">
      <PageHeader
        title="API Keys"
        description="Step 2 of setup. Create a key after connecting an integration, then configure your IDE."
        action={
          <Button onClick={tryOpenCreate} disabled={!hasIntegration}>
            Create key
          </Button>
        }
      />

      {!hasIntegration && !isLoading && (
        <Alert variant="destructive">
          <AlertTitle>Connect an integration first</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>API keys are locked until at least one integration is configured and saved.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/integrations">
                <HugeiconsIcon icon={Plug01Icon} strokeWidth={2} className="mr-1.5 size-3.5" />
                Go to Integrations
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {createdKey && (
        <Alert className="border-[color-mix(in_oklch,var(--color-accent-signal)_35%,var(--border))] bg-[var(--color-accent-signal-muted)]">
          <AlertTitle className="font-heading">Save this key now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the only time the full key is shown. Copy it before continuing to IDE setup.
            </p>
            <code className="code-block block break-all">{createdKey}</code>
            <CopyButton value={createdKey} label="Copy key" toastMessage="API key copied" />
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : keys.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Key01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              {hasIntegration
                ? "Create a key to authenticate Cursor, VS Code, or Claude Desktop."
                : "Complete step 1 — connect an integration — before creating keys."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {hasIntegration ? (
              <Button onClick={tryOpenCreate}>Create your first key</Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/dashboard/integrations">Connect integration</Link>
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Label</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.label}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {key.prefix}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={key.role === "admin" ? "active" : "inactive"} label={key.role} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(key.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setRevokeId(key.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showIdeGuide && (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <McpClientGuide apiKey={latestKeyForGuide} />
        </section>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Choose a label you will recognize later. The raw key is shown once.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="key-label">Label</FieldLabel>
              <Input
                id="key-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Cursor laptop"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as "reader" | "admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader — recall and read-only K8s</SelectItem>
                  <SelectItem value="admin">Admin — full memory and connector access</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter className="gap-3 sm:gap-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !label.trim()}>
              {creating ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(revokeId)} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              MCP clients using this key will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRevoke}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
