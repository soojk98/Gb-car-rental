// =====================================================================
// Supabase Edge Function: generate-signin-link
// =====================================================================
// Sets up a driver's auth account and returns BOTH:
//   1. A one-time magic-link sign-in URL (auto-login when clicked)
//   2. Manual credentials (phone + NRIC password) the driver can type
//      into login.html if the magic link doesn't work for them
//
// The auth user uses a phone-based synthetic email:
//   <whatsapp-digits>@phone.example.com
// (example.com is RFC 2606 reserved and never receives real mail.)
// The password is set to the driver's NRIC (ic_number).
//
// If an auth user already exists for this driver (driver.profile_id is
// set), we update its email + password in place. Otherwise we create a
// new one. Either way the driver row's profile_id ends up linked.
//
// Auth: caller must be an admin (verified via the public.profiles table).
// Body: { driver_id: string, redirect_to: string, user_jwt: string }
//   - user_jwt is the admin's session.access_token. We pass it in the body
//     instead of the Authorization header because Supabase Edge Functions'
//     gateway sometimes rejects user JWTs at the verify_jwt layer; the
//     Authorization header still carries the anon key for gateway pass-through.
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

// Convert a Malaysian-style phone number to a stable synthetic email.
// "012-3456789" -> "60123456789@phone.example.com"
function phoneToSyntheticEmail(phone: string): string {
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "60" + digits.slice(1);
    return `${digits}@phone.example.com`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

        // ---------- 1. Parse body (contains the admin's user JWT) ----------
        const body = await req.json();
        const driver_id: string | undefined = body?.driver_id;
        const redirect_to: string | undefined = body?.redirect_to;
        const userJwt: string | undefined = body?.user_jwt;

        if (!driver_id) return jsonError("driver_id required", 400);
        if (!redirect_to) return jsonError("redirect_to required", 400);
        if (!userJwt) return jsonError("user_jwt required in body", 401);

        // ---------- 2. Verify caller is an admin ----------
        const decoded = decodeJwt(userJwt);
        console.log("user JWT:", {
            role: decoded?.role,
            has_sub: Boolean(decoded?.sub),
            sub_prefix: typeof decoded?.sub === "string"
                ? (decoded.sub as string).slice(0, 8)
                : null,
        });

        if (!decoded?.sub) {
            return jsonError(
                "user_jwt has no sub claim — caller is not signed in",
                401,
            );
        }

        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Validate the JWT against the auth API and resolve the user
        const { data: userData, error: userErr } = await adminClient.auth.getUser(
            userJwt,
        );
        if (userErr || !userData?.user) {
            console.error("getUser failed:", userErr);
            return jsonError(
                "Not authenticated: " + (userErr?.message || "no user"),
                401,
            );
        }

        const { data: callerProfile, error: profileErr } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();

        if (profileErr || callerProfile?.role !== "admin") {
            console.error("admin check failed:", profileErr, callerProfile);
            return jsonError("Admin only", 403);
        }

        // ---------- 3. Look up the driver ----------
        const { data: driver, error: dErr } = await adminClient
            .from("drivers")
            .select("id, full_name, whatsapp, ic_number, profile_id")
            .eq("id", driver_id)
            .single();

        if (dErr || !driver) {
            console.error("driver lookup failed:", dErr);
            return jsonError("Driver not found", 404);
        }

        // ---------- 4. Validate phone + NRIC are present ----------
        if (!driver.whatsapp) {
            return jsonError(
                "Driver has no phone number. Please add a WhatsApp number first (Edit driver).",
                400,
            );
        }
        if (!driver.ic_number) {
            return jsonError(
                "Driver has no NRIC. NRIC is used as the login password — please add it first (Edit driver).",
                400,
            );
        }

        // ---------- 5. Determine login credentials ----------
        const loginEmail = phoneToSyntheticEmail(driver.whatsapp);
        const loginPassword = driver.ic_number;

        console.log(
            "generate-signin-link: driver",
            driver.id,
            "loginEmail",
            loginEmail,
        );

        // ---------- 6. Create or update the auth user ----------
        let userId: string | undefined;

        if (driver.profile_id) {
            // Existing auth user — update email + password in place
            const { error: updErr } = await adminClient.auth.admin.updateUserById(
                driver.profile_id,
                {
                    email: loginEmail,
                    password: loginPassword,
                    email_confirm: true,
                    user_metadata: { full_name: driver.full_name },
                },
            );
            if (updErr) {
                console.error("updateUserById failed:", updErr);
                return jsonError(
                    "updateUserById failed: " + updErr.message,
                    500,
                );
            }
            userId = driver.profile_id;
            console.log("updated existing auth user", userId);
        } else {
            // New auth user
            const { data: createData, error: createErr } = await adminClient.auth
                .admin.createUser({
                    email: loginEmail,
                    password: loginPassword,
                    email_confirm: true,
                    user_metadata: { full_name: driver.full_name },
                });

            if (createData?.user) {
                userId = createData.user.id;
                console.log("created new auth user", userId);
            } else if (createErr) {
                const msg = createErr.message || "";
                const exists = /already (registered|exists|been)/i.test(msg) ||
                    createErr.status === 422 ||
                    /duplicate/i.test(msg);
                if (!exists) {
                    console.error("createUser failed:", createErr);
                    return jsonError("createUser failed: " + msg, 500);
                }

                // Synthetic email collision — another driver shares this phone.
                // Find that user and reset password to this driver's NRIC. The
                // driver row will then be linked to the same auth user.
                let existing: { id: string } | undefined;
                let page = 1;
                while (true) {
                    const { data: listData, error: listErr } = await adminClient
                        .auth.admin.listUsers({ page, perPage: 1000 });
                    if (listErr) {
                        return jsonError(
                            "listUsers failed: " + listErr.message,
                            500,
                        );
                    }
                    existing = listData.users.find((u: { email?: string }) =>
                        u.email === loginEmail
                    );
                    if (existing) break;
                    if (!listData.users || listData.users.length < 1000) break;
                    page++;
                    if (page > 50) break;
                }
                if (!existing) {
                    return jsonError(
                        "createUser said exists but user not found via listUsers",
                        500,
                    );
                }
                const { error: updErr } = await adminClient.auth.admin
                    .updateUserById(existing.id, {
                        password: loginPassword,
                        email_confirm: true,
                        user_metadata: { full_name: driver.full_name },
                    });
                if (updErr) {
                    return jsonError(
                        "updateUserById (after collision) failed: " +
                            updErr.message,
                        500,
                    );
                }
                userId = existing.id;
                console.log("re-used existing auth user", userId);
            }
        }

        // ---------- 7. Make sure profile row exists, link driver row ----------
        if (userId) {
            await adminClient.from("profiles").upsert({
                id: userId,
                role: "driver",
                full_name: driver.full_name,
            });
            await adminClient
                .from("drivers")
                .update({ profile_id: userId })
                .eq("id", driver_id);
        }

        // ---------- 8. Generate the magic link (still useful as 1-click login) ----------
        const { data: linkData, error: linkErr } = await adminClient.auth.admin
            .generateLink({
                type: "magiclink",
                email: loginEmail,
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

        // ---------- 9. Return ----------
        return new Response(
            JSON.stringify({
                link: linkData.properties.action_link,
                login_email: loginEmail,
                login_phone: driver.whatsapp,
                login_password: loginPassword,
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
