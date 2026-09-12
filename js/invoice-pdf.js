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
  console.log("[invoice-pdf] start", { invoice, itemsCount: Array.isArray(items) ? items.length : 0 });

  if (!invoice) throw new Error("Không tìm thấy hóa đơn.");
  if (!Array.isArray(items)) throw new Error("Không thể tải dữ liệu công việc của hóa đơn.");

  if (typeof window.jspdf?.jsPDF !== "function") {
    throw new Error("Chưa tải được thư viện tạo PDF.");
  }

  const rows = items || [];
  const total = rows.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const advance = Number(invoice.advance_amount) || 0;
  const remaining = Math.max(0, total - advance);

  const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 18, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("HÓA ĐƠN", pageWidth / 2, 12, { align: "center" });

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.text(`Khách hàng: ${invoice.customer_name || ""}`, 14, 28);
  pdf.text(`Địa chỉ: ${invoice.customer_address || ""}`, 14, 34);
  pdf.text(`Số điện thoại: ${invoice.customer_phone || ""}`, 14, 40);
  pdf.text(`Số hóa đơn: ${invoice.invoice_number || invoice.id}`, 14, 46);
  pdf.text(`Ngày hóa đơn: ${pdfDate(invoice.invoice_date)}`, 14, 52);

  if (invoice.description) {
    pdf.setFontSize(10);
    pdf.text(`Diễn giải: ${invoice.description}`, 14, 58);
  }

  const tableBody = rows.length
    ? rows.map((item, index) => [
        index + 1,
        item.name || "",
        Number(item.quantity) || 0,
        item.unit || "-",
        pdfMoney(item.unit_price),
        pdfMoney(item.total),
        item.note || "-"
      ])
    : [["", "Chưa có hạng mục", "", "", "", "", ""]];

  pdf.autoTable({
    startY: rows.length ? 68 : 70,
    head: [["STT", "TÊN CÔNG VIỆC", "SL", "ĐƠN VỊ", "ĐƠN GIÁ", "THÀNH TIỀN", "GHI CHÚ"]],
    body: tableBody,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 62 },
      2: { cellWidth: 14 },
      3: { cellWidth: 18 },
      4: { cellWidth: 24 },
      5: { cellWidth: 28 },
      6: { cellWidth: 38 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: hook => {
      if (hook.section === "body" && hook.row.index === tableBody.length - 1 && hook.column.index === 1 && !rows.length) {
        hook.cell.styles.textColor = [100, 116, 139];
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.halign = "center";
      }
    }
  });

  const finalY = pdf.lastAutoTable?.finalY || 95;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`TỔNG TIỀN HÀNG / DỊCH VỤ: ${pdfMoney(total)}`, 135, finalY + 12, { align: "right" });
  pdf.setTextColor(220, 38, 38);
  pdf.text(`KHOẢN ỨNG TRƯỚC: -${pdfMoney(advance)}`, 135, finalY + 20, { align: "right" });
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.text(`CÒN PHẢI THANH TOÁN: ${pdfMoney(remaining)}`, 135, finalY + 30, { align: "right" });

  const filename = `Hoa-don-${pdfFilePart(invoice.invoice_number || invoice.id, invoice.id)}.pdf`;
  const pdfBlob = pdf.output("blob");

  console.log("[invoice-pdf] blob", { type: pdfBlob?.type, size: pdfBlob?.size, filename });

  if (!(pdfBlob instanceof Blob) || pdfBlob.size <= 0 || !String(pdfBlob.type || "").toLowerCase().startsWith("application/pdf")) {
    throw new Error("PDF Blob không hợp lệ hoặc có kích thước 0.");
  }

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);

  console.log("[invoice-pdf] download triggered", filename);
}

window.downloadInvoicePdf = downloadInvoicePdf;
