const http = require('http');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const SUPABASE_URL = 'https://wewbgxkhbsfgzgmflsjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_muNwZ8bQdBBRUYqtCmo9QQ_mha49tXX';
const pdfFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const pdfBoldFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const formatMoney = value => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} đ`;
const formatDate = value => { const parts = String(value || '').slice(0, 10).split('-'); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : ''; };
const filePart = (value, fallback) => { const result = String(value || fallback || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return result || fallback; };
const supabaseFetch = async table => { const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }); if (!response.ok) throw new Error(`Supabase ${table}: ${response.status}`); return response.json(); };

function drawPdfInvoice(res, invoice, items) {
  const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
  const filename = `Hoa-don-${filePart(invoice.invoice_number, invoice.id)}-${filePart(invoice.customer_name, 'Khach-hang')}-${filePart(formatDate(invoice.updated_at || invoice.created_at || invoice.invoice_date).replace(/\//g, '-'), 'Chua-cap-nhat')}.pdf`;
  res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  document.pipe(res);
  document.font(pdfBoldFont).fontSize(16).text('HÓA ĐƠN', { align: 'center' });
  document.font(pdfBoldFont).fontSize(18).text(invoice.title || 'Hóa đơn Thanh toán', { align: 'center' });
  document.font(pdfFont).fontSize(10).text(`Số hóa đơn: ${invoice.invoice_number || invoice.id}    Ngày lập hóa đơn: ${formatDate(invoice.invoice_date)}`, { align: 'center' });
  document.moveDown(0.8).font(pdfBoldFont).fontSize(11).text('THÔNG TIN KHÁCH HÀNG');
  document.font(pdfFont).fontSize(10).text(`Tên khách hàng / Doanh nghiệp: ${invoice.customer_name || ''}`);
  document.text(`Địa chỉ: ${invoice.customer_address || ''}`);
  document.text(`Số điện thoại: ${invoice.customer_phone || ''}`);
  if (invoice.description) document.text(`Diễn giải: ${invoice.description}`);
  document.moveDown(0.8);
  const columns = [{ title: 'STT', width: 38, align: 'center' }, { title: 'TÊN CÔNG VIỆC', width: 210, align: 'left' }, { title: 'SL', width: 42, align: 'center' }, { title: 'ĐƠN VỊ', width: 58, align: 'center' }, { title: 'ĐƠN GIÁ', width: 92, align: 'right' }, { title: 'THÀNH TIỀN', width: 105, align: 'right' }, { title: 'GHI CHÚ', width: 185, align: 'left' }];
  const tableX = document.x;
  const drawRow = (values, header = false) => { const heights = values.map((value, index) => document.heightOfString(String(value || ''), { width: columns[index].width - 8, align: columns[index].align })); const height = Math.max(24, Math.max(...heights) + 10); let x = tableX; values.forEach((value, index) => { document.rect(x, document.y, columns[index].width, height).fillAndStroke(header ? '#e2e8f0' : '#ffffff', '#64748b'); document.fillColor('#111827').font(header ? pdfBoldFont : pdfFont).fontSize(header ? 8 : 8.5).text(String(value || ''), x + 4, document.y + 5, { width: columns[index].width - 8, align: columns[index].align }); x += columns[index].width; }); document.y += height; };
  drawRow(columns.map(column => column.title), true);
  (items || []).forEach((item, index) => drawRow([index + 1, item.name || '', Number(item.quantity) || 0, item.unit || '-', formatMoney(item.unit_price), formatMoney(item.total), item.note || '-']));
  const total = (items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const advance = Number(invoice.advance_amount) || 0;
  const remaining = Math.max(0, total - advance);
  document.moveDown(1).font(pdfBoldFont).fontSize(11).text(`TỔNG TIỀN HÀNG / DỊCH VỤ: ${formatMoney(total)}`, { align: 'right' });
  document.font(pdfFont).text(`KHOẢN ỨNG TRƯỚC: -${formatMoney(advance)}`, { align: 'right' });
  document.font(pdfBoldFont).fontSize(13).text(`CÒN PHẢI THANH TOÁN: ${formatMoney(remaining)}`, { align: 'right' });
  document.end();
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const invoicePdfMatch = requestUrl.pathname.match(/^\/api\/invoices\/([^/]+)\/pdf$/);
  if (invoicePdfMatch) {
    const invoiceId = decodeURIComponent(invoicePdfMatch[1]);
    Promise.all([
      supabaseFetch(`invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*`),
      supabaseFetch(`invoice_items?invoice_id=eq.${encodeURIComponent(invoiceId)}&select=*&order=sort_order.asc`)
    ]).then(([invoices, items]) => {
      if (!invoices[0]) throw new Error('Không tìm thấy hóa đơn.');
      drawPdfInvoice(res, invoices[0], items || []);
    }).catch(error => { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(`Không thể tạo PDF: ${error.message}`); });
    return;
  }
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

