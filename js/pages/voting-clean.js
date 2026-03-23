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

function voteLabel(vote) {
  if (vote === 'aye') return 'AYE';
  if (vote === 'nay') return 'NAY';
  return 'ABSTAIN';
}

export async function initializeVotingCleanPage(rawUser) {
  const user = normalizePortalUser(rawUser || {});
  const adminPanel = document.getElementById('adminVotingPanel');
  const policySelect = document.getElementById('policySelect');
  const openForm = document.getElementById('openVotingForm');
  const openStatus = document.getElementById('openVotingStatus');
  const activeContainer = document.getElementById('activeVotingSession');
  const recentContainer = document.getElementById('recentVotingSessions');
  const totalsContainer = document.getElementById('votingTotals');

  function showOpenStatus(message, isError = false) {
    openStatus.textContent = message;
    openStatus.className = isError ? 'page-status error' : 'page-status success';
  }

  if (user.isAdmin || user.isSuperAdmin) {
    adminPanel.hidden = false;
    await loadApprovedPolicies();
  }

  async function loadApprovedPolicies() {
    const snap = await getDocs(query(collection(db, 'policies'), where('status', '==', 'approved')));
    policySelect.innerHTML = '<option value="">Select approved policy</option>';

    snap.forEach((docSnap) => {
      const policy = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = policy.title || `Policy ${docSnap.id}`;
      policySelect.appendChild(option);
    });
  }

  openForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showOpenStatus('Opening voting session...');

    try {
      await addDoc(collection(db, 'votingSessions'), {
        policyId: policySelect.value,
        openedBy: user.memberId,
        notes: document.getElementById('sessionNotes').value.trim(),
        status: 'open',
        createdAt: serverTimestamp()
      });

      showOpenStatus('Voting session opened successfully.');
      openForm.reset();
      await loadApprovedPolicies();
      await loadSessions();
    } catch (error) {
      console.error(error);
      showOpenStatus(error.message || 'Unable to open session.', true);
    }
  });

  async function loadSessions() {
    const sessionSnap = await getDocs(collection(db, 'votingSessions'));
    activeContainer.innerHTML = '';
    recentContainer.innerHTML = '';

    let totalOpen = 0;
    let totalClosed = 0;
    let totalVotes = 0;

    for (const sessionDoc of sessionSnap.docs) {
      const session = sessionDoc.data();
      const sessionId = sessionDoc.id;
      const votesSnap = await getDocs(query(collection(db, 'votes'), where('sessionId', '==', sessionId)));

      let aye = 0;
      let nay = 0;
      let abstain = 0;
      let alreadyVoted = false;

      votesSnap.forEach((voteDoc) => {
        const vote = voteDoc.data();
        totalVotes += 1;
        if (vote.vote === 'aye') aye += 1;
        else if (vote.vote === 'nay') nay += 1;
        else abstain += 1;

        if (String(vote.memberId) === String(user.memberId)) {
          alreadyVoted = true;
        }
      });

      const totalForSession = aye + nay + abstain;
      const card = document.createElement('article');
      card.className = 'voting-session-card';
      card.innerHTML = `
        <div class="session-top-row">
          <div>
            <h3>Policy ID: ${escapeHtml(session.policyId || 'Unknown')}</h3>
            <div class="muted">Status: ${escapeHtml(session.status || 'unknown')}</div>
          </div>
          <span class="session-status-chip ${session.status === 'open' ? 'open' : 'closed'}">${escapeHtml(session.status || 'unknown')}</span>
        </div>

        <div class="vote-summary-grid">
          <div class="vote-summary-box"><span class="vote-summary-label">AYE</span><strong>${aye}</strong></div>
          <div class="vote-summary-box"><span class="vote-summary-label">NAY</span><strong>${nay}</strong></div>
          <div class="vote-summary-box"><span class="vote-summary-label">ABSTAIN</span><strong>${abstain}</strong></div>
          <div class="vote-summary-box"><span class="vote-summary-label">TOTAL</span><strong>${totalForSession}</strong></div>
        </div>

        ${session.status === 'open' && !alreadyVoted ? `
          <div class="vote-button-row">
            <button class="button primary" data-vote-session="${sessionId}" data-vote-choice="aye">AYE</button>
            <button class="button secondary" data-vote-session="${sessionId}" data-vote-choice="nay">NAY</button>
            <button class="button secondary" data-vote-session="${sessionId}" data-vote-choice="abstain">ABSTAIN</button>
          </div>
        ` : ''}

        ${alreadyVoted ? `<div class="vote-notice">You have already cast your vote for this session.</div>` : ''}

        ${(user.isAdmin || user.isSuperAdmin) && session.status === 'open' ? `
          <div class="vote-admin-actions">
            <button class="button secondary" data-close-session="${sessionId}">Close Session</button>
          </div>
        ` : ''}
      `;

      if (session.status === 'open') {
        totalOpen += 1;
        activeContainer.appendChild(card);
      } else {
        totalClosed += 1;
        recentContainer.appendChild(card);
      }
    }

    totalsContainer.innerHTML = `
      <div class="summary-chip">Open Sessions: ${totalOpen}</div>
      <div class="summary-chip">Closed Sessions: ${totalClosed}</div>
      <div class="summary-chip">Votes Cast: ${totalVotes}</div>
    `;

    document.querySelectorAll('[data-vote-session]').forEach((button) => {
      button.addEventListener('click', () => castVote(button.dataset.voteSession, button.dataset.voteChoice));
    });

    document.querySelectorAll('[data-close-session]').forEach((button) => {
      button.addEventListener('click', () => closeSession(button.dataset.closeSession));
    });
  }

  async function castVote(sessionId, vote) {
    const existing = await getDocs(query(
      collection(db, 'votes'),
      where('sessionId', '==', sessionId),
      where('memberId', '==', user.memberId)
    ));

    if (!existing.empty) {
      alert('You have already voted in this session.');
      return;
    }

    await addDoc(collection(db, 'votes'), {
      sessionId,
      memberId: user.memberId,
      vote,
      voteLabel: voteLabel(vote),
      createdAt: serverTimestamp()
    });

    await loadSessions();
  }

  async function closeSession(sessionId) {
    await updateDoc(doc(db, 'votingSessions', sessionId), {
      status: 'closed',
      closedAt: serverTimestamp()
    });

    await loadSessions();
  }

  await loadSessions();
}
