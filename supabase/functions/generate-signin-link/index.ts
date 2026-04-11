// =====================================================================
// Supabase Edge Function: generate-signin-link
// =====================================================================
// Generates a one-time magic-link sign-in URL for a driver, without
// sending an email. Used by admin to invite drivers who have no email
// (admin copies the link and shares it via WhatsApp).
//
// For drivers with no real email on file, a synthetic email is used:
//   driver-<short-uuid>@noreply.example.com
// example.com is reserved by RFC 2606 for documentation/examples and is
// guaranteed never to receive real mail.
//
// Auth: caller must be an admin (verified via the public.profiles table).
// Body: { driver_id: string, redirect_to: string }
// Returns: { link: string, email: string, is_synthetic_email: boolean }
//
// Deploy:
//   Option A — Supabase Dashboard:
//     1. Open your project → Edge Functions → generate-signin-link → Code
//     2. Replace all code with this file's contents
//     3. Click Deploy
//
//   Option B — Supabase CLI (if installed):
//     supabase functions deploy generate-signin-link
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status: number) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// Decode a JWT payload without verification (for logging only).
function decodeJwt(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
        return JSON.parse(json);
    } catch (_e) {
        return null;
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

        // ---------- 1. Verify caller is an admin ----------
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return jsonError("Missing authorization header", 401);

        // Extract the raw JWT
        const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!jwt) return jsonError("Empty authorization token", 401);

        // Inspect the JWT (debug) — what role is the caller using?
        const decoded = decodeJwt(jwt);
        console.log("incoming JWT:", {
            role: decoded?.role,
            has_sub: Boolean(decoded?.sub),
            sub_prefix: typeof decoded?.sub === "string"
                ? (decoded.sub as string).slice(0, 8)
                : null,
            aud: decoded?.aud,
        });

        if (!decoded?.sub) {
            return jsonError(
                "JWT has no sub claim — the front-end is sending the anon key instead of the user session token. Make sure you are signed in as admin and that the front-end passes session.access_token in the Authorization header.",
                401,
            );
        }

        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${jwt}` } },
        });

        // Pass the JWT explicitly to bypass session storage lookup
        const { data: userData, error: userErr } = await userClient.auth.getUser(
            jwt,
        );
        if (userErr || !userData?.user) {
            console.error("getUser failed:", userErr);
            return jsonError(
                "Not authenticated: " + (userErr?.message || "no user"),
                401,
            );
        }

        // Use service-role to read profile (avoids RLS edge cases on the auth header path)
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: callerProfile, error: profileErr } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();

        if (profileErr || callerProfile?.role !== "admin") {
            console.error("admin check failed:", profileErr, callerProfile);
            return jsonError("Admin only", 403);
        }

        // ---------- 2. Parse + validate input ----------
        const body = await req.json();
        const driver_id: string | undefined = body?.driver_id;
        const redirect_to: string | undefined = body?.redirect_to;
        if (!driver_id) return jsonError("driver_id required", 400);
        if (!redirect_to) return jsonError("redirect_to required", 400);

        // ---------- 3. (admin client already created above) ----------

        // ---------- 4. Look up the driver ----------
        const { data: driver, error: dErr } = await adminClient
            .from("drivers")
            .select("id, full_name, email")
            .eq("id", driver_id)
            .single();

        if (dErr || !driver) {
            console.error("driver lookup failed:", dErr);
            return jsonError("Driver not found", 404);
        }

        // ---------- 5. Determine the email to use ----------
        const driverIdShort = driver.id.replace(/-/g, "").slice(0, 12);
        const email = driver.email ||
            `driver-${driverIdShort}@noreply.example.com`;
        const isSynthetic = !driver.email;

        console.log(
            "generate-signin-link: using email",
            email,
            "synthetic:",
            isSynthetic,
        );

        // ---------- 6. Ensure the auth user exists ----------
        const { error: createErr } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: driver.full_name },
        });
        if (createErr) {
            const msg = createErr.message || "";
            const alreadyExists = /already (registered|exists|been)/i.test(msg) ||
                /duplicate/i.test(msg) ||
                createErr.status === 422;
            if (!alreadyExists) {
                console.error("createUser failed:", createErr);
                return jsonError("createUser failed: " + msg, 500);
            }
            console.log("createUser: user already exists, continuing");
        }

        // ---------- 7. Generate the magic link ----------
        const { data: linkData, error: linkErr } = await adminClient.auth.admin
            .generateLink({
                type: "magiclink",
                email,
                options: {
                    redirectTo: redirect_to,
                },
            });

        if (linkErr) {
            console.error("generateLink failed:", linkErr);
            return jsonError("generateLink failed: " + linkErr.message, 500);
        }
        if (!linkData?.properties?.action_link) {
            console.error("generateLink returned no link:", linkData);
            return jsonError("No link returned by Supabase", 500);
        }

        // ---------- 8. Link the auth user to the driver row ----------
        const userId = linkData?.user?.id;
        if (userId) {
            await adminClient
                .from("drivers")
                .update({ profile_id: userId })
                .eq("id", driver_id);
        }

        // ---------- 9. Return ----------
        return new Response(
            JSON.stringify({
                link: linkData.properties.action_link,
                email,
                is_synthetic_email: isSynthetic,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    } catch (e) {
        console.error("Unhandled error in generate-signin-link:", e);
        return jsonError(
            (e && (e as Error).message) || String(e),
            500,
        );
    }
});
