import { supabase } from "./supabase.js";

const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));

let isDownloadingPdf = false;

function currentInvoiceId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function fetchInvoiceItems(invoiceId) {
  const ordered = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  if (!ordered.error) return Array.isArray(ordered.data) ? ordered.data : [];

  console.error("[Invoice Detail] Invoice items query failed:", ordered.error);

  const fallback = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (fallback.error) throw fallback.error;
  return Array.isArray(fallback.data) ? fallback.data : [];
}

async function loadInvoiceDetail() {
  const id = currentInvoiceId();
  console.log("[Invoice Detail] Invoice ID:", id);
  const paper = document.querySelector(".a4-sheet");
  if (!paper) return;
  paper.innerHTML = `<div class="text-center py-16 text-slate-400 text-sm">Đang tải hóa đơn...</div>`;
  if (!id) { paper.innerHTML = `<div class="text-center py-16 text-slate-400">Chưa chọn hóa đơn.</div>`; return; }
  const { data: invoice, error: invoiceError } = await supabase.from("invoices").select("*").eq("id", id).single();
  if (invoiceError) {
    console.error("[Invoice Detail] Invoice query failed:", invoiceError);
    throw invoiceError;
  }
  const items = await fetchInvoiceItems(id);
  console.log("[Invoice Detail] Invoice loaded:", invoice);
  console.log("[Invoice Detail] Items loaded:", items);
  const total = Number(invoice.total_amount ?? invoice.totalAmount) || 0;
  const advance = Number(invoice.advance_amount ?? invoice.advanceAmount) || 0;
  const remaining = Math.max(0, total - advance);
  paper.innerHTML = `<div class="border-b border-slate-200 pb-3 mb-4"><div class="flex items-center gap-2 text-blue-800 font-extrabold text-sm mb-1 uppercase"><i class="fas fa-screwdriver-wrench text-blue-600"></i><span>HÓA ĐƠN</span></div><p class="text-[10px] text-slate-500">${escapeHtml(invoice.address || "")}</p></div><div class="text-center mb-4"><h1 class="text-lg font-black text-slate-900 uppercase">${escapeHtml(invoice.title || "HÓA ĐƠN")}</h1><p class="text-[10px] text-slate-500">${escapeHtml(invoice.code || invoice.id)}</p></div><div class="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] mb-4 space-y-1.5"><div><b>KHÁCH HÀNG:</b> ${escapeHtml(invoice.client || invoice.customer_name || "")}</div><div><b>ĐỊA CHỈ:</b> ${escapeHtml(invoice.address || "")}</div><div><b>SỐ ĐIỆN THOẠI:</b> ${escapeHtml(invoice.phone || "")}</div><div><b>DIỄN GIẢI:</b> ${escapeHtml(invoice.description || "")}</div></div><div class="overflow-x-auto mb-4 border border-slate-200 rounded-lg"><table class="invoice-table"><thead><tr><th>STT</th><th>TÊN DỊCH VỤ / SẢN PHẨM</th><th>SL</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead><tbody>${(items || []).map((item, index) => { const quantity = Number(item.quantity ?? item.qty) || 0; const price = Number(item.unit_price ?? item.price) || 0; return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name || item.description || "")}</td><td>${quantity}</td><td>${money(price)}</td><td>${money(quantity * price)}</td></tr>`; }).join("") || `<tr><td colspan="5" class="text-center text-slate-400 py-6">Chưa có hạng mục</td></tr>`}</tbody></table></div><div class="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5"><div class="flex justify-between"><span>TỔNG CỘNG:</span><b>${money(total)} đ</b></div><div class="flex justify-between text-rose-600"><span>ỨNG TRƯỚC:</span><b>-${money(advance)} đ</b></div><div class="bg-blue-600 text-white rounded-lg p-2.5 flex justify-between"><b>CÒN PHẢI THANH TOÁN:</b><b>${money(remaining)} đ</b></div></div>`;
  paper.style.visibility = "visible";
  const editLinks = document.querySelectorAll('a[href^="invoice-create.html"]');
  editLinks.forEach(link => { link.href = `invoice-create.html?id=${encodeURIComponent(id)}`; });
}

function bindSaveInvoicePdfButton() {
  const saveInvoiceButton = document.getElementById("save-invoice-pdf");
  if (!saveInvoiceButton) {
    console.error("[Invoice Detail] Missing #save-invoice-pdf button");
    return;
  }

  console.log(
    "[Invoice Detail] downloadInvoicePdf:",
    typeof window.downloadInvoicePdf
  );

  saveInvoiceButton.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();

    if (isDownloadingPdf) {
      return;
    }

    isDownloadingPdf = true;
    const originalText = saveInvoiceButton.innerHTML;

    try {
      saveInvoiceButton.disabled = true;
      saveInvoiceButton.innerHTML = "Đang tạo PDF...";

      console.log("[Invoice Detail] Start PDF download");

      const invoiceId = currentInvoiceId();
      if (!invoiceId) {
        throw new Error("Không tìm thấy ID hóa đơn.");
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) {
        console.error("[Invoice Detail] Invoice query failed:", invoiceError);
        throw invoiceError;
      }

      const items = await fetchInvoiceItems(invoiceId);

      console.log("[Invoice Detail] Invoice:", invoice);
      console.log("[Invoice Detail] Items:", items);

      if (typeof window.downloadInvoicePdf !== "function") {
        throw new Error("Không tìm thấy chức năng tạo PDF. Hãy kiểm tra invoice-pdf.js.");
      }

      await window.downloadInvoicePdf(invoice, Array.isArray(items) ? items : []);

      console.log("[Invoice Detail] PDF download completed");
    } catch (error) {
      console.error("[Invoice Detail] PDF download failed:", error);
      alert("Không thể lưu hóa đơn PDF.\n" + (error?.message || "Vui lòng thử lại."));
    } finally {
      isDownloadingPdf = false;
      saveInvoiceButton.disabled = false;
      saveInvoiceButton.innerHTML = originalText;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Invoice Detail] Page loaded");
  console.log("[Invoice Detail] Invoice ID:", currentInvoiceId());
  console.log("[Invoice Detail] downloadInvoicePdf:", typeof window.downloadInvoicePdf);
  bindSaveInvoicePdfButton();
  try { await loadInvoiceDetail(); }
  catch (error) { console.error("Không thể tải chi tiết hóa đơn:", error); const paper = document.querySelector(".a4-sheet"); if (paper) paper.innerHTML = `<div class="text-center py-16 text-rose-500 text-sm">Không thể tải hóa đơn.</div>`; }
});
