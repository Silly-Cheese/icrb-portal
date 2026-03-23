import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const state = {
  members: [],
  selectedMemberId: null
};

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showStatus(message, isError = false) {
  const el = qs('membersStatus');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'page-status error' : 'page-status';
}

function getFilteredMembers() {
  const query = (qs('memberSearch')?.value || '').trim().toLowerCase();
  const filter = qs('memberStatusFilter')?.value || 'all';

  return state.members.filter((member) => {
    const matchesQuery = !query || [
      member.username,
      member.memberId,
      member.role,
      member.committee,
      member.committeeId,
      member.status
    ].some((value) => String(value || '').toLowerCase().includes(query));

    const matchesStatus = filter === 'all' || String(member.status || '').toLowerCase() === filter;
    return matchesQuery && matchesStatus;
  });
}

function renderMembers() {
  const container = qs('membersGrid');
  if (!container) return;

  const members = getFilteredMembers();

  if (!members.length) {
    container.innerHTML = '<div class="empty-state">No members matched your filters.</div>';
    return;
  }

  container.innerHTML = members.map((member) => `
    <article class="member-card">
      <div class="member-card-top">
        <div>
          <h3>${escapeHtml(member.username || 'Unknown User')}</h3>
          <p class="muted">Member ID: ${escapeHtml(member.memberId || '')}</p>
        </div>
        <span class="member-status ${escapeHtml(String(member.status || 'unknown').toLowerCase())}">${escapeHtml(member.status || 'unknown')}</span>
      </div>
      <div class="member-meta">
        <div><span class="meta-label">Role</span><span>${escapeHtml(member.role || '—')}</span></div>
        <div><span class="meta-label">Committee</span><span>${escapeHtml(member.committee || '—')}</span></div>
        <div><span class="meta-label">Committee ID</span><span>${escapeHtml(member.committeeId || '—')}</span></div>
        <div><span class="meta-label">Access</span><span>${escapeHtml(member.accessStatus || '—')}</span></div>
      </div>
      <div class="member-actions">
        <button class="secondary-button" data-member-id="${escapeHtml(member.memberId)}">Manage Member</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-member-id]').forEach((button) => {
    button.addEventListener('click', () => openMemberModal(button.dataset.memberId));
  });
}

async function fetchMembers() {
  const snapshot = await getDocs(collection(db, 'members'));
  state.members = snapshot.docs
    .map((docSnap) => ({ ...docSnap.data(), memberId: docSnap.id, _refId: docSnap.id }))
    .sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')));
}

function fillModal(member) {
  qs('modalMemberId').textContent = member.memberId || 'Unknown';
  qs('editUsername').value = member.username || '';
  qs('editRole').value = member.role || '';
  qs('editCommittee').value = member.committee || '';
  qs('editCommitteeId').value = member.committeeId || '';
  qs('editStatus').value = member.status || 'active';
  qs('editAccessStatus').value = member.accessStatus || 'active';
  qs('editEmployeeStatus').value = member.employeeStatus || 'non_employee';
  qs('editCanVote').checked = member.canVote === true;
  qs('editIsAdmin').checked = member.isAdmin === true;
  qs('editIsSuperAdmin').checked = member.isSuperAdmin === true;
  qs('editAccountLocked').checked = member.accountLocked === true;
  qs('editCanAccessPortal').checked = member.canAccessPortal !== false;
  qs('editSuspensionReason').value = member.suspensionReason || '';
  qs('editTerminationReason').value = member.terminationReason || '';
  qs('editNotes').value = member.notes || '';
}

export async function loadMemberManagementPage() {
  showStatus('Loading members...');
  await fetchMembers();
  renderMembers();
  showStatus(`Loaded ${state.members.length} members.`);

  qs('memberSearch')?.addEventListener('input', renderMembers);
  qs('memberStatusFilter')?.addEventListener('change', renderMembers);
  qs('modalBackdrop')?.addEventListener('click', closeMemberModal);
  qs('closeModalButton')?.addEventListener('click', closeMemberModal);
  qs('saveMemberButton')?.addEventListener('click', saveMemberChanges);
  qs('suspendMemberButton')?.addEventListener('click', () => quickAction('suspended', 'blocked'));
  qs('reinstateMemberButton')?.addEventListener('click', () => quickAction('active', 'active'));
  qs('terminateMemberButton')?.addEventListener('click', () => quickAction('terminated', 'blocked'));
  qs('revokeAccessButton')?.addEventListener('click', revokePortalAccess);
}

export async function openMemberModal(memberId) {
  state.selectedMemberId = String(memberId);
  const memberRef = doc(db, 'members', state.selectedMemberId);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    showStatus('That member could not be loaded.', true);
    return;
  }

  const member = { ...memberSnap.data(), memberId: memberSnap.id };
  fillModal(member);
  qs('memberModal').hidden = false;
}

export function closeMemberModal() {
  qs('memberModal').hidden = true;
}

async function saveMemberChanges() {
  if (!state.selectedMemberId) return;

  const payload = {
    username: qs('editUsername').value.trim(),
    usernameLower: qs('editUsername').value.trim().toLowerCase(),
    role: qs('editRole').value.trim(),
    committee: qs('editCommittee').value.trim(),
    committeeId: qs('editCommitteeId').value.trim(),
    status: qs('editStatus').value,
    accessStatus: qs('editAccessStatus').value,
    employeeStatus: qs('editEmployeeStatus').value,
    canVote: qs('editCanVote').checked,
    isAdmin: qs('editIsAdmin').checked,
    isSuperAdmin: qs('editIsSuperAdmin').checked,
    accountLocked: qs('editAccountLocked').checked,
    canAccessPortal: qs('editCanAccessPortal').checked,
    suspensionReason: qs('editSuspensionReason').value.trim(),
    terminationReason: qs('editTerminationReason').value.trim(),
    notes: qs('editNotes').value.trim(),
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, 'members', state.selectedMemberId), payload);
  closeMemberModal();
  await fetchMembers();
  renderMembers();
  showStatus('Member updated successfully.');
}

async function quickAction(status, accessStatus) {
  if (!state.selectedMemberId) return;

  await updateDoc(doc(db, 'members', state.selectedMemberId), {
    status,
    accessStatus,
    canAccessPortal: status === 'active',
    updatedAt: serverTimestamp()
  });

  closeMemberModal();
  await fetchMembers();
  renderMembers();
  showStatus(`Member updated: ${status}.`);
}

async function revokePortalAccess() {
  if (!state.selectedMemberId) return;

  await updateDoc(doc(db, 'members', state.selectedMemberId), {
    accessStatus: 'blocked',
    canAccessPortal: false,
    updatedAt: serverTimestamp()
  });

  closeMemberModal();
  await fetchMembers();
  renderMembers();
  showStatus('Portal access revoked successfully.');
}
