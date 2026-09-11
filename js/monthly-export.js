import { supabase } from "./supabase.js";
import * as docx from "https://esm.sh/docx@9.5.1?bundle";

const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, HeadingLevel, ShadingType, BorderStyle } = docx;
const money = value => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const dateKey = value => String(value || "").slice(0, 10);
const monthInfo = date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const next = new Date(year, month + 1, 1);
  return { year, month, lastDay, start: `${year}-${String(month + 1).padStart(2, "0")}-01`, nextStart: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`, label: `Tháng ${String(month + 1).padStart(2, "0")}/${year}` };
};
const selectedMonth = () => { const value = new URLSearchParams(window.location.search).get("date") || new Date().toISOString().slice(0, 10); return monthInfo(new Date(`${value}T00:00:00`)); };

async function buildMonthlyData(date = new Date()) {
  const info = monthInfo(date);
  const [{ data: attendance, error: attendanceError }, { data: transactions, error: transactionError }] = await Promise.all([
    supabase.from("attendance").select("id, employee_id, work_date, morning, afternoon, work_count, note, employees(id, name)").gte("work_date", info.start).lt("work_date", info.nextStart).order("work_date"),
    supabase.from("transactions").select("transaction_date, type, amount").gte("transaction_date", info.start).lt("transaction_date", info.nextStart)
  ]);
  if (attendanceError) throw attendanceError;
  if (transactionError) throw transactionError;

  const employeeNames = ["Giới", "Khiêm"];
  const rows = Array.from({ length: info.lastDay }, (_, index) => {
    const day = index + 1;
    const value = `${info.year}-${String(info.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAttendance = (attendance || []).filter(row => dateKey(row.work_date) === value);
    const dayTransactions = (transactions || []).filter(row => dateKey(row.transaction_date) === value);
    const workValues = employeeNames.map(name => dayAttendance.filter(row => row.employees?.name === name).reduce((sum, row) => sum + (Number(row.work_count) || (row.morning ? 0.5 : 0) + (row.afternoon ? 0.5 : 0)), 0));
    const notes = [...new Set(dayAttendance.map(row => String(row.note || "").trim()).filter(Boolean))];
    return { day, values: workValues, expense: dayTransactions.filter(row => row.type === "expense").reduce((sum, row) => sum + Number(row.amount || 0), 0), income: dayTransactions.filter(row => row.type === "income").reduce((sum, row) => sum + Number(row.amount || 0), 0), note: notes[0] || "" };
  });
  const employeeTotals = employeeNames.map((_, index) => rows.reduce((sum, row) => sum + row.values[index], 0));
  return { info, employeeNames, rows, totals: { income: rows.reduce((sum, row) => sum + row.income, 0), expense: rows.reduce((sum, row) => sum + row.expense, 0), employee: employeeTotals, work: employeeTotals.reduce((sum, value) => sum + value, 0) } };
}

function exportRows(data) { return data.rows.map(row => [String(row.day), ...row.values.map(value => value.toFixed(1)), `${money(row.expense)} đ`, `${money(row.income)} đ`, row.note]); }
function showExportError(message, error) { console.error(message, error); if (typeof showToast === "function") showToast(message, "error"); }

async function exportMonthlyPDF() {
  try {
    const data = await buildMonthlyData(new Date(`${selectedMonth().year}-${String(selectedMonth().month + 1).padStart(2, "0")}-01T00:00:00`));
    const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFont("times", "bold"); pdf.setFontSize(18); pdf.text("BẢNG CHẤM CÔNG", 148, 14, { align: "center" });
    pdf.setFont("times", "normal"); pdf.setFontSize(11); pdf.text(data.info.label, 148, 21, { align: "center" });
    pdf.autoTable({ startY: 27, head: [["Ngày", "Giới", "Khiêm", "Chi", "Thu", "Ghi chú"]], body: exportRows(data), theme: "grid", styles: { font: "times", fontStyle: "normal", fontSize: 13, cellPadding: 2.5, overflow: "linebreak", lineHeight: 1.35, lineColor: [80, 80, 80], lineWidth: 0.2 }, headStyles: { font: "times", fontStyle: "bold", fontSize: 13, fillColor: [37, 99, 235], textColor: 255 }, columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 24 }, 2: { cellWidth: 24 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 130 } }, didParseCell: hook => { if (hook.section !== "body") return; const row = data.rows[hook.row.index]; if ((hook.column.index === 1 || hook.column.index === 2) && row.values[hook.column.index - 1] >= 0.5) { hook.cell.styles.fillColor = [219, 242, 255]; hook.cell.styles.fontStyle = "bold"; } if (hook.column.index === 3 && row.expense > 0) hook.cell.styles.textColor = [220, 38, 38]; if (hook.column.index === 4 && row.income > 0) hook.cell.styles.textColor = [22, 163, 74]; } });
    const summary = [["TỔNG THU", `${money(data.totals.income)} đ`], ["TỔNG CHI", `${money(data.totals.expense)} đ`], ["TỔNG CÔNG", `${data.totals.work.toFixed(1)} công`], ["Giới", `${data.totals.employee[0].toFixed(1)} công`], ["Khiêm", `${data.totals.employee[1].toFixed(1)} công`]];
    pdf.autoTable({ startY: pdf.lastAutoTable.finalY + 26, body: summary, theme: "plain", styles: { font: "times", fontSize: 13, fontStyle: "bold", cellPadding: 2, lineHeight: 1.35 }, didParseCell: hook => { if (hook.column.index === 1 && hook.row.index === 0) hook.cell.styles.textColor = [22, 163, 74]; if (hook.column.index === 1 && hook.row.index === 1) hook.cell.styles.textColor = [220, 38, 38]; } });
    pdf.save(`Bang-cham-cong-${String(data.info.month + 1).padStart(2, "0")}-${data.info.year}.pdf`);
  } catch (error) { showExportError("Không thể xuất PDF bảng chấm công. Vui lòng thử lại.", error); }
}

async function exportMonthlyWord() {
  try {
    const data = await buildMonthlyData(new Date(`${selectedMonth().year}-${String(selectedMonth().month + 1).padStart(2, "0")}-01T00:00:00`));
    const borders = { top: { style: BorderStyle.SINGLE, size: 4, color: "808080" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "808080" }, left: { style: BorderStyle.SINGLE, size: 4, color: "808080" }, right: { style: BorderStyle.SINGLE, size: 4, color: "808080" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "808080" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "808080" } };
    const cell = (text, options = {}) => new TableCell({ shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined, children: [new Paragraph({ spacing: { before: 40, after: 40, line: 276 }, alignment: options.align || "left", children: [new TextRun({ text: String(text), font: "Times New Roman", size: 26, bold: Boolean(options.bold), color: options.color })] })] });
    const header = ["Ngày", "Giới", "Khiêm", "Chi", "Thu", "Ghi chú"].map(text => cell(text, { bold: true, fill: "2563EB", color: "FFFFFF", align: "center" }));
    const body = data.rows.map(row => new TableRow({ children: [cell(row.day, { align: "center" }), cell(row.values[0].toFixed(1), { fill: row.values[0] >= 0.5 ? "DBF2FF" : undefined, align: "center" }), cell(row.values[1].toFixed(1), { fill: row.values[1] >= 0.5 ? "DBF2FF" : undefined, align: "center" }), cell(`${money(row.expense)} đ`, { color: "C00000", align: "right" }), cell(`${money(row.income)} đ`, { color: "008000", align: "right" }), cell(row.note)] }));
    const table = new Table({ rows: [new TableRow({ children: header }), ...body], width: { size: 100, type: WidthType.PERCENTAGE }, borders });
    const summary = [new Paragraph({ spacing: { before: 720, after: 120 }, children: [new TextRun({ text: "TỔNG", font: "Times New Roman", bold: true, size: 28 })] }), new Paragraph({ children: [new TextRun({ text: `TỔNG THU: ${money(data.totals.income)} đ`, font: "Times New Roman", bold: true, size: 26, color: "008000" })] }), new Paragraph({ children: [new TextRun({ text: `TỔNG CHI: ${money(data.totals.expense)} đ`, font: "Times New Roman", bold: true, size: 26, color: "C00000" })] }), new Paragraph({ children: [new TextRun({ text: `TỔNG CÔNG: ${data.totals.work.toFixed(1)} công`, font: "Times New Roman", bold: true, size: 26 })] }), ...data.employeeNames.map((name, index) => new Paragraph({ children: [new TextRun({ text: `${name}: ${data.totals.employee[index].toFixed(1)} công`, font: "Times New Roman", bold: true, size: 26 })] }))];
    const wordDocument = new Document({ styles: { default: { document: { run: { font: "Times New Roman" } } } }, sections: [{ properties: { page: { size: { orientation: "landscape", width: 15840, height: 12240 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: "BẢNG CHẤM CÔNG", font: "Times New Roman", bold: true, size: 32 })] }), new Paragraph({ alignment: "center", children: [new TextRun({ text: data.info.label, font: "Times New Roman", size: 22 })] }), table, ...summary] }] });
    const blob = await Packer.toBlob(wordDocument);
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Bang-cham-cong-${String(data.info.month + 1).padStart(2, "0")}-${data.info.year}.docx`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) { showExportError("Không thể xuất file Word. Vui lòng thử lại.", error); }
}

async function printMonthlyA4() {
  try {
    const data = await buildMonthlyData(new Date(`${selectedMonth().year}-${String(selectedMonth().month + 1).padStart(2, "0")}-01T00:00:00`));
    const oldPrintArea = document.getElementById("monthly-print-area");
    oldPrintArea?.remove();
    const area = document.createElement("section");
    area.id = "monthly-print-area";
    const rows = data.rows.map(row => `<tr><td>${row.day}</td><td class="work ${row.values[0] >= 0.5 ? "worked" : ""}">${row.values[0].toFixed(1)}</td><td class="work ${row.values[1] >= 0.5 ? "worked" : ""}">${row.values[1].toFixed(1)}</td><td class="expense">${money(row.expense)} đ</td><td class="income">${money(row.income)} đ</td><td>${escapePrintText(row.note)}</td></tr>`).join("");
    area.innerHTML = `<h1>BẢNG CHẤM CÔNG</h1><p>${data.info.label}</p><table><thead><tr><th>Ngày</th><th>Giới</th><th>Khiêm</th><th>Chi</th><th>Thu</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table><div class="print-summary-gap"></div><h2>TỔNG</h2><strong>TỔNG THU: <span class="income">${money(data.totals.income)} đ</span></strong><br><strong>TỔNG CHI: <span class="expense">${money(data.totals.expense)} đ</span></strong><br><strong>TỔNG CÔNG: ${data.totals.work.toFixed(1)} công</strong><br><strong>Giới: ${data.totals.employee[0].toFixed(1)} công</strong><br><strong>Khiêm: ${data.totals.employee[1].toFixed(1)} công</strong>`;
    document.body.appendChild(area);
    window.print();
    setTimeout(() => area.remove(), 500);
  } catch (error) { showExportError("Không thể in bảng chấm công. Vui lòng thử lại.", error); }
}

function escapePrintText(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }

Object.assign(window, { exportMonthlyPDF, exportMonthlyWord, printMonthlyA4 });
