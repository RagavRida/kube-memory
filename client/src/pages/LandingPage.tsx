import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { BentoFeatureGrid } from "@/components/landing/BentoFeatureGrid";
import { HeroSection } from "@/components/landing/HeroSection";
import type { RootState } from "@/store";
import { AppLogo } from "@/components/AppLogo";
import "@/styles/landing.css";

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = Boolean(token);

  function openRegister() {
    setAuthTab("register");
    setAuthOpen(true);
  }

  function openLogin() {
    setAuthTab("login");
    setAuthOpen(true);
  }

  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <AppLogo />
          <div className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="landing-nav-link">
              Features
            </a>
            <Link to="/docs" className="landing-nav-link">
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={openLogin}>
                  Sign in
                </Button>
                <Button size="sm" onClick={openRegister}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <HeroSection
        onGetStarted={openRegister}
        onSignIn={openLogin}
        isAuthenticated={isAuthenticated}
      />
      <BentoFeatureGrid />
      <footer className="landing-footer">
        kube-memory — memory-native MCP for platform teams
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </div>
  );
}
