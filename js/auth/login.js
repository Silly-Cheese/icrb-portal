import { auth, db } from '../firebase/config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export async function login(memberId, committeeId, password) {
  try {
    const memberRef = doc(db, 'members', memberId);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      throw new Error('Member not found');
    }

    const memberData = memberSnap.data();

    if (memberData.committeeId !== committeeId) {
      throw new Error('Invalid Committee ID');
    }

    const email = `${memberId}@icrb.local`;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    return {
      user: userCredential.user,
      member: memberData
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}