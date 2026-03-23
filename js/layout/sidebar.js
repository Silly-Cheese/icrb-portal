export function buildSidebar(user) {
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return;

  nav.innerHTML = `
    <a href="dashboard.html">Dashboard</a>
    <a href="policies.html">Policies</a>
    <a href="voting.html">Voting</a>
    ${user.isAdmin || user.isSuperAdmin ? `<a href="members.html">Members</a>` : ''}
    ${user.isAdmin || user.isSuperAdmin ? `<a href="settings.html">Settings</a>` : ''}
  `;
}
