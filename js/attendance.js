import { supabase } from "./supabase.js";

let currentAttendanceFilter = "all";
let currentAttendanceSearch = "";
let attendanceList = [];
let selectedAttendanceDate = new URLSearchParams(window.location.search).get("date") || new Date().toISOString().slice(0, 10);
let attendanceCalendarDate = new Date(`${selectedAttendanceDate}T00:00:00`);

const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character]));
const formatMoney = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const dateKey = value => String(value || "").slice(0, 10);
const formatDate = value => {
  const [year, month, day] = dateKey(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};
const dayLabel = value => {
  const key = dateKey(value);
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return key === today ? "Hôm nay" : key === yesterday ? "Hôm qua" : formatDate(key);
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthTitle = date => new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(date);

function renderAttendanceCalendar() {
  const title = document.getElementById("attendance-calendar-title");
  const days = document.getElementById("attendance-calendar-days");
  if (!title || !days) return;
  title.textContent = `Tháng ${monthTitle(attendanceCalendarDate)}`;
  const year = attendanceCalendarDate.getFullYear();
  const month = attendanceCalendarDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();
  let html = "";
  for (let index = 0; index < firstDay; index += 1) html += "<div></div>";
  for (let day = 1; day <= daysInMonth; day += 1) {
    const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const future = value > today;
    const active = value === selectedAttendanceDate;
    const classes = future ? "text-slate-300 cursor-not-allowed" : active ? "bg-blue-600 text-white font-extrabold scale-105" : "text-slate-700 hover:bg-blue-50 font-semibold";
    html += `<button type="button" ${future ? "disabled" : `onclick="selectAttendanceDate('${value}')"`} class="w-full aspect-square rounded-xl flex items-center justify-center text-xs transition ${classes}">${day}</button>`;
  }
  days.innerHTML = html;
}

function openAttendanceCalendar() {
  document.getElementById("attendance-calendar-modal")?.classList.remove("modal-hidden");
  renderAttendanceCalendar();
}
function closeAttendanceCalendar() { document.getElementById("attendance-calendar-modal")?.classList.add("modal-hidden"); }
function changeAttendanceMonth(delta) { attendanceCalendarDate.setMonth(attendanceCalendarDate.getMonth() + delta); renderAttendanceCalendar(); }
function selectAttendanceToday() { const today = new Date(); selectedAttendanceDate = todayKey(); attendanceCalendarDate = today; selectAttendanceDate(selectedAttendanceDate); }
async function selectAttendanceDate(date) {
  if (date > todayKey()) return;
  selectedAttendanceDate = date;
  const url = new URL(window.location.href);
  url.searchParams.set("date", date);
  window.history.replaceState({}, "", url);
  document.getElementById("attendance-month-label")?.replaceChildren(document.createTextNode(`Ngày ${formatDate(date)}`));
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

Object.assign(window, { openAttendanceCalendar, closeAttendanceCalendar, changeAttendanceMonth, selectAttendanceToday, selectAttendanceDate });

async function loadAttendanceData() {
  const { data: rows, error: attendanceError } = await supabase
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
      created_at,
      updated_at,
      employees (
        id,
        name
      )
    `)
    .eq("work_date", selectedAttendanceDate)
    .order("work_date", { ascending: false });
  if (attendanceError) throw attendanceError;

  const { data: transactionRows, error: transactionError } = await supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("transaction_date", selectedAttendanceDate);
  if (transactionError) throw transactionError;
  const transactions = transactionRows || [];

  const totals = transactions.reduce((result, transaction) => {
    const date = dateKey(transaction.transaction_date);
    result[date] ||= { thu: 0, chi: 0 };
    if (transaction.type === "income") result[date].thu += Number(transaction.amount) || 0;
    if (transaction.type === "expense") result[date].chi += Number(transaction.amount) || 0;
    return result;
  }, {});

  const selectedRows = (rows || []).filter(row => dateKey(row.work_date) === selectedAttendanceDate);
  const selectedTransactions = transactions.filter(row => dateKey(row.transaction_date) === selectedAttendanceDate);
  const totalWork = selectedRows.reduce((sum, row) => sum + (Number(row.work_count) || 0), 0);
  const totalIncome = selectedTransactions.filter(row => row.type === "income").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const totalExpense = selectedTransactions.filter(row => row.type === "expense").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const currentMonth = formatDate(selectedAttendanceDate);
  const accessTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  document.getElementById("attendance-month-label")?.replaceChildren(document.createTextNode(`Tháng ${currentMonth}`));
  document.getElementById("attendance-summary-title")?.replaceChildren(document.createTextNode(`Tổng kết ngày ${currentMonth}`));
  document.getElementById("attendance-access-time")?.replaceChildren(document.createTextNode(`Truy cập lúc ${accessTime}`));
  document.getElementById("attendance-total-work")?.replaceChildren(document.createTextNode(totalWork.toFixed(1)));
  document.getElementById("attendance-total-income")?.replaceChildren(document.createTextNode(`${formatMoney(totalIncome)} đ`));
  document.getElementById("attendance-total-expense")?.replaceChildren(document.createTextNode(`${formatMoney(totalExpense)} đ`));
  document.getElementById("attendance-total-balance")?.replaceChildren(document.createTextNode(`${formatMoney(totalIncome - totalExpense)} đ`));

  const grouped = new Map();
  (rows || []).forEach(row => {
    const date = dateKey(row.work_date);
    if (!grouped.has(date)) grouped.set(date, {
      date, dateLabel: dayLabel(date), note: String(row.note || "").trim(),
      location: row.location || "", thu: totals[date]?.thu || 0,
      chi: totals[date]?.chi || 0, totalCong: 0, workers: []
    });
    const item = grouped.get(date);
    if (!item.note && row.note) item.note = String(row.note).trim();
    const employee = row.employees || {};
    const workCount = Number(row.work_count) || 0;
    item.totalCong += workCount;
    item.workers.push({
      code: String(employee.name || "NS").trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase(),
      name: employee.name || "Nhân sự", sang: Boolean(row.morning),
      chieu: Boolean(row.afternoon), cong: workCount
    });
  });
  grouped.forEach(item => {
    item.subDate = "";
  });
  attendanceList = [...grouped.values()];
  window.supabaseAttendanceList = attendanceList;
  document.dispatchEvent(new CustomEvent("supabase-attendance-loaded"));
}

function renderAttendancePage() {
  const container = document.getElementById("attendance-cards-list");
  if (!container) return;
  let filtered = attendanceList.filter(item => item.date === selectedAttendanceDate);
  const keyword = currentAttendanceSearch.trim().toLowerCase();
  if (keyword) filtered = filtered.filter(item => item.date.includes(keyword) || item.location.toLowerCase().includes(keyword) || item.workers.some(worker => worker.name.toLowerCase().includes(keyword)));
  if (currentAttendanceFilter !== "all") filtered = filtered.filter(item => item.workers.some(worker => worker.name.includes(currentAttendanceFilter)));
  if (!filtered.length) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-calendar-xmark text-4xl mb-3 text-slate-300"></i><p class="text-sm">Chưa có dữ liệu chấm công ngày ${escapeHtml(formatDate(selectedAttendanceDate))}</p><a href="attendance-create.html?date=${encodeURIComponent(selectedAttendanceDate)}" class="inline-flex mt-3 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl">Chấm công ngày này</a></div>`;
    return;
  }
  container.innerHTML = filtered.map(item => `
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-4">
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3"><div><div class="flex items-center gap-2"><span class="font-bold text-slate-800 text-[15px]">${escapeHtml(formatDate(item.date))}</span>${item.dateLabel === "Hôm nay" ? '<span class="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Hôm nay</span>' : ""}</div></div><div class="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">${item.totalCong.toFixed(1)} công</div></div>
      <div class="bg-slate-50/70 rounded-xl p-3 mb-3 space-y-2.5">${item.workers.map(worker => `<div class="flex items-center justify-between text-xs"><div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">${escapeHtml(worker.code)}</span><span class="font-semibold text-slate-800 text-[13px]">${escapeHtml(worker.name)}</span></div><div class="flex items-center gap-2"><span class="px-2 py-0.5 rounded text-[11px] ${worker.sang ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}">${worker.sang ? "Sáng" : "-"}</span><span class="px-2 py-0.5 rounded text-[11px] ${worker.chieu ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}">${worker.chieu ? "Chiều" : "-"}</span><span class="font-semibold text-slate-700 text-[12px]">${worker.cong.toFixed(1)} công</span></div></div>`).join("")}</div>
      <div class="grid grid-cols-2 gap-2 mb-3"><div class="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100"><div class="text-[10px] text-emerald-700 font-medium">Tiền Thu</div><div class="text-xs font-bold text-emerald-700">+${formatMoney(item.thu)} đ</div></div><div class="bg-rose-50/60 rounded-xl p-2.5 border border-rose-100"><div class="text-[10px] text-rose-700 font-medium">Tiền Chi</div><div class="text-xs font-bold text-rose-700">-${formatMoney(item.chi)} đ</div></div></div>
      <div class="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 flex items-start gap-2 mb-3"><i class="fas fa-location-dot text-blue-500 text-xs mt-0.5"></i><span>${escapeHtml(item.note || "Chưa có địa điểm")}</span></div>
      <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100"><a href="attendance-create.html?date=${encodeURIComponent(item.date)}" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition"><i class="fas fa-pen text-blue-500"></i> Sửa</a></div>
    </div>`).join("");
}

window.setAttendanceFilter = filter => { currentAttendanceFilter = filter; renderAttendancePage(); };
window.setAttendanceSearch = keyword => { currentAttendanceSearch = keyword; renderAttendancePage(); };
window.renderAttendancePage = renderAttendancePage;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("attendance-month-label")?.replaceChildren(document.createTextNode(`Ngày ${formatDate(selectedAttendanceDate)}`));
  document.getElementById("attendance-create-link")?.setAttribute("href", `attendance-create.html?date=${encodeURIComponent(selectedAttendanceDate)}`);
  renderAttendanceCalendar();
  try {
    await loadAttendanceData();
    renderAttendancePage();
  } catch (error) {
    console.error("Không thể tải danh sách chấm công từ Supabase:", error);
    const container = document.getElementById("attendance-cards-list");
    if (container) container.innerHTML = `<div class="text-center py-12 text-rose-500 text-sm">Không thể tải dữ liệu từ Supabase.</div>`;
  }
});
