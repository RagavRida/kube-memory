import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/images/logo.png";

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        "font-display flex items-center gap-1 text-lg font-medium tracking-tight hover:opacity-80",
        className,
      )}
    >
      <img src={logo} alt="kube-memory" className="h-6 w-6 dark:invert" />
      <span className="md:block hidden">kube-memory</span>
    </Link>
  );
}
