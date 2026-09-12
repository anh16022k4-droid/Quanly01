function pdfEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

console.log("[Invoice Frame] isIframe:", window.self !== window.top);
console.log("[Invoice Frame] frameElement:", window.frameElement);
console.log("[Invoice Frame] sandbox:", window.frameElement?.getAttribute("sandbox"));
console.log("[Invoice Frame] allow:", window.frameElement?.getAttribute("allow"));
console.log("[Invoice Frame] parent URL:", document.referrer);

window.debugInvoiceDownloadEnvironment = function debugInvoiceDownloadEnvironment() {
  console.group("[Invoice Download Debug]");
  console.log("URL:", window.location.href);
  console.log("Hostname:", window.location.hostname);
  console.log("Protocol:", window.location.protocol);
  console.log("Is iframe:", window.self !== window.top);
  console.log("Frame element:", window.frameElement);
  console.log("Sandbox:", window.frameElement?.getAttribute("sandbox"));
  console.log("Allow:", window.frameElement?.getAttribute("allow"));
  console.log("Referrer:", document.referrer);
  console.log("PDF library html2pdf:", typeof window.html2pdf);
  console.log("PDF library jspdf:", typeof window.jspdf);
  console.groupEnd();
};

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
  console.log("[Invoice PDF] Start", { invoiceId: invoice?.id, itemsCount: Array.isArray(items) ? items.length : 0 });
  console.log("[Invoice PDF] Environment", {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    href: window.location.href,
    isVercel: window.location.hostname.includes("vercel.app"),
    isIframe: window.self !== window.top
  });

  try {
    console.log("[Invoice PDF] Step 1 - Validate inputs");
    if (!invoice) throw new Error("Không tìm thấy hóa đơn.");
    if (!Array.isArray(items)) throw new Error("Không thể tải dữ liệu công việc của hóa đơn.");

    console.log("[Invoice PDF] Step 2 - Validate PDF library", {
      html2pdfAvailable: typeof window.html2pdf,
      jspdfAvailable: typeof window.jspdf,
      jsPdfCtorAvailable: typeof window.jspdf?.jsPDF
    });
    if (typeof window.jspdf?.jsPDF !== "function") {
      throw new Error("Thư viện jsPDF chưa sẵn sàng trên môi trường hiện tại.");
    }

    console.log("[Invoice PDF] Step 3 - Prepare invoice data", {
      invoiceNumber: invoice.invoice_number || invoice.id,
      invoiceDate: invoice.invoice_date,
      itemCount: items.length
    });

    const rows = items || [];
    const total = rows.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const advance = Number(invoice.advance_amount) || 0;
    const remaining = Math.max(0, total - advance);

    console.log("[Invoice PDF] Step 4 - Generate PDF document");
    const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    console.log("[Invoice PDF] Layout:", {
      page: "A4 landscape",
      orientation: "landscape",
      margin: { left: margin, top: margin, right: margin, bottom: margin },
      tableWidth: contentWidth,
      availableWidth: contentWidth,
      pageWidth,
      pageHeight
    });

    const companyAddress = String(invoice.customer_address || "").trim();
    const customerName = String(invoice.customer_name || "").trim();
    const customerPhone = String(invoice.customer_phone || "").trim();
    const description = String(invoice.description || "").trim();
    const invoiceTitle = String(invoice.title || "Hóa đơn Thanh toán").trim() || "Hóa đơn Thanh toán";

    pdf.setFont("times", "normal");
    pdf.setTextColor(15, 23, 42);
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(148, 163, 184);

    pdf.setFillColor(37, 99, 235);
    pdf.roundedRect(margin + 1, margin + 2, 8, 8, 1.2, 1.2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("times", "bold");
    pdf.setFontSize(9);
    pdf.text("✓", margin + 5, margin + 7.5, { align: "center" });

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("times", "bold");
    pdf.setFontSize(17);
    pdf.text("HÓA ĐƠN", margin + 13, margin + 8);

    pdf.setFont("times", "normal");
    pdf.setFontSize(10);
    pdf.text(companyAddress || "", margin + 13, margin + 13.5);

    pdf.line(margin, margin + 18, pageWidth - margin, margin + 18);

    pdf.setFont("times", "bold");
    pdf.setFontSize(20);
    pdf.text(invoiceTitle, pageWidth / 2, margin + 32, { align: "center" });
    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    pdf.text(`${invoice.invoice_number || invoice.id} - ${pdfDate(invoice.invoice_date)}`, pageWidth / 2, margin + 39, { align: "center" });

    const customerBoxY = margin + 46;
    const customerBoxHeight = description ? 31 : 26;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin, customerBoxY, contentWidth, customerBoxHeight, 2.5, 2.5, "FD");

    let customerLineY = customerBoxY + 8;
    pdf.setFont("times", "bold");
    pdf.setFontSize(10.5);
    pdf.text("KHÁCH HÀNG:", margin + 5, customerLineY);
    pdf.text("ĐỊA CHỈ:", margin + 5, customerLineY + 7);
    pdf.text("SỐ ĐIỆN THOẠI:", margin + 5, customerLineY + 14);

    pdf.setFont("times", "normal");
    pdf.text(customerName || "", margin + 34, customerLineY, { maxWidth: contentWidth - 40 });
    pdf.text(companyAddress || "", margin + 34, customerLineY + 7, { maxWidth: contentWidth - 40 });
    pdf.text(customerPhone || "", margin + 34, customerLineY + 14, { maxWidth: contentWidth - 40 });

    if (description) {
      pdf.setFont("times", "bold");
      pdf.text("DIỄN GIẢI:", margin + 5, customerLineY + 21);
      pdf.setFont("times", "normal");
      pdf.text(description, margin + 34, customerLineY + 21, { maxWidth: contentWidth - 40 });
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

    const tableStartY = customerBoxY + customerBoxHeight + 8;
    const finalY = pdf.lastAutoTable?.finalY || tableStartY;

    pdf.autoTable({
      startY: tableStartY,
      head: [["STT", "TÊN CÔNG VIỆC", "SL", "ĐƠN VỊ", "ĐƠN GIÁ", "THÀNH TIỀN", "GHI CHÚ"]],
      body: tableBody,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      styles: {
        font: "times",
        fontStyle: "normal",
        fontSize: 8.5,
        cellPadding: 2.2,
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        overflow: "linebreak",
        valign: "middle"
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 97, halign: "left" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 31, halign: "right" },
        5: { cellWidth: 34, halign: "right" },
        6: { cellWidth: 63, halign: "left" }
      },
      didParseCell: hook => {
        if (hook.section === "body") {
          hook.cell.styles.fontSize = 8.5;
          hook.cell.styles.textColor = [15, 23, 42];
          if (hook.column.index === 0) hook.cell.styles.halign = "center";
          if (hook.column.index === 1 || hook.column.index === 6) hook.cell.styles.halign = "left";
          if (hook.column.index === 2 || hook.column.index === 3) hook.cell.styles.halign = "center";
          if (hook.column.index === 4 || hook.column.index === 5) hook.cell.styles.halign = "right";
        }
        if (hook.section === "body" && hook.row.index === tableBody.length - 1 && hook.column.index === 1 && !rows.length) {
          hook.cell.styles.textColor = [100, 116, 139];
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.halign = "center";
        }
      }
    });

    const totalsY = (pdf.lastAutoTable?.finalY || finalY) + 8;

    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, totalsY, pageWidth - margin, totalsY);

    pdf.setFont("times", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);

    pdf.text("TỔNG TIỀN HÀNG / DỊCH VỤ:", margin + 2, totalsY + 10);
    pdf.text(pdfMoney(total), pageWidth - margin - 2, totalsY + 10, { align: "right" });

    pdf.text("KHOẢN ỨNG TRƯỚC:", margin + 2, totalsY + 18);
    pdf.setTextColor(220, 38, 38);
    pdf.text(`-${pdfMoney(advance)}`, pageWidth - margin - 2, totalsY + 18, { align: "right" });

    pdf.setTextColor(15, 23, 42);
    pdf.setFillColor(37, 99, 235);
    pdf.roundedRect(margin, totalsY + 28, contentWidth, 11, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("times", "bold");
    pdf.setFontSize(11);
    pdf.text("CÒN PHẢI THANH TOÁN:", margin + 4, totalsY + 36.5);
    pdf.text(pdfMoney(remaining), pageWidth - margin - 4, totalsY + 36.5, { align: "right" });

    const filename = `Hoa-don-${pdfFilePart(invoice.invoice_number || invoice.id, invoice.id)}.pdf`;

    console.log("[Invoice PDF] Step 5 - Create Blob");
    const pdfBlob = pdf.output("blob");
    console.log("[Invoice PDF] Blob created", { filename, size: pdfBlob?.size, type: pdfBlob?.type });

    if (!(pdfBlob instanceof Blob) || pdfBlob.size <= 0 || !String(pdfBlob.type || "").toLowerCase().startsWith("application/pdf")) {
      throw new Error("PDF Blob không hợp lệ hoặc có kích thước 0.");
    }

    console.log("[Invoice PDF] Step 6 - Create Object URL");
    const url = URL.createObjectURL(pdfBlob);

    console.log("[Invoice PDF] Step 7 - Trigger browser download", { filename });
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log("[Invoice PDF] Cleanup complete");
    }, 5000);

    console.log("[Invoice PDF] Download triggered successfully");
  } catch (error) {
    console.error("[Invoice PDF] FAILED", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error
    });
    throw error;
  }
}

window.downloadInvoicePdf = downloadInvoicePdf;

window.testInvoicePdfDownload = function testInvoicePdfDownload() {
  console.log("========================================");
  console.log("[Invoice PDF TEST] START");
  console.log("========================================");
  console.log("[Invoice PDF TEST] Environment", {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    href: window.location.href,
    isVercel: window.location.hostname.includes("vercel.app"),
    isIframe: window.self !== window.top,
    hasDownloadInvoicePdf: typeof window.downloadInvoicePdf === "function",
    hasJsPdf: typeof window.jspdf?.jsPDF === "function",
    hasHtml2Pdf: typeof window.html2pdf === "function"
  });

  if (typeof window.downloadInvoicePdf !== "function") {
    console.error("[Invoice PDF TEST] downloadInvoicePdf is not available on this page.");
    return;
  }

  if (typeof window.jspdf?.jsPDF !== "function") {
    console.error("[Invoice PDF TEST] jsPDF is not available. Check script loading order on the page.");
    return;
  }

  console.log("[Invoice PDF TEST] Browser-side PDF helpers are available. Run an actual invoice download from the app to verify full end-to-end behavior.");
};
