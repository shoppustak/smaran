import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Users,
  CalendarClock,
  ShieldAlert,
  Wallet,
  UserPlus,
  Share2,
  Settings
} from "lucide-react";
import { useSmaranStore } from "@/hooks/use-smaran";

const navItems = [
  { href: "/", label: "Remember", icon: BookOpen },
  { href: "/roster", label: "Yajmans", icon: Users },
  { href: "/protect", label: "Protect Week", icon: CalendarClock },
  { href: "/recover", label: "Recover", icon: ShieldAlert },
  { href: "/collect", label: "Collect", icon: Wallet },
];

export function Sidebar() {
  const [location] = useLocation();
  const { purohit } = useSmaranStore();

  return (
    <div className="flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-[100dvh] paper-texture">
      <div className="p-6 relative z-10 flex items-center gap-3">
        <div
          className="h-20 w-20 shrink-0 bg-gradient-to-br from-primary to-purple-400"
          // eslint-disable-next-line no-restricted-syntax
          style={{
            maskImage: "url(/mark-180.png)",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskImage: "url(/mark-180.png)",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
          }}
          aria-hidden="true"
        />
        <div>
          <h1 className="font-serif text-3xl text-primary tracking-tight mb-1">स्मरण</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Smaran</p>
        </div>
      </div>

      <div className="px-4 pb-4 border-b border-sidebar-border relative z-10">
        <div className="flex flex-col">
          <span className="font-serif font-medium text-lg">{purohit.name}</span>
          <span className="text-xs text-muted-foreground">{purohit.city} Practice</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 relative z-10">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-6 mt-6 border-t border-sidebar-border space-y-1">
          <Link
            href="/add"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              location === "/add" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Add Entry
          </Link>
          <Link
            href="/referral"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              location === "/referral" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Share2 className="h-4 w-4" />
            Invite Purohit
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              location === "/settings" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </nav>
      
      <div className="p-4 relative z-10 border-t border-sidebar-border text-xs text-muted-foreground text-center">
        Securing your legacy.
      </div>
    </div>
  );
}

export function Topbar({ title }: { title?: string }) {
  return (
    <div className="h-16 border-b border-border bg-background flex items-center px-6 sticky top-0 z-20">
      <h2 className="font-serif text-xl font-medium">{title}</h2>
    </div>
  );
}

export function Layout({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background relative overflow-hidden">
      {/* Ambient Background Gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[150px]" />
        <div className="absolute -bottom-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[120px]" />
      </div>
      
      <div className="relative z-10 flex min-h-[100dvh] w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto">
          <Topbar title={title} />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
