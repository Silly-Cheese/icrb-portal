import { auth, db } from '../firebase/config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function loginMember({ memberId, committeeId, password }) {
  const memberRef = doc(db, 'members', memberId);
  const snap = await getDoc(memberRef);

  if (!snap.exists()) throw new Error('Member not found');

  const data = snap.data();

  if (data.committeeId !== committeeId) {
    throw new Error('Invalid Committee ID');
  }

  const email = `${memberId}@icrb.local`;
  const cred = await signInWithEmailAndPassword(auth, email, password);

  localStorage.setItem('session', JSON.stringify({
    uid: cred.user.uid,
    memberId,
    username: data.username,
    role: data.role,
    committee: data.committee
  }));

  return cred.user;
}