import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function initializeInfractionsPage(user) {
  const form = document.getElementById('infractionForm');
  const list = document.getElementById('infractionList');
  const status = document.getElementById('infractionFormStatus');
  const panel = document.getElementById('infractionAdminPanel');

  if (!(user.isAdmin || user.isSuperAdmin)) {
    document.body.innerHTML = '<h1 style="padding:20px;">Access Denied</h1>';
    return;
  }

  panel.hidden = false;

  function showStatus(msg, err=false) {
    status.textContent = msg;
    status.className = err ? 'page-status error' : 'page-status';
  }

  async function loadInfractions() {
    const snap = await getDocs(collection(db, 'employeeInfractions'));
    list.innerHTML = '';

    snap.forEach(d => {
      const i = d.data();

      const div = document.createElement('div');
      div.className = 'card';

      div.innerHTML = `
        <strong>${i.employeeUsername}</strong> (${i.employeeMemberId})<br/>
        Committee: ${i.employeeCommittee}<br/>
        Type: ${i.type}<br/>
        Summary: ${i.summary}<br/>
        Action: ${i.actionTaken || 'N/A'}<br/>
        Issued By: ${i.issuedBy}<br/>
      `;

      list.appendChild(div);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    showStatus('Issuing infraction...');

    await addDoc(collection(db, 'employeeInfractions'), {
      employeeMemberId: document.getElementById('employeeMemberId').value,
      employeeUsername: document.getElementById('employeeUsername').value,
      employeeCommittee: document.getElementById('employeeCommittee').value,
      type: document.getElementById('infractionType').value,
      summary: document.getElementById('infractionSummary').value,
      details: document.getElementById('infractionDetails').value,
      evidenceLink: document.getElementById('evidenceLink').value,
      actionTaken: document.getElementById('actionTaken').value,
      issuedBy: user.memberId,
      createdAt: serverTimestamp()
    });

    showStatus('Infraction recorded successfully.');
    form.reset();
    loadInfractions();
  });

  loadInfractions();
}
