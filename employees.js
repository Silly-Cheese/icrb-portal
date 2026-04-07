import {
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "./firebase.js";

export async function createEmployeeRecord({
  employeeId,
  displayName,
  username,
  role,
  department,
  status
}) {
  const normalizedEmployeeId = String(employeeId || "").trim();
  const normalizedDisplayName = String(displayName || "").trim();
  const normalizedUsername = String(username || "").trim();
  const normalizedRole = String(role || "").trim();
  const normalizedDepartment = String(department || "").trim();
  const normalizedStatus = String(status || "").trim();

  if (!normalizedEmployeeId || !normalizedDisplayName || !normalizedUsername) {
    throw new Error("Employee ID, display name, and username are required.");
  }

  const existing = await getDoc(doc(db, "employees", normalizedEmployeeId));
  if (existing.exists()) {
    throw new Error("An employee with that ID already exists.");
  }

  await setDoc(doc(db, "employees", normalizedEmployeeId), {
    employeeId: normalizedEmployeeId,
    displayName: normalizedDisplayName,
    username: normalizedUsername,
    role: normalizedRole || "Employee",
    department: normalizedDepartment || "Unassigned",
    status: normalizedStatus || "Active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, "auditLogs", `employee_${normalizedEmployeeId}_${Date.now()}`), {
    type: "EMPLOYEE_CREATED",
    employeeId: normalizedEmployeeId,
    displayName: normalizedDisplayName,
    username: normalizedUsername,
    createdAt: serverTimestamp()
  });

  return normalizedEmployeeId;
}

export async function getEmployees() {
  const snapshot = await getDocs(collection(db, "employees"));
  const items = [];

  snapshot.forEach((entry) => {
    if (entry.id === "_init") return;
    items.push({ id: entry.id, ...entry.data() });
  });

  items.sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || "")));
  return items;
}

export function filterEmployees(items, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) => {
    return [
      item.employeeId,
      item.displayName,
      item.username,
      item.role,
      item.department,
      item.status
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
}

export function getEmployeeStats(items) {
  return {
    total: items.length,
    active: items.filter((item) => item.status === "Active").length
  };
}
