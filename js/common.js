/** Shared UI utilities and route protection. Supabase is the only data source. */

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
  if (!publicPages.includes(currentPage) && sessionStorage.getItem("app_logged_in") !== "true") {
    window.location.replace("login.html");
    return;
  }
  if (currentPage === "login.html") return;

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
