import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

function normalizeAdminUser(user) {
  const role = String(user?.role || '').toLowerCase();
  const inferredSuperAdmin = role.includes('super_admin') || role.includes('super admin');
  const inferredAdmin = role.includes('admin') || inferredSuperAdmin;

  return {
    ...user,
    isAdmin: user?.isAdmin === true || inferredAdmin,
    isSuperAdmin: user?.isSuperAdmin === true || inferredSuperAdmin
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInfractionCard(data) {
  return `
    <article class="infraction-record-card">
      <div class="infraction-record-top">
        <div>
          <h3>${escapeHtml(data.employeeUsername || 'Unknown User')}</h3>
          <div class="muted">Member ID: ${escapeHtml(data.employeeMemberId || '—')}</div>
        </div>
        <span class="infraction-type-chip">${escapeHtml(data.type || 'other')}</span>
      </div>

      <div class="infraction-record-grid">
        <div><span class="record-label">Committee</span><span>${escapeHtml(data.employeeCommittee || '—')}</span></div>
        <div><span class="record-label">Action Taken</span><span>${escapeHtml(data.actionTaken || 'N/A')}</span></div>
        <div><span class="record-label">Issued By</span><span>${escapeHtml(data.issuedBy || '—')}</span></div>
        <div><span class="record-label">Evidence</span><span>${data.evidenceLink ? `<a href="${escapeHtml(data.evidenceLink)}" target="_blank" rel="noreferrer">Open Link</a>` : 'None'}</span></div>
      </div>

      <div class="record-section">
        <div class="record-label">Summary</div>
        <div>${escapeHtml(data.summary || 'No summary provided.')}</div>
      </div>

      <div class="record-section">
        <div class="record-label">Details</div>
        <div class="muted">${escapeHtml(data.details || 'No details provided.')}</div>
      </div>
    </article>
  `;
}

export async function initializeInfractionsCleanPage(rawUser) {
  const user = normalizeAdminUser(rawUser || {});

  if (!(user.isAdmin || user.isSuperAdmin)) {
    document.body.innerHTML = '<main style="padding:40px;color:white;font-family:Inter,Arial;">Access Denied</main>';
    return;
  }

  const form = document.getElementById('infractionForm');
  const list = document.getElementById('infractionList');
  const status = document.getElementById('infractionFormStatus');
  const total = document.getElementById('infractionCount');
  const typeSummary = document.getElementById('infractionTypeSummary');

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = isError ? 'page-status error' : 'page-status success';
  }

  async function loadInfractions() {
    const snap = await getDocs(collection(db, 'employeeInfractions'));
    const records = [];
    const typeCounts = {};

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      records.push(data);
      const type = data.type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    total.textContent = String(records.length);

    const typeEntries = Object.entries(typeCounts);
    typeSummary.innerHTML = typeEntries.length
      ? typeEntries.map(([type, count]) => `<div class="summary-chip">${escapeHtml(type)}: ${count}</div>`).join('')
      : '<div class="muted">No infractions recorded yet.</div>';

    list.innerHTML = records.length
      ? records.map(renderInfractionCard).join('')
      : '<div class="card"><div class="muted">No infractions have been recorded yet.</div></div>';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus('Issuing infraction...');

    try {
      await addDoc(collection(db, 'employeeInfractions'), {
        employeeMemberId: document.getElementById('employeeMemberId').value.trim(),
        employeeUsername: document.getElementById('employeeUsername').value.trim(),
        employeeCommittee: document.getElementById('employeeCommittee').value.trim(),
        type: document.getElementById('infractionType').value,
        summary: document.getElementById('infractionSummary').value.trim(),
        details: document.getElementById('infractionDetails').value.trim(),
        evidenceLink: document.getElementById('evidenceLink').value.trim(),
        actionTaken: document.getElementById('actionTaken').value.trim(),
        issuedBy: user.memberId || user.username || 'unknown',
        createdAt: serverTimestamp()
      });

      showStatus('Infraction recorded successfully.');
      form.reset();
      await loadInfractions();
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Unable to record infraction.', true);
    }
  });

  await loadInfractions();
}
