import { supabase } from "./supabase.js";

let currentFinanceFilter = "all";
let financeRows = [];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

async function loadFinanceData() {
  const { data, error } = await supabase.from("transactions").select("*").order("transaction_date", { ascending: false });
  if (error) throw error;
  financeRows = data || [];
  window.supabaseTransactions = financeRows;
}

function renderFinancePage() {
  const container = document.getElementById("finance-transactions-list");
  if (!container) return;
  const typeFilter = currentFinanceFilter === "thu" ? "income" : currentFinanceFilter === "chi" ? "expense" : "all";
  const filtered = typeFilter === "all" ? financeRows : financeRows.filter(row => row.type === typeFilter);
  const income = financeRows.filter(row => row.type === "income");
  const expense = financeRows.filter(row => row.type === "expense");
  const incomeTotal = income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenseTotal = expense.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const balance = incomeTotal - expenseTotal;
  document.getElementById("finance-balance")?.replaceChildren(document.createTextNode(`${money(balance)} đ`));
  document.getElementById("finance-income")?.replaceChildren(document.createTextNode(`+${money(incomeTotal)} đ`));
  document.getElementById("finance-expense")?.replaceChildren(document.createTextNode(`-${money(expenseTotal)} đ`));
  document.getElementById("finance-income-count")?.replaceChildren(document.createTextNode(`${income.length} giao dịch`));
  document.getElementById("finance-expense-count")?.replaceChildren(document.createTextNode(`${expense.length} khoản chi`));
  document.getElementById("finance-member-count")?.replaceChildren(document.createTextNode("0 thành viên đồng quản lý"));
  const rate = incomeTotal ? Math.max(0, Math.min(100, (balance / incomeTotal) * 100)) : 0;
  const rateElement = document.getElementById("finance-balance-rate");
  const barElement = document.getElementById("finance-balance-bar");
  if (rateElement) rateElement.textContent = `${rate.toFixed(1)}%`;
  if (barElement) barElement.style.width = `${rate}%`;
  document.getElementById("count-all")?.replaceChildren(document.createTextNode(`(${financeRows.length})`));
  document.getElementById("count-thu")?.replaceChildren(document.createTextNode(`(${income.length})`));
  document.getElementById("count-chi")?.replaceChildren(document.createTextNode(`(${expense.length})`));
  if (!filtered.length) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400"><i class="fas fa-receipt text-3xl mb-2 text-slate-300"></i><p class="text-xs">Chưa có giao dịch</p></div>`;
    return;
  }
  container.innerHTML = filtered.map(row => {
    const isIncome = row.type === "income";
    return `<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-3 card-touchable"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"><span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isIncome ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}">${isIncome ? "THU" : "CHI"}</span><span class="text-[11px] text-slate-400">${escapeHtml(row.transaction_date)}</span></div><span class="font-bold text-[14px] ${isIncome ? "text-emerald-600" : "text-rose-600"}">${isIncome ? "+" : "-"}${money(row.amount)} đ</span></div><h4 class="font-bold text-slate-800 text-[14px] leading-snug">${escapeHtml(row.description || "Giao dịch")}</h4><div class="text-xs text-slate-500 pt-2 mt-2 border-t border-slate-50">${escapeHtml(row.note || "")}</div></div>`;
  }).join("");
}

window.setTabFilter = (filter, element) => {
  currentFinanceFilter = filter;
  document.querySelectorAll(".finance-tab").forEach(button => { button.className = "finance-tab flex-1 py-1.5 text-xs font-semibold text-slate-500 rounded-lg transition hover:text-slate-700"; });
  element.className = "finance-tab flex-1 py-1.5 text-xs font-bold text-blue-600 bg-white shadow-sm rounded-lg transition";
  renderFinancePage();
};
window.renderFinancePage = renderFinancePage;
document.addEventListener("DOMContentLoaded", async () => {
  try { await loadFinanceData(); renderFinancePage(); }
  catch (error) { console.error("Không thể tải giao dịch từ Supabase:", error); document.getElementById("finance-transactions-list").innerHTML = `<div class="text-center py-10 text-rose-500 text-xs">Không thể tải giao dịch.</div>`; }
});
