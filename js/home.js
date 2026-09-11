import { supabase } from "./supabase.js";

const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
const dateKey = value => String(value || "").slice(0, 10);

function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function emptyState(text) { return `<div class="text-center py-6 text-slate-400 text-xs">${escapeHtml(text)}</div>`; }

async function loadHomeData() {
  const [attendanceResult, transactionResult, invoiceResult] = await Promise.all([
    supabase.from("attendance").select("id, employee_id, work_date, work_count, employees(name)").order("work_date", { ascending: false }),
    supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
    supabase.from("invoices").select("*")
  ]);
  if (attendanceResult.error) throw attendanceResult.error;
  if (transactionResult.error) throw transactionResult.error;
  if (invoiceResult.error) throw invoiceResult.error;

  const attendance = attendanceResult.data || [];
  const transactions = transactionResult.data || [];
  const invoices = invoiceResult.data || [];
  const totalWork = attendance.reduce((sum, row) => sum + (Number(row.work_count) || 0), 0);
  const totalIncome = transactions.filter(row => row.type === "income").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const totalExpense = transactions.filter(row => row.type === "expense").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  setText("home-total-work", `${totalWork.toFixed(1)} công`);
  setText("home-total-income", `+${money(totalIncome)} đ`);
  setText("home-total-expense", `-${money(totalExpense)} đ`);
  setText("home-balance", `${money(totalIncome - totalExpense)} đ`);
  renderRecentAttendance(attendance);
  renderRecentInvoices(invoices);
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
    if (row.employees?.name) item.workers.push(row.employees.name);
  });
  const recent = [...grouped.values()].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 3);
  if (!recent.length) { element.innerHTML = emptyState("Chưa có dữ liệu chấm công"); return; }
  element.innerHTML = recent.map(item => `<a href="attendance-create.html?date=${encodeURIComponent(item.date)}" class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-200 hover:shadow-sm mb-3 block cursor-pointer transition"><div class="flex items-center justify-between"><div><span class="font-bold text-slate-800 text-[14px]">${escapeHtml(item.date)}</span><div class="text-xs text-slate-500 mt-1">${escapeHtml([...new Set(item.workers)].join(" & "))}</div></div><div class="flex items-center gap-2"><span class="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">${item.total.toFixed(1)} công</span><i class="fas fa-chevron-right text-slate-300 text-xs"></i></div></div></a>`).join("");
}

function renderRecentInvoices(rows) {
  const element = document.getElementById("home-recent-invoices");
  if (!element) return;
  const recent = rows.slice().sort((first, second) => String(second.invoice_date || second.date || second.created_at || "").localeCompare(String(first.invoice_date || first.date || first.created_at || ""))).slice(0, 3);
  if (!recent.length) { element.innerHTML = emptyState("Chưa có hóa đơn"); return; }
  element.innerHTML = recent.map(invoice => `<a href="invoice-detail.html?id=${encodeURIComponent(invoice.id)}" class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-200 hover:shadow-sm mb-3 flex items-center justify-between block cursor-pointer transition"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><i class="fas fa-file-invoice text-lg"></i></div><div><div class="font-bold text-blue-600 text-xs">${escapeHtml(invoice.code || invoice.id)}</div><div class="font-semibold text-slate-800 text-sm">${escapeHtml(invoice.client || invoice.customer_name || "Hóa đơn")}</div><div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(invoice.invoice_date || invoice.date || "")}</div></div></div><div class="flex items-center gap-2"><div class="text-right font-bold text-slate-900 text-sm">${money(invoice.total_amount ?? invoice.totalAmount)} đ</div><i class="fas fa-chevron-right text-slate-300 text-xs"></i></div></a>`).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  try { await loadHomeData(); }
  catch (error) {
    console.error("Không thể tải dashboard từ Supabase:", error);
    document.getElementById("home-recent-attendance").innerHTML = emptyState("Không thể tải dữ liệu");
    document.getElementById("home-recent-invoices").innerHTML = emptyState("Không thể tải dữ liệu");
  }
});
