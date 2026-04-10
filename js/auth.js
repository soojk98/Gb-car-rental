// =====================================================================
// Auth helpers
// =====================================================================
// Centralized helpers for login/logout, role detection, and route guards.
// Every protected page should call requireRole('admin') or
// requireRole('driver') before rendering content.
// =====================================================================

// Returns the current Supabase session, or null if not logged in.
async function getSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session || null;
}

// Returns the current user's profile row (id, role, full_name) or null.
async function getCurrentProfile() {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error('Failed to load profile:', error);
        return null;
    }
    return data;
}

// Guard for protected pages. Redirects to login if not authenticated,
// or to the wrong-role's home if logged in as the wrong role.
// Returns the profile if access is granted.
async function requireRole(requiredRole) {
    const profile = await getCurrentProfile();

    if (!profile) {
        window.location.href = resolvePath('login.html');
        return null;
    }
    if (profile.role !== requiredRole) {
        // Logged in but as the wrong role — bounce them to their own area
        const target = profile.role === 'admin' ? 'admin/index.html' : 'driver/index.html';
        window.location.href = resolvePath(target);
        return null;
    }
    return profile;
}

// Sign in with email + password.
// Returns { profile } on success or { error } on failure.
async function signIn(email, password) {
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (signInError) return { error: signInError.message };

    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Logged in but profile not found. Contact admin.' };

    return { profile };
}

// Sign out and send the user back to login.
async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = resolvePath('login.html');
}

// Build a path that works whether the current page is at the root
// (e.g., login.html) or one level deep (e.g., admin/leads.html).
function resolvePath(target) {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    // If we're inside admin/ or driver/, depth is 2+ and we need to go up one
    const inSubfolder = window.location.pathname.includes('/admin/') ||
                        window.location.pathname.includes('/driver/');
    return (inSubfolder ? '../' : '') + target;
}

// =====================================================================
// Driver portal helpers
// =====================================================================
// For pages in /driver/. Loads the driver row linked to the current
// profile, plus their active rental + car.
//
// Returns one of:
//   { profile, driver, rental, car }
//   { error: 'message' }
//
// rental/car may be null if the driver has no active rental yet.
async function getDriverContext() {
    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Not logged in' };
    if (profile.role !== 'driver') return { error: 'Not a driver account' };

    const { data: driver, error: driverErr } = await supabaseClient
        .from('drivers')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

    if (driverErr) return { error: driverErr.message };
    if (!driver) {
        return { error: 'Your account is not yet linked to a driver record. Please contact admin.' };
    }

    const { data: rental, error: rentalErr } = await supabaseClient
        .from('rentals')
        .select('*, cars(*)')
        .eq('driver_id', driver.id)
        .eq('status', 'active')
        .maybeSingle();

    if (rentalErr) return { error: rentalErr.message };

    return {
        profile: profile,
        driver: driver,
        rental: rental || null,
        car: rental ? rental.cars : null
    };
}
