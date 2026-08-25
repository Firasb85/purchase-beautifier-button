/* اختبار دورة العمل الكاملة — Schema 13: Forecast شهري + تفاوض وتثبيت + اعتماد الإنتاج + مالية مراقبة */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const appSource = fs.readFileSync(path.join(__dirname, "app.js"), "utf-8");
const dictSource = fs.readFileSync(path.join(__dirname, "i18n-dictionary.js"), "utf-8");

const HTML = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>t</title></head>
<body><div id="app"></div><dialog class="dialog" id="app-dialog"><div id="dialog-content"></div></dialog>
<div class="toast-region" id="toast-region"></div></body></html>`;

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log("PASS  " + name); }
  else { failures += 1; console.log("FAIL  " + name + (extra ? "  → " + extra : "")); }
}

function boot(seedState) {
  const dom = new JSDOM(HTML, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true });
  const w = dom.window;
  w.confirm = () => true;
  // jsdom لا يوفر createObjectURL: نستبدله بستَب يسجّل التنزيلات ليمكن التحقق منها.
  w.__downloads = [];
  w.URL.createObjectURL = (blob) => { w.__downloads.push(blob); return "blob:mock/" + w.__downloads.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) w.__downloadNames = (w.__downloadNames || []).concat(this.download); };
  if (seedState) w.localStorage.setItem("emicp-interactive-prototype-v6-stable", JSON.stringify(seedState));
  w.eval(dictSource);
  w.eval(appSource);
  // لوحة الدخول: الحالات الجديدة تقلع عندها — ندخل بمستخدم مسؤول النظام تلقائيًا لبقية الاختبارات.
  const loginForm = w.document.getElementById("login-form");
  if (loginForm) {
    const userSelect = w.document.getElementById("login-user");
    const adminOption = [...userSelect.options].find(o => o.textContent.includes("مسؤول النظام"));
    userSelect.value = adminOption ? adminOption.value : userSelect.options[0].value;
    loginForm.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  }
  return { dom, w };
}

function getState(w) { return JSON.parse(w.localStorage.getItem("emicp-interactive-prototype-v6-stable")); }
function click(w, selector) {
  const el = w.document.querySelector(selector);
  if (!el) throw new Error("لا يوجد عنصر: " + selector);
  el.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true }));
}
function setValue(w, selector, value) {
  const el = w.document.querySelector(selector);
  if (!el) throw new Error("لا يوجد حقل: " + selector);
  el.value = value;
}
function change(w, selector, value) {
  const el = w.document.querySelector(selector);
  if (!el) throw new Error("لا يوجد عنصر: " + selector);
  el.value = value;
  el.dispatchEvent(new w.Event("change", { bubbles: true }));
}
function submitDialog(w, formId) {
  const form = w.document.getElementById(formId);
  if (!form) throw new Error("لا يوجد نموذج: " + formId);
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}
function switchRole(w, role) { change(w, "#role-switch", role); }
// نقر مُلفَّق: يُنشئ زرًا يحمل الإجراء ويضغطه — يحاكي محاولة تنفيذ عملية دون أن يعرضها النظام.
function forceAction(w, action, attrs) {
  const el = w.document.createElement("button");
  el.setAttribute("data-action", action);
  Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
  w.document.body.appendChild(el);
  el.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true }));
  el.remove();
}
function pageText(w) { return w.document.getElementById("app").textContent; }
function dialogText(w) { return w.document.getElementById("dialog-content").textContent; }
function hiddenIndex(w, prefix, value) {
  const inputs = [...w.document.querySelectorAll(`input[type="hidden"][name^="${prefix}"]`)];
  const hit = inputs.find(i => i.value === value);
  if (!hit) return -1;
  return Number(hit.name.slice(prefix.length));
}
function addMaster(w, kind, code, name, unit) {
  click(w, `[data-action="new-${kind}"]`);
  const formId = kind === "product" ? "product-master-form" : "raw-material-master-form";
  setValue(w, `#dialog-content input[name="code"]`, code);
  setValue(w, `#dialog-content input[name="name"]`, name);
  setValue(w, `#dialog-content input[name="unit"]`, unit);
  submitDialog(w, formId);
}

console.log("=== 1) التهيئة والتعريفات ===");
const { w } = boot();
check("التطبيق يقلع ويعرض الواجهة", pageText(w).includes("Ice Star"));
switchRole(w, "admin");
click(w, 'nav [data-page="productMaster"]');
addMaster(w, "product", "P1", "عصير برتقال", "كرتون");
addMaster(w, "product", "P2", "بوظة فانيلا", "كرتون");
check("تعريف منتجين", getState(w).products.length === 2);
addMaster(w, "product", "P1", "مكرر", "كرتون");
check("رفض كود منتج مكرر", getState(w).products.length === 2);
click(w, '[data-action="close-dialog"]');
click(w, 'nav [data-page="materialMaster"]');
addMaster(w, "raw-material", "RM1", "سكر", "كغم");
addMaster(w, "raw-material", "RM2", "نكهة برتقال", "لتر");
check("تعريف مادتين أوليتين", getState(w).rawMaterials.length === 2);

console.log("=== 2) Forecast سنوي شهرًا بشهر ===");
switchRole(w, "sales");
click(w, '[data-action="new-forecast"]');
check("نافذة Forecast فيها شبكة الأشهر", !!w.document.getElementById("forecast-form") && !!w.document.querySelector('input[name="fq_0_0"]'));
change(w, 'input[name="fromMonth"]', "2026-09");
change(w, 'input[name="toMonth"]', "2026-11");
const gridMonths1 = w.document.querySelector('input[name="gridMonths"]').value;
check("تغيير الأشهر يعيد بناء الجدول (3 أشهر)", gridMonths1 === "2026-09,2026-10,2026-11", gridMonths1);
check("عناوين الأشهر بالعربية", dialogText(w).includes("أيلول 2026"));
submitDialog(w, "forecast-form");
check("رفض الإرسال بلا كميات", getState(w).forecasts.length === 0 && !!w.document.getElementById("forecast-form"));
setValue(w, 'input[name="fq_0_0"]', "100");
change(w, 'input[name="toMonth"]', "2026-12");
check("الكميات تبقى بعد إعادة بناء الجدول", w.document.querySelector('input[name="fq_0_0"]').value === "100");
change(w, 'input[name="toMonth"]', "2026-11");
setValue(w, 'input[name="fq_0_0"]', "100");
setValue(w, 'input[name="fq_0_1"]', "50");
setValue(w, 'input[name="fq_1_0"]', "80");
submitDialog(w, "forecast-form");
let st = getState(w);
check("إنشاء المستند الشهري", st.forecasts.length === 1 && st.forecasts[0].status === "submitted");
const fc = st.forecasts[0];
check("أشهر المستند صحيحة", JSON.stringify(fc.months) === JSON.stringify(["2026-09", "2026-10", "2026-11"]));
check("كميات P1 الشهرية", fc.items[0].monthlyQty["2026-09"] === 100 && fc.items[0].monthlyQty["2026-10"] === 50 && fc.items[0].qty === 150);
check("كميات P2 الشهرية", fc.items[1].monthlyQty["2026-09"] === 80 && fc.items[1].qty === 80);
check("إصدار أول بلا سجل", fc.version === "V1" && fc.history.length === 0);

console.log("=== 3) فحص الجاهزية قبل رد الإنتاج: احتياجات + رصيد + تأكيد التوريد ===");
switchRole(w, "production");
check("إشعار مهمة للإنتاج (وميض)", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="forecast-production-review"]');
check("الرد مقفل قبل حساب الاحتياجات", !w.document.getElementById("production-review-form") && getState(w).forecasts[0].status === "submitted");
check("شارات الجاهزية ظاهرة على المستند", pageText(w).includes("فحص الجاهزية") || pageText(w).includes("الاحتياجات"));
switchRole(w, "production");
click(w, 'nav [data-page="materials"]');
click(w, '[data-action="new-material"]');
check("نافذة الاحتياجات: قسم واحد لكل مستند مثبت (لا حسب المنتج)", w.document.querySelector('input[name="mrSectionCount"]').value === "1" && !w.document.querySelector('input[name="mrProduct_0"]'));
check("أعمدة الأشهر داخل جدول المواد", !!w.document.querySelector('input[name="mrQty_0_0_2"]'));
setValue(w, 'input[name="mrQty_0_0_0"]', "340");
setValue(w, 'input[name="mrQty_0_0_1"]', "100");
setValue(w, 'input[name="mrQty_0_1_0"]', "90");
submitDialog(w, "material-form");
st = getState(w);
check("سجل واحد لكل مادة (إجمالي المستند)", st.materials.length === 2);
const mrRM1 = st.materials.find(m => m.materialCode === "RM1");
const mrRM2 = st.materials.find(m => m.materialCode === "RM2");
check("سجل RM1 إجمالي صحيح", mrRM1 && mrRM1.required === 440 && mrRM1.monthlyQty["2026-09"] === 340 && mrRM1.monthlyQty["2026-10"] === 100 && mrRM1.forecastId === st.forecasts[0].id);
check("السجل بلا منتج محدد (مجموع)", !mrRM1.productCode);
check("تاريخ الحاجة = أول شهر", mrRM1.needDate === "2026-09-01");
check("السجل غير معتمد وغير مؤكد", mrRM1.productionApproved === false && mrRM1.stockConfirmed === false);
click(w, '[data-action="new-material"]');
setValue(w, 'input[name="mrQty_0_1_0"]', "120");
submitDialog(w, "material-form");
st = getState(w);
check("تعديل كمية = تحديث السجل", st.materials.find(m => m.materialCode === "RM2").required === 120);
click(w, '[data-action="new-material"]');
setValue(w, 'input[name="mrQty_0_1_0"]', "");
submitDialog(w, "material-form");
st = getState(w);
check("تفريغ الكمية = حذف السجل", !st.materials.find(m => m.materialCode === "RM2"));
click(w, '[data-action="new-material"]');
setValue(w, 'input[name="mrQty_0_1_0"]', "90");
submitDialog(w, "material-form");
check("إعادة إضافة RM2", getState(w).materials.length === 2);

switchRole(w, "production");
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="forecast-production-review"]');
check("الرد مقفل قبل رفع رصيد المخزن", !w.document.getElementById("production-review-form"));
switchRole(w, "procurement");
click(w, '[data-action="new-commitment"]');
check("لا شراء فعلي قبل رفع الرصيد", !w.document.getElementById("commitment-form"));
switchRole(w, "rmWarehouse");
check("إشعار مهمة للمخزن", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="rmStock"]');
click(w, '[data-action="confirm-stock"]');
const rm1Row = hiddenIndex(w, "stockCode_", "RM1");
const rm2Row = hiddenIndex(w, "stockCode_", "RM2");
check("جدول الرصيد صف لكل كود", rm1Row >= 0 && rm2Row >= 0);
setValue(w, `input[name="stockOnHand_${rm1Row}"]`, "100");
setValue(w, `input[name="stockReserved_${rm1Row}"]`, "0");
setValue(w, `input[name="stockHold_${rm1Row}"]`, "0");
setValue(w, `input[name="stockOnHand_${rm2Row}"]`, "200");
setValue(w, `input[name="stockReserved_${rm2Row}"]`, "0");
setValue(w, `input[name="stockHold_${rm2Row}"]`, "0");
submitDialog(w, "stock-form");
st = getState(w);
check("تأكيد كل السجلات", st.materials.length === 2 && st.materials.every(m => m.stockConfirmed));
switchRole(w, "production");
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="forecast-production-review"]');
check("الرد مقفل قبل قرار المشتريات", !w.document.getElementById("production-review-form"));
switchRole(w, "procurement");
check("إشعار تأكيد التوريد للمشتريات", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="requirements"]');
check("بطاقة تأكيد إمكانية التوريد ظاهرة", pageText(w).includes("تأكيد إمكانية التوريد"));
click(w, '[data-action="confirm-supply"]');
check("نافذة قرار التوريد تعرض النقص", !!w.document.getElementById("supply-form") && dialogText(w).includes("340"));
setValue(w, 'select[name="supplyDecision"]', "no");
setValue(w, 'input[name="supplyNote"]', "مورد السكر متوقف");
submitDialog(w, "supply-form");
st = getState(w);
check("تسجيل تعذر التوريد", st.forecasts[0].supplyFeasibility && st.forecasts[0].supplyFeasibility.confirmed === false);
switchRole(w, "production");
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="forecast-production-review"]');
check("الرد يفتح بعد قرار المشتريات (ولو سلبيًا)", !!w.document.getElementById("production-review-form"));
setValue(w, 'select[name="decision"]', "fix");
submitDialog(w, "production-review-form");
check("منع التثبيت مع تعذر التوريد", getState(w).forecasts[0].status === "submitted" && dialogText(w).includes("تعذر التوريد"));
click(w, '[data-action="close-dialog"]');
switchRole(w, "procurement");
click(w, 'nav [data-page="requirements"]');
check("قرار «تعذر» يبقى قابلًا للمراجعة", !!w.document.querySelector('[data-action="confirm-supply"]'));
click(w, '[data-action="confirm-supply"]');
setValue(w, 'select[name="supplyDecision"]', "yes");
setValue(w, 'input[name="supplyNote"]', "وجدنا موردًا بديلًا");
submitDialog(w, "supply-form");
st = getState(w);
check("تأكيد إمكانية التوريد", st.forecasts[0].supplyFeasibility.confirmed === true && !!st.forecasts[0].supplyFeasibility.at);
click(w, 'nav [data-page="procurement"]');
click(w, '[data-action="new-commitment"]');
check("أمر الشراء يفتح فور تأكيد النقص — دون انتظار تثبيت المستند", !!w.document.getElementById("commitment-form"));
click(w, '[data-action="close-dialog"]');

console.log("=== 4) التفاوض والتثبيت بعد اكتمال الجاهزية ===");
switchRole(w, "production");
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="forecast-production-review"]');
check("نافذة رد الإنتاج معبأة بأرقام المبيعات", w.document.querySelector('input[name="pq_0_0"]').value === "100");
setValue(w, 'input[name="pq_0_0"]', "90");
setValue(w, 'select[name="decision"]', "fix");
submitDialog(w, "production-review-form");
check("منع التثبيت مع أرقام معدلة", getState(w).forecasts[0].status === "submitted" && dialogText(w).includes("المعدلة"));
setValue(w, 'select[name="decision"]', "feedback");
setValue(w, 'input[name="feedbackNote"]', "قدرة الخط محدودة في أيلول");
submitDialog(w, "production-review-form");
st = getState(w);
check("رد الإنتاج بتعديلات", st.forecasts[0].status === "production_feedback" && st.forecasts[0].version === "V2");
check("إصدار المبيعات محفوظ في السجل", st.forecasts[0].history.length === 1 && st.forecasts[0].history[0].items[0].monthlyQty["2026-09"] === 100);
check("أرقام الإنتاج هي الحالية", st.forecasts[0].items[0].monthlyQty["2026-09"] === 90);

switchRole(w, "sales");
check("إشعار مهمة للمبيعات", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="forecasts"]');
click(w, '[data-action="review-forecast-feedback"]');
check("نافذة مراجعة رد الإنتاج تعرض الإصدارين", dialogText(w).includes("أرقام الإنتاج") && dialogText(w).includes("طلبك السابق"));
click(w, '[data-action="accept-production-feedback"]');
st = getState(w);
check("قبول المبيعات = تثبيت", st.forecasts[0].status === "fixed" && !!st.forecasts[0].fixedAt);
check("لا زر تعديل لمستند مثبت", !w.document.querySelector('[data-action="edit-forecast"]'));
check("لا زر إلغاء لمستند مثبت", !w.document.querySelector('[data-action="cancel-forecast"]'));

console.log("=== 5) النقص يصل المشتريات مباشرة بعد التثبيت — أمر الشراء النهائي قرارها ===");
switchRole(w, "production");
click(w, 'nav [data-page="materials"]');
check("لا بطاقة اعتماد وسيطة للإنتاج", !pageText(w).includes("بانتظار اعتمادك"));
switchRole(w, "procurement");
check("مهمة الشراء وصلت المشتريات مباشرة", !!w.document.querySelector(".notify-box") && w.document.querySelector(".notify-box").textContent.includes("الناقصة"));
click(w, '[data-action="new-commitment"]');
check("نافذة أمر الشراء تفتح مباشرة بعد التثبيت", !!w.document.getElementById("commitment-form"));
click(w, '[data-action="close-dialog"]');
console.log("=== 5ب) لا تجاوز: التنفيذ مقفل قبل اعتماد الخطة الأسبوعية ===");
switchRole(w, "production");
click(w, 'nav [data-page="execution"]');
click(w, '[data-action="new-actual"]');
check("لا تسجيل فعلي قبل الخطة الأسبوعية المعتمدة", !w.document.getElementById("actual-form"));

console.log("=== 13) الخطة الأسبوعية: تقسيم ومراجعة واعتماد ثنائي ===");
switchRole(w, "production");
click(w, 'nav [data-page="weekly"]');
check("شاشة الخطة الأسبوعية للإنتاج", pageText(w).includes("الخطة الأسبوعية"));
click(w, '[data-action="new-weekly-plan"]');
check("نافذة التقسيم: 3 أهداف (منتج×شهر)", w.document.querySelector('input[name="wpCount"]').value === "3");
check("التقسيم جدول واحد كامل بأعمدة الأسابيع", w.document.querySelectorAll('#dialog-content table').length === 1 && dialogText(w).includes("الأسبوع 4"));
check("زرا التمبليت والرفع موجودان", !!w.document.querySelector('[data-action="download-weekly-template"]') && !!w.document.querySelector('[data-action="import-weekly"]'));
const wpSec = (() => {
  const prods = [...w.document.querySelectorAll('input[name^="wpProduct_"]')];
  const hit = prods.find(i => i.value === "P1" && w.document.querySelector(`input[name="wpMonth_${i.name.slice(10)}"]`).value === "2026-09");
  return Number(hit.name.slice(10));
})();
// v49: التقسيم بالنسب لا بالقسمة الصحيحة — الكميات كسرية فالقسمة القديمة كانت تُفرغ ثلاثة أسابيع.
{
  const cells = [0,1,2,3].map(k => Number(w.document.querySelector(`input[name="wpQty_${wpSec}_${k}"]`).value));
  const target = Number(w.document.getElementById(`wp-target-${wpSec}`).value);
  check("التقسيم الافتراضي متساوٍ على الأسابيع الأربعة", cells.every(v => Math.abs(v - target / 4) < 1e-6));
  check("مجموع التقسيم الافتراضي = هدف الخطة", Math.abs(cells.reduce((a,b)=>a+b,0) - target) < 1e-6);
}

// v49: أوامر جماعية بدل صف بصف — 128 صفًا كانت تعني أكثر من ألف نقرة.
check("عمود التحديد موجود وكل الصفوف محددة افتراضيًا", w.document.querySelectorAll('[data-action="weekly-pick"]').length === 3 && [...w.document.querySelectorAll('[data-action="weekly-pick"]')].every(b => b.checked));
check("عداد التحديد يعرض الحالة", w.document.getElementById("wp-selected-count").textContent.includes("3"));
check("شريط الأوامر الجماعية ظاهر", !!w.document.getElementById("wp-bulk-pattern") && !!w.document.getElementById("wp-bulk-basis") && !!w.document.getElementById("wp-bulk-gran"));

const wpTargetSec = Number(w.document.getElementById(`wp-target-${wpSec}`).value);
// نمط "مقدَّم": 4/3/2/1 من الهدف، والباقي لآخر أسبوع ذي وزن.
setValue(w, "#wp-bulk-pattern", "front");
click(w, '[data-action="weekly-apply-bulk"]');
const frontCells = [0,1,2,3].map(k => Number(w.document.querySelector(`input[name="wpQty_${wpSec}_${k}"]`).value));
check("النمط المقدَّم وزّع 4/3/2/1", frontCells[0] > frontCells[1] && frontCells[1] > frontCells[2] && frontCells[2] > frontCells[3]);
check("مجموع الأسابيع بعد الأمر الجماعي = هدف الخطة بالضبط", Math.abs(frontCells.reduce((a,b)=>a+b,0) - wpTargetSec) < 1e-6);

setValue(w, "#wp-bulk-pattern", "w1");
click(w, '[data-action="weekly-apply-bulk"]');
const w1Cells = [0,1,2,3].map(k => Number(w.document.querySelector(`input[name="wpQty_${wpSec}_${k}"]`).value));
check("نمط الأسبوع الأول وحده يضع كل الكمية في الأسبوع 1", Math.abs(w1Cells[0] - wpTargetSec) < 1e-6 && w1Cells[1] === 0 && w1Cells[2] === 0 && w1Cells[3] === 0);

// المرونة الجماعية تصل كل الصفوف المحددة.
setValue(w, "#wp-bulk-gran", "monthly");
click(w, '[data-action="weekly-apply-bulk"]');
check("المرونة الجماعية طُبِّقت على كل الصفوف", [...w.document.querySelectorAll('select[name^="wpGran_"]')].every(sel => sel.value === "monthly"));
setValue(w, "#wp-bulk-gran", "weekly");
click(w, '[data-action="weekly-apply-bulk"]');

// إلغاء التحديد يمنع الأمر من لمس أي صف.
click(w, '[data-action="weekly-select-none"]');
check("إلغاء التحديد يفرّغ الاختيار", [...w.document.querySelectorAll('[data-action="weekly-pick"]')].every(b => !b.checked));
setValue(w, "#wp-bulk-pattern", "back");
click(w, '[data-action="weekly-apply-bulk"]');
const untouched = [0,1,2,3].map(k => Number(w.document.querySelector(`input[name="wpQty_${wpSec}_${k}"]`).value));
check("الأمر الجماعي لا يمسّ صفًا غير محدد", Math.abs(untouched[0] - wpTargetSec) < 1e-6);
click(w, '[data-action="weekly-select-all"]');
check("تحديد الكل يعيد كل الصفوف", [...w.document.querySelectorAll('[data-action="weekly-pick"]')].every(b => b.checked));
setValue(w, "#wp-bulk-pattern", "equal");
click(w, '[data-action="weekly-apply-bulk"]');
setValue(w, `input[name="wpQty_${wpSec}_0"]`, "50");
submitDialog(w, "weekly-plan-form");
check("رفض مجموع أسابيع لا يساوي كمية الشهر", getState(w).weeklyPlans.length === 0);
setValue(w, `input[name="wpQty_${wpSec}_0"]`, "30");
setValue(w, `input[name="wpQty_${wpSec}_1"]`, "30");
setValue(w, `input[name="wpQty_${wpSec}_2"]`, "30");
setValue(w, `input[name="wpQty_${wpSec}_3"]`, "0");
submitDialog(w, "weekly-plan-form");
st = getState(w);
check("إنشاء 3 خطط أسبوعية بانتظار المبيعات", st.weeklyPlans.length === 3 && st.weeklyPlans.every(p => p.status === "awaiting_sales"));
const wpP1Sep = st.weeklyPlans.find(p => p.productCode === "P1" && p.month === "2026-09");
check("أسابيع أيلول محسوبة بتواريخها", wpP1Sep.weeks[0].start === "2026-09-01" && wpP1Sep.weeks[3].end === "2026-09-30");
check("توزيع الإنتاج محفوظ", wpP1Sep.weeks.map(x => x.qty).join(",") === "30,30,30,0");

switchRole(w, "sales");
check("إشعار مراجعة الخطة للمبيعات", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="weekly"]');
click(w, '[data-action="review-weekly"]');
check("مراجعة المبيعات جدول واحد كامل (3 صفوف)", w.document.querySelectorAll('#dialog-content table').length === 1 && w.document.querySelectorAll('#dialog-content input[name^="wrPlan_"]').length === 3 && dialogText(w).includes("جدول كامل"));
const wrSec = hiddenIndex(w, "wrPlan_", wpP1Sep.id);
setValue(w, `input[name="wrQty_${wrSec}_0"]`, "20");
setValue(w, `input[name="wrQty_${wrSec}_3"]`, "10");
submitDialog(w, "weekly-review-form");
st = getState(w);
const wpAfterSales = st.weeklyPlans.find(p => p.id === wpP1Sep.id);
check("مراجعة المبيعات ترسل للاعتماد", st.weeklyPlans.every(p => p.status === "awaiting_approvals"));
check("تعديل المبيعات يرفع الإصدار ويحفظ السجل", wpAfterSales.version === "V2" && wpAfterSales.history.length === 1 && wpAfterSales.weeks[0].qty === 20 && wpAfterSales.weeks[3].qty === 10);

switchRole(w, "production");
click(w, 'nav [data-page="weekly"]');
click(w, `[data-action="approve-weekly"][data-id="${wpP1Sep.id}"]`);
st = getState(w);
check("اعتماد الإنتاج وحده لا يكفي", st.weeklyPlans.find(p => p.id === wpP1Sep.id).status === "awaiting_approvals" && Object.keys(st.weeklyPlans.find(p => p.id === wpP1Sep.id).unitApprovals).every(k => st.weeklyPlans.find(p => p.id === wpP1Sep.id).unitApprovals[k].production));
switchRole(w, "fgWarehouse");
check("إشعار اعتماد لمخزن FG", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="weekly"]');
click(w, `[data-action="approve-weekly"][data-id="${wpP1Sep.id}"]`);
st = getState(w);
check("اعتماد الطرفين = خطة معتمدة", st.weeklyPlans.find(p => p.id === wpP1Sep.id).status === "approved" && !!st.weeklyPlans.find(p => p.id === wpP1Sep.id).approvedAt);

console.log("=== 14) قاعدة التجميد والتوزيع اليومي ===");
switchRole(w, "production");
click(w, 'nav [data-page="weekly"]');
click(w, `[data-action="plan-days"][data-id="${wpP1Sep.id}"]`);
check("نافذة التوزيع اليومي مفتوحة", !!w.document.getElementById("day-form"));
setValue(w, 'input[name="dayQty_0_1"]', "30");
setValue(w, 'input[name="dayQty_0_2"]', "10");
submitDialog(w, "day-form");
check("رفض توزيع يومي يتجاوز كمية الأسبوع", getState(w).weeklyPlans.find(p => p.id === wpP1Sep.id).weeks[0].days["2026-09-01"] === undefined);
setValue(w, 'input[name="dayQty_0_1"]', "10");
setValue(w, 'input[name="dayQty_0_2"]', "10");
submitDialog(w, "day-form");
st = getState(w);
check("حفظ التوزيع اليومي", st.weeklyPlans.find(p => p.id === wpP1Sep.id).weeks[0].days["2026-09-01"] === 10);

switchRole(w, "production");
click(w, 'nav [data-page="weekly"]');
click(w, `[data-action="edit-weekly"][data-id="${wpP1Sep.id}"]`);
check("نافذة تعديل الأسبوع مفتوحة (أسابيع مستقبلية)", !!w.document.getElementById("week-edit-form"));
setValue(w, 'input[name="weQty_0"]', "25");
setValue(w, 'input[name="weQty_1"]', "25");
submitDialog(w, "week-edit-form");
st = getState(w);
const wpEdited = st.weeklyPlans.find(p => p.id === wpP1Sep.id);
check("تعديل الأسبوع يعيد الخطة للاعتماد ويحفظ الإصدار", wpEdited.status === "awaiting_approvals" && wpEdited.version === "V3" && wpEdited.history.length === 2 && wpEdited.weeks[0].qty === 25);
check("الاعتمادات صُفّرت بعد التعديل", !wpEdited.approvals.production && !wpEdited.approvals.fgWarehouse);

// إحكام التسلسل: كل الخطط يجب اعتمادها من الطرفين قبل أي تنفيذ
for (const p of getState(w).weeklyPlans.filter(x => x.status === "awaiting_approvals")) {
  switchRole(w, "production");
  click(w, 'nav [data-page="weekly"]');
  click(w, `[data-action="approve-weekly"][data-id="${p.id}"]`);
  switchRole(w, "fgWarehouse");
  click(w, 'nav [data-page="weekly"]');
  click(w, `[data-action="approve-weekly"][data-id="${p.id}"]`);
}
st = getState(w);
check("كل الخطط الأسبوعية معتمدة قبل التنفيذ", st.weeklyPlans.length === 3 && st.weeklyPlans.every(p => p.status === "approved"));

{
  // خطة كل أسابيعها مجمّدة (شهر آب الجاري) — لا تعديل ولا توزيع.
  const frozenSeed = {
    schemaVersion: 14, role: "production", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true }],
    rawMaterials: [{ code: "RM1", name: "مادة", unit: "كغم", active: true }],
    forecasts: [{ id: "FC-F", version: "V1", months: ["2026-08"], startDate: "2026-08-01", endDate: "2026-08-28", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-08": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [] }],
    weeklyPlans: [{ id: "WP-F", version: "V1", forecastId: "FC-F", productCode: "P1", product: "منتج", unit: "كرتون", month: "2026-08",
      weeks: [
        { key: "W1", label: "الأسبوع 1 (01–07)", start: "2026-08-01", end: "2026-08-07", qty: 25, days: {} },
        { key: "W2", label: "الأسبوع 2 (08–14)", start: "2026-08-08", end: "2026-08-14", qty: 25, days: {} },
        { key: "W3", label: "الأسبوع 3 (15–21)", start: "2026-08-15", end: "2026-08-21", qty: 25, days: {} },
        { key: "W4", label: "الأسبوع 4 (22–31)", start: "2026-08-22", end: "2026-08-31", qty: 25, days: {} }
      ], status: "approved", approvals: { production: { at: "2026-08-01 10:00" }, fgWarehouse: { at: "2026-08-01 11:00" } }, approvedAt: "2026-08-01 11:00", history: [], createdAt: "2026-08-01 09:30" }],
    salesRecords: [], plans: [], materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], audit: [], permissions: null
  };
  const { w: w4 } = boot(frozenSeed);
  switchRole(w4, "production");
  click(w4, 'nav [data-page="weekly"]');
  check("لا زر تعديل لخطة كل أسابيعها مجمّدة", !w4.document.querySelector('[data-action="edit-weekly"]'));
  check("لا زر توزيع أيام لخطة مجمّدة", !w4.document.querySelector('[data-action="plan-days"]'));
  check("شارة مجمّد ظاهرة", pageText(w4).includes("مجمّد"));
}


console.log("=== 6) المشتريات والتوريد والاستلام ===");
switchRole(w, "procurement");
check("إشعار مهمة للمشتريات", !!w.document.querySelector(".notify-box"));
click(w, '[data-action="new-commitment"]');
check("نافذة الالتزامات مفتوحة (النقص وصل مباشرة)", !!w.document.getElementById("commitment-form"));
check("أشهر الحاجة ظاهرة في جدول الشراء", dialogText(w).includes("أيلول 2026"));
st = getState(w);
const p1rm1Id = st.materials.find(m => m.materialCode === "RM1").id;
const pcRow = hiddenIndex(w, "pcMaterial_", p1rm1Id);
check("صف النقص المعتمد موجود", pcRow >= 0);
setValue(w, `input[name="pcSupplier_${pcRow}"]`, "شركة السكر الوطنية");
setValue(w, `input[name="pcPo_${pcRow}"]`, "PO-1001");
setValue(w, `input[name="pcQty_${pcRow}"]`, "340");
setValue(w, `input[name="pcOrder_${pcRow}"]`, "2026-08-21");
setValue(w, `input[name="pcEta_${pcRow}"]`, "2026-08-28");
submitDialog(w, "commitment-form");
st = getState(w);
check("إنشاء أمر شراء واحد", st.commitments.length === 1 && st.commitments[0].po === "PO-1001");
check("لا حقل مالية في الأوردر", st.commitments[0].financeStatus === undefined);
check("لا سجلات تحقق مالي", st.financeChecks.length === 0);
check("وارد متوقع أنشئ", st.rawReceipts.length === 1 && st.rawReceipts[0].status === "expected");
check("Inbound ارتفع", st.materials.find(m => m.id === p1rm1Id).inbound === 340);
switchRole(w, "rmWarehouse");
click(w, 'nav [data-page="receipts"]');
click(w, '[data-action="receive-material"]');
check("لا استلام قبل In Transit", !w.document.getElementById("receipt-form"));
switchRole(w, "procurement");
click(w, 'nav [data-page="procurement"]');
check("قرار الشراء لا يعبر قبل موافقة المالية", !w.document.querySelector('[data-action="advance-commitment"]') && pageText(w).includes("بانتظار موافقة المالية"));
st = getState(w);
check("الأوردر أنشئ بانتظار المالية", st.commitments[0].financeApproval && st.commitments[0].financeApproval.status === "pending");
switchRole(w, "finance");
check("إشعار موافقة الشراء للمالية", !!w.document.querySelector(".notify-box") && w.document.querySelector(".notify-box").textContent.includes("أوامر الشراء"));
click(w, 'nav [data-page="finance"]');
check("بطاقة موافقة المالية تعرض الأوردر", pageText(w).includes("موافقة المالية على أوامر الشراء") && pageText(w).includes("PO-1001"));
click(w, '[data-action="finance-po-decision"][data-decision="rejected"]');
st = getState(w);
check("رفض المالية يوقف الأوردر", st.commitments[0].financeApproval.status === "rejected");
switchRole(w, "procurement");
click(w, 'nav [data-page="procurement"]');
check("المرفوض لا يتقدم", !w.document.querySelector('[data-action="advance-commitment"]') && pageText(w).includes("مرفوض من المالية"));
switchRole(w, "finance");
click(w, 'nav [data-page="finance"]');
check("لا زر موافقة بلا كوتيشن", !w.document.querySelector('[data-action="finance-po-decision"][data-decision="approved"]') && pageText(w).includes("الموافقة تتطلب كوتيشن"));
switchRole(w, "procurement");
click(w, 'nav [data-page="procurement"]');
const RealFileReader = w.FileReader;
w.FileReader = function () { const self = this; this.readAsDataURL = function () { self.result = "data:application/pdf;base64,UVVPVA=="; if (self.onload) self.onload(); }; };
const lateQuotInput = w.document.querySelector('input[data-action="quotation-late"]');
check("مدخل إرفاق الكوتيشن متاح للمشتريات بعد الإنشاء", !!lateQuotInput);
Object.defineProperty(lateQuotInput, "files", { value: [new w.File(["quote"], "q-po1001.pdf", { type: "application/pdf" })] });
lateQuotInput.dispatchEvent(new w.Event("change", { bubbles: true }));
w.FileReader = RealFileReader;
st = getState(w);
check("الكوتيشن أُرفق لاحقًا وحُفظ على الأوردر", !!st.commitments[0].quotation && st.commitments[0].quotation.name === "q-po1001.pdf");
switchRole(w, "finance");
click(w, 'nav [data-page="finance"]');
check("المالية ترى الكوتيشن قبل قرارها", pageText(w).includes("فتح الكوتيشن (q-po1001.pdf)"));
click(w, '[data-action="finance-po-decision"][data-decision="approved"]');
st = getState(w);
check("موافقة المالية تسجل بوقتها", st.commitments[0].financeApproval.status === "approved" && !!st.commitments[0].financeApproval.at);
switchRole(w, "procurement");
click(w, 'nav [data-page="procurement"]');
click(w, '[data-action="advance-commitment"]');
st = getState(w);
check("بعد موافقة المالية: تأكيد وIn Transit بنقرة", st.commitments[0].status === "in_transit" && !!st.commitments[0].inTransitAt);
switchRole(w, "rmWarehouse");
click(w, 'nav [data-page="receipts"]');
click(w, '[data-action="receive-material"]');
check("نافذة الاستلام مفتوحة", !!w.document.getElementById("receipt-form"));
setValue(w, 'input[name="rrQty_0"]', "340");
submitDialog(w, "receipt-form");
st = getState(w);
check("الاستلام أضاف للرصيد مباشرة", st.materials.find(m => m.materialCode === "RM1").onHand === 440);
check("Inbound صفر بعد الاستلام", st.materials.find(m => m.id === p1rm1Id).inbound === 0);
check("الأوردر مستلم", st.commitments[0].status === "received");

console.log("=== 7) الإنتاج الفعلي منتج × شهر ===");
switchRole(w, "production");
click(w, 'nav [data-page="execution"]');
click(w, '[data-action="new-actual"]');
check("جدول التشغيلات 3 صفوف (منتج×شهر)", w.document.querySelector('input[name="paCount"]').value === "3");
const findRun = (prod, month) => {
  const prods = [...w.document.querySelectorAll('input[name^="paProduct_"]')];
  const hit = prods.find(i => i.value === prod && w.document.querySelector(`input[name="paMonth_${i.name.slice(10)}"]`).value === month);
  return hit ? Number(hit.name.slice(10)) : -1;
};
const runP1Sep = findRun("P1", "2026-09");
check("صف P1 أيلول موجود", runP1Sep >= 0);
setValue(w, `input[name="paQty_${runP1Sep}"]`, "90");
setValue(w, `input[name="paBatch_${runP1Sep}"]`, "B-101");
submitDialog(w, "actual-form");
st = getState(w);
check("تسجيل فعلي شهري", st.actuals.length === 1 && st.actuals[0].month === "2026-09" && st.actuals[0].planned === 90);
check("سحب حصة الشهر من RM1 بنسبة إجمالي الشهر (340×90/170=180)", Math.round(st.materials.find(m => m.id === p1rm1Id).consumed) === 180);
check("خصم السحب من الرصيد", Math.round(st.materials.find(m => m.materialCode === "RM1").onHand) === 260);
check("سحب RM2 بنفس النسبة (90×90/170≈48)", Math.round(st.materials.find(m => m.materialCode === "RM2").consumed) === 48);
click(w, '[data-action="new-actual"]');
// v52: المكتمل يبقى ظاهرًا مقفلًا بدل أن يختفي، فيرى الإنتاج ما سجّله ويكتشف الخطأ.
{
  const doneRun = findRun("P1", "2026-09");
  check("الشهر المكتمل يبقى في الجدول", w.document.querySelector('input[name="paCount"]').value === "3");
  check("حقول الشهر المكتمل مقفلة", w.document.querySelector(`input[name="paQty_${doneRun}"]`).disabled === true && w.document.querySelector(`input[name="paBatch_${doneRun}"]`).disabled === true);
  check("حالة الشهر المكتمل معروضة", dialogText(w).includes("مكتمل"));
  check("المنجز سابقًا صار ظاهرًا لا صفرًا", dialogText(w).includes("90"));
}
const runP2Sep = findRun("P2", "2026-09");
setValue(w, `input[name="paQty_${runP2Sep}"]`, "40");
setValue(w, `input[name="paBatch_${runP2Sep}"]`, "B-102");
submitDialog(w, "actual-form");
click(w, '[data-action="new-actual"]');
{
  const partialRun = findRun("P2", "2026-09");
  check("الإنتاج الجزئي يبقي التشغيل مفتوحًا", w.document.querySelector(`input[name="paQty_${partialRun}"]`).disabled === false);
  check("الحالة الجزئية معروضة", dialogText(w).includes("جزئي"));
  check("كل الصفوف ما زالت في الجدول", w.document.querySelector('input[name="paCount"]').value === "3");
}
click(w, '[data-action="close-dialog"]');

console.log("=== 8) استلام المنتج النهائي ===");
switchRole(w, "fgWarehouse");
check("إشعار مهمة لمخزن FG", !!w.document.querySelector(".notify-box"));
click(w, 'nav [data-page="fgReceipts"]');
click(w, '[data-action="confirm-fg"]');
st = getState(w);
const b101 = st.actuals.find(a => a.batch === "B-101");
const fgRow = hiddenIndex(w, "fgActual_", b101.id);
setValue(w, `input[name="fgReceived_${fgRow}"]`, "85");
submitDialog(w, "fg-form");
st = getState(w);
check("استلام FG مسجل", st.fgReceipts.length === 1 && st.fgReceipts[0].received === 85);
check("فرق الاستلام فتح قضية تلقائيًا", st.issues.some(i => i.title.includes("فرق")));

console.log("=== 9) المالية والأوديت مراقبة فقط ===");
switchRole(w, "finance");
check("مساحة المالية مراقبة", pageText(w).includes("مراقبة") || pageText(w).includes("المراقبة المالية"));
check("لا أزرار قرار مالي", !w.document.querySelector('[data-action="finance-decision"]'));
check("المالية ترى المشتريات قراءة", pageText(w).includes("PO-1001"));
check("لا يوجد أي سجل تحقق مالي في النظام", getState(w).financeChecks.length === 0);

console.log("=== 10) داشبورد الإدارة ===");
switchRole(w, "executive");
click(w, 'nav [data-page="executive"]');
check("لوحة الطلبيات تعرض السجلات", pageText(w).includes("P1") && pageText(w).includes("Roadmap"));
click(w, '[data-action="open-order-roadmap"]');
check("نافذة Roadmap تفتح بمراحل الجاهزية الجديدة", dialogText(w).includes("تأكيد إمكانية التوريد") && dialogText(w).includes("قرار المشتريات النهائي"));
click(w, '[data-action="close-dialog"]');

console.log("=== 10أ) داشبورد الإدارة: KPI أساسية وتخصيص اللوحة ===");
check("مؤشرات KPI الأساسية ظاهرة", pageText(w).includes("مؤشرات الأداء الأساسية") && pageText(w).includes("المخطط المثبت") && pageText(w).includes("نقص جاهز للشراء") && pageText(w).includes("قضايا مفتوحة"));
check("زر تخصيص اللوحة موجود", !!w.document.querySelector('[data-action="toggle-exec-picker"]'));
click(w, '[data-action="toggle-exec-picker"]');
check("قائمة التخصيص تعرض 9 ودجات", w.document.querySelectorAll('input[data-action="exec-widget-toggle"]').length === 9);
const ordersToggle = w.document.querySelector('input[data-action="exec-widget-toggle"][data-widget="orders"]');
ordersToggle.checked = false;
ordersToggle.dispatchEvent(new w.Event("change", { bubbles: true }));
st = getState(w);
check("إخفاء لوحة الطلبيات يحفظ ويطبق", st.execWidgets.orders === false && !pageText(w).includes("Order Control Tower"));
const kpisToggle = w.document.querySelector('input[data-action="exec-widget-toggle"][data-widget="kpis"]');
kpisToggle.checked = false;
kpisToggle.dispatchEvent(new w.Event("change", { bubbles: true }));
check("إخفاء KPI الأساسية", !pageText(w).includes("مؤشرات الأداء الأساسية"));
click(w, '[data-action="exec-widgets-show-all"]');
st = getState(w);
check("إظهار الكل يعيد كل الأقسام", Object.keys(st.execWidgets).length === 0 && pageText(w).includes("Order Control Tower") && pageText(w).includes("مؤشرات الأداء الأساسية"));
click(w, '[data-action="toggle-exec-picker"]');
check("تنبيهات المخزون الاستراتيجي ودجة في الداشبورد", pageText(w).includes("المخزون الاستراتيجي ومدد التوريد"));
click(w, '[data-action="exec-kpi-health"][data-health="completed"]');
check("مؤشر الحالة يفلتر اللوحة عند الضغط", !!w.document.querySelector('.kpi-filter-tile.is-active[data-health="completed"]'));
click(w, '[data-action="exec-kpi-health"][data-health="completed"]');
check("الضغط مجددًا يلغي فلتر المؤشر", !w.document.querySelector('.kpi-filter-tile.is-active'));

console.log("=== 10ب) نظام التقارير المفصل مع تصدير Excel ===");
switchRole(w, "production");
click(w, 'nav [data-page="reports"]');
check("صفحة التقارير المفصلة", pageText(w).includes("نظام تقارير مفصل") && pageText(w).includes("تقرير المستندات والتفاوض") && pageText(w).includes("تقرير أوامر الشراء") && pageText(w).includes("تقرير التنفيذ الشهري") && pageText(w).includes("تقرير الخطط والاعتمادات"));
check("تقرير الشراء يعرض الكوتيشن وموافقة المالية", pageText(w).includes("q-po1001.pdf") && pageText(w).includes("موافقة المالية"));
click(w, '[data-action="export-report"][data-report="purchases"]');
check("تصدير أوامر الشراء إلى Excel", w.document.getElementById("toast-region").textContent.includes("صُدّر تقرير أوامر الشراء"));
const forecastReportCount = () => Number((pageText(w).match(/تقرير المستندات والتفاوض \((\d+)\)/) || [])[1] ?? -1);
const forecastReportAll = forecastReportCount();
change(w, 'select[data-action="report-product-filter"]', "P2");
check("فلتر المنتج يقلص تقرير المستندات", forecastReportCount() >= 0 && forecastReportCount() < forecastReportAll);
change(w, 'select[data-action="report-product-filter"]', "");
check("إزالة الفلتر تعيد كل الصفوف", forecastReportCount() === forecastReportAll && forecastReportAll > 0);
switchRole(w, "sales");
click(w, 'nav [data-page="reports"]');
check("المبيعات لا ترى تقارير المواد والشراء", !pageText(w).includes("تقرير أوامر الشراء") && !pageText(w).includes("تقرير الاحتياجات") && !pageText(w).includes("تقرير حركة المواد") && !pageText(w).includes("تقرير المخزون الاستراتيجي"));
check("المبيعات ترى تقارير المستندات والمبيعات وFG", pageText(w).includes("تقرير المستندات والتفاوض") && pageText(w).includes("تقرير المبيعات اليومية") && pageText(w).includes("تقرير مخزون المنتج النهائي"));

console.log("=== 10ج) نظام اللغات: عربي/إنجليزي/كردي + جدول اللغات ===");
change(w, 'select[data-action="switch-lang"]', "en");
check("الإنجليزية: اتجاه الصفحة LTR ولغة en", w.document.documentElement.getAttribute("dir") === "ltr" && w.document.documentElement.getAttribute("lang") === "en");
check("الإنجليزية: التبويبات مترجمة", pageText(w).includes("Home") && pageText(w).includes("Weekly plan"));
check("الإنجليزية: تقرير المبيعات مترجم", pageText(w).includes("Daily sales report"));
change(w, 'select[data-action="switch-lang"]', "ku");
check("الكردية: اتجاه RTL ولغة ku", w.document.documentElement.getAttribute("dir") === "rtl" && w.document.documentElement.getAttribute("lang") === "ku");
check("الكردية: التبويبات مترجمة سورانيًا", pageText(w).includes("سەرەکی") && pageText(w).includes("ڕاپۆرتەکان"));
change(w, 'select[data-action="switch-lang"]', "ar");
check("العودة للعربية", w.document.documentElement.getAttribute("lang") === "ar" && pageText(w).includes("الرئيسية"));
switchRole(w, "admin");
click(w, 'nav [data-page="languages"]');
check("جدول اللغات: الأعمدة الثلاثة مقابل بعض", pageText(w).includes("جدول اللغات") && pageText(w).includes("English") && pageText(w).includes("کوردی سۆرانی") && pageText(w).includes("العربية (المصدر)"));
change(w, 'input[data-action="lang-filter"]', "الرئيسية");
const langCellEn = w.document.querySelector('input[data-lt-key="الرئيسية"][data-lt-lang="en"]');
check("صف العبارة يظهر بعد البحث", !!langCellEn && langCellEn.value === "Home");
langCellEn.value = "Main Board";
click(w, '[data-action="save-languages"]');
st = getState(w);
check("تعديل الترجمة يُحفظ ككتابة فوقية", st.langOverrides["الرئيسية"] && st.langOverrides["الرئيسية"].en === "Main Board");
change(w, 'select[data-action="switch-lang"]', "en");
check("التعديل يطبق فورًا على الواجهة", pageText(w).includes("Main Board") && !w.document.querySelector('nav [data-page="home"]').textContent.includes("Home"));
change(w, 'select[data-action="switch-lang"]', "ar");
change(w, 'input[data-action="lang-filter"]', "");

console.log("=== 10د) إدارة المستخدمين والهوية والثيم ===");
switchRole(w, "admin");
click(w, 'nav [data-page="admin"]');
st = getState(w);
check("8 مستخدمين افتراضيين (واحد لكل دور)", st.users.length === 8 && pageText(w).includes("إدارة المستخدمين"));
click(w, '[data-action="new-users"]');
check("نافذة إضافة المستخدمين جدول واحد", !!w.document.getElementById("user-form"));
setValue(w, 'input[name="uName_0"]', "أحمد كريم");
setValue(w, 'select[name="uRole_0"]', "production");
setValue(w, 'input[name="uName_1"]', "سارة نوري");
setValue(w, 'select[name="uRole_1"]', "finance");
submitDialog(w, "user-form");
st = getState(w);
check("أُضيف مستخدمان", st.users.length === 10 && st.users.some(u => u.name === "أحمد كريم" && u.role === "production"));
const saraId = st.users.find(u => u.name === "سارة نوري").id;
click(w, `[data-action="toggle-user"][data-id="${saraId}"]`);
st = getState(w);
check("إيقاف ظهور مستخدم", st.users.find(u => u.id === saraId).active === false && pageText(w).includes("موقوف"));
click(w, '[data-action="toggle-user"][data-id="U-admin"]');
st = getState(w);
check("حماية آخر مسؤول نظام من الإيقاف", st.users.find(u => u.id === "U-admin").active !== false);
click(w, '[data-action="delete-user"][data-id="U-admin"]');
st = getState(w);
check("حماية آخر مسؤول نظام من الحذف", st.users.some(u => u.id === "U-admin"));
const ahmadId = st.users.find(u => u.name === "أحمد كريم").id;
click(w, `[data-action="delete-user"][data-id="${ahmadId}"]`);
st = getState(w);
check("حذف مستخدم", st.users.length === 9 && !st.users.some(u => u.name === "أحمد كريم"));
click(w, '[data-action="logout"]');
check("لوحة الدخول تعرض المستخدمين الفعالين فقط", !!w.document.getElementById("login-form") && ![...w.document.getElementById("login-user").options].some(o => o.textContent.includes("سارة نوري")));
w.document.getElementById("login-user").value = "U-admin";
w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
st = getState(w);
check("الدخول من لوحة الدخول باسم المستخدم", st.loggedIn === true && st.currentUserId === "U-admin" && st.role === "admin");
click(w, 'nav [data-page="admin"]');
w.document.getElementById("brand-name-input").value = "مصنع الفرات";
click(w, '[data-action="save-branding"]');
st = getState(w);
check("حفظ اسم الشركة وظهوره في الواجهة", st.branding.name === "مصنع الفرات" && w.document.querySelector(".topbar .brand strong").textContent.includes("مصنع الفرات"));
change(w, 'input[data-action="branding-color"]', "#7a1f4f");
st = getState(w);
check("لون الثيم يحفظ ويطبق على متغيرات CSS", st.branding.themeColor === "#7a1f4f" && w.document.documentElement.style.getPropertyValue("--navy-900") === "#7a1f4f" && w.document.documentElement.style.getPropertyValue("--teal-700") === "#7a1f4f");
click(w, '[data-action="reset-theme"]');
st = getState(w);
check("استعادة اللون الافتراضي", st.branding.themeColor === "" && w.document.documentElement.style.getPropertyValue("--navy-900") === "");
const RealFR2 = w.FileReader;
w.FileReader = function () { const self = this; this.readAsDataURL = function () { self.result = "data:image/png;base64,iVBORw0KGgo="; if (self.onload) self.onload(); }; };
const logoInput = w.document.querySelector('input[data-action="branding-logo"]');
Object.defineProperty(logoInput, "files", { value: [new w.File(["logo"], "logo.png", { type: "image/png" })] });
logoInput.dispatchEvent(new w.Event("change", { bubbles: true }));
w.FileReader = RealFR2;
st = getState(w);
check("رفع اللوغو وظهوره في الشريط العلوي", st.branding.logo && st.branding.logo.name === "logo.png" && !!w.document.querySelector(".topbar img.brand-logo"));
click(w, 'nav [data-page="admin"]');
click(w, '[data-action="remove-logo"]');
st = getState(w);
check("إزالة اللوغو تعيد الأحرف", st.branding.logo === null && !w.document.querySelector(".topbar img.brand-logo"));

console.log("=== 10هـ) كلمات المرور في لوحة الدخول ===");
check("عمود كلمة المرور في جدول المستخدمين", pageText(w).includes("بلا كلمة مرور"));
click(w, '[data-action="set-password"][data-id="U-sales"]');
check("نافذة تعيين كلمة المرور", !!w.document.getElementById("password-form"));
setValue(w, 'input[name="pwValue"]', "12");
submitDialog(w, "password-form");
check("رفض كلمة مرور أقصر من 4", dialogText(w).includes("قصيرة"));
setValue(w, 'input[name="pwValue"]', "sales2026");
submitDialog(w, "password-form");
st = getState(w);
check("تعيين كلمة المرور يحفظ بصمة لا نصًا", !!st.users.find(u => u.id === "U-sales").passHash && !JSON.stringify(st.users).includes("sales2026"));
check("الحالة أصبحت محمية", pageText(w).includes("محمي بكلمة مرور"));
click(w, '[data-action="new-users"]');
setValue(w, 'input[name="uName_0"]', "ليلى حسن");
setValue(w, 'select[name="uRole_0"]', "executive");
setValue(w, 'input[name="uPass_0"]', "ab");
submitDialog(w, "user-form");
check("رفض كلمة مرور قصيرة عند الإضافة", dialogText(w).includes("قصيرة"));
setValue(w, 'input[name="uPass_0"]', "layla123");
submitDialog(w, "user-form");
st = getState(w);
check("مستخدم جديد بكلمة مرور", !!st.users.find(u => u.name === "ليلى حسن" && u.passHash));
click(w, '[data-action="logout"]');
w.document.getElementById("login-user").value = "U-sales";
setValue(w, "#login-password", "wrongpass");
w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
check("كلمة مرور خاطئة تمنع الدخول", !!w.document.getElementById("login-form") && getState(w).loggedIn === false);
setValue(w, "#login-password", "sales2026");
w.document.getElementById("login-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
st = getState(w);
check("كلمة المرور الصحيحة تدخل المستخدم", st.loggedIn === true && st.currentUserId === "U-sales" && st.role === "sales");
switchRole(w, "admin");
click(w, 'nav [data-page="admin"]');
click(w, '[data-action="set-password"][data-id="U-sales"]');
setValue(w, 'input[name="pwValue"]', "");
submitDialog(w, "password-form");
st = getState(w);
check("الحقل الفارغ يزيل كلمة المرور", st.users.find(u => u.id === "U-sales").passHash === "");
switchRole(w, "sales");

console.log("=== 11) مسار تعديل المبيعات بعد رد الإنتاج ===");
{
  const { w: w2 } = boot();
  switchRole(w2, "admin");
  click(w2, 'nav [data-page="productMaster"]');
  (function () {
    click(w2, '[data-action="new-product"]');
    setValue(w2, '#dialog-content input[name="code"]', "PX");
    setValue(w2, '#dialog-content input[name="name"]', "منتج تجريبي");
    setValue(w2, '#dialog-content input[name="unit"]', "كرتون");
    submitDialog(w2, "product-master-form");
  })();
  switchRole(w2, "sales");
  click(w2, '[data-action="new-forecast"]');
  change(w2, 'input[name="fromMonth"]', "2026-09");
  change(w2, 'input[name="toMonth"]', "2026-10");
  setValue(w2, 'input[name="fq_0_0"]', "100");
  submitDialog(w2, "forecast-form");
  switchRole(w2, "production");
  click(w2, 'nav [data-page="forecasts"]');
  click(w2, '[data-action="forecast-production-review"]');
  setValue(w2, 'input[name="pq_0_0"]', "60");
  setValue(w2, 'select[name="decision"]', "feedback");
  submitDialog(w2, "production-review-form");
  switchRole(w2, "sales");
  click(w2, 'nav [data-page="forecasts"]');
  click(w2, '[data-action="review-forecast-feedback"]');
  click(w2, '[data-action="edit-forecast"]');
  check("تعديل المبيعات يفتح الجدول بأرقام الإنتاج", w2.document.querySelector('input[name="fq_0_0"]').value === "60");
  setValue(w2, 'input[name="fq_0_0"]', "80");
  submitDialog(w2, "forecast-form");
  let st2 = getState(w2);
  check("إعادة الإرسال ترفع الإصدار وتحفظ السجل", st2.forecasts[0].version === "V3" && st2.forecasts[0].status === "submitted" && st2.forecasts[0].history.length === 2);
  switchRole(w2, "production");
  click(w2, 'nav [data-page="forecasts"]');
  click(w2, '[data-action="forecast-production-review"]');
  setValue(w2, 'select[name="decision"]', "fix");
  submitDialog(w2, "production-review-form");
  st2 = getState(w2);
  check("التثبيت بدون تعديل يمر", st2.forecasts[0].status === "fixed");
  // إلغاء مستند غير مثبت
  switchRole(w2, "sales");
  click(w2, '[data-action="new-forecast"]');
  change(w2, 'input[name="fromMonth"]', "2026-09");
  change(w2, 'input[name="toMonth"]', "2026-09");
  setValue(w2, 'input[name="fq_0_0"]', "10");
  submitDialog(w2, "forecast-form");
  click(w2, 'nav [data-page="forecasts"]');
  click(w2, '[data-action="cancel-forecast"]');
  st2 = getState(w2);
  check("إلغاء مستند قبل التثبيت", st2.forecasts.some(f => f.status === "cancelled"));
}

console.log("=== 11ب) تعديل المبيعات يعيد فحص الجاهزية ===");
{
  const { w: w6 } = boot();
  switchRole(w6, "admin");
  click(w6, 'nav [data-page="productMaster"]');
  click(w6, '[data-action="new-product"]');
  setValue(w6, '#dialog-content input[name="code"]', "P9");
  setValue(w6, '#dialog-content input[name="name"]', "منتج الجاهزية");
  setValue(w6, '#dialog-content input[name="unit"]', "كرتون");
  submitDialog(w6, "product-master-form");
  click(w6, 'nav [data-page="materialMaster"]');
  click(w6, '[data-action="new-raw-material"]');
  setValue(w6, '#dialog-content input[name="code"]', "RM9");
  setValue(w6, '#dialog-content input[name="name"]', "مادة الجاهزية");
  setValue(w6, '#dialog-content input[name="unit"]', "كغم");
  submitDialog(w6, "raw-material-master-form");
  switchRole(w6, "sales");
  click(w6, '[data-action="new-forecast"]');
  change(w6, 'input[name="fromMonth"]', "2026-09");
  change(w6, 'input[name="toMonth"]', "2026-09");
  setValue(w6, 'input[name="fq_0_0"]', "100");
  submitDialog(w6, "forecast-form");
  switchRole(w6, "production");
  click(w6, 'nav [data-page="materials"]');
  click(w6, '[data-action="new-material"]');
  setValue(w6, 'input[name="mrQty_0_0_0"]', "200");
  submitDialog(w6, "material-form");
  switchRole(w6, "rmWarehouse");
  click(w6, 'nav [data-page="rmStock"]');
  click(w6, '[data-action="confirm-stock"]');
  setValue(w6, 'input[name="stockOnHand_0"]', "500");
  setValue(w6, 'input[name="stockReserved_0"]', "0");
  setValue(w6, 'input[name="stockHold_0"]', "0");
  submitDialog(w6, "stock-form");
  switchRole(w6, "procurement");
  click(w6, 'nav [data-page="requirements"]');
  click(w6, '[data-action="confirm-supply"]');
  submitDialog(w6, "supply-form");
  switchRole(w6, "production");
  click(w6, 'nav [data-page="forecasts"]');
  click(w6, '[data-action="forecast-production-review"]');
  setValue(w6, 'input[name="pq_0_0"]', "60");
  setValue(w6, 'select[name="decision"]', "feedback");
  submitDialog(w6, "production-review-form");
  switchRole(w6, "sales");
  click(w6, 'nav [data-page="forecasts"]');
  click(w6, '[data-action="review-forecast-feedback"]');
  click(w6, '[data-action="edit-forecast"]');
  setValue(w6, 'input[name="fq_0_0"]', "80");
  submitDialog(w6, "forecast-form");
  let st6 = getState(w6);
  check("تعديل الكميات يعيد فتح فحص الجاهزية", st6.forecasts[0].readinessStale === true && st6.forecasts[0].supplyFeasibility === null && st6.forecasts[0].status === "submitted");
  switchRole(w6, "production");
  click(w6, 'nav [data-page="forecasts"]');
  click(w6, '[data-action="forecast-production-review"]');
  check("الرد مقفل بعد تعديل المبيعات", !w6.document.getElementById("production-review-form"));
  click(w6, 'nav [data-page="materials"]');
  click(w6, '[data-action="new-material"]');
  submitDialog(w6, "material-form");
  st6 = getState(w6);
  check("إعادة تأكيد الاحتياجات تزيل علامة الفحص", st6.forecasts[0].readinessStale === false);
  switchRole(w6, "procurement");
  click(w6, 'nav [data-page="requirements"]');
  click(w6, '[data-action="confirm-supply"]');
  submitDialog(w6, "supply-form");
  switchRole(w6, "production");
  click(w6, 'nav [data-page="forecasts"]');
  click(w6, '[data-action="forecast-production-review"]');
  check("الرد يفتح بعد إعادة الفحص كاملًا", !!w6.document.getElementById("production-review-form"));
  setValue(w6, 'select[name="decision"]', "fix");
  submitDialog(w6, "production-review-form");
  st6 = getState(w6);
  check("التثبيت بعد دورة الجاهزية المعادة", st6.forecasts[0].status === "fixed");
}

console.log("=== 12) ترحيل البيانات القديمة (Schema 12 → 13) ===");
{
  const seed = {
    schemaVersion: 12, role: "production", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج قديم", unit: "كرتون", active: true }],
    rawMaterials: [{ code: "RM1", name: "مادة قديمة", unit: "كغم", active: true }],
    forecasts: [{ id: "FC-OLD", version: "V1", startDate: "2026-01-01", endDate: "2026-03-31", frequency: "monthly", priority: "عادية", note: "",
      items: [{ productCode: "P1", productName: "منتج قديم", unit: "كرتون", qty: 300, note: "", planStatus: "planned" }],
      status: "confirmed", submittedAt: "2026-01-01 09:00" }],
    plans: [{ id: "PL-1", version: "V1", forecastId: "FC-OLD", productCode: "P1", product: "منتج قديم", unit: "كرتون", forecastQty: 300, qty: 300, line: "L1", start: "2026-01-05", finish: "2026-03-25", status: "approved", note: "مطابق", submittedAt: "2026-01-02 09:00", salesDecisionAt: "2026-01-03 09:00" }],
    materials: [
      { id: "MR-1", planId: "PL-1", materialCode: "RM1", material: "مادة قديمة", unit: "كغم", required: 600, consumed: 0, needDate: "2026-02-10", onHand: 50, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-01-04 09:00", status: "shortage", createdAt: "2026-01-03 10:00" },
      { id: "MR-2", planId: "PL-1", materialCode: "RM1", material: "مادة قديمة", unit: "كغم", required: 400, consumed: 0, needDate: "2026-03-05", onHand: 50, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-01-04 09:00", status: "shortage", createdAt: "2026-01-03 11:00" }
    ],
    commitments: [{ id: "PC-OLD", materialId: "MR-2", supplier: "مورد", po: "PO-OLD", qty: 100, orderDate: "2026-01-05", eta: "2026-01-20", amount: "", status: "received", createdAt: "2026-01-05 09:00" }], rawReceipts: [],
    actuals: [{ id: "PA-1", planId: "PL-1", productCode: "P1", product: "منتج قديم", planned: 300, actual: 100, batch: "OLD-1", date: "2026-02-15", status: "completed", recordedAt: "2026-02-15 12:00" }],
    fgReceipts: [], issues: [], downtime: [],
    financeChecks: [{ id: "FIN-1", commitmentId: "PC-X", reference: "PO-X", supplier: "س", amount: "1000", status: "pending", createdAt: "2026-01-05 09:00", decidedAt: "" }],
    audit: [],
    permissions: { sales: ["home", "workflow", "forecasts", "salesSupply", "fgView", "issues"], production: ["home", "workflow", "forecasts", "plans", "materials", "execution", "fgView", "issues"], procurement: ["home", "workflow", "requirements", "procurement", "rmStock", "issues"], rmWarehouse: ["home", "workflow", "materials", "rmStock", "receipts", "issues"], fgWarehouse: ["home", "workflow", "fgReceipts", "fgStock", "issues"], finance: ["home", "finance", "issues"], executive: ["home", "executive", "issues", "audit"], admin: ["home", "setup", "productMaster", "materialMaster", "workflow", "admin", "issues", "audit", "executive"] }
  };
  const { w: w3 } = boot(seed);
  switchRole(w3, "production"); // يفرض الحفظ بعد الترحيل
  const st3 = getState(w3);
  check("رقم المخطط الجديد", st3.schemaVersion === 23);
  check("v23: حدّ التفويض يُملأ للحالات القديمة", st3.approvalTolerancePct === 5);
  check("v23: صندوق الموافقات أُضيف لصلاحيات الأدوار المعتمِدة", ["sales","production","fgWarehouse","finance"].every(r => st3.permissions[r].includes("approvals")));
  check("الأوردر القديم موافق عليه ترحيلًا", st3.commitments[0].financeApproval && st3.commitments[0].financeApproval.status === "approved");
  check("صلاحية الخطة الأسبوعية أضيفت بالترحيل", st3.permissions.sales.includes("weekly") && st3.permissions.production.includes("weekly") && st3.permissions.fgWarehouse.includes("weekly"));
  check("صلاحية المتابعة الشهرية أضيفت بالترحيل", st3.permissions.sales.includes("monthly") && st3.permissions.production.includes("monthly") && st3.permissions.finance.includes("monthly") && st3.permissions.executive.includes("monthly"));
  const oldFc = st3.forecasts[0];
  check("مستند قديم بخطة معتمدة → مثبت", oldFc.status === "fixed" && !!oldFc.fixedAt);
  check("المثبت القديم يعتبر مؤكد التوريد ترحيلًا", oldFc.supplyFeasibility && oldFc.supplyFeasibility.confirmed === true);
  check("أشهر مشتقة من الفترة", JSON.stringify(oldFc.months) === JSON.stringify(["2026-01", "2026-02", "2026-03"]));
  check("كمية قديمة تتحول لأول شهر", oldFc.items[0].monthlyQty["2026-01"] === 300 && oldFc.items[0].qty === 300);
  check("دمج سجلات نفس المادة في سجل إجمالي واحد", st3.materials.length === 1);
  const oldMr = st3.materials[0];
  check("احتياج قديم يرتبط بالمستند ويجمع الكميات", oldMr.forecastId === "FC-OLD" && oldMr.required === 1000);
  check("كمية الاحتياج تتحول لأشهر الحاجة مجموعة", oldMr.monthlyQty["2026-02"] === 600 && oldMr.monthlyQty["2026-03"] === 400);
  check("أمر الشراء أعيد ربطه بالسجل المدموج", st3.commitments[0].materialId === oldMr.id);
  const oldActual = st3.actuals[0];
  check("فعلي قديم يرتبط بالمستند وشهره", oldActual.forecastId === "FC-OLD" && oldActual.month === "2026-02");
  check("صلاحيات المالية تتحول للمراقبة", st3.permissions.finance.includes("rmStock") && st3.permissions.finance.includes("procurement") && st3.permissions.finance.includes("audit"));
  check("صفحات ملغاة حذفت من الصلاحيات", !st3.permissions.sales.includes("salesSupply") && !st3.permissions.production.includes("plans"));
  check("التطبيق يعمل بعد الترحيل", pageText(w3).includes("Ice Star"));
}

console.log("=== 15) تسجيل المبيعات وخصمها من الصافي ===");
switchRole(w, "sales");
click(w, 'nav [data-page="fgView"]');
check("زر تسجيل المبيعات ظاهر للمبيعات", !!w.document.querySelector('[data-action="new-sale"]'));
click(w, '[data-action="new-sale"]');
check("نافذة البيع تعرض الصافي المتاح", dialogText(w).includes("85"));
const slRow = hiddenIndex(w, "slProduct_", "P1");
setValue(w, `input[name="slQty_${slRow}"]`, "100");
submitDialog(w, "sales-form");
check("رفض بيع يتجاوز الصافي المتاح", getState(w).salesRecords.length === 0);
setValue(w, `input[name="slQty_${slRow}"]`, "30");
setValue(w, `input[name="slNote_${slRow}"]`, "عميل الجملة");
submitDialog(w, "sales-form");
st = getState(w);
check("تسجيل البيع", st.salesRecords.length === 1 && st.salesRecords[0].qty === 30 && st.salesRecords[0].productCode === "P1");
check("سجل البيع في الأحداث", JSON.stringify(st.audit).includes("تسجيل بيع"));
click(w, 'nav [data-page="fgView"]');
check("الصافي بعد البيع = 55", pageText(w).includes("55"));
click(w, '[data-action="new-sale"]');
const slRow2 = hiddenIndex(w, "slProduct_", "P1");
setValue(w, `input[name="slQty_${slRow2}"]`, "60");
submitDialog(w, "sales-form");
check("رفض بيع ثانٍ يتجاوز الصافي المتبقي", getState(w).salesRecords.length === 1);
click(w, '[data-action="close-dialog"]');
switchRole(w, "fgWarehouse");
click(w, 'nav [data-page="fgStock"]');
check("سجل المبيعات ظاهر لمخزن FG قراءة", pageText(w).includes("سجل المبيعات") && pageText(w).includes("عميل الجملة"));

console.log("=== 16) المخزون الاستراتيجي ومدد التوريد ===");
switchRole(w, "procurement");
click(w, 'nav [data-page="requirements"]');
check("بطاقة المخزون الاستراتيجي ظاهرة للمشتريات", pageText(w).includes("المخزون الاستراتيجي"));
click(w, '[data-action="set-strategic"]');
check("نافذة الضبط للمشتريات فيها مدة التوريد", !!w.document.querySelector('input[name="stLead_0"]'));
const stRM1 = hiddenIndex(w, "stCode_", "RM1");
setValue(w, `input[name="stStock_${stRM1}"]`, "300");
setValue(w, `input[name="stLead_${stRM1}"]`, "7");
submitDialog(w, "strategic-form");
st = getState(w);
check("حفظ الحد الاستراتيجي ومدة التوريد", st.rawMaterials.find(m => m.code === "RM1").strategicStock === 300 && st.rawMaterials.find(m => m.code === "RM1").leadTimeDays === 7);
check("الرصيد (180) تحت الحد (300) = تنبيه وامض للمشتريات", !!w.document.querySelector(".notify-box"));
// v42: الحد الاستراتيجي صار حدًا أدنى واجبًا يدخل معادلة النقص لا مجرد تنبيه.
check("الحد الاستراتيجي يولّد نقصًا يذهب للمشتريات", w.document.querySelector(".notify-box").textContent.includes("اطلب المواد الناقصة"));
click(w, 'nav [data-page="requirements"]');
check("شارة تحت الحد ظاهرة", pageText(w).includes("تحت الحد"));
check("مدة التوريد ظاهرة في طلبات المواد", pageText(w).includes("مدة التوريد ~7 يوم"));

switchRole(w, "production");
click(w, 'nav [data-page="materials"]');
check("بطاقة الاستراتيجي ظاهرة للإنتاج", pageText(w).includes("المخزون الاستراتيجي"));
click(w, '[data-action="set-strategic"]');
check("الإنتاج لا يعدل مدة التوريد", !w.document.querySelector('input[name="stLead_0"]') && dialogText(w).includes("7"));
const stRM1b = hiddenIndex(w, "stCode_", "RM1");
setValue(w, `input[name="stStock_${stRM1b}"]`, "150");
submitDialog(w, "strategic-form");
st = getState(w);
check("الإنتاج يعدل الحد الاستراتيجي", st.rawMaterials.find(m => m.code === "RM1").strategicStock === 150);
switchRole(w, "procurement");
click(w, 'nav [data-page="requirements"]');
check("شارة تحت الحد تزول عندما يغطي الرصيد (180) الحد (150)", !pageText(w).includes("تحت الحد"));

console.log("=== 17) المتابعة اليومية والشهرية وحركة المواد ===");
switchRole(w, "sales");
click(w, 'nav [data-page="fgView"]');
click(w, '[data-action="new-sale"]');
const slRow3 = hiddenIndex(w, "slProduct_", "P1");
setValue(w, `input[name="slQty_${slRow3}"]`, "20");
setValue(w, `input[name="slDate_${slRow3}"]`, "2026-09-05");
submitDialog(w, "sales-form");
st = getState(w);
check("بيع ثانٍ بتاريخ أيلول", st.salesRecords.length === 2);
click(w, 'nav [data-page="monthly"]');
check("شاشة المتابعة الشهرية للمبيعات", pageText(w).includes("مباع مقابل مخطط"));
check("صف P1 أيلول: مخطط 90 ومباع 20", pageText(w).includes("90") && pageText(w).includes("20"));
check("الانحراف محسوب (مباع − مخطط = -70)", pageText(w).includes("-70"));
check("حركة المواد محجوبة عن المبيعات", !pageText(w).includes("حركة المواد"));
check("المبيعات اليومية تعرض يومي البيع", pageText(w).includes("2026-09-05") && pageText(w).includes("المبيعات اليومية"));
switchRole(w, "production");
click(w, 'nav [data-page="monthly"]');
check("حركة المواد ظاهرة للإنتاج", pageText(w).includes("حركة المواد شهرًا بشهر"));
check("المسحوب الشهري لأيلول (260 من RM1)", pageText(w).includes("مسحوب") && pageText(w).includes("260"));
check("الوارد الشهري (340 في آب)", pageText(w).includes("وارد") && pageText(w).includes("340"));
st = getState(w);
check("حركات المواد مسجلة في السجل", st.materialMoves.length >= 3 && st.materialMoves.some(m => m.type === "receive") && st.materialMoves.some(m => m.type === "withdraw"));
switchRole(w, "finance");
click(w, 'nav [data-page="monthly"]');
check("المالية ترى المتابعة الشهرية قراءة", pageText(w).includes("مباع مقابل مخطط") && pageText(w).includes("حركة المواد"));

(async () => {
console.log("=== 18) استيراد Forecast من Excel مع Data Mapping ===");
const { w: w5 } = boot();
switchRole(w5, "admin");
click(w5, 'nav [data-page="productMaster"]');
for (const [c, n] of [["P1", "عصير"], ["P2", "بوظة"]]) {
  click(w5, '[data-action="new-product"]');
  setValue(w5, '#dialog-content input[name="code"]', c);
  setValue(w5, '#dialog-content input[name="name"]', n);
  setValue(w5, '#dialog-content input[name="unit"]', "كرتون");
  submitDialog(w5, "product-master-form");
}
switchRole(w5, "sales");
click(w5, '[data-action="new-forecast"]');
change(w5, 'input[name="fromMonth"]', "2026-09");
change(w5, 'input[name="toMonth"]', "2026-10");
check("زر رفع الملف موجود في نافذة Forecast", !!w5.document.querySelector('[data-action="import-forecast"]'));
check("زر تحميل التمبليت موجود", !!w5.document.querySelector('[data-action="download-forecast-template"]'));
w5.document.querySelector('[data-action="download-forecast-template"]').dispatchEvent(new w5.Event("click", { bubbles: true, cancelable: true }));
check("توليد التمبليت حسب الأشهر والمنتجات", w5.document.getElementById("toast-region").textContent.includes("التمبليت") && w5.document.getElementById("toast-region").textContent.includes("2"));
const csv = "product_code,2026-09,2026-10\nP1,100,50\nPX,10,10\nP2,80,\nP1x,abc,1";
const file = new w5.File([csv], "forecast.csv", { type: "text/csv" });
const fileInput = w5.document.querySelector('[data-action="import-forecast"]');
Object.defineProperty(fileInput, "files", { value: [file] });
fileInput.dispatchEvent(new w5.Event("change", { bubbles: true }));
await new Promise(r => setTimeout(r, 150));
check("شاشة ربط الأعمدة فتحت", !!w5.document.getElementById("forecast-map-form"));
check("تخمين تلقائي لعمود الكود والأشهر", w5.document.querySelector('select[name="fmProduct"]').value === "product_code" && w5.document.querySelector('select[name="fmMonth_0"]').value === "2026_09" && w5.document.querySelector('select[name="fmMonth_1"]').value === "2026_10");
check("معاينة الملف ظاهرة", dialogText(w5).includes("معاينة"));
setValue(w5, 'select[name="fmMonth_1"]', "2026_09");
submitDialog(w5, "forecast-map-form");
check("رفض ربط نفس العمود بشهرين", !!w5.document.getElementById("forecast-map-form"));
setValue(w5, 'select[name="fmMonth_1"]', "2026_10");
submitDialog(w5, "forecast-map-form");
check("العودة لجدول Forecast معبأ", !!w5.document.getElementById("forecast-form"));
check("كميات P1 عبئت من الملف", w5.document.querySelector('input[name="fq_0_0"]').value === "100" && w5.document.querySelector('input[name="fq_0_1"]').value === "50");
check("كمية P2 عبئت والفارغ بقي فارغًا", w5.document.querySelector('input[name="fq_1_0"]').value === "80" && w5.document.querySelector('input[name="fq_1_1"]').value === "");
let st5 = getState(w5);
check("لا إرسال تلقائي — التعبئة للمراجعة فقط", (st5 ? (st5.forecasts || []).length : 0) === 0);
check("سجل الاستيراد يذكر المتجاهل", JSON.stringify(getState(w5) ? getState(w5).audit : []).includes("تجاهل"));
submitDialog(w5, "forecast-form");
st5 = getState(w5);
check("الإرسال بعد المراجعة ينشئ المستند من بيانات الملف", st5.forecasts.length === 1 && st5.forecasts[0].items[0].monthlyQty["2026-09"] === 100 && st5.forecasts[0].items[1].qty === 80);

// رؤوس أشهر كأرقام تواريخ Excel التسلسلية (46266 = 2026-09) تُحوَّل تلقائيًا
click(w5, '[data-action="new-forecast"]');
change(w5, 'input[name="fromMonth"]', "2026-09");
change(w5, 'input[name="toMonth"]', "2026-10");
const csvSerial = "product_code,46266,46296\nP1,55,44";
const fileSerial = new w5.File([csvSerial], "serial.csv", { type: "text/csv" });
const inputSerial = w5.document.querySelector('[data-action="import-forecast"]');
Object.defineProperty(inputSerial, "files", { value: [fileSerial] });
inputSerial.dispatchEvent(new w5.Event("change", { bubbles: true }));
await new Promise(r => setTimeout(r, 150));
check("رؤوس تواريخ Excel التسلسلية تُحوَّل لأشهر وتُربط تلقائيًا", w5.document.querySelector('select[name="fmMonth_0"]').value === "2026-09" && w5.document.querySelector('select[name="fmMonth_1"]').value === "2026-10");
check("لا تحذير عندما يطابق الملف التمبليت", !dialogText(w5).includes("لا تطابق"));

// رفع قالب المنتجات بالخطأ → تحذير واضح
click(w5, '[data-action="new-forecast"]');
change(w5, 'input[name="fromMonth"]', "2026-09");
change(w5, 'input[name="toMonth"]', "2026-10");
const csvMaster = "code,name,unit\nPRD-001,منتج,كرتون";
const fileMaster = new w5.File([csvMaster], "products.csv", { type: "text/csv" });
const inputMaster = w5.document.querySelector('[data-action="import-forecast"]');
Object.defineProperty(inputMaster, "files", { value: [fileMaster] });
inputMaster.dispatchEvent(new w5.Event("change", { bubbles: true }));
await new Promise(r => setTimeout(r, 150));
check("تحذير رفع قالب التعريفات بدل تمبليت Forecast", dialogText(w5).includes("قالب تعريف المنتجات"));

console.log("=== 19) داشبورد الإدارة: مخططات دائرية وخطية تفاعلية ===");
switchRole(w, "executive");
click(w, 'nav [data-page="executive"]');
check("دوناتان دائريان في الداشبورد", w.document.querySelectorAll("svg.exec-pie").length === 2);
check("مخطط خطي شهري موجود", !!w.document.querySelector("svg.exec-line") && w.document.querySelectorAll(".line-path").length === 3);
check("نقاط الخط تحمل تلميحات", [...w.document.querySelectorAll(".line-pt")].some(p => (p.getAttribute("data-tip") || "").includes("المخطط")));
const healthSeg = w.document.querySelector('[data-action="executive-chart"][data-filter="health"]');
const segValue = healthSeg.getAttribute("data-value");
healthSeg.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true }));
check("النقر على شريحة الحالة يفلتر الداشبورد", w.document.querySelector('select[data-action="executive-filter"][data-filter="health"]').value === segValue);
const sameSeg = w.document.querySelector(`[data-action="executive-chart"][data-filter="health"][data-value="${segValue}"]`);
sameSeg.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true }));
check("النقر مجددًا يلغي الفلتر", w.document.querySelector('select[data-action="executive-filter"][data-filter="health"]').value === "all");
click(w, '[data-action="toggle-series"][data-series="sold"]');
check("إخفاء سلسلة المباع من الوسيلة", w.document.querySelectorAll(".line-path").length === 2);
click(w, '[data-action="toggle-series"][data-series="sold"]');
check("إعادة إظهار السلسلة", w.document.querySelectorAll(".line-path").length === 3);
const stageSeg = w.document.querySelector('[data-action="executive-chart"][data-filter="stage"]');
stageSeg.dispatchEvent(new w.Event("click", { bubbles: true, cancelable: true }));
check("النقر على شريحة المرحلة يفلتر أيضًا", w.document.querySelector('select[data-action="executive-filter"][data-filter="stage"]').value !== "all");
click(w, '[data-action="reset-executive-filters"]');
check("مسح الفلاتر يعيد كل شيء", w.document.querySelector('select[data-action="executive-filter"][data-filter="stage"]').value === "all" && w.document.querySelectorAll(".line-path").length === 3);

console.log("=== 20) تمبليت الأسابيع والاستيراد بربط الأعمدة ===");
{
  const { w: w7 } = boot();
  switchRole(w7, "admin");
  click(w7, 'nav [data-page="productMaster"]');
  click(w7, '[data-action="new-product"]');
  setValue(w7, '#dialog-content input[name="code"]', "P1");
  setValue(w7, '#dialog-content input[name="name"]', "دريم");
  setValue(w7, '#dialog-content input[name="unit"]', "كرتون");
  submitDialog(w7, "product-master-form");
  switchRole(w7, "sales");
  click(w7, '[data-action="new-forecast"]');
  change(w7, 'input[name="fromMonth"]', "2026-09");
  change(w7, 'input[name="toMonth"]', "2026-10");
  setValue(w7, 'input[name="fq_0_0"]', "90");
  setValue(w7, 'input[name="fq_0_1"]', "50");
  submitDialog(w7, "forecast-form");
  switchRole(w7, "production");
  click(w7, 'nav [data-page="forecasts"]');
  click(w7, '[data-action="forecast-production-review"]');
  setValue(w7, 'select[name="decision"]', "fix");
  submitDialog(w7, "production-review-form");
  click(w7, 'nav [data-page="weekly"]');
  click(w7, '[data-action="new-weekly-plan"]');
  click(w7, '[data-action="download-weekly-template"]');
  check("تمبليت الأسابيع يتولد من الأهداف", w7.document.getElementById("toast-region").textContent.includes("تمبليت الأسابيع"));
  const wcsv = "product_code,month,week_1,week_2,week_3,week_4\nP1,2026-09,40,30,10,10\nP1,46296,20,10,10,10\nZZ,2026-09,1,1,1,1";
  const wfile = new w7.File([wcsv], "weeks.csv", { type: "text/csv" });
  const winput = w7.document.querySelector('[data-action="import-weekly"]');
  Object.defineProperty(winput, "files", { value: [wfile] });
  winput.dispatchEvent(new w7.Event("change", { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  check("شاشة ربط أعمدة الأسابيع فتحت بتخمين تلقائي", !!w7.document.getElementById("weekly-map-form") && w7.document.querySelector('select[name="wmWeek_0"]').value === "week_1" && w7.document.querySelector('select[name="wmMonth"]').value === "month");
  submitDialog(w7, "weekly-map-form");
  check("العودة لجدول التقسيم معبأ من الملف", !!w7.document.getElementById("weekly-plan-form") && w7.document.querySelector('input[name="wpQty_0_0"]').value === "40");
  check("خلية شهر برقم Excel التسلسلي (46296=2026-10) طُوبقت", w7.document.querySelector('input[name="wpQty_1_0"]').value === "20");
  check("الصف غير المطابق تُجوهل مع الإبلاغ", w7.document.getElementById("toast-region").textContent.includes("تجاهل"));
  // مرونة الخطة: الشهر الثاني شهرية — كتلة واحدة تتجاوز التقسيم
  const granSel = [...w7.document.querySelectorAll('select[name^="wpGran_"]')];
  const octIdx = [...w7.document.querySelectorAll('input[name^="wpMonth_"]')].find(i => i.value === "2026-10").name.slice(8);
  setValue(w7, `select[name="wpGran_${octIdx}"]`, "monthly");
  submitDialog(w7, "weekly-plan-form");
  const st7 = getState(w7);
  check("إنشاء الخطط من التوزيع المستورد", st7.weeklyPlans.length === 2 && st7.weeklyPlans.find(p => p.month === "2026-09").weeks.map(x => x.qty).join(",") === "40,30,10,10");
  const monthlyPlan = st7.weeklyPlans.find(p => p.month === "2026-10");
  check("الشهرية كتلة واحدة تتجاوز التقسيم", monthlyPlan.granularity === "monthly" && monthlyPlan.weeks.length === 1 && monthlyPlan.weeks[0].qty === 50);
  // مراجعة المبيعات ثم اعتماد بالتحديد وحدة وحدة
  switchRole(w7, "sales");
  click(w7, 'nav [data-page="weekly"]');
  click(w7, '[data-action="review-weekly"]');
  submitDialog(w7, "weekly-review-form");
  switchRole(w7, "production");
  click(w7, 'nav [data-page="weekly"]');
  const sepPlanId = st7.weeklyPlans.find(p => p.month === "2026-09").id;
  click(w7, `[data-action="approve-units"][data-id="${sepPlanId}"]`);
  check("نافذة الاعتماد بالتحديد بوحدات محددة افتراضيًا", !!w7.document.getElementById("unit-approve-form") && w7.document.querySelectorAll('input[name^="uaUnit_"]:checked').length === 4);
  // ألغِ تحديد وحدتين واعتمد وحدتين فقط
  w7.document.querySelector('input[name="uaUnit_2"]').checked = false;
  w7.document.querySelector('input[name="uaUnit_3"]').checked = false;
  submitDialog(w7, "unit-approve-form");
  let sepPlan = getState(w7).weeklyPlans.find(p => p.id === sepPlanId);
  check("اعتماد جزئي: وحدتان فقط ولم تدخل التنفيذ", sepPlan.status === "awaiting_approvals" && !!(sepPlan.unitApprovals["W1"] && sepPlan.unitApprovals["W1"].production) && !(sepPlan.unitApprovals["W3"] && sepPlan.unitApprovals["W3"].production));
  click(w7, `[data-action="approve-weekly"][data-id="${sepPlanId}"]`);
  switchRole(w7, "fgWarehouse");
  click(w7, 'nav [data-page="weekly"]');
  click(w7, `[data-action="approve-weekly"][data-id="${sepPlanId}"]`);
  sepPlan = getState(w7).weeklyPlans.find(p => p.id === sepPlanId);
  check("اكتمال كل الوحدات من الطرفين = خطة معتمدة", sepPlan.status === "approved");
}

console.log("=== 21) مرفق الكوتيشن مع أمر الشراء ===");
{
  const seedQ = {
    schemaVersion: 18, role: "procurement", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true }],
    forecasts: [{ id: "FC-Q", version: "V1", months: ["2026-09"], startDate: "2026-09-01", endDate: "2026-09-28", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "2026-08-01 08:30" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-Q", forecastId: "FC-Q", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 200, monthlyQty: { "2026-09": 200 }, consumed: 0, needDate: "2026-09-01", onHand: 50, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], audit: [], permissions: null
  };
  const { w: w9 } = boot(seedQ);
  switchRole(w9, "procurement");
  click(w9, '[data-action="new-commitment"]');
  check("خانة إرفاق الكوتيشن موجودة", !!w9.document.querySelector('[data-action="quotation-file"]'));
  const qfile = new w9.File(["quotation body"], "quotation-sugar.pdf", { type: "application/pdf" });
  const qinput = w9.document.querySelector('[data-action="quotation-file"][data-row="0"]');
  Object.defineProperty(qinput, "files", { value: [qfile] });
  qinput.dispatchEvent(new w9.Event("change", { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  check("قراءة الملف وعرض اسمه", w9.document.getElementById("quotation-name-0").textContent === "quotation-sugar.pdf");
  setValue(w9, 'input[name="pcSupplier_0"]', "مورد السكر");
  setValue(w9, 'input[name="pcPo_0"]', "PO-Q1");
  setValue(w9, 'input[name="pcQty_0"]', "150");
  setValue(w9, 'input[name="pcOrder_0"]', "2026-08-22");
  setValue(w9, 'input[name="pcEta_0"]', "2026-08-30");
  submitDialog(w9, "commitment-form");
  const st9 = getState(w9);
  check("الكوتيشن مخزن مع الأوردر", st9.commitments.length === 1 && st9.commitments[0].quotation && st9.commitments[0].quotation.name === "quotation-sugar.pdf" && String(st9.commitments[0].quotation.dataUrl).startsWith("data:"));
  check("الأوردر بانتظار موافقة المالية", st9.commitments[0].financeApproval.status === "pending");
  switchRole(w9, "finance");
  click(w9, 'nav [data-page="finance"]');
  check("المالية ترى رابط الكوتيشن قبل قرارها", pageText(w9).includes("فتح الكوتيشن (quotation-sugar.pdf)"));
}

console.log("=== 22) استيراد جدول الاحتياجات من Excel مع Data Mapping ===");
{
  switchRole(w, "production");
  click(w, 'nav [data-page="materials"]');
  click(w, '[data-action="new-material"]');
  check("جدول المنتجات المرجعي داخل نافذة الاحتياجات", dialogText(w).includes("منتجات المستند وكمياتها الشهرية") && dialogText(w).includes("إجمالي كل المنتجات") && dialogText(w).includes("P1") && dialogText(w).includes("P2"));
  check("أدوات الاستيراد داخل نافذة الاحتياجات", dialogText(w).includes("استيراد الاحتياجات من Excel") && !!w.document.querySelector('[data-action="download-material-template"]') && !!w.document.querySelector('input[data-action="import-material"]'));
  const mmForecastId = getState(w).forecasts[0].id;
  const mmCsv = "document,material_code,2026-09\n" + mmForecastId + ",RM1,999\nBAD-DOC,RM1,5\n" + mmForecastId + ",RM-XX,7\n";
  const mmFile = new w.File([mmCsv], "requirements.csv", { type: "text/csv" });
  const mmInput = w.document.querySelector('input[data-action="import-material"]');
  Object.defineProperty(mmInput, "files", { value: [mmFile] });
  mmInput.dispatchEvent(new w.Event("change", { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  check("شاشة ربط أعمدة الاحتياجات تفتح", !!w.document.getElementById("material-map-form") && dialogText(w).includes("عمود كود المادة"));
  check("التخمين التلقائي التقط المادة والمستند", w.document.querySelector('select[name="mmMaterial"]').value === "material_code" && w.document.querySelector('select[name="mmDocument"]').value === "document");
  submitDialog(w, "material-map-form");
  check("التعبئة أعادت فتح جدول الاحتياجات", !!w.document.getElementById("material-form"));
  const mmMonths = getState(w).forecasts[0].months;
  const mmMonthIdx = mmMonths.indexOf("2026-09");
  check("قيمة RM1 لشهر أيلول عُبّئت للمراجعة", w.document.querySelector(`input[name="mrQty_0_0_${mmMonthIdx}"]`).value === "999");

  // v48: ملفات ERP تكتب أعمدة الأشهر 10_2027 لا 2026-10؛ كانت تصل بكل الأشهر على "تجاهل".
  const erpMonths = getState(w).forecasts[0].months;
  const erpHeaders = erpMonths.map(m => m.slice(5, 7) + "_" + (Number(m.slice(0, 4)) + 1));
  const erpCsv = "document,material_code," + erpHeaders.join(",") + "\n"
    + mmForecastId + ",RM1," + erpMonths.map((m, i) => 100 + i).join(",") + "\n";
  const erpFile = new w.File([erpCsv], "erp-requirements.csv", { type: "text/csv" });
  const erpInput = w.document.querySelector('input[data-action="import-material"]');
  Object.defineProperty(erpInput, "files", { value: [erpFile] });
  erpInput.dispatchEvent(new w.Event("change", { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  check("شاشة الربط فتحت لملف بصيغة MM_YYYY", !!w.document.getElementById("material-map-form"));
  const erpSelects = [...w.document.querySelectorAll('select[name^="mmMonth_"]')];
  check("كل أشهر المستند طوبقت تلقائيًا بدل التجاهل", erpSelects.length === erpMonths.length && erpSelects.every(sel => sel.value));
  check("كل شهر أخذ عمود شهره هو", erpSelects.every((sel, i) => sel.value === erpHeaders[i]));
  check("لا عمود مكرر بين شهرين", new Set(erpSelects.map(s => s.value)).size === erpSelects.length);
  check("فارق السنة يُعلَن للمستخدم لا يُخفى", dialogText(w).includes("سنة أعمدة الملف تختلف"));
  check("لم تعد رسالة «لا تطابق تمبليت الاحتياجات» تظهر", !dialogText(w).includes("لا تطابق تمبليت الاحتياجات"));
  submitDialog(w, "material-map-form");
  check("التعبئة من ملف ERP وصلت لجدول الاحتياجات", w.document.querySelector(`input[name="mrQty_0_0_0"]`).value === "100");
  click(w, '[data-action="close-dialog"]');
  if (w.document.querySelector('[data-action="close-dialog"]')) click(w, '[data-action="close-dialog"]');

  console.log("=== 23) حذف التعريفات مع حماية السجلات المرتبطة ===");
  switchRole(w, "admin");
  click(w, 'nav [data-page="productMaster"]');
  click(w, '[data-action="delete-master"][data-kind="product"][data-code="P1"]');
  check("منع حذف منتج مرتبط بسجلات", getState(w).products.some(p => p.code === "P1"));
  addMaster(w, "product", "P9", "منتج مؤقت", "كرتون");
  check("أُضيف منتج مؤقت", getState(w).products.some(p => p.code === "P9"));
  click(w, '[data-action="delete-master"][data-kind="product"][data-code="P9"]');
  check("حذف منتج غير مرتبط يعمل", !getState(w).products.some(p => p.code === "P9"));
  click(w, 'nav [data-page="materialMaster"]');
  check("زر الحذف موجود في تعريف المواد", !!w.document.querySelector('[data-action="delete-master"][data-kind="material"]'));
  click(w, '[data-action="delete-master"][data-kind="material"][data-code="RM1"]');
  check("منع حذف مادة مرتبطة بسجلات", getState(w).rawMaterials.some(m => m.code === "RM1"));

  console.log("=== 24) التفاصيل الموسعة للمواد + وصفة الباكينغ والحساب التلقائي ===");
  check("أعمدة النوع والمورد والتخزين في تعريف المواد", pageText(w).includes("النوع") && pageText(w).includes("المورد") && pageText(w).includes("التخزين"));
  check("زر قالب المواد المولّد بكل الأعمدة", !!w.document.querySelector('[data-action="download-master-template"][data-kind="materials"]'));
  click(w, '[data-action="download-master-template"][data-kind="materials"]');
  check("تنزيل قالب المواد يذكر التفاصيل الموسعة", w.document.getElementById("toast-region").textContent.includes("17 عمودًا") && w.document.getElementById("toast-region").textContent.includes("التفاصيل الموسعة"));
  click(w, '[data-action="edit-raw-material"][data-code="RM2"]');
  check("نافذة التعديل فيها التفاصيل الموسعة", !!w.document.querySelector('select[name="rmCategory"]') && !!w.document.querySelector('input[name="rmSupplier"]'));
  setValue(w, 'select[name="rmCategory"]', "packing");
  setValue(w, 'input[name="rmPackType"]', "كوب");
  setValue(w, 'input[name="rmPackSize"]', "500ml");
  setValue(w, 'input[name="rmPiecesPerCarton"]', "24");
  setValue(w, 'input[name="rmSupplier"]', "مورد العبوات");
  setValue(w, 'select[name="rmStorage"]', "dry");
  submitDialog(w, "raw-material-edit-form");
  st = getState(w);
  const rm2 = st.rawMaterials.find(m => m.code === "RM2");
  check("حفظ التفاصيل الموسعة", rm2.category === "packing" && rm2.packType === "كوب" && rm2.piecesPerCarton === 24 && rm2.supplier === "مورد العبوات" && rm2.storage === "dry");
  check("النوع يظهر في الجدول", pageText(w).includes("باكينغ وتغليف") && pageText(w).includes("24 قطعة/كرتون"));
  click(w, 'nav [data-page="productMaster"]');
  check("زر وصفة الباكينغ في تعريف المنتجات", !!w.document.querySelector('[data-action="packing-bom"][data-code="P1"]'));
  check("قالب التعريفات مولّد لا ملفًا ثابتًا", !!w.document.querySelector('[data-action="download-master-template"][data-kind="products"]') && !w.document.querySelector('a[href$="products-import-template.xlsx"]'));
  click(w, '[data-action="packing-bom"][data-code="P1"]');
  check("نافذة الوصفة تعرض مواد الباكينغ فقط", !!w.document.getElementById("packing-bom-form") && dialogText(w).includes("RM2") && !dialogText(w).includes("RM1"));
  setValue(w, 'input[name="pbQty_0"]', "2");
  submitDialog(w, "packing-bom-form");
  st = getState(w);
  check("حفظ وصفة الباكينغ", st.products.find(p => p.code === "P1").packingBom.length === 1 && st.products.find(p => p.code === "P1").packingBom[0].qtyPerUnit === 2);
  switchRole(w, "production");
  click(w, 'nav [data-page="materials"]');
  click(w, '[data-action="new-material"]');
  check("زر حساب الباكينغ داخل نافذة الاحتياجات", !!w.document.querySelector('[data-action="apply-packing-bom-calc"]'));
  click(w, '[data-action="apply-packing-bom-calc"]');
  check("الجدول أعيد فتحه بعد الحساب", !!w.document.getElementById("material-form"));
  const bomMonths = getState(w).forecasts[0].months;
  const bomSepIdx = bomMonths.indexOf("2026-09");
  const bomOctIdx = bomMonths.indexOf("2026-10");
  check("كمية الباكينغ حُسبت من الوصفة (أيلول: 90×2=180)", w.document.querySelector(`input[name="mrQty_0_1_${bomSepIdx}"]`).value === "180");
  check("كمية الباكينغ حُسبت من الوصفة (تشرين الأول: 50×2=100)", w.document.querySelector(`input[name="mrQty_0_1_${bomOctIdx}"]`).value === "100");
  click(w, '[data-action="close-dialog"]');
  if (w.document.querySelector('[data-action="close-dialog"]')) click(w, '[data-action="close-dialog"]');

  console.log("=== 10و) توالف المواد والباكينغ ===");
  switchRole(w, "rmWarehouse");
  click(w, 'nav [data-page="rmStock"]');
  const wasteBefore = getState(w).materials.find(m => m.materialCode === "RM1").onHand;
  check("زر تسجيل التوالف لمخزن المواد", !!w.document.querySelector('[data-action="new-waste"]') && pageText(w).includes("توالف المواد"));
  click(w, '[data-action="new-waste"]');
  check("نافذة التوالف جدول واحد بكل المواد المؤكدة", !!w.document.getElementById("waste-form") && dialogText(w).includes("كمية التوالف") && dialogText(w).includes("الرصيد الحالي"));
  const wsIdx = hiddenIndex(w, "wsCode_", "RM1");
  setValue(w, `input[name="wsQty_${wsIdx}"]`, "999999");
  submitDialog(w, "waste-form");
  check("منع توالف تتجاوز الرصيد", dialogText(w).includes("تتجاوز الرصيد"));
  setValue(w, `input[name="wsQty_${wsIdx}"]`, "30");
  setValue(w, `select[name="wsReason_${wsIdx}"]`, "damage");
  setValue(w, `input[name="wsNote_${wsIdx}"]`, "كيس ممزق");
  submitDialog(w, "waste-form");
  st = getState(w);
  check("سجل التوالف حُفظ بسببه", st.wasteRecords.length === 1 && st.wasteRecords[0].materialCode === "RM1" && st.wasteRecords[0].qty === 30 && st.wasteRecords[0].reason === "damage");
  check("التوالف خُصمت من الرصيد الفيزيائي", st.materials.find(m => m.materialCode === "RM1").onHand === wasteBefore - 30);
  check("حركة توالف مسجلة", st.materialMoves.some(mv => mv.type === "waste" && mv.materialCode === "RM1" && mv.qty === 30));
  check("عمود التوالف في جدول المخزون", pageText(w).includes("التوالف") && pageText(w).includes("كيس ممزق"));
  switchRole(w, "production");
  click(w, 'nav [data-page="reports"]');
  check("تقرير التوالف ضمن التقارير", pageText(w).includes("تقرير التوالف") && pageText(w).includes("كيس ممزق") && pageText(w).includes("تلف"));
  click(w, '[data-action="export-report"][data-report="waste"]');
  check("تصدير تقرير التوالف", w.document.getElementById("toast-region").textContent.includes("صُدّر تقرير التوالف"));
  switchRole(w, "sales");
  click(w, 'nav [data-page="reports"]');
  check("المبيعات لا ترى تقرير التوالف", !pageText(w).includes("تقرير التوالف"));
  switchRole(w, "executive");
  click(w, 'nav [data-page="executive"]');
  check("مؤشر التوالف في داشبورد الإدارة", pageText(w).includes("توالف المواد"));
  switchRole(w, "production");
  click(w, 'nav [data-page="monthly"]');
  check("التوالف تظهر في حركة المواد الشهرية", pageText(w).includes("توالف:"));
}

  console.log("=== 25) أوردرات الوكلاء ومصادر الطلب ===");
  switchRole(w, "admin");
  click(w, 'nav [data-page="agentMaster"]');
  check("صفحة تعريف الوكلاء", pageText(w).includes("دليل الوكلاء"));
  click(w, '[data-action="new-agent"]');
  setValue(w, 'input[name="agCode"]', "AG-1");
  setValue(w, 'input[name="agName"]', "وكيل بغداد");
  setValue(w, 'input[name="agRegion"]', "بغداد");
  submitDialog(w, "agent-form");
  click(w, '[data-action="new-agent"]');
  setValue(w, 'input[name="agCode"]', "AG-2");
  setValue(w, 'input[name="agName"]', "وكيل البصرة");
  setValue(w, 'input[name="agRegion"]', "البصرة");
  submitDialog(w, "agent-form");
  st = getState(w);
  check("أُضيف وكيلان", st.agents.length === 2 && st.agents[0].region === "بغداد");
  switchRole(w, "sales");
  click(w, 'nav [data-page="agentOrders"]');
  check("صفحة أوردرات الوكلاء للمبيعات", pageText(w).includes("الطلب المجمّع من الوكلاء") && !!w.document.querySelector('[data-action="new-agent-order"]'));
  click(w, '[data-action="new-agent-order"]');
  check("نافذة الأوردر جدول منتجات كامل", !!w.document.getElementById("agent-order-form") && !!w.document.querySelector('input[name="aoQty_0"]'));
  setValue(w, 'select[name="aoAgent"]', "AG-1");
  setValue(w, 'input[name="aoMonth"]', "2026-12");
  setValue(w, 'input[name="aoQty_0"]', "120");
  setValue(w, 'input[name="aoPrice_0"]', "10");
  submitDialog(w, "agent-order-form");
  st = getState(w);
  check("سُجّل أوردر الوكيل بتفاصيله", st.agentOrders.length === 1 && st.agentOrders[0].agentCode === "AG-1" && st.agentOrders[0].lines[0].qty === 120 && st.agentOrders[0].lines[0].price === 10);
  click(w, '[data-action="new-agent-order"]');
  setValue(w, 'select[name="aoAgent"]', "AG-2");
  setValue(w, 'input[name="aoMonth"]', "2026-12");
  setValue(w, 'input[name="aoQty_0"]', "80");
  submitDialog(w, "agent-order-form");
  check("الطلب المجمّع يجمع الوكيلين (200)", pageText(w).includes("200"));
  check("شارة غير مغطى تظهر قبل التثبيت", pageText(w).includes("غير مغطى"));
  click(w, '[data-action="build-forecast-from-demand"]');
  check("نافذة مصادر الطلب تفتح", !!w.document.getElementById("demand-composer-form") && dialogText(w).includes("طلب الوكلاء") && dialogText(w).includes("مبيعات مباشرة"));
  const dcRowIdx = (() => {
    const inputs = [...w.document.querySelectorAll('input[type="hidden"][name^="dcMonth_"]')];
    const hit = inputs.find(i => i.value === "2026-12");
    return hit ? hit.name.replace("dcMonth_", "") : "";
  })();
  check("صف كانون الأول موجود في المقترح", dcRowIdx !== "");
  setValue(w, `input[name="dcDirect_${dcRowIdx}"]`, "50");
  setValue(w, `input[name="dcAdjust_${dcRowIdx}"]`, "10");
  setValue(w, 'input[name="dcGrowth"]', "10");
  submitDialog(w, "demand-composer-form");
  check("المقترح عبّأ جدول Forecast", !!w.document.getElementById("forecast-form"));
  const fcCell = [...w.document.querySelectorAll('#forecast-form input[name^="fq_"]')].map(i => i.value).filter(v => v === "266");
  check("الإجمالي = 200 وكلاء + (50 مباشر + 10 تعديل) × 1.10 = 266", fcCell.length === 1);
  click(w, '[data-action="close-dialog"]');
  if (w.document.querySelector('[data-action="close-dialog"]')) click(w, '[data-action="close-dialog"]');
  click(w, 'nav [data-page="reports"]');
  check("تقريرا الوكلاء ضمن التقارير", pageText(w).includes("تقرير أوردرات الوكلاء") && pageText(w).includes("تقرير تغطية طلب الوكلاء"));
  click(w, '[data-action="export-report"][data-report="agentOrders"]');
  check("تصدير تقرير أوردرات الوكلاء", w.document.getElementById("toast-region").textContent.includes("صُدّر تقرير أوردرات الوكلاء"));
  switchRole(w, "executive");
  click(w, 'nav [data-page="executive"]');
  check("مؤشر طلب الوكلاء في الداشبورد", pageText(w).includes("طلب الوكلاء"));

console.log("=== 26) إصلاحات v42: سلامة البيانات والحساب ===");
{
  // أ) عنصر تالف واحد لا يمحو قاعدة البيانات
  const corruptSeed = {
    schemaVersion: 22, role: "admin", page: "home", loggedIn: true, guideSeen: true,
    products: [null, { code: "P1", name: "منتج", unit: "كرتون", active: true }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true }],
    forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [],
    issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wC } = boot(corruptSeed);
  switchRole(wC, "admin");
  const stC = getState(wC);
  check("عنصر تالف يُنقّى ولا يمحو البيانات", stC.products.length === 1 && stC.products[0].code === "P1" && stC.rawMaterials.length === 1);

  // ب) كود مادة بحالة أحرف مختلفة لا يكسر شاشة المخزون
  const caseSeed = JSON.parse(JSON.stringify(corruptSeed));
  caseSeed.products = [{ code: "P1", name: "منتج", unit: "كرتون", active: true }];
  caseSeed.role = "rmWarehouse";
  caseSeed.forecasts = [{ id: "FC-C", version: "V1", months: ["2026-09"], startDate: "2026-09-01", endDate: "2026-09-30", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }];
  caseSeed.materials = [{ id: "MR-C", forecastId: "FC-C", productCode: "", materialCode: "rm1", material: "سكر", unit: "كغم", required: 100, monthlyQty: { "2026-09": 100 }, consumed: 0, needDate: "2026-09-01", onHand: 40, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }];
  const { w: wK } = boot(caseSeed);
  switchRole(wK, "rmWarehouse");
  check("كود المادة يُطبَّع في الترحيل", getState(wK).materials[0].materialCode === "RM1");
  click(wK, 'nav [data-page="rmStock"]');
  check("شاشة مخزون المواد ترسم بلا انهيار", pageText(wK).includes("RM1") && pageText(wK).includes("سكر"));

  // ج) حقول رقمية مفقودة تُطبَّع بدل أن تُنتج NaN تُعرض «0»
  const nanSeed = JSON.parse(JSON.stringify(caseSeed));
  nanSeed.role = "fgWarehouse";
  nanSeed.actuals = [{ id: "AC-N", forecastId: "FC-C", productCode: "P1", month: "2026-09", planned: 100, actual: 100, date: "2026-09-15" }];
  nanSeed.fgReceipts = [{ id: "FG-N", actualId: "AC-N", productCode: "P1", product: "منتج", unit: "كرتون", produced: 100, received: 100, status: "confirmed" }];
  const { w: wN } = boot(nanSeed);
  switchRole(wN, "fgWarehouse");
  const fgN = getState(wN).fgReceipts[0];
  check("حقول FG المفقودة تُطبَّع إلى صفر", fgN.reserved === 0 && fgN.blocked === 0);
  switchRole(wN, "sales");
  click(wN, 'nav [data-page="fgView"]');
  check("المنتج يبقى متاحًا للبيع بلا NaN", pageText(wN).includes("100") && !pageText(wN).includes("NaN"));
}

console.log("=== 27) إصلاحات v42: وحدة الشراء ومدة التوريد والحد الأدنى ===");
{
  const buySeed = {
    schemaVersion: 22, role: "procurement", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw", purchaseUnit: "كيس 25 كغم", conversionFactor: 25, moq: 0, leadTimeDays: 60 }],
    forecasts: [{ id: "FC-B", version: "V1", months: ["2026-12"], startDate: "2026-12-01", endDate: "2026-12-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-12": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-B", forecastId: "FC-B", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 5000, monthlyQty: { "2026-12": 5000 }, consumed: 0, needDate: "2026-12-01", onHand: 0, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wB } = boot(buySeed);
  switchRole(wB, "procurement");
  click(wB, '[data-action="new-commitment"]');
  check("كمية الشراء بوحدة الشراء لا الاستهلاك (5000 كغم ÷ 25 = 200 كيس)", wB.document.querySelector('input[name="pcQty_0"]').value === "200");
  check("وحدة الشراء معروضة في الصف", dialogText(wB).includes("كيس 25 كغم"));
  check("آخر موعد للأوردر محسوب من مدة التوريد", dialogText(wB).includes("آخر موعد للأوردر") && dialogText(wB).includes("2026-10-02"));
  setValue(wB, 'input[name="pcSupplier_0"]', "مورد السكر");
  setValue(wB, 'input[name="pcPo_0"]', "PO-1");
  setValue(wB, 'input[name="pcOrder_0"]', "2026-09-01");
  setValue(wB, 'input[name="pcEta_0"]', "2026-11-01");
  submitDialog(wB, "commitment-form");
  const cmB = getState(wB).commitments[0];
  check("الالتزام يحفظ الكميتين: 200 كيس = 5000 كغم", cmB && cmB.orderQty === 200 && cmB.qty === 5000 && cmB.conversionFactor === 25);
  check("الوارد المتوقع يُقيَّد بوحدة الاستهلاك", getState(wB).materials[0].inbound === 5000);

  // الحد الأدنى للمورد يرفع الكمية
  const moqSeed = JSON.parse(JSON.stringify(buySeed));
  moqSeed.rawMaterials[0].conversionFactor = 1;
  moqSeed.rawMaterials[0].purchaseUnit = "";
  moqSeed.rawMaterials[0].moq = 8000;
  const { w: wM } = boot(moqSeed);
  switchRole(wM, "procurement");
  click(wM, '[data-action="new-commitment"]');
  check("الكمية تُرفع إلى الحد الأدنى للمورد", wM.document.querySelector('input[name="pcQty_0"]').value === "8000" && dialogText(wM).includes("الحد الأدنى للمورد"));

  // وصول متوقع بعد تاريخ الحاجة = مشكلة مسجلة
  const lateSeed = JSON.parse(JSON.stringify(buySeed));
  const { w: wL } = boot(lateSeed);
  switchRole(wL, "procurement");
  click(wL, '[data-action="new-commitment"]');
  setValue(wL, 'input[name="pcSupplier_0"]', "مورد");
  setValue(wL, 'input[name="pcPo_0"]', "PO-2");
  setValue(wL, 'input[name="pcOrder_0"]', "2026-09-01");
  setValue(wL, 'input[name="pcEta_0"]', "2027-01-15");
  submitDialog(wL, "commitment-form");
  check("وصول بعد تاريخ الحاجة يُسجَّل كمشكلة", getState(wL).issues.some(i => i.title === "وصول متوقع بعد تاريخ الحاجة"));
}

console.log("=== 28) إصلاحات v42: السحب بالوصفة وتقييده بالمتاح ===");
{
  const bomSeed = {
    schemaVersion: 22, role: "production", page: "home", loggedIn: true, guideSeen: true,
    products: [
      { code: "P1", name: "منتج بالأكواب", unit: "كرتون", active: true, packingBom: [{ materialCode: "PK1", qtyPerUnit: 1 }] },
      { code: "P2", name: "منتج سائب", unit: "كرتون", active: true, packingBom: [] }
    ],
    rawMaterials: [{ code: "PK1", name: "كوب 500ml", unit: "قطعة", active: true, category: "packing", piecesPerCarton: 24 }],
    forecasts: [{ id: "FC-M", version: "V1", months: ["2026-09"], startDate: "2026-09-01", endDate: "2026-09-30", frequency: "monthly", priority: "عادية", note: "", items: [
      { productCode: "P1", productName: "منتج بالأكواب", unit: "كرتون", qty: 1000, monthlyQty: { "2026-09": 1000 }, note: "" },
      { productCode: "P2", productName: "منتج سائب", unit: "كرتون", qty: 1000, monthlyQty: { "2026-09": 1000 }, note: "" }
    ], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [{ id: "WP-M", forecastId: "FC-M", productCode: "P2", productName: "منتج سائب", unit: "كرتون", month: "2026-09", granularity: "monthly", weeks: [{ label: "الشهر", start: "2026-09-01", end: "2026-09-30", qty: 1000, days: {} }], status: "approved", approvedAt: "2026-08-05 09:00", unitApprovals: {}, approvals: {}, history: [] }],
    salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-M", forecastId: "FC-M", productCode: "", materialCode: "PK1", material: "كوب 500ml", unit: "قطعة", required: 1000, monthlyQty: { "2026-09": 1000 }, consumed: 0, needDate: "2026-09-01", onHand: 1000, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "available", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wBom } = boot(bomSeed);
  switchRole(wBom, "production");
  click(wBom, 'nav [data-page="execution"]');
  click(wBom, '[data-action="new-actual"]');
  const p2Idx = (() => {
    const inputs = [...wBom.document.querySelectorAll('input[type="hidden"][name^="paProduct_"]')];
    const hit = inputs.find(i => i.value === "P2");
    return hit ? hit.name.replace("paProduct_", "") : "";
  })();
  check("صف الإنتاج للمنتج السائب موجود", p2Idx !== "");
  setValue(wBom, `input[name="paQty_${p2Idx}"]`, "1000");
  setValue(wBom, `input[name="paBatch_${p2Idx}"]`, "B-9");
  setValue(wBom, `input[name="paDate_${p2Idx}"]`, "2026-09-20");
  submitDialog(wBom, "actual-form");
  const stBom = getState(wBom);
  check("منتج بلا وصفة لا يسحب مادة تخص غيره", stBom.materials[0].consumed === 0 && stBom.materials[0].onHand === 1000);
  check("لا حركة سحب كاذبة", !stBom.materialMoves.some(m => m.type === "withdraw"));
}

console.log("=== 29) إصلاحات v42: منع تجاوز الرصيد وتعارض التغطية ===");
{
  const shortSeed = {
    schemaVersion: 22, role: "production", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw" }],
    forecasts: [{ id: "FC-S", version: "V1", months: ["2026-09"], startDate: "2026-09-01", endDate: "2026-09-30", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [{ id: "WP-S", forecastId: "FC-S", productCode: "P1", productName: "منتج", unit: "كرتون", month: "2026-09", granularity: "monthly", weeks: [{ label: "الشهر", start: "2026-09-01", end: "2026-09-30", qty: 100, days: {} }], status: "approved", approvedAt: "2026-08-05 09:00", unitApprovals: {}, approvals: {}, history: [] }],
    salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-S", forecastId: "FC-S", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 100, monthlyQty: { "2026-09": 100 }, consumed: 0, needDate: "2026-09-01", onHand: 120, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "available", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wS } = boot(shortSeed);
  switchRole(wS, "production");
  click(wS, 'nav [data-page="execution"]');
  click(wS, '[data-action="new-actual"]');
  setValue(wS, 'input[name="paQty_0"]', "100");
  setValue(wS, 'input[name="paBatch_0"]', "B-1");
  setValue(wS, 'input[name="paDate_0"]', "2026-09-20");
  submitDialog(wS, "actual-form");
  const stS = getState(wS);
  // الدفاتر متوازنة: ما زاد في «المستهلك» يساوي تمامًا ما نقص من الرصيد — القصّ الصامت عند الصفر كان يكسر هذه المعادلة.
  check("المستهلك يساوي المخصوم من الرصيد", stS.materials[0].consumed === 100 && stS.materials[0].onHand === 20 && (120 - stS.materials[0].onHand) === stS.materials[0].consumed);
  check("حركة السحب مطابقة للمستهلك", stS.materialMoves.filter(m => m.type === "withdraw").reduce((sum, m) => sum + m.qty, 0) === stS.materials[0].consumed);
  check("لا عجز مسجَّل عندما يغطي الرصيد التشغيل", !stS.issues.some(i => i.title === "عجز مادة عند تسجيل الإنتاج"));

  // تعارض التغطية: مستند ثانٍ يغطي نفس المنتج والشهر
  const dupSeed = JSON.parse(JSON.stringify(shortSeed));
  dupSeed.role = "production";
  dupSeed.weeklyPlans = [];
  dupSeed.forecasts.push({ id: "FC-S2", version: "V1", months: ["2026-09"], startDate: "2026-09-01", endDate: "2026-09-30", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" }], status: "production_feedback", productionFeedbackAt: "2026-08-03 09:00", submittedAt: "2026-08-02 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false });
  dupSeed.role = "sales";
  const { w: wD } = boot(dupSeed);
  switchRole(wD, "sales");
  click(wD, 'nav [data-page="forecasts"]');
  click(wD, '[data-action="review-forecast-feedback"][data-id="FC-S2"]');
  click(wD, '[data-action="accept-production-feedback"][data-id="FC-S2"]');
  check("رفض تثبيت مستند يغطي منتجًا وشهرًا مغطى أصلًا", getState(wD).forecasts.find(f => f.id === "FC-S2").status === "production_feedback");
  check("رسالة التعارض تسمي المستند الآخر", wD.document.getElementById("toast-region").textContent.includes("FC-S"));
}

console.log("=== 30) إصلاحات v42: الطلب المتبقي ومتوسط المبيعات المباشرة ===");
{
  const demandSeed = {
    schemaVersion: 22, role: "sales", page: "home", loggedIn: true, guideSeen: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [], forecasts: [], weeklyPlans: [],
    salesRecords: [{ id: "SL-1", productCode: "P1", product: "منتج", unit: "كرتون", qty: 300, date: "2026-09-10", channel: "agent", agentOrderId: "AO-1", agentCode: "AG1", note: "", recordedAt: "2026-09-10 10:00" }],
    materialMoves: [], plans: [], materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [],
    issues: [], downtime: [], financeChecks: [], wasteRecords: [],
    agents: [{ code: "AG1", name: "وكيل", region: "", contact: "", phone: "", active: true, note: "" }],
    agentOrders: [{ id: "AO-1", agentCode: "AG1", orderDate: "2026-09-01", month: "2026-12", note: "", status: "confirmed", lines: [{ productCode: "P1", qty: 1000, price: null, month: "2026-12", note: "" }] }],
    audit: [], permissions: null
  };
  const { w: wDem } = boot(demandSeed);
  switchRole(wDem, "sales");
  click(wDem, 'nav [data-page="agentOrders"]');
  click(wDem, '[data-action="build-forecast-from-demand"]');
  const demRow = (() => {
    const inputs = [...wDem.document.querySelectorAll('input[type="hidden"][name^="dcMonth_"]')];
    const hit = inputs.find(i => i.value === "2026-12");
    return hit ? hit.name.replace("dcMonth_", "") : "";
  })();
  check("صف كانون الأول في المحرّر", demRow !== "");
  check("الطلب المعروض = 1000 − 300 مُسلَّمة = 700", dialogText(wDem).includes("700"));
  check("مؤشر الثقة يظهر مع المقترح المباشر", dialogText(wDem).includes("متوسط") || dialogText(wDem).includes("لا تاريخ مبيعات مباشرة"));
  check("البيع على أوردر وكيل لا يدخل المقترح المباشر", wDem.document.querySelector(`input[name="dcDirect_${demRow}"]`).value === "");
  setValue(wDem, `input[name="dcDirect_${demRow}"]`, "100");
  setValue(wDem, 'input[name="dcGrowth"]', "10");
  submitDialog(wDem, "demand-composer-form");
  const demCells = [...wDem.document.querySelectorAll('#forecast-form input[name^="fq_"]')].map(i => i.value).filter(v => v === "810");
  check("الهامش على الجزء التقديري فقط: 700 + 100×1.10 = 810", demCells.length === 1);
  const demMonths = [...wDem.document.querySelectorAll('#forecast-form input[name^="fq_"]')].length;
  check("شبكة الأشهر متصلة فيقبلها الحفظ", demMonths >= 1);
}

console.log("=== 31) إصلاحات v43: الحارس المركزي وفصل المهام ===");
{
  const guardSeed = {
    schemaVersion: 22, role: "sales", page: "home", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw", supplier: "مورد السكر", approxPrice: 900 }],
    forecasts: [{ id: "FC-G", version: "V1", months: ["2026-12"], startDate: "2026-12-01", endDate: "2026-12-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-12": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-G", forecastId: "FC-G", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 500, monthlyQty: { "2026-12": 500 }, consumed: 0, needDate: "2026-12-01", onHand: 100, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [],
    issues: [{ id: "IS-G", title: "نقص مادة", severity: "high", visibility: "commercial", department: "الإنتاج", source: "FC-G", impact: "نقص مادة السكر 4 طن يوقف الخط", action: "اطلب مادة السكر فورًا", owner: "الإنتاج", due: "2026-09-01", status: "open", createdAt: "2026-08-10 09:00" }],
    downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wG } = boot(guardSeed);

  // أ) الحارس المركزي: المبيعات لا تنفّذ عملية المشتريات ولو وصلت إلى الإجراء
  switchRole(wG, "sales");
  check("زر التزام الشراء غير معروض للمبيعات", !wG.document.querySelector('[data-action="new-commitment"]'));
  forceAction(wG, "new-commitment");
  check("الحارس المركزي يرفض العملية حتى بنقر مُلفَّق", wG.document.getElementById("toast-region").textContent.includes("صلاحية") && !wG.document.getElementById("commitment-form"));
  forceAction(wG, "reset");
  check("المبيعات لا تستطيع مسح البيانات", getState(wG).forecasts.length === 1);

  // ب) المالية ترى شاشة المشتريات للاطلاع بلا أزرار تنفيذ
  switchRole(wG, "finance");
  click(wG, 'nav [data-page="procurement"]');
  check("المالية بلا زر إنشاء التزام", !wG.document.querySelector('[data-action="new-commitment"]'));
  check("المالية بلا زر تأكيد الأوردر", !wG.document.querySelector('[data-action="advance-commitment"]'));

  // ج) مخزن المواد لا يعدّل احتياجات الإنتاج
  switchRole(wG, "rmWarehouse");
  click(wG, 'nav [data-page="materials"]');
  check("مخزن المواد بلا زر جدول الاحتياجات", !wG.document.querySelector('[data-action="new-material"]'));

  // د) بطاقة الخطوة التالية لا تسرّب خطوات المواد للمبيعات
  switchRole(wG, "sales");
  click(wG, 'nav [data-page="home"]');
  const journeyRoles = [...wG.document.querySelectorAll('[data-action="go-step"]')].map(b => b.getAttribute("data-role"));
  check("خطوات بطاقة الرحلة كلها ضمن دور المبيعات", journeyRoles.every(r => r === "sales"));

  // هـ) تنقيح نص القضايا يشمل نافذة التفاصيل
  click(wG, 'nav [data-page="issues"]');
  click(wG, '[data-action="view-issue"][data-id="IS-G"]');
  check("نص القضية منقّح في نافذة التفاصيل أيضًا", !dialogText(wG).includes("السكر") && dialogText(wG).includes("عامل تشغيلي"));
  click(wG, '[data-action="close-dialog"]');

  // و) سجل التدقيق يكتب الدور الفاعل لا اسمًا ثابتًا
  switchRole(wG, "rmWarehouse");
  click(wG, 'nav [data-page="rmStock"]');
  click(wG, '[data-action="confirm-stock"]');
  const stkIdx = hiddenIndex(wG, "stockCode_", "RM1");
  setValue(wG, `input[name="stockOnHand_${stkIdx}"]`, "120");
  wG.document.querySelector(`input[name="stockConfirm_${stkIdx}"]`).checked = true;
  submitDialog(wG, "stock-form");
  check("سجل التدقيق ينسب العملية لمخزن المواد", getState(wG).audit.some(a => a.actor === "مخزن المواد الأولية"));
}

console.log("=== 32) إصلاحات v43: وضع العرض التجريبي وأزرار الشريط ===");
{
  const demoSeed = {
    schemaVersion: 22, role: "admin", page: "admin", loggedIn: true, guideSeen: true, demoMode: true,
    products: [], rawMaterials: [], forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [],
    financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wDm } = boot(demoSeed);
  switchRole(wDm, "admin");
  click(wDm, 'nav [data-page="admin"]');
  check("بطاقة وضع العرض التجريبي في لوحة التحكم", pageText(wDm).includes("وضع العرض التجريبي"));
  check("مبدّل الدور ظاهر في وضع العرض", !!wDm.document.getElementById("role-switch"));
  check("زر بدء جديد ظاهر للأدمن", !!wDm.document.querySelector('[data-action="reset"]'));
  switchRole(wDm, "sales");
  check("زر بدء جديد محجوب عن غير الأدمن", !wDm.document.querySelector('[data-action="reset"]'));
  check("مبدّل الدور متاح لغير الأدمن ما دام وضع العرض مفعّلًا", !!wDm.document.getElementById("role-switch"));
  switchRole(wDm, "admin");
  click(wDm, 'nav [data-page="admin"]');
  click(wDm, '[data-action="toggle-demo-mode"]');
  check("إطفاء وضع العرض يُحفظ", getState(wDm).demoMode === false);
  check("مبدّل الدور يبقى للأدمن بعد الإطفاء", !!wDm.document.getElementById("role-switch"));

  // «بدء جديد» يحتفظ بالمستخدمين والصلاحيات
  const beforeUsers = getState(wDm).users.length;
  click(wDm, '[data-action="reset"]');
  const afterReset = getState(wDm);
  check("المسح يحتفظ بالمستخدمين", afterReset.users.length === beforeUsers);
  check("المسح يحتفظ بوضع العرض المضبوط", afterReset.demoMode === false);
}

console.log("=== 33) إصلاحات v43: الطرق المسدودة ومسارات التصحيح ===");
{
  const fixSeed = {
    schemaVersion: 22, role: "rmWarehouse", page: "receipts", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw" }],
    forecasts: [{ id: "FC-F", version: "V1", months: ["2026-12"], startDate: "2026-12-01", endDate: "2026-12-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-12": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-F", forecastId: "FC-F", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 500, monthlyQty: { "2026-12": 500 }, consumed: 0, needDate: "2026-12-01", onHand: 100, reserved: 0, hold: 0, inbound: 400, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [{ id: "PC-F", materialId: "MR-F", supplier: "مورد", po: "PO-F", qty: 400, orderQty: 400, conversionFactor: 1, purchaseUnit: "", orderDate: "2026-09-01", eta: "2026-11-01", amount: "", status: "in_transit", financeApproval: { status: "approved", note: "", at: "2026-09-02 09:00" }, quotation: null, createdAt: "2026-09-01 09:00", inTransitAt: "2026-09-03 09:00" }],
    rawReceipts: [{ id: "RR-F", commitmentId: "PC-F", materialCode: "RM1", material: "سكر", qty: 400, received: 0, status: "expected", postedToStock: false, expectedAt: "2026-09-01 09:00" }],
    actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wF } = boot(fixSeed);
  switchRole(wF, "rmWarehouse");
  click(wF, 'nav [data-page="receipts"]');
  click(wF, '[data-action="receive-material"]');
  setValue(wF, 'input[name="rrQty_0"]', "150");
  submitDialog(wF, "receipt-form");
  let stF = getState(wF);
  check("الاستلام الجزئي لا يقفل الأوردر كمستلم", stF.commitments[0].status === "partial");
  check("الرصيد ارتفع بالمستلم فقط", stF.materials[0].onHand === 250);
  check("زر التراجع عن الاستلام ظاهر للمخزن", !!wF.document.querySelector('[data-action="undo-receipt"]'));
  click(wF, '[data-action="undo-receipt"][data-id="RR-F"]');
  stF = getState(wF);
  check("التراجع يعيد الرصيد إلى ما كان", stF.materials[0].onHand === 100);
  check("التراجع يعيد الأوردر إلى التوريد", stF.commitments[0].status === "in_transit" && stF.rawReceipts[0].status === "expected");
  check("التراجع يعيد الكمية القادمة", stF.materials[0].inbound === 400);

  // فك تثبيت مستند لم يُنتَج عليه شيء
  switchRole(wF, "sales");
  click(wF, 'nav [data-page="forecasts"]');
  check("زر فك التثبيت ظاهر", !!wF.document.querySelector('[data-action="revoke-fixed-forecast"]'));
  click(wF, '[data-action="revoke-fixed-forecast"][data-id="FC-F"]');
  stF = getState(wF);
  check("فك التثبيت يعيد المستند لفحص الجاهزية", stF.forecasts[0].status === "submitted" && stF.forecasts[0].readinessStale === true && !stF.forecasts[0].supplyFeasibility);

  // إلغاء مستند يُنظّف احتياجاته وأوامر شرائه غير المستلمة
  click(wF, '[data-action="cancel-forecast"][data-id="FC-F"]');
  stF = getState(wF);
  check("الإلغاء يُزيل سجلات الاحتياج اليتيمة", stF.materials.length === 0);
  check("الإلغاء يُلغي أوامر الشراء غير المستلمة", stF.commitments[0].status === "cancelled");
}

console.log("=== 34) إصلاحات v43: القضايا والصلاحيات المحمية ===");
{
  const issueSeed = {
    schemaVersion: 22, role: "executive", page: "issues", loggedIn: true, guideSeen: true, demoMode: true,
    products: [], rawMaterials: [], forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [],
    issues: [{ id: "IS-X", title: "فرق كميات", severity: "high", visibility: "commercial", department: "الإنتاج", source: "دفعة", impact: "فرق بين المنتَج والمستلم", action: "تحقق من العد", owner: "الإنتاج", due: "2026-09-01", status: "open", createdAt: "2026-08-10 09:00" }],
    downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wI } = boot(issueSeed);
  switchRole(wI, "executive");
  click(wI, 'nav [data-page="issues"]');
  click(wI, '[data-action="close-issue"][data-id="IS-X"]');
  check("إغلاق القضية يسجّل من أغلقها", getState(wI).issues[0].status === "closed" && getState(wI).issues[0].evidence.includes("الإدارة العليا"));
  check("زر إعادة الفتح ظهر", !!wI.document.querySelector('[data-action="reopen-issue"]'));
  click(wI, '[data-action="reopen-issue"][data-id="IS-X"]');
  check("إعادة الفتح تعمل", getState(wI).issues[0].status === "open" && !getState(wI).issues[0].closedAt);

  // صلاحيات: لا تُعدَّل صلاحيات الأدمن، والمبيعات لا تُمنح سجل الأحداث
  switchRole(wI, "admin");
  click(wI, 'nav [data-page="admin"]');
  const salesAuditToggle = wI.document.querySelector('[data-action="toggle-permission"][data-role="sales"][data-page-key="audit"]');
  check("سجل الأحداث ليس ضمن خيارات المبيعات", !salesAuditToggle);
  check("لا توجد بطاقة صلاحيات لمسؤول النظام", !wI.document.querySelector('[data-action="toggle-permission"][data-role="admin"]'));
}

console.log("=== 35) إصلاحات v44: الصافي الزمني للمواد والشراء على فترات ===");
{
  // احتياج 3 أشهر × 1000 كغم، رصيد اليوم 1200، مخزون استراتيجي 200، مدة توريد 30 يومًا
  const mrpSeed = {
    schemaVersion: 22, role: "procurement", page: "requirements", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw", strategicStock: 200, leadTimeDays: 30 }],
    forecasts: [{ id: "FC-T", version: "V1", months: ["2026-10", "2026-11", "2026-12"], startDate: "2026-10-01", endDate: "2026-12-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 300, monthlyQty: { "2026-10": 100, "2026-11": 100, "2026-12": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-T", forecastId: "FC-T", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 3000, monthlyQty: { "2026-10": 1000, "2026-11": 1000, "2026-12": 1000 }, consumed: 0, needDate: "2026-10-01", onHand: 1200, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wT } = boot(mrpSeed);
  switchRole(wT, "procurement");
  click(wT, 'nav [data-page="requirements"]');
  check("بطاقة الخطة الزمنية ظاهرة", pageText(wT).includes("الخطة الزمنية للمواد"));
  check("جدول الخطة فيه بنود الترحيل", pageText(wT).includes("رصيد أول الشهر") && pageText(wT).includes("صافي الاحتياج للشراء"));

  click(wT, '[data-action="new-commitment"]');
  const months = [...wT.document.querySelectorAll('input[type="hidden"][name^="pcMonth_"]')].map(i => i.value);
  // تشرين الأول: 1200 − 1000 = 200 = الحد الاستراتيجي بالضبط ⇒ لا صف شراء أصلًا
  // تشرين الثاني: 200 − 1000 = −800 ⇒ صافي 1000 لإعادة الرصيد إلى 200
  // كانون الأول: 200 − 1000 = −800 ⇒ صافي 1000
  check("صف لكل فترة يحتاج شراءً فقط", months.length === 2 && months[0] === "2026-11" && months[1] === "2026-12");
  check("الشهر المغطى بالرصيد لا يُعرض للشراء", months.indexOf("2026-10") === -1);
  const qtys = [0,1].map(i => Number(wT.document.querySelector(`input[name="pcQty_${i}"]`).value));
  check("صافي تشرين الثاني 1000 لا 1800", qtys[0] === 1000);
  check("صافي كانون الأول 1000", qtys[1] === 1000);
  check("مجموع الشراء 2000 موزع على فترتين لا دفعة واحدة", qtys.reduce((a, b) => a + b, 0) === 2000);
  check("آخر موعد للأوردر محسوب لكل فترة", dialogText(wT).includes("آخر موعد للأوردر") && dialogText(wT).includes("2026-10-02"));

  // شراء فترة واحدة فقط: الباقي يبقى لموعده
  setValue(wT, 'input[name="pcSupplier_0"]', "مورد السكر");
  setValue(wT, 'input[name="pcPo_0"]', "PO-NOV");
  setValue(wT, 'input[name="pcOrder_0"]', "2026-10-01");
  setValue(wT, 'input[name="pcEta_0"]', "2026-11-01");
  submitDialog(wT, "commitment-form");
  const stT = getState(wT);
  check("أُنشئ أمر واحد لفترة واحدة", stT.commitments.length === 1 && stT.commitments[0].qty === 1000);
  check("الأمر يحمل شهر حاجته", stT.commitments[0].needMonth === "2026-11");
}

console.log("=== 36) إصلاحات v44: نقطة إعادة الطلب ===");
{
  const ropSeed = {
    schemaVersion: 22, role: "rmWarehouse", page: "rmStock", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw", strategicStock: 200, leadTimeDays: 30 }],
    forecasts: [{ id: "FC-R", version: "V1", months: ["2026-10"], startDate: "2026-10-01", endDate: "2026-10-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 100, monthlyQty: { "2026-10": 100 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [{ id: "MR-R", forecastId: "FC-R", productCode: "", materialCode: "RM1", material: "سكر", unit: "كغم", required: 900, monthlyQty: { "2026-10": 900 }, consumed: 0, needDate: "2026-10-01", onHand: 300, reserved: 0, hold: 0, inbound: 0, stockConfirmed: true, stockConfirmedAt: "2026-08-02 09:00", status: "shortage", createdAt: "2026-08-01 10:00" }],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wR } = boot(ropSeed);
  switchRole(wR, "rmWarehouse");
  click(wR, 'nav [data-page="rmStock"]');
  // 900 ÷ 30 يومًا = 30/يوم × 30 يوم مدة توريد + 200 استراتيجي = 1100
  check("عمود نقطة إعادة الطلب ظاهر", pageText(wR).includes("نقطة إعادة الطلب"));
  check("نقطة إعادة الطلب = 30×30 + 200 = 1,100", pageText(wR).includes("1,100"));
  check("الرصيد 300 تحت نقطة الطلب فيظهر التنبيه", pageText(wR).includes("تحت نقطة الطلب"));
}

console.log("=== 37) إصلاحات v44: صافي احتياج المنتج النهائي ===");
{
  const mpsSeed = {
    schemaVersion: 22, role: "production", page: "weekly", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [], forecasts: [{ id: "FC-M2", version: "V1", months: ["2026-10"], startDate: "2026-10-01", endDate: "2026-10-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 10000, monthlyQty: { "2026-10": 10000 }, note: "" }], status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [], materials: [], commitments: [], rawReceipts: [],
    actuals: [{ id: "AC-M2", forecastId: "FC-OLD", productCode: "P1", product: "منتج", unit: "كرتون", batch: "B-0", month: "2026-08", planned: 3000, actual: 3000, date: "2026-08-20", status: "recorded", recordedAt: "2026-08-20 10:00" }],
    fgReceipts: [{ id: "FG-M2", actualId: "AC-M2", productCode: "P1", product: "منتج", unit: "كرتون", produced: 3000, received: 3000, reserved: 0, blocked: 0, status: "confirmed", confirmedAt: "2026-08-21 09:00" }],
    issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wM } = boot(mpsSeed);
  switchRole(wM, "production");
  click(wM, 'nav [data-page="execution"]');
  check("بطاقة الخطة الرئيسية ظاهرة", pageText(wM).includes("الخطة الرئيسية للإنتاج"));
  check("الجدول يبيّن المغطى من المخزون", pageText(wM).includes("مغطى من المخزون") && pageText(wM).includes("3,000"));
  check("الصافي المطلوب إنتاجه 7,000 لا 10,000", pageText(wM).includes("7,000"));

  click(wM, 'nav [data-page="weekly"]');
  click(wM, '[data-action="new-weekly-plan"]');
  check("هدف الخطة الافتراضي هو الصافي", wM.document.querySelector('input[name="wpTarget_0"]').value === "7000");
  const weekCells = [0,1,2,3].map(k => Number(wM.document.querySelector(`input[name="wpQty_0_${k}"]`).value));
  check("توزيع الأسابيع مبني على الصافي", weekCells.reduce((a, b) => a + b, 0) === 7000);
  check("الصف يوضح التغطية من المخزون", dialogText(wM).includes("مغطى من المخزون"));
  submitDialog(wM, "weekly-plan-form");
  const planM = getState(wM).weeklyPlans[0];
  check("الخطة حُفظت بالصافي 7,000", planM && planM.weeks.reduce((sum, wk) => sum + Number(wk.qty), 0) === 7000);
}

console.log("=== 38) إصلاحات v44: دقة التنبؤ ===");
{
  const accSeed = {
    schemaVersion: 22, role: "sales", page: "monthly", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [],
    forecasts: [{ id: "FC-A", version: "V1", months: ["2026-06", "2026-07"], startDate: "2026-06-01", endDate: "2026-07-31", frequency: "monthly", priority: "عادية", note: "", items: [{ productCode: "P1", productName: "منتج", unit: "كرتون", qty: 2000, monthlyQty: { "2026-06": 1000, "2026-07": 1000 }, note: "" }], status: "fixed", fixedAt: "2026-05-01 09:00", submittedAt: "2026-05-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [],
    salesRecords: [
      { id: "SL-A1", productCode: "P1", product: "منتج", unit: "كرتون", qty: 1200, date: "2026-06-20", channel: "direct", agentOrderId: "", agentCode: "", note: "", recordedAt: "2026-06-20 10:00" },
      { id: "SL-A2", productCode: "P1", product: "منتج", unit: "كرتون", qty: 1000, date: "2026-07-20", channel: "direct", agentOrderId: "", agentCode: "", note: "", recordedAt: "2026-07-20 10:00" }
    ],
    materialMoves: [], plans: [], materials: [], commitments: [], rawReceipts: [], actuals: [], fgReceipts: [],
    issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wA } = boot(accSeed);
  switchRole(wA, "sales");
  click(wA, 'nav [data-page="monthly"]');
  check("بطاقة دقة التنبؤ ظاهرة", pageText(wA).includes("دقة التنبؤ"));
  // مخطط 2000، فعلي 2200 ⇒ انحياز +10٪ ونسبة خطأ 10٪
  check("الانحياز محسوب +10٪", pageText(wA).includes("+10٪"));
  check("نسبة الخطأ محسوبة 10٪", pageText(wA).includes("10٪"));
}

console.log("=== 39) v45: فلاتر الجداول والقوائم ===");
{
  const products = [], items = [], audit = [];
  const flavours = ["مانجو", "رمان", "موز", "ليمون", "فستق", "مشمش", "توت", "فراولة", "أناناس", "كيوي"];
  flavours.forEach((name, i) => {
    const code = "P" + (500 + i);
    products.push({ code, name: "موون " + name, unit: "كرتون", active: true, packingBom: [] });
    items.push({ productCode: code, productName: "موون " + name, unit: "كرتون", qty: 2000, monthlyQty: { "2026-09": 1000, "2026-10": 1000 }, note: "" });
    audit.push({ id: "A" + i, time: "2026-08-2" + (i % 3) + " 10:00", actor: i % 2 ? "المبيعات" : "الإنتاج", text: "حدث على موون " + name });
  });
  const filterSeed = {
    schemaVersion: 22, role: "executive", page: "reports", loggedIn: true, guideSeen: true, demoMode: true,
    products, rawMaterials: [],
    forecasts: [{ id: "FC-V45", version: "V1", months: ["2026-09", "2026-10"], startDate: "2026-09-01", endDate: "2026-10-31", frequency: "monthly", priority: "عادية", note: "", items, status: "fixed", fixedAt: "2026-08-01 09:00", submittedAt: "2026-08-01 08:00", history: [], supplyFeasibility: { confirmed: true, note: "", at: "" }, readinessStale: false }],
    weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [], materials: [], commitments: [], rawReceipts: [],
    actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit, permissions: null
  };
  const { w: wV } = boot(filterSeed);
  switchRole(wV, "executive");
  click(wV, 'nav [data-page="reports"]');

  const table = wV.document.querySelector('table[data-table-key]');
  check("شريط الفلاتر رُكّب على جدول التقرير", !!table && !!wV.document.querySelector(".table-toolbar"));
  const key = table.getAttribute("data-table-key");
  const visibleRows = () => [...table.tBodies[0].rows].filter(r => r.style.display !== "none").length;
  check("كل الصفوف ظاهرة قبل التصفية", visibleRows() === 20);
  check("العدّاد يعرض إجمالي الصفوف", wV.document.querySelector(`[data-table-count="${key}"]`).textContent.includes("20"));

  // بحث نصي
  const search = wV.document.querySelector('[data-action="table-search"]');
  search.value = "مانجو";
  search.dispatchEvent(new wV.Event("input", { bubbles: true }));
  check("البحث النصي يصفّي الصفوف", visibleRows() === 2);
  check("العدّاد يتحدث بعد البحث", wV.document.querySelector(`[data-table-count="${key}"]`).textContent.includes("2"));
  check("زر مسح الفلاتر ظهر بعد البحث", !!wV.document.querySelector('[data-action="table-clear"]'));

  // البحث لا يعيد الرسم فلا يفقد الحقل قيمته
  check("حقل البحث يحتفظ بقيمته أثناء الكتابة", wV.document.querySelector('[data-action="table-search"]').value === "مانجو");

  // مسح الفلاتر
  click(wV, '[data-action="table-clear"]');
  const table2 = wV.document.querySelector('table[data-table-key]');
  check("مسح الفلاتر يعيد كل الصفوف", [...table2.tBodies[0].rows].filter(r => r.style.display !== "none").length === 20);

  // فلتر عمود
  const colSelect = wV.document.querySelector('[data-action="table-filter"]');
  check("فلتر عمود مولّد تلقائيًا", !!colSelect && colSelect.options.length > 2);
  const colIndex = colSelect.getAttribute("data-column");
  const someValue = colSelect.options[1].value;
  change(wV, '[data-action="table-filter"]', someValue);
  const table3 = wV.document.querySelector('table[data-table-key]');
  const rows3 = [...table3.tBodies[0].rows].filter(r => r.style.display !== "none");
  check("فلتر العمود يصفّي حسب القيمة المختارة", rows3.length > 0 && rows3.length < 20 && rows3.every(r => r.cells[Number(colIndex)].textContent.trim() === someValue));
  click(wV, '[data-action="table-clear"]');

  // الفرز بالنقر على الرأس
  const head = wV.document.querySelector('th[data-action="table-sort"]');
  check("رؤوس الأعمدة صارت قابلة للفرز", !!head);
  const sortCol = Number(head.getAttribute("data-column"));
  head.dispatchEvent(new wV.Event("click", { bubbles: true }));
  const sorted = wV.document.querySelector('table[data-table-key]');
  const values = [...sorted.tBodies[0].rows].map(r => r.cells[sortCol].textContent.trim());
  const ascending = values.every((v, i) => i === 0 || values[i - 1].localeCompare(v, "ar") <= 0);
  check("الفرز تصاعديًا يعمل", ascending);
  check("شارة اتجاه الفرز ظاهرة", !!wV.document.querySelector("th.sort-asc"));

  // جدول صغير لا يأخذ شريطًا
  switchRole(wV, "admin");
  click(wV, 'nav [data-page="admin"]');
  const usersTable = [...wV.document.querySelectorAll("#page-content table")].find(t => t.tBodies[0] && t.tBodies[0].rows.length < 8);
  check("الجداول الصغيرة لا تأخذ شريط فلاتر", !usersTable || !usersTable.getAttribute("data-table-key"));

  // بحث القوائم: سجل الأحداث
  click(wV, 'nav [data-page="audit"]');
  const list = wV.document.querySelector("[data-list-key]");
  check("شريط بحث رُكّب على سجل الأحداث", !!list);
  const listSearch = wV.document.querySelector('[data-action="list-search"]');
  listSearch.value = "مانجو";
  listSearch.dispatchEvent(new wV.Event("input", { bubbles: true }));
  const shownItems = [...list.children].filter(n => n.style.display !== "none").length;
  check("بحث القائمة يصفّي السجلات", shownItems > 0 && shownItems < list.children.length);
  check("زر مسح البحث ظهر", !!wV.document.querySelector('[data-action="list-clear"]'));
  click(wV, '[data-action="list-clear"]');
  const list2 = wV.document.querySelector("[data-list-key]");
  check("مسح البحث يعيد كل السجلات", [...list2.children].every(n => n.style.display !== "none"));

  // v52: نوافذ الإدخال صارت تُفلتر أيضًا — بحث وفلاتر أعمدة بلا فرز وبلا تصدير.
  switchRole(wV, "sales");
  click(wV, 'nav [data-page="forecasts"]');
  click(wV, '[data-action="new-forecast"]');
  click(wV, '[data-action="close-dialog"]');
}

console.log("=== 40) v46: التنزيل يعمل فعلًا (Blob بدل data:) ===");
{
  const dlSeed = {
    schemaVersion: 22, role: "admin", page: "productMaster", loggedIn: true, guideSeen: true, demoMode: true,
    products: [{ code: "P1", name: "منتج", unit: "كرتون", active: true, packingBom: [] }],
    rawMaterials: [{ code: "RM1", name: "سكر", unit: "كغم", active: true, category: "raw" }],
    forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [], materials: [],
    commitments: [], rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [],
    financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wD } = boot(dlSeed);
  switchRole(wD, "admin");
  click(wD, 'nav [data-page="productMaster"]');
  click(wD, '[data-action="download-master-template"][data-kind="products"]');
  check("التنزيل يمر عبر Blob لا رابط data:", (wD.__downloads || []).length === 1);
  check("اسم الملف مضبوط على الرابط", (wD.__downloadNames || []).includes("EMICP-products-template.csv"));
  check("محتوى الملف نصي فعلي", wD.__downloads[0] && wD.__downloads[0].size > 0);
  check("رسالة النجاح تظهر بعد التنزيل فعلًا", wD.document.getElementById("toast-region").textContent.includes("نُزّل القالب"));

  // متصفح بلا createObjectURL: تظهر نافذة النسخة النصية بدل رسالة نجاح كاذبة
  const { w: wF } = boot(dlSeed);
  wF.URL.createObjectURL = () => { throw new Error("unsupported"); };
  switchRole(wF, "admin");
  click(wF, 'nav [data-page="productMaster"]');
  wF.document.getElementById("toast-region").textContent = "";
  click(wF, '[data-action="download-master-template"][data-kind="products"]');
  check("عند فشل التنزيل تُفتح نافذة النسخة النصية", !!wF.document.getElementById("download-fallback-text"));
  check("النافذة تحمل محتوى الملف", wF.document.getElementById("download-fallback-text").value.includes("code"));
  check("لا رسالة نجاح كاذبة عند الفشل", !wF.document.getElementById("toast-region").textContent.includes("نُزّل"));
}

console.log("=== 41) v47: فلاتر أعمدة على جدول مخزون المنتج النهائي ===");
{
  const products = [], actuals = [], fgReceipts = [];
  ["مانجو", "رمان", "موز", "ليمون", "فستق"].forEach((flavour, i) => {
    const code = "P" + (700 + i);
    products.push({ code, name: "موون " + flavour, unit: "كرتون", active: true, packingBom: [] });
    ["2026-08", "2026-09"].forEach((month, k) => {
      const actualId = "AC" + i + k;
      actuals.push({ id: actualId, forecastId: "FC-F2", productCode: code, product: "موون " + flavour, unit: "كرتون", batch: "B" + i + k, month, planned: 1000, actual: 1000, date: month + "-15", status: "recorded", recordedAt: "2026-08-23 00:50" });
      fgReceipts.push({ id: "FG" + i + k, actualId, productCode: code, product: "موون " + flavour, unit: "كرتون", produced: 1000, received: i === 0 ? 950 : 1000, reserved: 0, blocked: 0, status: "confirmed", confirmedAt: "2026-08-23 00:55" });
    });
  });
  const fgSeed = {
    schemaVersion: 22, role: "fgWarehouse", page: "fgStock", loggedIn: true, guideSeen: true, demoMode: true,
    products, rawMaterials: [], forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [], commitments: [], rawReceipts: [], actuals, fgReceipts, issues: [], downtime: [],
    financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wG2 } = boot(fgSeed);
  switchRole(wG2, "fgWarehouse");
  click(wG2, 'nav [data-page="fgStock"]');
  const labels = [...wG2.document.querySelectorAll(".table-filter-field > span")].map(e => e.textContent);
  check("عمودا الشهر والحالة أُضيفا لجدول FG", pageText(wG2).includes("الشهر") && pageText(wG2).includes("فرق كميات"));
  check("خانة متعددة الأسطر صارت تُنتج فلترًا (المنتج)", labels.includes("المنتج"));
  check("فلتر الشهر مولّد", labels.includes("الشهر"));
  check("فلتر الحالة مولّد", labels.includes("الحالة"));
  check("الأعمدة الوصفية تسبق الرقمية في الاختيار", labels.indexOf("المنتج") < labels.indexOf("الحالة"));

  const fgTable = wG2.document.querySelector('table[data-table-key]');
  const monthSelect = [...wG2.document.querySelectorAll('[data-action="table-filter"]')]
    .find(sel => sel.closest(".table-filter-field").querySelector("span").textContent === "الشهر");
  monthSelect.value = [...monthSelect.options].find(o => o.value.includes("أيلول")).value;
  monthSelect.dispatchEvent(new wG2.Event("change", { bubbles: true }));
  const shown = [...wG2.document.querySelector('table[data-table-key]').tBodies[0].rows].filter(r => r.style.display !== "none");
  check("فلتر الشهر يصفّي نصف الدفعات", shown.length === 5);
  check("كل الصفوف الظاهرة من الشهر المختار", shown.every(r => r.textContent.includes("أيلول")));
}

console.log("=== 42) v48: زر تصدير Excel على أشرطة الجداول والقوائم ===");
{
  const products = [], actuals = [], fgReceipts = [];
  ["مانجو", "رمان", "موز", "ليمون", "فستق"].forEach((flavour, i) => {
    const code = "P" + (800 + i);
    products.push({ code, name: "موون " + flavour, unit: "كرتون", active: true, packingBom: [] });
    ["2026-08", "2026-09"].forEach((month, k) => {
      const actualId = "AX" + i + k;
      actuals.push({ id: actualId, forecastId: "FC-F3", productCode: code, product: "موون " + flavour, unit: "كرتون", batch: "B" + i + k, month, planned: 1000, actual: 1000, date: month + "-15", status: "recorded", recordedAt: "2026-08-23 00:50" });
      fgReceipts.push({ id: "FX" + i + k, actualId, productCode: code, product: "موون " + flavour, unit: "كرتون", produced: 1000, received: 1000, reserved: 0, blocked: 0, status: "confirmed", confirmedAt: "2026-08-23 00:55" });
    });
  });
  const seedX = {
    schemaVersion: 22, role: "fgWarehouse", page: "fgStock", loggedIn: true, guideSeen: true, demoMode: true,
    products, rawMaterials: [], forecasts: [], weeklyPlans: [], salesRecords: [], materialMoves: [], plans: [],
    materials: [], commitments: [], rawReceipts: [], actuals, fgReceipts, issues: [], downtime: [],
    financeChecks: [], wasteRecords: [], agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wX } = boot(seedX);
  switchRole(wX, "fgWarehouse");
  click(wX, 'nav [data-page="fgStock"]');
  const exportBtn = wX.document.querySelector('[data-action="table-export"]');
  check("زر تصدير Excel ظاهر على شريط الجدول", Boolean(exportBtn));

  wX.__downloadNames = [];
  wX.__downloads = [];
  exportBtn.click();
  check("النقر يبدأ تنزيلًا حقيقيًا (Blob لا data:)", (wX.__downloads || []).length === 1);
  check("اسم الملف يحمل عنوان البطاقة وامتداد csv", /^EMICP-.+\.csv$/.test((wX.__downloadNames || [])[0] || ""));

  // التصدير يلتزم بالفلتر الظاهر لا بالجدول الخام.
  const monthSel = [...wX.document.querySelectorAll('[data-action="table-filter"]')]
    .find(sel => sel.closest(".table-filter-field").querySelector("span").textContent === "الشهر");
  monthSel.value = [...monthSel.options].find(o => o.value.includes("أيلول")).value;
  monthSel.dispatchEvent(new wX.Event("change", { bubbles: true }));
  const table = wX.document.querySelector("table[data-table-key]");
  const visibleRows = [...table.tBodies[0].rows].filter(r => r.style.display !== "none").length;
  wX.__downloads = [];
  wX.__csvText = "";
  const realBlob = wX.Blob;
  wX.Blob = function (parts, opts) { wX.__csvText = String(parts[0]); return new realBlob(parts, opts); };
  wX.document.querySelector('[data-action="table-export"]').click();
  wX.Blob = realBlob;
  const dataLines = wX.__csvText.split("\n").filter(Boolean);
  check("الملف يبدأ بعلامة BOM ليقرأ Excel العربية", wX.__csvText.charCodeAt(0) === 0xFEFF);
  check("عدد أسطر الملف = رأس + الصفوف الظاهرة فقط", dataLines.length === visibleRows + 1);
  check("لا صف من شهر مخفي داخل الملف", !dataLines.slice(1).some(line => line.includes("آب")));

  // القوائم تأخذ نفس الزر.
  const auditSeed = JSON.parse(JSON.stringify(seedX));
  auditSeed.role = "admin";
  auditSeed.page = "audit";
  auditSeed.audit = Array.from({ length: 12 }, (_, i) => ({ time: "2026-08-2" + (i % 10) + " 10:00", actor: "مسؤول النظام", text: "حدث تجريبي رقم " + i }));
  const { w: wL } = boot(auditSeed);
  switchRole(wL, "admin");
  click(wL, 'nav [data-page="audit"]');
  const listBtn = wL.document.querySelector('[data-action="list-export"]');
  check("زر تصدير Excel ظاهر على شريط القوائم أيضًا", Boolean(listBtn));
  wL.__downloads = [];
  let listCsv = "";
  const realBlobL = wL.Blob;
  wL.Blob = function (parts, opts) { listCsv = String(parts[0]); return new realBlobL(parts, opts); };
  listBtn.click();
  wL.Blob = realBlobL;
  check("سجل الأحداث يُصدَّر بثلاثة أعمدة (الوقت، الفاعل، النص)", listCsv.split("\n").filter(Boolean).every(line => line.split(",").length >= 3));
}

console.log("=== 44) v50: صندوق الموافقات الموحّد والموافقة بالاستثناء ===");
{
  // خطتان: واحدة مطابقة للفوركاست (داخل الحدّ) وواحدة منحرفة 20٪ (استثناء).
  const months = ["2026-09", "2026-10"];
  const products = [
    { code: "PA1", name: "موون مانجو", unit: "كرتون", active: true, packingBom: [] },
    { code: "PA2", name: "موون فستق", unit: "كرتون", active: true, packingBom: [] }
  ];
  const forecast = {
    id: "FC-AP1", version: "V1", months, startDate: "2026-09-01", endDate: "2026-10-31",
    frequency: "monthly", priority: "normal", note: "", status: "fixed", createdBy: "المبيعات",
    submittedAt: "2026-08-01 08:00", fixedAt: "2026-08-02 08:00", history: [],
    items: [
      { productCode: "PA1", productName: "موون مانجو", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" },
      { productCode: "PA2", productName: "موون فستق", unit: "كرتون", qty: 100, monthlyQty: { "2026-09": 100 }, note: "" }
    ]
  };
  const mkPlan = (id, code, name, total) => ({
    id, version: "V1", forecastId: "FC-AP1", productCode: code, product: name, unit: "كرتون",
    month: "2026-09", granularity: "weekly", status: "awaiting_approvals", approvals: {}, unitApprovals: {},
    history: [], createdAt: "2026-08-10 09:00", salesForwardedAt: "2026-08-11 09:00",
    weeks: [
      { key: "w1", label: "الأسبوع 1", start: "2026-09-01", end: "2026-09-07", qty: total / 4, days: {} },
      { key: "w2", label: "الأسبوع 2", start: "2026-09-08", end: "2026-09-14", qty: total / 4, days: {} },
      { key: "w3", label: "الأسبوع 3", start: "2026-09-15", end: "2026-09-21", qty: total / 4, days: {} },
      { key: "w4", label: "الأسبوع 4", start: "2026-09-22", end: "2026-09-30", qty: total / 4, days: {} }
    ]
  });
  const seedAp = {
    schemaVersion: 23, role: "production", page: "approvals", loggedIn: true, guideSeen: true, demoMode: true,
    approvalTolerancePct: 5, products, rawMaterials: [], forecasts: [forecast],
    weeklyPlans: [mkPlan("WP-A", "PA1", "موون مانجو", 100), mkPlan("WP-B", "PA2", "موون فستق", 120)],
    salesRecords: [], materialMoves: [], plans: [], materials: [], commitments: [], rawReceipts: [],
    actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [],
    agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wA } = boot(seedAp);
  switchRole(wA, "production");
  click(wA, 'nav [data-page="approvals"]');
  check("شاشة صندوق الموافقات تفتح", pageText(wA).includes("صندوق الموافقات") && !!wA.document.getElementById("approvals-inbox-form"));

  const picks = [...wA.document.querySelectorAll('[data-action="approval-pick"]')];
  check("البندان يظهران في الصندوق", picks.length === 2);
  const within = picks.filter(b => b.getAttribute("data-within") === "1");
  check("الخطة المطابقة صُنّفت داخل حدّ التفويض", within.length === 1);
  check("المطابق يأتي محددًا مسبقًا", within[0].checked === true);
  const exception = picks.find(b => b.getAttribute("data-within") === "0");
  check("الاستثناء يأتي غير محدد — يطلب قرارًا", exception.checked === false);
  check("سبب الاستثناء معروض بالنسبة", pageText(wA).includes("انحراف") && pageText(wA).includes("٪ عن صافي الفوركاست"));

  submitDialog(wA, "approvals-inbox-form");
  let stA = getState(wA);
  const planA = stA.weeklyPlans.find(p => p.id === "WP-A");
  const planB = stA.weeklyPlans.find(p => p.id === "WP-B");
  check("المحدد وحده اعتُمد من الإنتاج", Object.keys(planA.unitApprovals || {}).length === 4);
  check("الاستثناء لم يُعتمد بلا قرار صريح", Object.keys(planB.unitApprovals || {}).length === 0);
  check("الاعتماد مسجّل في سجل الأحداث باسم الدور", stA.audit.some(a => a.text.includes("WP-A") && a.text.includes("صندوق الموافقات")));

  // الاستثناء يُعتمد بعد تحديده يدويًا.
  click(wA, 'nav [data-page="approvals"]');
  const stillPending = [...wA.document.querySelectorAll('[data-action="approval-pick"]')];
  check("المعتمَد اختفى من الصندوق والاستثناء بقي", stillPending.length === 1 && stillPending[0].getAttribute("data-within") === "0");
  click(wA, '[data-action="approval-select-all"]');
  check("تحديد الكل يشمل الاستثناء", [...wA.document.querySelectorAll('[data-action="approval-pick"]')].every(b => b.checked));
  submitDialog(wA, "approvals-inbox-form");
  stA = getState(wA);
  check("الاستثناء اعتُمد بعد قرار صريح", Object.keys(stA.weeklyPlans.find(p => p.id === "WP-B").unitApprovals || {}).length === 4);

  // مخزن FG يرى نفس الصندوق بدوره هو، والخطة لا تدخل التنفيذ قبل اعتماد الطرفين.
  check("الخطة لم تُعتمد نهائيًا باعتماد طرف واحد", stA.weeklyPlans.every(p => p.status === "awaiting_approvals"));
  switchRole(wA, "fgWarehouse");
  click(wA, 'nav [data-page="approvals"]');
  check("مخزن FG يرى البندين في صندوقه", wA.document.querySelectorAll('[data-action="approval-pick"]').length === 2);
  click(wA, '[data-action="approval-select-all"]');
  submitDialog(wA, "approvals-inbox-form");
  check("باعتماد الطرفين تدخل الخطط التنفيذ", getState(wA).weeklyPlans.every(p => p.status === "approved"));

  // حدّ التفويض يضبطه مسؤول النظام وحده.
  switchRole(wA, "admin");
  click(wA, 'nav [data-page="setup"]');
  check("حقل حدّ التفويض في تهيئة النظام", !!wA.document.getElementById("ap-tolerance"));
  setValue(wA, "#ap-tolerance", "25");
  submitDialog(wA, "approval-policy-form");
  check("الحدّ الجديد محفوظ", getState(wA).approvalTolerancePct === 25);
  check("تغيير الحدّ مسجّل في الأوديت", getState(wA).audit.some(a => a.text.includes("حدّ التفويض")));
}

console.log("=== 45) v52: فلاتر داخل نوافذ الإدخال + حفظ مجمَّع للعمليات الجماعية ===");
{
  const months = ["2026-09", "2026-10"];
  const products = [], items = [], plans = [];
  ["مانجو", "فستق", "كاكاو", "ليمون"].forEach((flavour, i) => {
    const code = "PF" + i;
    const name = "موون " + flavour;
    products.push({ code, name, unit: "كرتون", active: true, packingBom: [] });
    const monthlyQty = {}; months.forEach(m => { monthlyQty[m] = 100; });
    items.push({ productCode: code, productName: name, unit: "كرتون", qty: 200, monthlyQty, note: "" });
    months.forEach((month, k) => {
      plans.push({
        id: "WPF-" + i + k, version: "V1", forecastId: "FC-F5", productCode: code, product: name, unit: "كرتون",
        month, granularity: "weekly", status: "awaiting_approvals", approvals: {}, unitApprovals: {},
        history: [], createdAt: "2026-08-10 09:00", salesForwardedAt: "2026-08-11 09:00",
        weeks: [1,2,3,4].map(n => ({ key: "w"+n, label: "الأسبوع "+n, start: month+"-0"+n, end: month+"-0"+(n+6), qty: 25, days: {} }))
      });
    });
  });
  const seedF = {
    schemaVersion: 23, role: "production", page: "approvals", loggedIn: true, guideSeen: true, demoMode: true,
    approvalTolerancePct: 5, products, rawMaterials: [],
    forecasts: [{ id: "FC-F5", version: "V1", months, startDate: "2026-09-01", endDate: "2026-10-31", frequency: "monthly", priority: "normal", note: "", status: "fixed", createdBy: "المبيعات", submittedAt: "2026-08-01 08:00", fixedAt: "2026-08-02 08:00", history: [], items }],
    weeklyPlans: plans, salesRecords: [], materialMoves: [], plans: [], materials: [], commitments: [],
    rawReceipts: [], actuals: [], fgReceipts: [], issues: [], downtime: [], financeChecks: [], wasteRecords: [],
    agents: [], agentOrders: [], audit: [], permissions: null
  };
  const { w: wF } = boot(seedF);
  switchRole(wF, "production");
  click(wF, 'nav [data-page="approvals"]');
  check("صندوق الموافقات فيه 8 بنود", wF.document.querySelectorAll('[data-action="approval-pick"]').length === 8);
  check("شريط فلاتر رُكِّب على جدول الصندوق", !!wF.document.querySelector('[data-action="table-search"]'));

  // الفلتر يخفي صفوفًا، والاعتماد لا يمسّ ما هو مخفي.
  const monthFilter = [...wF.document.querySelectorAll('[data-action="table-filter"]')]
    .find(sel => { const f = sel.closest(".table-filter-field"); const sp = f && f.querySelector("span"); return sp && sp.textContent === "الكمية"; });
  const searchBox = wF.document.querySelector('[data-action="table-search"]');
  searchBox.value = "موون مانجو";
  searchBox.dispatchEvent(new wF.Event("input", { bubbles: true }));
  const visibleRows = [...wF.document.querySelector("table[data-table-key]").tBodies[0].rows].filter(r => r.style.display !== "none");
  check("البحث داخل الصندوق يصفّي الصفوف", visibleRows.length === 2);
  check("عدّاد التحديد يعدّ الظاهر وحده", wF.document.getElementById("ap-selected-count").textContent.includes("2"));
  submitDialog(wF, "approvals-inbox-form");
  const stF = getState(wF);
  const approvedF = stF.weeklyPlans.filter(p => Object.keys(p.unitApprovals || {}).length > 0);
  check("الاعتماد شمل الظاهر وحده لا كل البنود", approvedF.length === 2 && approvedF.every(p => p.productCode === "PF0"));

  // جداول الإدخال: بحث وفلاتر بلا فرز وبلا تصدير.
  const seedG = JSON.parse(JSON.stringify(seedF));
  seedG.weeklyPlans = [];
  seedG.page = "weekly";
  const { w: wG } = boot(seedG);
  switchRole(wG, "production");
  click(wG, 'nav [data-page="weekly"]');
  click(wG, '[data-action="new-weekly-plan"]');
  check("شريط فلاتر داخل نافذة تقسيم الأسابيع", !!wG.document.querySelector('#dialog-content [data-action="table-search"]'));
  check("لا فرز في جداول الإدخال", wG.document.querySelectorAll("#dialog-content th.sortable").length === 0);
  check("لا زر تصدير في جداول الإدخال", wG.document.querySelectorAll('#dialog-content [data-action="table-export"]').length === 0);
  const labels = [...wG.document.querySelectorAll("#dialog-content .table-filter-field > span")].map(e => e.textContent);
  check("عمود التحديد لا يولّد فلترًا", !labels.some(l => l.includes("تحديد")));
  check("عمود المنتج والشهر يولّد فلترًا", labels.includes("المنتج والشهر"));

  const entrySearch = wG.document.querySelector('#dialog-content [data-action="table-search"]');
  entrySearch.value = "موون كاكاو";
  entrySearch.dispatchEvent(new wG.Event("input", { bubbles: true }));
  const entryTable = wG.document.querySelector("#dialog-content table[data-table-key]");
  const entryVisible = [...entryTable.tBodies[0].rows].filter(r => r.style.display !== "none");
  check("الفلترة تعمل داخل جدول الإدخال", entryVisible.length === 2);
  check("حقول الصفوف المخفية باقية في النموذج", wG.document.querySelectorAll('#dialog-content input[name^="wpQty_"]').length === 32);

  // الأمر الجماعي يطبّق على الظاهر وحده.
  const beforeHidden = wG.document.querySelector('input[name="wpQty_0_0"]').value;
  setValue(wG, "#wp-bulk-pattern", "w1");
  click(wG, '[data-action="weekly-apply-bulk"]');
  check("الأمر الجماعي لم يمسّ صفًا مخفيًا", wG.document.querySelector('input[name="wpQty_0_0"]').value === beforeHidden);
}

console.log("");
if (failures) { console.log("النتيجة: فشل " + failures + " اختبار"); process.exit(1); }
console.log("النتيجة: نجحت جميع الاختبارات ✔");
})();
