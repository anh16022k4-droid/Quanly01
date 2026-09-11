import { supabase } from "./supabase.js";

const pad2 = value => String(value).padStart(2, "0");

let currentAttendanceFilter = "all";
let currentAttendanceSearch = "";
let attendanceList = [];
let selectedAttendanceDate = new URLSearchParams(window.location.search).get("date") || todayKey();
let attendanceCalendarDate = parseLocalDateInput(selectedAttendanceDate);
let selectedMonthDate = startOfMonthLocal(attendanceCalendarDate);
const MAX_RECENT_DAYS = 7;
const ACTIVE_ATTENDANCE_NAMES = ["Giới", "Khiêm"];

const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character]));
const formatMoney = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const dateKey = value => {
  if (value instanceof Date) return formatDateInput(value);
  return String(value || "").slice(0, 10);
};
function formatDateInput(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function parseLocalDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function startOfMonthLocal(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonthLocal(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
function todayKey() {
  return formatDateInput(new Date());
}
function formatDate(value) {
  const [year, month, day] = dateKey(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}
const formatMonthDisplay = date => `${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
function dayLabel(value) {
  const key = dateKey(value);
  const localToday = todayKey();
  const yesterday = dateKey(addDays(new Date(), -1));
  return key === localToday ? "Hôm nay" : key === yesterday ? "Hôm qua" : formatDate(key);
};

function renderAttendanceCalendar() {
  const title = document.getElementById("attendance-calendar-title");
  const days = document.getElementById("attendance-calendar-days");
  if (!title || !days) return;

  title.textContent = `Tháng ${formatMonthDisplay(attendanceCalendarDate)}`;
  const year = attendanceCalendarDate.getFullYear();
  const month = attendanceCalendarDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  let html = "";
  for (let index = 0; index < firstDay; index += 1) html += "<div></div>";

  for (let day = 1; day <= daysInMonth; day += 1) {
    const value = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const future = value > today;
    const active = value === selectedAttendanceDate;
    const classes = future ? "text-slate-300 cursor-not-allowed" : active ? "bg-blue-600 text-white font-extrabold scale-105" : "text-slate-700 hover:bg-blue-50 font-semibold";
    html += `<button type="button" ${future ? "disabled" : `onclick="selectAttendanceDate('${value}')"`} class="w-full aspect-square rounded-xl flex items-center justify-center text-xs transition ${classes}">${day}</button>`;
  }

  days.innerHTML = html;
}

function openAttendanceCalendar() {
  attendanceCalendarDate = startOfMonthLocal(selectedMonthDate);
  document.getElementById("attendance-calendar-modal")?.classList.remove("modal-hidden");
  renderAttendanceCalendar();
}

function closeAttendanceCalendar() {
  document.getElementById("attendance-calendar-modal")?.classList.add("modal-hidden");
}

function changeAttendanceMonth(delta) {
  attendanceCalendarDate = new Date(attendanceCalendarDate.getFullYear(), attendanceCalendarDate.getMonth() + delta, 1);
  renderAttendanceCalendar();
}

function selectAttendanceToday() {
  const today = new Date();
  selectedAttendanceDate = formatDateInput(today);
  selectedMonthDate = startOfMonthLocal(today);
  attendanceCalendarDate = startOfMonthLocal(today);
  updateMonthHeading();
  closeAttendanceCalendar();
  loadAttendanceData();
}

async function selectAttendanceDate(date) {
  if (date > todayKey()) return;
  selectedAttendanceDate = date;
  selectedMonthDate = startOfMonthLocal(parseLocalDateInput(date));
  const url = new URL(window.location.href);
  url.searchParams.set("date", date);
  window.history.replaceState({}, "", url);
  document.getElementById("attendance-month-label")?.replaceChildren(document.createTextNode(`Tháng ${formatMonthDisplay(selectedMonthDate)}`));
  document.getElementById("attendance-create-link")?.setAttribute("href", `attendance-create.html?date=${encodeURIComponent(date)}`);
  closeAttendanceCalendar();
  renderAttendanceCalendar();
  try {
    await loadAttendanceData();
    renderAttendancePage();
  } catch (error) {
    console.error("Không thể tải dữ liệu ngày chấm công:", error);
    const container = document.getElementById("attendance-cards-list");
    if (container) container.innerHTML = `<div class="text-center py-12 text-rose-500 text-sm">Không thể tải dữ liệu ngày đã chọn.</div>`;
  }
}

function changeSummaryMonth(delta) {
  const nextMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + delta, 1);
  if (nextMonth > new Date()) {
    return;
  }

  selectedMonthDate = nextMonth;
  updateMonthHeading();
  loadAttendanceData();
}

Object.assign(window, { openAttendanceCalendar, closeAttendanceCalendar, changeAttendanceMonth, selectAttendanceToday, selectAttendanceDate, changeSummaryMonth });

function updateMonthHeading() {
  const monthLabel = document.getElementById("attendance-month-label");
  const summaryTitle = document.getElementById("attendance-summary-title");
  if (monthLabel) monthLabel.replaceChildren(document.createTextNode(`Tháng ${formatMonthDisplay(selectedMonthDate)}`));
  if (summaryTitle) summaryTitle.replaceChildren(document.createTextNode(`THÁNG ${formatMonthDisplay(selectedMonthDate)}`));
}

async function loadAttendanceData() {
  updateMonthHeading();

  const activeEmployees = await fetchActiveEmployees();
  const activeEmployeeIds = activeEmployees.map(employee => String(employee.id));
  const monthStart = dateKey(startOfMonthLocal(selectedMonthDate));
  const monthEnd = dateKey(endOfMonthLocal(selectedMonthDate));

  if (!activeEmployeeIds.length) {
    attendanceList = [];
    window.supabaseAttendanceList = [];
    window.supabaseMonthAttendanceList = [];
    updateMonthSummary(0, 0, 0, []);
    renderAttendancePage();
    return;
  }

  const [monthAttendanceResult, monthTransactionsResult] = await Promise.all([
    supabase
      .from("attendance")
      .select(`
        id,
        employee_id,
        work_date,
        morning,
        afternoon,
        work_count,
        location,
        note,
        employees (
          id,
          name
        )
      `)
      .in("employee_id", activeEmployeeIds)
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .order("work_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("transaction_date, type, amount")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd)
      .order("transaction_date", { ascending: false })
  ]);

  if (monthAttendanceResult.error) throw monthAttendanceResult.error;
  if (monthTransactionsResult.error) throw monthTransactionsResult.error;

  const monthRows = monthAttendanceResult.data || [];
  const monthTransactions = monthTransactionsResult.data || [];

  const recentGroups = buildDailyGroups(monthRows, monthTransactions);
  attendanceList = recentGroups.slice(0, MAX_RECENT_DAYS);
  window.supabaseAttendanceList = attendanceList;

  const monthSummary = buildMonthSummary(monthRows, monthTransactions);
  window.supabaseMonthAttendanceList = monthSummary.dailyGroups;
  updateMonthSummary(monthSummary.totalWork, monthSummary.totalIncome, monthSummary.totalExpense, monthSummary.perWorker);
  renderAttendancePage();
}

async function fetchActiveEmployees() {
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, name, active")
    .eq("active", true)
    .in("name", ACTIVE_ATTENDANCE_NAMES)
    .order("name", { ascending: true });

  if (error) throw error;
  return employees || [];
}

function buildMonthSummary(rows, transactions) {
  const groupedByDate = new Map();
  const workers = new Map();

  rows.forEach(row => {
    const date = dateKey(row.work_date);
    const employeeName = row.employees?.name || "Nhân sự";
    const workCount = Number(row.work_count) || 0;

    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, {
        date,
        totalCong: 0,
        workers: []
      });
    }

    const group = groupedByDate.get(date);
    const workerEntry = {
      code: employeeName.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "NS",
      name: employeeName,
      sang: Boolean(row.morning),
      chieu: Boolean(row.afternoon),
      cong: workCount
    };

    group.totalCong += workCount;
    group.workers.push(workerEntry);

    if (!workers.has(employeeName)) {
      workers.set(employeeName, { name: employeeName, code: workerEntry.code, cong: 0, color: employeeName === "Giới" ? "blue" : "green" });
    }

    workers.get(employeeName).cong += workCount;
  });

  const dailyGroups = [...groupedByDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const totalWork = rows.reduce((sum, row) => sum + (Number(row.work_count) || 0), 0);
  const totalIncome = (transactions || []).reduce((sum, transaction) => sum + (transaction.type === "income" ? (Number(transaction.amount) || 0) : 0), 0);
  const totalExpense = (transactions || []).reduce((sum, transaction) => sum + (transaction.type === "expense" ? (Number(transaction.amount) || 0) : 0), 0);

  return {
    totalWork,
    totalIncome,
    totalExpense,
    dailyGroups,
    perWorker: [...workers.values()].sort((a, b) => b.cong - a.cong)
  };
}

function buildDailyGroups(rows, transactions) {
  const totals = buildTransactionTotals(transactions);
  const groupedByDate = new Map();

  rows.forEach(row => {
    const date = dateKey(row.work_date);
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, {
        date,
        dateLabel: dayLabel(date),
        note: "",
        location: row.location || "",
        thu: totals[date]?.thu || 0,
        chi: totals[date]?.chi || 0,
        totalCong: 0,
        workers: []
      });
    }

    const item = groupedByDate.get(date);
    if (!item.note && String(row.note || "").trim()) {
      item.note = String(row.note || "").trim();
    }

    const employeeName = row.employees?.name || "Nhân sự";
    const workCount = Number(row.work_count) || 0;
    item.totalCong += workCount;
    item.workers.push({
      code: employeeName.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "NS",
      name: employeeName,
      sang: Boolean(row.morning),
      chieu: Boolean(row.afternoon),
      cong: workCount
    });
  });

  const sorted = [...groupedByDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  return sorted;
}

function buildTransactionTotals(transactions) {
  return (transactions || []).reduce((result, transaction) => {
    const date = dateKey(transaction.transaction_date);
    result[date] ||= { thu: 0, chi: 0 };
    if (transaction.type === "income") result[date].thu += Number(transaction.amount) || 0;
    if (transaction.type === "expense") result[date].chi += Number(transaction.amount) || 0;
    return result;
  }, {});
}

function updateMonthSummary(totalWork, totalIncome, totalExpense, perWorker) {
  const element = document.getElementById("attendance-total-work");
  if (element) element.replaceChildren(document.createTextNode(totalWork.toFixed(1)));

  const incomeElement = document.getElementById("attendance-total-income");
  if (incomeElement) incomeElement.replaceChildren(document.createTextNode(`${formatMoney(totalIncome)} đ`));

  const expenseElement = document.getElementById("attendance-total-expense");
  if (expenseElement) expenseElement.replaceChildren(document.createTextNode(`${formatMoney(totalExpense)} đ`));

  const balanceElement = document.getElementById("attendance-total-balance");
  if (balanceElement) balanceElement.replaceChildren(document.createTextNode(`${formatMoney(totalIncome - totalExpense)} đ`));

  const accessTime = document.getElementById("attendance-access-time");
  if (accessTime) accessTime.replaceChildren(document.createTextNode(`Tổng công: ${totalWork.toFixed(1)} công`));

  const workerContainer = document.getElementById("per-worker-summary");
  if (workerContainer) {
    if (!perWorker.length) {
      workerContainer.innerHTML = `<p class="text-[11px] text-slate-400 italic text-center py-2">Chưa có dữ liệu</p>`;
      return;
    }

    const totalMonthWork = perWorker.reduce((sum, worker) => sum + (worker.cong || 0), 0) || 1;
    workerContainer.innerHTML = perWorker.map(worker => {
      const percent = Math.min(100, ((worker.cong || 0) / totalMonthWork) * 100);
      const avatarClass = worker.color === "green" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";
      return `
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-full ${avatarClass} text-[10px] font-bold flex items-center justify-center flex-shrink-0">${escapeHtml(worker.code)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-xs font-semibold text-slate-800 truncate">${escapeHtml(worker.name || "Nhân sự")}</span>
              <span class="text-xs font-extrabold text-blue-700 ml-2 flex-shrink-0">${(worker.cong || 0).toFixed(1)} công</span>
            </div>
            <div class="w-full bg-blue-100 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: ${percent.toFixed(0)}%"></div>
            </div>
          </div>
        </div>`;
    }).join("");
  }
}

function renderAttendancePage() {
  const container = document.getElementById("attendance-cards-list");
  if (!container) return;

  let filtered = [...attendanceList];
  const keyword = currentAttendanceSearch.trim().toLowerCase();

  if (keyword) {
    filtered = filtered.filter(item => {
      const matchesDate = item.date.includes(keyword);
      const matchesNote = (item.note || "").toLowerCase().includes(keyword);
      const matchesWorker = item.workers.some(worker => worker.name.toLowerCase().includes(keyword));
      return matchesDate || matchesNote || matchesWorker;
    });
  }

  if (currentAttendanceFilter !== "all") {
    filtered = filtered.filter(item => item.workers.some(worker => worker.name.includes(currentAttendanceFilter)));
  }

  if (!filtered.length) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-calendar-xmark text-4xl mb-3 text-slate-300"></i><p class="text-sm">Chưa có dữ liệu chấm công gần đây</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-4 cursor-pointer" data-date="${escapeHtml(item.date)}" onclick="window.location.href='attendance-create.html?date=${encodeURIComponent(item.date)}'">
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 text-[15px]">${escapeHtml(formatDate(item.date))}</span>
            ${item.dateLabel === "Hôm nay" ? '<span class="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Hôm nay</span>' : ""}
          </div>
        </div>
        <div class="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">${item.totalCong.toFixed(1)} công</div>
      </div>
      <div class="bg-slate-50/70 rounded-xl p-3 mb-3 space-y-2.5">
        ${item.workers.map(worker => `
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">${escapeHtml(worker.code)}</span>
              <span class="font-semibold text-slate-800 text-[13px]">${escapeHtml(worker.name)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[11px] ${worker.sang ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}">${worker.sang ? "Sáng" : "-"}</span>
              <span class="px-2 py-0.5 rounded text-[11px] ${worker.chieu ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}">${worker.chieu ? "Chiều" : "-"}</span>
              <span class="font-semibold text-slate-700 text-[12px]">${worker.cong.toFixed(1)} công</span>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100">
          <div class="text-[10px] text-emerald-700 font-medium">Tiền Thu</div>
          <div class="text-xs font-bold text-emerald-700">+${formatMoney(item.thu)} đ</div>
        </div>
        <div class="bg-rose-50/60 rounded-xl p-2.5 border border-rose-100">
          <div class="text-[10px] text-rose-700 font-medium">Tiền Chi</div>
          <div class="text-xs font-bold text-rose-700">-${formatMoney(item.chi)} đ</div>
        </div>
      </div>
      <div class="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 flex items-start gap-2 mb-3">
        <i class="fas fa-location-dot text-blue-500 text-xs mt-0.5"></i>
        <span>${escapeHtml(item.note || "Chưa có địa điểm")}</span>
      </div>
      <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <a href="attendance-create.html?date=${encodeURIComponent(item.date)}" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition">
          <i class="fas fa-pen text-blue-500"></i> Sửa
        </a>
      </div>
    </div>
  `).join("");
}

window.setAttendanceFilter = filter => {
  currentAttendanceFilter = filter;
  renderAttendancePage();
};

window.setAttendanceSearch = keyword => {
  currentAttendanceSearch = keyword;
  renderAttendancePage();
};

window.renderAttendancePage = renderAttendancePage;

window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("attendance-month-label")?.replaceChildren(document.createTextNode(`Tháng ${formatMonthDisplay(selectedMonthDate)}`));
  document.getElementById("attendance-summary-title")?.replaceChildren(document.createTextNode(`THÁNG ${formatMonthDisplay(selectedMonthDate)}`));
  document.getElementById("attendance-create-link")?.setAttribute("href", `attendance-create.html?date=${encodeURIComponent(selectedAttendanceDate || todayKey())}`);
  renderAttendanceCalendar();

  document.getElementById("attendance-prev-month")?.addEventListener("click", () => changeSummaryMonth(-1));
  document.getElementById("attendance-next-month")?.addEventListener("click", () => changeSummaryMonth(1));

  try {
    const activeEmployees = await fetchActiveEmployees();
    const filterCount = activeEmployees.length || 0;
    const allFilterLabel = document.getElementById("attendance-filter-all-label");
    if (allFilterLabel) {
      allFilterLabel.textContent = `Tất cả ${filterCount}`;
    }
    await loadAttendanceData();
  } catch (error) {
    console.error("Không thể tải danh sách chấm công từ Supabase:", error);
    const container = document.getElementById("attendance-cards-list");
    if (container) container.innerHTML = `<div class="text-center py-12 text-rose-500 text-sm">Không thể tải dữ liệu từ Supabase.</div>`;
  }
});
