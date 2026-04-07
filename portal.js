import { auth, onAuthStateChanged } from "./firebase.js";
import { getMemberByAuthUid, logoutUser } from "./auth.js";
import {
  createBusinessRecord,
  ensureBaseCollections,
  filterBusinesses,
  getBusinesses,
  getBusinessStats
} from "./business.js";
import {
  createEmployeeRecord,
  filterEmployees,
  getEmployeeStats,
  getEmployees
} from "./employees.js";
import {
  escapeHtml,
  formatDate,
  setHtml,
  setInlineMessage,
  setStatusBanner,
  setText,
  showToast
} from "./ui.js";

let allBusinesses = [];
let allEmployees = [];
let currentMember = null;

function renderBusinesses(items) {
  if (!items.length) {
    setHtml(
      "businessList",
      `
        <div class="empty-state">
          <h4>No businesses matched your search.</h4>
          <p>Try another search or create a new business record.</p>
        </div>
      `
    );
    return;
  }

  setHtml(
    "businessList",
    items.map((item) => `
      <article class="directory-card">
        <h4>${escapeHtml(item.name || "Unnamed Business")}</h4>
        <div class="meta-row">
          <span class="meta-chip">Status: ${escapeHtml(item.status || "Unknown")}</span>
          <span class="meta-chip">Standing: ${escapeHtml(item.standing || "Unknown")}</span>
          <span class="meta-chip">ID: ${escapeHtml(item.businessId || item.id || "N/A")}</span>
        </div>
        <p>${escapeHtml(item.notes || "No administrative notes recorded.")}</p>
        <div class="meta-row" style="margin-top: 12px;">
          <span class="meta-chip">Created: ${escapeHtml(formatDate(item.createdAt))}</span>
          <span class="meta-chip">Updated: ${escapeHtml(formatDate(item.updatedAt))}</span>
        </div>
      </article>
    `).join("")
  );
}

function renderEmployees(items) {
  if (!items.length) {
    setHtml(
      "employeeList",
      `
        <div class="empty-state">
          <h4>No employees matched your search.</h4>
          <p>Try another search or create a new employee record.</p>
        </div>
      `
    );
    return;
  }

  setHtml(
    "employeeList",
    items.map((item) => `
      <article class="directory-card">
        <h4>${escapeHtml(item.displayName || "Unnamed Employee")}</h4>
        <div class="meta-row">
          <span class="meta-chip">Employee ID: ${escapeHtml(item.employeeId || item.id || "N/A")}</span>
          <span class="meta-chip">Role: ${escapeHtml(item.role || "Employee")}</span>
          <span class="meta-chip">Department: ${escapeHtml(item.department || "Unassigned")}</span>
          <span class="meta-chip">Status: ${escapeHtml(item.status || "Unknown")}</span>
        </div>
        <p>Username: ${escapeHtml(item.username || "N/A")}</p>
        <div class="meta-row" style="margin-top: 12px;">
          <span class="meta-chip">Created: ${escapeHtml(formatDate(item.createdAt))}</span>
          <span class="meta-chip">Updated: ${escapeHtml(formatDate(item.updatedAt))}</span>
        </div>
      </article>
    `).join("")
  );
}

function updateStats() {
  const businessStats = getBusinessStats(allBusinesses);
  const employeeStats = getEmployeeStats(allEmployees);

  setText("statBusinesses", String(businessStats.total));
  setText("statAccredited", String(businessStats.accredited));
  setText("statEmployees", String(employeeStats.total));
  setText("statActiveEmployees", String(employeeStats.active));
}

async function loadAllData() {
  allBusinesses = await getBusinesses();
  allEmployees = await getEmployees();

  updateStats();

  const businessQuery = document.getElementById("businessSearch")?.value || "";
  const employeeQuery = document.getElementById("employeeSearch")?.value || "";

  renderBusinesses(filterBusinesses(allBusinesses, businessQuery));
  renderEmployees(filterEmployees(allEmployees, employeeQuery));
}

function bindSearch() {
  document.getElementById("businessSearch")?.addEventListener("input", (event) => {
    renderBusinesses(filterBusinesses(allBusinesses, event.target.value));
  });

  document.getElementById("employeeSearch")?.addEventListener("input", (event) => {
    renderEmployees(filterEmployees(allEmployees, event.target.value));
  });
}

function bindActions() {
  const refreshBtn = document.getElementById("refreshBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const createBusinessBtn = document.getElementById("createBusinessBtn");
  const createEmployeeBtn = document.getElementById("createEmployeeBtn");

  refreshBtn?.addEventListener("click", async () => {
    try {
      setStatusBanner("Refreshing portal data...", "info");
      await ensureBaseCollections();
      await loadAllData();
      setStatusBanner("Portal data refreshed successfully.", "success");
      setText("firestoreStatusValue", "Ready");
      showToast("Portal refreshed.", "success");
    } catch (error) {
      console.error(error);
      setStatusBanner(error.message || "Refresh failed.", "error");
      setText("firestoreStatusValue", "Error");
      showToast(error.message || "Refresh failed.", "error");
    }
  });

  signOutBtn?.addEventListener("click", async () => {
    try {
      await logoutUser();
      showToast("Signed out successfully.", "success");
      window.location.href = "./index.html";
    } catch (error) {
      console.error(error);
      showToast(error.message || "Sign out failed.", "error");
    }
  });

  createBusinessBtn?.addEventListener("click", async () => {
    const name = document.getElementById("businessName")?.value || "";
    const status = document.getElementById("businessStatus")?.value || "";
    const standing = document.getElementById("businessStanding")?.value || "";
    const notes = document.getElementById("businessNotes")?.value || "";

    try {
      createBusinessBtn.disabled = true;
      setInlineMessage("businessMessage", "Creating business record...", "muted");

      await createBusinessRecord({ name, status, standing, notes });
      await loadAllData();

      setInlineMessage("businessMessage", "Business record created successfully.", "success");
      showToast("Business record created.", "success");

      document.getElementById("businessName").value = "";
      document.getElementById("businessStatus").value = "Accredited";
      document.getElementById("businessStanding").value = "Excellent";
      document.getElementById("businessNotes").value = "";
    } catch (error) {
      console.error(error);
      setInlineMessage("businessMessage", error.message || "Business creation failed.", "error");
      showToast(error.message || "Business creation failed.", "error");
    } finally {
      createBusinessBtn.disabled = false;
    }
  });

  createEmployeeBtn?.addEventListener("click", async () => {
    const employeeId = document.getElementById("employeeId")?.value || "";
    const displayName = document.getElementById("employeeName")?.value || "";
    const username = document.getElementById("employeeUsername")?.value || "";
    const role = document.getElementById("employeeRole")?.value || "";
    const department = document.getElementById("employeeDepartment")?.value || "";
    const status = document.getElementById("employeeStatus")?.value || "";

    try {
      createEmployeeBtn.disabled = true;
      setInlineMessage("employeeMessage", "Creating employee record...", "muted");

      await createEmployeeRecord({
        employeeId,
        displayName,
        username,
        role,
        department,
        status
      });

      await loadAllData();

      setInlineMessage("employeeMessage", "Employee record created successfully.", "success");
      showToast("Employee record created.", "success");

      document.getElementById("employeeId").value = "";
      document.getElementById("employeeName").value = "";
      document.getElementById("employeeUsername").value = "";
      document.getElementById("employeeRole").value = "Employee";
      document.getElementById("employeeDepartment").value = "";
      document.getElementById("employeeStatus").value = "Active";
    } catch (error) {
      console.error(error);
      setInlineMessage("employeeMessage", error.message || "Employee creation failed.", "error");
      showToast(error.message || "Employee creation failed.", "error");
    } finally {
      createEmployeeBtn.disabled = false;
    }
  });
}

async function initializeDashboard() {
  try {
    setStatusBanner("Initializing dashboard...", "info");
    setText("firestoreStatusValue", "Initializing");

    await ensureBaseCollections();
    await loadAllData();

    setText("firestoreStatusValue", "Ready");
    setStatusBanner("Dashboard initialized successfully.", "success");
  } catch (error) {
    console.error(error);
    setText("firestoreStatusValue", "Error");
    setStatusBanner(error.message || "Dashboard initialization failed.", "error");
    showToast(error.message || "Initialization failed.", "error");
  }
}

function initializeAuthGuard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./index.html";
      return;
    }

    setText("sessionBadge", "Authenticated Session");
    setText("authStatusValue", "Connected");
    setText("signedInUserValue", user.email || "Authenticated User");

    currentMember = await getMemberByAuthUid(user.uid);

    if (currentMember) {
      setText("roleValue", currentMember.role || "Member");
    } else {
      setText("roleValue", "Authenticated");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initializeAuthGuard();
  bindSearch();
  bindActions();
  await initializeDashboard();
});