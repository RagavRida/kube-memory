import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroMemoryVisual } from "@/components/landing/HeroMemoryVisual";
import { LogoLoop } from "../LogoLoop";
import antigravitylogo from "@/assets/images/antigravity.png"
import claudecodelogo from "@/assets/images/claudecode.png"
import codexlogo from "@/assets/images/codex.png"
import cursorlogo from "@/assets/images/cursor.png"
import vscodelogo from "@/assets/images/vscode.png"
import claudelogo from "@/assets/images/claude.png"

interface HeroSectionProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  isAuthenticated: boolean;
}

const imageLogos = [
  { src: antigravitylogo, alt: "Antigravity", href: "/docs?tab=ide" },
  { src: claudecodelogo, alt: "Claude Code", href: "/docs?tab=llm" },
  { src: codexlogo, alt: "Codex", href: "/docs?tab=codex" },
  { src: cursorlogo, alt: "Cursor", href: "/docs?tab=cursor" },
  { src: vscodelogo, alt: "VS Code", href: "/docs?tab=vscode" },
  { src: claudelogo, alt: "Claude", href: "/docs?tab=claude" },
];

export function HeroSection({ onGetStarted, onSignIn, isAuthenticated }: HeroSectionProps) {
  return (
    <section className="landing-section landing-hero min-h-[calc(100svh-50px)] flex items-center">
      <div className="landing-hero-grid">
        <div className="min-w-0 space-y-6">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--color-accent-signal)]">
            Organizational memory for DevOps agents
          </p>
          <h1 className="text-4xl leading-[1.08] tracking-tight md:text-5xl break-words min-w-0">
            <span className="font-display">Infrastructure</span> history your <span className="font-display">agents</span> can actually <span className="font-display">recall</span>.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            kube-memory persists incidents, fixes, and deploy outcomes as queryable MCP tools — so the next
            OOMKill or CrashLoopBackOff starts with context, not a blank prompt.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={onGetStarted}>
                  Get started free
                </Button>
                <Button size="lg" variant="outline" onClick={onSignIn}>
                  Sign in
                </Button>
              </>
            )}
            <Button asChild size="lg" variant="ghost">
              <Link to="/docs">Documentation</Link>
            </Button>
          </div>
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--color-accent-signal)]">
            Supporting IDE and LLM agents
          </p>
          <LogoLoop
            logos={imageLogos}
            speed={50}
            direction="left"
            logoHeight={40}
            gap={70}
            hoverSpeed={0}
            scaleOnHover={false}
            fadeOut
            ariaLabel="Technology partners"
          />
        </div>
        <HeroMemoryVisual />
      </div>
    </section>
  );
}
