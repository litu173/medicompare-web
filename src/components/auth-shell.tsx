import { googleEnabled } from "@/lib/google";
import { GoogleButton } from "./auth-forms";

const ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in is not configured yet. Please use email and password.",
  google_failed: "Google sign-in failed. Please try again.",
  google_unverified: "Your Google email is not verified.",
};

export function AuthShell({
  title,
  subtitle,
  next,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  next: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm space-y-5 pt-8">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>
      {error && ERRORS[error] && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{ERRORS[error]}</p>
      )}
      {googleEnabled() && (
        <>
          <GoogleButton next={next} />
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      )}
      {children}
    </div>
  );
}
