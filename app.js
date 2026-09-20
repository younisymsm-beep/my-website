import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const DEMO_TRANSACTIONS = [
  {
    id: "demo-1",
    customerName: "أحمد محمد",
    phoneNumber: "0599111222",
    amount: 1200,
    paymentMethod: "بنك فلسطين",
    createdAt: new Date("2026-09-18T09:15:00"),
  },
  {
    id: "demo-2",
    customerName: "سارة علي",
    phoneNumber: "0599333444",
    amount: 850,
    paymentMethod: "بال باي",
    createdAt: new Date("2026-09-18T11:20:00"),
  },
  {
    id: "demo-3",
    customerName: "محمد ناصر",
    phoneNumber: "0599555666",
    amount: 2100,
    paymentMethod: "جوال باي",
    createdAt: new Date("2026-09-19T08:45:00"),
  },
];

const isFirebaseReady = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && !value.includes("YOUR_"),
);

const state = {
  transactions: [],
  searchText: "",
  paymentFilter: "الكل",
};

const dbStatusDot = document.getElementById("dbStatusDot");
const formStatus = document.getElementById("formStatus");
const transferForm = document.getElementById("transferForm");
const searchInput = document.getElementById("searchInput");
const methodFilter = document.getElementById("methodFilter");
const tableBody = document.getElementById("tableBody");
const clearDataBtn = document.getElementById("clearDataBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const methodBreakdown = document.getElementById("methodBreakdown");
const quickSummary = document.getElementById("quickSummary");
const latestTransaction = document.getElementById("latestTransaction");

const totalAmountEl = document.getElementById("totalAmount");
const totalTransactionsEl = document.getElementById("totalTransactions");
const totalCustomersEl = document.getElementById("totalCustomers");
const averageAmountEl = document.getElementById("averageAmount");

let db;
let transactionsRef;

function setupDemoMode() {
  dbStatusDot.className = "inline-flex h-3 w-3 rounded-full bg-amber-400";
  formStatus.textContent =
    "وضع العرض مفعل حالياً. أعد ضبط ملف firebase-config.js لتفعيل Firestore الحقيقي.";
  formStatus.className = "mt-4 text-sm text-amber-600";
  state.transactions = [...DEMO_TRANSACTIONS];
  renderDashboard();
}

function initFirestore() {
  if (!isFirebaseReady) {
    setupDemoMode();
    return;
  }

  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  transactionsRef = collection(db, "transactions");

  const q = query(transactionsRef, orderBy("createdAt", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      state.transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerName: data.customerName || "غير محدد",
          phoneNumber: data.phoneNumber || "-",
          amount: Number(data.amount || 0),
          paymentMethod: data.paymentMethod || "غير محدد",
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(),
        };
      });

      dbStatusDot.className = "inline-flex h-3 w-3 rounded-full bg-emerald-400";
      formStatus.textContent =
        "الرابط مع Firebase نشط. يتم تحديث البيانات فوراً.";
      formStatus.className = "mt-4 text-sm text-emerald-600";
      renderDashboard();
    },
    (error) => {
      console.error("Firestore error:", error);
      setupDemoMode();
    },
  );
}

function formatCurrency(value) {
  return `${Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ₪`;
}

function formatDateTime(date) {
  if (!date) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getFilteredTransactions() {
  const text = (state.searchText || "").trim().toLowerCase();

  return state.transactions.filter((transaction) => {
    const matchesFilter =
      state.paymentFilter === "الكل" ||
      transaction.paymentMethod === state.paymentFilter;

    const matchesSearch =
      !text ||
      transaction.customerName.toLowerCase().includes(text) ||
      transaction.phoneNumber.includes(text);

    return matchesFilter && matchesSearch;
  });
}

function renderDashboard() {
  const transactions = state.transactions;
  const totalAmount = transactions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const totalTransactions = transactions.length;
  const customers = new Set(
    transactions.map((item) => item.customerName.trim()),
  ).size;
  const averageAmount = totalTransactions ? totalAmount / totalTransactions : 0;

  totalAmountEl.textContent = formatCurrency(totalAmount);
  totalTransactionsEl.textContent = totalTransactions.toLocaleString("ar-EG");
  totalCustomersEl.textContent = customers.toLocaleString("ar-EG");
  averageAmountEl.textContent = formatCurrency(averageAmount);

  const latest = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  latestTransaction.textContent = latest
    ? `${latest.customerName} • ${formatCurrency(latest.amount)}`
    : "لا توجد معاملات";

  renderMethodBreakdown(transactions);
  renderQuickSummary(transactions);
  renderTable();
}

function renderMethodBreakdown(transactions) {
  const methods = ["بنك فلسطين", "بال باي", "جوال باي"];
  const totals = methods.map((method) => ({
    name: method,
    amount: transactions
      .filter((item) => item.paymentMethod === method)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }));

  const grandTotal = totals.reduce((sum, item) => sum + item.amount, 0);

  methodBreakdown.innerHTML = totals
    .map(({ name, amount }) => {
      const percent = grandTotal ? (amount / grandTotal) * 100 : 0;
      return `
        <div>
          <div class="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>${name}</span>
            <span>${formatCurrency(amount)}</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderQuickSummary(transactions) {
  const methods = ["بنك فلسطين", "بال باي", "جوال باي"];
  const entries = methods.map((method) => {
    const total = transactions
      .filter((item) => item.paymentMethod === method)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { method, total };
  });

  quickSummary.innerHTML = entries
    .map(
      (item) => `
        <div class="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
          <span class="text-sm font-medium text-slate-600">${item.method}</span>
          <span class="text-sm font-bold text-slate-900">${formatCurrency(item.total)}</span>
        </div>
      `,
    )
    .join("");
}

function renderTable() {
  const filtered = getFilteredTransactions();

  if (!filtered.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-sm text-slate-500">
          لا توجد بيانات مطابقة للبحث الحالي.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered
    .map(
      (item) => `
        <tr class="rounded-2xl bg-slate-50 text-right text-sm text-slate-700">
          <td class="rounded-r-2xl px-4 py-3">${formatDateTime(item.createdAt)}</td>
          <td class="px-4 py-3">${item.customerName}</td>
          <td class="px-4 py-3">${item.phoneNumber}</td>
          <td class="px-4 py-3">${item.paymentMethod}</td>
          <td class="px-4 py-3 font-bold text-slate-900">${formatCurrency(item.amount)}</td>
          <td class="rounded-l-2xl px-4 py-3">
            <button
              type="button"
              data-action="delete-row"
              data-id="${item.id}"
              class="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
            >
              حذف
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
}

async function deleteTransaction(id) {
  if (!id) return;

  if (!isFirebaseReady) {
    state.transactions = state.transactions.filter((item) => item.id !== id);
    renderDashboard();
    formStatus.textContent = "تم حذف المعاملة المحددة بنجاح.";
    formStatus.className = "mt-4 text-sm text-amber-600";
    return;
  }

  try {
    await deleteDoc(doc(db, "transactions", id));
    formStatus.textContent = "تم حذف المعاملة المحددة بنجاح.";
    formStatus.className = "mt-4 text-sm text-emerald-600";
  } catch (error) {
    console.error("Delete transaction error:", error);
    formStatus.textContent = "حدثت مشكلة أثناء حذف المعاملة.";
    formStatus.className = "mt-4 text-sm text-rose-600";
  }
}

async function clearAllTransactions() {
  if (!state.transactions.length) {
    formStatus.textContent = "لا توجد بيانات لمسحها في الوقت الحالي.";
    formStatus.className = "mt-4 text-sm text-slate-500";
    return;
  }

  if (!isFirebaseReady) {
    state.transactions = [];
    renderDashboard();
    formStatus.textContent = "تم مسح جميع البيانات بنجاح.";
    formStatus.className = "mt-4 text-sm text-amber-600";
    return;
  }

  try {
    await Promise.all(
      state.transactions.map((item) =>
        deleteDoc(doc(db, "transactions", item.id)),
      ),
    );
    formStatus.textContent = "تم مسح جميع البيانات بنجاح.";
    formStatus.className = "mt-4 text-sm text-emerald-600";
  } catch (error) {
    console.error("Clear all transactions error:", error);
    formStatus.textContent = "حدثت مشكلة أثناء مسح البيانات.";
    formStatus.className = "mt-4 text-sm text-rose-600";
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const customerName = document.getElementById("customerName").value.trim();
  const phoneNumber = document.getElementById("phoneNumber").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const paymentMethod = document.getElementById("paymentMethod").value;

  if (!customerName || !phoneNumber || !amount || !paymentMethod) {
    formStatus.textContent = "يرجى تعبئة جميع الحقول المطلوبة.";
    formStatus.className = "mt-4 text-sm text-rose-600";
    return;
  }

  if (!isFirebaseReady) {
    const entry = {
      id: `demo-${Date.now()}`,
      customerName,
      phoneNumber,
      amount,
      paymentMethod,
      createdAt: new Date(),
    };

    state.transactions = [entry, ...state.transactions];
    renderDashboard();
    formStatus.textContent =
      "تمت إضافة المعاملة محلياً في وضع العرض. ربط Firebase مطلوب للحفظ الحقيقي.";
    formStatus.className = "mt-4 text-sm text-amber-600";
    transferForm.reset();
    return;
  }

  try {
    await addDoc(transactionsRef, {
      customerName,
      phoneNumber,
      amount,
      paymentMethod,
      createdAt: serverTimestamp(),
    });

    formStatus.textContent = "تم حفظ التحويل بنجاح في Firebase.";
    formStatus.className = "mt-4 text-sm text-emerald-600";
    transferForm.reset();
  } catch (error) {
    console.error("Add document error:", error);
    formStatus.textContent = "حدثت مشكلة أثناء حفظ البيانات، حاول مرة أخرى.";
    formStatus.className = "mt-4 text-sm text-rose-600";
  }
}

function exportCsv() {
  const rows = getFilteredTransactions();
  const headers = [
    "التاريخ والوقت",
    "اسم الزبون",
    "رقم الجوال",
    "وسيلة الدفع",
    "المبلغ",
  ];
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      [
        formatDateTime(row.createdAt),
        row.customerName,
        row.phoneNumber,
        row.paymentMethod,
        row.amount,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function exportExcel() {
  const rows = getFilteredTransactions().map((row) => ({
    "التاريخ والوقت": formatDateTime(row.createdAt),
    "اسم الزبون": row.customerName,
    "رقم الجوال": row.phoneNumber,
    "وسيلة الدفع": row.paymentMethod,
    المبلغ: row.amount,
  }));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Transactions");
  XLSX.writeFile(workbook, "transactions.xlsx");
}

searchInput.addEventListener("input", (event) => {
  state.searchText = event.target.value;
  renderTable();
});

methodFilter.addEventListener("change", (event) => {
  state.paymentFilter = event.target.value;
  renderTable();
});

tableBody.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action='delete-row']");
  if (!target) return;

  const id = target.dataset.id;
  await deleteTransaction(id);
  if (!isFirebaseReady) {
    renderDashboard();
  }
});

transferForm.addEventListener("submit", handleSubmit);
document
  .getElementById("resetForm")
  .addEventListener("click", () => transferForm.reset());
document
  .getElementById("clearDataBtn")
  .addEventListener("click", clearAllTransactions);
document
  .getElementById("clearAllBtn")
  .addEventListener("click", clearAllTransactions);
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
document
  .getElementById("exportExcelBtn")
  .addEventListener("click", exportExcel);

initFirestore();
