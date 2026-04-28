import { createServerClient } from "../../lib/supabase/server";

/**
 * GET /api/supabase-health — verifies env vars and that the Supabase client can talk to your project.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      return res.status(200).json({
        ok: false,
        message: error.message,
      });
    }
    return res.status(200).json({
      ok: true,
      message: "Supabase client is configured and reachable.",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e?.message ?? "Unknown error",
    });
  }
}
