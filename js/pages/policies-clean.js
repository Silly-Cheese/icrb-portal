import { db } from '../firebase/config.js';
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

function normalizePortalUser(user) {
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

function policyStatusClass(status) {
  const value = String(status || 'pending').toLowerCase();
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  if (value === 'open for vote' || value === 'voting open') return 'voting';
  return 'pending';
}

function renderPolicyCard(policyId, policy, user) {
  const adminActions = (user.isAdmin || user.isSuperAdmin)
    ? `
      <div class="policy-action-row">
        <button class="button primary" data-policy-action="approve" data-policy-id="${escapeHtml(policyId)}">Approve</button>
        <button class="button secondary" data-policy-action="reject" data-policy-id="${escapeHtml(policyId)}">Reject</button>
        <button class="button secondary" data-policy-action="vote" data-policy-id="${escapeHtml(policyId)}">Mark Voting Ready</button>
      </div>
    `
    : '';

  return `
    <article class="policy-record-card">
      <div class="policy-record-top">
        <div>
          <h3>${escapeHtml(policy.title || 'Untitled Policy')}</h3>
          <div class="muted">Submitted by: ${escapeHtml(policy.submittedBy || 'Unknown')}</div>
        </div>
        <span class="policy-status-chip ${policyStatusClass(policy.status)}">${escapeHtml(policy.status || 'pending')}</span>
      </div>

      <div class="policy-record-grid">
        <div><span class="record-label">Category</span><span>${escapeHtml(policy.category || '—')}</span></div>
        <div><span class="record-label">Committee</span><span>${escapeHtml(policy.committee || '—')}</span></div>
        <div><span class="record-label">Document</span><span>${policy.docLink ? `<a href="${escapeHtml(policy.docLink)}" target="_blank" rel="noreferrer">Open Google Doc</a>` : 'No link'}</span></div>
        <div><span class="record-label">Review Status</span><span>${escapeHtml(policy.status || 'pending')}</span></div>
      </div>

      <div class="record-section">
        <div class="record-label">Detailed Summary</div>
        <div class="muted">${escapeHtml(policy.summary || 'No summary provided.')}</div>
      </div>

      ${adminActions}
    </article>
  `;
}

export async function initializePoliciesCleanPage(rawUser) {
  const user = normalizePortalUser(rawUser || {});
  const form = document.getElementById('policyForm');
  const list = document.getElementById('policyList');
  const status = document.getElementById('policyFormStatus');
  const totals = document.getElementById('policyTotals');

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = isError ? 'page-status error' : 'page-status success';
  }

  async function loadPolicies() {
    const snap = await getDocs(collection(db, 'policies'));
    const records = [];
    const counts = { total: 0, approved: 0, pending: 0, rejected: 0, voting: 0 };

    snap.forEach((docSnap) => {
      const policy = docSnap.data();
      const statusValue = String(policy.status || 'pending').toLowerCase();
      counts.total += 1;
      if (statusValue === 'approved') counts.approved += 1;
      else if (statusValue === 'rejected') counts.rejected += 1;
      else if (statusValue === 'open for vote' || statusValue === 'voting open') counts.voting += 1;
      else counts.pending += 1;

      records.push({ id: docSnap.id, data: policy });
    });

    totals.innerHTML = `
      <div class="summary-chip">Total: ${counts.total}</div>
      <div class="summary-chip">Approved: ${counts.approved}</div>
      <div class="summary-chip">Pending: ${counts.pending}</div>
      <div class="summary-chip">Rejected: ${counts.rejected}</div>
      <div class="summary-chip">Voting Ready: ${counts.voting}</div>
    `;

    list.innerHTML = records.length
      ? records.map(item => renderPolicyCard(item.id, item.data, user)).join('')
      : '<div class="card"><div class="muted">No policies have been submitted yet.</div></div>';

    if (user.isAdmin || user.isSuperAdmin) {
      document.querySelectorAll('[data-policy-action]').forEach((button) => {
        button.addEventListener('click', () => updatePolicyStatus(button.dataset.policyId, button.dataset.policyAction));
      });
    }
  }

  async function updatePolicyStatus(policyId, action) {
    let nextStatus = 'pending';
    if (action === 'approve') nextStatus = 'approved';
    else if (action === 'reject') nextStatus = 'rejected';
    else if (action === 'vote') nextStatus = 'open for vote';

    await updateDoc(doc(db, 'policies', policyId), {
      status: nextStatus,
      reviewedAt: serverTimestamp(),
      reviewedBy: user.memberId || user.username || 'unknown'
    });

    await loadPolicies();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus('Submitting policy...');

    try {
      await addDoc(collection(db, 'policies'), {
        title: document.getElementById('policyTitle').value.trim(),
        category: document.getElementById('policyCategory').value,
        committee: document.getElementById('submittingCommittee').value,
        summary: document.getElementById('policySummary').value.trim(),
        docLink: document.getElementById('googleDocLink').value.trim(),
        submittedBy: rawUser?.memberId || rawUser?.username || 'unknown',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      showStatus('Policy submitted successfully.');
      form.reset();
      await loadPolicies();
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Unable to submit policy.', true);
    }
  });

  await loadPolicies();
}
