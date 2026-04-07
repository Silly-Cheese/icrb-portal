import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "./firebase.js";

function slugifyBusinessName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureCollections() {
  const defaults = [
    ["members", "__init__", { created: true, createdAt: serverTimestamp() }],
    ["signupRequests", "__init__", { created: true, createdAt: serverTimestamp() }],
    ["votes", "__init__", { created: true, createdAt: serverTimestamp() }],
    ["employeeInfractions", "__init__", { created: true, createdAt: serverTimestamp() }],
    ["auditLogs", "__init__", { created: true, createdAt: serverTimestamp() }],
    ["businesses", "__init__", { created: true, createdAt: serverTimestamp() }],
    [
      "settings",
      "ownerBootstrap",
      {
        enabled: true,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ]
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

  const businessId = slugifyBusinessName(normalizedName);
  if (!businessId) {
    throw new Error("Could not generate a valid business ID.");
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
    type: "BUSINESS_RECORD_CREATED",
    businessId,
    name: normalizedName,
    status: normalizedStatus || "Under Review",
    standing: normalizedStanding || "Neutral",
    createdAt: serverTimestamp()
  });

  return businessId;
}

export async function getBusinesses() {
  const snapshot = await getDocs(collection(db, "businesses"));
  const businesses = [];

  snapshot.forEach((entry) => {
    if (entry.id === "__init__") return;
    businesses.push({
      id: entry.id,
      ...entry.data()
    });
  });

  businesses.sort((a, b) => {
    const aName = String(a.name || "").toLowerCase();
    const bName = String(b.name || "").toLowerCase();
    return aName.localeCompare(bName);
  });

  return businesses;
}

export function filterBusinesses(businesses, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return businesses;

  return businesses.filter((business) => {
    const name = String(business.name || "").toLowerCase();
    const status = String(business.status || "").toLowerCase();
    const standing = String(business.standing || "").toLowerCase();
    const notes = String(business.notes || "").toLowerCase();

    return (
      name.includes(normalizedQuery) ||
      status.includes(normalizedQuery) ||
      standing.includes(normalizedQuery) ||
      notes.includes(normalizedQuery)
    );
  });
}

export function getBusinessStats(businesses) {
  const total = businesses.length;
  const accredited = businesses.filter((business) => business.status === "Accredited").length;
  const goodStanding = businesses.filter((business) =>
    ["Excellent", "Good"].includes(business.standing)
  ).length;

  return {
    total,
    accredited,
    goodStanding
  };
}