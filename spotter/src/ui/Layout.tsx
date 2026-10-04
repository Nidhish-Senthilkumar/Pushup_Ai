import type { ReactNode } from "react";
import { useInstall } from "../lib/install";
import { href } from "../lib/router";
import { Icon, type IconName } from "./icons";
import { Logo } from "./Logo";

const NAV: { to: string; label: string; icon: IconName; match: RegExp }[] = [
  { to: "/", label: "Today", icon: "home", match: /^\/$/ },
  { to: "/train", label: "Train", icon: "dumbbell", match: /^\/(train|exercise)/ },
  { to: "/plans", label: "Workouts", icon: "list", match: /^\/plans/ },
  { to: "/progress", label: "Progress", icon: "chart", match: /^\/(progress|summary)/ },
  { to: "/more", label: "More", icon: "more", match: /^\/(more|about|lab|settings|analyze|assess)/ },
];

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="app-glow min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-volt focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface/60 p-5 backdrop-blur lg:flex">
        <a href={href("/")} className="mb-8 block" aria-label="Spotter home">
          <Logo />
        </a>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.filter((n) => n.to !== "/more").map((n) => {
            const active = n.match.test(path);
            const I = Icon[n.icon];
            return (
              <a key={n.to} href={href(n.to)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${active ? "bg-raised text-volt" : "text-ink-2 hover:bg-raised/60 hover:text-ink"}`}>
                <I size={20} /> {n.label}
              </a>
            );
          })}
          <div className="my-3 h-px bg-line" />
          {[
            { to: "/assess", label: "Fitness test", icon: "target" as IconName },
            { to: "/analyze", label: "Analyze a video", icon: "eye" as IconName },
            { to: "/about", label: "How it works", icon: "brain" as IconName },
            { to: "/lab", label: "Data Lab", icon: "flask" as IconName },
            { to: "/settings", label: "Settings", icon: "settings" as IconName },
          ].map((n) => {
            const active = path.startsWith(n.to);
            const I = Icon[n.icon];
            return (
              <a key={n.to} href={href(n.to)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${active ? "bg-raised text-volt" : "text-muted hover:text-ink"}`}>
                <I size={18} /> {n.label}
              </a>
            );
          })}
        </nav>
        <InstallButton />
        <a href={href("/arcade")} className="mt-3 flex items-center gap-3 rounded-2xl border border-volt/40 bg-volt/10 p-3 text-sm font-bold text-volt hover:bg-volt/15">
          <Icon.joystick /> Arcade mode
          <span className="ml-auto text-xs font-medium text-muted">booth</span>
        </a>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-page/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <a href={href("/")} className="py-3" aria-label="Spotter home">
          <Logo size={28} />
        </a>
        <a href={href("/arcade")} className="chip border-volt/40 text-volt" aria-label="Arcade mode">
          <Icon.joystick size={16} /> Arcade
        </a>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10 lg:pb-16">
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map((n) => {
          const active = n.match.test(path);
          const I = Icon[n.icon];
          return (
            <a key={n.to} href={href(n.to)} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active ? "text-volt" : "text-muted"}`}>
              <I size={22} />
              {n.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function InstallButton() {
  const install = useInstall();
  if (!install.canInstall || install.installed) return <div className="mt-auto" />;
  return (
    <button onClick={() => void install.install()} className="mt-auto flex items-center gap-3 rounded-2xl border border-line-2 p-3 text-sm font-semibold text-ink-2 hover:text-ink">
      <Icon.download size={18} /> Install app
    </button>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <div className="mb-1 text-xs font-bold tracking-[0.14em] text-volt uppercase">{eyebrow}</div>}
      <h1 className="display text-5xl sm:text-6xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-ink-2">{children}</div>}
    </header>
  );
}
