import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRouteAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  component: () => <Outlet />,
});
