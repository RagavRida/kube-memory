import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { useLogoutMutation } from "@/store/api/authApi";
import { AppLogo } from "@/components/AppLogo";
import { SetupJourney } from "@/components/dashboard/SetupJourney";
import { ThemeToggle } from "@/components/ThemeToggle";
import "@/styles/dashboard.css";

const navItems = [
  { title: "Overview", href: "/dashboard", exact: true },
  { title: "Integrations", href: "/dashboard/integrations" },
  { title: "API Keys", href: "/dashboard/api-keys" },
  { title: "Docs", href: "/docs" },
];

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || pathname === `${href}/`;
  return pathname.startsWith(href);
}

export function DashboardLayout() {
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const workspace = useSelector((state: RootState) => state.auth.workspace);
  const [logout] = useLogoutMutation();

  return (
    <div className="dashboard-shell flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-6">
            <AppLogo className="shrink-0" />
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Dashboard">
              {navItems.map((item) => {
                const active = isNavActive(location.pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-[var(--color-accent-signal-muted)] font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
              {workspace?.name}
            </span>
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {user?.name?.slice(0, 1).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm sm:inline">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => logout()}
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t px-6 py-2 sm:hidden" aria-label="Dashboard mobile">
          {navItems.map((item) => {
            const active = isNavActive(location.pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs",
                  active ? "bg-muted font-medium" : "text-muted-foreground",
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </header>

      <SetupJourney />

      <main className="flex-1 py-6">
        <Outlet />
      </main>
    </div>
  );
}
