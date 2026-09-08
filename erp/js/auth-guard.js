// =========================================================
// Include on every protected ERP page (after supabaseClient.js).
// Redirects to login.html if not signed in, then loads the
// user's profile/role into window.currentProfile and fires
// a 'erp:ready' event other page scripts can listen for.
// =========================================================
// =========================================================
// Include on every protected ERP page (after supabaseClient.js).
// Redirects to login.html if not signed in, then loads the
// user's profile/role into window.currentProfile and fires
// a 'erp:ready' event other page scripts can listen for.
//
// Performance: the profile is cached in sessionStorage so
// navigating between pages doesn't re-run the profile DB
// query every time — only the session check (fast, local)
// runs on each page, and the profile is refreshed quietly
// in the background to stay accurate.
// =========================================================
(function () {
  function applyRoleUI() {
    document.querySelectorAll('[data-role]').forEach((el) => {
      const allowed = el.getAttribute('data-role').split(',').map((r) => r.trim());
      if (!allowed.includes(window.currentProfile.role)) {
        el.style.display = 'none';
      }
    });

    const nameEl = document.getElementById('erp-user-name');
    if (nameEl) {
      nameEl.textContent = window.currentProfile.full_name || window.currentUser.email;
    }
    const roleEl = document.getElementById('erp-user-role');
    if (roleEl) {
      roleEl.textContent = window.currentProfile.role;
    }
  }

  async function guard() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    if (error || !session) {
      window.location.href = 'login.html';
      return;
    }

    window.currentUser = session.user;
    const cacheKey = 'erp_profile_' + session.user.id;
    let readyFired = false;

    // 1) Use cached profile immediately if we have one — page becomes
    //    interactive right away instead of waiting on a DB round-trip.
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        window.currentProfile = JSON.parse(cached);
        applyRoleUI();
        document.dispatchEvent(new CustomEvent('erp:ready'));
        readyFired = true;
      }
    } catch (e) { /* ignore malformed cache */ }

    // 2) Fetch the current profile (first visit: this is what the
    //    page waits on; later visits: this just refreshes quietly).
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Could not load profile', profileError);
    } else if (profile) {
      window.currentProfile = profile;
      try { sessionStorage.setItem(cacheKey, JSON.stringify(profile)); } catch (e) { /* storage full/blocked */ }
      applyRoleUI();
    }

    if (!window.currentProfile) {
      window.currentProfile = { role: 'viewer' };
    }

    if (!readyFired) {
      document.dispatchEvent(new CustomEvent('erp:ready'));
    }
  }

  window.erpLogout = async function () {
    try { sessionStorage.clear(); } catch (e) {}
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  };

  guard();
})();
