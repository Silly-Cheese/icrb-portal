import { auth, db } from '../firebase/config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function signupMember({ memberId, committeeId, password }) {
  const memberRef = doc(db, 'members', memberId);
  const snap = await getDoc(memberRef);

  if (!snap.exists()) throw new Error('Member not found');

  const data = snap.data();

  if (data.committeeId !== committeeId) throw new Error('Invalid Committee ID');
  if (data.accountCreated) throw new Error('Account already exists');

  const email = `${memberId}@icrb.local`;
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await updateDoc(memberRef, {
    uid: cred.user.uid,
    accountCreated: true
  });

  return cred.user;
}