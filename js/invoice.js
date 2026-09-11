import { supabase } from "./supabase.js";

let invoices = [];
const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
const invoiceId = () => new URLSearchParams(window.location.search).get("id");

async function loadInvoices() {
  const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  invoices = data || [];
  window.supabaseInvoices = invoices;
}

function totalOf(invoice) { return Number(invoice.total_amount ?? invoice.totalAmount ?? invoice.amount) || 0; }
function advanceOf(invoice) { return Number(invoice.advance_amount ?? invoice.advanceAmount) || 0; }
function remainingOf(invoice) { return Math.max(0, totalOf(invoice) - advanceOf(invoice)); }
function isPaid(invoice) { return remainingOf(invoice) === 0 && totalOf(invoice) > 0; }

function renderInvoicesPage() {
  const container = document.getElementById("invoices-list-container");
  if (!container) return;
  const filter = window.currentInvoiceFilter || "all";
  const search = String(window.currentInvoiceSearch || "").toLowerCase().trim();
  const filtered = invoices.filter(invoice => {
    if (filter === "paid" && !isPaid(invoice)) return false;
    if (filter === "debt" && isPaid(invoice)) return false;
    return !search || String(invoice.client || invoice.customer_name || "").toLowerCase().includes(search) || String(invoice.code || invoice.id).toLowerCase().includes(search);
  });
  const statusCount = document.getElementById("invoice-status-count");
  if (statusCount) statusCount.textContent = `Đang hiển thị ${filtered.length}/${invoices.length} hóa đơn`;
  const total = invoices.reduce((sum, invoice) => sum + totalOf(invoice), 0);
  const paid = invoices.reduce((sum, invoice) => sum + Math.min(totalOf(invoice), advanceOf(invoice)), 0);
  const remaining = invoices.reduce((sum, invoice) => sum + remainingOf(invoice), 0);
  const totalElement = document.getElementById("stat-total-money");
  const paidElement = document.getElementById("stat-total-paid");
  const remainingElement = document.getElementById("stat-total-remaining");
  if (totalElement) totalElement.textContent = `${(total / 1000000).toFixed(1)}M`;
  if (paidElement) paidElement.textContent = `${(paid / 1000000).toFixed(1)}M`;
  if (remainingElement) remainingElement.textContent = `${(remaining / 1000000).toFixed(1)}M`;
  document.getElementById("stat-sub-total") && (document.getElementById("stat-sub-total").textContent = `${money(total)} đ`);
  document.getElementById("stat-sub-paid") && (document.getElementById("stat-sub-paid").textContent = `${money(paid)} đ`);
  document.getElementById("stat-sub-remaining") && (document.getElementById("stat-sub-remaining").textContent = `${money(remaining)} đ`);
  if (!filtered.length) { container.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-file-invoice text-4xl mb-3 text-slate-300"></i><p class="text-xs">Chưa có hóa đơn</p></div>`; return; }
  container.innerHTML = filtered.map(invoice => `<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-3.5"><div class="flex items-center justify-between mb-2"><span class="font-black text-slate-900 text-sm">${escapeHtml(invoice.code || invoice.id)}</span><span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isPaid(invoice) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}">${isPaid(invoice) ? "Đã thanh toán" : `Còn nợ ${money(remainingOf(invoice))} đ`}</span></div><h3 class="font-extrabold text-slate-900 text-base mb-0.5">${escapeHtml(invoice.client || invoice.customer_name || "Chưa có khách hàng")}</h3><p class="text-[11px] text-slate-400 mb-2.5">Lập ngày: ${escapeHtml(invoice.invoice_date || invoice.date || "")}</p><p class="text-xs text-slate-600 mb-3">${escapeHtml(invoice.description || invoice.desc || "")}</p><div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center text-xs mb-3"><div><span class="text-[10px] text-slate-400 block">Tổng tiền</span><span class="font-bold text-slate-800 text-[11px]">${money(totalOf(invoice))} đ</span></div><div><span class="text-[10px] text-slate-400 block">Đã thu</span><span class="font-bold text-emerald-600 text-[11px]">${money(Math.min(totalOf(invoice), advanceOf(invoice)))} đ</span></div><div><span class="text-[10px] text-slate-400 block">Còn lại</span><span class="font-bold text-slate-600 text-[11px]">${money(remainingOf(invoice))} đ</span></div></div><div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-xs"><a href="invoice-detail.html?id=${encodeURIComponent(invoice.id)}" class="py-1.5 px-3 rounded-lg bg-blue-50 text-blue-700 font-bold">Xem chi tiết</a><a href="invoice-create.html?id=${encodeURIComponent(invoice.id)}" class="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold">Sửa</a></div></div>`).join("");
}

function recalculateCreateInvoice() {
  const total = [...document.querySelectorAll(".item-july, .item-august")].reduce((sum, row) => sum + (Number(row.querySelector(".input-qty")?.value) || 0) * (Number(row.querySelector(".input-price")?.value) || 0), 0);
  const advance = document.getElementById("switch-advance")?.checked ? Number(document.getElementById("input-advance-amount")?.value) || 0 : 0;
  document.querySelectorAll(".item-july, .item-august").forEach(row => { const target = row.querySelector(".display-line-total"); if (target) target.textContent = `${money((Number(row.querySelector(".input-qty")?.value) || 0) * (Number(row.querySelector(".input-price")?.value) || 0))} đ`; });
  const values = { "display-july-total": 0, "display-august-total": 0, "display-total-services": total, "display-deduct-advance": -advance, "display-final-remaining": Math.max(0, total - advance) };
  Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = `${money(value)}${id === "display-final-remaining" ? "" : " đ"}`; });
}

async function handleSaveInvoice() {
  const client = document.getElementById("cust-name")?.value.trim();
  if (!client) return showToast("Vui lòng nhập tên khách hàng.", "error");
  const id = invoiceId();
  const total = [...document.querySelectorAll(".item-july, .item-august")].reduce((sum, row) => sum + (Number(row.querySelector(".input-qty")?.value) || 0) * (Number(row.querySelector(".input-price")?.value) || 0), 0);
  const advance = document.getElementById("switch-advance")?.checked ? Number(document.getElementById("input-advance-amount")?.value) || 0 : 0;
  const payload = { client, address: document.getElementById("cust-address")?.value || null, phone: document.getElementById("cust-phone")?.value || null, description: document.querySelector('input[value="Bảng chi tiết sửa chữa & gia công lắp đặt"]')?.value || null, total_amount: total, advance_amount: advance, remaining_amount: Math.max(0, total - advance), invoice_date: document.getElementById("cust-date")?.value || null, updated_at: new Date().toISOString() };
  try {
    const result = id ? await supabase.from("invoices").update(payload).eq("id", id).select().single() : await supabase.from("invoices").insert(payload).select().single();
    if (result.error) throw result.error;
    const savedInvoice = result.data;
    const itemRows = [...document.querySelectorAll(".item-july, .item-august")].map(row => ({
      invoice_id: savedInvoice.id,
      name: row.querySelector("input[type='text']")?.value.trim() || null,
      quantity: Number(row.querySelector(".input-qty")?.value) || 0,
      unit_price: Number(row.querySelector(".input-price")?.value) || 0,
      total: (Number(row.querySelector(".input-qty")?.value) || 0) * (Number(row.querySelector(".input-price")?.value) || 0)
    }));
    if (id) {
      const { error: deleteItemsError } = await supabase.from("invoice_items").delete().eq("invoice_id", savedInvoice.id);
      if (deleteItemsError) throw deleteItemsError;
    }
    if (itemRows.length) {
      const { error: itemError } = await supabase.from("invoice_items").insert(itemRows);
      if (itemError) throw itemError;
    }
    showToast("Đã lưu hóa đơn.", "success");
    setTimeout(() => { window.location.href = "invoices.html"; }, 700);
  } catch (error) { console.error("Không thể lưu hóa đơn:", error); showToast("Không thể lưu hóa đơn vào Supabase.", "error"); }
}

async function loadInvoiceForm() {
  const id = invoiceId();
  const rows = [...document.querySelectorAll(".item-july, .item-august")];
  if (!id) {
    rows.forEach(row => row.remove());
    document.getElementById("invoice-item-count")?.replaceChildren(document.createTextNode("0 hạng mục"));
    return;
  }
  const { data: invoice, error: invoiceError } = await supabase.from("invoices").select("*").eq("id", id).single();
  if (invoiceError) throw invoiceError;
  const { data: items, error: itemError } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("created_at");
  if (itemError) throw itemError;
  document.getElementById("cust-name").value = invoice.client || invoice.customer_name || "";
  document.getElementById("cust-address").value = invoice.address || "";
  document.getElementById("cust-phone").value = invoice.phone || "";
  document.getElementById("cust-date").value = invoice.invoice_date || invoice.date || "";
  document.getElementById("invoice-code").textContent = invoice.code || invoice.id;
  document.getElementById("invoice-description").value = invoice.description || "";
  document.getElementById("input-advance-amount").value = invoice.advance_amount || 0;
  rows.forEach((row, index) => {
    const item = items?.[index];
    if (!item) return row.remove();
    row.style.display = "";
    const nameInput = row.querySelector("input[type='text']");
    const quantityInput = row.querySelector(".input-qty");
    const priceInput = row.querySelector(".input-price");
    if (nameInput) nameInput.value = item.name || item.description || "";
    if (quantityInput) quantityInput.value = item.quantity || item.qty || 0;
    if (priceInput) priceInput.value = item.unit_price || item.price || 0;
  });
  document.getElementById("invoice-item-count")?.replaceChildren(document.createTextNode(`${items?.length || 0} hạng mục`));
}

window.renderInvoicesPage = renderInvoicesPage;
window.recalculateCreateInvoice = recalculateCreateInvoice;
window.handleSaveInvoice = handleSaveInvoice;
window.loadInvoiceForm = loadInvoiceForm;
window.setInvoiceFilter = (filter, element) => { window.currentInvoiceFilter = filter; document.querySelectorAll(".btn-inv-filter").forEach(button => button.classList.remove("bg-blue-600", "text-white")); element.classList.add("bg-blue-600", "text-white"); renderInvoicesPage(); };

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (document.getElementById("invoices-list-container")) { await loadInvoices(); renderInvoicesPage(); }
    if (document.querySelector(".item-july, .item-august")) { await loadInvoiceForm(); recalculateCreateInvoice(); }
  } catch (error) { console.error("Không thể tải hóa đơn từ Supabase:", error); document.getElementById("invoices-list-container")?.replaceChildren(document.createTextNode("Không thể tải hóa đơn.")); }
});
