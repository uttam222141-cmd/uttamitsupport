// =========================================================
// Include on every protected ERP page (after supabaseClient.js).
// Redirects to login.html if not signed in, then loads the
// user's profile/role into window.currentProfile and fires
// a 'erp:ready' event other page scripts can listen for.
// =========================================================
(function () {
  async function guard() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    if (error || !session) {
      window.location.href = 'login.html';
      return;
    }

    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Could not load profile', profileError);
    }

    window.currentUser = session.user;
    window.currentProfile = profile || { role: 'viewer' };

    // Hide elements the current role shouldn't see.
    // Usage in HTML: <button data-role="admin,technician">Delete</button>
    document.querySelectorAll('[data-role]').forEach((el) => {
      const allowed = el.getAttribute('data-role').split(',').map((r) => r.trim());
      if (!allowed.includes(window.currentProfile.role)) {
        el.style.display = 'none';
      }
    });

    const nameEl = document.getElementById('erp-user-name');
