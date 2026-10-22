import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/plans";

export type ProductEventName =
  | "landing_page_view"
  | "try_free_click"
  | "mini_test_start"
  | "mini_test_complete"
  | "create_account_click"
  | "registration_complete"
  | "login_complete"
  | "practice_start"
  | "simulation_start"
  | "offline_pack_download"
  | "plan_conversion_intent"
  | "plan_conversion";

export function trackProductEvent(eventName: ProductEventName, plan: PlanTier | null = null) {
  if (typeof window === "undefined") return;

  void (async () => {
    const { error } = await supabase.from("product_events").insert({
      event_name: eventName,
      source_path: window.location.pathname,
      plan,
    });
    if (error) console.error(`[analytics] Não foi possível registar "${eventName}":`, error);
  })().catch((error: unknown) => {
    console.error(`[analytics] Não foi possível registar "${eventName}":`, error);
  });
}
