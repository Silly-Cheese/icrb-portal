import { getStoredSession, validateCurrentSession, logoutMember } from './session.js';

export async function requireAdminPage({ redirectTo = 'login.html' } = {}) {
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

    const memberData = validation.memberData;
    const isAdmin = memberData.isAdmin === true || memberData.isSuperAdmin === true;

    if (!isAdmin) {
      window.location.href = 'index.html';
      return null;
    }

    return memberData;
  } catch (error) {
    console.error('Admin page validation failed:', error);
    await logoutMember();
    window.location.href = redirectTo;
    return null;
  }
}

export function canManageMembers(memberData) {
  return !!(memberData && (memberData.isAdmin === true || memberData.isSuperAdmin === true));
}
