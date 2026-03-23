import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function initializeVotingPage(user) {
  const activeContainer = document.getElementById('activeVotingSession');

  async function loadSessions() {
    const snap = await getDocs(collection(db, 'votingSessions'));
    activeContainer.innerHTML = '';

    for (const d of snap.docs) {
      const s = d.data();

      const votesSnap = await getDocs(query(collection(db, 'votes'), where('sessionId','==',d.id)));

      let aye = 0, nay = 0, abstain = 0;
      let alreadyVoted = false;

      votesSnap.forEach(v => {
        const data = v.data();
        if (data.vote === 'aye') aye++;
        if (data.vote === 'nay') nay++;
        if (data.vote === 'abstain') abstain++;
        if (data.memberId === user.memberId) alreadyVoted = true;
      });

      const div = document.createElement('div');
      div.className = 'session-card';

      div.innerHTML = `
        <strong>Policy ID: ${s.policyId}</strong><br/>
        Status: ${s.status}

        <div class="vote-grid">
          <div class="vote-stat">AYE<strong>${aye}</strong></div>
          <div class="vote-stat">NAY<strong>${nay}</strong></div>
          <div class="vote-stat">ABSTAIN<strong>${abstain}</strong></div>
        </div>

        ${s.status === 'open' && !alreadyVoted ? `
          <div class="vote-actions">
            <button data-id="${d.id}" data-vote="aye">AYE</button>
            <button data-id="${d.id}" data-vote="nay">NAY</button>
            <button data-id="${d.id}" data-vote="abstain">ABSTAIN</button>
          </div>
        ` : ''}

        ${alreadyVoted ? `<div class="vote-chip">You have already voted</div>` : ''}

        ${(user.isAdmin || user.isSuperAdmin) && s.status === 'open' ? `
          <div class="inline-actions">
            <button data-close="${d.id}">Close Session</button>
          </div>
        ` : ''}
      `;

      activeContainer.appendChild(div);
    }

    document.querySelectorAll('[data-vote]').forEach(btn => {
      btn.onclick = () => castVote(btn.dataset.id, btn.dataset.vote);
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => closeSession(btn.dataset.close);
    });
  }

  async function castVote(sessionId, vote) {
    const existing = await getDocs(query(collection(db, 'votes'), where('sessionId','==',sessionId), where('memberId','==',user.memberId)));

    if (!existing.empty) {
      alert('You have already voted.');
      return;
    }

    await addDoc(collection(db, 'votes'), {
      sessionId,
      memberId: user.memberId,
      vote,
      createdAt: serverTimestamp()
    });

    loadSessions();
  }

  async function closeSession(id) {
    await updateDoc(doc(db, 'votingSessions', id), {
      status: 'closed',
      closedAt: serverTimestamp()
    });

    loadSessions();
  }

  loadSessions();
}
