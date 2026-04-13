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

// Sign in with phone-or-email + password.
//   - If `loginInput` contains '@', it is used as an email directly (admin).
//   - Otherwise it is treated as a phone number and converted to the same
//     synthetic email format the create-login edge function uses.
// Returns { profile } on success or { error, attemptedEmail } on failure.
async function signIn(loginInput, password) {
    const trimmed = (loginInput || '').trim();
    const email = trimmed.includes('@')
        ? trimmed.toLowerCase()
        : phoneToSyntheticEmail(trimmed);

    console.log('signIn attempting with email:', email);

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (signInError) return { error: signInError.message, attemptedEmail: email };

    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Logged in but profile not found. Contact admin.', attemptedEmail: email };

    return { profile };
}

// Convert a Malaysian-style phone number into the synthetic login email.
// Must match the same logic in supabase/functions/generate-signin-link.
function phoneToSyntheticEmail(phone) {
    let digits = (phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '60' + digits.slice(1);
    return digits + '@phone.example.com';
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

// =====================================================================
// Auto-mount the user menu (name + Sign out) to the top-right of the
// topbar, so every page shows it consistently. The sidebar-footer
// version is hidden. Relies on page markup having #user-name and
// #logout elements somewhere on the page.
// =====================================================================
(function () {
    function initials(name) {
        if (!name) return '?';
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function detectRole() {
        const p = (window.location.pathname || '').toLowerCase();
        if (p.includes('/admin/'))  return 'Admin';
        if (p.includes('/driver/')) return 'Driver';
        return '';
    }

    function mount() {
        const topbar = document.querySelector('.topbar');
        const userNameEl = document.getElementById('user-name');
        const logoutEl   = document.getElementById('logout');
        if (!topbar || !userNameEl || !logoutEl) return;

        const footer = document.querySelector('.sidebar-footer');
        if (footer) footer.style.display = 'none';

        const originalName = userNameEl.textContent || '';
        userNameEl.remove();
        logoutEl.remove();

        const wrap = document.createElement('div');
        wrap.className = 'topbar-user';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.id = 'user-avatar';
        avatar.textContent = initials(originalName);

        const who = document.createElement('div');
        who.className = 'who';

        const nameEl = document.createElement('span');
        nameEl.className = 'name';
        nameEl.id = 'user-name';
        nameEl.textContent = originalName;

        const roleEl = document.createElement('span');
        roleEl.className = 'role';
        roleEl.textContent = detectRole();

        who.appendChild(nameEl);
        if (roleEl.textContent) who.appendChild(roleEl);

        const signOutBtn = document.createElement('a');
        signOutBtn.id = 'logout';
        signOutBtn.href = '#';
        signOutBtn.className = 'signout';
        signOutBtn.title = 'Sign out';
        signOutBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Sign out</span>';

        wrap.appendChild(avatar);
        wrap.appendChild(who);
        wrap.appendChild(signOutBtn);

        // Append into existing right-side div if present, otherwise to topbar.
        const children = topbar.children;
        const lastChild = children[children.length - 1];
        if (lastChild && lastChild.tagName !== 'H1') {
            lastChild.appendChild(wrap);
        } else {
            topbar.appendChild(wrap);
        }

        // Update avatar when the page later sets the real name.
        const observer = new MutationObserver(function () {
            avatar.textContent = initials(nameEl.textContent);
        });
        observer.observe(nameEl, { childList: true, characterData: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
