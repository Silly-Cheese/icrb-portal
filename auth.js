import { auth, onAuthStateChanged } from "./firebase.js";
import { bootstrapOwnerAccount, loginUser } from "./auth.js";
import { ensureBaseCollections } from "./business.js";
import { setInlineMessage, showToast } from "./ui.js";

function bindLogin() {
  const loginBtn = document.getElementById("loginBtn");

  loginBtn?.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail")?.value || "";
    const password = document.getElementById("loginPassword")?.value || "";

    try {
      loginBtn.disabled = true;
      setInlineMessage("loginMessage", "Signing in...", "muted");

      await loginUser(email, password);

      setInlineMessage("loginMessage", "Sign in successful. Redirecting...", "success");
      showToast("Sign in successful.", "success");
      window.location.href = "./portal.html";
    } catch (error) {
      console.error(error);
      setInlineMessage("loginMessage", error.message || "Sign in failed.", "error");
      showToast(error.message || "Sign in failed.", "error");
    } finally {
      loginBtn.disabled = false;
    }
  });
}

function bindBootstrap() {
  const bootstrapBtn = document.getElementById("bootstrapBtn");

  bootstrapBtn?.addEventListener("click", async () => {
    const bootstrapKey = document.getElementById("bootstrapKey")?.value || "";
    const memberId = document.getElementById("ownerMemberId")?.value || "";
    const username = document.getElementById("ownerUsername")?.value || "";
    const email = document.getElementById("ownerEmail")?.value || "";
    const password = document.getElementById("ownerPassword")?.value || "";

    try {
      bootstrapBtn.disabled = true;
      setInlineMessage("bootstrapMessage", "Creating owner account...", "muted");

      await bootstrapOwnerAccount({
        bootstrapKey,
        memberId,
        username,
        email,
        password
      });

      setInlineMessage("bootstrapMessage", "Owner account created successfully. Redirecting...", "success");
      showToast("Owner account created successfully.", "success");
      window.location.href = "./portal.html";
    } catch (error) {
      console.error(error);
      setInlineMessage("bootstrapMessage", error.message || "Bootstrap failed.", "error");
      showToast(error.message || "Bootstrap failed.", "error");
    } finally {
      bootstrapBtn.disabled = false;
    }
  });
}

async function initialize() {
  try {
    await ensureBaseCollections();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Initialization failed.", "error");
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "./portal.html";
    }
  });

  bindLogin();
  bindBootstrap();
}

document.addEventListener("DOMContentLoaded", initialize);