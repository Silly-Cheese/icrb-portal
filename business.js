import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "./firebase.js";

function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureBaseCollections() {
  const defaults = [
    ["members", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["settings", "ownerBootstrap", { enabled: true, completed: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }],
    ["auditLogs", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["businesses", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["employees", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["signupRequests", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["votes", "_init", { initialized: true, createdAt: serverTimestamp() }],
    ["employeeInfractions", "_init", { initialized: true, createdAt: serverTimestamp() }]
  ];

  for (const [collectionName, documentId, data] of defaults) {
    const ref = doc(db, collectionName, documentId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, data);
    }
  }
}

export async function createBusinessRecord({
  name,
  status,
  standing,
  notes
}) {
  const normalizedName = String(name || "").trim();
  const normalizedStatus = String(status || "").trim();
  const normalizedStanding = String(standing || "").trim();
  const normalizedNotes = String(notes || "").trim();

  if (!normalizedName) {
    throw new Error("Business name is required.");
  }

  const businessId = makeSlug(normalizedName);
  if (!businessId) {
    throw new Error("A valid business ID could not be generated.");
  }

  await setDoc(doc(db, "businesses", businessId), {
    businessId,
    name: normalizedName,
    status: normalizedStatus || "Under Review",
    standing: normalizedStanding || "Neutral",
    notes: normalizedNotes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, "auditLogs", `business_${businessId}_${Date.now()}`), {
    type: "BUSINESS_CREATED",
    businessId,
    name: normalizedName,
    createdAt: serverTimestamp()
  });

  return businessId;
}

export async function getBusinesses() {
  const snapshot = await getDocs(collection(db, "businesses"));
  const items = [];

  snapshot.forEach((entry) => {
    if (entry.id === "_init") return;
    items.push({ id: entry.id, ...entry.data() });
  });

  items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  return items;
}

export function filterBusinesses(items, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) => {
    return [
      item.name,
      item.status,
      item.standing,
      item.notes,
      item.businessId
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
}

export function getBusinessStats(items) {
  return {
    total: items.length,
    accredited: items.filter((item) => item.status === "Accredited").length
  };
}