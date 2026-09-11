import { supabase } from "./supabase.js";

const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const formatDate = value => { const parts = String(value || "").slice(0, 10).split("-"); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ""; };

async function loadInvoiceDetail() {
  const id = new URLSearchParams(window.location.search).get("id");
  const paper = document.querySelector(".a4-sheet");
  if (!paper) return;
  paper.innerHTML = `<div class="text-center py-16 text-slate-400 text-sm">Đang tải hóa đơn...</div>`;
  if (!id) { paper.innerHTML = `<div class="text-center py-16 text-slate-400">Chưa chọn hóa đơn.</div>`; return; }
  const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true })
  ]);
  if (invoiceError) throw invoiceError;
  if (itemsError) throw itemsError;
  const total = (items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const advance = Number(invoice.advance_amount) || 0;
  const remaining = Math.max(0, total - advance);
  const itemMarkup = (items || []).map((item, index) => { const quantity = Number(item.quantity) || 0; const price = Number(item.unit_price) || 0; const lineTotal = Number(item.total) || quantity * price; return `<tr><td class="text-center">${index + 1}</td><td class="work-name">${escapeHtml(item.name || "")}</td><td class="text-center">${quantity}</td><td class="text-center">${escapeHtml(item.unit || "-")}</td><td class="text-right">${money(price)} đ</td><td class="text-right font-semibold">${money(lineTotal)} đ</td><td class="work-note">${escapeHtml(item.note || "-")}</td></tr>`; }).join("") || `<tr><td colspan="7" class="text-center text-slate-400 py-6">Chưa có hạng mục</td></tr>`;
  paper.innerHTML = `<div class="border-b border-slate-200 pb-3 mb-4"><div class="flex items-center gap-2 text-blue-800 font-extrabold text-sm mb-1 uppercase"><i class="fas fa-screwdriver-wrench text-blue-600"></i><span>HÓA ĐƠN</span></div><p class="text-[10px] text-slate-500">${escapeHtml(invoice.customer_address || "")}</p></div><div class="text-center mb-4"><h1 class="text-lg font-black text-slate-900 uppercase">${escapeHtml(invoice.title || "Hóa đơn Thanh toán")}</h1><p class="text-[10px] text-slate-500">${escapeHtml(invoice.invoice_number || invoice.id)} - ${escapeHtml(formatDate(invoice.invoice_date))}</p></div><div class="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] mb-4 space-y-1.5"><div><b>KHÁCH HÀNG:</b> ${escapeHtml(invoice.customer_name || "")}</div><div><b>ĐỊA CHỈ:</b> ${escapeHtml(invoice.customer_address || "")}</div><div><b>SỐ ĐIỆN THOẠI:</b> ${escapeHtml(invoice.customer_phone || "")}</div>${invoice.description ? `<div><b>DIỄN GIẢI:</b> ${escapeHtml(invoice.description)}</div>` : ""}</div><div class="invoice-table-wrapper mb-4"><table class="invoice-table"><thead><tr><th>STT</th><th>TÊN CÔNG VIỆC</th><th>SL</th><th>ĐƠN VỊ</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th><th>GHI CHÚ</th></tr></thead><tbody>${itemMarkup}</tbody></table></div><div class="invoice-total-box bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5"><div class="flex justify-between"><span>TỔNG TIỀN HÀNG / DỊCH VỤ:</span><b>${money(total)} đ</b></div><div class="flex justify-between text-rose-600"><span>KHOẢN ỨNG TRƯỚC:</span><b>-${money(advance)} đ</b></div><div class="bg-blue-600 text-white rounded-lg p-2.5 flex justify-between"><b>CÒN PHẢI THANH TOÁN:</b><b>${money(remaining)} đ</b></div></div>`;
  paper.style.visibility = "visible";
  document.querySelectorAll('a[href^="invoice-create.html"]').forEach(link => { link.href = `invoice-create.html?id=${encodeURIComponent(id)}`; });
}

async function handleSaveInvoicePdf() {
  const id = new URLSearchParams(window.location.search).get("id");
  const button = document.querySelector("button[onclick=\"handleSaveInvoicePdf()\"]");
  if (!id || !button) return;
  button.disabled = true;
  const original = button.innerHTML;
  button.innerHTML = `<i class="fas fa-spinner fa-spin text-[10px]"></i> Đang tạo hóa đơn...`;
  try {
    const [{ data: invoice, error: invoiceError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order", { ascending: true })
    ]);
    if (invoiceError) throw invoiceError;
    if (itemsError) throw itemsError;
    window.downloadInvoicePdfFromServer(invoice.id);
    button.innerHTML = original;
  } catch (error) {
    console.error("Không thể tạo PDF hóa đơn:", error);
    button.innerHTML = original;
    alert(`Không thể tạo file PDF: ${error.message || "Lỗi không xác định"}`);
  } finally {
    button.disabled = false;
  }
}
window.handleSaveInvoicePdf = handleSaveInvoicePdf;

document.addEventListener("DOMContentLoaded", async () => { try { await loadInvoiceDetail(); } catch (error) { console.error("Không thể tải chi tiết hóa đơn:", error); const paper = document.querySelector(".a4-sheet"); if (paper) paper.innerHTML = `<div class="text-center py-16 text-rose-500 text-sm">Không thể tải hóa đơn.</div>`; } });
