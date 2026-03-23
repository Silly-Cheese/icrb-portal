import { auth, db } from '../firebase/config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

function normalizeValue(value) {
  return String(value || '').trim();
}

function buildHiddenEmail(memberId) {
  return `${memberId}@icrb.local`;
}

export async function verifyMemberForSignup(memberId, committeeId) {
  const normalizedMemberId = normalizeValue(memberId);
  const normalizedCommitteeId = normalizeValue(committeeId);

  if (!normalizedMemberId || !normalizedCommitteeId) {
    throw new Error('Member ID and Committee ID are required.');
  }

  const memberRef = doc(db, 'members', normalizedMemberId);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    throw new Error('No member record was found for that Member ID.');
  }

  const memberData = memberSnap.data();

  if (memberData.committeeId !== normalizedCommitteeId) {
    throw new Error('Committee ID does not match the member record.');
  }

  if (memberData.accountCreated === true) {
    throw new Error('This member already has an account.');
  }

  if (memberData.status && memberData.status !== 'active') {
    throw new Error('This member is not currently eligible for portal signup.');
  }

  if (memberData.accessStatus && memberData.accessStatus !== 'active') {
    throw new Error('This member does not currently have active portal access.');
  }

  if (memberData.accountLocked === true) {
    throw new Error('This member account is locked.');
  }

  if (memberData.canAccessPortal === false) {
    throw new Error('This member does not currently have portal access.');
  }

  return memberData;
}

export async function createSignupRequest(memberData) {
  const payload = {
    memberId: memberData.memberId,
    committeeId: memberData.committeeId,
    username: memberData.username || '',
    usernameLower: memberData.usernameLower || String(memberData.username || '').toLowerCase(),
    matchedMemberId: memberData.memberId,
    matchedMemberRef: `members/${memberData.memberId}`,
    verified: true,
    status: 'verified',
    passwordCreated: false,
    authAccountCreated: false,
    requestedAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: '',
    createdUid: '',
    notes: 'Instant signup flow initiated.'
  };

  const signupRef = await addDoc(collection(db, 'signupRequests'), payload);
  return { id: signupRef.id, payload };
}

export async function finalizeInstantSignup(memberData, password, existingSignupRequestId = '') {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const email = buildHiddenEmail(memberData.memberId);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  await updateDoc(doc(db, 'members', String(memberData.memberId)), {
    uid,
    accountCreated: true,
    updatedAt: serverTimestamp(),
    canAccessPortal: true
  });

  if (existingSignupRequestId) {
    await updateDoc(doc(db, 'signupRequests', existingSignupRequestId), {
      status: 'completed',
      passwordCreated: true,
      authAccountCreated: true,
      createdUid: uid,
      approvedAt: serverTimestamp(),
      approvedBy: 'system',
      notes: 'Instant signup completed successfully.'
    });
  } else {
    await setDoc(doc(collection(db, 'signupRequests')), {
      memberId: memberData.memberId,
      committeeId: memberData.committeeId,
      username: memberData.username || '',
      usernameLower: memberData.usernameLower || String(memberData.username || '').toLowerCase(),
      matchedMemberId: memberData.memberId,
      matchedMemberRef: `members/${memberData.memberId}`,
      verified: true,
      status: 'completed',
      passwordCreated: true,
      authAccountCreated: true,
      requestedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      approvedBy: 'system',
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: '',
      createdUid: uid,
      notes: 'Instant signup completed without a pre-created request.'
    });
  }

  return {
    uid,
    email,
    memberId: memberData.memberId,
    username: memberData.username || ''
  };
}

export async function completeInstantSignup(memberId, committeeId, password) {
  const memberData = await verifyMemberForSignup(memberId, committeeId);
  const signupRequest = await createSignupRequest(memberData);
  const account = await finalizeInstantSignup(memberData, password, signupRequest.id);

  return {
    memberData,
    signupRequestId: signupRequest.id,
    account
  };
}
