import { db } from '../firebase/config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export async function initializeAnalyticsPage() {
  const policiesSnap = await getDocs(collection(db, 'policies'));
  const votingSnap = await getDocs(collection(db, 'votingSessions'));
  const votesSnap = await getDocs(collection(db, 'votes'));
  const infractionsSnap = await getDocs(collection(db, 'employeeInfractions'));

  let totalPolicies = 0;
  let approvedPolicies = 0;
  let openVotingSessions = 0;
  let totalInfractions = 0;

  const policyStatus = {};
  const committeeCounts = {};
  const voteCounts = { aye: 0, nay: 0, abstain: 0 };
  const infractionTypes = {};

  policiesSnap.forEach(d => {
    const p = d.data();
    totalPolicies++;

    if (p.status === 'approved') approvedPolicies++;

    policyStatus[p.status] = (policyStatus[p.status] || 0) + 1;
    committeeCounts[p.committee] = (committeeCounts[p.committee] || 0) + 1;
  });

  votingSnap.forEach(d => {
    const v = d.data();
    if (v.status === 'open') openVotingSessions++;
  });

  votesSnap.forEach(d => {
    const v = d.data();
    voteCounts[v.vote]++;
  });

  infractionsSnap.forEach(d => {
    const i = d.data();
    totalInfractions++;
    infractionTypes[i.type] = (infractionTypes[i.type] || 0) + 1;
  });

  document.getElementById('totalPolicies').textContent = totalPolicies;
  document.getElementById('approvedPolicies').textContent = approvedPolicies;
  document.getElementById('openVotingSessions').textContent = openVotingSessions;
  document.getElementById('totalInfractions').textContent = totalInfractions;

  renderList('policyBreakdown', policyStatus);
  renderList('committeeBreakdown', committeeCounts);
  renderList('voteBreakdown', voteCounts);
  renderList('infractionBreakdown', infractionTypes);
}

function renderList(id, obj) {
  const container = document.getElementById(id);
  container.innerHTML = '';

  Object.entries(obj).forEach(([key, val]) => {
    const div = document.createElement('div');
    div.textContent = `${key}: ${val}`;
    container.appendChild(div);
  });
}
