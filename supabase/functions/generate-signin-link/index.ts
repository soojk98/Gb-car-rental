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
//     1. Open your project → Edge Functions → Create a new function
//     2. Name: generate-signin-link
//     3. Paste this entire file
//     4. Click Deploy
//
//   Option B — Supabase CLI (if installed):
//     supabase functions deploy generate-signin-link
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status: number) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
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

        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) return jsonError("Not authenticated", 401);

        const { data: callerProfile, error: profileErr } = await userClient
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();

        if (profileErr || callerProfile?.role !== "admin") {
            return jsonError("Admin only", 403);
        }

        // ---------- 2. Parse + validate input ----------
        const body = await req.json();
        const driver_id: string | undefined = body?.driver_id;
        const redirect_to: string | undefined = body?.redirect_to;
        if (!driver_id) return jsonError("driver_id required", 400);
        if (!redirect_to) return jsonError("redirect_to required", 400);

        // ---------- 3. Service-role client for admin operations ----------
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // ---------- 4. Look up the driver ----------
        const { data: driver, error: dErr } = await adminClient
            .from("drivers")
            .select("id, full_name, email")
            .eq("id", driver_id)
            .single();

        if (dErr || !driver) return jsonError("Driver not found", 404);

        // ---------- 5. Determine the email to use ----------
        const driverIdShort = driver.id.replace(/-/g, "").slice(0, 12);
        const email = driver.email || `driver-${driverIdShort}@noreply.example.com`;
        const isSynthetic = !driver.email;

        console.log("generate-signin-link: using email", email, "synthetic:", isSynthetic);

        // ---------- 6. Ensure the auth user exists ----------
        // createUser is idempotent for our purposes — if the user already exists,
        // we treat that as success. Any OTHER error must be reported.
        const { error: createErr } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: driver.full_name },
        });
        if (createErr) {
            const msg = createErr.message || "";
            const alreadyExists = /already (registered|exists|been)/i.test(msg)
                || /duplicate/i.test(msg)
                || createErr.status === 422;
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
        return jsonError(e?.message || String(e), 500);
    }
});
