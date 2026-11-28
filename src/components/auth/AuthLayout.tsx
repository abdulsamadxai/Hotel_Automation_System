import type { ReactNode } from "react";
import { Hotel } from "lucide-react";

/**
 * Shared shell for the three sign-in pages (Login, Signup, AdminLogin):
 * centred card on the app background, logo, title, subtitle, card body
 * and a small footer line. One place to change the auth look instead of
 * three copies that drift apart.
 */
export function AuthLayout({
  title,
  subtitle,
  footer,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  footer: string;
  /** Logo icon; defaults to the Hotel mark (AdminLogin uses ShieldCheck). */
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            {icon ?? <Hotel className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>

        <div className="glass-card p-8 border border-border mx-auto">
          {children}
        </div>

        <p className="text-center text-xs text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
