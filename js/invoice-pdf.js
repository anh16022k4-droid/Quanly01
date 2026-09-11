function pdfEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function pdfMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0) + " đ";
}

function pdfDate(value) {
  const parts = String(value || "").slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "";
}

function pdfFilePart(value, fallback) {
  const normalized = String(value || fallback || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

async function downloadInvoicePdf(invoice, items) {
  if (typeof html2pdf !== "function") throw new Error("Chưa tải được thư viện tạo PDF.");
  const rows = items || [];
  const total = rows.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const advance = Number(invoice.advance_amount) || 0;
  const remaining = Math.max(0, total - advance);
  const wrapper = document.createElement("div");
  wrapper.className = "invoice-pdf-document";
  wrapper.innerHTML = `<div class="pdf-company"><b>HÓA ĐƠN</b><span>${pdfEscape(invoice.customer_address || "")}</span></div><div class="pdf-title"><h1>${pdfEscape(invoice.title || "Hóa đơn Thanh toán")}</h1><p>${pdfEscape(invoice.invoice_number || invoice.id)} - ${pdfEscape(pdfDate(invoice.invoice_date))}</p></div><div class="pdf-customer"><p><b>KHÁCH HÀNG:</b> ${pdfEscape(invoice.customer_name || "")}</p><p><b>ĐỊA CHỈ:</b> ${pdfEscape(invoice.customer_address || "")}</p><p><b>SỐ ĐIỆN THOẠI:</b> ${pdfEscape(invoice.customer_phone || "")}</p>${invoice.description ? `<p><b>DIỄN GIẢI:</b> ${pdfEscape(invoice.description)}</p>` : ""}</div><table class="pdf-items-table"><thead><tr><th>STT</th><th>TÊN CÔNG VIỆC</th><th>SL</th><th>ĐƠN VỊ</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th><th>GHI CHÚ</th></tr></thead><tbody>${rows.map((item, index) => `<tr><td class="center">${index + 1}</td><td class="left">${pdfEscape(item.name || "")}</td><td class="center">${Number(item.quantity) || 0}</td><td class="center">${pdfEscape(item.unit || "-")}</td><td class="right">${pdfMoney(item.unit_price)}</td><td class="right">${pdfMoney(item.total)}</td><td class="left">${pdfEscape(item.note || "-")}</td></tr>`).join("") || `<tr><td colspan="7" class="center">Chưa có hạng mục</td></tr>`}</tbody></table><div class="pdf-totals"><p><b>TỔNG TIỀN HÀNG / DỊCH VỤ:</b><strong>${pdfMoney(total)}</strong></p><p><b>KHOẢN ỨNG TRƯỚC:</b><strong>-${pdfMoney(advance)}</strong></p><p class="pdf-remaining"><b>CÒN PHẢI THANH TOÁN:</b><strong>${pdfMoney(remaining)}</strong></p></div>`;
  document.body.appendChild(wrapper);
  const filename = `Hoa-don-${pdfFilePart(invoice.invoice_number, invoice.id)}-${pdfFilePart(invoice.customer_name, "Khach-hang")}-${pdfFilePart(pdfDate(invoice.updated_at || invoice.created_at || invoice.invoice_date).replace(/\//g, "-"), "Chua-cap-nhat")}.pdf`;
  try {
    const pdfBlob = await html2pdf().set({
      margin: 10,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true },
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".pdf-totals"] }
    }).from(wrapper).outputPdf("blob");
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    wrapper.remove();
  }
}

window.downloadInvoicePdf = downloadInvoicePdf;
