/** Shared client-side invoice PDF download. Used by list "Lưu nhanh" and detail "Lưu hóa đơn". */
(function attachDownloadInvoicePdf(global) {
  const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));

  function itemName(item) {
    return item?.name || item?.description || item?.service_name || "";
  }

  function itemQuantity(item) {
    return Number(item?.quantity ?? item?.qty) || 0;
  }

  function itemPrice(item) {
    return Number(item?.unit_price ?? item?.price) || 0;
  }

  function itemTotal(item) {
    const stored = Number(item?.total ?? item?.line_total ?? item?.amount);
    if (stored) return stored;
    return itemQuantity(item) * itemPrice(item);
  }

  function buildInvoiceElement(invoice, items) {
    const total = Number(invoice.total_amount ?? invoice.totalAmount) || items.reduce((sum, item) => sum + itemTotal(item), 0);
    const advance = Number(invoice.advance_amount ?? invoice.advanceAmount) || 0;
    const remaining = Number(invoice.remaining_amount ?? invoice.remainingAmount);
    const due = Number.isFinite(remaining) ? remaining : Math.max(0, total - advance);
    const rows = items.map((item, index) => {
      const quantity = itemQuantity(item);
      const price = itemPrice(item);
      return `<tr>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${index + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;">${escapeHtml(itemName(item))}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(item.unit || "cái")}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${quantity}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;">${money(price)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${money(itemTotal(item))}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="6" style="padding:16px;text-align:center;color:#94a3b8;">Chưa có hạng mục</td></tr>`;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;";
    wrapper.innerHTML = `<div style="width:794px;box-sizing:border-box;padding:28px 32px;background:#fff;">
      <div style="border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:800;color:#1e40af;text-transform:uppercase;">NHÓM DỊCH VỤ CƠ ĐIỆN & CÔNG TRÌNH</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">${escapeHtml(invoice.address || "")}</div>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:20px;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(invoice.title || "HÓA ĐƠN THANH TOÁN")}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">${escapeHtml(invoice.code || invoice.id || "")}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;margin-bottom:16px;">
        <div><b>KHÁCH HÀNG:</b> ${escapeHtml(invoice.client || invoice.customer_name || "")}</div>
        <div><b>ĐỊA CHỈ:</b> ${escapeHtml(invoice.address || "")}</div>
        <div><b>SỐ ĐIỆN THOẠI:</b> ${escapeHtml(invoice.phone || "")}</div>
        <div><b>NGÀY LẬP:</b> ${escapeHtml(invoice.invoice_date || invoice.date || "")}</div>
        <div><b>DIỄN GIẢI:</b> ${escapeHtml(invoice.description || invoice.desc || "")}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:center;width:40px;">STT</th>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:left;">TÊN DỊCH VỤ / SẢN PHẨM</th>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:center;width:48px;">ĐVT</th>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:center;width:40px;">SL</th>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:right;width:90px;">ĐƠN GIÁ</th>
            <th style="background:#f1f5f9;padding:8px 6px;text-align:right;width:100px;">THÀNH TIỀN</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>TỔNG CỘNG TIỀN DỊCH VỤ:</span><b>${money(total)} đ</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;color:#e11d48;"><span>TIỀN ỨNG TRƯỚC:</span><b>-${money(advance)} đ</b></div>
        <div style="background:#2563eb;color:#fff;border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;font-weight:800;">
          <span>SỐ TIỀN CÒN PHẢI TT:</span><span>${money(due)} đ</span>
        </div>
      </div>
    </div>`;
    return wrapper;
  }

  function ensureHtml2Pdf() {
    if (typeof global.html2pdf === "function") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-invoice-html2pdf]");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Không tải được html2pdf.js.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.dataset.invoiceHtml2pdf = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không tải được html2pdf.js."));
      document.head.appendChild(script);
    });
  }

  async function downloadInvoicePdf(invoice, items) {
    if (!invoice) throw new Error("Không có dữ liệu hóa đơn.");
    const invoiceItems = Array.isArray(items) ? items : [];
    await ensureHtml2Pdf();
    if (typeof global.html2pdf !== "function") {
      throw new Error("Không tìm thấy html2pdf.js.");
    }

    const host = buildInvoiceElement(invoice, invoiceItems);
    document.body.appendChild(host);
    const source = host.firstElementChild;
    const filename = `Hoa-don-${String(invoice.code || invoice.id || "invoice").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

    try {
      const pdfDocument = await global.html2pdf()
        .set({
          margin: 8,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(source)
        .toPdf()
        .get("pdf");

      const blob = pdfDocument.output("blob");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } finally {
      host.remove();
    }
  }

  global.downloadInvoicePdf = downloadInvoicePdf;
})(window);
