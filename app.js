import { onAuthStateChanged } from "./firebase.js";
import { bootstrapOwnerAccount } from "./auth.js";
import {
  createBusinessRecord,
  ensureCollections,
  filterBusinesses,
  getBusinesses,
  getBusinessStats
} from "./business.js";
import {
  escapeHtml,
  formatDateTime,
  setInlineMessage,
  setStatusBanner,
  setText,
  showToast
} from "./ui.js";

let allBusinesses = [];
let currentUser = null;

function renderBusinesses(businesses) {
  const container = document.getElementById("businessList");
  if (!container) return;

  if (!businesses.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h4>No matching business records were found.</h4>
        <p>Try adjusting your search, or create the first record from the administrative panel.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = businesses
    .map((business) => {
      const createdAt = formatDateTime(business.createdAt);
      const updatedAt = formatDateTime(business.updatedAt);

      return `
        <article class="business-card">
          <h4>${escapeHtml(business.name || "Unnamed Business")}</h4>
          <div class="business-meta">
            <span class="meta-chip">Status: ${escapeHtml(business.status || "Unknown")}</span>
            <span class="meta-chip">Standing: ${escapeHtml(business.standing || "Unknown")}</span>
            <span class="meta-chip">ID: ${escapeHtml(business.businessId || business.id || "N/A")}</span>
          </div>
          <p>${escapeHtml(business.notes || "No administrative notes have been recorded.")}</p>
          <div class="business-meta" style="margin-top: 12px;">
            <span class="meta-chip">Created: ${escapeHtml(createdAt)}</span>
            <span class="meta-chip">Updated: ${escapeHtml(updatedAt)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateStats() {
  const stats = getBusinessStats(allBusinesses);
  setText("statTotalBusinesses", String(stats.total));
  setText("statAccredited", String(stats.accredited));
  setText("statGoodStanding", String(stats.goodStanding));
}

async function loadBusinesses() {
  allBusinesses = await getBusinesses();
  updateStats();

  const query = document.getElementById("businessSearch")?.value || "";
  renderBusinesses(filterBusinesses(allBusinesses, query));
}

function updateSessionUi(user) {
  if (user) {
    setText("sessionBadge", "Authenticated Session");
    setText("authStatusValue", "Connected");
    setText("signedInUserValue", user.email || "Authenticated User");
  } else {
    setText("sessionBadge", "Guest Session");
    setText("authStatusValue", "Not Signed In");
    setText("signedInUserValue", "None");
  }
}

function bindEvents() {
  const refreshBtn = document.getElementById("refreshBtn");
  const scrollBusinessesBtn = document.getElementById("scrollBusinessesBtn");
  const openBootstrapBtn = document.getElementById("openBootstrapBtn");
  const businessSearch = document.getElementById("businessSearch");
  const bootstrapSubmitBtn = document.getElementById("bootstrapSubmitBtn");
  const addBusinessBtn = document.getElementById("addBusinessBtn");

  refreshBtn?.addEventListener("click", async () => {
    try {
      setStatusBanner("Refreshing portal data...", "info");
      await ensureCollections();
      await loadBusinesses();
      setStatusBanner("Portal data refreshed successfully.", "success");
      setText("firestoreStatusValue", "Ready");
      showToast("Portal data refreshed.", "success");
    } catch (error) {
      console.error(error);
      setStatusBanner(error.message || "Refresh failed.", "error");
      setText("firestoreStatusValue", "Error");
      showToast(error.message || "Refresh failed.", "error");
    }
  });

  scrollBusinessesBtn?.addEventListener("click", () => {
    document.getElementById("businessesSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  openBootstrapBtn?.addEventListener("click", () => {
    document.getElementById("bootstrapPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  businessSearch?.addEventListener("input", (event) => {
    const query = event.target.value;
    renderBusinesses(filterBusinesses(allBusinesses, query));
  });

  bootstrapSubmitBtn?.addEventListener("click", async () => {
    const bootstrapKey = document.getElementById("bootstrapKey")?.value || "";
    const memberId = document.getElementById("ownerMemberId")?.value || "";
    const username = document.getElementById("ownerUsername")?.value || "";
    const email = document.getElementById("ownerEmail")?.value || "";
    const password = document.getElementById("ownerPassword")?.value || "";

    try {
      bootstrapSubmitBtn.disabled = true;
      setInlineMessage("bootstrapResult", "Creating owner account...", "muted");

      const user = await bootstrapOwnerAccount({
        bootstrapKey,
        memberId,
        username,
        email,
        password
      });

      currentUser = user;
      updateSessionUi(user);
      setText("roleValue", "Owner");
      setInlineMessage(
        "bootstrapResult",
        `Owner account created successfully for ${username}.`,
        "success"
      );
      setStatusBanner("Owner bootstrap completed successfully.", "success");
      showToast("Owner account created successfully.", "success");
    } catch (error) {
      console.error(error);
      setInlineMessage("bootstrapResult", error.message || "Bootstrap failed.", "error");
      setStatusBanner(error.message || "Bootstrap failed.", "error");
      showToast(error.message || "Bootstrap failed.", "error");
    } finally {
      bootstrapSubmitBtn.disabled = false;
    }
  });

  addBusinessBtn?.addEventListener("click", async () => {
    const name = document.getElementById("businessName")?.value || "";
    const status = document.getElementById("businessStatus")?.value || "";
    const standing = document.getElementById("businessStanding")?.value || "";
    const notes = document.getElementById("businessNotes")?.value || "";

    try {
      addBusinessBtn.disabled = true;
      setInlineMessage("businessResult", "Creating business record...", "muted");

      const businessId = await createBusinessRecord({
        name,
        status,
        standing,
        notes
      });

      await loadBusinesses();

      setInlineMessage(
        "businessResult",
        `Business record created successfully with ID "${businessId}".`,
        "success"
      );
      setStatusBanner("Business record created successfully.", "success");
      showToast("Business record created.", "success");

      document.getElementById("businessName").value = "";
      document.getElementById("businessStatus").value = "Accredited";
      document.getElementById("businessStanding").value = "Excellent";
      document.getElementById("businessNotes").value = "";
    } catch (error) {
      console.error(error);
      setInlineMessage("businessResult", error.message || "Failed to create business record.", "error");
      setStatusBanner(error.message || "Business creation failed.", "error");
      showToast(error.message || "Business creation failed.", "error");
    } finally {
      addBusinessBtn.disabled = false;
    }
  });
}

async function initializePortal() {
  try {
    setStatusBanner("Initializing portal systems...", "info");
    setText("firestoreStatusValue", "Initializing");

    await ensureCollections();

    setText("firestoreStatusValue", "Ready");
    setStatusBanner("Portal systems initialized successfully.", "success");

    await loadBusinesses();
  } catch (error) {
    console.error(error);
    setText("firestoreStatusValue", "Error");
    setStatusBanner(error.message || "Portal initialization failed.", "error");
    showToast(error.message || "Initialization failed.", "error");
  }
}

function initAuthListener() {
  onAuthStateChanged(authUser => {
    currentUser = authUser;
    updateSessionUi(authUser);

    if (authUser) {
      setText("roleValue", "Authenticated");
    } else {
      setText("roleValue", "Guest");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  initAuthListener();
  await initializePortal();
});