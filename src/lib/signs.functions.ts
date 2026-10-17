import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
export const fetchPublicSigns = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Catálogo indisponível.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("symbols").select("id,name,description,category_id,image_url").eq("is_active", true).order("name");
  if (error) throw new Error("Não foi possível carregar os sinais.");
  return (data ?? []) as { id: string; name: string; description: string; category_id: string | null; image_url: string | null }[];
});