export function normalizePortalUser(user) {
  const role = String(user?.role || '').toLowerCase();
  const inferredAdmin = role.includes('admin');
  const inferredSuperAdmin = role.includes('super_admin') || role.includes('super admin');

  return {
    ...user,
    isAdmin: user?.isAdmin === true || inferredAdmin || inferredSuperAdmin,
    isSuperAdmin: user?.isSuperAdmin === true || inferredSuperAdmin
  };
}

export function buildSidebarClean(user) {
  const safeUser = normalizePortalUser(user || {});
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return safeUser;

  nav.innerHTML = `
    <a href="dashboard-clean.html">Dashboard</a>
    <a href="policies.html">Policies</a>
    <a href="voting.html">Voting</a>
    <a href="analytics.html">Analytics</a>
    ${safeUser.isAdmin || safeUser.isSuperAdmin ? '<a href="members.html">Members</a>' : ''}
    ${safeUser.isAdmin || safeUser.isSuperAdmin ? '<a href="infractions.html">Infractions</a>' : ''}
    ${safeUser.isAdmin || safeUser.isSuperAdmin ? '<a href="settings.html">Settings</a>' : ''}
  `;

  return safeUser;
}
