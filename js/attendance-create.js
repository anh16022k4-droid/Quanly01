import { supabase } from "./supabase.js";

const vietnameseDays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const colors = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700"
];

let workersList = [];
let currentDate = new Date();
let calendarState = { year: currentDate.getFullYear(), month: currentDate.getMonth(), selectedDay: currentDate.getDate() };
let editingDate = "";
let isSaving = false;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
}[character]));

const formatDateInput = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = value => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const displayDate = value => {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const getEmployeeCode = employee => {
  const explicitCode = employee.code || employee.avatar_code || employee.avatar || employee.note;
  if (explicitCode) return String(explicitCode).slice(0, 3).toUpperCase();
  const nameParts = String(employee.name || "").trim().split(/\s+/).filter(Boolean);
  if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  return String(nameParts[0] || "NS").slice(0, 2).toUpperCase();
};

const getCurrentNote = () => document.getElementById("input-notes")?.value.trim() || "";
const getAmount = type => parseMoneyValue(document.getElementById(type === "thu" ? "input-thu" : "input-chi")?.value || "0");

function showError(message) {
  console.error(message);
  if (typeof showToast === "function") showToast(message, "error");
}

function getSupabaseErrorMessage(error, fallback) {
  if (error?.code === "42501" || /row-level security policy/i.test(error?.message || "")) {
    return "Supabase đang chặn quyền ghi. Hãy chạy file supabase-policies.sql trong SQL Editor.";
  }
  return error?.message ? `${fallback}: ${error.message}` : fallback;
}

function updateDateDisplay(date) {
  document.getElementById("display-date-text").textContent = displayDate(date);
  document.getElementById("display-day-of-week").textContent = vietnameseDays[date.getDay()];
}

async function loadEmployeesAndAttendance() {
  try {
    const { data: employees, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name");
    if (employeeError) throw employeeError;

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("work_date", editingDate);
    if (attendanceError) throw attendanceError;

    const { data: transactions, error: transactionError } = await supabase
      .from("transactions")
      .select("type, amount, note")
      .eq("transaction_date", editingDate);
    if (transactionError) throw transactionError;

    const rowsByEmployee = new Map((attendanceRows || []).map(row => [String(row.employee_id), row]));
    workersList = (employees || []).map((employee, index) => {
      const row = rowsByEmployee.get(String(employee.id));
      return {
        id: String(employee.id),
        code: getEmployeeCode(employee),
        name: employee.name || "Chưa đặt tên",
        color: colors[index % colors.length],
        selected: Boolean(row),
        sang: Boolean(row?.morning),
        chieu: Boolean(row?.afternoon),
        attendanceId: row?.id || null
      };
    });

    const firstNote = (attendanceRows || []).map(row => String(row.note || "").trim()).find(Boolean) || "";
    document.getElementById("input-notes").value = firstNote;
    const income = (transactions || []).find(transaction => transaction.type === "income");
    const expense = (transactions || []).find(transaction => transaction.type === "expense");
    document.getElementById("input-thu").value = formatMoneyDisplay(income?.amount || 0);
    document.getElementById("input-chi").value = formatMoneyDisplay(expense?.amount || 0);
    renderWorkers();
  } catch (error) {
    console.error("Không thể tải nhân sự/chấm công từ Supabase:", error);
    showError("Không thể tải dữ liệu chấm công. Kiểm tra kết nối hoặc quyền truy cập Supabase.");
  }
}

function renderWorkers() {
  const container = document.getElementById("workers-list-container");
  if (!container) return;
  if (workersList.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-4">Chưa có nhân sự đang hoạt động</p>`;
    recalcAttForm();
    return;
  }

  container.innerHTML = workersList.map(worker => {
    const workCount = worker.selected ? (worker.sang ? 0.5 : 0) + (worker.chieu ? 0.5 : 0) : 0;
    return `
      <div class="bg-blue-50/40 border border-blue-100 rounded-xl p-3 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input type="checkbox" ${worker.selected ? "checked" : ""} onchange="toggleWorkerCheck('${escapeHtml(worker.id)}', this.checked)" class="custom-checkbox"/>
            <span class="w-6 h-6 rounded-full ${worker.color} text-[10px] font-bold flex items-center justify-center">${escapeHtml(worker.code)}</span>
            <span class="font-bold text-slate-800 text-xs">${escapeHtml(worker.name)}</span>
            <button type="button" onclick="openEditWorkerModal('${escapeHtml(worker.id)}')" class="text-slate-400 hover:text-blue-600 p-0.5" title="Sửa">
              <i class="fas fa-pen text-[10px]"></i>
            </button>
          </div>
          <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${workCount.toFixed(1)} công</span>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <button type="button" onclick="toggleShiftBtn('${escapeHtml(worker.id)}', 'sang')" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${worker.sang ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}">
            <i class="fas ${worker.sang ? "fa-sun" : "fa-circle-minus"} text-xs"></i><span>${worker.sang ? "Sáng (0.5)" : "Sáng"}</span>
          </button>
          <button type="button" onclick="toggleShiftBtn('${escapeHtml(worker.id)}', 'chieu')" class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${worker.chieu ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}">
            <i class="fas ${worker.chieu ? "fa-sun" : "fa-circle-minus"} text-xs"></i><span>${worker.chieu ? "Chiều (0.5)" : "Chiều"}</span>
          </button>
        </div>
      </div>`;
  }).join("");
  recalcAttForm();
}

function recalcAttForm() {
  const selectedWorkers = workersList.filter(worker => worker.selected);
  const workCount = selectedWorkers.reduce((sum, worker) => sum + (worker.sang ? 0.5 : 0) + (worker.chieu ? 0.5 : 0), 0);
  const summary = document.getElementById("calc-summary");
  if (summary) {
    summary.innerHTML = `<div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold"><i class="fas fa-calculator"></i></div><div class="font-bold text-blue-950 text-[13px]">Tổng cộng: <span class="text-blue-600">${selectedWorkers.length} người làm</span> | <span class="text-blue-600">${workCount.toFixed(1)} công</span></div></div><div class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>`;
  }
}

function openCalendarModal() {
  calendarState = { year: currentDate.getFullYear(), month: currentDate.getMonth(), selectedDay: currentDate.getDate() };
  document.getElementById("modal-calendar").classList.remove("modal-hidden");
  renderCalendar();
}

function closeCalendarModal() { document.getElementById("modal-calendar").classList.add("modal-hidden"); }
function changeCalYear(delta) { calendarState.year += delta; renderCalendar(); }
function changeCalMonth(month) { calendarState.month = month; renderCalendar(); }
function selectCalToday() { const today = new Date(); calendarState = { year: today.getFullYear(), month: today.getMonth(), selectedDay: today.getDate() }; renderCalendar(); }
function isFutureCalendarDate(year, month, day) {
  const selected = new Date(year, month, day);
  selected.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected > today;
}

function selectCalDay(day) {
  if (isFutureCalendarDate(calendarState.year, calendarState.month, day)) {
    showError("Không thể chọn ngày trong tương lai.");
    return;
  }
  calendarState.selectedDay = day;
  renderCalendar();
}

function renderCalendar() {
  const { year, month, selectedDay } = calendarState;
  document.getElementById("cal-year-display").textContent = year;
  const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  const monthTabs = document.getElementById("cal-month-tabs");
  monthTabs.innerHTML = monthNames.map((name, index) => `<button onclick="changeCalMonth(${index})" class="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${index === month ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}">${name}</button>`).join("");
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let cells = "";
  for (let index = 0; index < firstDay; index += 1) cells += "<div></div>";
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekDay = new Date(year, month, day).getDay();
    const isFuture = isFutureCalendarDate(year, month, day);
    const selected = day === selectedDay;
    const classes = isFuture ? "text-slate-300 cursor-not-allowed" : selected ? "bg-blue-600 text-white shadow-md font-extrabold scale-110" : weekDay === 0 ? "text-rose-500 hover:bg-rose-50 font-semibold" : "text-slate-700 hover:bg-slate-100 font-semibold";
    cells += `<button type="button" ${isFuture ? "disabled" : `onclick="selectCalDay(${day})"`} class="w-full aspect-square rounded-xl flex items-center justify-center text-xs transition ${classes}">${day}</button>`;
  }
  document.getElementById("cal-days-grid").innerHTML = cells;
}

async function confirmCalendarDate() {
  if (isFutureCalendarDate(calendarState.year, calendarState.month, calendarState.selectedDay)) {
    showError("Không thể chọn ngày trong tương lai.");
    renderCalendar();
    return;
  }
  currentDate = new Date(calendarState.year, calendarState.month, calendarState.selectedDay);
  editingDate = formatDateInput(currentDate);
  updateDateDisplay(currentDate);
  closeCalendarModal();
  await loadEmployeesAndAttendance();
}

function openAddWorkerModal() {
  document.getElementById("worker-modal-title").textContent = "Thêm nhân sự mới";
  document.getElementById("edit-worker-id").value = "";
  document.getElementById("modal-worker-name").value = "";
  document.getElementById("modal-worker-code").value = "";
  document.getElementById("modal-worker-form").classList.remove("modal-hidden");
  document.getElementById("modal-worker-name").focus();
}

function openEditWorkerModal(id) {
  const worker = workersList.find(item => item.id === String(id));
  if (!worker) return;
  document.getElementById("worker-modal-title").textContent = "Chỉnh sửa nhân sự";
  document.getElementById("edit-worker-id").value = worker.id;
  document.getElementById("modal-worker-name").value = worker.name;
  document.getElementById("modal-worker-code").value = worker.code;
  document.getElementById("modal-worker-form").classList.remove("modal-hidden");
  document.getElementById("modal-worker-name").focus();
}

function closeWorkerModal() { document.getElementById("modal-worker-form").classList.add("modal-hidden"); }

const makeCodeFromName = name => name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "NS";

async function saveWorkerModal() {
  const name = document.getElementById("modal-worker-name").value.trim();
  const code = (document.getElementById("modal-worker-code").value.trim() || makeCodeFromName(name)).toUpperCase();
  const editId = document.getElementById("edit-worker-id").value;
  if (!name) return showError("Vui lòng nhập tên nhân sự.");

  try {
    const payload = { name, note: code, active: true, updated_at: new Date().toISOString() };
    if (editId) {
      const { error } = await supabase.from("employees").update(payload).eq("id", editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
    }
    closeWorkerModal();
    await loadEmployeesAndAttendance();
    showToast(editId ? `Đã cập nhật: ${name}` : `Đã thêm nhân sự: ${name}`, "success");
  } catch (error) {
    console.error("Không thể lưu nhân sự:", error);
    showError(getSupabaseErrorMessage(error, "Không thể lưu nhân sự vào Supabase."));
  }
}

function toggleWorkerCheck(id, checked) {
  const worker = workersList.find(item => item.id === String(id));
  if (worker) { worker.selected = checked; renderWorkers(); }
}

function toggleShiftBtn(id, shift) {
  const worker = workersList.find(item => item.id === String(id));
  if (worker) { worker[shift] = !worker[shift]; renderWorkers(); }
}

function parseMoneyValue(value) { return Number(String(value).replace(/\./g, "").replace(/[^0-9]/g, "")) || 0; }
function formatMoneyDisplay(value) { return new Intl.NumberFormat("vi-VN").format(Math.max(0, value)); }
function formatMoneyInput(input) { input.value = formatMoneyDisplay(parseMoneyValue(input.value)); }
function stepAmount(type, delta) {
  const input = document.getElementById(type === "thu" ? "input-thu" : "input-chi");
  if (input) input.value = formatMoneyDisplay(Math.max(0, parseMoneyValue(input.value) + delta));
}

async function syncTransaction(transactionDate, type, amount, note, attendanceId) {
  const description = type === "income" ? "Tiền thu trong ngày" : "Chi phí phát sinh";
  const { data: existing, error: lookupError } = await supabase.from("transactions").select("id").eq("transaction_date", transactionDate).eq("type", type).eq("description", description).order("created_at", { ascending: true });
  if (lookupError) throw lookupError;

  if (!amount) {
    if (existing?.length) {
      const { error } = await supabase.from("transactions").delete().in("id", existing.map(row => row.id));
      if (error) throw error;
    }
    return;
  }

  const payload = { transaction_date: transactionDate, type, amount, description, note: note || null, attendance_id: attendanceId || null };
  if (existing?.length) {
    const { error } = await supabase.from("transactions").update(payload).eq("id", existing[0].id);
    if (error) throw error;
    if (existing.length > 1) {
      const { error: duplicateError } = await supabase.from("transactions").delete().in("id", existing.slice(1).map(row => row.id));
      if (duplicateError) throw duplicateError;
    }
  } else {
    const { error } = await supabase.from("transactions").insert(payload);
    if (error) throw error;
  }
}

async function handleSaveAttendance() {
  if (isSaving) return;
  const activeWorkers = workersList.filter(worker => worker.selected && (worker.sang || worker.chieu));
  if (!activeWorkers.length) return showError("Vui lòng chọn ít nhất 1 nhân sự và 1 ca làm.");

  const button = document.querySelector(".action-bar-fixed button");
  isSaving = true;
  if (button) { button.disabled = true; button.querySelector("span").textContent = "Đang lưu..."; }

  try {
    const { data: existingRows, error: existingError } = await supabase.from("attendance").select("id, employee_id").eq("work_date", editingDate);
    if (existingError) throw existingError;
    const activeIds = activeWorkers.map(worker => worker.id);
    const removedIds = (existingRows || []).filter(row => !activeIds.includes(String(row.employee_id))).map(row => row.id);
    if (removedIds.length) {
      const { error } = await supabase.from("attendance").delete().in("id", removedIds);
      if (error) throw error;
    }

    const rows = activeWorkers.map(worker => ({
      employee_id: worker.id,
      work_date: editingDate,
      morning: Boolean(worker.sang),
      afternoon: Boolean(worker.chieu),
      work_count: (worker.sang ? 0.5 : 0) + (worker.chieu ? 0.5 : 0),
      location: null,
      note: getCurrentNote() || null,
      updated_at: new Date().toISOString()
    }));
    const { data: savedRows, error: attendanceError } = await supabase.from("attendance").upsert(rows, { onConflict: "employee_id,work_date" }).select("id");
    if (attendanceError) throw attendanceError;

    const attendanceId = savedRows?.[0]?.id || null;
    await syncTransaction(editingDate, "income", getAmount("thu"), getCurrentNote(), attendanceId);
    await syncTransaction(editingDate, "expense", getAmount("chi"), getCurrentNote(), attendanceId);

    showToast("Lưu bản ghi chấm công thành công!", "success");
    setTimeout(() => { window.location.href = "attendance.html"; }, 700);
  } catch (error) {
    console.error("Không thể lưu chấm công:", error);
    showError(getSupabaseErrorMessage(error, "Không thể lưu chấm công."));
    isSaving = false;
    if (button) { button.disabled = false; button.querySelector("span").textContent = "Lưu chấm công"; }
  }
}

function exposeHandlers() {
  Object.assign(window, { openCalendarModal, closeCalendarModal, changeCalYear, changeCalMonth, selectCalToday, selectCalDay, confirmCalendarDate, toggleWorkerCheck, toggleShiftBtn, openAddWorkerModal, openEditWorkerModal, closeWorkerModal, saveWorkerModal, handleSaveAttendance, stepAmount, formatMoneyInput });
}

document.addEventListener("DOMContentLoaded", async () => {
  exposeHandlers();
  const queryDate = new URLSearchParams(window.location.search).get("date");
  const parsedDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? parseDateInput(queryDate) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate > today) {
    showError("Không thể chấm công cho ngày trong tương lai.");
    window.location.replace("attendance.html");
    return;
  }
  currentDate = parsedDate;
  editingDate = formatDateInput(currentDate);
  updateDateDisplay(currentDate);
  document.getElementById("input-thu").value = "0";
  document.getElementById("input-chi").value = "0";
  await loadEmployeesAndAttendance();
});
