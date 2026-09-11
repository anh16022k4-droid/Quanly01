import { supabase } from "./supabase.js";

const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
const dateKey = value => String(value || "").slice(0, 10);
const pad2 = value => String(value).padStart(2, "0");

function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function emptyState(text) { return `<div class="text-center py-6 text-slate-400 text-xs">${escapeHtml(text)}</div>`; }

function currentMonthDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function formatMonthLabel(date) {
  return `Tháng ${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseMonthKey(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return currentMonthDate();
  }

  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1, 12, 0, 0, 0);
}

function getSelectedMonthDate() {
  const params = new URLSearchParams(window.location.search);
  const param = params.get("month");
  const selected = parseMonthKey(param);
  const today = currentMonthDate();

  if (selected > today) {
    return today;
  }

  return selected;
}

function updateUrlMonth(date) {
  const url = new URL(window.location.href);
  url.searchParams.set("month", formatMonthKey(date));
  window.history.replaceState({}, "", url);
}

function buildMonthOptions(selectedDate) {
  const select = document.getElementById("home-month-select");
  const today = currentMonthDate();

  if (!select) return;

  const earliestDate = new Date(2024, 0, 1, 12, 0, 0, 0);
  const options = [];

  for (let year = earliestDate.getFullYear(); year <= today.getFullYear(); year += 1) {
    const maxMonth = year === today.getFullYear() ? today.getMonth() : 11;

    for (let month = 0; month <= maxMonth; month += 1) {
      const date = new Date(year, month, 1, 12, 0, 0, 0);
      options.push({ value: formatMonthKey(date), label: formatMonthLabel(date) });
    }
  }

  select.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join("");
  select.value = formatMonthKey(selectedDate);
}

function updateMonthControls(selectedDate) {
  const label = document.getElementById("home-month-label");
  const select = document.getElementById("home-month-select");
  const prevButton = document.getElementById("home-month-prev");
  const nextButton = document.getElementById("home-month-next");
  const currentButton = document.getElementById("home-current-month-button");
  const today = currentMonthDate();
  const earliestDate = new Date(2024, 0, 1, 12, 0, 0, 0);

  if (label) {
    label.textContent = formatMonthLabel(selectedDate);
  }

  if (select) {
    const key = formatMonthKey(selectedDate);
    if (!select.querySelector(`option[value="${key}"]`)) {
      buildMonthOptions(selectedDate);
    }
    select.value = key;
  }

  if (prevButton) {
    prevButton.disabled = selectedDate.getTime() <= earliestDate.getTime();
  }

  if (nextButton) {
    nextButton.disabled = selectedDate.getTime() >= today.getTime();
  }

  if (currentButton) {
    currentButton.disabled = selectedDate.getTime() === today.getTime();
  }
}

function setLoadingState(loading) {
  const status = document.getElementById("home-loading-status");
  if (!status) return;
  status.textContent = loading ? "Đang tải dữ liệu..." : "";
  status.classList.toggle("hidden", !loading);
}

async function applyMonthSelection(monthKey) {
  const selectedDate = parseMonthKey(monthKey);
  const today = currentMonthDate();

  if (selectedDate > today) {
    return;
  }

  updateUrlMonth(selectedDate);
  updateMonthControls(selectedDate);
  await loadHomeData();
}

async function loadHomeData() {
  const selectedDate = getSelectedMonthDate();
  const monthStart = `${formatMonthKey(selectedDate)}-01`;
  const nextMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1, 12, 0, 0, 0);
  const nextMonthStart = `${formatMonthKey(nextMonthDate)}-01`;
  const monthEndKey = `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())}`;

  updateUrlMonth(selectedDate);
  updateMonthControls(selectedDate);
  setLoadingState(true);

  try {
    const [attendanceResult, transactionResult, invoiceResult] = await Promise.all([
      supabase
        .from("attendance")
        .select("id, employee_id, work_date, work_count, morning, afternoon, note, employees(name)")
        .gte("work_date", monthStart)
        .lt("work_date", nextMonthStart)
        .order("work_date", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", monthStart)
        .lt("transaction_date", nextMonthStart)
        .order("transaction_date", { ascending: false }),
      supabase.from("invoices").select("*")
    ]);

    if (attendanceResult.error) throw attendanceResult.error;
    if (transactionResult.error) throw transactionResult.error;
    if (invoiceResult.error) throw invoiceResult.error;

    const attendance = attendanceResult.data || [];
    const transactions = transactionResult.data || [];
    const invoices = invoiceResult.data || [];

    const monthInvoices = invoices.filter(invoice => {
      const fallbackDate = invoice.invoice_date || invoice.created_at || invoice.date || invoice.updated_at || "";
      const invoiceDate = dateKey(fallbackDate);
      if (!invoiceDate) return false;
      return invoiceDate >= monthStart && invoiceDate <= monthEndKey;
    });

    const totalWork = attendance.reduce((sum, row) => sum + (Number(row.work_count) || 0), 0);
    const totalIncome = transactions.filter(row => row.type === "income").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const totalExpense = transactions.filter(row => row.type === "expense").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    setText("home-total-work", `${totalWork.toFixed(1)} công`);
    setText("home-total-income", `+${money(totalIncome)} đ`);
    setText("home-total-expense", `-${money(totalExpense)} đ`);
    setText("home-balance", `${money(totalIncome - totalExpense)} đ`);

    renderRecentAttendance(attendance);
    renderRecentInvoices(monthInvoices);
    setLoadingState(false);
  } catch (error) {
    console.error("Không thể tải dashboard theo tháng:", error);
    setLoadingState(false);
    setText("home-total-work", "0.0 công");
    setText("home-total-income", "+0 đ");
    setText("home-total-expense", "-0 đ");
    setText("home-balance", "0 đ");

    const attendanceElement = document.getElementById("home-recent-attendance");
    const invoiceElement = document.getElementById("home-recent-invoices");
    if (attendanceElement) attendanceElement.innerHTML = emptyState("Không thể tải dữ liệu");
    if (invoiceElement) invoiceElement.innerHTML = emptyState("Không thể tải dữ liệu");
  }
}

function renderRecentAttendance(rows) {
  const element = document.getElementById("home-recent-attendance");
  if (!element) return;

  const grouped = new Map();
  rows.forEach(row => {
    const date = dateKey(row.work_date);
    if (!grouped.has(date)) grouped.set(date, { date, total: 0, workers: [] });

    const item = grouped.get(date);
    item.total += Number(row.work_count) || 0;

    if (row.employees?.name) {
      item.workers.push(row.employees.name);
    }
  });

  const recent = [...grouped.values()].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 3);

  if (!recent.length) {
    element.innerHTML = emptyState("Chưa có dữ liệu chấm công");
    return;
  }

  element.innerHTML = recent.map(item => `<a href="attendance-create.html?date=${encodeURIComponent(item.date)}" class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-200 hover:shadow-sm mb-3 block cursor-pointer transition"><div class="flex items-center justify-between"><div><span class="font-bold text-slate-800 text-[14px]">${escapeHtml(item.date)}</span><div class="text-xs text-slate-500 mt-1">${escapeHtml([...new Set(item.workers)].join(" & "))}</div></div><div class="flex items-center gap-2"><span class="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">${item.total.toFixed(1)} công</span><i class="fas fa-chevron-right text-slate-300 text-xs"></i></div></div></a>`).join("");
}

function renderRecentInvoices(rows) {
  const element = document.getElementById("home-recent-invoices");
  if (!element) return;

  const recent = rows
    .slice()
    .sort((first, second) => {
      const firstKey = dateKey(first.invoice_date || first.created_at || first.date || first.updated_at || "");
      const secondKey = dateKey(second.invoice_date || second.created_at || second.date || second.updated_at || "");
      return secondKey.localeCompare(firstKey);
    })
    .slice(0, 3);

  if (!recent.length) {
    element.innerHTML = emptyState("Chưa có hóa đơn");
    return;
  }

  element.innerHTML = recent.map(invoice => `<a href="invoice-detail.html?id=${encodeURIComponent(invoice.id)}" class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-200 hover:shadow-sm mb-3 flex items-center justify-between block cursor-pointer transition"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><i class="fas fa-file-invoice text-lg"></i></div><div><div class="font-bold text-blue-600 text-xs">${escapeHtml(invoice.code || invoice.id)}</div><div class="font-semibold text-slate-800 text-sm">${escapeHtml(invoice.client || invoice.customer_name || "Hóa đơn")}</div><div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(dateKey(invoice.invoice_date || invoice.created_at || invoice.date || invoice.updated_at || ""))}</div></div></div><div class="flex items-center gap-2"><div class="text-right font-bold text-slate-900 text-sm">${money(invoice.total_amount ?? invoice.totalAmount)} đ</div><i class="fas fa-chevron-right text-slate-300 text-xs"></i></div></a>`).join("");
}

function bindHomeMonthControls() {
  const select = document.getElementById("home-month-select");
  const prevButton = document.getElementById("home-month-prev");
  const nextButton = document.getElementById("home-month-next");
  const currentButton = document.getElementById("home-current-month-button");

  if (select) {
    select.addEventListener("change", event => {
      const monthKey = event.target.value;
      if (monthKey) {
        applyMonthSelection(monthKey);
      }
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const selectedDate = getSelectedMonthDate();
      const previousMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1, 12, 0, 0, 0);
      applyMonthSelection(formatMonthKey(previousMonth));
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const selectedDate = getSelectedMonthDate();
      const today = currentMonthDate();
      const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1, 12, 0, 0, 0);
      if (nextMonth > today) return;
      applyMonthSelection(formatMonthKey(nextMonth));
    });
  }

  if (currentButton) {
    currentButton.addEventListener("click", () => {
      applyMonthSelection(formatMonthKey(currentMonthDate()));
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  bindHomeMonthControls();
  const selectedDate = getSelectedMonthDate();
  buildMonthOptions(selectedDate);
  updateMonthControls(selectedDate);

  try {
    await loadHomeData();
  } catch (error) {
    console.error("Không thể tải dashboard từ Supabase:", error);
    const attendanceElement = document.getElementById("home-recent-attendance");
    const invoiceElement = document.getElementById("home-recent-invoices");
    if (attendanceElement) attendanceElement.innerHTML = emptyState("Không thể tải dữ liệu");
    if (invoiceElement) invoiceElement.innerHTML = emptyState("Không thể tải dữ liệu");
  }
});
