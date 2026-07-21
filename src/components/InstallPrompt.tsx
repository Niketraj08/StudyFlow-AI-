import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sfai-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setEvt(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  };

  if (!evt && !iosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/95 p-3 shadow-lg backdrop-blur-xl animate-in slide-in-from-bottom-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary">
        <Download className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install StudyFlow AI</p>
        <p className="text-xs text-muted-foreground">
          {evt ? "Add to your home screen for the best experience." : "Tap Share → Add to Home Screen."}
        </p>
      </div>
      {evt && (
        <button
          onClick={install}
          className="rounded-xl gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
