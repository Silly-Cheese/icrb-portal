import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function initializeVotingPage(user) {
  const adminPanel = document.getElementById('adminVotingPanel');
  const policySelect = document.getElementById('policySelect');
  const openForm = document.getElementById('openVotingForm');
  const status = document.getElementById('openVotingStatus');

  const activeContainer = document.getElementById('activeVotingSession');
  const recentContainer = document.getElementById('recentVotingSessions');

  if (user.isAdmin || user.isSuperAdmin) {
    adminPanel.hidden = false;
    loadApprovedPolicies();
  }

  async function loadApprovedPolicies() {
    const snap = await getDocs(query(collection(db, 'policies'), where('status','==','approved')));
    policySelect.innerHTML = '<option value="">Select policy</option>';

    snap.forEach(d => {
      const p = d.data();
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = p.title;
      policySelect.appendChild(opt);
    });
  }

  openForm.addEventListener('submit', async e => {
    e.preventDefault();

    await addDoc(collection(db, 'votingSessions'), {
      policyId: policySelect.value,
      openedBy: user.memberId,
      notes: document.getElementById('sessionNotes').value,
      status: 'open',
      createdAt: serverTimestamp()
    });

    status.textContent = 'Voting session opened.';
    loadSessions();
  });

  async function loadSessions() {
    const snap = await getDocs(collection(db, 'votingSessions'));

    activeContainer.innerHTML = '';
    recentContainer.innerHTML = '';

    snap.forEach(d => {
      const s = d.data();

      const div = document.createElement('div');
      div.className = 'card';

      div.innerHTML = `
        <strong>Policy ID: ${s.policyId}</strong><br/>
        Status: ${s.status}<br/>
        <button data-id="${d.id}" data-vote="aye">AYE</button>
        <button data-id="${d.id}" data-vote="nay">NAY</button>
        <button data-id="${d.id}" data-vote="abstain">ABSTAIN</button>
      `;

      if (s.status === 'open') {
        activeContainer.appendChild(div);
      } else {
        recentContainer.appendChild(div);
      }
    });

    document.querySelectorAll('[data-vote]').forEach(btn => {
      btn.onclick = () => castVote(btn.dataset.id, btn.dataset.vote);
    });
  }

  async function castVote(sessionId, vote) {
    await addDoc(collection(db, 'votes'), {
      sessionId,
      memberId: user.memberId,
      vote,
      createdAt: serverTimestamp()
    });

    loadSessions();
  }

  loadSessions();
}
