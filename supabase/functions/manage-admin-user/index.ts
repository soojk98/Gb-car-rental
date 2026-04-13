// =====================================================================
// Supabase Edge Function: manage-admin-user
// =====================================================================
// Lets an existing admin create new admin accounts, change roles, or
// delete accounts. Uses the service role key to call
// supabase.auth.admin.* which isn't available with the anon key.
//
// Auth: caller must already be an admin (verified via public.profiles).
// Body:
//   { action: 'create', email, password, full_name, user_jwt }
//   { action: 'update_role', id, role, user_jwt }
//   { action: 'delete', id, user_jwt }
//
// Deploy via Supabase Dashboard → Edge Functions → Create new →
// paste this code → Deploy.
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

function jsonOk(payload: Record<string, unknown>) {
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const body = await req.json();
        const action = body?.action as string | undefined;
        const userJwt = body?.user_jwt as string | undefined;
        if (!action) return jsonError("action required", 400);
        if (!userJwt) return jsonError("user_jwt required", 401);

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Verify caller
        const { data: userData, error: uErr } = await admin.auth.getUser(userJwt);
        if (uErr || !userData?.user) return jsonError("Not authenticated", 401);

        const { data: caller, error: cErr } = await admin
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();
        if (cErr || caller?.role !== "admin") return jsonError("Admin only", 403);

        if (action === "create") {
            const email = (body?.email as string || "").trim().toLowerCase();
            const password = body?.password as string;
            const full_name = (body?.full_name as string || "").trim() || null;
            if (!email || !password) return jsonError("email and password required", 400);
            if (password.length < 8) return jsonError("password must be 8+ characters", 400);

            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name },
            });
            if (createErr || !created?.user) {
                return jsonError("Create failed: " + (createErr?.message || "unknown"), 400);
            }

            const { error: insErr } = await admin
                .from("profiles")
                .upsert({
                    id: created.user.id,
                    role: "admin",
                    full_name: full_name,
                });
            if (insErr) {
                // Roll back auth user so we don't leave an orphaned account
                await admin.auth.admin.deleteUser(created.user.id);
                return jsonError("Profile insert failed: " + insErr.message, 400);
            }

            return jsonOk({ id: created.user.id, email });
        }

        if (action === "update_role") {
            const id = body?.id as string;
            const role = body?.role as string;
            if (!id || !role) return jsonError("id and role required", 400);
            if (!["admin", "driver"].includes(role)) return jsonError("role must be admin or driver", 400);
            if (id === userData.user.id && role !== "admin") {
                return jsonError("You cannot demote yourself.", 400);
            }
            const { error } = await admin.from("profiles").update({ role }).eq("id", id);
            if (error) return jsonError("Update failed: " + error.message, 400);
            return jsonOk({ id, role });
        }

        if (action === "delete") {
            const id = body?.id as string;
            if (!id) return jsonError("id required", 400);
            if (id === userData.user.id) {
                return jsonError("You cannot delete your own account.", 400);
            }
            const { error: delErr } = await admin.auth.admin.deleteUser(id);
            if (delErr) return jsonError("Delete failed: " + delErr.message, 400);
            // profiles row cascades via FK ON DELETE CASCADE (schema default)
            return jsonOk({ id });
        }

        return jsonError("unknown action", 400);
    } catch (err) {
        return jsonError("Unexpected error: " + (err instanceof Error ? err.message : String(err)), 500);
    }
});
