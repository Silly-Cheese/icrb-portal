import { getStoredSession, validateCurrentSession, logoutMember } from '../auth/session.js';

export async function enforceDashboardAccess({ redirectTo = 'login.html' } = {}) {
  const storedSession = getStoredSession();

  if (!storedSession?.memberId) {
    window.location.href = redirectTo;
    return null;
  }

  try {
    const validation = await validateCurrentSession();

    if (!validation.valid) {
      await logoutMember();
      window.location.href = redirectTo;
      return null;
    }

    return validation.memberData;
  } catch (error) {
    console.error('Dashboard access enforcement failed:', error);
    await logoutMember();
    window.location.href = redirectTo;
    return null;
  }
}

export function populateDashboardIdentity(memberData) {
  const usernameElement = document.getElementById('dashboardUsername');
  const roleElement = document.getElementById('dashboardRole');
  const committeeElement = document.getElementById('dashboardCommittee');
  const adminBadgeElement = document.getElementById('dashboardAdminBadge');

  if (usernameElement) {
    usernameElement.textContent = memberData.username || 'Unknown Member';
  }

  if (roleElement) {
    roleElement.textContent = memberData.role || 'No role assigned';
  }

  if (committeeElement) {
    committeeElement.textContent = memberData.committee || 'No committee assigned';
  }

  if (adminBadgeElement) {
    if (memberData.isSuperAdmin) {
      adminBadgeElement.textContent = 'Super Admin';
      adminBadgeElement.hidden = false;
    } else if (memberData.isAdmin) {
      adminBadgeElement.textContent = 'Admin';
      adminBadgeElement.hidden = false;
    } else {
      adminBadgeElement.hidden = true;
    }
  }
}

export function wireLogoutButton() {
  const logoutButton = document.getElementById('logoutButton');

  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = 'Signing out...';

    try {
      await logoutMember();
    } finally {
      window.location.href = 'login.html';
    }
  });
}
