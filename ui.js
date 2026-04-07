function getToastContainer() {
  return document.getElementById("toastContainer");
}

export function showToast(message, type = "info") {
  const container = getToastContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

export function setStatusBanner(message, type = "info") {
  const banner = document.getElementById("systemStatus");
  if (!banner) return;

  banner.className = `status-banner ${type}`;
  banner.textContent = message;
}

export function setInlineMessage(id, message, type = "muted") {
  const el = document.getElementById(id);
  if (!el) return;

  el.className = `inline-message ${type}`;
  el.textContent = message;
}

export function formatDateTime(value) {
  if (!value) return "N/A";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString();
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
  } catch {
    return "N/A";
  }
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}