import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import {
  OFSS_AUTH_COOKIE,
  decodePendingAuth,
  codesMatch,
} from "@/lib/auth/code-signing";

export async function POST(req) {
  try {
    const { code } = await req.json();
    if (code === undefined || code === null || String(code).trim() === "") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const normalized = String(code).replace(/\D/g, "").slice(0, 8);
    if (normalized.length !== 8) {
      return NextResponse.json({ error: "Enter the full 8-digit code" }, { status: 400 });
    }

    const cookieStore = cookies();
    const raw = cookieStore.get(OFSS_AUTH_COOKIE)?.value;
    const payload = decodePendingAuth(raw);

    if (!payload) {
      return NextResponse.json(
        { error: "Session expired or invalid. Request a new code." },
        { status: 401 }
      );
    }

    if (Date.now() > payload.exp) {
      const res = NextResponse.json({ error: "Code expired. Request a new one." }, { status: 401 });
      res.cookies.set(OFSS_AUTH_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    }

    if (!codesMatch(payload.code, normalized)) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 403 });
    }

    const supabase = createServerClient();

    if (payload.mode === "returning") {
      const { data: rows, error } = await supabase
        .from("students")
        .select("id")
        .eq("parent_email", payload.parent_email)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row) {
        return NextResponse.json({ error: "Student record not found" }, { status: 404 });
      }

      const res = NextResponse.json({ ok: true, student_id: row.id });
      res.cookies.set(OFSS_AUTH_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    }

    if (payload.mode === "new" && payload.registration) {
      const r = payload.registration;
      const { data: insertedRows, error: insertError } = await supabase
        .from("students")
        .insert({
          student_name: r.student_name,
          age: r.age,
          school: r.school,
          class: r.class,
          parent_name: r.parent_name,
          parent_email: payload.parent_email,
          parent_phone: r.parent_phone,
          cohort: r.cohort,
        })
        .select("id")
        .limit(1);

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { error: "This parent email is already registered. Use Login instead." },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      const inserted = Array.isArray(insertedRows) ? insertedRows[0] : null;
      if (!inserted?.id) {
        return NextResponse.json(
          {
            error:
              "Account may have been created, but the app could not read the new row. In Supabase, allow SELECT on students for the anon role after INSERT (RLS policy), or use the service role for this API route.",
          },
          { status: 500 }
        );
      }

      const res = NextResponse.json({ ok: true, student_id: inserted.id });
      res.cookies.set(OFSS_AUTH_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    }

    return NextResponse.json({ error: "Invalid session payload" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
