import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="relative mx-auto min-h-dvh max-w-xl pb-28">
      <Outlet />
      <footer className="mt-8 px-5 pb-4 text-center text-xs text-muted-foreground">
        Developed by <span className="font-semibold text-foreground">Niket Raj</span>
        <span className="mx-1">·</span>
        Powered by{" "}
        <a
          href="https://astracognixsolutions.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline-offset-2 hover:underline"
        >
          AstraCognix Solutions
        </a>
      </footer>
      <BottomNav />
    </div>
  );
}
