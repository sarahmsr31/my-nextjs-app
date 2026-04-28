import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  OFSS_AUTH_COOKIE,
  encodePendingAuth,
  generateEightDigitCode,
} from "@/lib/auth/code-signing";

const COHORT = "OFSS2026";
const COOKIE_MAX_AGE = 60 * 15;

export async function POST(req) {
  try {
    const body = await req.json();
    const { mode, parent_email, registration } = body;

    if (!parent_email || typeof parent_email !== "string") {
      return NextResponse.json({ error: "parent_email is required" }, { status: 400 });
    }

    const email = parent_email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: rows, error: lookupError } = await supabase
      .from("students")
      .select("id, student_name")
      .eq("parent_email", email)
      .limit(1);

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (mode === "new") {
      if (existing) {
        return NextResponse.json(
          {
            error:
              "An account already exists for this parent email. Use Returning Student (Login) to sign in.",
            code: "DUPLICATE_PARENT_EMAIL",
          },
          { status: 409 }
        );
      }

      const r = registration || {};
      const required = ["student_name", "age", "school", "class", "parent_name", "parent_phone"];
      for (const key of required) {
        if (r[key] === undefined || r[key] === null || String(r[key]).trim() === "") {
          return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
        }
      }

      const ageNum = Number(r.age);
      if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
        return NextResponse.json({ error: "Invalid age" }, { status: 400 });
      }
    } else if (mode === "returning") {
      if (!existing) {
        return NextResponse.json(
          {
            error: "No student profile found for this email. Register as a new student first.",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const code = generateEightDigitCode();
    const exp = Date.now() + COOKIE_MAX_AGE * 1000;

    const payload =
      mode === "new"
        ? {
            parent_email: email,
            code,
            exp,
            mode: "new",
            registration: {
              student_name: String(registration.student_name).trim(),
              age: Number(registration.age),
              school: String(registration.school).trim(),
              class: String(registration.class).trim(),
              parent_name: String(registration.parent_name).trim(),
              parent_phone: String(registration.parent_phone).trim(),
              cohort: COHORT,
            },
          }
        : {
            parent_email: email,
            code,
            exp,
            mode: "returning",
          };

    let token;
    try {
      token = encodePendingAuth(payload);
    } catch (e) {
      return NextResponse.json(
        { error: e?.message || "Server configuration error (CODE_SIGNING_SECRET)" },
        { status: 500 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
    }

    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM_EMAIL || "Ad Astra <onboarding@resend.dev>";
    const displayName =
      mode === "new"
        ? payload.registration.student_name
        : existing.student_name || "Student";

    const { error: sendError } = await resend.emails.send({
      from,
      to: [email],
      subject:
        mode === "new"
          ? `OFSS — Your 8-digit access code for ${displayName}`
          : `OFSS — Your 8-digit login code`,
      html: `
        <div style="font-family: system-ui, sans-serif; padding: 24px; background: #141516; color: #e8eaed;">
          <p style="color: #FF6A1A; font-weight: 700; margin: 0 0 12px;">Ad Astra / OFSS</p>
          <p style="margin: 0 0 16px;">Hello${mode === "new" ? ` — registration for <strong>${escapeHtml(displayName)}</strong>` : ""},</p>
          <p style="margin: 0 0 12px;">Your verification code is:</p>
          <div style="background: #1F2021; border: 1px solid #333; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; letter-spacing: 8px; font-weight: 800; color: #FF6A1A;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">This code expires in ${Math.floor(COOKIE_MAX_AGE / 60)} minutes. If you did not request it, you can ignore this email.</p>
        </div>
      `,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message || "Failed to send email" }, { status: 502 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(OFSS_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
