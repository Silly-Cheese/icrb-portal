import { auth } from '../firebase/config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

export function requireAuth() {
  const session = JSON.parse(localStorage.getItem('session') || 'null');

  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  return session;
}

export async function logout() {
  await signOut(auth);
  localStorage.removeItem('session');
}