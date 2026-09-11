/**
 * Quản Lý Công Việc - Mobile Web App Logic
 * Designed strictly following Figma Design (KL_MOBILE)
 */

// Initial Sample Data matching Figma
const DEFAULT_ATTENDANCE = [
  {
    id: "att-1",
    date: "10/09/2026",
    dateLabel: "Hôm nay",
    subDate: "Thứ Năm • Đã xác nhận đầy đủ",
    totalCong: 2.0,
    statusText: "2.0 công",
    workers: [
      { id: "w1", code: "G", name: "Giới", sang: true, chieu: true, cong: 1.0, color: "blue" },
      { id: "w2", code: "K", name: "Khiêm", sang: true, chieu: true, cong: 1.0, color: "green" }
    ],
    thu: 1000000,
    chi: 100000,
    location: "Nhà máy A - Lắp ráp dây chuyền sản xuất tự động",
    category: "work"
  },
  {
    id: "att-2",
    date: "09/09/2026",
    dateLabel: "Hôm qua",
    subDate: "Thứ Tư • Ca kỹ thuật",
    totalCong: 1.5,
    statusText: "1.5 công",
    workers: [
      { id: "w1", code: "G", name: "Giới ", sang: true, chieu: true, cong: 1.0, color: "blue" },
      { id: "w2", code: "K", name: "Khiêm", sang: true, chieu: false, cong: 0.5, color: "indigo" }
    ],
    thu: 750000,
    chi: 50000,
    location: "Giao hàng & sửa chữa máy B",
    category: "repair"
  },
  {
    id: "att-3",
    date: "08/09/2026",
    dateLabel: "08/09/2026",
    subDate: "Thứ Ba • Bảo trì định kỳ",
    totalCong: 1.0,
    statusText: "1.0 công",
    workers: [
      { id: "w4", code: "N4", name: "Người 4", sang: true, chieu: true, cong: 1.0, color: "orange" }
    ],
    thu: 500000,
    chi: 0,
    location: "Bảo trì định kỳ máy dập khu B",
    category: "maintenance"
  }
];

const DEFAULT_FINANCE = [
  {
    id: "fn-1",
    type: "thu",
    amount: 1000000,
    formattedAmount: "+1.000.000 đ",
    date: "10/09/2026 • 15:40",
    title: "Tạm ứng công trình Nhà máy A",
    member: "A",
    memberColor: "blue",
    method: "Chuyển khoản Vietcombank",
    methodIcon: "fa-credit-card",
    status: "Đã khớp",
    statusBg: "bg-slate-100 text-slate-700"
  },
  {
    id: "fn-2",
    type: "chi",
    amount: 100000,
    formattedAmount: "-100.000 đ",
    date: "10/09/2026 • 11:15",
    title: "Mua vật tư ốc vít, mũi khoan",
    member: "B",
    memberColor: "green",
    method: "Hóa đơn lẻ tiệm điện nước",
    methodIcon: "fa-file-invoice",
    status: "Có ảnh bill",
    statusBg: "bg-blue-50 text-blue-700"
  },
  {
    id: "fn-3",
    type: "thu",
    amount: 750000,
    formattedAmount: "+750.000 đ",
    date: "09/09/2026 • 17:02",
    title: "Khách thanh toán sửa máy B",
    member: "C",
    memberColor: "purple",
    method: "Tiền mặt tại xưởng",
    methodIcon: "fa-money-bill-wave",
    status: "Thủ quỹ nhận",
    statusBg: "bg-blue-50 text-blue-700"
  },
  {
    id: "fn-4",
    type: "chi",
    amount: 250000,
    formattedAmount: "-250.000 đ",
    date: "08/09/2026 • 08:30",
    title: "Đổ xăng xe tải nhóm",
    member: "B",
    memberColor: "green",
    method: "Người 2 chi tiền túi",
    methodIcon: "fa-user",
    status: "Cần hoàn trả",
    statusBg: "bg-rose-50 text-rose-600 font-medium"
  },
  {
    id: "fn-5",
    type: "thu",
    amount: 15000000,
    formattedAmount: "+15.000.000 đ",
    date: "05/09/2026 • 10:20",
    title: "Quyết toán đợt 1 HD-004",
    member: "D",
    memberColor: "indigo",
    method: "Chuyển khoản BIDV doanh nghiệp",
    methodIcon: "fa-building-columns",
    status: "Hợp đồng lớn",
    statusBg: "bg-blue-50 text-blue-700 font-medium"
  }
];

const DEFAULT_INVOICES = [
  {
    id: "hd-006",
    code: "HD-006",
    client: "Công ty Cơ Khí HINH",
    date: "10/09/2026",
    amount: 28688000,
    formattedAmount: "28.688.000 VNĐ",
    status: "Đã lưu",
    statusClass: "bg-emerald-100 text-emerald-800",
    type: "Hợp đồng gia công"
  },
  {
    id: "hd-005",
    code: "HD-005",
    client: "Anh Nam Q.7",
    date: "08/09/2026",
    amount: 4500000,
    formattedAmount: "4.500.000 VNĐ",
    status: "Đã xuất",
    statusClass: "bg-blue-100 text-blue-800",
    type: "Sửa chữa lắp đặt"
  },
  {
    id: "hd-004",
    code: "HD-004",
    client: "Cơ điện lạnh Miền Nam",
    date: "05/09/2026",
    amount: 15000000,
    formattedAmount: "15.000.000 VNĐ",
    status: "Đã thanh toán",
    statusClass: "bg-emerald-100 text-emerald-800",
    type: "Đợt 1 quyết toán"
  }
];

// App State
const state = {
  activeScreen: "home",
  isLoggedIn: true,
  deviceMode: "mobile", // 'mobile' or 'responsive'
  financeFilter: "all", // 'all', 'thu', 'chi'
  memberFilter: "all",
  searchKeyword: "",
  
  attendanceList: JSON.parse(localStorage.getItem("app_attendance")) || DEFAULT_ATTENDANCE,
  financeList: JSON.parse(localStorage.getItem("app_finance")) || DEFAULT_FINANCE,
  invoiceList: JSON.parse(localStorage.getItem("app_invoices")) || DEFAULT_INVOICES,
  
  // New Attendance Form temporary state
  newAttendance: {
    date: "10/09/2026",
    dayOfWeek: "Thứ Năm",
    dateType: "today", // 'today' or 'yesterday'
    workers: {
      w1: { selected: true, name: "Giới", code: "G", sang: true, chieu: true },
      w2: { selected: true, name: "Khiêm", code: "K", sang: true, chieu: false }
      // w3: { selected: false, name: "Người 3", code: "N3", sang: false, chieu: false },
      // w4: { selected: false, name: "Người 4", code: "N4", sang: false, chieu: false }
    },
    thu: 1000000,
    chi: 100000,
    notes: "Nhà máy A - hoàn thiện đơn hàng"
  }
};

// Utilities
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  const toastText = document.getElementById("toast-text");
  const toastIcon = document.getElementById("toast-icon");
  
  toastText.textContent = message;
  if (type === "success") {
    toastIcon.className = "fas fa-circle-check text-emerald-500 text-lg";
  } else if (type === "error") {
    toastIcon.className = "fas fa-triangle-exclamation text-rose-500 text-lg";
  } else {
    toastIcon.className = "fas fa-circle-info text-blue-500 text-lg";
  }
  
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// Navigation & Screen switching
function switchScreen(screenName) {
  state.activeScreen = screenName;
  
  // Update Bottom Nav Active States
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  navItems.forEach(item => {
    if (item.getAttribute("data-screen") === screenName) {
      item.classList.add("active");
      item.classList.remove("text-slate-400");
      item.classList.add("text-blue-600");
    } else {
      item.classList.remove("active");
      item.classList.remove("text-blue-600");
      item.classList.add("text-slate-400");
    }
  });

  // Toggle screens
  const screens = ["home", "attendance", "finance", "invoices", "login"];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) {
      if (s === screenName) {
        el.classList.remove("hidden");
        el.classList.add("screen-fade");
      } else {
        el.classList.add("hidden");
        el.classList.remove("screen-fade");
      }
    }
  });

  // Hide or show bottom navigation
  const bottomNav = document.getElementById("bottom-navigation");
  if (bottomNav) {
    if (screenName === "login") {
      bottomNav.classList.add("hidden");
    } else {
      bottomNav.classList.remove("hidden");
    }
  }

  // Scroll top
  const scrollArea = document.querySelector(".app-scroll-area");
  if (scrollArea) scrollArea.scrollTop = 0;

  // Re-render specific screen content if needed
  if (screenName === "home") renderHomeScreen();
  if (screenName === "attendance") renderAttendanceScreen();
  if (screenName === "finance") renderFinanceScreen();
  if (screenName === "invoices") renderInvoiceScreen();
}

// Render Home Screen
function renderHomeScreen() {
  const container = document.getElementById("home-recent-attendance");
  if (!container) return;

  const items = state.attendanceList.slice(0, 2);
  container.innerHTML = items.map(item => `
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] card-touchable mb-3" onclick="openAttendanceDetail('${item.id}')">
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-[14px]">${item.date}</span>
          <span class="text-slate-400 text-xs">•</span>
          <span class="text-slate-600 text-[13px] font-medium truncate max-w-[150px]">
            ${item.workers.map(w => w.name).join(' & ')}
          </span>
        </div>
        <span class="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
          ${item.totalCong.toFixed(1)} công
        </span>
      </div>

      <div class="flex items-center justify-between text-xs text-slate-500 mb-2.5 pb-2 border-b border-slate-50">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1 font-medium text-slate-700">
            Sáng <i class="fas fa-check-circle text-emerald-500"></i>
          </span>
          <span class="flex items-center gap-1 font-medium ${item.workers.some(w => w.chieu) ? 'text-slate-700' : 'text-slate-400'}">
            Chiều ${item.workers.some(w => w.chieu) ? '<i class="fas fa-check-circle text-emerald-500"></i>' : '<i class="fas fa-times-circle text-slate-300"></i>'}
          </span>
        </div>
        <div class="flex items-center gap-1 text-slate-500 truncate max-w-[150px]">
          <i class="fas fa-location-dot text-rose-500 text-[11px]"></i>
          <span class="truncate">${item.location.split(' - ')[0]}</span>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs pt-0.5">
        <div class="text-emerald-600 font-semibold flex items-center gap-1">
          <span>Thu:</span>
          <span>+${new Intl.NumberFormat('vi-VN').format(item.thu)} đ</span>
        </div>
        <div class="${item.chi > 0 ? 'text-rose-600' : 'text-slate-500'} font-semibold flex items-center gap-1">
          <span>Chi:</span>
          <span>${item.chi > 0 ? '-' + new Intl.NumberFormat('vi-VN').format(item.chi) : '0'} đ</span>
        </div>
      </div>
    </div>
  `).join('');

  // Render recent invoices
  const invoiceContainer = document.getElementById("home-recent-invoices");
  if (invoiceContainer) {
    const invoices = state.invoiceList.slice(0, 2);
    invoiceContainer.innerHTML = invoices.map(inv => `
      <div class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] card-touchable mb-3 flex items-center justify-between" onclick="switchScreen('invoices')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <i class="fas fa-file-invoice text-lg"></i>
          </div>
          <div>
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="font-bold text-blue-600 text-xs">${inv.code}</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">
                ${inv.status}
              </span>
            </div>
            <div class="font-semibold text-slate-800 text-sm leading-snug">${inv.client}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${inv.date}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-slate-900 text-sm">${new Intl.NumberFormat('vi-VN').format(inv.amount)}</div>
          <div class="text-[10px] text-slate-400 font-medium">VNĐ</div>
        </div>
      </div>
    `).join('');
  }
}

// Render Attendance Screen
function renderAttendanceScreen() {
  const container = document.getElementById("attendance-cards-list");
  if (!container) return;

  let filtered = state.attendanceList;

  // Search filter
  if (state.searchKeyword.trim()) {
    const kw = state.searchKeyword.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.date.includes(kw) || 
      item.location.toLowerCase().includes(kw) ||
      item.workers.some(w => w.name.toLowerCase().includes(kw))
    );
  }

  // Member filter
  if (state.memberFilter !== "all") {
    filtered = filtered.filter(item => 
      item.workers.some(w => w.name.includes(state.memberFilter) || w.code === state.memberFilter)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <i class="fas fa-calendar-xmark text-4xl mb-3 text-slate-300"></i>
        <p class="text-sm">Không tìm thấy bản ghi chấm công nào phù hợp</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-4">
      <!-- Card Header -->
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 text-[15px]">${item.date}</span>
            ${item.dateLabel === 'Hôm nay' ? `
              <span class="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Hôm nay</span>
            ` : ''}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${item.subDate}</p>
        </div>
        <div class="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-1.5">
          <i class="fas fa-check-circle text-blue-600"></i>
          <span>${item.totalCong.toFixed(1)} công</span>
        </div>
      </div>

      <!-- Workers List in Card -->
      <div class="bg-slate-50/70 rounded-xl p-3 mb-3 space-y-2.5">
        ${item.workers.map(w => `
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                ${w.code}
              </span>
              <span class="font-semibold text-slate-800 text-[13px]">${w.name}</span>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${w.sang ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}">
                <i class="fas ${w.sang ? 'fa-check' : 'fa-minus'} text-[9px]"></i> Sáng
              </span>
              <span class="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${w.chieu ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}">
                <i class="fas ${w.chieu ? 'fa-check' : 'fa-minus'} text-[9px]"></i> Chiều
              </span>
              <span class="font-semibold text-slate-700 text-[12px] min-w-[50px] text-right">
                ${w.cong.toFixed(1)} công
              </span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Money Summary Grid -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-arrow-down text-xs"></i>
          </div>
          <div>
            <div class="text-[10px] text-emerald-700 font-medium">Tiền Thu</div>
            <div class="text-xs font-bold text-emerald-700">+${new Intl.NumberFormat('vi-VN').format(item.thu)} đ</div>
          </div>
        </div>

        <div class="bg-rose-50/60 rounded-xl p-2.5 border border-rose-100 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-arrow-up text-xs"></i>
          </div>
          <div>
            <div class="text-[10px] text-rose-700 font-medium">Tiền Chi</div>
            <div class="text-xs font-bold text-rose-700">${item.chi > 0 ? '-' + new Intl.NumberFormat('vi-VN').format(item.chi) : '0'} đ</div>
          </div>
        </div>
      </div>

      <!-- Work Location / Notes -->
      <div class="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 flex items-start gap-2 mb-3">
        <i class="fas fa-location-dot text-blue-500 text-xs mt-0.5"></i>
        <span class="leading-relaxed">${item.location}</span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button onclick="openAttendanceDetail('${item.id}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition">
          <i class="fas fa-eye text-slate-500"></i> Chi tiết
        </button>
        <button onclick="openEditAttendance('${item.id}')" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition">
          <i class="fas fa-pen text-blue-500"></i> Sửa
        </button>
      </div>
    </div>
  `).join('');
}

// Render Finance Screen
function renderFinanceScreen() {
  const container = document.getElementById("finance-transactions-list");
  if (!container) return;

  let filtered = state.financeList;
  if (state.financeFilter === "thu") {
    filtered = filtered.filter(f => f.type === "thu");
  } else if (state.financeFilter === "chi") {
    filtered = filtered.filter(f => f.type === "chi");
  }

  // Update counts on filter tabs
  const totalCount = state.financeList.length;
  const thuCount = state.financeList.filter(f => f.type === "thu").length;
  const chiCount = state.financeList.filter(f => f.type === "chi").length;

  const countAll = document.getElementById("count-all");
  const countThu = document.getElementById("count-thu");
  const countChi = document.getElementById("count-chi");
  if (countAll) countAll.textContent = `(${totalCount})`;
  if (countThu) countThu.textContent = `(${thuCount})`;
  if (countChi) countChi.textContent = `(${chiCount})`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400">
        <i class="fas fa-receipt text-3xl mb-2 text-slate-300"></i>
        <p class="text-xs">Không có khoản giao dịch nào</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isThu = item.type === "thu";
    return `
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-3 card-touchable">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isThu ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              <i class="fas ${isThu ? 'fa-arrow-down' : 'fa-arrow-up'} text-[9px]"></i>
              ${isThu ? 'THU' : 'CHI'}
            </span>
            <span class="text-[11px] text-slate-400">${item.date}</span>
          </div>

          <span class="font-bold text-[14px] ${isThu ? 'text-emerald-600' : 'text-rose-600'}">
            ${isThu ? '+' : '-'}${new Intl.NumberFormat('vi-VN').format(item.amount)} đ
          </span>
        </div>

        <div class="flex items-center justify-between mb-2.5">
          <h4 class="font-bold text-slate-800 text-[14px] leading-snug">${item.title}</h4>
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 ml-2">
            ${item.member}
          </span>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
          <div class="flex items-center gap-1.5 truncate max-w-[200px]">
            <i class="fas ${item.methodIcon || 'fa-credit-card'} text-slate-400 text-xs"></i>
            <span class="truncate">${item.method}</span>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full ${item.statusBg || 'bg-slate-100 text-slate-600'}">
            ${item.status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Render Invoices Screen
function renderInvoiceScreen() {
  const container = document.getElementById("invoice-cards-list");
  if (!container) return;

  container.innerHTML = state.invoiceList.map(inv => `
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-3.5 card-touchable">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-blue-600 text-sm">${inv.code}</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${inv.statusClass}">
            ${inv.status}
          </span>
        </div>
        <span class="text-xs text-slate-400">${inv.date}</span>
      </div>

      <h4 class="font-bold text-slate-800 text-base mb-1">${inv.client}</h4>
      <p class="text-xs text-slate-500 mb-3">${inv.type}</p>

      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-xs text-slate-400">Tổng thanh toán:</span>
        <span class="font-extrabold text-slate-900 text-base">${inv.formattedAmount}</span>
      </div>
    </div>
  `).join('');
}

// Open / Close Modal Chấm Công Mới
function openAddAttendanceModal() {
  const modal = document.getElementById("modal-add-attendance");
  if (modal) {
    modal.classList.remove("modal-hidden");
    updateModalCalculation();
  }
}

function closeAddAttendanceModal() {
  const modal = document.getElementById("modal-add-attendance");
  if (modal) {
    modal.classList.add("modal-hidden");
  }
}

// Update Modal Calculation live
function updateModalCalculation() {
  const workers = state.newAttendance.workers;
  let activeWorkers = 0;
  let totalCong = 0;

  Object.values(workers).forEach(w => {
    if (w.selected) {
      activeWorkers++;
      if (w.sang) totalCong += 0.5;
      if (w.chieu) totalCong += 0.5;
    }
  });

  const calcEl = document.getElementById("modal-calc-summary");
  if (calcEl) {
    calcEl.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
          <i class="fas fa-calculator"></i>
        </div>
        <div class="font-bold text-blue-950 text-[13px]">
          Tổng cộng: <span class="text-blue-600">${activeWorkers} người làm</span> | 
          <span class="text-blue-600">${totalCong.toFixed(1)} công</span>
        </div>
      </div>
      <div class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
    `;
  }
}

// Toggle shift in modal
function toggleWorkerShift(workerId, shift) {
  const w = state.newAttendance.workers[workerId];
  if (!w) return;

  w[shift] = !w[shift];

  // Update button visual
  const btn = document.getElementById(`btn-${workerId}-${shift}`);
  if (btn) {
    if (w[shift]) {
      btn.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white flex items-center justify-center gap-1.5 transition";
      btn.innerHTML = `<i class="fas fa-sun text-xs"></i> ${shift === 'sang' ? 'Sáng (0.5)' : 'Chiều (0.5)'}`;
    } else {
      btn.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center gap-1.5 transition";
      btn.innerHTML = `<i class="fas fa-circle-minus text-xs text-slate-400"></i> ${shift === 'sang' ? 'Sáng' : 'Chiều'}`;
    }
  }

  // Update worker's cong badge
  let workerCong = 0;
  if (w.sang) workerCong += 0.5;
  if (w.chieu) workerCong += 0.5;
  const badge = document.getElementById(`badge-cong-${workerId}`);
  if (badge) {
    badge.textContent = `${workerCong.toFixed(1)} công`;
  }

  updateModalCalculation();
}

// Toggle worker selection in modal
function toggleWorkerSelection(workerId, isChecked) {
  if (state.newAttendance.workers[workerId]) {
    state.newAttendance.workers[workerId].selected = isChecked;
    updateModalCalculation();
  }
}

// Quick amount buttons
function addQuickAmount(type, addValue) {
  if (type === "thu") {
    state.newAttendance.thu += addValue;
    const input = document.getElementById("input-thu-amount");
    if (input) input.value = state.newAttendance.thu;
    const display = document.getElementById("display-thu-amount");
    if (display) display.textContent = new Intl.NumberFormat('vi-VN').format(state.newAttendance.thu);
  }
}

// Save attendance record from modal
function saveAttendanceForm() {
  const workers = state.newAttendance.workers;
  const activeWorkersList = [];
  let totalCong = 0;

  Object.entries(workers).forEach(([id, w]) => {
    if (w.selected && (w.sang || w.chieu)) {
      let c = (w.sang ? 0.5 : 0) + (w.chieu ? 0.5 : 0);
      totalCong += c;
      activeWorkersList.push({
        id: id,
        code: w.code,
        name: w.name,
        sang: w.sang,
        chieu: w.chieu,
        cong: c
      });
    }
  });

  if (activeWorkersList.length === 0) {
    showToast("Vui lòng chọn ít nhất 1 nhân sự và ca làm!", "error");
    return;
  }

  const notesInput = document.getElementById("input-attendance-notes");
  const notes = notesInput ? notesInput.value.trim() : state.newAttendance.notes;

  const newRecord = {
    id: "att-" + Date.now(),
    date: state.newAttendance.date,
    dateLabel: "Hôm nay",
    subDate: "Thứ Năm • Đã xác nhận",
    totalCong: totalCong,
    statusText: `${totalCong.toFixed(1)} công`,
    workers: activeWorkersList,
    thu: state.newAttendance.thu,
    chi: state.newAttendance.chi,
    location: notes || "Hoàn thành công việc trong ngày",
    category: "work"
  };

  // Prepend to attendance list
  state.attendanceList.unshift(newRecord);
  localStorage.setItem("app_attendance", JSON.stringify(state.attendanceList));

  // If there's money recorded, also add to finance list
  if (state.newAttendance.thu > 0) {
    state.financeList.unshift({
      id: "fn-" + Date.now(),
      type: "thu",
      amount: state.newAttendance.thu,
      formattedAmount: `+${new Intl.NumberFormat('vi-VN').format(state.newAttendance.thu)} đ`,
      date: `${state.newAttendance.date} • ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`,
      title: `Tiền thu theo ca - ${notes || 'Chấm công'}`,
      member: "A",
      memberColor: "blue",
      method: "Tiền mặt / Chuyển khoản",
      methodIcon: "fa-wallet",
      status: "Thủ quỹ nhận",
      statusBg: "bg-blue-50 text-blue-700"
    });
  }

  if (state.newAttendance.chi > 0) {
    state.financeList.unshift({
      id: "fn-" + (Date.now() + 1),
      type: "chi",
      amount: state.newAttendance.chi,
      formattedAmount: `-${new Intl.NumberFormat('vi-VN').format(state.newAttendance.chi)} đ`,
      date: `${state.newAttendance.date} • ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`,
      title: `Chi phí phát sinh ca làm`,
      member: "B",
      memberColor: "green",
      method: "Chi tiền túi",
      methodIcon: "fa-user",
      status: "Cần hoàn trả",
      statusBg: "bg-rose-50 text-rose-600 font-medium"
    });
  }

  localStorage.setItem("app_finance", JSON.stringify(state.financeList));

  closeAddAttendanceModal();
  renderHomeScreen();
  renderAttendanceScreen();
  renderFinanceScreen();
  showToast("Lưu chấm công thành công!", "success");
}

// Open Detail Modal
function openAttendanceDetail(id) {
  const item = state.attendanceList.find(a => a.id === id);
  if (!item) return;
  showToast(`Xem chi tiết ca ngày ${item.date} (${item.totalCong} công)`, "info");
}

function openEditAttendance(id) {
  showToast(`Mở giao diện sửa bản ghi chấm công`, "info");
}

// Export utilities
function exportReport(type) {
  if (type === "pdf") {
    showToast("Đang chuẩn bị file PDF báo cáo chấm công & thu chi...", "info");
    setTimeout(() => {
      window.print();
    }, 600);
  } else if (type === "word") {
    showToast("Đã trích xuất tệp dữ liệu báo cáo (.docx) thành công!", "success");
  } else if (type === "print") {
    window.print();
  }
}

// Device View Mode Toggle (Mobile Mockup vs Responsive)
function setDeviceMode(mode) {
  state.deviceMode = mode;
  const wrapper = document.getElementById("device-container");
  const btnMobile = document.getElementById("btn-mode-mobile");
  const btnResponsive = document.getElementById("btn-mode-responsive");

  if (mode === "mobile") {
    wrapper.classList.remove("responsive-mode");
    wrapper.classList.add("mobile-mode");
    btnMobile.classList.add("bg-blue-600", "text-white");
    btnMobile.classList.remove("text-slate-300", "hover:bg-slate-800");
    btnResponsive.classList.remove("bg-blue-600", "text-white");
    btnResponsive.classList.add("text-slate-300", "hover:bg-slate-800");
  } else {
    wrapper.classList.remove("mobile-mode");
    wrapper.classList.add("responsive-mode");
    btnResponsive.classList.add("bg-blue-600", "text-white");
    btnResponsive.classList.remove("text-slate-300", "hover:bg-slate-800");
    btnMobile.classList.remove("bg-blue-600", "text-white");
    btnMobile.classList.add("text-slate-300", "hover:bg-slate-800");
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  // Render screens
  renderHomeScreen();
  renderAttendanceScreen();
  renderFinanceScreen();
  renderInvoiceScreen();

  // Bottom Navigation event listeners
  document.querySelectorAll(".bottom-nav .nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const screen = item.getAttribute("data-screen");
      if (screen) switchScreen(screen);
    });
  });

  // Chấm công button in top bar or cards
  const btnAddToday = document.getElementById("btn-cham-cong-today");
  if (btnAddToday) {
    btnAddToday.addEventListener("click", openAddAttendanceModal);
  }
  const btnAddAtt = document.getElementById("btn-cham-cong-top");
  if (btnAddAtt) {
    btnAddAtt.addEventListener("click", openAddAttendanceModal);
  }

  // Close modal
  const btnCloseModal = document.getElementById("btn-close-modal");
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeAddAttendanceModal);
  }
  const btnBackModal = document.getElementById("btn-back-modal");
  if (btnBackModal) {
    btnBackModal.addEventListener("click", closeAddAttendanceModal);
  }

  // Finance Filter Tabs
  document.querySelectorAll(".finance-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".finance-tab-btn").forEach(b => {
        b.className = "finance-tab-btn flex-1 py-1.5 text-xs font-semibold text-slate-500 rounded-lg transition hover:text-slate-700";
      });
      btn.className = "finance-tab-btn flex-1 py-1.5 text-xs font-bold text-blue-600 bg-white shadow-sm rounded-lg transition";
      state.financeFilter = btn.getAttribute("data-filter");
      renderFinanceScreen();
    });
  });

  // Member Filter Chips in Attendance
  document.querySelectorAll(".member-chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".member-chip-btn").forEach(b => {
        b.classList.remove("bg-blue-600", "text-white");
        b.classList.add("bg-white", "text-slate-700", "border", "border-slate-200");
      });
      btn.classList.add("bg-blue-600", "text-white");
      btn.classList.remove("bg-white", "text-slate-700", "border", "border-slate-200");
      state.memberFilter = btn.getAttribute("data-member");
      renderAttendanceScreen();
    });
  });

  // Search input in Attendance
  const searchInput = document.getElementById("attendance-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchKeyword = e.target.value;
      renderAttendanceScreen();
    });
  }

  // Login form handler
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Đăng nhập thành công! Đang chuyển vào ứng dụng...", "success");
      setTimeout(() => {
        switchScreen("home");
      }, 500);
    });
  }

  // Password toggle in Login
  const btnTogglePwd = document.getElementById("btn-toggle-password");
  const pwdInput = document.getElementById("login-password");
  if (btnTogglePwd && pwdInput) {
    btnTogglePwd.addEventListener("click", () => {
      const type = pwdInput.getAttribute("type") === "password" ? "text" : "password";
      pwdInput.setAttribute("type", type);
      btnTogglePwd.innerHTML = type === "password" ? '<i class="far fa-eye text-slate-400"></i>' : '<i class="far fa-eye-slash text-blue-600"></i>';
    });
  }
});

