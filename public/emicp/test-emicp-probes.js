/* سيناريوهات هجومية للتحقق من مشاكل مشتبه بها في المنطق الحالي */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const appSource = fs.readFileSync(path.join(__dirname, "app.js"), "utf-8");
const HTML = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>t</title></head>
<body><div id="app"></div><dialog class="dialog" id="app-dialog"><div id="dialog-content"></div></dialog>
<div class="toast-region" id="toast-region"></div></body></html>`;

function boot() {
  const dom = new JSDOM(HTML, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true });
  const w = dom.window;
  w.confirm = () => true;
  w.eval(appSource);
  return w;
}
const S = (w) => JSON.parse(w.localStorage.getItem("emicp-interactive-prototype-v6-stable"));
const click = (w, sel) => { const el = w.document.querySelector(sel); if (!el) throw new Error("no el: " + sel); el.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true })); };
const clickAll = (w, sel, n) => { const els = w.document.querySelectorAll(sel); if (!els[n]) throw new Error("no el[" + n + "]: " + sel); els[n].dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true })); };
const val = (w, sel, v) => { const el = w.document.querySelector(sel); if (!el) throw new Error("no field: " + sel); el.value = v; };
const change = (w, sel, v) => { const el = w.document.querySelector(sel); el.value = v; el.dispatchEvent(new w.Event("change", { bubbles: true })); };
const submit = (w, id) => { w.document.getElementById(id).dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); };
const role = (w, r) => change(w, "#role-switch", r);
const text = (w) => w.document.getElementById("app").textContent;
const dialogText = (w) => w.document.getElementById("dialog-content").textContent;

function setupBase(w, products, materials) {
  click(w, 'button[data-page="productMaster"]');
  products.forEach(function (p) {
    click(w, '[data-action="new-product"]');
    val(w, "#product-code", p[0]); val(w, "#product-unit", p[2]); val(w, "#product-name", p[1]);
    submit(w, "product-master-form");
  });
  click(w, 'button[data-page="materialMaster"]');
  materials.forEach(function (m) {
    click(w, '[data-action="new-raw-material"]');
    val(w, "#raw-code", m[0]); val(w, "#raw-unit", m[2]); val(w, "#raw-name", m[1]);
    submit(w, "raw-material-master-form");
  });
}

/* ---------- Probe 1: مادة مشتركة بين خطتين — ازدواج احتساب الرصيد ---------- */
(function () {
  const w = boot();
  setupBase(w, [["P1", "منتج 1", "كرتون"], ["P2", "منتج 2", "كرتون"]], [["RM1", "سكر", "kg"]]);
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-09-01"); val(w, "#fc-end", "2026-09-30");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "100");
  click(w, '[data-action="add-forecast-line"]');
  const selects = w.document.querySelectorAll('select[name="productCode"]');
  selects[1].value = "P2";
  const qtys = w.document.querySelectorAll('input[name="itemQty"]');
  qtys[1].value = "100";
  submit(w, "forecast-form");
  role(w, "production");
  click(w, '[data-action="new-plan"]');
  val(w, 'input[name="planLine_0"]', "L1"); val(w, 'input[name="planLine_1"]', "L1");
  submit(w, "plan-form");
  role(w, "sales");
  // اعتماد الخطتين واحدة واحدة
  click(w, 'button[data-page="salesSupply"]');
  for (let i = 0; i < 2; i++) {
    const waiting = S(w).plans.find((p) => p.status === "waiting_sales");
    click(w, '[data-action="review-plan"][data-id="' + waiting.id + '"]');
    click(w, '[data-action="plan-decision"][data-decision="approved"]');
  }
  role(w, "production");
  click(w, 'button[data-page="materials"]');
  click(w, '[data-action="new-material"]');
  // خطتان في النموذج: الخطة 0 والخطة 1، نفس المادة RM1 لكل منهما 100
  val(w, 'input[name="mrQty_0_0"]', "100");
  val(w, 'input[name="mrQty_1_0"]', "100");
  submit(w, "material-form");
  role(w, "rmWarehouse");
  click(w, 'button[data-page="rmStock"]');
  click(w, '[data-action="confirm-stock"]');
  // صف واحد للمادة (كود واحد) — الرصيد الفيزيائي 150
  val(w, 'input[name="stockOnHand_0"]', "150");
  submit(w, "stock-form");
  // القياس عبر ما يعرضه النظام نفسه: نافذة الالتزامات (النقص المرشح للشراء) وأزرار جاهزية الإنتاج
  role(w, "procurement");
  let commitmentRows = 0, commitmentQtys = [];
  try {
    click(w, '[data-action="new-commitment"]');
    w.document.querySelectorAll('input[name^="pcQty_"]').forEach((el) => { commitmentRows += 1; commitmentQtys.push(el.value); });
    click(w, '[data-action="close-dialog"]');
  } catch (e) { /* لا نقص مرشح إطلاقًا */ }
  role(w, "production");
  const readyButtons = (text(w).match(/تسجيل Actual/g) || []).length;
  const waitingButtons = (text(w).match(/بانتظار جاهزية المواد/g) || []).length;
  console.log("PROBE1 مادة مشتركة: إجمالي المطلوب=200، الرصيد الفيزيائي=150 (النقص الحقيقي 50)");
  console.log("  النقص الذي يعرضه النظام للمشتريات:", commitmentRows ? commitmentQtys.join(" و") : "لا شيء", "| خطط جاهزة للإنتاج:", readyButtons, "| خطط بانتظار المواد:", waitingButtons);
})();

/* ---------- Probe 2: مادة مشتركة برصيد 50 — نقص كل سجل يحسب على نفس الرصيد ---------- */
(function () {
  const w = boot();
  setupBase(w, [["P1", "منتج 1", "كرتون"], ["P2", "منتج 2", "كرتون"]], [["RM1", "سكر", "kg"]]);
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-09-01"); val(w, "#fc-end", "2026-09-30");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "100");
  click(w, '[data-action="add-forecast-line"]');
  w.document.querySelectorAll('select[name="productCode"]')[1].value = "P2";
  w.document.querySelectorAll('input[name="itemQty"]')[1].value = "100";
  submit(w, "forecast-form");
  role(w, "production");
  click(w, '[data-action="new-plan"]');
  val(w, 'input[name="planLine_0"]', "L1"); val(w, 'input[name="planLine_1"]', "L1");
  submit(w, "plan-form");
  role(w, "sales");
  for (let i = 0; i < 2; i++) {
    const waiting = S(w).plans.find((p) => p.status === "waiting_sales");
    click(w, '[data-action="review-plan"][data-id="' + waiting.id + '"]');
    click(w, '[data-action="plan-decision"][data-decision="approved"]');
  }
  role(w, "production");
  click(w, 'button[data-page="materials"]');
  click(w, '[data-action="new-material"]');
  val(w, 'input[name="mrQty_0_0"]', "100");
  val(w, 'input[name="mrQty_1_0"]', "100");
  submit(w, "material-form");
  role(w, "rmWarehouse");
  click(w, 'button[data-page="rmStock"]');
  click(w, '[data-action="confirm-stock"]');
  val(w, 'input[name="stockOnHand_0"]', "50");
  submit(w, "stock-form");
  role(w, "procurement");
  let qtys2 = [];
  click(w, '[data-action="new-commitment"]');
  w.document.querySelectorAll('input[name^="pcQty_"]').forEach((el) => qtys2.push(Number(el.value)));
  click(w, '[data-action="close-dialog"]');
  console.log("\nPROBE2 مادة مشتركة برصيد 50: المطلوب الكلي 200 → النقص الحقيقي 150");
  console.log("  النقص الذي يعرضه النظام للمشتريات:", qtys2.join(" و"), "→ الإجمالي:", qtys2.reduce((a, b) => a + b, 0));
})();

/* ---------- Probe 3: طلبيتان متوازيتان — بطاقة الخطوة التالية تتسلسل عالميًا ---------- */
(function () {
  const w = boot();
  setupBase(w, [["P1", "منتج 1", "كرتون"]], [["RM1", "سكر", "kg"]]);
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-09-01"); val(w, "#fc-end", "2026-09-30");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "100");
  submit(w, "forecast-form");
  role(w, "production");
  click(w, '[data-action="new-plan"]');
  val(w, 'input[name="planLine_0"]', "L1");
  submit(w, "plan-form");
  role(w, "sales");
  click(w, '[data-action="review-plan"]');
  click(w, '[data-action="plan-decision"][data-decision="approved"]');
  role(w, "production");
  click(w, 'button[data-page="materials"]');
  click(w, '[data-action="new-material"]');
  val(w, 'input[name="mrQty_0_0"]', "100");
  submit(w, "material-form");
  role(w, "rmWarehouse");
  click(w, 'button[data-page="rmStock"]');
  click(w, '[data-action="confirm-stock"]');
  val(w, 'input[name="stockOnHand_0"]', "0");
  submit(w, "stock-form");
  // الطلبية 1 الآن عند "أنشئ التزام شراء" (خطوة 8)
  role(w, "procurement");
  const step1 = text(w).includes("أنشئ التزام شراء");
  // المبيعات تنشئ Forecast ثانيًا
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-10-01"); val(w, "#fc-end", "2026-10-31");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "500");
  submit(w, "forecast-form");
  role(w, "procurement");
  console.log("\nPROBE3 طلبيتان متوازيتان:");
  console.log("  قبل الطلبية الثانية كانت البطاقة: أنشئ التزام شراء →", step1);
  const showsPlanning = text(w).includes("أنشئ خطط المنتجات");
  const stillShowsPurchase = text(w).includes("أنشئ التزام شراء");
  console.log("  بعد إنشاء Forecast ثانٍ:", stillShowsPurchase ? "خطوة الشراء للطلبية الأولى ما زالت ظاهرة في قائمة المستحقات" + (showsPlanning ? " مع خطوة تخطيط الطلبية الثانية" : "") : "اختفت خطوة الشراء للطلبية الأولى");
})();

/* ---------- Probe 4: Finance بعد الاستلام — هل تبقى الأزرار مفتوحة؟ ---------- */
(function () {
  const w = boot();
  setupBase(w, [["P1", "منتج 1", "كرتون"]], [["RM1", "سكر", "kg"]]);
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-09-01"); val(w, "#fc-end", "2026-09-30");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "100");
  submit(w, "forecast-form");
  role(w, "production");
  click(w, '[data-action="new-plan"]'); val(w, 'input[name="planLine_0"]', "L1"); submit(w, "plan-form");
  role(w, "sales");
  click(w, '[data-action="review-plan"]'); click(w, '[data-action="plan-decision"][data-decision="approved"]');
  role(w, "production");
  click(w, 'button[data-page="materials"]'); click(w, '[data-action="new-material"]');
  val(w, 'input[name="mrQty_0_0"]', "100"); submit(w, "material-form");
  role(w, "rmWarehouse");
  click(w, 'button[data-page="rmStock"]'); click(w, '[data-action="confirm-stock"]');
  val(w, 'input[name="stockOnHand_0"]', "0"); submit(w, "stock-form");
  role(w, "procurement");
  click(w, '[data-action="new-commitment"]');
  val(w, 'input[name="pcSupplier_0"]', "م"); val(w, 'input[name="pcPo_0"]', "PO-1"); val(w, 'input[name="pcEta_0"]', "2026-09-05");
  submit(w, "commitment-form");
  role(w, "finance");
  click(w, '[data-action="finance-decision"][data-decision="verified"]');
  role(w, "procurement");
  click(w, '[data-action="advance-commitment"]');
  role(w, "rmWarehouse");
  click(w, 'button[data-page="receipts"]'); click(w, '[data-action="receive-material"]');
  val(w, 'input[name="rrQty_0"]', "100"); submit(w, "receipt-form");
  // الآن الأوردر مستلم — هل تستطيع المالية حظره؟
  role(w, "finance");
  const blockedButtonExists = Boolean(w.document.querySelector('[data-action="finance-decision"][data-decision="blocked"]'));
  if (blockedButtonExists) click(w, '[data-action="finance-decision"][data-decision="blocked"]');
  const s = S(w);
  console.log("\nPROBE4 قرار مالي بعد الاستلام:");
  console.log("  أزرار القرار ما زالت ظاهرة بعد استلام البضاعة:", blockedButtonExists);
  console.log("  الحالة بعد الحظر: commitment.financeStatus=" + s.commitments[0].financeStatus + " مع status=" + s.commitments[0].status + " (بضاعة مستلمة ومرحّلة للرصيد لكن الأوردر محظور ماليًا)");
  // وماذا تعرض بطاقة الخطوة التالية الآن؟
  console.log("  بطاقة الخطوة التالية الآن:", text(w).includes("عالج قرار Finance") ? "«عالج قرار Finance» رغم اكتمال الاستلام — الدورة كلها تنحبس" : "طبيعية");
})();

/* ---------- Probe 5: تعديل كمية احتياج بعد إنشاء أمر شراء ---------- */
(function () {
  const w = boot();
  setupBase(w, [["P1", "منتج 1", "كرتون"]], [["RM1", "سكر", "kg"]]);
  role(w, "sales");
  click(w, '[data-action="new-forecast"]');
  val(w, "#fc-start", "2026-09-01"); val(w, "#fc-end", "2026-09-30");
  val(w, "#fc-product-first", "P1"); val(w, "#fc-qty-first", "100");
  submit(w, "forecast-form");
  role(w, "production");
  click(w, '[data-action="new-plan"]'); val(w, 'input[name="planLine_0"]', "L1"); submit(w, "plan-form");
  role(w, "sales");
  click(w, '[data-action="review-plan"]'); click(w, '[data-action="plan-decision"][data-decision="approved"]');
  role(w, "production");
  click(w, 'button[data-page="materials"]'); click(w, '[data-action="new-material"]');
  val(w, 'input[name="mrQty_0_0"]', "100"); submit(w, "material-form");
  role(w, "rmWarehouse");
  click(w, 'button[data-page="rmStock"]'); click(w, '[data-action="confirm-stock"]');
  val(w, 'input[name="stockOnHand_0"]', "0"); submit(w, "stock-form");
  role(w, "procurement");
  click(w, '[data-action="new-commitment"]');
  val(w, 'input[name="pcSupplier_0"]', "م"); val(w, 'input[name="pcPo_0"]', "PO-1"); val(w, 'input[name="pcEta_0"]', "2026-09-05");
  submit(w, "commitment-form"); // أمر شراء 100
  // الإنتاج يرفع الاحتياج إلى 300 بعد صدور أمر الشراء
  role(w, "production");
  click(w, 'button[data-page="materials"]'); click(w, '[data-action="new-material"]');
  val(w, 'input[name="mrQty_0_0"]', "300"); submit(w, "material-form");
  const s = S(w);
  const m = s.materials[0];
  console.log("\nPROBE5 تعديل الاحتياج بعد أمر الشراء:");
  console.log("  الاحتياج أصبح 300 والأوردر القائم 100 → النقص المعلن:", Math.max(0, m.required - Math.max(0, m.onHand - m.reserved - m.hold) - m.inbound), "(صحيح) لكن لا تنبيه للمشتريات أو المالية بأن الطلب تغيّر بعد الأوردر");
})();
