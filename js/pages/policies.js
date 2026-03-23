import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function initializePoliciesPage(user) {
  const form = document.getElementById('policyForm');
  const list = document.getElementById('policyList');
  const status = document.getElementById('policyFormStatus');

  const showStatus = (msg, err=false) => {
    status.textContent = msg;
    status.className = err ? 'page-status error' : 'page-status';
  };

  async function loadPolicies() {
    const snap = await getDocs(collection(db, 'policies'));
    list.innerHTML = '';

    snap.forEach(d => {
      const p = d.data();

      const div = document.createElement('div');
      div.className = 'card';

      div.innerHTML = `
        <strong>${p.title}</strong><br/>
        Category: ${p.category}<br/>
        Committee: ${p.committee}<br/>
        Status: ${p.status}<br/>
        <a href="${p.docLink}" target="_blank">View Document</a>
        ${user.isAdmin || user.isSuperAdmin ? `
          <br/><button data-id="${d.id}" class="approve">Approve</button>
          <button data-id="${d.id}" class="reject">Reject</button>
        ` : ''}
      `;

      list.appendChild(div);
    });

    document.querySelectorAll('.approve').forEach(btn => {
      btn.onclick = () => updateStatus(btn.dataset.id, 'approved');
    });

    document.querySelectorAll('.reject').forEach(btn => {
      btn.onclick = () => updateStatus(btn.dataset.id, 'rejected');
    });
  }

  async function updateStatus(id, statusVal) {
    await updateDoc(doc(db, 'policies', id), {
      status: statusVal,
      reviewedAt: serverTimestamp(),
      reviewedBy: user.memberId
    });

    loadPolicies();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    showStatus('Submitting policy...');

    await addDoc(collection(db, 'policies'), {
      title: form.policyTitle.value,
      category: form.policyCategory.value,
      committee: form.submittingCommittee.value,
      summary: form.policySummary.value,
      docLink: form.googleDocLink.value,
      submittedBy: user.memberId,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    showStatus('Policy submitted successfully.');
    form.reset();
    loadPolicies();
  });

  loadPolicies();
}
