import {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "./firebase.js";

const BOOTSTRAP_KEY = "ICRB-EXECUTIVE";

export async function bootstrapOwnerAccount({
  bootstrapKey,
  memberId,
  username,
  email,
  password
}) {
  const normalizedKey = String(bootstrapKey || "").trim();
  const normalizedMemberId = String(memberId || "").trim();
  const normalizedUsername = String(username || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedKey || !normalizedMemberId || !normalizedUsername || !normalizedEmail || !normalizedPassword) {
    throw new Error("All bootstrap owner fields are required.");
  }

  if (normalizedKey !== BOOTSTRAP_KEY) {
    throw new Error("Invalid bootstrap key.");
  }

  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const existingMember = await getDoc(doc(db, "members", normalizedMemberId));
  if (existingMember.exists()) {
    throw new Error("A member with that Member ID already exists.");
  }

  const authResult = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    normalizedPassword
  );

  await setDoc(doc(db, "members", normalizedMemberId), {
    memberId: normalizedMemberId,
    username: normalizedUsername,
    email: normalizedEmail,
    authUid: authResult.user.uid,
    role: "Owner",
    status: "Active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, "settings", "ownerBootstrap"), {
    enabled: false,
    completed: true,
    ownerMemberId: normalizedMemberId,
    ownerUsername: normalizedUsername,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, "auditLogs", `bootstrap_${Date.now()}`), {
    type: "OWNER_BOOTSTRAP_COMPLETED",
    memberId: normalizedMemberId,
    username: normalizedUsername,
    createdAt: serverTimestamp()
  });

  return authResult.user;
}