/** Shared UI utilities and route protection. Supabase is the only data source. */

const AUTH_STORAGE_KEY = "app_auth_session";
const AUTH_TTL_MS = 10 * 60 * 1000;

function getStoredAuth() {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) return null;
    return JSON.parse(rawValue);
  } catch (error) {
    console.error("Unable to parse auth session:", error);
    return null;
  }
}

function setStoredAuth(phone) {
  const payload = {
    loggedIn: true,
    loggedAt: Date.now(),
    phone
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem("app_logged_in");
  sessionStorage.removeItem("app_user_phone");
}

async function handleLogout() {
  console.log("[Auth] Logout started");
  console.log("[Auth] Current URL:", window.location.href);
  console.log("[Auth] Current pathname:", window.location.pathname);
  console.log("[Auth] Is iframe:", window.self !== window.top);

  try {
    const supabaseClient = window.supabase;
    if (supabaseClient?.auth?.signOut) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }

    clearStoredAuth();
    console.log("[Auth] Logout successful");

    const redirectTarget = "/";
    console.log("[Auth] Redirecting to:", new URL(redirectTarget, window.location.origin).href);

    if (window.top && window.top !== window) {
      console.log("[Auth] Redirecting top window to app root:", redirectTarget);
      window.top.location.href = redirectTarget;
    } else {
      console.log("[Auth] Redirecting current window to app root:", redirectTarget);
      window.location.href = redirectTarget;
    }
  } catch (error) {
    console.error("[Auth] Logout failed:", error);
    alert(`Không thể đăng xuất: ${error?.message || "Lỗi không xác định"}`);
  }
}

window.handleLogout = handleLogout;

function isAuthValid(auth = getStoredAuth()) {
  if (!auth || auth.loggedIn !== true || !auth.loggedAt) {
    return false;
  }

  const expiresAt = Number(auth.loggedAt) + AUTH_TTL_MS;
  return Date.now() < expiresAt;
}

function scheduleAutoLogout() {
  const auth = getStoredAuth();

  if (!isAuthValid(auth)) {
    clearStoredAuth();
    return;
  }

  if (window.__appAuthTimer) {
    clearTimeout(window.__appAuthTimer);
  }

  const remainingMs = Math.max(0, Number(auth.loggedAt) + AUTH_TTL_MS - Date.now());
  window.__appAuthTimer = setTimeout(() => {
    clearStoredAuth();
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    if (currentPage !== "login.html") {
      window.location.replace("/");
    }
  }, remainingMs + 50);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";
}

function showToast(message, type = "success") {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700 text-xs font-semibold pointer-events-none";
    toast.innerHTML = '<i id="toast-icon"></i><span id="toast-text"></span>';
    document.body.appendChild(toast);
  }
  document.getElementById("toast-text").textContent = message;
  const icon = document.getElementById("toast-icon");
  icon.className = type === "error" ? "fas fa-triangle-exclamation text-rose-400 text-base" : type === "info" ? "fas fa-circle-info text-blue-400 text-base" : "fas fa-circle-check text-emerald-400 text-base";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

document.addEventListener("DOMContentLoaded", async () => {
  const currentPage = window.location.pathname.split("/").pop().toLowerCase();
  const publicPages = ["", "index.html", "login.html"];

  if (currentPage === "login.html") {
    if (isAuthValid()) {
      window.location.replace("/pages/home.html");
      return;
    }
    return;
  }

  if (!publicPages.includes(currentPage) && !isAuthValid()) {
    clearStoredAuth();
    window.location.replace("/");
    return;
  }

  scheduleAutoLogout();

  const appContainer = document.querySelector(".app-container");
  if (!appContainer || appContainer.querySelector(".bottom-nav")) return;
  try {
    const response = await fetch("../components/bottom-nav.html");
    if (!response.ok) throw new Error(`Bottom navigation request failed: ${response.status}`);
    appContainer.insertAdjacentHTML("beforeend", await response.text());
    const pageName = currentPage.replace(".html", "") || "home";
    document.querySelectorAll(".bottom-nav .nav-item").forEach(item => {
      const active = item.dataset.page === pageName;
      item.classList.toggle("active", active);
      item.classList.toggle("text-blue-600", active);
      item.classList.toggle("text-slate-400", !active);
    });
  } catch (error) {
    console.error("Unable to load bottom navigation:", error);
  }
});
