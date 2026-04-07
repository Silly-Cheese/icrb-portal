import {
  auth,
  collection,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut
} from "./firebase.js";

const BOOTSTRAP_KEY = "ICRB-SETUP";

export async function loginUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required.");
  }

  const result = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}

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

  if (
    !normalizedKey ||
    !normalizedMemberId ||
    !normalizedUsername ||
    !normalizedEmail ||
    !normalizedPassword
  ) {
    throw new Error("All bootstrap fields are required.");
  }

  if (normalizedKey !== BOOTSTRAP_KEY) {
    throw new Error("Invalid bootstrap key.");
  }

  if (normalizedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
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
    email: normalizedEmail,
    createdAt: serverTimestamp()
  });

  return authResult.user;
}

export async function getMemberByAuthUid(authUid) {
  const snapshot = await getDocs(collection(db, "members"));
  let matchedMember = null;

  snapshot.forEach((entry) => {
    if (entry.id === "_init") return;

    const data = entry.data();
    if (data.authUid === authUid) {
      matchedMember = {
        id: entry.id,
        ...data
      };
    }
  });

  return matchedMember;
}