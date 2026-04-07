export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function setHtml(id, value) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = value;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function setInlineMessage(id, message, type = "muted") {
  const element = document.getElementById(id);
  if (!element) return;

  element.className = `inline-message ${type}`;
  element.textContent = message;
}

export function setStatusBanner(message, type = "info") {
  const banner = document.getElementById("systemStatus");
  if (!banner) return;

  banner.className = `status-banner ${type}`;
  banner.textContent = message;
}

export function formatDate(value) {
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

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}