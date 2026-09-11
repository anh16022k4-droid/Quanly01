
async function handleQuickSaveInvoice(id, button) {
  if (!button || button.disabled) return;
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tạo PDF...`;
  try {
    const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true })
    ]);
    if (invoiceError) throw invoiceError;
    if (itemsError) throw itemsError;
    await window.downloadInvoicePdf(invoice, items || []);
    showToast("Đã tải PDF hóa đơn.", "success");
  } catch (error) {
    console.error("Không thể lưu nhanh hóa đơn:", error);
    showToast(`Không thể tạo PDF: ${error.message || "Lỗi không xác định"}`, "error");
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}
import { supabase } from "./supabase.js";

let invoices = [];
const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const invoiceId = () => new URLSearchParams(window.location.search).get("id");
const formatDate = value => { const parts = String(value || "").slice(0, 10).split("-"); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ""; };
const parseDate = value => { const match = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value || null; };
const today = () => { const date = new Date(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${date.getFullYear()}-${month}-${day}`; };
const totalOf = invoice => Number(invoice.total_amount) || 0;
const advanceOf = invoice => Number(invoice.advance_amount) || 0;
const remainingOf = invoice => Math.max(0, totalOf(invoice) - advanceOf(invoice));
const isPaid = invoice => remainingOf(invoice) === 0 && totalOf(invoice) > 0;

async function loadInvoices() {
  const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  invoices = data || [];
  window.supabaseInvoices = invoices;
}

function renderInvoicesPage() {
  const container = document.getElementById("invoices-list-container");
  if (!container) return;
  const filter = window.currentInvoiceFilter || "all";
  const search = String(window.currentInvoiceSearch || "").toLowerCase().trim();
  const filtered = invoices.filter(invoice => {
    if (filter === "paid" && !isPaid(invoice)) return false;
    if (filter === "debt" && isPaid(invoice)) return false;
    return !search || String(invoice.customer_name || "").toLowerCase().includes(search) || String(invoice.invoice_number || invoice.id).toLowerCase().includes(search);
  });
  const total = invoices.reduce((sum, invoice) => sum + totalOf(invoice), 0);
  const paid = invoices.reduce((sum, invoice) => sum + Math.min(totalOf(invoice), advanceOf(invoice)), 0);
  const remaining = invoices.reduce((sum, invoice) => sum + remainingOf(invoice), 0);
  const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  setText("invoice-status-count", `Đang hiển thị ${filtered.length}/${invoices.length} hóa đơn`);
  setText("stat-total-money", `${(total / 1000000).toFixed(1)}M`);
  setText("stat-total-paid", `${(paid / 1000000).toFixed(1)}M`);
  setText("stat-total-remaining", `${(remaining / 1000000).toFixed(1)}M`);
  setText("stat-sub-total", `${money(total)} đ`);
  setText("stat-sub-paid", `${money(paid)} đ`);
  setText("stat-sub-remaining", `${money(remaining)} đ`);
  if (!filtered.length) { container.innerHTML = `<div class="text-center py-12 text-slate-400"><i class="fas fa-file-invoice text-4xl mb-3 text-slate-300"></i><p class="text-xs">Chưa có hóa đơn</p></div>`; return; }
  container.innerHTML = filtered.map(invoice => `<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-3.5"><div class="flex items-center justify-between mb-2"><span class="font-black text-slate-900 text-sm">${escapeHtml(invoice.invoice_number || invoice.id)}</span><span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isPaid(invoice) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}">${isPaid(invoice) ? "Đã thanh toán" : `Còn nợ ${money(remainingOf(invoice))} đ`}</span></div><h3 class="font-extrabold text-slate-900 text-base mb-0.5">${escapeHtml(invoice.customer_name || "Chưa có khách hàng")}</h3><p class="text-[11px] text-slate-400 mb-2.5">Lập ngày: ${escapeHtml(formatDate(invoice.invoice_date))}</p><p class="text-xs text-slate-600 mb-3">${escapeHtml(invoice.description || "")}</p><div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center text-xs mb-3"><div><span class="text-[10px] text-slate-400 block">Tổng tiền</span><span class="font-bold text-slate-800 text-[11px]">${money(totalOf(invoice))} đ</span></div><div><span class="text-[10px] text-slate-400 block">Đã thu</span><span class="font-bold text-emerald-600 text-[11px]">${money(Math.min(totalOf(invoice), advanceOf(invoice)))} đ</span></div><div><span class="text-[10px] text-slate-400 block">Còn lại</span><span class="font-bold text-slate-600 text-[11px]">${money(remainingOf(invoice))} đ</span></div></div><div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-xs"><a href="invoice-detail.html?id=${encodeURIComponent(invoice.id)}" class="py-1.5 px-3 rounded-lg bg-blue-50 text-blue-700 font-bold">Xem chi tiết</a><a href="invoice-create.html?id=${encodeURIComponent(invoice.id)}" class="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold">Sửa</a><button type="button" onclick="handleDeleteInvoice('${escapeHtml(invoice.id)}')" class="py-1.5 px-3 rounded-lg bg-rose-50 text-rose-700 font-bold">Xóa hóa đơn</button></div></div>`).join("");
  filtered.forEach(invoice => {
    const editLink = container.querySelector(`a[href="invoice-create.html?id=${encodeURIComponent(invoice.id)}"]`);
    const actions = editLink?.parentElement;
    if (!actions) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 font-bold";
    button.innerHTML = `<i class="fas fa-download"></i> Lưu nhanh`;
    button.addEventListener("click", event => { event.stopPropagation(); handleQuickSaveInvoice(invoice.id, button); });
    actions.insertBefore(button, actions.lastElementChild);
  });
}

function itemGroups() { return [...document.querySelectorAll(".invoice-item-group")]; }
function itemRows() { return [...document.querySelectorAll(".invoice-item-row")]; }
function readRow(row) {
  const quantity = Number(row.querySelector(".input-qty")?.value);
  const unitPrice = Number(row.querySelector(".input-price")?.value);
  return { name: row.querySelector(".input-name")?.value.trim() || "", quantity, unit: row.querySelector(".input-unit")?.value || "", unitPrice, note: row.querySelector(".input-note")?.value.trim() || "", total: Math.max(0, quantity || 0) * Math.max(0, unitPrice || 0) };
}
function syncPriceMinimum(row) {
  const quantity = Math.max(1, Number(row.querySelector(".input-qty")?.value) || 1);
  const price = row.querySelector(".input-price");
  if (price) price.min = String(quantity);
}
function recalculateCreateInvoice() {
  let total = 0;
  itemRows().forEach(row => { syncPriceMinimum(row); const item = readRow(row); total += item.total; row.querySelector(".display-line-total").textContent = `${money(item.total)} đ`; });
  const advance = document.getElementById("switch-advance")?.checked ? Math.max(0, Number(document.getElementById("input-advance-amount")?.value) || 0) : 0;
  itemGroups().forEach(group => { const groupTotal = [...group.querySelectorAll(".invoice-item-row")].reduce((sum, row) => sum + readRow(row).total, 0); group.querySelector("[data-group-total]").textContent = `${money(groupTotal)} đ`; });
  document.getElementById("display-total-services").textContent = `${money(total)} đ`;
  document.getElementById("display-deduct-advance").textContent = `-${money(advance)} đ`;
  document.getElementById("display-final-remaining").textContent = money(Math.max(0, total - advance));
  const itemCount = document.getElementById("invoice-item-count");
  if (itemCount) itemCount.textContent = `${itemRows().length} công việc`;
  renumberItems();
  return { total, advance };
}
function renumberItems() {
  itemRows().forEach((row, index) => {
    const label = row.querySelector("[data-work-label]");
    if (label) label.textContent = `Công việc ${index + 1}`;
  });
}
function createItemRow(item = {}) {
  const row = document.createElement("div");
  row.className = "invoice-item-row bg-white rounded-xl p-3 border border-slate-100 shadow-sm space-y-2";
  row.innerHTML = `<div class="flex items-center justify-between text-xs"><span data-work-label class="font-bold text-slate-700">Công việc</span><button type="button" data-remove-item class="text-rose-500 hover:text-rose-700 p-1"><i class="far fa-trash-can"></i></button></div><input type="text" class="input-name w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800" placeholder="Tên công việc" value="${escapeHtml(item.name || "")}"><div class="grid grid-cols-2 gap-2 text-xs"><div><span class="text-[10px] text-slate-500 block mb-0.5">SL</span><input type="number" min="1" step="1" class="input-qty w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold" value="${Number(item.quantity) || 1}"></div><div><span class="text-[10px] text-slate-500 block mb-0.5">Đơn vị tính</span><select class="input-unit w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"><option value="">--</option><option>cái</option><option>bộ</option><option>công</option><option>mét</option><option>kg</option></select></div></div><div class="flex items-center justify-between pt-1"><div><span class="text-[10px] text-slate-500 block">Đơn giá</span><input type="number" min="0" step="1" class="input-price w-full bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-800" value="${Math.max(0, Number(item.unit_price) || 0)}"></div><div class="text-right"><span class="text-[10px] text-slate-500 block">Thành tiền</span><span class="display-line-total font-extrabold text-emerald-600 text-xs">0 đ</span></div></div><input type="text" class="input-note w-full bg-white/70 border border-slate-200/60 rounded p-1.5 text-[11px] text-slate-500 italic" placeholder="Ghi chú (không bắt buộc)" value="${escapeHtml(item.note || "")}">`;
  row.querySelector(".input-unit").value = item.unit || "";
  row.addEventListener("input", recalculateCreateInvoice);
  syncPriceMinimum(row);
  row.querySelector("[data-remove-item]").addEventListener("click", () => { row.remove(); if (!itemRows().length) itemGroups()[0]?.appendChild(createItemRow()); renumberItems(); recalculateCreateInvoice(); });
  return row;
}
function setupItemGroups() {
  document.querySelectorAll(".item-july, .item-august").forEach(row => row.remove());
  document.getElementById("add-invoice-item")?.addEventListener("click", () => {
    const targetGroup = itemGroups()[0];
    targetGroup?.appendChild(createItemRow());
    renumberItems();
    recalculateCreateInvoice();
  });
}
async function nextInvoiceNumber() { const { data, error } = await supabase.from("invoices").select("invoice_number"); if (error) throw error; const next = (data || []).reduce((max, row) => Math.max(max, Number(String(row.invoice_number || "").replace(/\D/g, "")) || 0), 0) + 1; return `HD-${String(next).padStart(3, "0")}`; }
function validateForm(total, advance) {
  const customer = document.getElementById("cust-name");
  if (!customer.value.trim()) { customer.classList.add("border-rose-500"); customer.focus(); showToast("Vui lòng nhập tên khách hàng.", "error"); return false; }
  customer.classList.remove("border-rose-500");
  for (const row of itemRows()) { const item = readRow(row); if (!item.name) { row.querySelector(".input-name").focus(); showToast("Vui lòng nhập tên cho từng công việc.", "error"); return false; } if (!Number.isFinite(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < item.quantity) { showToast("Đơn giá phải lớn hơn hoặc bằng số lượng.", "error"); return false; } }
  if (advance > total) { document.getElementById("input-advance-amount").focus(); showToast("Khoản ứng trước không được lớn hơn tổng tiền hóa đơn.", "error"); return false; }
  return true;
}
async function handleSaveInvoice() {
  const button = document.querySelector("button[onclick=\"handleSaveInvoice()\"]");
  const totals = recalculateCreateInvoice();
  if (!validateForm(totals.total, totals.advance)) return;
  const id = invoiceId();
  if (button) { button.disabled = true; button.dataset.originalText = button.innerHTML; button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tạo hóa đơn...`; }
  try {
    const payload = { title: document.getElementById("invoice-title").value.trim() || "Hóa đơn Thanh toán", customer_name: document.getElementById("cust-name").value.trim(), customer_address: document.getElementById("cust-address").value.trim() || null, customer_phone: document.getElementById("cust-phone").value.trim() || null, invoice_date: parseDate(document.getElementById("cust-date").value) || today(), total_amount: totals.total, advance_amount: totals.advance, remaining_amount: totals.total - totals.advance, note: document.getElementById("advance-note").value.trim() || null, updated_at: new Date().toISOString() };
    if (!id) payload.invoice_number = await nextInvoiceNumber();
    const result = id ? await supabase.from("invoices").update(payload).eq("id", id).select().single() : await supabase.from("invoices").insert(payload).select().single();
    if (result.error) throw result.error;
    const saved = result.data;
    if (id) { const { error } = await supabase.from("invoice_items").delete().eq("invoice_id", saved.id); if (error) throw error; }
    const rows = itemRows().map((row, index) => { const item = readRow(row); return { invoice_id: saved.id, work_date: payload.invoice_date, month: null, name: item.name, quantity: item.quantity, unit: item.unit || null, unit_price: item.unitPrice, total: item.total, note: item.note || null, sort_order: index }; });
    if (rows.length) { const { error } = await supabase.from("invoice_items").insert(rows); if (error) throw error; }
    const [{ data: latestInvoice, error: latestInvoiceError }, { data: latestItems, error: latestItemsError }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", saved.id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", saved.id).order("sort_order", { ascending: true })
    ]);
    if (latestInvoiceError) throw latestInvoiceError;
    if (latestItemsError) throw latestItemsError;
    await window.downloadInvoicePdf(latestInvoice, latestItems || []);
    showToast("Đã lưu hóa đơn.", "success");
    setTimeout(() => { window.location.href = `invoice-detail.html?id=${encodeURIComponent(saved.id)}`; }, 700);
  } catch (error) { console.error("Không thể lưu hóa đơn:", error); showToast(`Không thể lưu hóa đơn: ${error.message || "Lỗi Supabase"}`, "error"); if (button) { button.disabled = false; button.innerHTML = button.dataset.originalText; } }
}
async function loadInvoiceForm() {
  const id = invoiceId();
  document.getElementById("cust-date").value = formatDate(today());
  if (!id) return;
  const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }] = await Promise.all([supabase.from("invoices").select("*").eq("id", id).single(), supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true })]);
  if (invoiceError) throw invoiceError;
  if (itemsError) throw itemsError;
  document.getElementById("cust-name").value = invoice.customer_name || "";
  document.getElementById("cust-address").value = invoice.customer_address || "";
  document.getElementById("cust-phone").value = invoice.customer_phone || "";
  document.getElementById("cust-date").value = formatDate(invoice.invoice_date);
  document.getElementById("invoice-code").textContent = invoice.invoice_number || invoice.id;
  document.getElementById("invoice-title").value = invoice.title || "Hóa đơn Thanh toán";
  document.getElementById("input-advance-amount").value = invoice.advance_amount || 0;
  document.getElementById("switch-advance").checked = Number(invoice.advance_amount) > 0;
  document.getElementById("advance-note").value = invoice.note || "";
  const groups = itemGroups();
  (items || []).forEach(item => { groups[0]?.appendChild(createItemRow(item)); });
  document.querySelectorAll('a[href^="invoice-detail.html"]').forEach(link => { link.href = `invoice-detail.html?id=${encodeURIComponent(id)}`; });
}
async function handleDeleteInvoice(id) { if (!window.confirm("Bạn có chắc muốn xóa hóa đơn này?")) return; const { error: itemError } = await supabase.from("invoice_items").delete().eq("invoice_id", id); if (itemError) return showToast("Không thể xóa hạng mục hóa đơn.", "error"); const { error } = await supabase.from("invoices").delete().eq("id", id); if (error) return showToast("Không thể xóa hóa đơn.", "error"); await loadInvoices(); renderInvoicesPage(); showToast("Đã xóa hóa đơn.", "success"); }
function setupLocation() { document.getElementById("use-current-location")?.addEventListener("click", () => { if (!navigator.geolocation) return showToast("Trình duyệt không hỗ trợ định vị. Bạn có thể nhập địa chỉ thủ công.", "info"); navigator.geolocation.getCurrentPosition(position => { const address = document.getElementById("cust-address"); if (address && !address.value.trim()) address.value = `Vị trí: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`; showToast("Đã lấy vị trí hiện tại.", "success"); }, () => showToast("Không thể lấy vị trí. Bạn có thể nhập địa chỉ thủ công.", "info")); }); }

window.renderInvoicesPage = renderInvoicesPage;
window.recalculateCreateInvoice = recalculateCreateInvoice;
window.handleSaveInvoice = handleSaveInvoice;
window.handleDeleteInvoice = handleDeleteInvoice;
window.handleQuickSaveInvoice = handleQuickSaveInvoice;
window.setInvoiceFilter = (filter, element) => { window.currentInvoiceFilter = filter; document.querySelectorAll(".btn-inv-filter").forEach(button => button.classList.remove("bg-blue-600", "text-white")); element?.classList.add("bg-blue-600", "text-white"); renderInvoicesPage(); };
document.addEventListener("DOMContentLoaded", async () => { try { setupLocation(); if (document.getElementById("invoices-list-container")) { await loadInvoices(); renderInvoicesPage(); } if (document.querySelector(".invoice-item-group")) { setupItemGroups(); await loadInvoiceForm(); if (!itemRows().length) itemGroups()[0]?.appendChild(createItemRow()); renumberItems(); recalculateCreateInvoice(); } } catch (error) { console.error("Không thể tải hóa đơn:", error); showToast("Không thể tải dữ liệu hóa đơn.", "error"); } });
