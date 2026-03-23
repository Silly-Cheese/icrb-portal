import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const SESSION_KEY = 'icrbMemberSession';

export function getStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored session:', error);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setStoredSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function fetchMemberById(memberId) {
  const memberRef = doc(db, 'members', String(memberId));
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    throw new Error('Member record was not found.');
  }

  return memberSnap.data();
}

export function isMemberAllowedAccess(memberData) {
  if (!memberData) {
    return { allowed: false, reason: 'No member data found.' };
  }

  if (memberData.status !== 'active') {
    return { allowed: false, reason: 'Your account is not active.' };
  }

  if (memberData.accessStatus !== 'active') {
    return { allowed: false, reason: 'Your portal access is blocked.' };
  }

  if (memberData.accountLocked === true) {
    return { allowed: false, reason: 'Your account is locked.' };
  }

  if (memberData.canAccessPortal === false) {
    return { allowed: false, reason: 'You do not currently have portal access.' };
  }

  return { allowed: true, reason: '' };
}

export function buildSessionPayload(firebaseUser, memberData) {
  return {
    uid: firebaseUser.uid,
    memberId: memberData.memberId,
    username: memberData.username,
    role: memberData.role,
    committee: memberData.committee,
    committeeId: memberData.committeeId,
    isAdmin: !!memberData.isAdmin,
    isSuperAdmin: !!memberData.isSuperAdmin,
    canVote: !!memberData.canVote,
    status: memberData.status,
    accessStatus: memberData.accessStatus,
    accountLocked: !!memberData.accountLocked,
    canAccessPortal: memberData.canAccessPortal !== false
  };
}

export async function validateCurrentSession() {
  const storedSession = getStoredSession();

  if (!storedSession?.memberId) {
    return { valid: false, reason: 'No saved member session found.' };
  }

  const memberData = await fetchMemberById(storedSession.memberId);
  const accessCheck = isMemberAllowedAccess(memberData);

  if (!accessCheck.allowed) {
    return { valid: false, reason: accessCheck.reason, memberData };
  }

  return { valid: true, memberData };
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      clearStoredSession();
      callback({ authenticated: false, firebaseUser: null, memberData: null, reason: 'No Firebase user session found.' });
      return;
    }

    const storedSession = getStoredSession();

    if (!storedSession?.memberId) {
      callback({ authenticated: false, firebaseUser, memberData: null, reason: 'No member session was stored.' });
      return;
    }

    try {
      const memberData = await fetchMemberById(storedSession.memberId);
      const accessCheck = isMemberAllowedAccess(memberData);

      if (!accessCheck.allowed) {
        await signOut(auth);
        clearStoredSession();
        callback({ authenticated: false, firebaseUser: null, memberData, reason: accessCheck.reason });
        return;
      }

      const sessionPayload = buildSessionPayload(firebaseUser, memberData);
      setStoredSession(sessionPayload);

      callback({ authenticated: true, firebaseUser, memberData, session: sessionPayload, reason: '' });
    } catch (error) {
      console.error('Session watch error:', error);
      callback({ authenticated: false, firebaseUser: null, memberData: null, reason: error.message || 'Unable to validate session.' });
    }
  });
}

export async function logoutMember() {
  await signOut(auth);
  clearStoredSession();
}

export async function requireAuthenticatedPage({ redirectTo = 'login.html' } = {}) {
  const validation = await validateCurrentSession();

  if (!validation.valid) {
    clearStoredSession();
    window.location.href = redirectTo;
    return null;
  }

  return validation.memberData;
}
