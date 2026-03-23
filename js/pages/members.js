import { db } from '../firebase/config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

export async function loadMembers() {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = 'Loading members...';

  try {
    const querySnapshot = await getDocs(collection(db, 'members'));

    membersList.innerHTML = '';

    querySnapshot.forEach((docSnap) => {
      const m = docSnap.data();

      const div = document.createElement('div');
      div.className = 'member-card';
      div.innerHTML = `
        <strong>${m.username}</strong><br/>
        Role: ${m.role}<br/>
        Committee: ${m.committee}<br/>
        Status: ${m.status}
      `;

      membersList.appendChild(div);
    });
  } catch (error) {
    console.error(error);
    membersList.innerHTML = 'Failed to load members.';
  }
}
