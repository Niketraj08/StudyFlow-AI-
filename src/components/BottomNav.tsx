import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, MessageSquareText, Layers, User } from "lucide-react";

type NavItem = { to: "/home" | "/planner" | "/chat" | "/flashcards" | "/profile"; label: string; icon: typeof Home; primary?: boolean };
const items: NavItem[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/planner", label: "Planner", icon: Calendar },
  { to: "/chat", label: "AI Tutor", icon: MessageSquareText, primary: true },
  { to: "/flashcards", label: "Cards", icon: Layers },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-4 pb-4">
      <div className="glass-card flex items-center justify-around rounded-full px-2 py-2">
        {items.map(({ to, label, icon: Icon, primary }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          if (primary) {
            return (
              <Link
                key={to} to={to} aria-label={label}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-[var(--shadow-glow)] transition active:scale-95"
              >
                <Icon className="h-6 w-6 text-white" strokeWidth={2.3} />
              </Link>
            );
          }
          return (
            <Link
              key={to} to={to} aria-label={label}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
