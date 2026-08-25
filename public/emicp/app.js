(function () {
  "use strict";

  // إصدار بداية نظيفة: لا يقرأ أي بيانات تعريف أو تشغيل من النسخة السابقة.
  // تبقى البيانات القديمة في مساحة المتصفح السابقة بلا لمس، بينما هذه النسخة تبدأ فارغة.
  var STORAGE_KEY = "emicp-interactive-prototype-v8-clean-start";
  var APP_SCHEMA_VERSION = 54;
  var PROCUREMENT_VIEW_KEY = "emicp-procurement-polished-view";
  var procurementPolished = false;
  try { procurementPolished = window.localStorage.getItem(PROCUREMENT_VIEW_KEY) === "1"; } catch (error) { procurementPolished = false; }
  var removedRoles = ["quality", "maintenance", "control"];
  var removedPages = ["quality", "downtime", "salesSupply", "plans"];

  var roles = {
    sales: { name: "المبيعات", home: "home", boundary: "ترسل Forecast السنة شهرًا بشهر وتتفاوض مع الإنتاج حتى التثبيت، تراجع الخطة الأسبوعية وترسلها للاعتماد، تسجل المبيعات، وترى المنتج النهائي المتاح فقط. لا ترى المواد الأولية أو أسماءها أو كمياتها." },
    production: { name: "الإنتاج", home: "home", boundary: "يفحص قدرة الآلات ويرد على Forecast حتى التثبيت، يقسّم الخطة الشهرية أسابيع، يحسب احتياجات المواد شهرًا بشهر، يعتمد النتيجة للمشتريات، ويسجل الإنتاج الفعلي." },
    procurement: { name: "المشتريات", home: "home", boundary: "تؤكد إمكانية التوريد ضمن فحص الجاهزية، وتتلقى النقص المؤكد فور رفع المخزن رصيده لتصدر أمر الشراء مباشرة — دون انتظار تثبيت المستند — وتملك المورد والـPO والكمية والـETA وبدء التوريد." },
    rmWarehouse: { name: "مستودع المواد الأولية", home: "home", boundary: "يملك حقيقة مخزون المواد الأولية فقط: يرفع الرصيد في التطبيق ويسجل الاستلام حسب الوصول. لا يعدّل الاحتياج أو الـPO." },
    fgWarehouse: { name: "مخزن المنتج النهائي", home: "home", boundary: "يؤكد استلام المنتج النهائي ويعتمد الخطة الأسبوعية، ويملك Available وReserved وBlocked." },
    finance: { name: "المالية", home: "home", boundary: "تراجع Forecast قبل تثبيته النهائي، وتوافق أوامر الشراء بعد الاطلاع على الكوتيشن." },
    executive: { name: "الإدارة العليا", home: "home", boundary: "صورة مختصرة للجاهزية والمخاطر والقرارات المطلوبة، مع صلاحية التحقق من المشكلات وإغلاقها." },
    admin: { name: "مسؤول النظام", home: "home", boundary: "يهيئ المنتجات والمواد الأولية وأكوادها الفريدة، ويدير المستخدمين والصلاحيات دون تعديل السجلات التشغيلية." }
  };

  var pageLabels = {
    home: "الرئيسية",
    setup: "تهيئة النظام",
    productMaster: "تعريف المنتجات",
    materialMaster: "تعريف المواد الأولية",
    packingMaster: "تعريف مواد التغليف",
    cityMaster: "تعريف المدن",
    workflow: "المسار العام",
    forecasts: "Forecast",
    weekly: "الخطة الأسبوعية",
    monthly: "المتابعة الشهرية",
    agentOrders: "أوردرات الوكلاء",
    agentMaster: "تعريف الوكلاء",
    reports: "التقارير",
    fgView: "المتاح للبيع",
    materials: "احتياجات المواد",
    rawRequirements: "احتياجات المواد الأولية",
    packingRequirements: "احتياجات مواد التغليف",
    execution: "تنفيذ الإنتاج",
    requirements: "طلبات المواد",
    procurement: "التزامات الشراء",
    rmStock: "مستودع المواد الأولية",
    receipts: "استلام المواد",
    packingStock: "مستودع مواد التغليف",
    packingReceipts: "استلام مواد التغليف",
    fgReceipts: "استلام المنتج النهائي",
    fgStock: "مخزون المنتج النهائي",
    finance: "المراقبة المالية",
    issues: "المشكلات والإجراءات",
    audit: "سجل الأحداث",
    executive: "داشبورد الإدارة",
    languages: "اللغات",
    admin: "الصلاحيات",
    approvals: "صندوق الموافقات"
  };

  // ===== نظام اللغات: العربية والإنجليزية والكردية السورانية =====
  // المصدر عربي في الكود؛ القاموس EMICP_DICT (ملف i18n-dictionary.js) يترجم كل عبارة، وتعديلات المالك تُخزن في state.langOverrides.
  var LANGS = { ar: { name: "العربية", dir: "rtl" }, en: { name: "English", dir: "ltr" }, ku: { name: "کوردی سۆرانی", dir: "rtl" } };
  var AR_RUN_RE = /[؀-ۿ][؀-ۿ،؛؟\s]*[؀-ۿ]|[؀-ۿ]/g;
  var langCache = {};
  var missingPhrases = {};

  function langOverrideCount() { return Object.keys(state.langOverrides || {}).length; }

  function dictEntry(phrase) {
    var override = (state.langOverrides || {})[phrase];
    var base = (window.EMICP_DICT || {})[phrase];
    return {
      ar: (override && override.ar) || phrase,
      en: (override && override.en) || (base && base[0]) || "",
      ku: (override && override.ku) || (base && base[1]) || ""
    };
  }

  function translateRun(run, lang) {
    var cacheKey = lang + "|" + run;
    if (langCache[cacheKey] != null) return langCache[cacheKey];
    var entry = dictEntry(run);
    var result;
    if (lang === "ar") result = entry.ar;
    else if (entry[lang]) result = entry[lang];
    else {
      // العبارة مركّبة في وقت التشغيل: نقسمها كلمات ونترجم أطول مقطع معروف ثم نكمل.
      var words = run.split(" ");
      var out = [];
      var i = 0;
      while (i < words.length) {
        var found = null;
        var span = 0;
        for (var j = Math.min(words.length, i + 14); j > i; j--) {
          var candidate = words.slice(i, j).join(" ");
          var candidateEntry = dictEntry(candidate);
          if (candidateEntry[lang]) { found = candidateEntry[lang]; span = j - i; break; }
        }
        if (found) { out.push(found); i += span; }
        else { out.push(words[i]); missingPhrases[words[i]] = true; i += 1; }
      }
      result = out.join(" ");
      if (result === run) missingPhrases[run] = true;
    }
    langCache[cacheKey] = result;
    return result;
  }

  function localizeText(text) {
    var lang = state.lang || "ar";
    if (lang === "ar" && !langOverrideCount()) return text;
    return String(text).replace(AR_RUN_RE, function (match) {
      var key = match.replace(/\s+/g, " ").trim();
      if (!key) return match;
      var translated = translateRun(key, lang);
      return translated === key ? match : translated;
    });
  }

  // ترجمة HTML كامل: النصوص بين الوسوم وخصائص العرض فقط — قيم الحقول والبيانات لا تُمس أبدًا.
  function localizeHtml(html) {
    var lang = state.lang || "ar";
    if (lang === "ar" && !langOverrideCount()) return html;
    var parts = String(html).split(/(<[^>]*>)/);
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (parts[i].charAt(0) === "<") {
        parts[i] = parts[i].replace(/(placeholder|title|aria-label)="([^"]*)"/g, function (all, attr, value) {
          return attr + '="' + localizeText(value) + '"';
        });
      } else {
        parts[i] = localizeText(parts[i]);
      }
    }
    return parts.join("");
  }

  function applyLangDir() {
    var lang = state.lang || "ar";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", (LANGS[lang] || LANGS.ar).dir);
  }

  var pageOrder = [
    "home", "approvals", "setup", "productMaster", "materialMaster", "packingMaster", "agentMaster", "cityMaster", "workflow", "agentOrders", "forecasts", "weekly", "monthly", "fgView", "materials", "rawRequirements", "packingRequirements", "execution",
    "requirements", "procurement", "rmStock", "receipts", "packingStock", "packingReceipts", "fgReceipts", "fgStock",
    "finance", "reports", "issues", "audit", "executive", "languages", "admin"
  ];

  var protectedPages = {
    sales: ["materials", "rawRequirements", "packingRequirements", "requirements", "procurement", "rmStock", "receipts", "packingStock", "packingReceipts", "finance", "fgReceipts", "audit", "executive", "execution"],
    procurement: ["forecasts", "weekly", "execution", "fgReceipts", "fgStock"],
    rmWarehouse: ["forecasts", "weekly", "execution", "fgReceipts", "fgStock", "finance"],
    fgWarehouse: ["forecasts", "materials", "rawRequirements", "packingRequirements", "requirements", "procurement", "rmStock", "receipts", "packingStock", "packingReceipts", "finance"],
    admin: ["forecasts", "materials", "rawRequirements", "packingRequirements", "requirements", "procurement", "rmStock", "receipts", "packingStock", "packingReceipts", "execution", "fgReceipts", "finance"]
  };

  var setupPages = ["setup", "productMaster", "materialMaster", "packingMaster", "agentMaster", "cityMaster"];

  function pageProtectedForRole(role, page) {
    if (role !== "admin" && setupPages.indexOf(page) !== -1) return true;
    return (protectedPages[role] || []).indexOf(page) !== -1;
  }

  // ===== جدول التفويض المركزي =====
  // قبل هذا كانت الحراسة تعيش في طبقة العرض وحدها: الزر مخفي والمعالج ينفّذ لأي دور.
  // هنا مصدر واحد للحقيقة لكل عملية تكتب في البيانات — ويصلح لاحقًا كمواصفة تفويض
  // للواجهة البرمجية عند الانتقال إلى سيرفر. ما ليس في الجدول = قراءة أو تنقّل مسموح للجميع.
  var FORM_ROLES = {
    "forecast-form": ["sales", "finance"],
    "forecast-map-form": ["sales", "finance"],
    "demand-composer-form": ["sales"],
    "agent-order-form": ["sales"],
    "sales-form": ["sales"],
    "weekly-review-form": ["sales"],
    "production-review-form": ["production"],
    "material-form": ["production"],
    "material-map-form": ["production"],
    "actual-form": ["production"],
    "weekly-plan-form": ["production"],
    "approvals-inbox-form": ["sales", "production", "fgWarehouse", "finance"],
    "approval-policy-form": ["admin"],
    "weekly-map-form": ["production"],
    "day-form": ["production"],
    "week-edit-form": ["production", "sales"],
    "unit-approve-form": ["production", "fgWarehouse"],
    "strategic-form": ["production", "procurement"],
    "commitment-form": ["procurement"],
    "supply-form": ["procurement"],
    "stock-form": ["rmWarehouse"],
    "receipt-form": ["rmWarehouse"],
    "waste-form": ["rmWarehouse"],
    "fg-form": ["fgWarehouse"],
    "agent-form": ["admin", "sales"],
    "city-form": ["admin"],
    "product-master-form": ["admin"],
    "product-edit-form": ["admin"],
    "raw-material-master-form": ["admin"],
    "raw-material-edit-form": ["admin"],
    "packing-bom-form": ["admin"],
    "user-form": ["admin"],
    "password-form": ["admin"]
    ,"backup-settings-form": ["admin"]
  };

  var ACTION_ROLES = {
    "new-forecast": ["sales"], "edit-forecast": ["sales"], "send-forecast": ["sales"], "cancel-forecast": ["sales"],
    "accept-production-feedback": ["sales"], "accept-finance-forecast": ["sales"], "finance-approve-forecast": ["finance"], "finance-edit-forecast": ["finance"], "download-finance-forecast": ["finance"], "revoke-fixed-forecast": ["sales", "production"],
    "review-forecast-feedback": ["sales"], "download-sales-feedback-forecast": ["sales"], "review-weekly": ["sales"],
    "build-forecast-from-demand": ["sales"], "new-agent-order": ["sales"], "cancel-agent-order": ["sales"],
    "new-sale": ["sales"],
    "forecast-production-review": ["production"], "download-production-forecast": ["production"], "download-modified-production-forecast": ["production"], "download-production-review-draft": ["production"], "new-material": ["production"], "send-materials-to-warehouse": ["production"],
    "new-actual": ["production"], "new-weekly-plan": ["production"], "plan-days": ["production"],
    "edit-weekly": ["production", "sales"],
    "approve-weekly": ["production", "fgWarehouse"], "approve-units": ["production", "fgWarehouse"],
    "set-strategic": ["production", "procurement"],
    "new-commitment": ["procurement"], "advance-commitment": ["procurement"], "cancel-commitment": ["procurement"],
    "confirm-supply": ["procurement"], "quotation-file": ["procurement"], "late-quotation-file": ["procurement"],
    "finance-po-decision": ["finance"],
    "confirm-stock": ["rmWarehouse"], "save-stock": ["rmWarehouse"], "new-waste": ["rmWarehouse"], "download-strategic-template": ["production"],
    "download-warehouse-file": ["rmWarehouse"], "warehouse-send": ["rmWarehouse"], "warehouse-return": ["production"], "warehouse-confirm": ["rmWarehouse"], "warehouse-release": ["production"],
    "receive-material": ["rmWarehouse"], "save-receipt": ["rmWarehouse"], "undo-receipt": ["rmWarehouse"],
    "confirm-fg": ["fgWarehouse"],
    "reopen-issue": ["executive", "admin"],
    "new-product": ["admin"], "edit-product": ["admin"], "new-raw-material": ["admin"], "edit-raw-material": ["admin"],
    "packing-bom": ["admin"], "delete-master": ["admin"], "download-master-template": ["admin"],
    "new-users": ["admin"], "toggle-user": ["admin"], "delete-user": ["admin"], "set-password": ["admin"],
    "toggle-permission": ["admin"], "toggle-dashboard-widget": ["admin"], "show-all-dashboard-widgets": ["admin"], "save-branding": ["admin"], "remove-logo": ["admin"], "reset-theme": ["admin"],
    "save-languages": ["admin"], "reset": ["admin"], "toggle-demo-mode": ["admin"], "export-backup": ["admin"], "backup-settings": ["admin"],
    "new-agent": ["admin", "sales"], "edit-agent": ["admin", "sales"], "delete-agent": ["admin", "sales"], "new-city": ["admin"], "open-templates": ["admin"]
  };

  // وضع العرض التجريبي: مبدّل الدور في الشريط العلوي أداة عرض لا بوابة دخول.
  // عند إطفائه يبقى التبديل لمسؤول النظام وحده، وهذا هو سلوك التشغيل الحقيقي.
  function demoRoleSwitchAllowed() {
    return state.role === "admin" || state.demoMode !== false;
  }

  function rolesAllowedFor(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
  }

  function denialMessage(allowed) {
    return "هذه العملية من صلاحية " + allowed.map(roleName).join(" أو ") + " فقط.";
  }

  var defaultState = {
    schemaVersion: APP_SCHEMA_VERSION,
    loggedIn: false,
    role: "admin",
    page: "setup",
    lang: "ar",
    langOverrides: {},
    currentUserId: "",
    execWidgets: {},
    users: Object.keys(roles).map(function (key) { return { id: "U-" + key, name: roles[key].name, role: key, active: true, createdAt: "" }; }),
    branding: { name: "Ice Star", logo: null, themeColor: "" },
    guideSeen: true,
    demoMode: true,
    approvalTolerancePct: 5,
    backupSettings: { reminderEnabled: false, autoEnabled: false, autoStartDate: "", lastAutoBackupDate: "", lastManualBackupAt: "", lastReminderDate: "" },
    permissions: {
      sales: ["home", "workflow", "approvals", "agentOrders", "forecasts", "weekly", "monthly", "reports", "fgView", "issues"],
      production: ["home", "workflow", "approvals", "forecasts", "weekly", "monthly", "rawRequirements", "packingRequirements", "execution", "reports", "fgView", "issues"],
      procurement: ["home", "workflow", "requirements", "procurement", "rmStock", "packingStock", "reports", "issues"],
      rmWarehouse: ["home", "workflow", "materials", "rmStock", "receipts", "packingStock", "packingReceipts", "reports", "issues"],
      fgWarehouse: ["home", "workflow", "approvals", "weekly", "fgReceipts", "fgStock", "reports", "issues"],
      finance: ["home", "approvals", "finance", "forecasts", "monthly", "rmStock", "procurement", "fgStock", "reports", "audit", "issues"],
      executive: ["home", "executive", "monthly", "agentOrders", "reports", "issues", "audit"],
      admin: ["home", "setup", "productMaster", "materialMaster", "packingMaster", "agentMaster", "cityMaster", "admin", "audit", "executive", "reports", "languages", "issues"]
    },
    products: [],
    rawMaterials: [],
    forecasts: [],
    weeklyPlans: [],
    salesRecords: [],
    materialMoves: [],
    plans: [],
    materials: [],
    commitments: [],
    rawReceipts: [],
    actuals: [],
    fgReceipts: [],
    issues: [],
    wasteRecords: [],
    agents: [],
    cities: [],
    agentOrders: [],
    downtime: [],
    financeChecks: [],
    warehouseReviews: {},
    materialDispatches: {},
    audit: []
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  var idSequence = 0;
  function createId(prefix) {
    idSequence = (idSequence + 1) % 100;
    return prefix + "-" + Date.now().toString(36).slice(-6).toUpperCase() + String(idSequence).padStart(2, "0");
  }

  var stateCollections = ["products", "rawMaterials", "forecasts", "weeklyPlans", "salesRecords", "materialMoves", "plans", "materials", "commitments", "rawReceipts", "actuals", "fgReceipts", "issues", "downtime", "financeChecks", "wasteRecords", "agents", "cities", "agentOrders", "audit"];

  function normalizeLoadedState(parsed) {
    var savedSchemaVersion = Number(parsed && parsed.schemaVersion || 0);
    var result = Object.assign(clone(defaultState), parsed && typeof parsed === "object" ? parsed : {});
    // عنصر تالف واحد (null أو غير كائن) كان يرمي استثناءً يبتلعه loadState فتُمحى قاعدة البيانات كلها.
    stateCollections.forEach(function (key) {
      if (!Array.isArray(result[key])) result[key] = [];
      result[key] = result[key].filter(function (item) { return item && typeof item === "object"; });
    });
    if (!roles[result.role]) result.role = "admin";
    if (!result.permissions || typeof result.permissions !== "object") result.permissions = clone(defaultState.permissions);
    removedRoles.forEach(function (role) { delete result.permissions[role]; });
    Object.keys(defaultState.permissions).forEach(function (role) {
      if (!Array.isArray(result.permissions[role])) result.permissions[role] = clone(defaultState.permissions[role]);
      result.permissions[role] = result.permissions[role].filter(function (page) { return removedPages.indexOf(page) === -1; });
      if (result.permissions[role].indexOf("home") === -1) result.permissions[role].unshift("home");
      if (result.permissions[role].indexOf("reports") === -1) result.permissions[role].push("reports");
    });
    if (result.permissions.admin && result.permissions.admin.indexOf("languages") === -1) result.permissions.admin.push("languages");
    if (result.permissions.admin && result.permissions.admin.indexOf("agentMaster") === -1) result.permissions.admin.push("agentMaster");
    if (result.permissions.admin && result.permissions.admin.indexOf("cityMaster") === -1) result.permissions.admin.push("cityMaster");
    if (result.permissions.sales && result.permissions.sales.indexOf("agentOrders") === -1) result.permissions.sales.push("agentOrders");
    if (result.permissions.executive && result.permissions.executive.indexOf("agentOrders") === -1) result.permissions.executive.push("agentOrders");
    result.agents = result.agents.filter(function (item) { return item && item.code && item.name; });
    if (!Array.isArray(result.cities)) result.cities = [];
    result.cities = result.cities.filter(function (item) { return item && item.code && item.name; });
    result.agents.forEach(function (item) {
      ["region", "contact", "phone", "note"].forEach(function (key) { if (typeof item[key] !== "string") item[key] = ""; });
      if (item.active === undefined) item.active = true;
    });
    result.agentOrders = result.agentOrders.filter(function (item) { return item && item.id && Array.isArray(item.lines); });
    result.agentOrders.forEach(function (item) {
      if (["draft", "confirmed", "cancelled"].indexOf(item.status) === -1) item.status = "confirmed";
      if (typeof item.month !== "string") item.month = "";
      if (typeof item.note !== "string") item.note = "";
      item.lines = item.lines.filter(function (line) { return line && line.productCode && Number(line.qty) > 0; });
      item.lines.forEach(function (line) {
        line.qty = Number(line.qty);
        line.price = line.price == null || line.price === "" || isNaN(Number(line.price)) ? null : Number(line.price);
        if (typeof line.note !== "string") line.note = "";
      });
    });
    result.salesRecords.forEach(function (item) {
      if (["agent", "direct"].indexOf(item.channel) === -1) item.channel = "direct";
      if (typeof item.agentOrderId !== "string") item.agentOrderId = "";
      if (typeof item.agentCode !== "string") item.agentCode = "";
    });
    if (typeof result.demoMode !== "boolean") result.demoMode = true;
    if (!LANGS[result.lang]) result.lang = "ar";
    if (!result.langOverrides || typeof result.langOverrides !== "object" || Array.isArray(result.langOverrides)) result.langOverrides = {};
    if (!result.branding || typeof result.branding !== "object") result.branding = {};
    if (typeof result.branding.name !== "string" || !result.branding.name.trim()) result.branding.name = "Ice Star";
    if (!result.branding.logo || typeof result.branding.logo !== "object" || !result.branding.logo.dataUrl) result.branding.logo = null;
    if (typeof result.branding.themeColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(result.branding.themeColor)) result.branding.themeColor = "";
    if (!Array.isArray(result.users)) result.users = [];
    result.users = result.users.filter(function (user) { return user && roles[user.role] && String(user.name || "").trim(); });
    result.users.forEach(function (user) {
      if (typeof user.passHash !== "string") user.passHash = "";
      // Schema v25: dashboard content is controlled per account by the system admin.
      // A missing key means the widget is visible; false means it is hidden.
      if (!user.dashboardWidgets || typeof user.dashboardWidgets !== "object" || Array.isArray(user.dashboardWidgets)) user.dashboardWidgets = {};
      if (!user.homeDashboardWidgets || typeof user.homeDashboardWidgets !== "object" || Array.isArray(user.homeDashboardWidgets)) user.homeDashboardWidgets = {};
    });
    if (!result.users.length) result.users = seedDefaultUsers();
    if (typeof result.currentUserId !== "string") result.currentUserId = "";
    if (result.currentUserId && !result.users.some(function (user) { return user.id === result.currentUserId; })) result.currentUserId = "";
    if (!result.execWidgets || typeof result.execWidgets !== "object" || Array.isArray(result.execWidgets)) result.execWidgets = {};
    if (!result.backupSettings || typeof result.backupSettings !== "object" || Array.isArray(result.backupSettings)) result.backupSettings = clone(defaultState.backupSettings);
    if (!result.warehouseReviews || typeof result.warehouseReviews !== "object" || Array.isArray(result.warehouseReviews)) result.warehouseReviews = {};
    if (!result.materialDispatches || typeof result.materialDispatches !== "object" || Array.isArray(result.materialDispatches)) result.materialDispatches = {};
    ["reminderEnabled", "autoEnabled"].forEach(function (key) { result.backupSettings[key] = Boolean(result.backupSettings[key]); });
    ["autoStartDate", "lastAutoBackupDate", "lastManualBackupAt", "lastReminderDate"].forEach(function (key) { if (typeof result.backupSettings[key] !== "string") result.backupSettings[key] = ""; });
    // Preserve the old single-dashboard preference for the account that was active
    // when this prototype is upgraded; subsequent changes are account-specific.
    if (savedSchemaVersion > 0 && savedSchemaVersion < 25 && Object.keys(result.execWidgets).length && result.currentUserId) {
      var legacyDashboardUser = result.users.find(function (user) { return user.id === result.currentUserId; });
      if (legacyDashboardUser && !Object.keys(legacyDashboardUser.dashboardWidgets).length) legacyDashboardUser.dashboardWidgets = clone(result.execWidgets);
    }
    result.products.forEach(function (item) {
      if (!Array.isArray(item.packingBom)) item.packingBom = [];
      item.packingBom = item.packingBom.filter(function (entry) { return entry && entry.materialCode && Number(entry.qtyPerUnit) > 0; });
    });
    if (savedSchemaVersion < APP_SCHEMA_VERSION) {
      ["admin", "executive"].forEach(function (role) {
        if (result.permissions[role].indexOf("executive") === -1) result.permissions[role].push("executive");
      });
    }
    if (savedSchemaVersion > 0 && savedSchemaVersion < 47 && result.permissions.production) {
      result.permissions.production = result.permissions.production.filter(function (page) { return page !== "materials"; });
      ["rawRequirements", "packingRequirements"].forEach(function (page) {
        if (result.permissions.production.indexOf(page) === -1) result.permissions.production.push(page);
      });
    }
    if (savedSchemaVersion > 0 && savedSchemaVersion < 51 && result.permissions.finance && result.permissions.finance.indexOf("forecasts") === -1) result.permissions.finance.push("forecasts");
    if (savedSchemaVersion > 0 && savedSchemaVersion < 27) {
      ["rmWarehouse", "procurement"].forEach(function (role) {
        if (result.permissions[role].indexOf("packingStock") === -1) result.permissions[role].push("packingStock");
      });
      if (result.permissions.rmWarehouse.indexOf("packingReceipts") === -1) result.permissions.rmWarehouse.push("packingReceipts");
    }
    if (savedSchemaVersion > 0 && savedSchemaVersion < 28 && result.permissions.admin.indexOf("packingMaster") === -1) result.permissions.admin.push("packingMaster");
    result.materials.forEach(function (item) { item.consumed = Number(item.consumed || 0); });
    if (savedSchemaVersion > 0 && savedSchemaVersion < 13) {
      // Migration v13: المالية أصبحت مراقبة بلا موافقات — تحديث صلاحياتها للعرض الشامل.
      result.permissions.finance = clone(defaultState.permissions.finance);
    }
    if (savedSchemaVersion > 0 && savedSchemaVersion < 14) {
      // Migration v14: شاشة الخطة الأسبوعية للمبيعات والإنتاج ومخزن FG.
      ["sales", "production", "fgWarehouse"].forEach(function (role) {
        if (result.permissions[role].indexOf("weekly") === -1) result.permissions[role].push("weekly");
      });
    }
    if (savedSchemaVersion > 0 && savedSchemaVersion < 15) {
      // Migration v15: شاشة المتابعة الشهرية للمبيعات والإنتاج والمالية والإدارة.
      ["sales", "production", "finance", "executive"].forEach(function (role) {
        if (result.permissions[role].indexOf("monthly") === -1) result.permissions[role].push("monthly");
      });
    }
    result.rawMaterials.forEach(function (item) {
      if (item.strategicStock == null || !validNumber(item.strategicStock, true)) item.strategicStock = null;
      else item.strategicStock = Number(item.strategicStock);
      // Schema 20: تفاصيل موسعة للمادة الأولية — كلها اختيارية بقيم افتراضية آمنة.
      // Schema v27: نوعان فقط؛ أي تصنيف قديم إضافي يرحّل إلى المواد الأولية.
      if (["raw", "packing"].indexOf(item.category) === -1) item.category = "raw";
      ["purchaseUnit", "packType", "packSize", "supplier", "originCountry", "currency", "qualityNote"].forEach(function (key) { if (typeof item[key] !== "string") item[key] = ""; });
      if (["dry", "chilled", "frozen", ""].indexOf(item.storage) === -1 || typeof item.storage !== "string") item.storage = typeof item.storage === "string" && ["dry", "chilled", "frozen"].indexOf(item.storage) !== -1 ? item.storage : "";
      ["conversionFactor", "piecesPerCarton", "approxPrice", "moq", "shelfLifeDays"].forEach(function (key) {
        if (item[key] == null || item[key] === "" || isNaN(Number(item[key]))) item[key] = null;
        else item[key] = Number(item[key]);
      });
      if (item.leadTimeDays == null || !validNumber(item.leadTimeDays, true)) item.leadTimeDays = null;
      else item.leadTimeDays = Number(item.leadTimeDays);
      if (item.storageCapacity == null || !validNumber(item.storageCapacity, true)) item.storageCapacity = null;
      else item.storageCapacity = Number(item.storageCapacity);
      if (item.openingQty == null || !validNumber(item.openingQty, true)) item.openingQty = null;
      else item.openingQty = Number(item.openingQty);
    });
    result.weeklyPlans.forEach(function (plan) {
      if (!Array.isArray(plan.history)) plan.history = [];
      if (!plan.approvals || typeof plan.approvals !== "object") plan.approvals = {};
      (plan.weeks || []).forEach(function (week) { if (!week.days || typeof week.days !== "object") week.days = {}; });
      // v18: مرونة الخطة (شهرية/أسبوعية/يومية) وموافقات على مستوى الوحدة.
      if (!plan.granularity) plan.granularity = "weekly";
      if (!plan.unitApprovals || typeof plan.unitApprovals !== "object") {
        plan.unitApprovals = {};
        (plan.weeks || []).forEach(function (week) {
          plan.unitApprovals[week.key] = {
            production: plan.approvals.production ? plan.approvals.production.at || "مرحّل" : null,
            fgWarehouse: plan.approvals.fgWarehouse ? plan.approvals.fgWarehouse.at || "مرحّل" : null
          };
        });
      }
    });
    if (savedSchemaVersion > 0 && savedSchemaVersion < 11) {
      // Migration v11: إلغاء بوابة الجودة — أي استلام مواد سابق لم يُرحّل رصيده يُرحّل الآن مباشرة،
      // ويُخصم كامل المتوقع من Inbound حتى لا يبقى وارد شبح يخفي النقص الحقيقي.
      result.rawReceipts.forEach(function (receipt) {
        if (receipt && receipt.status === "received" && !receipt.postedToStock) {
          var migCommitment = result.commitments.find(function (item) { return item.id === receipt.commitmentId; });
          var migMaterial = migCommitment && result.materials.find(function (item) { return item.id === migCommitment.materialId; });
          if (migMaterial) {
            migMaterial.onHand = Number(migMaterial.onHand || 0) + Number(receipt.received || 0);
            migMaterial.inbound = Math.max(0, Number(migMaterial.inbound || 0) - Number(receipt.qty || receipt.received || 0));
          }
          receipt.postedToStock = true;
        }
      });
    }
    result.forecasts = result.forecasts.filter(function (forecast) { return forecast && Array.isArray(forecast.items); }).map(function (forecast) {
      forecast.startDate = forecast.startDate || forecast.from || forecast.periodFrom || "";
      forecast.endDate = forecast.endDate || forecast.to || forecast.periodTo || forecast.startDate || "";
      // v13: نموذج شهري — كل مستند يحمل قائمة أشهر وكميات شهرية لكل منتج.
      if (!Array.isArray(forecast.months) || !forecast.months.length) {
        forecast.months = monthsBetween(monthKeyOf(forecast.startDate), monthKeyOf(forecast.endDate));
      }
      if (!Array.isArray(forecast.history)) forecast.history = [];
      forecast.items = forecast.items.map(function (line) {
        var productCode = normalizeCode(line.productCode || line.code || line.productId || "");
        var product = result.products.find(function (item) { return normalizeCode(item.code) === productCode; });
        var monthlyQty = line.monthlyQty && typeof line.monthlyQty === "object" ? line.monthlyQty : null;
        var totalQty = Number(line.qty != null ? line.qty : line.quantity != null ? line.quantity : line.forecastQty || 0);
        if (!monthlyQty) {
          monthlyQty = {};
          if (forecast.months.length) monthlyQty[forecast.months[0]] = totalQty;
        }
        var summed = Object.keys(monthlyQty).reduce(function (sum, key) { return sum + Number(monthlyQty[key] || 0); }, 0);
        return Object.assign({}, line, {
          productCode: productCode,
          productName: String(line.productName || line.product || (product && product.name) || productCode || "منتج غير مسمى"),
          unit: String(line.unit || (product && product.unit) || "وحدة"),
          monthlyQty: monthlyQty,
          qty: summed || totalQty
        });
      }).filter(function (line) { return line.productCode; });
      // v17: حقول فحص الجاهزية.
      if (forecast.supplyFeasibility === undefined) forecast.supplyFeasibility = null;
      if (forecast.readinessStale === undefined) forecast.readinessStale = false;
      // v13: ترحيل الحالات القديمة — وجود خطة معتمدة سابقًا يعني أن المستند كان مثبتًا عمليًا.
      if (["draft", "submitted", "production_feedback", "fixed", "cancelled"].indexOf(forecast.status) === -1) {
        var hadApprovedPlan = result.plans.some(function (plan) { return plan.forecastId === forecast.id && plan.status === "approved"; });
        forecast.status = hadApprovedPlan ? "fixed" : "submitted";
        if (hadApprovedPlan && !forecast.fixedAt) {
          var approvedPlan = result.plans.find(function (plan) { return plan.forecastId === forecast.id && plan.status === "approved"; });
          forecast.fixedAt = (approvedPlan && approvedPlan.salesDecisionAt) || forecast.submittedAt || "";
        }
      }
      // v17: المستندات المثبتة قبل هذا الإصدار تعتبر مؤكدة التوريد ترحيلًا (بعد تحويل الحالات القديمة).
      if (savedSchemaVersion > 0 && savedSchemaVersion < 17 && forecast.status === "fixed" && !forecast.supplyFeasibility) {
        forecast.supplyFeasibility = { confirmed: true, note: "مستند مثبت قبل اعتماد فحص الجاهزية", at: forecast.fixedAt || "" };
      }
      return forecast;
    });
    // v13: ربط الاحتياجات والفعلي القديم (planId) بالمستند والمنتج مباشرة.
    result.materials.forEach(function (item) {
      if (!item.forecastId && item.planId) {
        var reqPlan = result.plans.find(function (plan) { return plan.id === item.planId; });
        if (reqPlan) { item.forecastId = reqPlan.forecastId; item.productCode = normalizeCode(reqPlan.productCode); }
      }
      if (!item.monthlyQty || typeof item.monthlyQty !== "object") {
        item.monthlyQty = {};
        var reqMonth = monthKeyOf(item.needDate) || (function () {
          var reqForecast = result.forecasts.find(function (record) { return record.id === item.forecastId; });
          return reqForecast && reqForecast.months.length ? reqForecast.months[0] : "";
        })();
        if (reqMonth) item.monthlyQty[reqMonth] = Number(item.required || 0);
      }
      if (item.productionApproved == null) item.productionApproved = savedSchemaVersion > 0 && savedSchemaVersion < 13 ? true : false;
    });
    if (savedSchemaVersion > 0 && savedSchemaVersion < 16) {
      // Migration v16: الاحتياجات أصبحت إجمالية لكل مستند — دمج سجلات المنتجات لنفس المادة
      // مع جمع الكميات وإعادة ربط أوامر الشراء والوارد بالسجل المدموج.
      var mergedMaterials = [];
      result.materials.forEach(function (item) {
        var survivor = mergedMaterials.find(function (record) {
          return record.forecastId === item.forecastId && normalizeCode(record.materialCode) === normalizeCode(item.materialCode);
        });
        if (!survivor) {
          item.productCode = "";
          mergedMaterials.push(item);
          return;
        }
        survivor.required = Number(survivor.required || 0) + Number(item.required || 0);
        survivor.consumed = Number(survivor.consumed || 0) + Number(item.consumed || 0);
        survivor.inbound = Number(survivor.inbound || 0) + Number(item.inbound || 0);
        Object.keys(item.monthlyQty || {}).forEach(function (month) {
          survivor.monthlyQty[month] = Number(survivor.monthlyQty[month] || 0) + Number(item.monthlyQty[month] || 0);
        });
        if (item.stockConfirmed && !survivor.stockConfirmed) {
          survivor.stockConfirmed = true;
          survivor.stockConfirmedAt = item.stockConfirmedAt;
          survivor.onHand = item.onHand; survivor.reserved = item.reserved; survivor.hold = item.hold;
        } else if (item.stockConfirmed && survivor.stockConfirmed) {
          // كلا السجلين مؤكد: الرصيد الفيزيائي واحد، فنحتفظ بالأعلى بدل رمي رصيد استلام سبق ترحيله في v11.
          survivor.onHand = Math.max(Number(survivor.onHand || 0), Number(item.onHand || 0));
          survivor.reserved = Math.max(Number(survivor.reserved || 0), Number(item.reserved || 0));
          survivor.hold = Math.max(Number(survivor.hold || 0), Number(item.hold || 0));
        }
        survivor.productionApproved = Boolean(survivor.productionApproved && item.productionApproved);
        if (String(item.needDate || "9999") < String(survivor.needDate || "9999")) survivor.needDate = item.needDate;
        result.commitments.forEach(function (record) { if (record.materialId === item.id) record.materialId = survivor.id; });
      });
      result.materials = mergedMaterials;
    }
    // v18: موافقة المالية على أوامر الشراء — الأوامر القديمة تعتبر موافقًا عليها ترحيلًا.
    result.commitments.forEach(function (item) {
      if (!item.financeApproval || typeof item.financeApproval !== "object") {
        item.financeApproval = savedSchemaVersion > 0 && savedSchemaVersion < 18
          ? { status: "approved", note: "أمر سابق لاعتماد موافقة المالية", at: item.createdAt || "" }
          : { status: "pending", note: "", at: "" };
      }
    });
    result.actuals.forEach(function (item) {
      if (!item.forecastId && item.planId) {
        var actPlan = result.plans.find(function (plan) { return plan.id === item.planId; });
        if (actPlan) { item.forecastId = actPlan.forecastId; item.productCode = normalizeCode(actPlan.productCode); }
      }
      if (!item.month) item.month = monthKeyOf(item.date) || "";
    });
    // ===== تطبيع نهائي بعد كل الترحيلات =====
    // كان حقل رقمي مفقود يُنتج NaN يظهر «0» في الواجهة، فيختفي النقص ويختفي المتاح للبيع.
    // ويُوحَّد كود المادة هنا لمرة واحدة لأن كل القراء يقارنون بكود مُطبَّع.
    function normalizeNumbers(list, keys) {
      (list || []).forEach(function (item) {
        keys.forEach(function (key) {
          var value = Number(item[key]);
          item[key] = Number.isFinite(value) ? value : 0;
        });
      });
    }
    result.materials.forEach(function (item) {
      item.materialCode = normalizeCode(item.materialCode);
      if (!item.monthlyQty || typeof item.monthlyQty !== "object") item.monthlyQty = {};
      Object.keys(item.monthlyQty).forEach(function (month) {
        var value = Number(item.monthlyQty[month]);
        item.monthlyQty[month] = Number.isFinite(value) ? value : 0;
      });
    });
    normalizeNumbers(result.materials, ["required", "consumed", "onHand", "reserved", "hold", "inbound"]);
    normalizeNumbers(result.fgReceipts, ["produced", "received", "reserved", "blocked"]);
    normalizeNumbers(result.actuals, ["planned", "actual"]);
    normalizeNumbers(result.salesRecords, ["qty"]);
    normalizeNumbers(result.rawReceipts, ["qty", "received"]);
    normalizeNumbers(result.commitments, ["qty"]);
    normalizeNumbers(result.materialMoves, ["qty"]);
    normalizeNumbers(result.wasteRecords, ["qty"]);
    (result.wasteRecords || []).forEach(function (item) { item.materialCode = normalizeCode(item.materialCode); });
    (result.materialMoves || []).forEach(function (item) { item.materialCode = normalizeCode(item.materialCode); });
    // Migration v23: صندوق الموافقات وحدّ التفويض. الحالات القديمة لا تحمل الشاشة ولا الحدّ.
    if (!Number.isFinite(Number(result.approvalTolerancePct)) || Number(result.approvalTolerancePct) < 0) result.approvalTolerancePct = 5;
    if (savedSchemaVersion > 0 && savedSchemaVersion < 23 && result.permissions) {
      [["sales", "workflow"], ["production", "workflow"], ["fgWarehouse", "workflow"], ["finance", "home"]].forEach(function (pair) {
        var list = result.permissions[pair[0]];
        if (!Array.isArray(list) || list.indexOf("approvals") !== -1) return;
        var at = list.indexOf(pair[1]);
        list.splice(at === -1 ? list.length : at + 1, 0, "approvals");
      });
    }
    // Migration v24: القضايا القديمة تحمل «department» باسم دور المُبلِّغ وحده، بلا سبب ولا حل.
    if (savedSchemaVersion > 0 && savedSchemaVersion < 24) {
      result.issues.forEach(function (item) {
        if (!item.raisedBy) item.raisedBy = item.department || "";
        if (!item.departmentRole) {
          var deptMatch = Object.keys(roles).filter(function (key) { return roles[key].name === item.department; })[0];
          item.departmentRole = deptMatch || "";
        }
        if (!item.raisedByRole) item.raisedByRole = item.departmentRole || "";
        ["rootCause", "resolution", "prevention", "closedBy", "resolvedBy", "resolvedAt"].forEach(function (key) { if (typeof item[key] !== "string") item[key] = ""; });
      });
    }
    result.schemaVersion = APP_SCHEMA_VERSION;
    return result;
  }

  function monthKeyOf(value) {
    var match = /^(\d{4})-(\d{2})/.exec(String(value || ""));
    return match ? match[1] + "-" + match[2] : "";
  }

  function monthsBetween(fromMonth, toMonth) {
    if (!/^\d{4}-\d{2}$/.test(fromMonth)) return [];
    if (!/^\d{4}-\d{2}$/.test(toMonth)) toMonth = fromMonth;
    var list = [];
    var year = Number(fromMonth.slice(0, 4)), month = Number(fromMonth.slice(5, 7));
    var endYear = Number(toMonth.slice(0, 4)), endMonth = Number(toMonth.slice(5, 7));
    while (year < endYear || (year === endYear && month <= endMonth)) {
      list.push(year + "-" + String(month).padStart(2, "0"));
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      if (list.length >= 24) break;
    }
    return list;
  }

  function monthLabel(monthKey) {
    var names = { "01": "كانون الثاني", "02": "شباط", "03": "آذار", "04": "نيسان", "05": "أيار", "06": "حزيران", "07": "تموز", "08": "آب", "09": "أيلول", "10": "تشرين الأول", "11": "تشرين الثاني", "12": "كانون الأول" };
    var match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
    return match ? (names[match[2]] || match[2]) + " " + match[1] : String(monthKey || "—");
  }

  function forecastStatusInfo(value) {
    var map = {
      draft: ["مسودة محفوظة — لم تُرسل", "gray"],
      submitted: ["عند الإنتاج — بانتظار الرد", "blue"],
      production_feedback: ["رد الإنتاج — عند المبيعات", "amber"],
      finance_review: ["عند المالية — بانتظار المراجعة", "blue"],
      finance_sales_confirm: ["قرار المالية — عند المبيعات للتأكيد", "amber"],
      fixed: ["مثبت", "green"],
      cancelled: ["ملغي", "gray"]
    };
    return map[value] || [value || "—", "gray"];
  }

  function weeklyPlanStatusInfo(value) {
    var map = {
      awaiting_sales: ["عند المبيعات — بانتظار المراجعة", "blue"],
      awaiting_approvals: ["بانتظار اعتماد الإنتاج ومخزن FG", "amber"],
      approved: ["معتمدة", "green"]
    };
    return map[value] || [value || "—", "gray"];
  }

  function lastDayOfMonth(monthKey) {
    var match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
    if (!match) return 28;
    return new Date(Number(match[1]), Number(match[2]), 0).getDate();
  }

  // أسابيع الشهر أربعة مقاطع ثابتة: 1-7، 8-14، 15-21، 22-نهاية الشهر.
  function weeksOfMonth(monthKey) {
    var last = lastDayOfMonth(monthKey);
    var segments = [[1, 7], [8, 14], [15, 21], [22, last]];
    return segments.map(function (seg, index) {
      var pad = function (n) { return String(n).padStart(2, "0"); };
      return {
        key: "W" + (index + 1),
        start: monthKey + "-" + pad(seg[0]),
        end: monthKey + "-" + pad(seg[1]),
        label: "الأسبوع " + (index + 1) + " (" + pad(seg[0]) + "–" + pad(seg[1]) + ")"
      };
    });
  }

  // قاعدة التجميد: لا تعديل داخل أسبوع الإنتاج؛ التعديل قبل بداية الأسبوع بيومين على الأقل.
  function weekEditable(week) {
    return String(week.start) >= dateDaysFromNow(2);
  }

  function weeklyPlanFor(forecastId, productCode, month) {
    return state.weeklyPlans.find(function (plan) {
      return plan.forecastId === forecastId && normalizeCode(plan.productCode) === normalizeCode(productCode) && plan.month === month;
    });
  }

  // لا تُبنى الخطة الأسبوعية قبل أن تُغلق خطة الشراء: المواد المغطاة من المخزن تمر،
  // أما أي نقص فيحتاج التزام شراء وافقت عليه المالية.
  function forecastPurchasePlanApproved(forecastId) {
    var requirements = forecastRequirements(forecastId);
    if (!requirements.length && state.rawMaterials.some(function (item) { return item.active !== false; })) return false;
    return requirements.every(function (material) {
      if (!material.stockConfirmed) return false;
      if (materialShortage(material) <= QTY_EPSILON) return true;
      return state.commitments.some(function (commitment) {
        return commitment.materialId === material.id && commitment.status !== "cancelled" && commitment.financeApproval && commitment.financeApproval.status === "approved";
      });
    });
  }

  // أهداف التقسيم: كل (منتج × شهر) في مستند مثبت كميته > 0 وليس له خطة أسبوعية بعد.
  function pendingWeeklyPlanTargets() {
    var targets = [];
    state.forecasts.filter(function (item) { return item.status === "fixed" && forecastPurchasePlanApproved(item.id); }).forEach(function (forecast) {
      forecast.items.forEach(function (line) {
        forecast.months.forEach(function (month) {
          var qty = Number(line.monthlyQty[month] || 0);
          if (qty <= 0) return;
          if (!weeklyPlanFor(forecast.id, line.productCode, month)) {
            targets.push({ forecast: forecast, line: line, month: month, qty: qty });
          }
        });
      });
    });
    return targets;
  }

  // ===== صافي احتياج المنتج النهائي (MPS) =====
  // كانت خطة الإنتاج تساوي الفوركاست كاملًا فوق أي رصيد قائم: 3,000 في المخزن وفوركاست 10,000
  // يعني إنتاج 10,000 والصحيح 7,000. الآن يُخصم المتاح من أقرب الأشهر أولًا.
  function productionNetPlanFor(productCode) {
    var rows = [];
    state.forecasts.filter(function (item) { return item.status === "fixed"; }).forEach(function (forecast) {
      forecast.items.forEach(function (line) {
        if (normalizeCode(line.productCode) !== normalizeCode(productCode)) return;
        forecast.months.forEach(function (month) {
          var gross = Number(line.monthlyQty[month] || 0);
          if (gross <= 0) return;
          rows.push({
            forecastId: forecast.id, productCode: line.productCode, productName: line.productName,
            unit: line.unit || "", month: month, gross: gross,
            produced: producedQty(forecast.id, line.productCode, month)
          });
        });
      });
    });
    rows.sort(function (a, b) { return String(a.month).localeCompare(String(b.month)) || String(a.forecastId).localeCompare(String(b.forecastId)); });
    var pool = productNetAvailable(productCode);
    rows.forEach(function (row) {
      var open = Math.max(0, roundQty(row.gross - row.produced));
      var fromStock = Math.min(open, pool);
      pool = roundQty(pool - fromStock);
      row.fromStock = roundQty(fromStock);
      // الصافي هدف إنتاج، فيُقرَّب إلى كرتون كامل: لا خطة بنصف كرتون.
      row.net = planQty(open - fromStock);
    });
    return rows;
  }

  function productionNetNeed(forecastId, productCode, month) {
    var row = productionNetPlanFor(productCode).find(function (item) {
      return item.forecastId === forecastId && item.month === month;
    });
    return row ? row.net : 0;
  }

  function weeklyPlanFullyApproved(plan) {
    return plan.status === "approved";
  }

  // منع التجاوز: لا تنفيذ لشهر قبل اكتمال اعتماد خطته من الطرفين (كل الوحدات).
  function weeklyPlanApprovedFor(forecastId, productCode, month) {
    var plan = weeklyPlanFor(forecastId, productCode, month);
    return Boolean(plan && plan.status === "approved");
  }

  var GRANULARITY_LABELS = { monthly: "شهرية (كتلة واحدة)", weekly: "أسبوعية", daily: "يومية" };

  // وحدات الاعتماد حسب مرونة الخطة: الشهر كتلة، أو الأسابيع، أو الأيام الموزعة.
  function planUnits(plan) {
    var units = [];
    (plan.weeks || []).forEach(function (week) {
      var dayKeys = plan.granularity === "daily" ? Object.keys(week.days || {}).filter(function (key) { return Number(week.days[key]) > 0; }).sort() : [];
      if (dayKeys.length) {
        dayKeys.forEach(function (dateKey) { units.push({ key: dateKey, label: "يوم " + dateKey, qty: Number(week.days[dateKey]) }); });
      } else {
        units.push({ key: week.key, label: week.label, qty: Number(week.qty || 0) });
      }
    });
    return units;
  }

  function unitApprovedBy(plan, unitKey, roleKey) {
    return Boolean(plan.unitApprovals && plan.unitApprovals[unitKey] && plan.unitApprovals[unitKey][roleKey]);
  }

  function planApprovalProgress(plan, roleKey) {
    var units = planUnits(plan);
    var done = units.filter(function (unit) { return unitApprovedBy(plan, unit.key, roleKey); }).length;
    return { done: done, total: units.length };
  }

  function planFullyApprovedByRole(plan, roleKey) {
    var progress = planApprovalProgress(plan, roleKey);
    return progress.total > 0 && progress.done === progress.total;
  }

  function recomputePlanApproval(plan) {
    if (plan.status !== "awaiting_approvals") return;
    if (planFullyApprovedByRole(plan, "production") && planFullyApprovedByRole(plan, "fgWarehouse")) {
      plan.status = "approved";
      plan.approvedAt = currentTimestamp();
      plan.approvals = { production: { at: plan.approvedAt }, fgWarehouse: { at: plan.approvedAt } };
      addAudit("اكتمال اعتماد كل وحدات الخطة " + plan.id + " (الإنتاج + مخزن FG)", "EMICP");
    }
  }

  function approvePlanUnits(plan, roleKey, unitKeys) {
    var stamp = currentTimestamp();
    var count = 0;
    if (!plan.unitApprovals) plan.unitApprovals = {};
    unitKeys.forEach(function (unitKey) {
      if (!plan.unitApprovals[unitKey]) plan.unitApprovals[unitKey] = { production: null, fgWarehouse: null };
      if (!plan.unitApprovals[unitKey][roleKey]) { plan.unitApprovals[unitKey][roleKey] = stamp; count += 1; }
    });
    return count;
  }

  function productSoldQty(productCode) {
    return state.salesRecords.filter(function (item) { return normalizeCode(item.productCode) === normalizeCode(productCode); })
      .reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function productNetAvailable(productCode) {
    var available = state.fgReceipts.filter(function (item) { return normalizeCode(item.productCode) === normalizeCode(productCode); })
      .reduce(function (sum, item) { return sum + fgAvailable(item); }, 0);
    return Math.max(0, available - productSoldQty(productCode));
  }

  // آخر رصيد فعلي معروف لكود المادة (من أحدث سجل مؤكد).
  function materialOnHandByCode(code) {
    var confirmed = state.materials.filter(function (item) { return normalizeCode(item.materialCode) === normalizeCode(code) && item.stockConfirmed; });
    if (!confirmed.length) {
      var master = rawMasterByCode(code);
      return master && Number.isFinite(Number(master.openingQty)) ? Number(master.openingQty) : null;
    }
    confirmed.sort(function (a, b) { return String(b.stockConfirmedAt || "").localeCompare(String(a.stockConfirmedAt || "")); });
    return Number(confirmed[0].onHand || 0);
  }

  // تنبيهات المخزون الاستراتيجي: مواد رصيدها المعروف تحت الحد الذي وضعه الإنتاج والمشتريات.
  function strategicAlerts() {
    return state.rawMaterials.filter(function (item) { return item.active !== false && item.strategicStock != null; }).map(function (item) {
      var onHand = materialOnHandByCode(item.code);
      return { master: item, onHand: onHand, gap: onHand == null ? null : Math.max(0, Number(item.strategicStock) - onHand) };
    }).filter(function (entry) { return entry.onHand != null && entry.onHand < Number(entry.master.strategicStock); });
  }

  // ===== التوالف (Schema 21): تخصم من الرصيد الفيزيائي وتظهر في الحركة والتقارير =====
  var WASTE_REASONS = { damage: "تلف", expiry: "انتهاء صلاحية", breakage: "كسر", loss: "فقد", quality: "رفض جودة", other: "أخرى" };

  function wasteReasonLabel(reason) {
    return WASTE_REASONS[reason] || WASTE_REASONS.other;
  }

  function wasteQtyForCode(code) {
    return (state.wasteRecords || []).filter(function (item) { return normalizeCode(item.materialCode) === normalizeCode(code); })
      .reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function totalWasteQty() {
    return (state.wasteRecords || []).reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function recordMaterialMove(type, master, qty, month, ref) {
    state.materialMoves.unshift({ id: createId("MV"), type: type, materialCode: master.materialCode || master.code, material: master.material || master.name, unit: master.unit || "", qty: Number(qty || 0), month: month || "", ref: ref || "", at: currentTimestamp() });
    if (state.materialMoves.length > 400) state.materialMoves = state.materialMoves.slice(0, 400);
  }

  function movesInMonth(code, month, type) {
    return state.materialMoves.filter(function (item) {
      return normalizeCode(item.materialCode) === normalizeCode(code) && item.month === month && item.type === type;
    }).reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function soldInMonth(productCode, month) {
    return state.salesRecords.filter(function (item) {
      return normalizeCode(item.productCode) === normalizeCode(productCode) && monthKeyOf(item.date) === month;
    }).reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function rawMasterByCode(code, category) {
    return state.rawMaterials.find(function (item) {
      return normalizeCode(item.code) === normalizeCode(code) && (!category || item.category === category);
    });
  }

  function leadTimeBadge(materialCode) {
    var master = rawMasterByCode(materialCode);
    if (!master || master.leadTimeDays == null) return "";
    return '<br><small>مدة التوريد ~' + formatNumber(master.leadTimeDays) + ' يوم</small>';
  }

  // ===== وحدة الشراء ومدة التوريد =====
  // كانت كمية أمر الشراء تُرسل بوحدة الاستهلاك: نقص 5000 كغم يُطلب 5000 كيس.
  // الآن تُحسب بوحدة الشراء عبر معامل التحويل، ويُرفع الحد الأدنى للمورد، ويبقى المخزون بوحدة الاستهلاك.
  function purchasePlanFor(materialCode, shortage) {
    var master = rawMasterByCode(materialCode);
    var factor = master && Number(master.conversionFactor) > 0 ? Number(master.conversionFactor) : 1;
    var moq = master && Number(master.moq) > 0 ? Number(master.moq) : 0;
    var need = roundQty(Math.max(0, Number(shortage || 0)));
    var orderQty = factor > 1 ? Math.ceil(roundQty(need / factor)) : need;
    var moqApplied = false;
    if (moq > 0 && orderQty < moq) { orderQty = moq; moqApplied = true; }
    return {
      factor: factor,
      moq: moq,
      moqApplied: moqApplied,
      purchaseUnit: master && master.purchaseUnit ? master.purchaseUnit : "",
      orderQty: roundQty(orderQty),
      consumptionQty: roundQty(orderQty * factor)
    };
  }

  // آخر موعد لإصدار الأوردر حتى تصل المادة قبل تاريخ الحاجة.
  function latestOrderDate(materialCode, needDate) {
    var master = rawMasterByCode(materialCode);
    if (!master || master.leadTimeDays == null || !needDate) return "";
    return shiftDate(needDate, -Number(master.leadTimeDays));
  }

  // لا تُفقد بيانات بصمت: أي تلف في التخزين يُحفظ في مفتاح جانبي قبل العودة إلى حالة فارغة،
  // ويُرفع تنبيه ظاهر بدل أن يبتلعه catch كما كان.
  var storageAlert = null;

  function backupCorruptState(raw, error) {
    storageAlert = { kind: "corrupt", detail: String(error && error.message || error || "") };
    try {
      if (raw) window.localStorage.setItem(STORAGE_KEY + "-corrupt", raw);
    } catch (backupError) { /* تعذر حفظ النسخة الاحتياطية — التنبيه يبقى قائمًا */ }
  }

  function loadState() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(defaultState);
      return normalizeLoadedState(JSON.parse(saved));
    } catch (error) {
      backupCorruptState(saved, error);
      return clone(defaultState);
    }
  }

  var state = loadState();
  var executiveFilters = { health: "all", stage: "all", product: "all", from: "", to: "", sort: "risk", query: "" };

  // فشل الحفظ لم يعد صامتًا: امتلاء مساحة المتصفح كان يُبتلع بينما تقول الواجهة «تم الحفظ».
  // ===== حفظ مؤجَّل للعمليات الجماعية =====
  // addAudit كان يحفظ الحالة كاملة بعد كل سطر، واعتماد الوحدات يضيف سطرًا ثانيًا عند اكتمال الخطة.
  // اعتماد مئة بند = نحو مئتَي تسلسل كامل للحالة (مستندات 139 منتجًا × 12 شهرًا وكل الخطط)
  // وكتابتها في localStorage قبل أن تظهر النتيجة — وهذا سبب تأخّر زر «اعتماد المحدد».
  // withBatchedSave يجمع كل ذلك في حفظة واحدة عند نهاية العملية.
  var deferSaveDepth = 0;

  function withBatchedSave(work) {
    deferSaveDepth += 1;
    var result;
    try {
      result = work();
    } finally {
      deferSaveDepth -= 1;
      if (deferSaveDepth === 0) saveState();
    }
    return result;
  }

  function saveState() {
    if (deferSaveDepth > 0) return true;
    state.schemaVersion = APP_SCHEMA_VERSION;
    archiveAutomaticBackupIfDue();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (storageAlert && storageAlert.kind !== "corrupt") storageAlert = null;
      return true;
    } catch (error) {
      var quota = Boolean(error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22));
      storageAlert = { kind: quota ? "quota" : "save", detail: String(error && error.message || error || "") };
      showToast(quota
        ? "لم يُحفظ التغيير: مساحة المتصفح ممتلئة. احذف مرفقات كوتيشن قديمة أو صدّر البيانات قبل المتابعة."
        : "تعذر حفظ التغيير في هذا المتصفح؛ لا تغلق الصفحة قبل تصدير البيانات.", "error");
      return false;
    }
  }

  function backupFileName(prefix) {
    return "EMICP-" + prefix + "-" + currentTimestamp().replace(/[ :]/g, "-") + ".json";
  }

  function backupPayload(kind) {
    return JSON.stringify({ app: "EMICP", backupType: kind, exportedAt: currentTimestamp(), schemaVersion: APP_SCHEMA_VERSION, state: clone(state) }, null, 2);
  }

  // المتصفح لا يستطيع تنزيل ملف تلقائيًا بلا تفاعل من المستخدم؛ النسخ التلقائي يُحفظ محليًا كأرشيف مستقل.
  function archiveAutomaticBackupIfDue() {
    var settings = state.backupSettings || {};
    var today = toDateInput(new Date());
    if (!settings.autoEnabled || (settings.autoStartDate && today < settings.autoStartDate) || settings.lastAutoBackupDate === today) return;
    try {
      window.localStorage.setItem(STORAGE_KEY + "-auto-backup", backupPayload("automatic"));
      settings.lastAutoBackupDate = today;
    } catch (error) { /* لا نوقف حفظ بيانات التشغيل إن امتلأت مساحة الأرشيف */ }
  }

  function exportManualBackup() {
    if (state.role !== "admin") { showToast("النسخ الاحتياطي لمسؤول النظام فقط.", "error"); return; }
    state.backupSettings.lastManualBackupAt = currentTimestamp();
    var payload = backupPayload("manual");
    saveState();
    if (downloadTextFile(backupFileName("backup"), payload, "application/json")) showToast("تم تنزيل نسخة احتياطية كاملة. احتفظ بها في مكان آمن.");
  }

  function notifyBackupReminder() {
    var settings = state.backupSettings || {};
    var today = toDateInput(new Date());
    if (state.role !== "admin" || !settings.reminderEnabled || settings.lastReminderDate === today) return;
    settings.lastReminderDate = today;
    saveState();
    window.setTimeout(function () { showToast("تذكير النسخ الاحتياطي اليومي: نزّل نسخة من شاشة مسؤول النظام.", "error"); }, 200);
  }

  function syncStateFromStorage() {
    var currentView = { role: state.role, page: state.page, loggedIn: state.loggedIn, currentUserId: state.currentUserId };
    var latest = loadState();
    latest.role = currentView.role;
    latest.page = currentView.page;
    latest.loggedIn = currentView.loggedIn;
    latest.currentUserId = currentView.currentUserId;
    state = latest;
    if (!canAccess(state.page)) state.page = "home";
  }

  // إيقاف مستخدم أو حذفه كان لا يقطع جلسته: المزامنة كانت تُعيد فرض الجلسة القديمة فوق الحالة الجديدة.
  function sessionStillValid() {
    if (!state.loggedIn) return true;
    if (!state.currentUserId) return true;
    var user = state.users.find(function (item) { return item.id === state.currentUserId; });
    return Boolean(user && user.active !== false);
  }

  function endInvalidSession() {
    var wasUser = state.currentUserId;
    state.loggedIn = false;
    state.currentUserId = "";
    saveState();
    renderLogin();
    showToast(wasUser ? "أُنهيت جلستك: الحساب أُوقف أو حُذف من لوحة التحكم." : "أُنهيت الجلسة.", "error");
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ===== المستخدمون والهوية: يديرهما مسؤول النظام (Schema 19) =====
  function seedDefaultUsers() {
    return Object.keys(roles).map(function (key) {
      return { id: "U-" + key, name: roles[key].name, role: key, active: true, createdAt: "", dashboardWidgets: {}, homeDashboardWidgets: {} };
    });
  }

  // كلمة المرور تخزن كبصمة djb2 بسيطة — نموذج محلي وليست حماية إنتاجية.
  function hashPassword(text) {
    var value = String(text || "");
    if (!value) return "";
    var hash = 5381;
    for (var i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
    }
    return "h" + (hash >>> 0).toString(36) + value.length;
  }

  function activeUsers() {
    return (state.users || []).filter(function (user) { return user.active !== false; });
  }

  function currentUser() {
    return (state.users || []).find(function (user) { return user.id === state.currentUserId; }) || null;
  }

  function activeAdminCount(excludeId) {
    return activeUsers().filter(function (user) { return user.role === "admin" && user.id !== excludeId; }).length;
  }

  function brandName() {
    return (state.branding && state.branding.name) || "Ice Star";
  }

  function brandMarkHtml() {
    if (state.branding && state.branding.logo && state.branding.logo.dataUrl) {
      return '<img class="brand-logo" src="' + state.branding.logo.dataUrl + '" alt="' + esc(brandName()) + '">';
    }
    var initials = brandName().trim().split(/\s+/).map(function (word) { return word.charAt(0); }).join("").slice(0, 2).toUpperCase() || "IS";
    return '<div class="brand-mark">' + esc(initials) + '</div>';
  }

  function mixHexColors(hexA, hexB, weightB) {
    var parse = function (hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; };
    var a = parse(hexA);
    var b = parse(hexB);
    return "#" + a.map(function (channel, index) {
      var value = Math.round(channel * (1 - weightB) + b[index] * weightB);
      return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    }).join("");
  }

  var THEME_VARS = ["--navy-950", "--navy-900", "--navy-800", "--teal-700", "--teal-600", "--teal-100"];

  function applyBranding() {
    var rootStyle = document.documentElement.style;
    var color = (state.branding && state.branding.themeColor) || "";
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      rootStyle.setProperty("--navy-900", color);
      rootStyle.setProperty("--navy-950", mixHexColors(color, "#000000", 0.3));
      rootStyle.setProperty("--navy-800", mixHexColors(color, "#ffffff", 0.12));
      rootStyle.setProperty("--teal-700", color);
      rootStyle.setProperty("--teal-600", mixHexColors(color, "#ffffff", 0.12));
      rootStyle.setProperty("--teal-100", mixHexColors(color, "#ffffff", 0.9));
    } else {
      THEME_VARS.forEach(function (name) { rootStyle.removeProperty(name); });
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#103f4a");
    document.title = brandName() + " — EMICP";
  }

  function readBrandingLogo(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type || "")) { showToast("اختر ملف صورة للوغو (PNG أو JPG أو SVG).", "error"); input.value = ""; return; }
    if (file.size > 300 * 1024) { showToast("اللوغو أكبر من 300KB — صغّره ثم أعد الرفع.", "error"); input.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () {
      state.branding.logo = { name: file.name, type: file.type, dataUrl: String(reader.result) };
      addAudit("تحديث اللوغو (" + file.name + ")", roleName(state.role));
      saveState();
      renderApp();
      showToast("حُفظ اللوغو وأصبح ظاهرًا في الواجهة ولوحة الدخول.", "success");
    };
    reader.onerror = function () { showToast("تعذر قراءة الملف.", "error"); };
    reader.readAsDataURL(file);
  }

  function roleName(key) {
    return roles[key] ? roles[key].name : key;
  }

  function roleOptions(selected) {
    var counts = typeof roleTaskCounts === "function" ? roleTaskCounts() : {};
    return Object.keys(roles).map(function (key) {
      var badge = counts[key] ? " — " + formatNumber(counts[key]) + " " + (counts[key] === 1 ? "مهمة" : "مهام") : "";
      return '<option value="' + key + '"' + (key === selected ? " selected" : "") + '>' + esc(roles[key].name + badge) + '</option>';
    }).join("");
  }

  function allowedPages(role) {
    var assigned = state.permissions[role] || ["home"];
    return pageOrder.filter(function (page) {
      return assigned.indexOf(page) !== -1 && !pageProtectedForRole(role, page);
    });
  }

  function canAccess(page) {
    return allowedPages(state.role).indexOf(page) !== -1;
  }

  function addAudit(text, actor) {
    var stamp = currentTimestamp();
    state.audit.unshift({ time: stamp, actor: actor || roleName(state.role), text: text });
    state.audit = state.audit.slice(0, 200);
    saveState();
  }

  function status(text, tone) {
    return '<span class="status ' + (tone || "") + '">' + esc(text) + '</span>';
  }

  function statusInfo(value) {
    var map = {
      confirmed: ["مؤكد", "green"], submitted: ["مرسل", "blue"], waiting_sales: ["بانتظار المبيعات", "amber"],
      approved: ["معتمد", "green"], needs_revision: ["يحتاج تعديلًا", "red"], available: ["متاح", "green"],
      resolved: ["انحلّت — بانتظار التحقق", "blue"],
      shortage: ["نقص مؤكد", "red"], pending: ["بانتظار القرار", "amber"], verified: ["Verified", "green"],
      blocked: ["Blocked", "red"], exception: ["Exception", "red"], in_transit: ["In Transit", "amber"],
      expected: ["متوقع", "blue"], received: ["مستلم", "blue"], released: ["Released", "green"],
      hold: ["Hold", "amber"], rejected: ["Rejected", "red"], completed: ["مكتمل", "green"],
      open: ["مفتوح", "red"], closed: ["مغلق", "green"], monitoring: ["مراقبة", "amber"], replaced: ["مستبدل", "gray"],
      issued: ["مصروف للإنتاج", "green"], partial: ["استلام جزئي", "amber"], cancelled: ["ملغي", "gray"]
    };
    return map[value] || [value || "—", "gray"];
  }

  function statusByValue(value) {
    var info = statusInfo(value);
    return status(info[0], info[1]);
  }

  // القيمة غير الرقمية كانت تُعرض «0» فتُخفي خطأ الحساب؛ صارت تُعرض «—» ليظهر الخلل بدل أن يُموَّه.
  function formatNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("en-US");
  }

  // تدوير كميات المخزون: بقايا الفواصل العشرية (1.42e-14) كانت تُجمّد المستند وتولّد نقصًا وهميًا.
  var QTY_EPSILON = 1e-6;

  // ===== كمية الخطة بالكرتون الكامل =====
  // الفوركاست قد يصل بكسور (0.618 كرتون) من التحويل أو التجميع، لكن المصنع لا يُنتج نصف كرتون.
  // كل رقم يدخل خطة (شهرية أو أسبوعية) أو تشغيلًا يُقرَّب إلى كرتون كامل، وأي حاجة أكبر من صفر
  // لا تنزل عن كرتون واحد — وإلا صار في الخطة سطر لا يمكن تنفيذه.
  function planQty(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.max(1, Math.round(number));
  }

  function roundQty(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * 1e6) / 1e6;
  }

  function forecastTotalQty(forecast) {
    return (forecast && forecast.items || []).reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function frequencyLabel(value) {
    var labels = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري", custom: "فترة مخصصة" };
    return labels[value] || value || "—";
  }

  function forecastPeriod(forecast) {
    if (!forecast) return "—";
    if (Array.isArray(forecast.months) && forecast.months.length) {
      return forecast.months.length === 1 ? monthLabel(forecast.months[0]) : monthLabel(forecast.months[0]) + " → " + monthLabel(forecast.months[forecast.months.length - 1]) + " (" + forecast.months.length + " أشهر)";
    }
    return forecast.startDate + " → " + forecast.endDate;
  }

  function summary(title, value, copy, tone, icon) {
    return '<article class="summary ' + (tone || "") + '"><div class="summary-top"><span>' + esc(title) + '</span><span class="summary-icon" aria-hidden="true">' + esc(icon) + '</span></div><strong>' + esc(value) + '</strong><small>' + esc(copy) + '</small></article>';
  }

  function pageHead(kicker, title, copy, actions) {
    return '<header class="page-head"><div><span class="eyebrow">' + esc(kicker) + '</span><h1>' + esc(title) + '</h1><p>' + esc(copy) + '</p></div><div class="page-actions">' + (actions || "") + '</div></header>';
  }

  function boundary() {
    return '<div class="role-boundary"><strong>حدود دورك:</strong> ' + esc(roles[state.role].boundary) + '</div>';
  }

  function card(title, copy, body, trailing) {
    return '<article class="card"><div class="card-head"><div><h2>' + esc(title) + '</h2><p>' + esc(copy || "") + '</p></div>' + (trailing || "") + '</div><div class="card-body">' + body + '</div></article>';
  }

  function empty(title, copy, action) {
    return '<div class="empty" role="status"><strong>' + esc(title) + '</strong><p>' + esc(copy) + '</p>' + (action ? '<div class="empty-action">' + action + '</div>' : '') + '</div>';
  }

  // كل الخطوات المستحقة الآن عبر جميع الطلبيات — لا تُخفي طلبية جديدة خطوات طلبية قديمة.
  function activeForecasts() {
    return state.forecasts.filter(function (item) { return item.status !== "cancelled" && item.status !== "draft"; });
  }

  function fixedForecasts() {
    return state.forecasts.filter(function (item) { return item.status === "fixed"; });
  }

  // الاحتياجات إجمالية لكل المستند: سجل واحد لكل مادة يجمع كل المنتجات.
  function forecastRequirements(forecastId) {
    return state.materials.filter(function (item) { return item.forecastId === forecastId; });
  }

  function requirementMonthsCell(item) {
    var entries = Object.keys(item.monthlyQty || {}).filter(function (key) { return Number(item.monthlyQty[key]) > 0; }).sort();
    if (!entries.length) return '<time class="need-date">' + esc(item.needDate || "—") + '</time>';
    return entries.map(function (key) { return '<small class="req-po">' + esc(monthLabel(key)) + ': <span class="number">' + formatNumber(item.monthlyQty[key]) + '</span></small>'; }).join("<br>");
  }

  // «لا احتياجات» كان يعني «غير جاهز للأبد»: مستند ثُبِّت بلا مواد فعّالة يعلق بلا أي إجراء يحرّكه.
  function productMaterialsReady(forecastId) {
    var requirements = forecastRequirements(forecastId);
    if (!requirements.length) return !state.rawMaterials.some(function (item) { return item.active !== false; });
    return requirements.every(function (item) {
      return item.stockConfirmed && materialAllocatedAvailable(item) >= effectiveRequired(item);
    });
  }

  function producedQty(forecastId, productCode, month) {
    return state.actuals.filter(function (item) {
      return item.forecastId === forecastId && normalizeCode(item.productCode) === normalizeCode(productCode) && (!month || item.month === month);
    }).reduce(function (sum, item) { return sum + Number(item.actual || 0); }, 0);
  }

  // أزواج (منتج × شهر) الجاهزة لتسجيل الفعلي.
  // includeCompleted: الشهر المكتمل كان يختفي من الجدول فور تسجيله، فلا يرى الإنتاج ما سجّله
  // ولا يكتشف خطأً في الكمية. صار يبقى ظاهرًا مقفلًا بحالة «مكتمل».
  function productionEntries(includeCompleted) {
    var entries = [];
    fixedForecasts().forEach(function (forecast) {
      if (!productMaterialsReady(forecast.id)) return;
      forecast.items.forEach(function (line) {
        forecast.months.forEach(function (month) {
          var planned = Number(line.monthlyQty[month] || 0);
          if (planned <= 0) return;
          // منع التجاوز: لا تشغيل لشهر خطته الأسبوعية غير معتمدة من الإنتاج ومخزن FG.
          if (!weeklyPlanApprovedFor(forecast.id, line.productCode, month)) return;
          var produced = producedQty(forecast.id, line.productCode, month);
          var done = produced >= planQty(planned) - QTY_EPSILON;
          if (done && !includeCompleted) return;
          // التشغيل يُقاس بالكرتون الكامل مثل الخطة، فالمتبقي لا يكون كسرًا لا يُنتَج.
          var plannedWhole = planQty(planned);
          var producedWhole = roundQty(produced);
          entries.push({
            forecast: forecast, line: line, month: month, planned: plannedWhole,
            produced: producedWhole, remaining: Math.max(0, plannedWhole - Math.round(producedWhole)),
            state: done ? "مكتمل" : produced > QTY_EPSILON ? "جزئي" : "لم يبدأ"
          });
        });
      });
    });
    return entries;
  }

  function pendingProductionEntries() {
    return productionEntries(false);
  }

  // النقص يصل مباشرة من المخزن إلى المشتريات — أمر الشراء النهائي قرار المشتريات ولا يُتجاوز.
  // فور تأكيد المخزن للرصيد وظهور نقص، يمكن للمشتريات إصدار أمر الشراء مباشرة — بلا انتظار تثبيت المستند.
  function materialForecastFixed(item) {
    var forecast = state.forecasts.find(function (record) { return record.id === item.forecastId; });
    return Boolean(forecast && forecast.status === "fixed");
  }

  // لا يصل أي نقص إلى المشتريات إلا بعد الدورة: مخزن ← إنتاج ← مخزن تأكيد ← إنتاج ← مشتريات.
  function warehouseReviewReleased(item) {
    var category = item && item.category === "packing" ? "packing" : "raw";
    return Boolean(state.warehouseReviews && state.warehouseReviews[category] && state.warehouseReviews[category].status === "released_procurement");
  }

  function procurementReleaseExists() {
    return Object.keys(state.warehouseReviews || {}).some(function (category) {
      return state.warehouseReviews[category] && state.warehouseReviews[category].status === "released_procurement";
    });
  }

  function purchasableShortages() {
    return state.materials.filter(function (item) {
      // لا يصل النقص للمشتريات قبل أن يثبّت الإنتاج الكميات بعد مقارنة المستودعات.
      return materialForecastFixed(item) && item.stockConfirmed && warehouseReviewReleased(item) && materialShortage(item) > 0;
    });
  }

  // ===== الصافي الزمني للمواد (MRP) =====
  // كان الصافي يُحسب على الإجمالي مقابل رصيد اليوم: احتياج سنة كامل يظهر نقصًا واحدًا يُشترى الآن،
  // فتُجمَّد السيولة وتُخزَّن مواد لها صلاحية شهورًا بلا حاجة. الآن: جدول شهري بترحيل الرصيد.
  function codeMaterialRecords(code) {
    return materialRecordsSameCode(code);
  }

  // الاستهلاك يأكل أقدم الأشهر أولًا، فالمتبقي من كل شهر هو حاجته الحقيقية القادمة.
  function monthlyRequirementForCode(code) {
    var monthly = {};
    codeMaterialRecords(code).forEach(function (item) {
      var consumedLeft = Number(item.consumed || 0);
      Object.keys(item.monthlyQty || {}).sort().forEach(function (month) {
        var qty = Number(item.monthlyQty[month] || 0);
        if (qty <= 0) return;
        var eaten = Math.min(qty, consumedLeft);
        consumedLeft = roundQty(consumedLeft - eaten);
        var net = roundQty(qty - eaten);
        if (net > QTY_EPSILON) monthly[month] = roundQty((monthly[month] || 0) + net);
      });
    });
    return monthly;
  }

  // الوارد المتوقع يُنسب إلى شهر وصوله لا إلى اليوم — هذا ما يجعل الترحيل الشهري صادقًا.
  function monthlyReceiptsForCode(code) {
    var receipts = {};
    state.commitments.forEach(function (commitment) {
      if (commitment.status === "cancelled" || commitment.status === "received") return;
      var linked = state.materials.find(function (item) { return item.id === commitment.materialId; });
      if (!linked || normalizeCode(linked.materialCode) !== normalizeCode(code)) return;
      var month = monthKeyOf(commitment.eta);
      if (!month) return;
      var receipt = state.rawReceipts.find(function (item) { return item.commitmentId === commitment.id; });
      var remaining = roundQty(Number(commitment.qty || 0) - Number(receipt && receipt.received || 0));
      if (remaining <= QTY_EPSILON) return;
      receipts[month] = roundQty((receipts[month] || 0) + remaining);
    });
    return receipts;
  }

  function materialTimePhasedPlan(code) {
    var records = sortedCodeRecords(code);
    var confirmed = records.filter(function (item) { return item.stockConfirmed; });
    var master = rawMasterByCode(code);
    var floor = master && master.strategicStock != null ? Number(master.strategicStock) : 0;
    var monthly = monthlyRequirementForCode(code);
    var receipts = monthlyReceiptsForCode(code);
    var months = [];
    Object.keys(monthly).concat(Object.keys(receipts)).forEach(function (month) {
      if (months.indexOf(month) === -1) months.push(month);
    });
    months.sort();
    var balance = confirmed.length ? materialAvailable(confirmed[0]) : 0;
    var rows = months.map(function (month) {
      var requirement = monthly[month] || 0;
      var arriving = receipts[month] || 0;
      var opening = balance;
      var closing = roundQty(opening + arriving - requirement);
      var net = 0;
      // الرصيد المتوقع لا ينزل تحت المخزون الاستراتيجي في أي فترة؛ الفرق أمر شراء لتلك الفترة.
      if (closing < floor - QTY_EPSILON) { net = roundQty(floor - closing); closing = floor; }
      balance = closing;
      return {
        month: month, opening: opening, receipts: arriving, requirement: requirement,
        closing: closing, net: net, orderBy: latestOrderDate(code, month + "-01")
      };
    });
    return {
      code: code,
      material: records.length ? records[0].material : (master ? master.name : code),
      unit: records.length ? records[0].unit : (master ? master.unit : ""),
      floor: floor,
      confirmed: confirmed.length > 0,
      anchorId: confirmed.length ? confirmed[0].id : (records.length ? records[0].id : ""),
      rows: rows,
      totalNet: roundQty(rows.reduce(function (sum, row) { return sum + row.net; }, 0))
    };
  }

  function confirmedMaterialCodes() {
    var codes = [];
    state.materials.forEach(function (item) {
      if (!item.stockConfirmed || !warehouseReviewReleased(item)) return;
      var code = normalizeCode(item.materialCode);
      if (codes.indexOf(code) === -1) codes.push(code);
    });
    return codes.sort();
  }

  // صفوف الشراء صارت (مادة × شهر حاجة) بدل صف واحد بإجمالي السنة.
  function purchasablePeriods() {
    var out = [];
    confirmedMaterialCodes().forEach(function (code) {
      var plan = materialTimePhasedPlan(code);
      plan.rows.forEach(function (row) {
        if (row.net > QTY_EPSILON) out.push({ plan: plan, row: row });
      });
    });
    return out.sort(function (a, b) {
      return String(a.row.month).localeCompare(String(b.row.month)) || String(a.plan.code).localeCompare(String(b.plan.code));
    });
  }

  // نقطة إعادة الطلب: متوسط الطلب اليومي × مدة التوريد + المخزون الاستراتيجي.
  function reorderPointFor(code) {
    var master = rawMasterByCode(code);
    if (!master || master.leadTimeDays == null) return null;
    var monthly = monthlyRequirementForCode(code);
    var months = Object.keys(monthly);
    if (!months.length) return null;
    var totalNeed = months.reduce(function (sum, month) { return sum + Number(monthly[month] || 0); }, 0);
    var dailyDemand = totalNeed / (months.length * 30);
    var floor = master.strategicStock != null ? Number(master.strategicStock) : 0;
    return roundQty(dailyDemand * Number(master.leadTimeDays) + floor);
  }

  // فحص الجاهزية قبل رد الإنتاج: احتياجات مبدئية + رصيد المخزن + تأكيد المشتريات لإمكانية التوريد.
  function forecastReadiness(forecast) {
    var requirements = forecastRequirements(forecast.id);
    return {
      hasMaterials: requirements.length > 0,
      allConfirmed: requirements.length > 0 && requirements.every(function (item) { return item.stockConfirmed; }),
      supply: forecast.supplyFeasibility || null,
      stale: Boolean(forecast.readinessStale),
      shortageTotal: requirements.reduce(function (sum, item) { return sum + materialShortage(item); }, 0)
    };
  }

  // يرد الإنتاج فور وصول Forecast من المبيعات. الاحتياجات تأتي بعد اعتماد الأرقام النهائي.
  function productionReplyAllowed(forecast) {
    return !!forecast && forecast.status === "submitted";
  }

  // مستندات بانتظار قرار المشتريات: الرصيد مرفوع كاملًا ولا قرار بعد — أو قرار "تعذر" ما زال قابلًا للمراجعة.
  function forecastsAwaitingSupplyConfirm() {
    return state.forecasts.filter(function (forecast) {
      if (forecast.status !== "fixed" || forecast.readinessStale) return false;
      var readiness = forecastReadiness(forecast);
      return readiness.hasMaterials && readiness.allConfirmed && (!readiness.supply || readiness.supply.confirmed === false);
    });
  }

  function pendingSteps() {
    if (!state.products.length) return [{ number: 1, role: "admin", page: "productMaster", title: "عرّف المنتجات أولًا", copy: "أنشئ كودًا فريدًا واسمًا ووحدة قياس لكل منتج نهائي.", count: 1 }];
    if (!state.rawMaterials.some(function (item) { return item.category === "raw"; })) return [{ number: 2, role: "admin", page: "materialMaster", title: "عرّف المواد الأولية", copy: "أنشئ كودًا واسمًا فريدين لكل مادة أولية.", count: 1 }];
    if (!state.rawMaterials.some(function (item) { return item.category === "packing"; })) return [{ number: 3, role: "admin", page: "packingMaster", title: "عرّف مواد التغليف", copy: "أنشئ كودًا واسمًا فريدين لمواد التغليف قبل إعداد ملف احتياج التغليف.", count: 1 }];
    if (!activeForecasts().length) return [{ number: 3, role: "sales", page: "forecasts", title: "أنشئ Forecast السنة شهرًا بشهر", copy: "حدد الأشهر ثم أدخل كمية كل منتج في كل شهر وأرسله للإنتاج.", count: 1 }];
    var steps = [];
    var hasActiveMaterialsMaster = state.rawMaterials.some(function (item) { return item.active !== false; });
    var needsInitialRequirements = hasActiveMaterialsMaster ? state.forecasts.filter(function (item) {
      if (item.status !== "fixed") return false;
      return !forecastRequirements(item.id).length || item.readinessStale;
    }).length : 0;
    var awaitingProduction = state.forecasts.filter(productionReplyAllowed).length;
    if (awaitingProduction) steps.push({ number: 4, role: "production", page: "forecasts", title: "Forecast جديد من المبيعات", copy: "تحقق من الكميات وعدّلها داخل التطبيق أو صدّر الملف الوارد ثم أرسل ردك للمبيعات.", count: awaitingProduction });
    var awaitingSales = state.forecasts.filter(function (item) { return item.status === "production_feedback"; }).length;
    if (awaitingSales) steps.push({ number: 5, role: "sales", page: "forecasts", title: "راجع رد الإنتاج", copy: "اقبل أرقام الإنتاج فيتثبت المستند، أو عدّل وأعد الإرسال (تُحفظ كل الإصدارات).", count: awaitingSales });
    var awaitingSalesFinance = state.forecasts.filter(function (item) { return item.status === "finance_sales_confirm"; }).length;
    if (awaitingSalesFinance) steps.push({ number: 6, role: "sales", page: "forecasts", title: "رد من المالية بانتظار تأكيدك", copy: "راجع ملف Forecast ورد المالية، ثم أكّد التثبيت النهائي أو اطلب المعالجة.", count: awaitingSalesFinance });
    var awaitingFinanceForecast = state.forecasts.filter(function (item) { return item.status === "finance_review"; }).length;
    if (awaitingFinanceForecast) steps.push({ number: 6, role: "finance", page: "forecasts", title: "Forecast بانتظار مراجعة المالية", copy: "نزّل Forecast وراجعه، ثم اعتمده لإرساله إلى المبيعات للتأكيد النهائي.", count: awaitingFinanceForecast });
    if (needsInitialRequirements) steps.push({ number: 6, role: "production", page: "rawRequirements", title: "حدد احتياجات المواد", copy: "تم تثبيت Forecast؛ ابدأ بملف المواد الأولية ثم ملف مواد التغليف في صفحتين منفصلتين.", count: needsInitialRequirements });
    var unconfirmedRawCodes = [];
    var unconfirmedPackingCodes = [];
    state.materials.forEach(function (item) {
      var code = normalizeCode(item.materialCode);
      var category = (item.category || "raw") === "packing" ? "packing" : "raw";
      if (!item.stockConfirmed) {
        if (category === "packing") {
          if (unconfirmedPackingCodes.indexOf(code) === -1) unconfirmedPackingCodes.push(code);
        } else {
          if (unconfirmedRawCodes.indexOf(code) === -1) unconfirmedRawCodes.push(code);
        }
      }
    });
    if (unconfirmedRawCodes.length) {
      steps.push({ number: 5, role: "rmWarehouse", page: "rmStock", title: "ارفع رصيد المواد الأولية", copy: "مستودع المواد الأولية يدخل الموجود لديه ليحسب التطبيق النقص قبل رد الإنتاج.", count: unconfirmedRawCodes.length });
    }
    if (unconfirmedPackingCodes.length) {
      steps.push({ number: 5, role: "rmWarehouse", page: "packingStock", title: "ارفع رصيد مواد التغليف", copy: "مستودع مواد التغليف يدخل الموجود لديه ليحسب التطبيق النقص قبل رد الإنتاج.", count: unconfirmedPackingCodes.length });
    }

    // متابعة ملفات مراجعة المخزن
    var rawReview = state.warehouseReviews && state.warehouseReviews.raw;
    if (rawReview && rawReview.status === "returned_warehouse") {
      steps.push({ number: 5, role: "rmWarehouse", page: "rmStock", title: "تأكيد ملف المواد الأولية", copy: "أعاد الإنتاج ملف المواد الأولية للتأكيد؛ راجعه وأكّده.", count: 1 });
    }
    var packingReview = state.warehouseReviews && state.warehouseReviews.packing;
    if (packingReview && packingReview.status === "returned_warehouse") {
      steps.push({ number: 5, role: "rmWarehouse", page: "packingStock", title: "تأكيد ملف مواد التغليف", copy: "أعاد الإنتاج ملف مواد التغليف للتأكيد؛ راجعه وأكّده.", count: 1 });
    }
    if (rawReview && rawReview.status === "sent_production") {
      steps.push({ number: 7, role: "production", page: "rawRequirements", title: "راجع ملف المواد الأولية من المخزن", copy: "أرسل المخزن ملف المواد الأولية؛ راجعه أو أعِده للمخزن للتأكيد.", count: 1 });
    }
    if (packingReview && packingReview.status === "sent_production") {
      steps.push({ number: 7, role: "production", page: "packingRequirements", title: "راجع ملف مواد التغليف من المخزن", copy: "أرسل المخزن ملف مواد التغليف؛ راجعه أو أعِده للمخزن للتأكيد.", count: 1 });
    }
    if (rawReview && rawReview.status === "confirmed") {
      steps.push({ number: 7, role: "production", page: "rawRequirements", title: "حوّل ملف المواد الأولية للمشتريات", copy: "أكد المخزن ملف المواد الأولية؛ اضغط «تحويل للمشتريات».", count: 1 });
    }
    if (packingReview && packingReview.status === "confirmed") {
      steps.push({ number: 7, role: "production", page: "packingRequirements", title: "حوّل ملف مواد التغليف للمشتريات", copy: "أكد المخزن ملف مواد التغليف؛ اضغط «تحويل للمشتريات».", count: 1 });
    }
    var awaitingSupply = forecastsAwaitingSupplyConfirm().length;
    if (awaitingSupply) steps.push({ number: 6, role: "procurement", page: "requirements", title: "أكّد إمكانية التوريد", copy: "راجع النقص المحسوب مع مدد التوريد وأكّد قدرتك على التغطية قبل تثبيت المستند.", count: awaitingSupply });
    var weeklyTargets = pendingWeeklyPlanTargets().length;
    if (weeklyTargets) steps.push({ number: 9, role: "production", page: "weekly", title: "قسّم الخطة الشهرية أسابيع", copy: "بعد التثبيت: وزّع كمية كل منتج وشهر على أسابيعه وأرسلها للمبيعات.", count: weeklyTargets });
    var weeklyAwaitingSales = state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_sales"; }).length;
    if (weeklyAwaitingSales) steps.push({ number: 10, role: "sales", page: "approvals", title: "راجع الخطة الأسبوعية", copy: "عدّل التوزيع إن لزم ثم أرسل الخطة لاعتماد الإنتاج ومخزن المنتج النهائي.", count: weeklyAwaitingSales });
    var weeklyAwaitingProduction = state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_approvals" && !planFullyApprovedByRole(plan, "production"); }).length;
    if (weeklyAwaitingProduction) steps.push({ number: 11, role: "production", page: "approvals", title: "اعتمد الخطة الأسبوعية", copy: "راجع توزيع المبيعات النهائي واعتمده ليدخل التنفيذ.", count: weeklyAwaitingProduction });
    var weeklyAwaitingFg = state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_approvals" && !planFullyApprovedByRole(plan, "fgWarehouse"); }).length;
    if (weeklyAwaitingFg) steps.push({ number: 12, role: "fgWarehouse", page: "approvals", title: "اعتماد مخزن FG للخطة الأسبوعية", copy: "مخزن المنتج النهائي يعتمد الخطة ليجهز الاستلام والتخزين.", count: weeklyAwaitingFg });
    var directShortages = purchasableShortages().length;
    if (directShortages) steps.push({ number: 13, role: "procurement", page: "requirements", title: "اطلب المواد الناقصة", copy: "النقص وصلك مباشرة من رفع رصيد المخزن؛ أمر الشراء النهائي قرارك ولا يُتجاوز — حدد المورد وPO والكمية وETA.", count: directShortages });
    var financePending = state.commitments.filter(function (item) {
      return item.financeApproval && item.financeApproval.status === "pending" && item.status !== "cancelled" && item.status !== "received";
    }).length;
    if (financePending) steps.push({ number: 14, role: "finance", page: "finance", title: "وافق على أوامر الشراء", copy: "قرار الشراء لا يعبر قبل موافقتك — راجع الكوتيشن المرفق ثم وافق أو ارفض.", count: financePending });
    var awaitingOrders = state.commitments.filter(function (item) {
      return (item.status === "submitted" || item.status === "confirmed") && item.financeApproval && item.financeApproval.status === "approved";
    }).length;
    if (awaitingOrders) steps.push({ number: 15, role: "procurement", page: "procurement", title: "أكّد الأوردر وابدأ التوريد", copy: "بعد موافقة المالية: نقرة واحدة تؤكد الأوردر وتحوله إلى In Transit.", count: awaitingOrders });
    var readyRawReceipts = state.rawReceipts.filter(function (item) {
      var master = rawMasterByCode(item.materialCode, "raw");
      return (master ? master.category : "raw") !== "packing" && item.status === "expected" && receiptReadyForWarehouse(item);
    }).length;
    if (readyRawReceipts) steps.push({ number: 16, role: "rmWarehouse", page: "receipts", title: "سجّل استلام المواد الأولية حسب الوصول", copy: "أدخل ما وصل فعليًا؛ يضاف مباشرة إلى رصيد المواد الأولية.", count: readyRawReceipts });

    var readyPackingReceipts = state.rawReceipts.filter(function (item) {
      var master = rawMasterByCode(item.materialCode, "packing");
      return (master ? master.category : "raw") === "packing" && item.status === "expected" && receiptReadyForWarehouse(item);
    }).length;
    if (readyPackingReceipts) steps.push({ number: 16, role: "rmWarehouse", page: "packingReceipts", title: "سجّل استلام مواد التغليف حسب الوصول", copy: "أدخل ما وصل فعليًا؛ يضاف مباشرة إلى رصيد مواد التغليف.", count: readyPackingReceipts });
    var productionEntries = pendingProductionEntries().length;
    if (productionEntries) steps.push({ number: 17, role: "production", page: "execution", title: "سجّل الإنتاج الفعلي", copy: "سجل إنتاج كل منتج في شهره؛ السحب من مخزن المواد يُخصم تلقائيًا.", count: productionEntries });
    var actualsAwaitingFg = state.actuals.filter(function (actual) {
      return !state.fgReceipts.some(function (item) { return item.actualId === actual.id; });
    }).length;
    if (actualsAwaitingFg) steps.push({ number: 18, role: "fgWarehouse", page: "fgReceipts", title: "أكّد استلام المنتج النهائي", copy: "مخزن المنتج النهائي يسجل ما استلمه فعليًا، ويصبح المؤكد متاحًا للبيع مباشرة.", count: actualsAwaitingFg });
    var strategicBelow = strategicAlerts().length;
    if (strategicBelow) steps.push({ number: 19, role: "procurement", page: "requirements", title: "مواد تحت المخزون الاستراتيجي", copy: "رصيد هذه المواد نزل تحت الحد الذي وضعه الإنتاج والمشتريات؛ راجع الشراء مع مدة التوريد.", count: strategicBelow });
    if (!steps.length) steps.push({ number: 20, role: "sales", page: "fgView", title: "راجع المتاح للبيع", copy: "اكتملت الدورة الحالية، ويمكن للمبيعات رؤية المنتج النهائي المتاح.", count: 1, final: true });
    return steps;
  }

  // مهام الإشعارات: الخطوات المستحقة فعليًا (بدون خطوة الاكتمال الإخبارية).
  function roleTaskSteps(role) {
    return pendingSteps().filter(function (item) { return item.role === role && !item.final; });
  }

  function roleTaskCounts() {
    var counts = {};
    pendingSteps().forEach(function (item) {
      if (item.final) return;
      counts[item.role] = (counts[item.role] || 0) + (Number(item.count) || 1);
    });
    return counts;
  }

  function nextRequiredStep() {
    return pendingSteps()[0];
  }

  // بطاقة الخطوة التالية كانت تعرض لكل دور خطوات الأقسام الأخرى بعناوينها وعدّاداتها —
  // فكانت المبيعات تقرأ عدد المواد الناقصة وعدد الأكواد غير المؤكدة. الآن كل دور يرى مستحقاته.
  function journeySteps() {
    var steps = pendingSteps();
    if (state.role === "admin" || state.role === "executive") return steps;
    return steps.filter(function (item) { return item.role === state.role; });
  }

  function renderJourneyCard() {
    var steps = journeySteps();
    if (!steps.length) {
      var waitingOn = pendingSteps()[0];
      var waitingLine = waitingOn && waitingOn.role !== state.role ? 'الدورة الآن عند ' + roleName(waitingOn.role) + '؛ ستظهر مهمتك هنا فور وصول الدور إليك.' : 'لا توجد مهمة مستحقة على أي قسم الآن.';
      return '<section class="journey-card" aria-label="الخطوة التالية"><div class="journey-step"><span>الخطوة التالية</span><strong>✓</strong></div><div class="journey-copy"><small>الدور المطلوب: ' + esc(roleName(state.role)) + '</small><h2>لا توجد مهمة مستحقة عليك الآن</h2><p>' + esc(waitingLine) + '</p></div><div class="journey-actions"><button class="btn btn-secondary" type="button" data-action="guide">شرح النظام</button></div></section>';
    }
    var step = steps[0];
    var countBadge = step.count > 1 ? ' <span class="journey-count">× ' + step.count + '</span>' : "";
    var list = "";
    if (steps.length > 1) {
      var items = steps.map(function (item) {
        return '<button type="button" class="journey-list-item" data-action="go-step" data-role="' + esc(item.role) + '" data-page="' + esc(item.page) + '"><b>' + esc(item.number) + '</b><span>' + esc(item.title) + (item.count > 1 ? " × " + item.count : "") + '</span><small>' + esc(roleName(item.role)) + '</small></button>';
      }).join("");
      list = '<div class="journey-list" aria-label="كل الخطوات المستحقة الآن"><small>كل المستحقات الآن عبر جميع الطلبيات (' + steps.length + ' خطوات)</small><div class="journey-list-items">' + items + '</div></div>';
    }
    return '<section class="journey-card" aria-label="الخطوة التالية"><div class="journey-step"><span>الخطوة التالية</span><strong>' + esc(step.number) + '</strong></div><div class="journey-copy"><small>الدور المطلوب: ' + esc(roleName(step.role)) + countBadge + '</small><h2>' + esc(step.title) + '</h2><p>' + esc(step.copy) + '</p></div><div class="journey-actions"><button class="btn btn-primary" type="button" data-action="go-step" data-role="' + esc(step.role) + '" data-page="' + esc(step.page) + '">اذهب إلى الخطوة</button><button class="btn btn-secondary" type="button" data-action="guide">شرح النظام</button></div></section>' + list;
  }

  function openGuide() {
    var items = [
      ["مسؤول النظام", "تعريف المنتجات بأكواد فريدة"],
      ["مسؤول النظام", "تعريف المواد الأولية بأكواد فريدة"],
      ["المبيعات", "إنشاء Forecast السنة شهرًا بشهر وإرساله للإنتاج"],
      ["الإنتاج", "فحص الجاهزية 1: حساب الاحتياجات المبدئية من أرقام المستند"],
      ["مخزن المواد", "فحص الجاهزية 2: رفع الرصيد ليحسب التطبيق النقص"],
      ["المشتريات", "فحص الجاهزية 3: تأكيد إمكانية التوريد في أشهر الحاجة (بلا شراء فعلي)"],
      ["الإنتاج", "بعد اكتمال الجاهزية: الرد على المبيعات — تثبيت أو أرقام معدلة"],
      ["المبيعات", "مراجعة رد الإنتاج: قبول (تثبيت) أو تعديل وإعادة إرسال — أي تعديل كميات يعيد فحص الجاهزية"],
      ["الإنتاج", "تقسيم الخطة الشهرية أسابيع (وأيامًا اختياريًا) وإرسالها للمبيعات"],
      ["المبيعات", "مراجعة توزيع الأسابيع وإرساله لاعتماد الإنتاج ومخزن FG — لا تغيير داخل أسبوع الإنتاج، والتعديل للأسبوع القادم قبل يومين على الأقل"],
      ["الإنتاج", "بعد التثبيت: إدخال احتياجات المواد لكل منتج موزعة على الأشهر"],
      ["مخزن المواد", "رفع الرصيد الموجود ليحسب التطبيق النقص تلقائيًا"],
      ["المشتريات", "النقص يصلها مباشرة فور رفع الرصيد — أمر الشراء النهائي قرارها ولا يُتجاوز ويصدر دون انتظار التثبيت"],
      ["المشتريات", "تأكيد الأوردر وبدء التوريد بنقرة واحدة"],
      ["مخزن المواد", "تسجيل الاستلام حسب الوصول؛ يضاف مباشرة إلى الرصيد"],
      ["الإنتاج", "تسجيل Production Actual لكل منتج وشهر — لا يفتح قبل اعتماد النتيجة والخطة الأسبوعية لذلك الشهر؛ يسحب المواد تلقائيًا"],
      ["مخزن المنتج النهائي", "تأكيد الكمية المستلمة لتصبح متاحة للبيع"],
      ["المبيعات", "تسجيل كل عملية بيع؛ تُخصم من الصافي المتاح فورًا"],
      ["الجميع حسب الدور", "المتابعة الشهرية: مباع/مخطط/انحراف + حركة المواد (محجوبة عن المبيعات) + المبيعات اليومية"],
      ["الإنتاج والمشتريات", "المخزون الاستراتيجي لكل مادة مع تنبيه وامض تحت الحد، ومدة توريد تقريبية تضعها المشتريات"],
      ["المالية", "مراجعة Forecast ومراقبة واعتماد أوامر الشراء"]
    ];
    var rows = items.map(function (item, index) {
      return '<div class="guide-row"><span class="guide-num">' + (index + 1) + '</span><div><strong>' + esc(item[0]) + '</strong><p>' + esc(item[1]) + '</p></div></div>';
    }).join("");
    var body = '<div class="guide-intro"><strong>ابدأ بتهيئة النظام، ثم اتبع بطاقة «الخطوة التالية».</strong><p>بعد إنهاء كل إجراء اضغط زر «اذهب إلى الخطوة» لينقلك النظام تلقائيًا إلى القسم والشاشة المطلوبين.</p></div><div class="guide-list">' + rows + '</div><div class="form-note locked">المبيعات لا ترى المواد الأولية. وإذا حدثت مشكلة، يستطيع أي قسم تسجيلها من شاشة «المشكلات والإجراءات».</div>';
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">كيف تستخدم النموذج؟</h2><p>من تهيئة الأكواد إلى Available for Sales</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-secondary" type="button" data-action="close-dialog">إغلاق</button><button class="btn btn-primary" type="button" data-action="go-step" data-role="admin" data-page="setup">ابدأ بتهيئة النظام</button></footer>');
  }

  function materialAvailable(item) {
    return roundQty(Math.max(0, Number(item.onHand || 0) - Number(item.reserved || 0) - Number(item.hold || 0)));
  }

  function materialShortage(item) {
    var allocation = materialAllocations(item.materialCode)[item.id];
    return allocation ? allocation.shortage : 0;
  }

  function fgAvailable(item) {
    return roundQty(Math.max(0, Number(item.received || 0) - Number(item.reserved || 0) - Number(item.blocked || 0)));
  }

  // المقارنة كانت صارمة بينما كل المستدعين يمرّرون كودًا مُطبَّعًا — فرق حالة الأحرف كان يُنتج شاشة بيضاء.
  function materialRecordsSameCode(code) {
    var key = normalizeCode(code);
    return state.materials.filter(function (item) { return normalizeCode(item.materialCode) === key; });
  }

  // رصيد المادة الفيزيائي واحد مهما تعددت الخطط: أي تأكيد أو استلام يُعمم على كل سجلات نفس الكود المؤكدة.
  function syncMaterialStockAcrossPlans(sourceItem) {
    materialRecordsSameCode(sourceItem.materialCode).forEach(function (item) {
      if (item.id === sourceItem.id || !item.stockConfirmed) return;
      item.onHand = Number(sourceItem.onHand);
      item.reserved = Number(sourceItem.reserved);
      item.hold = Number(sourceItem.hold);
      item.stockConfirmedAt = sourceItem.stockConfirmedAt;
      item.status = materialShortage(item) > 0 ? "shortage" : "available";
    });
  }

  function latestConfirmedStockForCode(code, excludeId) {
    var confirmed = materialRecordsSameCode(code).filter(function (item) { return item.stockConfirmed && item.id !== excludeId; });
    confirmed.sort(function (a, b) { return String(b.stockConfirmedAt || "").localeCompare(String(a.stockConfirmedAt || "")); });
    return confirmed[0] || null;
  }

  function effectiveRequired(item) {
    var remaining = roundQty(Number(item.required || 0) - Number(item.consumed || 0));
    return remaining <= QTY_EPSILON ? 0 : remaining;
  }

  function sortedCodeRecords(code) {
    return materialRecordsSameCode(code).slice().sort(function (a, b) {
      return String(a.needDate || "9999-12-31").localeCompare(String(b.needDate || "9999-12-31"))
        || String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
        || String(a.id).localeCompare(String(b.id));
    });
  }

  // نموذج التخصيص: الرصيد الفيزيائي الواحد يُوزَّع على خطط المادة حسب أقرب تاريخ حاجة،
  // فلا تُحتسب نفس الكمية مرتين لخطتين مختلفتين.
  function materialAllocations(code) {
    var records = sortedCodeRecords(code);
    var confirmed = records.filter(function (item) { return item.stockConfirmed; });
    var availablePool = confirmed.length ? materialAvailable(confirmed[0]) : 0;
    var inboundPool = records.reduce(function (sum, item) { return sum + Number(item.inbound || 0); }, 0);
    var map = {};
    var firstConfirmedId = confirmed.length ? confirmed[0].id : "";
    records.forEach(function (item) {
      if (!item.stockConfirmed) { map[item.id] = { available: 0, inbound: 0, shortage: 0, strategicGap: 0 }; return; }
      var need = effectiveRequired(item);
      var fromAvailable = Math.min(need, availablePool);
      availablePool = roundQty(availablePool - fromAvailable);
      var fromInbound = Math.min(need - fromAvailable, inboundPool);
      inboundPool = roundQty(inboundPool - fromInbound);
      map[item.id] = { available: roundQty(fromAvailable), inbound: roundQty(fromInbound), shortage: Math.max(0, roundQty(need - fromAvailable - fromInbound)), strategicGap: 0 };
    });
    // المخزون الاستراتيجي حدّ أدنى واجب لا مجرد تنبيه: ما يتبقى بعد تغطية الحاجة يجب أن يبلغ الحد،
    // وإلا فالفرق نقص حقيقي يذهب إلى المشتريات. لا يمس هذا حصة الإنتاج المتاحة فعلًا.
    var master = rawMasterByCode(code);
    var floor = master && master.strategicStock != null ? Number(master.strategicStock) : 0;
    if (floor > 0 && firstConfirmedId && map[firstConfirmedId]) {
      var gap = roundQty(floor - availablePool - inboundPool);
      if (gap > QTY_EPSILON) {
        map[firstConfirmedId].strategicGap = gap;
        map[firstConfirmedId].shortage = roundQty(map[firstConfirmedId].shortage + gap);
      }
    }
    return map;
  }

  function materialStrategicGap(item) {
    var allocation = materialAllocations(item.materialCode)[item.id];
    return allocation ? Number(allocation.strategicGap || 0) : 0;
  }

  function materialAllocatedAvailable(item) {
    var allocation = materialAllocations(item.materialCode)[item.id];
    return allocation ? allocation.available : 0;
  }

  // معامل الوصفة: كم وحدة من المادة يستهلك المنتج الواحد. null = لا وصفة معرّفة لهذا الزوج.
  function bomFactorFor(productCode, materialCode) {
    var product = state.products.find(function (item) { return normalizeCode(item.code) === normalizeCode(productCode); });
    if (!product || !Array.isArray(product.packingBom)) return null;
    var entry = product.packingBom.find(function (line) { return normalizeCode(line.materialCode) === normalizeCode(materialCode); });
    return entry ? Number(entry.qtyPerUnit || 0) : null;
  }

  // حصة التشغيل من مادة معينة. القاعدة السابقة كانت التناسب مع عدد الوحدات فقط، فكان منتج
  // لا يستهلك المادة يخصمها رغم ذلك. الآن: إن وُجدت وصفة لأي منتج في المستند تُرجَّح بها الحصة.
  function runConsumptionBase(forecast, productCode, month, producedUnits, item) {
    var monthNeed = Number(item.monthlyQty && item.monthlyQty[month] || 0);
    if (monthNeed <= 0) return 0;
    var weighted = 0;
    var hasBom = false;
    forecast.items.forEach(function (line) {
      var factor = bomFactorFor(line.productCode, item.materialCode);
      if (factor == null) return;
      hasBom = true;
      weighted += Number(line.monthlyQty[month] || 0) * factor;
    });
    if (hasBom) {
      var ownFactor = bomFactorFor(productCode, item.materialCode);
      if (!ownFactor || weighted <= 0) return 0;
      return monthNeed * ((producedUnits * ownFactor) / weighted);
    }
    var plannedMonth = forecast.items.reduce(function (sum, line) { return sum + Number(line.monthlyQty[month] || 0); }, 0);
    return plannedMonth > 0 ? monthNeed * (producedUnits / plannedMonth) : 0;
  }

  // تسجيل الفعلي يستهلك حصة الخطة من المواد ويخصمها من الرصيد الفيزيائي لكل سجلات الكود.
  function consumeMaterialsForRun(forecast, productCode, month, producedUnits) {
    if (producedUnits <= 0) return;
    forecastRequirements(forecast.id).forEach(function (item) {
      // لا فرع احتياطي يسحب من أشهر أخرى: مادة لا حاجة لها هذا الشهر لا تُسحب هذا الشهر.
      var base = runConsumptionBase(forecast, productCode, month, producedUnits, item);
      var consume = roundQty(Math.min(base, effectiveRequired(item)));
      if (consume <= QTY_EPSILON) return;
      var confirmedRecords = materialRecordsSameCode(item.materialCode).filter(function (record) { return record.stockConfirmed; });
      // لا يُستهلك ما ليس موجودًا: القصّ الصامت عند الصفر كان يُضيع الفرق من الدفاتر.
      var shortfall = 0;
      if (confirmedRecords.length) {
        var physical = materialAvailable(confirmedRecords[0]);
        if (consume > physical) { shortfall = roundQty(consume - physical); consume = physical; }
      }
      if (consume > QTY_EPSILON) {
        item.consumed = roundQty(Number(item.consumed || 0) + consume);
        if (confirmedRecords.length) {
          var newOnHand = roundQty(Math.max(0, Number(confirmedRecords[0].onHand || 0) - consume));
          confirmedRecords.forEach(function (record) {
            record.onHand = newOnHand;
            record.status = materialShortage(record) > 0 ? "shortage" : "available";
          });
        }
        recordMaterialMove("withdraw", item, consume, month, productCode);
        addAudit("سحب " + formatNumber(consume) + " " + (item.unit || "") + " من " + item.materialCode + " لإنتاج " + productCode + " · " + monthLabel(month), roleName(state.role));
      }
      if (shortfall > QTY_EPSILON) {
        addAudit("عجز مادة عند التشغيل: نقص " + formatNumber(shortfall) + " " + (item.unit || "") + " من " + item.materialCode + " لإنتاج " + productCode + " · " + monthLabel(month), roleName(state.role));
        state.issues.unshift({
          id: createId("IS"), title: "عجز مادة عند تسجيل الإنتاج", severity: "high", visibility: "internal",
          source: "تشغيل " + productCode + " · " + monthLabel(month),
          impact: "المطلوب للتشغيل أكبر من الرصيد المتاح لمادة " + item.materialCode + " بمقدار " + formatNumber(shortfall) + " " + (item.unit || ""),
          action: "راجع الرصيد الفعلي مع المخزن وأصدر أمر شراء للفرق.",
          status: "open", createdAt: currentTimestamp()
        });
      }
    });
  }

  function receiptReadyForWarehouse(receipt) {
    var commitment = state.commitments.find(function (item) { return item.id === receipt.commitmentId; });
    return Boolean(commitment && commitment.status === "in_transit");
  }

  function renderLogin() {
    applyLangDir();
    applyBranding();
    document.getElementById("app").innerHTML =
      localizeHtml('<main class="login"><section class="login-copy" aria-labelledby="login-heading"><div class="brand">' + brandMarkHtml() + '<div><strong>' + esc(brandName()) + '</strong><small>EMICP PROTOTYPE</small></div></div><h1 id="login-heading">اختبر سير العمل قبل تصميمه.</h1><p>بدّل بين الأدوار وجرّب Forecast السنة شهرًا بشهر: تفاوض حتى التثبيت، ثم مواد وشراء وتنفيذ، وشاهد كيف يصل للمبيعات المنتج المتاح فقط.</p><div class="login-flow"><span>Forecast شهري</span><b>←</b><span>تفاوض وتثبيت</span><b>←</b><span>مواد ومشتريات</span><b>←</b><span>Execution</span><b>←</b><span>Available for Sales</span></div></section><section class="login-panel"><form class="login-card" id="login-form"><span class="eyebrow">لوحة الدخول</span><h2>ابدأ التجربة</h2><p>اختر المستخدم؛ لا يحتاج النموذج إلى كلمة مرور أو اتصال بالإنترنت.</p><div class="field"><label for="login-user">المستخدم</label><select class="select" id="login-user" name="user">' + activeUsers().map(function (user) { return '<option value="' + esc(user.id) + '"' + (user.id === state.currentUserId ? " selected" : "") + '>' + esc(user.name + " — " + roleName(user.role)) + '</option>'; }).join("") + '</select></div><div class="field"><label for="login-password">كلمة المرور</label><input class="input" id="login-password" type="password" name="password" placeholder="اتركها فارغة إن لم تكن لحسابك كلمة مرور"></div><button class="btn btn-primary btn-block" type="submit">دخول</button><div class="prototype-note">التغييرات تحفظ داخل هذا المتصفح فقط. المستخدمون الموقوفون لا يظهرون هنا، ويديرهم مسؤول النظام من شاشة الصلاحيات.</div></form></section></main>');
  }

  function renderApp() {
    if (!sessionStillValid()) { endInvalidSession(); return; }
    var pages = allowedPages(state.role);
    if (pages.indexOf(state.page) === -1) state.page = pages[0] || "home";
    // إشعارات المهام: نقطة وامضة على تبويب كل شاشة عندها مهمة، ومربع وامض أعلى الشاشة للدور الحالي.
    var roleSteps = roleTaskSteps(state.role);
    var pageTaskCounts = {};
    roleSteps.forEach(function (item) { pageTaskCounts[item.page] = (pageTaskCounts[item.page] || 0) + (Number(item.count) || 1); });
    var totalTasks = roleSteps.reduce(function (sum, item) { return sum + (Number(item.count) || 1); }, 0);
    var nav = pages.map(function (page) {
      var taskDot = pageTaskCounts[page] ? '<span class="nav-task-dot" aria-label="' + pageTaskCounts[page] + ' مهام مستحقة في هذه الشاشة">' + formatNumber(pageTaskCounts[page]) + '</span>' : "";
      return '<button type="button" data-page="' + page + '" class="' + (state.page === page ? "active" : "") + '">' + esc(pageLabels[page]) + taskDot + '</button>';
    }).join("");
    var notifyBox = roleSteps.length
      ? '<button type="button" class="notify-box" data-action="go-first-task" role="status" aria-live="polite" title="' + esc(roleSteps[0].title) + '"><span class="notify-pulse" aria-hidden="true"></span><b>' + formatNumber(totalTasks) + '</b> ' + (totalTasks === 1 ? "مهمة مستحقة" : "مهام مستحقة") + ' · ' + esc(roleSteps[0].title) + '</button>'
      : "";
    applyLangDir();
    applyBranding();
    document.getElementById("app").innerHTML =
      localizeHtml('<div class="app ' + (procurementPolished && state.role === "procurement" && (state.page === "home" || state.page === "procurement") ? "procurement-polished" : "") + '"><header class="topbar"><div class="topbar-main"><div class="brand">' + brandMarkHtml() + '<div><strong>' + esc(brandName()) + '</strong><small>EMICP INTERACTIVE</small></div></div><div class="role-tools">' + (currentUser() ? '<span class="user-chip" title="المستخدم الحالي">' + esc(currentUser().name) + '</span>' : "") + notifyBox + (demoRoleSwitchAllowed() ? '<label for="role-switch">تجربة دور</label><select class="role-switch" id="role-switch" data-action="switch-role">' + roleOptions(state.role) + '</select>' : "") + '<select class="role-switch lang-switch" id="lang-switch" data-action="switch-lang" aria-label="اللغة">' + Object.keys(LANGS).map(function (code) { return '<option value="' + code + '"' + (state.lang === code ? " selected" : "") + '>' + LANGS[code].name + '</option>'; }).join("") + '</select><button type="button" class="top-help" data-action="guide">دليل الاستخدام</button>' + (state.role === "admin" ? '<button type="button" class="top-help danger" data-action="reset">بدء جديد</button>' : "") + '<button type="button" class="top-icon" data-action="logout" aria-label="تسجيل الخروج">↪</button></div></div><nav class="nav" aria-label="التنقل الرئيسي">' + nav + '</nav></header><main class="main" id="main-content" tabindex="-1"><div class="page" id="page-content">' + renderPage() + '</div></main></div>');
    enhanceDataTables(document.getElementById("page-content"), "");
    refreshApprovalSelection();
    notifyBackupReminder();
  }

  // ===== شريط فلاتر عام لكل جداول البيانات =====
  // الجداول الكبيرة (التقارير، المخزون، الالتزامات، الأوردرات، السجل...) كانت تُقرأ بالتمرير فقط.
  // هذا الشريط يُركَّب تلقائيًا على أي جدول عرض تجاوز حدًا معينًا من الصفوف، بلا تغيير في أي عارض.
  var TABLE_FILTER_MIN_ROWS = 8;
  var TABLE_FILTER_MAX_OPTIONS = 30;
  var tableViewState = {};

  function tableKeyFor(table, index) {
    var head = table.tHead && table.tHead.rows.length
      ? Array.prototype.map.call(table.tHead.rows[0].cells, function (cell) { return cell.textContent.trim(); }).join("|")
      : "";
    return state.page + "#" + index + "#" + head.slice(0, 160);
  }

  // نص العنصر بلا تسميات قارئ الشاشة: عمود التحديد يحمل <label class="sr-only">تحديد صف …</label>
  // فكان يبدو عمودًا نصيًا صالحًا للفلترة ويولّد فلترًا بلا معنى.
  function visibleText(node) {
    if (!node) return "";
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1) return "";
    if (node.classList && node.classList.contains("sr-only")) return "";
    var out = "";
    Array.prototype.forEach.call(node.childNodes, function (child) { out += visibleText(child); });
    return out;
  }

  function tableCellText(row, columnIndex) {
    var cell = row.cells[columnIndex];
    return cell ? visibleText(cell).replace(/\s+/g, " ").trim() : "";
  }

  function tableNumericValue(text) {
    var cleaned = String(text || "").replace(/[,\u066C\s]/g, "").replace(/[\u066A%]/g, "");
    var match = /-?\d+(\.\d+)?/.exec(cleaned);
    return match ? Number(match[0]) : null;
  }

  // قيمة الفلترة للخلية: خانة واحدة قد تجمع الكود والاسم ورقم الدفعة في سطور،
  // فيبدو كل صف فريدًا ويُرفض العمود. نأخذ المفتاح الأول (شارة الكود، ثم العنوان، ثم الحالة).
  function tableFilterValue(row, columnIndex) {
    var cell = row.cells[columnIndex];
    if (!cell) return "";
    var chip = cell.querySelector ? cell.querySelector(".code-chip") : null;
    if (chip && visibleText(chip).trim()) return visibleText(chip).replace(/\s+/g, " ").trim();
    var badge = cell.querySelector ? cell.querySelector(".status") : null;
    if (badge && visibleText(badge).trim()) return visibleText(badge).replace(/\s+/g, " ").trim();
    var strong = cell.querySelector ? cell.querySelector("strong, time, b") : null;
    if (strong && visibleText(strong).trim()) return visibleText(strong).replace(/\s+/g, " ").trim();
    return tableCellText(row, columnIndex);
  }

  // عمود صالح للفلترة = قيم متكررة قليلة نسبيًا. الأعمدة ذات القيمة الواحدة أو شبه الفريدة تُستبعد.
  function filterableColumns(table) {
    if (!table.tHead || !table.tHead.rows.length) return [];
    var headers = table.tHead.rows[table.tHead.rows.length - 1].cells;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var columns = [];
    Array.prototype.forEach.call(headers, function (header, columnIndex) {
      var label = visibleText(header).replace(/\s+/g, " ").trim();
      if (!label) return;
      var values = [];
      var blank = 0;
      var skip = false;
      for (var i = 0; i < rows.length; i += 1) {
        var text = tableFilterValue(rows[i], columnIndex);
        if (!text || text === "\u2014") { blank += 1; continue; }
        if (text.length > 60) { skip = true; break; }
        if (values.indexOf(text) === -1) {
          values.push(text);
          if (values.length > TABLE_FILTER_MAX_OPTIONS) { skip = true; break; }
        }
      }
      if (skip) return;
      var filled = rows.length - blank;
      if (values.length < 2 || !filled) return;
      // شبه فريد (معرّف أو تاريخ لحظي) لا يصلح قائمة اختيار.
      if (values.length > Math.max(2, filled * 0.7)) return;
      var numeric = values.every(function (value) { return tableNumericValue(value) != null && !/[\u0600-\u06FFa-zA-Z]/.test(value); });
      columns.push({ index: columnIndex, label: label, numeric: numeric, values: values.sort(function (x, y) { return x.localeCompare(y, "ar", { numeric: true }); }) });
    });
    // الأولوية للأعمدة الوصفية قليلة القيم (الحالة، الشهر، المنتج) قبل الأعمدة الرقمية،
    // وإلا ابتلع ترتيبُ الأعمدة الأربعةَ المسموحة بأعمدة أرقام والبحث يغني عنها.
    return columns.slice().sort(function (a, b) {
      if (a.numeric !== b.numeric) return a.numeric ? 1 : -1;
      return a.index - b.index;
    }).slice(0, 4).sort(function (a, b) { return a.index - b.index; });
  }

  function applyTableView(table) {
    var key = table.getAttribute("data-table-key");
    var view = tableViewState[key] || { q: "", cols: {}, sort: null };
    var body = table.tBodies[0];
    var rows = Array.prototype.slice.call(body.rows);
    var needle = String(view.q || "").trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {
      var visible = true;
      if (needle) visible = row.textContent.replace(/\s+/g, " ").toLowerCase().indexOf(needle) !== -1;
      if (visible) {
        Object.keys(view.cols).forEach(function (columnIndex) {
          var wanted = view.cols[columnIndex];
          if (!wanted) return;
          if (tableFilterValue(row, Number(columnIndex)) !== wanted) visible = false;
        });
      }
      row.style.display = visible ? "" : "none";
      if (visible) shown += 1;
    });
    if (view.sort) {
      var sortColumn = view.sort.column;
      var direction = view.sort.dir === "desc" ? -1 : 1;
      rows.slice().sort(function (a, b) {
        var left = tableCellText(a, sortColumn);
        var right = tableCellText(b, sortColumn);
        var leftNumber = tableNumericValue(left);
        var rightNumber = tableNumericValue(right);
        if (leftNumber != null && rightNumber != null && leftNumber !== rightNumber) return (leftNumber - rightNumber) * direction;
        return left.localeCompare(right, "ar") * direction;
      }).forEach(function (row) { body.appendChild(row); });
    }
    var counter = document.querySelector('[data-table-count="' + key + '"]');
    if (counter) counter.textContent = localizeText(shown === rows.length ? "كل الصفوف: " + formatNumber(rows.length) : "يعرض " + formatNumber(shown) + " من " + formatNumber(rows.length));
    var emptyNote = document.querySelector('[data-table-empty="' + key + '"]');
    if (emptyNote) emptyNote.style.display = shown ? "none" : "";
    // عدّادات التحديد تعدّ ما هو ظاهر، فأي تغيير في التصفية يعيد ضبطها.
    refreshWeeklySelection();
    refreshApprovalSelection();
  }

  // القوائم (السجل، القضايا، الوارد، الالتزامات، الخطط الأسبوعية) ليست جداول لكنها تطول بنفس القدر،
  // فتأخذ شريط بحث مبسطًا بلا فلاتر أعمدة.
  function enhanceDataLists(host) {
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll(".audit-list, .list, .issue-list"), function (list, index) {
      var items = Array.prototype.filter.call(list.children, function (node) { return node.nodeType === 1; });
      if (items.length < TABLE_FILTER_MIN_ROWS) return;
      var key = state.page + "#list" + index;
      list.setAttribute("data-list-key", key);
      var view = tableViewState[key] || (tableViewState[key] = { q: "", cols: {}, sort: null });
      var toolbar = document.createElement("div");
      toolbar.className = "table-toolbar";
      toolbar.innerHTML = localizeHtml('<label class="table-filter-field grow"><span>بحث</span><input class="input" type="search" placeholder="اكتب أي كلمة أو رقم للتصفية" data-action="list-search" data-list="' + esc(key) + '" value="' + esc(view.q || "") + '"></label>'
        + '<span class="table-count" data-list-count="' + esc(key) + '"></span>'
        + '<button class="btn btn-secondary btn-sm" type="button" data-action="list-export" data-list="' + esc(key) + '">تصدير Excel</button>'
        + (view.q ? '<button class="btn btn-secondary btn-sm" type="button" data-action="list-clear" data-list="' + esc(key) + '">مسح البحث</button>' : ""));
      list.parentNode.insertBefore(toolbar, list);
      applyListView(list);
    });
  }

  function applyListView(list) {
    var key = list.getAttribute("data-list-key");
    var view = tableViewState[key] || { q: "" };
    var items = Array.prototype.filter.call(list.children, function (node) { return node.nodeType === 1; });
    var needle = String(view.q || "").trim().toLowerCase();
    var shown = 0;
    items.forEach(function (item) {
      var visible = !needle || item.textContent.replace(/\s+/g, " ").toLowerCase().indexOf(needle) !== -1;
      item.style.display = visible ? "" : "none";
      if (visible) shown += 1;
    });
    var counter = document.querySelector('[data-list-count="' + key + '"]');
    if (counter) counter.textContent = localizeText(shown === items.length ? "كل السجلات: " + formatNumber(items.length) : "يعرض " + formatNumber(shown) + " من " + formatNumber(items.length));
  }

  function listByKey(key) {
    return document.querySelector('[data-list-key="' + key + '"]');
  }

  // جداول الإدخال (تقسيم الأسابيع، تسجيل الإنتاج، احتياجات المواد) كانت مستثناة كليًا.
  // الفرز فيها خطر على تسلسل الحقول والتصدير بلا معنى (الخلايا حقول فارغة)، أما البحث
  // وفلاتر الأعمدة فآمنة: الإخفاء لا يعطّل الحقل ولا يمنع إرساله، فصار مسموحًا بها.
  function enhanceDataTables(host, scope) {
    if (!host) return;
    enhanceDataLists(host);
    Array.prototype.forEach.call(host.querySelectorAll("table"), function (table, index) {
      if (!table.tBodies.length) return;
      var isEntryTable = Boolean(table.closest(".plan-entry-table"));
      if (table.tBodies[0].rows.length < TABLE_FILTER_MIN_ROWS) return;
      var key = (scope || "") + tableKeyFor(table, index);
      table.setAttribute("data-table-key", key);
      var view = tableViewState[key] || (tableViewState[key] = { q: "", cols: {}, sort: null });
      var columns = filterableColumns(table);
      // إسقاط أي فلتر عمود لم تعد قيمته موجودة بعد تغير البيانات.
      Object.keys(view.cols).forEach(function (columnIndex) {
        var match = columns.filter(function (column) { return String(column.index) === String(columnIndex); })[0];
        if (!match || match.values.indexOf(view.cols[columnIndex]) === -1) delete view.cols[columnIndex];
      });
      var selects = columns.map(function (column) {
        var options = column.values.map(function (value) {
          return '<option value="' + esc(value) + '"' + (view.cols[column.index] === value ? " selected" : "") + '>' + esc(value) + '</option>';
        }).join("");
        return '<label class="table-filter-field"><span>' + esc(column.label) + '</span><select class="select" data-action="table-filter" data-table="' + esc(key) + '" data-column="' + column.index + '"><option value="">الكل</option>' + options + '</select></label>';
      }).join("");
      var active = Boolean(view.q) || Object.keys(view.cols).some(function (columnIndex) { return view.cols[columnIndex]; }) || Boolean(view.sort);
      var toolbar = document.createElement("div");
      toolbar.className = "table-toolbar";
      toolbar.innerHTML = localizeHtml('<label class="table-filter-field grow"><span>بحث</span><input class="input" type="search" placeholder="اكتب أي كلمة أو رقم للتصفية" data-action="table-search" data-table="' + esc(key) + '" value="' + esc(view.q || "") + '"></label>'
        + selects
        + '<span class="table-count" data-table-count="' + esc(key) + '"></span>'
        + (isEntryTable ? "" : '<button class="btn btn-secondary btn-sm" type="button" data-action="table-export" data-table="' + esc(key) + '">تصدير Excel</button>')
        + (active ? '<button class="btn btn-secondary btn-sm" type="button" data-action="table-clear" data-table="' + esc(key) + '">مسح الفلاتر</button>' : ""));
      var wrap = table.closest(".table-wrap") || table;
      wrap.parentNode.insertBefore(toolbar, wrap);
      var emptyNote = document.createElement("div");
      emptyNote.className = "form-note table-empty";
      emptyNote.setAttribute("data-table-empty", key);
      emptyNote.textContent = localizeText("لا يوجد صف يطابق التصفية الحالية.");
      emptyNote.style.display = "none";
      wrap.parentNode.insertBefore(emptyNote, wrap.nextSibling);
      // رؤوس قابلة للفرز بالنقر — إلا في جداول الإدخال، فإعادة ترتيب صفوفها تربك المستخدم أثناء التعبئة.
      if (!isEntryTable && table.tHead && table.tHead.rows.length) {
        var headRow = table.tHead.rows[table.tHead.rows.length - 1];
        Array.prototype.forEach.call(headRow.cells, function (cell, columnIndex) {
          if (!cell.textContent.trim()) return;
          cell.setAttribute("data-action", "table-sort");
          cell.setAttribute("data-table", key);
          cell.setAttribute("data-column", columnIndex);
          cell.classList.add("sortable");
          if (view.sort && view.sort.column === columnIndex) cell.classList.add(view.sort.dir === "desc" ? "sort-desc" : "sort-asc");
        });
      }
      applyTableView(table);
    });
  }

  // ===== تصدير Excel لأي جدول أو قائمة على الشاشة =====
  // القاعدة: يُصدَّر ما هو ظاهر فعلًا — بعد البحث وفلاتر الأعمدة وبترتيب الفرز الحالي —
  // لأن المستخدم يتوقع أن يجد في الملف ما يراه على الشاشة، لا الجدول الخام.
  function csvCell(value) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function cellsToCsvLine(cells) {
    return Array.prototype.map.call(cells, function (cell) { return csvCell(cell.textContent); }).join(",");
  }

  function exportFileName(node) {
    var key = node.getAttribute("data-table-key") || node.getAttribute("data-list-key") || "";
    var ordinal = /#(?:list)?(\d+)#?/.exec(key);
    var page = String(state.page || "table").replace(/[^A-Za-z0-9]+/g, "");
    return "EMICP-" + (page || "table") + (ordinal ? "-" + (Number(ordinal[1]) + 1) : "") + "-" + currentTimestamp().slice(0, 10) + ".csv";
  }

  function exportVisibleTable(key) {
    var table = tableByKey(key);
    if (!table) return;
    var lines = [];
    if (table.tHead) Array.prototype.forEach.call(table.tHead.rows, function (row) { lines.push(cellsToCsvLine(row.cells)); });
    var shown = 0;
    Array.prototype.forEach.call(table.tBodies, function (body) {
      Array.prototype.forEach.call(body.rows, function (row) {
        if (row.style.display === "none") return;
        shown += 1;
        lines.push(cellsToCsvLine(row.cells));
      });
    });
    if (table.tFoot) Array.prototype.forEach.call(table.tFoot.rows, function (row) { lines.push(cellsToCsvLine(row.cells)); });
    if (!shown) { showToast("لا يوجد صف ظاهر للتصدير؛ خفّف الفلاتر أولًا.", "error"); return; }
    if (!downloadTextFile(exportFileName(table), "\uFEFF" + lines.join("\n") + "\n")) return;
    showToast("صُدّر " + formatNumber(shown) + " صفًا كما هو ظاهر على الشاشة — يفتح في Excel مباشرة.", "success");
  }

  function exportVisibleList(key) {
    var list = listByKey(key);
    if (!list) return;
    var items = Array.prototype.filter.call(list.children, function (node) { return node.nodeType === 1 && node.style.display !== "none"; });
    if (!items.length) { showToast("لا يوجد سجل ظاهر للتصدير؛ خفّف البحث أولًا.", "error"); return; }
    var lines = items.map(function (item) {
      var parts = Array.prototype.filter.call(item.children, function (node) { return node.nodeType === 1; });
      if (!parts.length) return csvCell(item.textContent);
      return parts.map(function (part) { return csvCell(part.textContent); }).join(",");
    });
    if (!downloadTextFile(exportFileName(list), "\uFEFF" + lines.join("\n") + "\n")) return;
    showToast("صُدّر " + formatNumber(items.length) + " سجلًا كما هو ظاهر على الشاشة — يفتح في Excel مباشرة.", "success");
  }

  function tableByKey(key) {
    return document.querySelector('table[data-table-key="' + key + '"]');
  }

  function renderPage() {
    if (!canAccess(state.page)) return renderDenied();
    var renderers = {
      home: renderHome,
      setup: renderSetup,
      productMaster: renderProductMaster,
      materialMaster: renderMaterialMaster,
      packingMaster: renderPackingMaster,
      workflow: renderWorkflow,
      forecasts: renderForecasts,
      weekly: renderWeeklyPlans,
      monthly: renderMonthly,
      fgView: renderFgView,
      materials: renderMaterials,
      rawRequirements: function () { return renderMaterials("raw"); },
      packingRequirements: function () { return renderMaterials("packing"); },
      execution: renderExecution,
      requirements: renderRequirements,
      procurement: renderProcurement,
      rmStock: renderRmStock,
      receipts: renderRawReceipts,
      packingStock: renderPackingStock,
      packingReceipts: renderPackingReceipts,
      fgReceipts: renderFgReceipts,
      fgStock: renderFgStock,
      finance: renderFinance,
      approvals: renderApprovalsInbox,
      reports: renderReports,
      agentOrders: renderAgentOrders,
      agentMaster: renderAgentMaster,
      cityMaster: renderCityMaster,
      languages: renderLanguages,
      issues: renderIssues,
      audit: renderAudit,
      executive: renderExecutive,
      admin: renderAdmin
    };
    return renderers[state.page] ? renderers[state.page]() : renderDenied();
  }

  function renderDenied() {
    return pageHead("صلاحية غير متاحة", "هذه الشاشة خارج حدود دورك", "جرّب دورًا آخر من القائمة العلوية.", "") + boundary() + card("غير متاح", "", empty("لا توجد صلاحية", "لا يمكن لهذا الدور فتح هذه البيانات."));
  }

  function renderHome() {
    var map = {
      sales: renderSalesHome,
      production: renderProductionHome,
      procurement: renderProcurementHome,
      rmWarehouse: renderRmWarehouseHome,
      fgWarehouse: renderFgWarehouseHome,
      finance: renderFinanceHome,
      executive: renderExecutive,
      admin: renderAdminHome
    };
    if (!map[state.role]) return renderDenied();
    var content = map[state.role]();
    var marker = boundary();
    return content.replace(marker, marker + renderJourneyCard());
  }

  function renderSalesHome() {
    var currentForecast = state.forecasts.find(function (item) { return item.status !== "cancelled"; });
    var feedbackDocs = state.forecasts.filter(function (item) { return item.status === "production_feedback"; }).length;
    var fixedDocs = fixedForecasts().length;
    var netCodes = [];
    state.fgReceipts.forEach(function (item) { var code = normalizeCode(item.productCode); if (netCodes.indexOf(code) === -1) netCodes.push(code); });
    var available = netCodes.reduce(function (sum, code) { return sum + productNetAvailable(code); }, 0);
    return pageHead("مساحة المبيعات", "Forecast السنة شهرًا بشهر", "أرسل التوقع للإنتاج وتفاوض حتى التثبيت، راجع الخطة الأسبوعية، وسجّل المبيعات من الصافي المتاح.", '<button class="btn btn-primary" type="button" data-action="new-forecast">Forecast جديد</button><button class="btn btn-secondary" type="button" data-page="weekly">الخطة الأسبوعية</button>') + boundary() +
      (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("Forecast الحالي", currentForecast ? formatNumber(forecastTotalQty(currentForecast)) : "0", currentForecast ? (currentForecast.items.length + " منتجات · " + forecastPeriod(currentForecast)) : "ابدأ بإنشاء Forecast", "", "F") + summary("ردود إنتاج بانتظاري", String(feedbackDocs), "راجع واقبل أو عدّل", feedbackDocs ? "amber" : "", "R") + summary("مستندات مثبتة", String(fixedDocs), "دخلت التنفيذ", "", "✓") + summary("الصافي المتاح للبيع", formatNumber(available), "المؤكد − المباع", "blue", "A") + '</section>' : "") +
      ((homeWidgetVisible("available") || homeWidgetVisible("forecast")) ? '<section class="grid two-col"><div>' + (homeWidgetVisible("available") ? renderFgSummaryCard() : "") + '</div><div>' + (homeWidgetVisible("forecast") ? card("مستندات Forecast", "التفاوض والإصدارات من شاشة Forecast", empty("تابع من شاشة Forecast", "كل مستنداتك وحالاتها وأزرار المراجعة هناك.", '<button class="btn btn-primary" type="button" data-page="forecasts">فتح Forecast</button>')) : "") + '</div></section>' : "");
  }

  function renderProductionHome() {
    var submitted = state.forecasts.filter(function (item) { return item.status === "submitted"; }).length;
    var modifiedForecasts = state.forecasts.filter(function (item) { return item.status === "production_feedback"; }).length;
    var approvals = state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_approvals" && !planFullyApprovedByRole(plan, "production"); }).length;
    var shortages = state.materials.filter(function (item) { return item.stockConfirmed && materialShortage(item) > 0; }).length;
    var runs = pendingProductionEntries().length;
    return pageHead("مساحة الإنتاج", "فحص القدرة والتثبيت ثم المواد والتنفيذ", "رد على Forecast حتى التثبيت، احسب المواد شهرًا بشهر، اعتمد النتيجة، وسجل الفعلي.", '<button class="btn btn-secondary" type="button" data-page="forecasts">Forecast الوارد</button><button class="btn btn-primary" type="button" data-page="rawRequirements">احتياجات المواد الأولية</button><button class="btn btn-secondary" type="button" data-page="packingRequirements">احتياجات مواد التغليف</button>') + boundary() +
      (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("Forecast بانتظار الرد", String(submitted), "تحرير الكميات وإرسال الرد", submitted ? "amber" : "", "F") + summary("Forecast معدّل قابل للتحميل", String(modifiedForecasts), "زر التحميل في صفحة Forecast", modifiedForecasts ? "blue" : "", "↓") + summary("خطط أسبوعية بانتظار اعتمادي", String(approvals), "اعتماد الإنتاج للخطة الأسبوعية", approvals ? "amber" : "", "✔") + summary("مواد فيها نقص", String(shortages), "بعد رفع رصيد المخزن", shortages ? "red" : "", "M") + '</section>' : "") +
      (homeWidgetVisible("materials") ? renderProductionMaterialSnapshot() : "");
  }

  function renderProcurementHome() {
    var shortage = state.materials.filter(function (item) { return item.stockConfirmed && warehouseReviewReleased(item) && materialShortage(item) > 0; }).length;
    var transit = state.commitments.filter(function (item) { return item.status === "in_transit"; }).length;
    var canBuy = procurementReleaseExists();
    var viewButton = '<button class="btn btn-beautify" type="button" data-action="toggle-procurement-view" aria-pressed="' + (procurementPolished ? "true" : "false") + '"><span aria-hidden="true">✦</span>' + (procurementPolished ? "العرض المعتاد" : "تحسين العرض") + '</button>';
    return pageHead("مساحة المشتريات", "التزم بالنقص المؤكد فقط", "لا تصل الكميات هنا قبل مراجعة الإنتاج وتأكيد المخزن وتحويل الإنتاج للملف.", viewButton + (canBuy ? '<button class="btn btn-primary" type="button" data-action="new-commitment">التزام شراء</button>' : "")) + boundary() +
      (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("طلبات بنقص", String(shortage), "Confirmed Shortage", shortage ? "red" : "", "M") + summary("In Transit", String(transit), "شحنات قادمة", "amber", "T") + summary("نقص جاهز للشراء", String(purchasableShortages().length), "بعد اعتماد الإنتاج والمخزن", "amber", "✔") + summary("PO مفتوح", String(state.commitments.length), "التزامات فعالة", "blue", "P") + '</section>' : "") +
      ((homeWidgetVisible("requirements") || homeWidgetVisible("commitments")) ? '<section class="grid two-col"><div>' + (homeWidgetVisible("requirements") ? renderRequirementCard(true) : "") + '</div><div>' + (homeWidgetVisible("commitments") ? renderCommitmentCard(true) : "") + '</div></section>' : "");
  }

  function renderRmWarehouseHome() {
    var rawItems = state.materials.filter(function (item) { return (item.category || "raw") === "raw"; });
    var pending = rawItems.filter(function (item) { return !item.stockConfirmed; }).length;
    var expected = state.rawReceipts.filter(function (item) { return item.status === "expected" && receiptReadyForWarehouse(item) && (rawMasterByCode(item.materialCode, "raw") != null); }).length;
    return pageHead("مستودع المواد الأولية", "سجّل حقيقة مخزون المواد الأولية", "هذه الصفحة للمواد الأولية فقط. مواد التغليف لها صفحة مستودع مستقلة.", '<button class="btn btn-primary" type="button" data-action="receive-material" data-category="raw">تسجيل استلام مواد أولية</button>') + boundary() +
      (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("تأكيدات مخزون", String(pending), "مواد أولية بانتظار المراجعة", pending ? "amber" : "", "C") + summary("وارد متوقع", String(expected), "مواد أولية مرتبطة بـPO", "blue", "R") + summary("Hold", String(rawItems.filter(function (i) { return i.hold > 0; }).length), "مواد أولية غير قابلة للصرف", "amber", "H") + '</section>' : "") + (homeWidgetVisible("stock") ? renderRmStockCard(true, "raw") : "");
  }

  function renderFgWarehouseHome() {
    var available = state.fgReceipts.reduce(function (sum, item) { return sum + fgAvailable(item); }, 0);
    var variance = state.fgReceipts.filter(function (item) { return item.produced !== item.received; }).length;
    return pageHead("مخزن المنتج النهائي", "أكّد ما وصل فعليًا", "Production Actual لا يصبح Available for Sales قبل عدّ المستودع وتأكيد الاستلام.", '<button class="btn btn-primary" type="button" data-action="confirm-fg">تأكيد استلام دفعة</button>') + boundary() +
      (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("Available for Sales", formatNumber(available), "بعد الحجز والحظر", "blue", "A") + summary("فروقات استلام", String(variance), "Produced مقابل Received", variance ? "red" : "", "Δ") + summary("Reserved", formatNumber(state.fgReceipts.reduce(function (s, i) { return s + i.reserved; }, 0)), "لطلبات مؤكدة", "amber", "R") + summary("Blocked", formatNumber(state.fgReceipts.reduce(function (s, i) { return s + i.blocked; }, 0)), "غير قابل للبيع", "red", "B") + '</section>' : "") + (homeWidgetVisible("stock") ? renderFgStockCard(true) : "");
  }

  function renderFinanceHome() {
    var openPos = state.commitments.filter(function (i) { return i.status !== "received" && i.status !== "cancelled"; }).length;
    var receivedMoves = state.rawReceipts.filter(function (i) { return i.status === "received"; }).length;
    var fgAvailableTotal = state.fgReceipts.reduce(function (sum, item) { return sum + fgAvailable(item); }, 0);
    var shortages = state.materials.filter(function (item) { return item.stockConfirmed && materialShortage(item) > 0; }).length;
    return pageHead("المالية", "مراجعة Forecast وموافقة أوامر الشراء", "Forecast يصل إليك للمراجعة قبل تثبيته النهائي، كما لا يعبر أمر الشراء قبل موافقتك.", "") + boundary() + (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("PO مفتوح", String(openPos), "قيد التوريد", openPos ? "amber" : "", "P") + summary("حركات استلام", String(receivedMoves), "وارد مواد مسجل", "", "R") + summary("مواد بنقص", String(shortages), "بعد رفع الرصيد", shortages ? "red" : "", "M") + summary("FG متاح للبيع", formatNumber(fgAvailableTotal), "رصيد المنتج النهائي", "blue", "A") + '</section>' : "") + (homeWidgetVisible("finance") ? renderFinanceCard() : "");
  }

  function renderAdminHome() {
    var setupAlert = (!state.cities.length || !state.agents.length) ? '<div class="form-note locked"><strong>تنبيه إعدادات المبيعات:</strong> ' + (!state.cities.length ? "عرّف المدن" : "✓ المدن معرفة") + " · " + (!state.agents.length ? "عرّف الوكلاء بعد المدن" : "✓ الوكلاء معرفون") + '<div class="list-actions"><button class="btn btn-secondary btn-sm" type="button" data-page="cityMaster">تعريف المدن</button><button class="btn btn-secondary btn-sm" type="button" data-page="agentMaster">تعريف الوكلاء</button></div></div>' : '';
    return pageHead("مسؤول النظام", "تهيئة النظام وإدارة الوصول", "عرّف المنتجات والمواد الأولية أولًا، ثم اضبط صلاحيات الأدوار.", '<button class="btn btn-primary" type="button" data-page="setup">فتح التهيئة</button><button class="btn btn-secondary" type="button" data-page="admin">فتح الصلاحيات</button><button class="btn btn-secondary" type="button" data-page="executive">فتح داشبورد الإدارة</button>') + boundary() + setupAlert + (homeWidgetVisible("kpis") ? '<section class="grid summary-grid">' + summary("المنتجات", String(state.products.length), "أكواد فريدة", "blue", "P") + summary("المواد الأولية", String(state.rawMaterials.length), "أكواد فريدة", "blue", "M") + summary("الأدوار", String(Object.keys(roles).length), "أدوار تجريبية", "", "R") + summary("أحداث Audit", String(state.audit.length), "محفوظة محليًا", "", "A") + '</section>' : "") + (homeWidgetVisible("boundaries") ? card("حدود ثابتة", "", '<div class="form-note locked"><strong>التعريفات لمسؤول النظام فقط، والمبيعات لا ترى المواد الأولية.</strong> هذه قواعد عمل محمية وليست صلاحيات اختيارية.</div>') : "");
  }

  function renderSetup() {
    var productsReady = state.products.length > 0;
    var materialsReady = state.rawMaterials.length > 0;
    var setupBody = '<div class="setup-grid"><article class="setup-card"><span class="setup-number">1</span><div><h2>تعريف المنتجات</h2><p>كود فريد، اسم المنتج، ووحدة القياس. هذه القائمة هي مصدر Dropdown داخل Forecast.</p><div class="setup-meta">' + status(productsReady ? state.products.length + " منتج" : "غير مكتمل", productsReady ? "green" : "amber") + '</div></div><button class="btn btn-primary" type="button" data-page="productMaster">فتح المنتجات</button></article><article class="setup-card"><span class="setup-number">2</span><div><h2>تعريف المواد الأولية</h2><p>كود فريد، اسم المادة، ووحدة القياس. يستخدمها الإنتاج في احتياجات المواد.</p><div class="setup-meta">' + status(materialsReady ? state.rawMaterials.length + " مادة" : "غير مكتمل", materialsReady ? "green" : "amber") + '</div></div><button class="btn btn-primary" type="button" data-page="materialMaster">فتح المواد</button></article><article class="setup-card"><span class="setup-number">3</span><div><h2>تعريف الوكلاء</h2><p>كود فريد واسم ومنطقة لكل وكيل. يختاره المبيعات عند تسجيل أوردرات الوكلاء التي تُبنى منها أرقام Forecast.</p><div class="setup-meta">' + status(state.agents.length ? state.agents.length + " وكيل" : "اختياري", state.agents.length ? "green" : "gray") + '</div></div><button class="btn btn-primary" type="button" data-page="agentMaster">فتح الوكلاء</button></article></div>';
    return pageHead("التعريفات", "تهيئة النظام قبل التشغيل", "المنتجات مطلوبة لإنشاء Forecast، والمواد الأولية مطلوبة عندما يحدد الإنتاج احتياجات الخطة.", '<button class="btn btn-secondary" type="button" data-action="open-templates">القوالب</button>') + boundary() + setupBody + card("حالة الجاهزية", "", '<div class="readiness-line"><span>المنتجات</span>' + status(productsReady ? "جاهز" : "مطلوب", productsReady ? "green" : "amber") + '<span>المواد الأولية</span>' + status(materialsReady ? "جاهز" : "مطلوب قبل احتياجات الإنتاج", materialsReady ? "green" : "amber") + '<strong>' + (productsReady && materialsReady ? "النظام جاهز للدورة الكاملة" : productsReady ? "يمكن للمبيعات بدء Forecast" : "عرّف المنتجات أولًا") + '</strong></div>')
      + card("حدّ التفويض في الموافقات", "الخطة الأسبوعية داخل هذا الحدّ تصل محددة مسبقًا في صندوق الموافقات؛ ما تجاوزه يصل استثناءً يطلب قرارًا",
        '<form id="approval-policy-form"><div class="form-grid"><div class="field"><label for="ap-tolerance">حدّ الانحراف المسموح عن صافي الفوركاست (٪)</label><input class="input" id="ap-tolerance" name="apTolerance" type="number" min="0" max="100" step="0.5" value="' + esc(approvalTolerance()) + '"></div></div>'
        + '<div class="form-note">الحدّ لا يعتمد شيئًا نيابة عن أحد — يقرر فقط ما يأتي محددًا مسبقًا. كل موافقة تبقى باسم صاحبها في سجل الأحداث. الصفر يعني: لا يمرّ إلا المطابق تمامًا.</div>'
        + '<div class="list-actions"><button class="btn btn-primary" type="submit">حفظ الحدّ</button></div></form>');
  }

  // ===== أوردرات الوكلاء (Schema 22): مصدر الطلب الأول، والمبيعات المباشرة القناة الثانية =====
  function activeAgents() {
    return state.agents.filter(function (item) { return item.active !== false; });
  }

  function agentByCode(code) {
    return state.agents.find(function (item) { return normalizeCode(item.code) === normalizeCode(code); });
  }

  function agentName(code) {
    var agent = agentByCode(code);
    return agent ? agent.name : code;
  }

  function agentOrderQty(order) {
    return (order.lines || []).reduce(function (sum, line) { return sum + Number(line.qty || 0); }, 0);
  }

  function agentOrderValue(order) {
    return (order.lines || []).reduce(function (sum, line) { return sum + Number(line.qty || 0) * Number(line.price || 0); }, 0);
  }

  function activeAgentOrders() {
    return state.agentOrders.filter(function (item) { return item.status !== "cancelled"; });
  }

  // الطلب المجمّع من أوردرات الوكلاء: (منتج × شهر).
  // الطلب المتبقي لا الطلب الأصلي: ما سُلِّم فعلًا يُطرح، وإلا خُطِّط لإنتاجه مرة ثانية.
  function agentDemandMatrix() {
    var matrix = {};
    activeAgentOrders().forEach(function (order) {
      var deliveredByProduct = {};
      (order.lines || []).forEach(function (line) {
        var code = normalizeCode(line.productCode);
        var month = line.month || order.month;
        if (!month) return;
        if (deliveredByProduct[code] === undefined) deliveredByProduct[code] = agentOrderDeliveredQty(order.id, code);
        var remaining = Number(line.qty || 0);
        var applied = Math.min(remaining, Math.max(0, deliveredByProduct[code]));
        deliveredByProduct[code] -= applied;
        remaining = roundQty(remaining - applied);
        if (remaining <= QTY_EPSILON) return;
        matrix[code] = matrix[code] || {};
        matrix[code][month] = roundQty((matrix[code][month] || 0) + remaining);
      });
    });
    return matrix;
  }

  function agentDemandTotal() {
    var matrix = agentDemandMatrix();
    return Object.keys(matrix).reduce(function (sum, code) {
      return sum + Object.keys(matrix[code]).reduce(function (inner, month) { return inner + matrix[code][month]; }, 0);
    }, 0);
  }

  function agentDemandUncovered() {
    var matrix = agentDemandMatrix();
    return Object.keys(matrix).reduce(function (sum, code) {
      return sum + Object.keys(matrix[code]).reduce(function (inner, month) {
        return inner + Math.max(0, matrix[code][month] - fixedForecastQty(code, month));
      }, 0);
    }, 0);
  }

  function agentDemandFor(code, month) {
    var matrix = agentDemandMatrix();
    return (matrix[normalizeCode(code)] && matrix[normalizeCode(code)][month]) || 0;
  }

  // الكمية المثبتة في المستندات لكل (منتج × شهر) — لقياس تغطية طلب الوكلاء.
  // مستندان مثبتان يغطيان نفس (منتج × شهر) يُنتجان ضعف الطلب: خطتان أسبوعيتان وتغطية 200٪.
  function conflictingFixedCoverage(forecast) {
    var conflicts = [];
    (forecast.items || []).forEach(function (line) {
      var code = normalizeCode(line.productCode);
      Object.keys(line.monthlyQty || {}).forEach(function (month) {
        if (Number(line.monthlyQty[month] || 0) <= 0) return;
        state.forecasts.forEach(function (other) {
          if (other.id === forecast.id || other.status !== "fixed") return;
          (other.items || []).forEach(function (otherLine) {
            if (normalizeCode(otherLine.productCode) !== code) return;
            if (Number((otherLine.monthlyQty || {})[month] || 0) <= 0) return;
            conflicts.push({ productCode: line.productCode, month: month, forecastId: other.id });
          });
        });
      });
    });
    return conflicts;
  }

  function fixedForecastQty(code, month) {
    var total = 0;
    state.forecasts.filter(function (forecast) { return forecast.status === "fixed"; }).forEach(function (forecast) {
      (forecast.items || []).forEach(function (line) {
        if (normalizeCode(line.productCode) !== normalizeCode(code)) return;
        total += Number((line.monthlyQty || {})[month] || 0);
      });
    });
    return total;
  }

  // اقتراح المبيعات المباشرة: متوسط المبيعات المباشرة التاريخية الشهرية لكل منتج.
  // نافذة ثابتة ستة أشهر مكتملة (بلا الشهر الجاري): القسمة على «أشهر البيع» فقط كانت تضخّم
  // المتوسط أضعافًا — بيع 300 في شهر واحد من ثمانية كان يقترح 300 لكل شهر قادم.
  var DIRECT_SALES_WINDOW = 6;

  // ===== دقة التنبؤ: انحياز ونسبة خطأ من الفوركاست المثبت مقابل المبيعات الفعلية =====
  // بلا هذا القياس لا يتعلم المقترح القادم من انحراف الشهر الماضي إطلاقًا.
  function demandAccuracyFor(code) {
    var currentMonth = monthKeyOf(dateDaysFromNow(0));
    var months = [];
    state.forecasts.filter(function (item) { return item.status === "fixed"; }).forEach(function (forecast) {
      forecast.items.forEach(function (line) {
        if (normalizeCode(line.productCode) !== normalizeCode(code)) return;
        (forecast.months || []).forEach(function (month) {
          if (month >= currentMonth) return;
          if (Number(line.monthlyQty[month] || 0) <= 0) return;
          if (months.indexOf(month) === -1) months.push(month);
        });
      });
    });
    if (!months.length) return null;
    months.sort();
    var planned = 0, actual = 0, absError = 0;
    months.forEach(function (month) {
      var fc = fixedForecastQty(code, month);
      var sold = soldInMonth(code, month);
      planned += fc;
      actual += sold;
      absError += Math.abs(sold - fc);
    });
    if (planned <= QTY_EPSILON) return null;
    return {
      months: months.length,
      planned: roundQty(planned),
      actual: roundQty(actual),
      bias: Math.round(((actual - planned) / planned) * 1000) / 10,
      wmape: Math.round((absError / planned) * 1000) / 10
    };
  }

  function directSalesStats(code) {
    var currentMonth = monthKeyOf(dateDaysFromNow(0));
    var windowMonths = [];
    var cursor = currentMonth;
    for (var step = 0; step < DIRECT_SALES_WINDOW; step += 1) {
      cursor = monthKeyOf(shiftDate(cursor + "-01", -1));
      if (!cursor) break;
      windowMonths.push(cursor);
    }
    if (!windowMonths.length) return { average: 0, monthsWithData: 0, windowMonths: 0 };
    var total = 0;
    var seen = {};
    state.salesRecords.forEach(function (item) {
      if (item.channel === "agent") return;
      if (normalizeCode(item.productCode) !== normalizeCode(code)) return;
      var key = monthKeyOf(item.date);
      if (!key || windowMonths.indexOf(key) === -1) return;
      total += Number(item.qty || 0);
      seen[key] = true;
    });
    return {
      average: Math.round(total / windowMonths.length),
      monthsWithData: Object.keys(seen).length,
      windowMonths: windowMonths.length
    };
  }

  function directSalesSuggestion(code) {
    return directSalesStats(code).average;
  }

  function agentOrderDeliveredQty(orderId, productCode) {
    return state.salesRecords.filter(function (item) {
      return item.agentOrderId === orderId && (!productCode || normalizeCode(item.productCode) === normalizeCode(productCode));
    }).reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
  }

  function agentOrderStatusInfo(order) {
    if (order.status === "cancelled") return ["ملغي", "gray"];
    var ordered = agentOrderQty(order);
    var delivered = agentOrderDeliveredQty(order.id);
    if (delivered >= ordered && ordered > 0) return ["مسلّم بالكامل", "green"];
    if (delivered > 0) return ["تسليم جزئي", "amber"];
    var covered = (order.lines || []).every(function (line) {
      var month = line.month || order.month;
      return fixedForecastQty(line.productCode, month) > 0;
    });
    if (covered && (order.lines || []).length) return ["مضمّن في مستند مثبت", "blue"];
    return ["بانتظار التضمين في Forecast", "amber"];
  }

  function renderAgentMaster() {
    var rows = state.agents.map(function (item) {
      var orders = activeAgentOrders().filter(function (order) { return normalizeCode(order.agentCode) === normalizeCode(item.code); });
      return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong></td><td>' + esc(item.name) + (item.contact ? '<br><small>' + esc(item.contact) + (item.phone ? ' · ' + esc(item.phone) : "") + '</small>' : "") + '</td><td>' + (item.region ? esc(item.region) : "—") + '</td><td><span class="number">' + orders.length + '</span></td><td>' + status(item.active === false ? "غير فعال" : "فعال", item.active === false ? "gray" : "green") + '</td><td><button class="btn btn-secondary btn-sm" type="button" data-action="edit-agent" data-code="' + esc(item.code) + '">تعديل</button><button class="btn btn-danger btn-sm" type="button" data-action="delete-agent" data-code="' + esc(item.code) + '">حذف</button></td></tr>';
    }).join("");
    var cityAlert = !state.cities.length ? '<div class="form-note locked"><strong>تنبيه:</strong> عرّف مدينة واحدة على الأقل قبل إضافة وكيل؛ المدينة جزء إلزامي من تعريف الوكيل.</div>' : '';
    var content = cityAlert + (rows ? '<div class="table-wrap"><table><thead><tr><th>الكود الفريد</th><th>اسم الوكيل</th><th>المنطقة</th><th>الأوردرات</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا يوجد وكلاء بعد", "أضف أول وكيل يدويًا أو استورد قائمة من Excel."));
    var actions = '<button class="btn btn-primary" type="button" data-action="new-agent">إضافة وكيل</button><label class="btn btn-secondary file-button">استيراد Excel<input type="file" accept=".xlsx,.xls,.csv" data-action="import-master" data-kind="agents"></label><button class="btn btn-secondary" type="button" data-action="download-master-template" data-kind="agents">تحميل القالب</button>';
    return pageHead("Agents Master", "تعريف الوكلاء", "كل وكيل بكود فريد ومنطقة وجهة اتصال؛ يختاره المبيعات عند إدخال الأوردرات.", actions) + boundary() + card("دليل الوكلاء", state.agents.length + " وكيل معرف", content);
  }

  function renderCityMaster() {
    var rows = state.cities.map(function (item) { return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong></td><td>' + esc(item.name) + '</td><td>' + stepDate("الإنشاء", item.createdAt) + '</td></tr>'; }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>الكود الفريد</th><th>اسم المدينة</th><th>تاريخ الإنشاء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد مدن معرفة", "أضف المدن التي سيُختار منها موقع الوكيل.", '<button class="btn btn-primary" type="button" data-action="new-city">إضافة أول مدينة</button>');
    var actions = '<button class="btn btn-primary" type="button" data-action="new-city">إضافة مدينة</button><label class="btn btn-secondary file-button">استيراد Excel<input type="file" accept=".xlsx,.xls,.csv" data-action="import-master" data-kind="cities"></label><button class="btn btn-secondary" type="button" data-action="download-master-template" data-kind="cities">تنزيل قالب المدن</button>';
    return pageHead("Cities Master", "تعريف المدن", "قائمة مستقلة للمدن، تُستخدم عند تعريف الوكلاء بدل الكتابة غير الموحدة.", actions) + boundary() + card("دليل المدن", state.cities.length + " مدينة معرفة", content);
  }

  function openCityForm() {
    var body = '<div class="form-grid"><div class="field"><label for="city-code">كود المدينة</label><input class="input code-input" id="city-code" name="cityCode" maxlength="32" placeholder="مثال: BAGHDAD" required></div><div class="field"><label for="city-name">اسم المدينة</label><input class="input" id="city-name" name="cityName" placeholder="مثال: بغداد" required></div></div>';
    openDialog(dialogShell("إضافة مدينة", "الكود فريد واسم المدينة سيظهر في تعريف الوكلاء.", body, "حفظ المدينة", "city-form"));
  }

  function openTemplatesDialog() {
    var body = '<div class="list"><div class="list-item"><div><h3>المنتجات النهائية</h3><p>code · name · unit</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-master-template" data-kind="products">تحميل القالب</button></div><div class="list-item"><div><h3>المواد الأولية</h3><p>code · name · category</p></div><a class="btn btn-secondary btn-sm" href="EMICP-materials-import-template.xlsx" download>تحميل قالب Excel</a></div><div class="list-item"><div><h3>مواد التعبئة والتغليف</h3><p>code · name · category</p></div><a class="btn btn-secondary btn-sm" href="EMICP-packaging-materials-template.xlsx" download>تحميل قالب Excel</a></div><div class="list-item"><div><h3>المدن</h3><p>code · name</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-master-template" data-kind="cities">تحميل القالب</button></div><div class="list-item"><div><h3>الوكلاء</h3><p>code · name · region · contact · phone · note</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-master-template" data-kind="agents">تحميل القالب</button></div></div>';
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">قوالب التعريفات</h2><p>اختر القالب المطابق للصفحة قبل رفع أي ملف.</p></div><button class="dialog-close" type="button" data-action="close-dialog">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-secondary" type="button" data-action="close-dialog">إغلاق</button></footer>');
  }

  function renderAgentOrders() {
    var canEdit = state.role === "sales";
    var matrix = agentDemandMatrix();
    var months = [];
    Object.keys(matrix).forEach(function (code) { Object.keys(matrix[code]).forEach(function (month) { if (months.indexOf(month) === -1) months.push(month); }); });
    months.sort();
    var demandRows = state.products.filter(function (product) { return matrix[normalizeCode(product.code)]; }).map(function (product) {
      var code = normalizeCode(product.code);
      var cells = months.map(function (month) {
        var demand = matrix[code][month] || 0;
        var fixed = fixedForecastQty(code, month);
        var gap = demand - fixed;
        return '<td>' + (demand ? '<strong class="number">' + formatNumber(demand) + '</strong><br><small>' + (fixed ? "مثبت " + formatNumber(fixed) : "بلا مستند") + '</small>' + (gap > 0 ? '<br>' + status("غير مغطى " + formatNumber(gap), "red") : demand ? '<br>' + status("مغطى", "green") : "") : "—") + '</td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(product.code) + '</strong><br><small>' + esc(product.name) + '</small></td>' + cells + '</tr>';
    }).join("");
    var demandCard = card("الطلب المجمّع من الوكلاء", "مجموع الأوردرات لكل (منتج × شهر) مقابل المثبت في المستندات",
      months.length && demandRows
        ? '<div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج</th>' + months.map(function (month) { return '<th scope="col" class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '</tr></thead><tbody>' + demandRows + '</tbody></table></div><div class="form-note">هذا الطلب لا يمثل كل الفوركاست: تضاف إليه المبيعات المباشرة عند بناء المستند من زر «بناء Forecast من مصادر الطلب».</div>'
        : empty("لا طلب مجمّع بعد", "أضف أوردرات الوكلاء لتظهر هنا مجمّعة."));
    var orderRows = state.agentOrders.map(function (order) {
      var info = agentOrderStatusInfo(order);
      var lines = (order.lines || []).map(function (line) {
        var delivered = agentOrderDeliveredQty(order.id, line.productCode);
        return '<small class="req-po"><span class="code-chip">' + esc(line.productCode) + '</span> ' + formatNumber(line.qty) + (line.price ? ' × ' + formatNumber(line.price) : "") + (delivered ? ' · مسلّم ' + formatNumber(delivered) : "") + (line.month && line.month !== order.month ? ' · ' + esc(monthLabel(line.month)) : "") + '</small>';
      }).join("<br>");
      return '<tr><td><strong>' + esc(order.id) + '</strong><br><small>' + esc(order.orderDate || "") + '</small></td>'
        + '<td>' + esc(agentName(order.agentCode)) + '<br><small class="code-chip">' + esc(order.agentCode) + '</small></td>'
        + '<td>' + esc(monthLabel(order.month)) + '</td>'
        + '<td>' + lines + '</td>'
        + '<td><strong class="number">' + formatNumber(agentOrderQty(order)) + '</strong>' + (agentOrderValue(order) ? '<br><small>قيمة ' + formatNumber(agentOrderValue(order)) + '</small>' : "") + '</td>'
        + '<td>' + status(info[0], info[1]) + (order.note ? '<br><small>' + esc(order.note) + '</small>' : "") + '</td>'
        + '<td>' + (canEdit && order.status !== "cancelled" ? '<button class="btn btn-danger btn-sm" type="button" data-action="cancel-agent-order" data-id="' + esc(order.id) + '">إلغاء</button>' : '<span class="read-only">—</span>') + '</td></tr>';
    }).join("");
    var ordersCard = card("أوردرات الوكلاء (" + state.agentOrders.length + ")", "كل أوردر بتفاصيل أسطره وحالته وتسليمه",
      orderRows ? '<div class="table-wrap"><table><thead><tr><th>الأوردر</th><th>الوكيل</th><th>شهر التسليم</th><th>التفاصيل</th><th>الإجمالي</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>' + orderRows + '</tbody></table></div>' : empty("لا أوردرات بعد", "سجّل أول أوردر وكيل من الزر أعلى الشاشة."),
      canEdit ? '<button class="btn btn-primary btn-sm" type="button" data-action="new-agent-order">تسجيل أوردر وكيل</button>' : "");
    var actions = canEdit ? '<button class="btn btn-primary" type="button" data-action="new-agent-order">تسجيل أوردر وكيل</button><button class="btn btn-secondary" type="button" data-action="build-forecast-from-demand">بناء Forecast من مصادر الطلب</button><button class="btn btn-secondary" type="button" data-action="download-agent-orders-template">تحميل التمبليت</button><label class="btn btn-secondary file-button">رفع أوردرات Excel/CSV<input type="file" accept=".xlsx,.csv" data-action="import-agent-orders"></label>' : "";
    return pageHead("Agent Orders", "أوردرات الوكلاء ومصادر الطلب", "المبيعات تسجل أوردرات الوكلاء بالتفصيل، فتُجمَّع وتُضاف إليها المبيعات المباشرة لبناء الفوركاست.", actions) + boundary() + demandCard + ordersCard;
  }

  function renderProductMaster() {
    var rows = state.products.map(function (item) {
      var bomCount = Array.isArray(item.packingBom) ? item.packingBom.length : 0;
      return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong></td><td>' + esc(item.name) + '</td><td>' + esc(item.unit) + '</td><td>' + (bomCount ? status("وصفة باكينغ: " + bomCount + " مواد", "green") : '<span class="read-only">بلا وصفة باكينغ</span>') + '</td><td>' + status(item.active === false ? "غير فعال" : "فعال", item.active === false ? "gray" : "green") + '</td><td><button class="btn btn-secondary btn-sm" type="button" data-action="edit-product" data-code="' + esc(item.code) + '">تعديل</button><button class="btn btn-secondary btn-sm" type="button" data-action="packing-bom" data-code="' + esc(item.code) + '">وصفة الباكينغ</button><button class="btn btn-danger btn-sm" type="button" data-action="delete-master" data-kind="product" data-code="' + esc(item.code) + '">حذف</button></td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>الكود الفريد</th><th>اسم المنتج</th><th>وحدة القياس</th><th>الباكينغ</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد منتجات معرفة", "أضف أول منتج يدويًا أو استورد مجموعة من Excel.", '<button class="btn btn-primary" type="button" data-action="new-product">إضافة أول منتج</button>');
    var actions = '<button class="btn btn-primary" type="button" data-action="new-product">إضافة منتج</button><label class="btn btn-secondary file-button">استيراد Excel<input type="file" accept=".xlsx,.xls,.csv" data-action="import-master" data-kind="products"></label><button class="btn btn-secondary" type="button" data-action="download-master-template" data-kind="products">تحميل القالب</button>';
    return pageHead("Master Data", "تعريف المنتجات", "كل منتج له كود فريد. يستخدمه قسم المبيعات داخل Forecast بدل الكتابة الحرة.", actions) + boundary() + card("دليل المنتجات", state.products.length + " منتج معرف", content);
  }

  function renderMaterialMasterByCategory(category) {
    var isPacking = category === "packing";
    var title = isPacking ? "تعريف مواد التغليف" : "تعريف المواد الأولية";
    var rows = state.rawMaterials.filter(function (item) { return item.category === category; }).map(function (item) {
      return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong></td><td>' + esc(item.name) + '</td><td>' + materialCategoryBadge(item.category) + '</td><td>' + (item.openingQty == null ? "—" : '<span class="number">' + formatNumber(item.openingQty) + '</span>') + '</td><td>' + status(item.active === false ? "غير فعال" : "فعال", item.active === false ? "gray" : "green") + '</td><td><button class="btn btn-secondary btn-sm" type="button" data-action="edit-raw-material" data-code="' + esc(item.code) + '">تعديل</button><button class="btn btn-danger btn-sm" type="button" data-action="delete-master" data-kind="material" data-code="' + esc(item.code) + '">حذف</button></td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>الكود الفريد</th><th>اسم المادة</th><th>النوع</th><th>كمية افتتاحية مرفوعة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد مواد معرفة", "أضف أول مادة في هذا التعريف المنفصل.", '<button class="btn btn-primary" type="button" data-action="new-raw-material" data-category="' + category + '">إضافة أول مادة</button>');
    var xlsxTemplate = isPacking ? "EMICP-packaging-materials-template.xlsx" : "EMICP-materials-import-template.xlsx";
    var actions = '<button class="btn btn-primary" type="button" data-action="new-raw-material" data-category="' + category + '">إضافة مادة</button><label class="btn btn-secondary file-button">استيراد Excel<input type="file" accept=".xlsx,.xls,.csv" data-action="import-master" data-kind="materials" data-category="' + category + '"></label><a class="btn btn-secondary" href="' + xlsxTemplate + '" download>تحميل قالب Excel</a><button class="btn btn-secondary" type="button" data-action="download-master-template" data-kind="materials" data-category="' + category + '">تحميل قالب Excel</button>';
    return pageHead("Master Data", title, "تعريف مستقل عن Forecast: كود فريد واسم المادة ونوعها فقط. يمكن استخدام الكود نفسه في القسم الآخر دون نقل أو حذف أي تعريف.", actions) + boundary() + card(title, rows.length + " مادة معرفة", content);
  }
  function renderMaterialMaster() { return renderMaterialMasterByCategory("raw"); }
  function renderPackingMaster() { return renderMaterialMasterByCategory("packing"); }

  function renderWorkflow() {
    var steps = [
      ["مسؤول النظام", "تعريف المنتجات النهائية", "منتجات الإنتاج والمبيعات ومخزن المنتج النهائي"],
      ["مسؤول النظام", "تعريف المواد الأولية", "مواد تدخل الإنتاج ومخزن المواد الأولية"],
      ["مسؤول النظام", "تعريف مواد التغليف", "مواد تغليف ومخزن تغليف مستقل"],
      ["مسؤول النظام", "تعريف المدن والوكلاء", "المدينة أولًا ثم الوكيل الذي تبيع له المبيعات"],
      ["المبيعات", "Forecast سنوي", "رفع وحفظ هدف المبيعات ثم إرساله للإنتاج"],
      ["الإنتاج", "استلام وتصدير Forecast", "تنبيه، تصدير الملف، وتعديل الكميات داخل التطبيق"],
      ["الإنتاج + المبيعات", "تفاوض Forecast", "أحمر لتعديل الإنتاج، أخضر لقبول المبيعات، أصفر لتعديلها عليه"],
      ["الإنتاج", "إرسال للتأكيد النهائي", "يثبّت الإنتاج رده ويرسله للمبيعات للاعتماد"],
      ["المبيعات", "اعتماد Forecast", "تأكيد الاستلام والموافقة، ثم تفتح احتياجات الإنتاج"],
      ["الإنتاج ثم المخازن", "احتياجات وملفات المخزون", "ملفا مواد أولية وتغليف، ثم رصيد وتوالف مع تاريخ الصلاحية"],
      ["التطبيق", "المقاصة", "صافي الاحتياج الفعلي بعد طرح الرصيد والتوالف"],
      ["المخازن", "طاقة التخزين", "تأكيد أقصى كمية قابلة للتخزين وإعادة المواعيد للإنتاج"],
      ["الإنتاج", "اعتماد المواد النهائي", "تحذير عند تجاوز طاقة التخزين وتحديد المخزون الاستراتيجي"],
      ["المشتريات + الإنتاج", "خطة الشراء ومدد التوريد", "ملفات منفصلة، مدة التوريد بالأيام، وتفاوض كميات ومواعيد"],
      ["المشتريات", "تأكيد خطة الشراء", "إرسال الالتزام والخطة إلى المالية"],
      ["المالية", "موافقة الشراء", "مراجعة مواد أولية وتغليف منفصلين ثم إعادة القرار للمشتريات"],
      ["الإنتاج", "خطة إنتاج شهرية/أسبوعية", "تبنى فقط بعد اعتماد خطة الشراء"],
      ["المبيعات", "مراجعة الخطة الأسبوعية", "لا يجوز أن تنقص عن هدف المبيعات"],
      ["المبيعات + الإنتاج + الإدارة", "تغيير الخطة", "قبل الأسبوع بيومين؛ داخل الأسبوع يحتاج سببًا وموافقة خطية للإدارة"],
      ["المبيعات", "هدف الوكلاء والمدن والطلبات المسبقة", "استخدام داخلي لتغذية الخطة الأسبوعية"],
      ["مدير المبيعات + الإدارة", "طلب تجاوز الهدف", "تجاوز هدف الشهر أو السنة لا يتم بلا سبب وموافقة الإدارة العامة"]
    ];
    var markup = steps.map(function (item, index) {
      return '<article class="workflow-step ' + (index === steps.length - 1 ? "highlight" : "") + '"><span>' + (index + 1) + '</span><strong>' + esc(item[1]) + '</strong><p>' + esc(item[0] + " · " + item[2]) + '</p></article>';
    }).join("");
    return pageHead("المسار العام", "من Forecast إلى Available for Sales", "كل قسم يسجل حقيقته، والقسم التالي يؤكد ويتصرف.", "") + boundary() + card("السلسلة التشغيلية", "المواد التفصيلية محجوبة في عرض المبيعات", '<div class="workflow">' + markup + '</div>') + card("طبقة EMICP", "", '<div class="facts"><div class="fact"><span>التأكيد</span><strong>Submit → Confirm</strong></div><div class="fact"><span>الإصدارات</span><strong>Old / New / Delta</strong></div><div class="fact"><span>الانحراف</span><strong>Plan vs Actual</strong></div><div class="fact"><span>الإغلاق</span><strong>Owner + Due + Evidence</strong></div></div>');
  }

  function forecastCellKey(productCode, month) {
    return normalizeCode(productCode) + "|" + month;
  }

  function forecastCellQty(items, productCode, month) {
    var line = (items || []).find(function (item) { return normalizeCode(item.productCode) === normalizeCode(productCode); });
    return Number(line && line.monthlyQty && line.monthlyQty[month] || 0);
  }

  function forecastCellChangeClass(forecast, productCode, month) {
    var key = forecastCellKey(productCode, month);
    var review = (forecast.salesReview || {})[key];
    if (review === "accepted") return "forecast-cell-green";
    if (review === "sales_override") return "forecast-cell-yellow";
    if (review === "sales_other") return "forecast-cell-red";
    if ((forecast.financeChanges || {})[key]) return "forecast-cell-red";
    if ((forecast.productionChanges || {})[key]) return "forecast-cell-red";
    return "";
  }

  function buildForecastCellChanges(beforeItems, afterItems, months) {
    var changes = {};
    (beforeItems || []).forEach(function (line) {
      (months || []).forEach(function (month) {
        var before = forecastCellQty(beforeItems, line.productCode, month);
        var after = forecastCellQty(afterItems, line.productCode, month);
        if (before !== after) changes[forecastCellKey(line.productCode, month)] = { before: before, production: after };
      });
    });
    return changes;
  }

  function downloadForecastReviewFile(forecast, recipient) {
    if (!forecast) return;
    var rows = [["product_code", "product_name"].concat(forecast.months || [])];
    (forecast.items || []).forEach(function (line) {
      var row = [line.productCode, line.productName || ""];
      (forecast.months || []).forEach(function (month) {
        var changeClass = forecastCellChangeClass(forecast, line.productCode, month);
        row.push({ value: Number(line.monthlyQty && line.monthlyQty[month] || 0) || "", style: changeClass === "forecast-cell-green" ? "green" : changeClass === "forecast-cell-yellow" ? "yellow" : changeClass === "forecast-cell-red" ? "red" : "" });
      });
      rows.push(row);
    });
    var prefix = recipient === "sales" ? "EMICP-sales-review-" : recipient === "finance" ? "EMICP-finance-review-" : "EMICP-production-review-";
    if (downloadExcelXml(prefix + forecast.id + "-" + forecast.version + ".xls", rows)) {
      showToast("تم تنزيل ملف Excel للمراجعة مع ألوان التعديلات. يمكن تعديله ثم رفعه من نافذة Forecast نفسها.", "success");
    }
  }

  // تنزيل نسخة الإنتاج من القيم الموجودة الآن في نافذة التحرير، قبل الحفظ أو الإرسال.
  function downloadProductionReviewDraft() {
    var form = document.getElementById("production-review-form");
    if (!form) { showToast("افتح نافذة تحرير Forecast أولًا.", "error"); return; }
    var data = new FormData(form);
    var source = state.forecasts.find(function (item) { return item.id === String(data.get("forecastId") || ""); });
    if (!source) { showToast("تعذر العثور على Forecast.", "error"); return; }
    var items = [];
    var count = Number(data.get("pqItemCount") || 0);
    for (var pIndex = 0; pIndex < count; pIndex += 1) {
      var code = normalizeCode(data.get("pqProduct_" + pIndex));
      var original = source.items.find(function (item) { return normalizeCode(item.productCode) === code; });
      if (!original) continue;
      var monthly = {}, total = 0;
      source.months.forEach(function (month, mIndex) {
        var value = Number(data.get("pq_" + pIndex + "_" + mIndex) || 0);
        if (value > 0) { monthly[month] = value; total += value; }
      });
      if (total > 0) items.push({ productCode: original.productCode, productName: original.productName, unit: original.unit, qty: total, monthlyQty: monthly, note: original.note || "" });
    }
    var copy = clone(source);
    copy.items = items;
    copy.productionChanges = buildForecastCellChanges(source.items, items, source.months);
    delete copy.salesReview;
    copy.version = String(source.version || "V1") + "-production-draft";
    downloadForecastReviewFile(copy, "production");
  }

  async function importProductionReviewFile(file) {
    var form = document.getElementById("production-review-form");
    if (!form) throw new Error("افتح نافذة تحرير Forecast أولًا.");
    var data = new FormData(form);
    var forecast = state.forecasts.find(function (item) { return item.id === String(data.get("forecastId") || ""); });
    if (!forecast) throw new Error("تعذر العثور على Forecast المستلم.");
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var headers = [];
    rows.forEach(function (row) { Object.keys(row).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
    var productHeader = guessProductHeader(headers);
    var monthMatch = mapMonthHeaders(headers, forecast.months);
    if (!productHeader || !monthMatch.matched) throw new Error("ملف الإنتاج المعدّل يحتاج product_code وأعمدة الأشهر المطابقة للـForecast.");
    var filled = 0, skipped = 0;
    rows.forEach(function (row) {
      var code = normalizeCode(row[productHeader]);
      var productIndex = -1;
      for (var index = 0; index < Number(data.get("pqItemCount") || 0); index += 1) if (normalizeCode(data.get("pqProduct_" + index)) === code) { productIndex = index; break; }
      if (productIndex < 0) { skipped += 1; return; }
      forecast.months.forEach(function (month, mIndex) {
        var column = monthMatch.map[month];
        if (!column) return;
        var raw = String(row[column] == null ? "" : row[column]).trim();
        if (raw !== "" && !validNumber(raw, true)) { skipped += 1; return; }
        var input = form.querySelector('[name="pq_' + productIndex + '_' + mIndex + '"]');
        if (!input) return;
        input.value = raw === "" ? "" : String(Number(raw));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        filled += 1;
      });
    });
    if (!filled) throw new Error("لم تُعبّأ أي كمية؛ تحقق من أكواد المنتجات وأعمدة الأشهر.");
    showToast("تم رفع النسخة المعدلة وتعبئة " + filled + " خانة" + (skipped ? "؛ تجاوز " + skipped + " قيمة أو صف غير مطابق." : ".") + " راجع الجدول ثم أرسل الرد للمبيعات.", skipped ? "error" : "success");
  }

  async function importSalesFeedbackFile(file, forecastId) {
    var forecast = state.forecasts.find(function (item) { return item.id === forecastId && item.status === "production_feedback"; });
    if (!forecast) throw new Error("هذا Forecast لم يعد بانتظار مراجعة المبيعات.");
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var headers = [];
    rows.forEach(function (row) { Object.keys(row).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
    var productHeader = guessProductHeader(headers), monthMatch = mapMonthHeaders(headers, forecast.months);
    if (!productHeader || !monthMatch.matched) throw new Error("ملف المبيعات المعدّل يحتاج product_code وأعمدة الأشهر المطابقة للـForecast.");
    var values = {};
    forecast.items.forEach(function (line) { values[normalizeCode(line.productCode)] = clone(line.monthlyQty || {}); });
    var filled = 0, skipped = 0;
    rows.forEach(function (row) {
      var code = normalizeCode(row[productHeader]);
      if (!values[code]) { skipped += 1; return; }
      forecast.months.forEach(function (month) {
        var column = monthMatch.map[month];
        if (!column) return;
        var raw = String(row[column] == null ? "" : row[column]).trim();
        if (raw !== "" && !validNumber(raw, true)) { skipped += 1; return; }
        values[code][month] = raw === "" ? "" : String(Number(raw));
        filled += 1;
      });
    });
    if (!filled) throw new Error("لم تُعبّأ أي كمية؛ تحقق من أكواد المنتجات وأعمدة الأشهر.");
    var monthlyTotals = forecast.months.map(function (month) { return { month: month, qty: Object.keys(values).reduce(function (sum, code) { return sum + Number((values[code] || {})[month] || 0); }, 0) }; });
    openForecastForm(forecast.id, { months: forecast.months, values: values, notes: {}, priority: forecast.priority, note: forecast.note || "", importSummary: { rowsLabel: "رفع ملف المبيعات المعدّل: " + filled + " خانة" + (skipped ? "، متجاوز " + skipped : ""), months: monthlyTotals, total: monthlyTotals.reduce(function (sum, entry) { return sum + entry.qty; }, 0) } });
    showToast("تم رفع ملف المبيعات المعدّل. راجع الألوان والكميات ثم احفظ وأرسل للإنتاج.", skipped ? "error" : "success");
  }

  function forecastMonthlyTable(forecast) {
    var head = '<tr><th>المنتج</th>' + forecast.months.map(function (month) { return '<th class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th>الإجمالي</th></tr>';
    var body = forecast.items.map(function (line) {
      var cells = forecast.months.map(function (month) {
        var qty = Number(line.monthlyQty[month] || 0);
        var changeClass = forecastCellChangeClass(forecast, line.productCode, month);
        return '<td class="' + changeClass + '">' + (qty ? '<span class="number">' + formatNumber(qty) + '</span>' : '<span class="read-only">—</span>') + '</td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(line.productCode) + '</strong><br><small>' + esc(line.productName) + '</small></td>' + cells + '<td><strong class="number">' + formatNumber(line.qty) + '</strong> ' + esc(line.unit || "") + '</td></tr>';
    }).join("");
    return '<div class="table-wrap"><table class="forecast-monthly-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function renderForecasts() {
    var isSales = state.role === "sales";
    var isProduction = state.role === "production";
    var isFinance = state.role === "finance";
    var rows = state.forecasts.filter(function (item) { return isSales || item.status !== "draft"; }).map(function (item) {
      var statusInfoPair = forecastStatusInfo(item.status);
      var docActions = "";
      if (isSales && item.status !== "cancelled" && item.status !== "fixed") {
        docActions += '<button class="btn btn-secondary btn-sm" type="button" data-action="edit-forecast" data-id="' + esc(item.id) + '">تعديل (إصدار جديد)</button>';
        if (item.status === "draft") docActions += '<button class="btn btn-primary btn-sm" type="button" data-action="send-forecast" data-id="' + esc(item.id) + '">إرسال للإنتاج</button>';
        docActions += '<button class="btn btn-danger btn-sm" type="button" data-action="cancel-forecast" data-id="' + esc(item.id) + '">إلغاء</button>';
      }
      if (item.status === "fixed" && (state.role === "sales" || state.role === "production")) {
        var producedAgainst = state.actuals.some(function (record) { return record.forecastId === item.id; });
        docActions += producedAgainst
          ? '<button class="btn btn-secondary btn-sm" type="button" disabled>لا يُفك التثبيت بعد تسجيل إنتاج</button>'
          : '<button class="btn btn-danger btn-sm" type="button" data-action="revoke-fixed-forecast" data-id="' + esc(item.id) + '">فك التثبيت للتصحيح</button>';
      }
      if (isSales && item.status === "production_feedback") {
        docActions = '<button class="btn btn-primary btn-sm" type="button" data-action="review-forecast-feedback" data-id="' + esc(item.id) + '">مراجعة رد الإنتاج</button>' + docActions;
      }
      if (isProduction && item.status === "submitted") {
        docActions += '<button class="btn btn-secondary btn-sm" type="button" data-action="download-production-forecast" data-id="' + esc(item.id) + '">تصدير Forecast الوارد</button><button class="btn btn-primary btn-sm" type="button" data-action="forecast-production-review" data-id="' + esc(item.id) + '">تحرير الكميات وإرسال الرد</button>';
      }
      if (isProduction && item.status === "production_feedback") docActions += '<button class="btn btn-secondary btn-sm" type="button" data-action="download-modified-production-forecast" data-id="' + esc(item.id) + '">تحميل Forecast المعدّل</button>';
      if (isFinance && item.status === "finance_review") docActions += '<button class="btn btn-secondary btn-sm" type="button" data-action="download-finance-forecast" data-id="' + esc(item.id) + '">تنزيل ملف Forecast</button><button class="btn btn-secondary btn-sm" type="button" data-action="finance-edit-forecast" data-id="' + esc(item.id) + '">تحرير أو رفع نسخة معدلة</button><button class="btn btn-primary btn-sm" type="button" data-action="finance-approve-forecast" data-id="' + esc(item.id) + '">اعتماد وإرسال للمبيعات</button>';
      if (isSales && item.status === "finance_sales_confirm") docActions += '<button class="btn btn-primary btn-sm" type="button" data-action="accept-finance-forecast" data-id="' + esc(item.id) + '">تأكيد قرار المالية وتثبيت Forecast</button>';
      if (item.history.length) {
        docActions += '<button class="btn btn-secondary btn-sm" type="button" data-action="forecast-history" data-id="' + esc(item.id) + '">الإصدارات (' + (item.history.length + 1) + ')</button>';
      }
      return '<article class="forecast-document"><header><div><span class="eyebrow">' + esc(item.id + " · " + item.version) + '</span><h3>' + esc(forecastPeriod(item)) + '</h3></div><div class="forecast-doc-meta">' + status(statusInfoPair[0], statusInfoPair[1]) + '<strong>' + item.items.length + ' منتجات</strong><b class="number">' + formatNumber(forecastTotalQty(item)) + '</b></div></header>' + forecastMonthlyTable(item) + '<footer>' + (item.status === "submitted" && state.rawMaterials.length ? (function () {
        var readiness = forecastReadiness(item);
        var badge = function (label, ok, pending) { return ok ? status(label + " ✓", "green") : status(label + " — " + pending, "amber"); };
        return '<span class="list-actions">' + badge("الاحتياجات", readiness.hasMaterials && !readiness.stale, readiness.stale ? "إعادة تأكيد" : "بانتظار الإنتاج")
          + badge("رصيد المخزن", readiness.allConfirmed, "بانتظار الرفع")
          + (readiness.supply ? (readiness.supply.confirmed ? status("التوريد ✓", "green") : status("تعذر التوريد", "red")) : status("التوريد — بانتظار المشتريات", "amber")) + '</span>';
      })() : "") + '<span>الأولوية: ' + esc(item.priority) + '</span>' + stepDate("إرسال المبيعات", item.submittedAt) + (item.productionFeedbackAt ? stepDate("رد الإنتاج", item.productionFeedbackAt) : "") + (item.fixedAt ? stepDate("التثبيت", item.fixedAt) : "") + (item.updatedAt ? stepDate("آخر تعديل", item.updatedAt) : "") + '<span>' + esc(item.note || "بدون ملاحظة عامة") + '</span>' + (docActions ? '<span class="list-actions">' + docActions + '</span>' : "") + '</footer></article>';
    }).join("");
    var content = rows ? '<div class="forecast-list">' + rows + '</div>' : empty("لا يوجد Forecast بعد", isSales ? "أكمل تعريف المنتجات، ثم أنشئ Forecast السنة شهرًا بشهر وأرسله للإنتاج." : "بانتظار أن يرسل قسم المبيعات أول Forecast.", isSales ? '<button class="btn btn-primary" type="button" data-action="new-forecast">إنشاء أول Forecast</button>' : "");
    return pageHead("Forecast", isSales ? "Forecast المبيعات — شهرًا بشهر" : "Forecast الوارد من المبيعات", isSales ? "حدد الأشهر وأدخل كمية كل منتج في كل شهر، وتابع التفاوض حتى التثبيت. كل التعديلات تحفظ كإصدارات." : "افحص قدرة الآلات وإمكانية التحقيق: ثبّت المستند أو أرسل تعديلاتك للمبيعات.", isSales ? '<button class="btn btn-primary" type="button" data-action="new-forecast">Forecast جديد</button>' : "") + boundary() + card("مستندات Forecast", "التفاوض يستمر على نفس المستند بإصدارات محفوظة حتى التثبيت", content);
  }

  function weeklyPlanTotal(plan) {
    return (plan.weeks || []).reduce(function (sum, week) { return sum + Number(week.qty || 0); }, 0);
  }

  function weeklyPlanTable(plan, withLocks) {
    var head = '<tr>' + plan.weeks.map(function (week) {
      var frozen = withLocks && !weekEditable(week);
      return '<th class="month-col">' + esc(week.label) + (frozen ? '<br><small class="week-frozen">مجمّد</small>' : '') + '</th>';
    }).join("") + '<th>الإجمالي</th></tr>';
    var qtyRow = '<tr>' + plan.weeks.map(function (week) {
      return '<td><span class="number">' + formatNumber(week.qty) + '</span></td>';
    }).join("") + '<td><strong class="number">' + formatNumber(weeklyPlanTotal(plan)) + '</strong> ' + esc(plan.unit || "") + '</td>';
    var daysRow = '<tr>' + plan.weeks.map(function (week) {
      var dayKeys = Object.keys(week.days || {}).filter(function (key) { return Number(week.days[key]) > 0; }).sort();
      if (!dayKeys.length) return '<td><span class="read-only">بلا توزيع يومي</span></td>';
      return '<td>' + dayKeys.map(function (key) { return '<small class="req-po">' + esc(key.slice(8)) + ': <span class="number">' + formatNumber(week.days[key]) + '</span></small>'; }).join("<br>") + '</td>';
    }).join("") + '<td></td></tr>';
    return '<div class="table-wrap"><table class="forecast-monthly-table"><thead>' + head + '</thead><tbody>' + qtyRow + '</tr>' + daysRow + '</tbody></table></div>';
  }

  function renderWeeklyPlanCard(plan) {
    var role = state.role;
    var info = weeklyPlanStatusInfo(plan.status);
    var actions = "";
    if (role === "sales" && plan.status === "awaiting_sales") actions += '<button class="btn btn-primary btn-sm" type="button" data-action="review-weekly" data-id="' + esc(plan.id) + '">مراجعة وإرسال للاعتماد</button>';
    var roleKey = role === "production" ? "production" : role === "fgWarehouse" ? "fgWarehouse" : "";
    if (roleKey && plan.status === "awaiting_approvals" && !planFullyApprovedByRole(plan, roleKey)) {
      actions += '<button class="btn btn-primary btn-sm" type="button" data-action="approve-weekly" data-id="' + esc(plan.id) + '">اعتماد الكل</button>';
      actions += '<button class="btn btn-secondary btn-sm" type="button" data-action="approve-units" data-id="' + esc(plan.id) + '">اعتماد بالتحديد</button>';
    }
    var hasEditableWeek = plan.weeks.some(weekEditable);
    if ((role === "production" || role === "sales") && plan.status !== "awaiting_sales" && hasEditableWeek) actions += '<button class="btn btn-secondary btn-sm" type="button" data-action="edit-weekly" data-id="' + esc(plan.id) + '">تعديل أسبوع قادم</button>';
    if (role === "production" && plan.status === "approved" && hasEditableWeek) actions += '<button class="btn btn-secondary btn-sm" type="button" data-action="plan-days" data-id="' + esc(plan.id) + '">توزيع الأيام</button>';
    var prodProgress = planApprovalProgress(plan, "production");
    var fgProgress = planApprovalProgress(plan, "fgWarehouse");
    var approvalsMeta = '<span>المرونة: ' + esc(GRANULARITY_LABELS[plan.granularity] || "أسبوعية") + '</span><span>اعتماد الإنتاج: ' + prodProgress.done + '/' + prodProgress.total + ' وحدة</span><span>اعتماد مخزن FG: ' + fgProgress.done + '/' + fgProgress.total + ' وحدة</span>';
    return '<article class="forecast-document"><header><div><span class="eyebrow">' + esc(plan.id + " · " + plan.version) + '</span><h3><span class="code-chip">' + esc(plan.productCode) + '</span> ' + esc(plan.product) + ' — ' + esc(monthLabel(plan.month)) + '</h3></div><div class="forecast-doc-meta">' + status(info[0], info[1]) + '<strong>' + esc(plan.forecastId) + '</strong></div></header>' + weeklyPlanTable(plan, true) + '<footer>' + approvalsMeta + stepDate("الإنشاء", plan.createdAt) + (plan.salesForwardedAt ? stepDate("إرسال المبيعات", plan.salesForwardedAt) : "") + (plan.approvedAt ? stepDate("الاعتماد النهائي", plan.approvedAt) : "") + (plan.history.length ? '<span>الإصدارات: ' + (plan.history.length + 1) + '</span>' : "") + (actions ? '<span class="list-actions">' + actions + '</span>' : "") + '</footer></article>';
  }

  function renderWeeklyPlans() {
    var role = state.role;
    var targets = pendingWeeklyPlanTargets();
    var splitCard = "";
    if (role === "production" && targets.length) {
      splitCard = card("شهور بانتظار التقسيم", "وزّع كمية كل منتج وشهر على أسابيعه ثم أرسلها للمبيعات", '<div class="list"><div class="list-item"><div><h3>' + targets.length + ' (منتج × شهر) بلا خطة أسبوعية</h3><p>التقسيم الافتراضي متساوٍ على 4 أسابيع ويمكن تعديله قبل الإرسال.</p></div><div class="list-actions"><button class="btn btn-primary btn-sm" type="button" data-action="new-weekly-plan">تقسيم الخطط الأسبوعية</button></div></div></div>');
    }
    var cards = state.weeklyPlans.map(renderWeeklyPlanCard).join("");
    var purchaseBlocked = role === "production" && fixedForecasts().some(function (forecast) { return !forecastPurchasePlanApproved(forecast.id); });
    var content = cards ? '<div class="forecast-list">' + cards + '</div>' : empty("لا توجد خطط أسبوعية بعد", role === "production" ? (purchaseBlocked ? "تنتظر الخطة اعتماد المشتريات والمالية للكميات الناقصة قبل أن يبدأ التقسيم الأسبوعي." : "بعد اعتماد خطة الشراء قسّم كمية كل شهر على أسابيعه.") : "تظهر الخطط هنا بعد أن يقسّمها الإنتاج.");
    var copy = role === "sales" ? "راجع توزيع الأسابيع وعدّله إن لزم ثم أرسله لاعتماد الإنتاج ومخزن المنتج النهائي."
      : role === "fgWarehouse" ? "اعتمد الخطة الأسبوعية لتجهيز الاستلام والتخزين."
      : "قسّم الخطة الشهرية أسابيع وأرسلها للمبيعات؛ لا تعديل داخل أسبوع الإنتاج، والتغيير للأسبوع القادم قبل يومين على الأقل.";
    var headAction = role === "production" && targets.length ? '<button class="btn btn-primary" type="button" data-action="new-weekly-plan">تقسيم الخطط الأسبوعية</button>' : "";
    return pageHead("الخطة الأسبوعية", "الخطة الشهرية موزعة أسابيع وأيامًا", copy, headAction) + boundary() + splitCard + card("خطط الأسابيع", "قاعدة التجميد: أسبوع الإنتاج الجاري لا يتغير؛ التعديل للأسبوع القادم وقبل بدايته بيومين على الأقل", content);
  }

  // ===== أوامر جماعية لتقسيم الأسابيع =====
  // الجدول قد يبلغ 128 صفًا × عشرة عناصر تحكم = أكثر من ألف نقرة لو عولج صفًا بصف.
  // الحل: تحديد الصفوف (كلها، أو شهرًا بعينه) ثم أمر واحد يضبط النمط والأساس والمرونة معًا.
  var WEEKLY_PATTERNS = {
    equal: { label: "متساوٍ على الأسابيع الأربعة", weights: [1, 1, 1, 1] },
    front: { label: "مقدَّم — ثقله في أول الشهر", weights: [4, 3, 2, 1] },
    back: { label: "مؤخَّر — ثقله في آخر الشهر", weights: [1, 2, 3, 4] },
    w1: { label: "الأسبوع الأول وحده", weights: [1, 0, 0, 0] },
    w2: { label: "الأسبوع الثاني وحده", weights: [0, 1, 0, 0] },
    w3: { label: "الأسبوع الثالث وحده", weights: [0, 0, 1, 0] },
    w4: { label: "الأسبوع الرابع وحده", weights: [0, 0, 0, 1] }
  };

  // التوزيع بالكرتون الكامل: الأسابيع أعداد صحيحة ومجموعها يساوي الهدف بالضبط.
  // الطريقة أكبر باقٍ (largest remainder): كل أسبوع يأخذ حصته الصحيحة، ثم تُوزَّع الكراتين
  // المتبقية على الأسابيع صاحبة أكبر كسر — فلا يضيع كرتون ولا يُخترع كرتون.
  function weeklySplitValues(target, pattern) {
    var spec = WEEKLY_PATTERNS[pattern] || WEEKLY_PATTERNS.equal;
    var total = planQty(target);
    var weightSum = spec.weights.reduce(function (sum, weight) { return sum + weight; }, 0) || 1;
    var shares = spec.weights.map(function (weight, index) {
      var exact = total * weight / weightSum;
      var floor = Math.floor(exact);
      return { index: index, weight: weight, base: floor, remainder: exact - floor };
    });
    var assigned = shares.reduce(function (sum, share) { return sum + share.base; }, 0);
    var leftovers = total - assigned;
    shares.slice().filter(function (share) { return share.weight > 0; })
      .sort(function (a, b) { return b.remainder - a.remainder || a.index - b.index; })
      .forEach(function (share) {
        if (leftovers <= 0) return;
        share.base += 1;
        leftovers -= 1;
      });
    // لو بقي شيء (كل الأوزان صفر عمليًا) يذهب لأثقل أسبوع.
    if (leftovers > 0) {
      var heaviest = 0;
      spec.weights.forEach(function (weight, index) { if (weight > spec.weights[heaviest]) heaviest = index; });
      shares[heaviest].base += leftovers;
    }
    var values = [0, 0, 0, 0];
    shares.forEach(function (share) { values[share.index] = share.base; });
    return values;
  }

  function weeklyRowTarget(rowIndex, basis) {
    var select = document.querySelector('[name="wpBasis_' + rowIndex + '"]');
    if (!select) return 0;
    var wanted = basis || select.value;
    return planQty(wanted === "gross" ? select.getAttribute("data-gross") : select.getAttribute("data-net"));
  }

  function applyWeeklyRow(rowIndex, options) {
    var basisSelect = document.querySelector('[name="wpBasis_' + rowIndex + '"]');
    if (!basisSelect) return false;
    if (options.basis) basisSelect.value = options.basis;
    if (options.granularity) {
      var granSelect = document.querySelector('[name="wpGran_' + rowIndex + '"]');
      if (granSelect) granSelect.value = options.granularity;
    }
    var target = weeklyRowTarget(rowIndex, basisSelect.value);
    var field = document.getElementById("wp-target-" + rowIndex);
    var label = document.getElementById("wp-target-label-" + rowIndex);
    if (field) field.value = target;
    if (label) label.textContent = formatNumber(target);
    if (options.pattern) {
      weeklySplitValues(target, options.pattern).forEach(function (value, kIndex) {
        var cell = document.querySelector('[name="wpQty_' + rowIndex + '_' + kIndex + '"]');
        if (cell) cell.value = value;
      });
    }
    return true;
  }

  // زر «مسح الفلاتر» كان يُحقن بإعادة رسم الصفحة كلها — وهذا مستحيل داخل نافذة حوار
  // لأن محتواها خارج #app. نحقنه مباشرة في الشريط بدل إعادة الرسم.
  function ensureTableClearButton(toolbar, key) {
    if (!toolbar || toolbar.querySelector('[data-action="table-clear"]')) return;
    var button = document.createElement("button");
    button.className = "btn btn-secondary btn-sm";
    button.type = "button";
    button.setAttribute("data-action", "table-clear");
    button.setAttribute("data-table", key);
    button.textContent = localizeText("مسح الفلاتر");
    toolbar.appendChild(button);
  }

  function inDialog(node) {
    return Boolean(node && node.closest && node.closest("#dialog-content"));
  }

  function refreshApprovalSelection() {
    var boxes = visiblePickBoxes('[data-action="approval-pick"]');
    var picked = boxes.filter(function (box) { return box.checked; });
    var counter = document.getElementById("ap-selected-count");
    if (counter) counter.textContent = localizeText("محدد: " + formatNumber(picked.length) + " من " + formatNumber(boxes.length));
    var master = document.getElementById("ap-pick-all");
    if (master) {
      master.checked = boxes.length > 0 && picked.length === boxes.length;
      master.indeterminate = picked.length > 0 && picked.length < boxes.length;
    }
    boxes.forEach(function (box) {
      var row = box.closest("tr");
      if (!row) return;
      row.classList.toggle("row-picked", box.checked);
      row.classList.toggle("row-exception", !box.checked && box.getAttribute("data-within") !== "1");
    });
    return picked;
  }

  function rowVisible(box) {
    var row = box.closest ? box.closest("tr") : null;
    return !row || row.style.display !== "none";
  }

  function weeklyPickBoxes() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-action="weekly-pick"]'));
  }

  // «تحديد الكل» بعد تطبيق فلتر يعني: كل ما هو ظاهر أمامك، لا الصفوف المخفية أيضًا.
  function visiblePickBoxes(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector)).filter(rowVisible);
  }

  function refreshWeeklySelection() {
    var boxes = weeklyPickBoxes().filter(rowVisible);
    var picked = boxes.filter(function (box) { return box.checked; });
    var counter = document.getElementById("wp-selected-count");
    if (counter) counter.textContent = localizeText("محدد: " + formatNumber(picked.length) + " من " + formatNumber(boxes.length));
    var master = document.getElementById("wp-pick-all");
    if (master) {
      master.checked = boxes.length > 0 && picked.length === boxes.length;
      master.indeterminate = picked.length > 0 && picked.length < boxes.length;
    }
    boxes.forEach(function (box) {
      var row = box.closest("tr");
      if (row) row.classList.toggle("row-picked", box.checked);
    });
    return picked;
  }

  function openWeeklyPlanForm(prefillValues) {
    var targets = pendingWeeklyPlanTargets();
    if (!targets.length) { showToast("لا توجد شهور بانتظار التقسيم.", "error"); return; }
    var head = '<tr><th scope="col"><label class="sr-only" for="wp-pick-all">تحديد كل الصفوف</label><input type="checkbox" id="wp-pick-all" data-action="weekly-pick-all" checked></th><th scope="col">المنتج والشهر</th><th scope="col" class="month-col">الأسبوع 1 (01–07)</th><th scope="col" class="month-col">الأسبوع 2 (08–14)</th><th scope="col" class="month-col">الأسبوع 3 (15–21)</th><th scope="col" class="month-col">الأسبوع 4 (22–النهاية)</th><th scope="col">هدف الخطة</th></tr>';
    var rows = targets.map(function (target, sIndex) {
      var weeks = weeksOfMonth(target.month);
      // الأساس الافتراضي هو الصافي بعد طرح مخزون المنتج النهائي المتاح — لا الفوركاست الخام.
      var netTarget = planQty(productionNetNeed(target.forecast.id, target.line.productCode, target.month));
      var grossTarget = planQty(target.qty);
      var fromStock = roundQty(Math.max(0, grossTarget - netTarget));
      var planTarget = netTarget;
      var defaults = weeklySplitValues(planTarget, "equal");
      var prefill = prefillValues && prefillValues[normalizeCode(target.line.productCode) + "|" + target.month];
      var cells = weeks.map(function (week, kIndex) {
        var cellId = "wp-" + sIndex + "-" + kIndex;
        var value = prefill && prefill[kIndex] != null ? prefill[kIndex] : defaults[kIndex];
        return '<td><label class="sr-only" for="' + cellId + '">كمية ' + esc(week.label) + ' لمنتج ' + esc(target.line.productName) + ' في ' + esc(monthLabel(target.month)) + '</label><input class="input plan-cell-input month-qty-input" id="' + cellId + '" name="wpQty_' + sIndex + '_' + kIndex + '" type="number" min="0" step="1" inputmode="numeric" value="' + esc(value) + '"></td>';
      }).join("");
      var granSelect = '<label class="sr-only" for="wp-gran-' + sIndex + '">مرونة خطة ' + esc(target.line.productName) + '</label><select class="select" id="wp-gran-' + sIndex + '" name="wpGran_' + sIndex + '"><option value="weekly">أسبوعية</option><option value="daily">يومية (توزيع الأيام بعد الاعتماد)</option><option value="monthly">شهرية — تجاوز التقسيم</option></select>';
      var basisSelect = '<label class="sr-only" for="wp-basis-' + sIndex + '">أساس خطة ' + esc(target.line.productName) + '</label><select class="select" id="wp-basis-' + sIndex + '" name="wpBasis_' + sIndex + '" data-action="weekly-basis" data-row="' + sIndex + '" data-net="' + esc(netTarget) + '" data-gross="' + esc(grossTarget) + '"><option value="net">الأساس: الصافي بعد المخزون (' + formatNumber(netTarget) + ')</option><option value="gross">الأساس: كمية الفوركاست كاملة (' + formatNumber(grossTarget) + ')</option></select>';
      var stockNote = fromStock > 0
        ? '<br><small class="read-only">الفوركاست ' + formatNumber(grossTarget) + ' · مغطى من المخزون ' + formatNumber(fromStock) + ' ⇐ الصافي ' + formatNumber(netTarget) + '</small>'
        : '<br><small class="read-only">لا مخزون متاحًا يغطي هذا الشهر — الصافي = الفوركاست</small>';
      return '<tr class="row-picked"><td><label class="sr-only" for="wp-pick-' + sIndex + '">تحديد صف ' + esc(target.line.productName) + '</label><input type="checkbox" id="wp-pick-' + sIndex + '" data-action="weekly-pick" data-row="' + sIndex + '" data-month="' + esc(target.month) + '" checked></td><td><strong class="code-chip">' + esc(target.line.productCode) + '</strong> ' + esc(target.line.productName) + '<br><small><strong>' + esc(monthLabel(target.month)) + '</strong> · ' + esc(target.forecast.id) + '</small>' + stockNote + '<br>' + granSelect + basisSelect + '<input type="hidden" name="wpForecast_' + sIndex + '" value="' + esc(target.forecast.id) + '"><input type="hidden" name="wpProduct_' + sIndex + '" value="' + esc(target.line.productCode) + '"><input type="hidden" name="wpMonth_' + sIndex + '" value="' + esc(target.month) + '"><input type="hidden" name="wpTarget_' + sIndex + '" id="wp-target-' + sIndex + '" value="' + esc(planTarget) + '"></td>' + cells + '<td><strong class="number" id="wp-target-label-' + sIndex + '">' + formatNumber(planTarget) + '</strong> ' + esc(target.line.unit || "") + '</td></tr>';
    }).join("");
    var importTools = '<div class="bulk-tools"><div><strong>استيراد التوزيع من Excel</strong><p>حمّل التمبليت الجاهز بصفوف (منتج × شهر) وأعمدة الأسابيع، عبّئه، ثم ارفعه — أو ارفع أي ملف واربط أعمدته (Data Mapping).</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-weekly-template">تحميل تمبليت الأسابيع</button><label class="btn btn-secondary btn-sm file-button">رفع ملف Excel/CSV<input type="file" accept=".xlsx,.csv" data-action="import-weekly"></label></div>';
    // شريط الأوامر الجماعية: نمط التوزيع والأساس والمرونة على كل المحدد بضغطة واحدة.
    var monthsInTargets = [];
    targets.forEach(function (target) { if (monthsInTargets.indexOf(target.month) === -1) monthsInTargets.push(target.month); });
    monthsInTargets.sort();
    var patternOptions = Object.keys(WEEKLY_PATTERNS).map(function (key) {
      return '<option value="' + esc(key) + '"' + (key === "equal" ? " selected" : "") + '>' + esc(WEEKLY_PATTERNS[key].label) + '</option>';
    }).join("");
    var monthOptions = monthsInTargets.map(function (month) { return '<option value="' + esc(month) + '">' + esc(monthLabel(month)) + '</option>'; }).join("");
    var bulkTools = '<div class="bulk-tools bulk-apply">'
      + '<div><strong>أوامر جماعية</strong><p>حدّد الصفوف — كلها أو شهرًا بعينه — ثم اضبط النمط والأساس والمرونة عليها دفعة واحدة بدل صف بصف.</p></div>'
      + '<label class="table-filter-field"><span>نمط التوزيع</span><select class="select" id="wp-bulk-pattern">' + patternOptions + '<option value="">— لا تغيير في الأسابيع —</option></select></label>'
      + '<label class="table-filter-field"><span>الأساس</span><select class="select" id="wp-bulk-basis"><option value="">— لا تغيير —</option><option value="net">الصافي بعد المخزون</option><option value="gross">كمية الفوركاست كاملة</option></select></label>'
      + '<label class="table-filter-field"><span>المرونة</span><select class="select" id="wp-bulk-gran"><option value="">— لا تغيير —</option><option value="weekly">أسبوعية</option><option value="daily">يومية</option><option value="monthly">شهرية — تجاوز التقسيم</option></select></label>'
      + '<button class="btn btn-primary btn-sm" type="button" data-action="weekly-apply-bulk">طبّق على المحدد</button>'
      + '<span class="bulk-sep"></span>'
      + '<button class="btn btn-secondary btn-sm" type="button" data-action="weekly-select-all">تحديد الكل</button>'
      + '<button class="btn btn-secondary btn-sm" type="button" data-action="weekly-select-none">إلغاء التحديد</button>'
      + (monthsInTargets.length > 1 ? '<label class="table-filter-field"><span>حدّد شهرًا وحده</span><select class="select" data-action="weekly-select-month"><option value="">— اختر شهرًا —</option>' + monthOptions + '</select></label>' : '')
      + '<span class="table-count" id="wp-selected-count"></span>'
      + '</div>';
    var body = '<input type="hidden" name="wpCount" value="' + targets.length + '">' + importTools + bulkTools + '<div class="table-wrap plan-entry-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div><div class="form-note">جدول واحد لكل الأهداف: كل (منتج × شهر) صف والأسابيع أعمدة. الإنتاج يحدد مرونة كل صف: أسبوعية، أو يومية (اعتماد كل يوم على حدة بعد توزيع الأيام)، أو شهرية فتُرسل كتلة واحدة وتُتجاوز خانات الأسابيع. مجموع أسابيع الصف الأسبوعي/اليومي يساوي <strong>هدف الخطة</strong>، وهو افتراضيًا صافي الاحتياج بعد طرح مخزون المنتج النهائي المتاح — بدّل الأساس إلى «كمية الفوركاست كاملة» إن أردت الإنتاج فوق المخزون. بعد الإرسال تراجع المبيعات ثم يعتمد الإنتاج ومخزن FG كل وحدة على حدة أو بالتحديد الجماعي. <strong>التحديد في العمود الأول يخصّ الأوامر الجماعية وحدها؛ الإرسال يشمل كل الصفوف دائمًا.</strong></div>';
    openDialog(dialogShell("تقسيم الخطة الشهرية أسابيع — جدول كامل", "كل (منتج × شهر) صف واحد، والأسابيع أعمدة.", body, "إرسال الخطط الأسبوعية للمبيعات", "weekly-plan-form"), "wide");
    refreshWeeklySelection();
  }

  // تمبليت الأسابيع: يولَّد من الأهداف الحالية بتقسيم افتراضي جاهز للتعديل في Excel.
  function downloadWeeklyTemplate() {
    var targets = pendingWeeklyPlanTargets();
    if (!targets.length) { showToast("لا توجد شهور بانتظار التقسيم.", "error"); return; }
    var workbookRows = [["product_code", "product_name", "month", "week_1", "week_2", "week_3", "week_4"]].concat(targets.map(function (target) {
      var base = Math.floor(target.qty / 4);
      return [target.line.productCode, target.line.productName, target.month, base, base, base, target.qty - base * 3];
    }));
    if (!downloadExcelXml("EMICP-weekly-template.xls", workbookRows)) return;
    showToast("نُزّل تمبليت الأسابيع (" + targets.length + " صفًا)؛ عدّل التوزيع ثم ارفعه.", "success");
  }

  // خلية الشهر في الملف قد تكون "2026-09" أو تاريخًا كاملًا أو رقم Excel التسلسلي — نوحدها كلها.
  function normalizeMonthCell(value) {
    var text = String(value == null ? "" : value).trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 7);
    var serial = excelSerialHeaderToMonth(text);
    return serial || "";
  }

  var weeklyImportContext = null;

  async function beginWeeklyImport(file) {
    var form = document.getElementById("weekly-plan-form");
    if (!form) { showToast("افتح نافذة تقسيم الأسابيع أولًا.", "error"); return; }
    var data = new FormData(form);
    var count = Number(data.get("wpCount") || 0);
    var values = {};
    for (var s = 0; s < count; s += 1) {
      var key = normalizeCode(data.get("wpProduct_" + s)) + "|" + String(data.get("wpMonth_" + s) || "");
      values[key] = [0, 1, 2, 3].map(function (k) { return String(data.get("wpQty_" + s + "_" + k) == null ? "" : data.get("wpQty_" + s + "_" + k)).trim(); });
    }
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var headers = [];
    rows.forEach(function (row) { Object.keys(row).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
    weeklyImportContext = { values: values, rows: rows, headers: headers };
    openWeeklyImportMap();
  }

  function guessWeekHeader(headers, weekIndex) {
    var n = weekIndex + 1;
    var candidates = ["week_" + n, "w" + n, "week" + n, "الأسبوع_" + n, "اسبوع_" + n];
    for (var i = 0; i < candidates.length; i += 1) if (headers.indexOf(candidates[i]) !== -1) return candidates[i];
    return "";
  }

  function openWeeklyImportMap() {
    var context = weeklyImportContext;
    if (!context) { showToast("لا يوجد ملف قيد الاستيراد.", "error"); return; }
    var headerOptions = function (selected, allowNone) {
      return (allowNone ? '<option value="">— تجاهل —</option>' : '<option value="">اختر العمود</option>') + context.headers.map(function (header) {
        return '<option value="' + esc(header) + '"' + (header === selected ? " selected" : "") + '>' + esc(header) + '</option>';
      }).join("");
    };
    var monthGuess = context.headers.indexOf("month") !== -1 ? "month" : context.headers.indexOf("الشهر") !== -1 ? "الشهر" : "";
    var weekFields = [0, 1, 2, 3].map(function (k) {
      return '<div class="field"><label for="wm-week-' + k + '">عمود الأسبوع ' + (k + 1) + '</label><select class="select" id="wm-week-' + k + '" name="wmWeek_' + k + '">' + headerOptions(guessWeekHeader(context.headers, k), true) + '</select></div>';
    }).join("");
    var weekHits = [0, 1, 2, 3].filter(function (k) { return guessWeekHeader(context.headers, k); }).length;
    var mismatchWarning = !weekHits ? '<div class="form-note locked"><strong>تنبيه: أعمدة هذا الملف لا تطابق تمبليت الأسابيع.</strong> لم يُعثر على أعمدة week_1..week_4 (' + context.headers.join("، ") + ') — اربط يدويًا إن كانت صحيحة، أو حمّل تمبليت الأسابيع من نفس النافذة.</div>' : "";
    var previewHead = '<tr>' + context.headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join("") + '</tr>';
    var previewRows = context.rows.slice(0, 3).map(function (row) {
      return '<tr>' + context.headers.map(function (header) { return '<td>' + esc(row[header] == null ? "" : row[header]) + '</td>'; }).join("") + '</tr>';
    }).join("");
    var body = mismatchWarning
      + '<div class="form-note">اربط أعمدة ملفك: عمود كود المنتج وعمود الشهر وأعمدة الأسابيع الأربعة. الصفوف التي لا تطابق (منتج × شهر) بانتظار التقسيم تُتجاهل ويُبلّغ عنها، وخلايا الشهر تُقرأ بأي صيغة (2026-09 أو تاريخ Excel).</div>'
      + '<div class="form-grid"><div class="field"><label for="wm-product">عمود كود المنتج (إجباري)</label><select class="select" id="wm-product" name="wmProduct">' + headerOptions(guessProductHeader(context.headers), false) + '</select></div><div class="field"><label for="wm-month">عمود الشهر (إجباري)</label><select class="select" id="wm-month" name="wmMonth">' + headerOptions(monthGuess, false) + '</select></div>' + weekFields + '</div>'
      + '<section class="material-plan-section"><span class="eyebrow">معاينة أول 3 صفوف من الملف (' + context.rows.length + ' صف)</span><div class="table-wrap plan-entry-table"><table><thead>' + previewHead + '</thead><tbody>' + previewRows + '</tbody></table></div></section>'
      + '<div class="form-note locked">التعبئة تملأ جدول التقسيم للمراجعة ولا تُرسل شيئًا؛ الإرسال يبقى بيدك بعد التدقيق.</div>';
    openDialog(dialogShell("Data Mapping — ربط أعمدة تمبليت الأسابيع", "حدد أعمدة الكود والشهر والأسابيع.", body, "تعبئة الجدول من الملف", "weekly-map-form"), "wide");
  }

  function openWeeklyReviewForm() {
    var pending = state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_sales"; });
    if (!pending.length) { showToast("لا توجد خطط بانتظار مراجعة المبيعات.", "error"); return; }
    // جدول واحد كامل: صف لكل (منتج × شهر) وأعمدة الأسابيع الأربعة والإجمالي.
    var head = '<tr><th scope="col">المنتج والشهر</th><th scope="col" class="month-col">الأسبوع 1 (01–07)</th><th scope="col" class="month-col">الأسبوع 2 (08–14)</th><th scope="col" class="month-col">الأسبوع 3 (15–21)</th><th scope="col" class="month-col">الأسبوع 4 (22–النهاية)</th><th scope="col">إجمالي الشهر (ثابت)</th></tr>';
    var rows = pending.map(function (plan, sIndex) {
      var cells = [0, 1, 2, 3].map(function (kIndex) {
        var week = plan.weeks[kIndex];
        if (!week) return '<td><span class="read-only">' + (kIndex === 1 && plan.granularity === "monthly" ? "شهرية — كتلة واحدة" : "—") + '</span></td>';
        var cellId = "wr-" + sIndex + "-" + kIndex;
        return '<td><label class="sr-only" for="' + cellId + '">كمية ' + esc(week.label) + ' لمنتج ' + esc(plan.product) + ' في ' + esc(monthLabel(plan.month)) + '</label><input class="input plan-cell-input month-qty-input" id="' + cellId + '" name="wrQty_' + sIndex + '_' + kIndex + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(week.qty) + '"></td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(plan.productCode) + '</strong> ' + esc(plan.product) + '<br><small><strong>' + esc(monthLabel(plan.month)) + '</strong> · ' + esc(plan.id) + '</small><input type="hidden" name="wrPlan_' + sIndex + '" value="' + esc(plan.id) + '"></td>' + cells + '<td><strong class="number">' + formatNumber(weeklyPlanTotal(plan)) + '</strong> ' + esc(plan.unit || "") + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="wrCount" value="' + pending.length + '"><div class="table-wrap plan-entry-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div><div class="form-note">جدول واحد لكل الخطط: عدّل توزيع أي صف (المجموع يبقى مساويًا لكمية شهره) ثم أرسل الكل دفعة واحدة لاعتماد الإنتاج ومخزن المنتج النهائي. أي تعديل يُحفظ إصدارًا.</div>';
    openDialog(dialogShell("مراجعة المبيعات للخطة الأسبوعية — جدول كامل", "كل (منتج × شهر) صف واحد والأسابيع أعمدة.", body, "إرسال الكل للاعتماد (الإنتاج + مخزن FG)", "weekly-review-form"), "wide");
  }

  // اعتماد بالتحديد: كل وحدة (شهر/أسبوع/يوم) على حدة مع تحديد جماعي وكبسة واحدة للمحدد.
  function openUnitApproveForm(planId) {
    var plan = state.weeklyPlans.find(function (item) { return item.id === planId; });
    if (!plan || plan.status !== "awaiting_approvals") { showToast("هذه الخطة ليست بانتظار الاعتماد.", "error"); return; }
    var roleKey = state.role === "production" ? "production" : state.role === "fgWarehouse" ? "fgWarehouse" : "";
    if (!roleKey) { showToast("الاعتماد للإنتاج ومخزن المنتج النهائي فقط.", "error"); return; }
    var units = planUnits(plan);
    var rows = units.map(function (unit, index) {
      var mine = unitApprovedBy(plan, unit.key, roleKey);
      var other = unitApprovedBy(plan, unit.key, roleKey === "production" ? "fgWarehouse" : "production");
      return '<tr><td class="stock-confirm-cell">' + (mine ? status("معتمدة ✓", "green") : '<input type="checkbox" name="uaUnit_' + index + '" value="' + esc(unit.key) + '" checked aria-label="تحديد ' + esc(unit.label) + '">') + '</td><td><strong>' + esc(unit.label) + '</strong></td><td><span class="number">' + formatNumber(unit.qty) + '</span> ' + esc(plan.unit || "") + '</td><td>' + (other ? status("الطرف الآخر ✓", "green") : status("الطرف الآخر بانتظار", "amber")) + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="uaPlan" value="' + esc(plan.id) + '"><input type="hidden" name="uaCount" value="' + units.length + '"><div class="plan-table-summary"><div><span>الخطة</span><strong>' + esc(plan.productCode + " · " + monthLabel(plan.month)) + '</strong></div><div><span>المرونة</span><strong>' + esc(GRANULARITY_LABELS[plan.granularity] || "أسبوعية") + '</strong></div><div><span>وحداتك المعتمدة</span><strong>' + planApprovalProgress(plan, roleKey).done + '/' + units.length + '</strong></div></div><div class="table-wrap plan-entry-table"><table><thead><tr><th>تحديد</th><th>الوحدة</th><th>الكمية</th><th>الطرف الآخر</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">حدد الوحدات (كلها محددة افتراضيًا للتسهيل) ثم اكبس اعتمادًا واحدًا للمحدد. الخطة تدخل التنفيذ عندما يعتمد الطرفان كل الوحدات.</div>';
    openDialog(dialogShell("اعتماد بالتحديد — " + plan.id, "كل وحدة على حدة، أو حدد عدة وحدات واعتمدها بكبسة واحدة.", body, "اعتماد الوحدات المحددة", "unit-approve-form"), "wide");
  }

  function openWeekEditForm(planId) {
    var plan = state.weeklyPlans.find(function (item) { return item.id === planId; });
    if (!plan) { showToast("تعذر العثور على الخطة.", "error"); return; }
    if (plan.status === "awaiting_sales") { showToast("الخطة عند المبيعات للمراجعة الآن؛ التعديل بعد دورها في التسلسل.", "error"); return; }
    if (!plan.weeks.some(weekEditable)) { showToast("كل الأسابيع مجمّدة: لا تعديل داخل أسبوع الإنتاج، والتغيير قبل بداية الأسبوع بيومين على الأقل.", "error"); return; }
    var head = '<tr>' + plan.weeks.map(function (week) { return '<th class="month-col">' + esc(week.label) + (weekEditable(week) ? '' : '<br><small class="week-frozen">مجمّد</small>') + '</th>'; }).join("") + '<th>الإجمالي المطلوب</th></tr>';
    var cells = plan.weeks.map(function (week, kIndex) {
      if (!weekEditable(week)) return '<td><strong class="number">' + formatNumber(week.qty) + '</strong><br><small class="read-only">لا يعدل</small><input type="hidden" name="weQty_' + kIndex + '" value="' + esc(week.qty) + '"></td>';
      var cellId = "we-" + kIndex;
      return '<td><label class="sr-only" for="' + cellId + '">كمية ' + esc(week.label) + '</label><input class="input plan-cell-input month-qty-input" id="' + cellId + '" name="weQty_' + kIndex + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(week.qty) + '"></td>';
    }).join("");
    var body = '<input type="hidden" name="wePlan" value="' + esc(plan.id) + '"><div class="plan-table-summary"><div><span>المنتج</span><strong>' + esc(plan.productCode + " · " + plan.product) + '</strong></div><div><span>الشهر</span><strong>' + esc(monthLabel(plan.month)) + '</strong></div><div><span>إجمالي الشهر (ثابت)</span><strong>' + formatNumber(weeklyPlanTotal(plan)) + ' ' + esc(plan.unit || "") + '</strong></div><div><span>الحالة</span><strong>' + esc(weeklyPlanStatusInfo(plan.status)[0]) + '</strong></div></div><div class="table-wrap plan-entry-table"><table><thead>' + head + '</thead><tbody><tr>' + cells + '<td><strong class="number">' + formatNumber(weeklyPlanTotal(plan)) + '</strong></td></tr></tbody></table></div><div class="form-note locked">قاعدة التجميد: أسبوع الإنتاج الجاري لا يتغير، والتعديل مسموح للأسابيع التي تبدأ بعد يومين على الأقل. مجموع الأسابيع يبقى مساويًا لكمية الشهر المثبتة، وأي تعديل يعيد الخطة لاعتماد الإنتاج ومخزن FG ويحفظ الإصدار السابق.</div>';
    openDialog(dialogShell("تعديل أسبوع قادم — " + plan.productCode + " · " + monthLabel(plan.month), "التعديل للأسابيع غير المجمّدة فقط.", body, "حفظ التعديل وإعادة الإرسال للاعتماد", "week-edit-form"), "wide");
  }

  function openDayForm(planId) {
    var plan = state.weeklyPlans.find(function (item) { return item.id === planId; });
    if (!plan) { showToast("تعذر العثور على الخطة.", "error"); return; }
    if (plan.status !== "approved") { showToast("التوزيع اليومي بعد اكتمال اعتماد الخطة من الإنتاج ومخزن FG — لا تجاوز في التسلسل.", "error"); return; }
    var editableWeeks = plan.weeks.map(function (week, kIndex) { return { week: week, kIndex: kIndex }; }).filter(function (entry) { return weekEditable(entry.week); });
    if (!editableWeeks.length) { showToast("كل الأسابيع مجمّدة؛ التوزيع اليومي يعدل قبل بداية الأسبوع بيومين على الأقل.", "error"); return; }
    var sections = editableWeeks.map(function (entry) {
      var week = entry.week;
      var startDay = Number(week.start.slice(8));
      var endDay = Number(week.end.slice(8));
      var rows = [];
      for (var day = startDay; day <= endDay; day += 1) {
        var dateKey = plan.month + "-" + String(day).padStart(2, "0");
        var existing = week.days && week.days[dateKey] ? week.days[dateKey] : "";
        rows.push('<tr><td><time class="need-date">' + esc(dateKey) + '</time></td><td><label class="sr-only" for="day-' + entry.kIndex + '-' + day + '">كمية يوم ' + esc(dateKey) + '</label><input class="input plan-cell-input" id="day-' + entry.kIndex + '-' + day + '" name="dayQty_' + entry.kIndex + '_' + day + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(existing) + '" placeholder="0"></td></tr>');
      }
      return '<section class="material-plan-section"><div class="plan-table-summary"><div><span>' + esc(week.label) + '</span><strong>' + esc(week.start + " → " + week.end) + '</strong></div><div><span>كمية الأسبوع</span><strong>' + formatNumber(week.qty) + ' ' + esc(plan.unit || "") + '</strong></div></div><input type="hidden" name="dayWeek_' + entry.kIndex + '" value="' + entry.kIndex + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th>اليوم</th><th>الكمية</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div></section>';
    }).join("");
    var body = '<input type="hidden" name="dayPlan" value="' + esc(plan.id) + '">' + sections + '<div class="form-note">التوزيع اليومي اختياري ولا يتجاوز مجموعه كمية الأسبوع. الأسابيع المجمّدة لا تظهر هنا.</div>';
    openDialog(dialogShell("التوزيع اليومي — " + plan.productCode + " · " + monthLabel(plan.month), "وزّع كمية الأسبوع على أيامه.", body, "حفظ التوزيع اليومي", "day-form"), "wide");
  }

  function renderProductionMaterialSnapshot() {
    var rows = state.materials.map(function (item) {
      var materialState = !item.stockConfirmed ? "pending" : materialShortage(item) > 0 ? "shortage" : "available";
      return '<tr><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br><small>' + esc(item.material) + '</small>' + (item.productCode ? '<br><small>' + esc(item.productCode) + '</small>' : "") + '</td><td><strong class="number">' + formatNumber(item.required) + '</strong> ' + esc(item.unit || "") + (item.consumed > 0 ? '<br><small>استُهلك ' + formatNumber(item.consumed) + ' · متبقٍ ' + formatNumber(effectiveRequired(item)) + '</small>' : "") + '</td><td>' + requirementMonthsCell(item) + '</td><td>' + (item.stockConfirmed ? '<span class="number">' + formatNumber(materialAllocatedAvailable(item)) + '</span>' : "—") + '</td><td><span class="number">' + formatNumber(item.inbound) + '</span></td><td>' + (item.stockConfirmed ? '<span class="number">' + formatNumber(materialShortage(item)) + '</span>' : "—") + '</td><td>' + statusByValue(materialState) + '</td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>المادة والمستند</th><th>المطلوب</th><th>أشهر الحاجة</th><th>المتاح</th><th>القادم</th><th>النقص</th><th>الحالة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد احتياجات مواد", "بعد تثبيت Forecast أدخل احتياجات المواد شهرًا بشهر.");
    return card("جاهزية المواد", "تفاصيل يراها الإنتاج فقط", content);
  }

  function renderMaterials(category) {
    category = category === "packing" ? "packing" : category === "raw" ? "raw" : "";
    var materialRows = function (category) { return state.materials.filter(function (item) { return (item.category || "raw") === category; }).map(function (item) {
      var materialState = !item.stockConfirmed ? "pending" : materialShortage(item) > 0 ? "shortage" : "available";
      var master = rawMasterByCode(item.materialCode, category);
      return '<tr><td><strong>' + esc(item.id) + '</strong><br><small>' + esc(item.forecastId || "") + '</small>' + (item.productCode ? '<br><small><span class="code-chip">' + esc(item.productCode) + '</span></small>' : "") + '</td><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br>' + esc(item.material) + '<br>' + materialCategoryBadge(master ? master.category : "raw") + '</td><td><span class="number">' + formatNumber(item.required) + '</span> ' + esc(item.unit || "") + (item.consumed > 0 ? '<br><small>استُهلك ' + formatNumber(item.consumed) + ' · متبقٍ ' + formatNumber(effectiveRequired(item)) + '</small>' : "") + '</td><td>' + requirementMonthsCell(item) + '</td><td>' + (item.stockConfirmed ? '<span class="number">' + formatNumber(materialAllocatedAvailable(item)) + '</span>' : "—") + '</td><td><span class="number">' + formatNumber(item.inbound) + '</span></td><td>' + (item.stockConfirmed ? '<span class="number">' + formatNumber(materialShortage(item)) + '</span>' : "—") + '</td><td>' + stepDate("الطلب", item.createdAt) + (item.stockConfirmedAt ? stepDate("رفع الرصيد", item.stockConfirmedAt) : "") + '</td><td>' + statusByValue(materialState) + '</td></tr>';
    }).join(""); };
    var requirementsTable = function (category) {
      var rows = materialRows(category);
      var label = category === "packing" ? "احتياجات مواد التغليف" : "احتياجات المواد الأولية";
      var warehouse = category === "packing" ? "مستودع مواد التغليف" : "مستودع المواد الأولية";
      var content = rows ? '<div class="table-wrap"><table><thead><tr><th>المرجع والمستند</th><th>المادة</th><th>المطلوب</th><th>أشهر الحاجة</th><th>المتاح</th><th>القادم</th><th>النقص</th><th>تواريخ الخطوة</th><th>الحالة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد " + label, "بعد تثبيت Forecast أدخل احتياجات هذا المستودع فقط.");
      var dispatch = (state.materialDispatches || {})[category];
      var action = state.role === "production" && rows ? (dispatch && dispatch.status === "sent" ? status("أُرسل إلى " + warehouse, "green") : '<button class="btn btn-primary btn-sm" type="button" data-action="send-materials-to-warehouse" data-category="' + category + '">إرسال إلى ' + warehouse + '</button>') : "";
      return card(label, "يتجه هذا الجدول إلى " + warehouse + " فقط. " + (dispatch && dispatch.status === "saved" ? "محفوظ وبانتظار الإرسال." : ""), content, action);
    };
    if (category) {
      var isPacking = category === "packing";
      var title = isPacking ? "احتياجات مواد التغليف" : "احتياجات المواد الأولية";
      var targetWarehouse = isPacking ? "مستودع مواد التغليف" : "مستودع المواد الأولية";
      var action = state.role === "production" ? '<button class="btn btn-primary" type="button" data-action="new-material" data-category="' + category + '">فتح ملف الاحتياجات</button>' : "";
      return pageHead("Material Requirement", title, "صفحة مستقلة لهذا المستودع فقط. احفظ الملف ثم أرسله إلى " + targetWarehouse + ".", action) + boundary() + requirementsTable(category);
    }
    return pageHead("Material Requirement", "ملفا احتياج منفصلان حسب المستودع", "اختر صفحة المواد الأولية أو صفحة مواد التغليف من القائمة.", "") + boundary() + requirementsTable("raw") + requirementsTable("packing");
  }

  // المخزون الاستراتيجي: حد لكل مادة يضعه الإنتاج والمشتريات، مع تنبيه عند نزول الرصيد تحته.
  function renderStrategicCard(canEdit, category) {
    var rows = state.rawMaterials.filter(function (item) { return item.active !== false && (!category || item.category === category); }).map(function (item) {
      var onHand = materialOnHandByCode(item.code);
      var below = item.strategicStock != null && onHand != null && onHand < Number(item.strategicStock);
      var stateBadge = item.strategicStock == null ? status("لم يُحدد", "gray") : onHand == null ? status("لا رصيد معروف", "gray") : below ? status("تحت الحد", "red") : status("سليم", "green");
      return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong><br>' + esc(item.name) + '</td><td>' + esc(item.unit) + '</td><td>' + (onHand == null ? "—" : '<span class="number">' + formatNumber(onHand) + '</span>') + '</td><td>' + (item.strategicStock == null ? "—" : '<span class="number">' + formatNumber(item.strategicStock) + '</span>') + '</td><td>' + (below ? '<strong class="number">' + formatNumber(Number(item.strategicStock) - onHand) + '</strong>' : "—") + '</td><td>' + (item.leadTimeDays == null ? "—" : '<span class="number">' + formatNumber(item.leadTimeDays) + '</span> يوم') + '</td><td>' + stateBadge + '</td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>المادة</th><th>الوحدة</th><th>الرصيد الحالي</th><th>المخزون الاستراتيجي</th><th>النقص عن الحد</th><th>مدة التوريد</th><th>الحالة</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا مواد معرفة", "عرّف المواد الأولية أولًا.");
    var alerts = strategicAlerts().filter(function (entry) { return !category || (entry.master && entry.master.category === category); });
    var alertBox = alerts.length ? '<div class="form-note locked"><strong>تنبيه: ' + alerts.length + ' ' + (alerts.length === 1 ? "مادة" : "مواد") + ' تحت المخزون الاستراتيجي.</strong> ' + alerts.map(function (entry) { return entry.master.code + " (ناقص " + formatNumber(entry.gap) + ")"; }).join("، ") + '</div>' : "";
    return card("الحدود ومدد التوريد", "يظهر للمشتريات بعد تأكيد المخزن لتوقيت الشراء قبل إنشاء الالتزام.", alertBox + content, canEdit ? '<button class="btn btn-primary btn-sm" type="button" data-action="set-strategic">ضبط الحدود والمدد</button>' : "");
  }

  function openStrategicForm() {
    var actives = state.rawMaterials.filter(function (item) { return item.active !== false; });
    if (!actives.length) { showToast("عرّف المواد الأولية أولًا.", "error"); return; }
    var canLead = state.role === "procurement";
    var rows = actives.map(function (item, index) {
      var onHand = materialOnHandByCode(item.code);
      var leadCell = canLead
        ? '<td><label class="sr-only" for="st-' + index + '-lead">مدة توريد ' + esc(item.name) + '</label><input class="input plan-cell-input" id="st-' + index + '-lead" name="stLead_' + index + '" type="number" min="0" step="1" inputmode="numeric" value="' + (item.leadTimeDays == null ? "" : esc(item.leadTimeDays)) + '" placeholder="فارغ = غير محددة"></td>'
        : '<td>' + (item.leadTimeDays == null ? '<span class="read-only">تضعها المشتريات</span>' : '<span class="number">' + formatNumber(item.leadTimeDays) + '</span> يوم') + '</td>';
      return '<tr><td><strong class="code-chip">' + esc(item.code) + '</strong><br><small>' + esc(item.name) + ' · ' + esc(item.unit) + '</small><input type="hidden" name="stCode_' + index + '" value="' + esc(item.code) + '"></td>'
        + '<td>' + (onHand == null ? "—" : '<span class="number">' + formatNumber(onHand) + '</span>') + '</td>'
        + '<td><label class="sr-only" for="st-' + index + '-stock">المخزون الاستراتيجي لمادة ' + esc(item.name) + '</label><input class="input plan-cell-input" id="st-' + index + '-stock" name="stStock_' + index + '" type="number" min="0" step="any" inputmode="decimal" value="' + (item.strategicStock == null ? "" : esc(item.strategicStock)) + '" placeholder="فارغ = بلا حد"></td>'
        + leadCell + '</tr>';
    }).join("");
    var body = '<input type="hidden" name="stCount" value="' + actives.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المادة</th><th scope="col">الرصيد الحالي</th><th scope="col">المخزون الاستراتيجي</th><th scope="col">مدة التوريد (أيام)</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">إذا نزل الرصيد المعروف لأي مادة تحت حدها الاستراتيجي يظهر تنبيه وامض للمشتريات فورًا. ' + (canLead ? "مدة التوريد التقريبية تساعد في توقيت أوامر الشراء." : "مدة التوريد يضبطها قسم المشتريات.") + '</div>';
    openDialog(dialogShell("المخزون الاستراتيجي" + (canLead ? " ومدد التوريد" : ""), "جدول واحد لكل المواد؛ الفارغ يلغي الحد.", body, "حفظ الحدود" + (canLead ? " والمدد" : ""), "strategic-form"), "wide");
  }

  function downloadStrategicTemplate(category) {
    category = category === "packing" ? "packing" : "raw";
    var materials = state.rawMaterials.filter(function (item) { return item.active !== false && item.category === category; });
    if (!materials.length) { showToast("لا توجد مواد معرفة في هذا المستودع.", "error"); return; }
    var rows = [["material_code", "material_name", "strategic_stock", "lead_time_days"]];
    materials.forEach(function (item) {
      rows.push([item.code, item.name, item.strategicStock == null ? "" : item.strategicStock, item.leadTimeDays == null ? "" : item.leadTimeDays]);
    });
    var fileName = category === "packing" ? "EMICP-packaging-limits-lead-times.xls" : "EMICP-raw-materials-limits-lead-times.xls";
    if (downloadExcelXml(fileName, rows)) showToast("نُزّل جدول Excel للحدود والمدد؛ عدّل الحد ومدة التوريد فقط ثم ارفعه.");
  }

  async function importStrategicFile(file, category) {
    category = category === "packing" ? "packing" : "raw";
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var changes = [];
    var skipped = 0;
    rows.forEach(function (row) {
      var code = normalizeCode(firstField(row, ["material_code", "code", "كود_المادة", "كود"]));
      var master = state.rawMaterials.find(function (item) { return normalizeCode(item.code) === code && item.category === category; });
      var stockRaw = String(firstField(row, ["strategic_stock", "strategic", "الحد_الاستراتيجي", "الحد"]) || "").trim();
      var leadRaw = String(firstField(row, ["lead_time_days", "lead_time", "مدة_التوريد", "المدة"]) || "").trim();
      if (!master || (stockRaw && !validNumber(stockRaw, true)) || (leadRaw && !validNumber(leadRaw, true))) { skipped += 1; return; }
      changes.push({ master: master, stock: stockRaw === "" ? null : Number(stockRaw), lead: leadRaw === "" ? null : Number(leadRaw) });
    });
    if (!changes.length) throw new Error("لم يُقبل أي صف. تحقق من أكواد المواد والحدود والمدد.");
    if (!window.confirm("نتيجة جدول الحدود والمدد قبل الحفظ:\nصفوف مقبولة: " + changes.length + "\nصفوف متجاوزة: " + skipped + "\n\nهل تريد إرسالها للمشتريات؟")) return;
    var changed = 0;
    changes.forEach(function (entry) {
      if (entry.master.strategicStock !== entry.stock) { entry.master.strategicStock = entry.stock; changed += 1; }
      if (entry.master.leadTimeDays !== entry.lead) { entry.master.leadTimeDays = entry.lead; changed += 1; }
      entry.master.strategicSetBy = "الإنتاج";
      entry.master.strategicSetAt = currentTimestamp();
    });
    addAudit("رفع الإنتاج جدول الحدود ومدد التوريد لـ" + (category === "packing" ? "مواد التغليف" : "المواد الأولية") + " (" + changes.length + " مادة)", roleName(state.role));
    refresh("تم حفظ الحدود والمدد وإظهارها للمشتريات قبل إنشاء الالتزامات." + (skipped ? " تم تجاوز " + skipped + " صف." : ""));
  }

  function renderRequirementCard(withActions) {
    var rows = state.materials.filter(function (item) {
      return state.role !== "procurement" || warehouseReviewReleased(item);
    }).map(function (item) {
      var shortage = materialShortage(item);
      var linkedCommitments = state.commitments.filter(function (record) { return record.materialId === item.id; });
      var commitmentCell = linkedCommitments.length ? linkedCommitments.map(function (record) { return '<div class="req-po"><strong>' + esc(record.po) + '</strong> · ' + esc(statusInfo(record.status)[0]) + '</div>'; }).join("") : '<span class="read-only">لا يوجد</span>';
      var action = "";
      if (withActions && !item.stockConfirmed) action = '<button class="btn btn-secondary btn-sm" type="button" disabled>بانتظار رفع رصيد المخزن</button>';
      else if (withActions && !warehouseReviewReleased(item)) action = '<button class="btn btn-secondary btn-sm" type="button" disabled>بانتظار مراجعة الإنتاج وتأكيد المخزن</button>';
      else if (withActions && shortage) action = '<button class="btn btn-primary btn-sm" type="button" data-action="new-commitment" data-material="' + esc(item.id) + '">إنشاء التزام</button>';
      else if (withActions) action = status("لا شراء مطلوب", "green");
      return '<tr>'
        + '<td><strong>' + esc(item.id) + '</strong><br><small>' + esc(item.forecastId || "") + '</small>' + (item.productCode ? '<br><small><span class="code-chip">' + esc(item.productCode) + '</span></small>' : "") + '</td>'
        + '<td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br>' + esc(item.material) + '<br>' + (function () { var cardMaster = rawMasterByCode(item.materialCode); return materialCategoryBadge(cardMaster ? cardMaster.category : "raw"); })() + leadTimeBadge(item.materialCode) + '</td>'
        + '<td><strong class="number">' + formatNumber(item.required) + '</strong> ' + esc(item.unit || "") + (item.consumed > 0 ? '<br><small>استُهلك ' + formatNumber(item.consumed) + ' · متبقٍ ' + formatNumber(effectiveRequired(item)) + '</small>' : "") + '</td>'
        + '<td>' + requirementMonthsCell(item) + '</td>'
        + '<td>' + (item.stockConfirmed ? '<span class="number">' + formatNumber(materialAllocatedAvailable(item)) + '</span>' : "—") + '</td>'
        + '<td><span class="number">' + formatNumber(item.inbound) + '</span></td>'
        + '<td>' + (item.stockConfirmed ? '<strong class="number">' + formatNumber(shortage) + '</strong>' : "—") + '</td>'
        + '<td>' + statusByValue(!item.stockConfirmed ? "pending" : shortage ? "shortage" : "available") + (item.changedAfterOrder ? '<br>' + status("تغيّر بعد الأوردر", "red") : "") + '<br><small>المستند: ' + (materialForecastFixed(item) ? "مثبت" : "قيد الجاهزية") + '</small><br><small>المخزن: ' + (item.stockConfirmed ? "مؤكد" : "غير مؤكد") + '</small></td>'
        + '<td>' + commitmentCell + '</td>'
        + '<td>' + stepDate("طلب الإنتاج", item.createdAt) + (item.stockConfirmedAt ? stepDate("رفع الرصيد", item.stockConfirmedAt) : "") + '</td>'
        + (withActions ? '<td>' + action + '</td>' : "")
        + '</tr>';
    }).join("");
    var head = '<tr><th>المرجع والمستند</th><th>المادة</th><th>المطلوب</th><th>أشهر الحاجة</th><th>المتاح</th><th>القادم</th><th>النقص</th><th>الحالة</th><th>أوامر الشراء</th><th>تواريخ الخطوة</th>' + (withActions ? '<th>الإجراء</th>' : "") + '</tr>';
    var content = rows ? '<div class="table-wrap requirements-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد طلبات مواد", "تظهر هنا بعد أن يحدد الإنتاج الاحتياج ويرفع المخزن الرصيد ويعتمد الإنتاج النتيجة.");
    return card("طلبات المواد", "جدول كامل من احتياج الإنتاج حتى أمر الشراء — مع أشهر الحاجة", content);
  }

  // تأكيد إمكانية التوريد: بوابة المشتريات في فحص الجاهزية — قبل تثبيت المستند وقبل أي شراء فعلي.
  function renderSupplyFeasibilityCard() {
    if (state.role !== "procurement") return "";
    var awaiting = forecastsAwaitingSupplyConfirm();
    if (!awaiting.length) return "";
    var rows = awaiting.map(function (forecast) {
      var readiness = forecastReadiness(forecast);
      return '<div class="list-item"><div><h3>' + esc(forecast.id + " · " + forecast.version) + ' — ' + esc(forecastPeriod(forecast)) + '</h3><p>إجمالي النقص المحسوب: <strong class="number">' + formatNumber(readiness.shortageTotal) + '</strong>' + (readiness.shortageTotal > 0 ? " — راجع أشهر الحاجة مقابل مدد التوريد" : " — الرصيد يغطي الاحتياج") + '</p><div class="list-meta"><span>تأكيدك شرط لفتح رد الإنتاج على المبيعات؛ لا يُنشئ أي أمر شراء الآن.</span>' + (readiness.supply ? '<span>قرارك الحالي: ' + (readiness.supply.confirmed ? "التوريد ممكن" : "تعذر التوريد") + ' — يمكن تعديله قبل التثبيت.</span>' : "") + '</div></div><div class="list-actions"><button class="btn btn-primary btn-sm" type="button" data-action="confirm-supply" data-id="' + esc(forecast.id) + '">' + (readiness.supply ? "تعديل قرار التوريد" : "قرار إمكانية التوريد") + '</button></div></div>';
    }).join("");
    return card("تأكيد إمكانية التوريد — فحص الجاهزية", "قبل تثبيت المستند: هل تستطيع تغطية النقص في أشهر الحاجة؟", '<div class="list">' + rows + '</div>');
  }

  function openSupplyForm(forecastId) {
    var forecast = state.forecasts.find(function (item) { return item.id === forecastId; });
    if (!forecast || forecast.status !== "submitted") { showToast("هذا المستند ليس في مرحلة فحص الجاهزية.", "error"); return; }
    var requirements = forecastRequirements(forecast.id);
    var rows = requirements.map(function (item) {
      var shortage = materialShortage(item);
      return '<tr><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br><small>' + esc(item.material) + '</small>' + leadTimeBadge(item.materialCode) + '</td><td><span class="number">' + formatNumber(effectiveRequired(item)) + '</span> ' + esc(item.unit || "") + '</td><td>' + requirementMonthsCell(item) + '</td><td>' + (shortage > 0 ? '<strong class="number">' + formatNumber(shortage) + '</strong>' : status("مغطى", "green")) + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="supplyForecast" value="' + esc(forecast.id) + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th>المادة ومدة التوريد</th><th>المطلوب</th><th>أشهر الحاجة</th><th>النقص</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-grid"><div class="field"><label for="sf-decision">قرارك</label><select class="select" id="sf-decision" name="supplyDecision"><option value="yes">أؤكد إمكانية التوريد في أشهر الحاجة</option><option value="no">تعذر التوريد في المواعيد المطلوبة</option></select></div><div class="field full"><label for="sf-note">ملاحظة</label><input class="input" id="sf-note" name="supplyNote" placeholder="مثال: مدة توريد السكر 45 يومًا — يلزم تقديم أوردر أيلول"></div></div>'
      + '<div class="form-note locked">هذا تأكيد جاهزية فقط ولا يُنشئ أوامر شراء. «تعذر التوريد» يمنع التثبيت ويلزم الإنتاج بإرسال أرقام معدلة للمبيعات.</div>';
    openDialog(dialogShell("قرار إمكانية التوريد — " + forecast.id, "بوابة المشتريات قبل تثبيت المستند.", body, "حفظ القرار", "supply-form"), "wide");
  }

  // بطاقة الخطة الزمنية: ترى فيها لكل مادة رصيدها المتوقع شهرًا بشهر وأين ينكسر.
  function renderTimePhasedCard() {
    var codes = confirmedMaterialCodes();
    if (!codes.length) return "";
    var blocks = codes.map(function (code) {
      var plan = materialTimePhasedPlan(code);
      if (!plan.rows.length) return "";
      var rop = reorderPointFor(code);
      var head = plan.rows.map(function (row) { return '<th scope="col">' + esc(monthLabel(row.month)) + '</th>'; }).join("");
      function line(label, pick, cls) {
        return '<tr><th scope="row">' + label + '</th>' + plan.rows.map(function (row) {
          var value = pick(row);
          return '<td class="' + (cls || "") + '">' + (value > 0 ? '<span class="number">' + formatNumber(value) + '</span>' : '<span class="read-only">—</span>') + '</td>';
        }).join("") + '</tr>';
      }
      var closingRow = '<tr><th scope="row">الرصيد المتوقع آخر الشهر</th>' + plan.rows.map(function (row) {
        var low = plan.floor > 0 && row.closing <= plan.floor + QTY_EPSILON;
        return '<td>' + (low ? '<strong class="number tone-amber">' + formatNumber(row.closing) + '</strong>' : '<span class="number">' + formatNumber(row.closing) + '</span>') + '</td>';
      }).join("") + '</tr>';
      var netRow = '<tr class="ref-total-row"><th scope="row">صافي الاحتياج للشراء</th>' + plan.rows.map(function (row) {
        return '<td>' + (row.net > QTY_EPSILON ? '<strong class="number">' + formatNumber(row.net) + '</strong>' + (row.orderBy ? '<br><small class="read-only">اطلب قبل ' + esc(row.orderBy) + '</small>' : "") : '<span class="read-only">—</span>') + '</td>';
      }).join("") + '</tr>';
      var meta = '<small class="read-only">' + (plan.floor > 0 ? 'المخزون الاستراتيجي ' + formatNumber(plan.floor) + ' ' + esc(plan.unit || "") : 'بلا مخزون استراتيجي محدد')
        + (rop != null ? ' · نقطة إعادة الطلب ' + formatNumber(rop) : ' · نقطة إعادة الطلب غير محسوبة (حدّد مدة التوريد)') + '</small>';
      return '<details class="material-products-ref"' + (plan.totalNet > QTY_EPSILON ? " open" : "") + '><summary><strong class="code-chip">' + esc(code) + '</strong> ' + esc(plan.material)
        + (plan.totalNet > QTY_EPSILON ? ' — <strong>صافي شراء ' + formatNumber(plan.totalNet) + ' ' + esc(plan.unit || "") + '</strong>' : ' — <span class="read-only">مغطى بالكامل</span>') + '</summary>'
        + meta + '<div class="table-wrap"><table><thead><tr><th scope="col">البند</th>' + head + '</tr></thead><tbody>'
        + line("رصيد أول الشهر", function (row) { return row.opening; })
        + line("وارد متوقع", function (row) { return row.receipts; })
        + line("حاجة الشهر", function (row) { return row.requirement; })
        + closingRow + netRow
        + '</tbody></table></div></details>';
    }).join("");
    if (!blocks) return "";
    return card("الخطة الزمنية للمواد — صافي الاحتياج شهرًا بشهر", "رصيد مُرحَّل من شهر لآخر، والوارد محسوب في شهر وصوله لا اليوم", blocks);
  }

  function renderRequirements() {
    return pageHead("طلبات المواد", "النقص المؤكد الوارد للمشتريات", "يمر الملف أولًا بالمخزن ثم مراجعة الإنتاج ثم تأكيد المخزن؛ بعدها فقط يحوله الإنتاج للمشتريات.", "") + boundary() + warehouseReviewCard("raw") + warehouseReviewCard("packing") + renderSupplyFeasibilityCard() + renderTimePhasedCard() + renderStrategicCard(true) + renderRequirementCard(true);
  }

  function renderCommitmentCard(withActions) {
    var body = state.commitments.map(function (item) {
      var material = state.materials.find(function (m) { return m.id === item.materialId; });
      var receipt = state.rawReceipts.find(function (record) { return record.commitmentId === item.id; });
      var action = "";
      var cancellable = withActions && (item.status === "submitted" || item.status === "confirmed");
      var financeApproved = item.financeApproval && item.financeApproval.status === "approved";
      if (withActions && item.status === "cancelled") action = statusByValue("cancelled");
      else if (withActions && (item.status === "submitted" || item.status === "confirmed") && !financeApproved) action = '<button class="btn btn-secondary btn-sm" type="button" disabled>' + (item.financeApproval && item.financeApproval.status === "rejected" ? "مرفوض من المالية" : "بانتظار موافقة المالية") + '</button><label class="btn btn-secondary btn-sm file-button">' + (item.quotation && item.quotation.dataUrl ? "استبدال الكوتيشن" : "إرفاق الكوتيشن") + '<input type="file" data-action="quotation-late" data-id="' + esc(item.id) + '"></label>';
      else if (withActions && (item.status === "submitted" || item.status === "confirmed")) action = '<button class="btn btn-primary btn-sm" type="button" data-action="advance-commitment" data-id="' + esc(item.id) + '">تأكيد الأوردر وبدء التوريد</button>';
      else if (withActions && item.status === "in_transit") action = '<button class="btn btn-secondary btn-sm" type="button" disabled>بانتظار استلام المخزن</button>';
      else if (withActions && item.status === "received") action = status("اكتمل الاستلام", "green");
      if (cancellable) action += '<button class="btn btn-danger btn-sm" type="button" data-action="cancel-commitment" data-id="' + esc(item.id) + '">إلغاء</button>';
      var datesCell = stepDate("إنشاء الطلب", item.createdAt) + (item.inTransitAt ? stepDate("بدء التوريد", item.inTransitAt) : "") + (receipt && receipt.receivedAt ? stepDate("استلام المخزن", receipt.receivedAt) : "");
      return '<tr>'
        + '<td><strong>' + esc(item.id) + '</strong>' + (material ? '<br><small><span class="code-chip">' + esc(material.materialCode) + '</span> ' + esc(material.material) + '</small>' : '<br><small>' + esc(item.materialId) + '</small>') + '</td>'
        + '<td>' + esc(item.supplier) + '</td>'
        + '<td><strong>' + esc(item.po) + '</strong></td>'
        + '<td><strong class="number">' + formatNumber(item.qty) + '</strong> ' + esc(material ? material.unit || "" : "") + '</td>'
        + '<td>' + (material ? requirementMonthsCell(material) : "—") + '</td>'
        + '<td>' + esc(item.orderDate || "غير مسجل") + '</td>'
        + '<td><time class="need-date">' + esc(item.eta || "—") + '</time></td>'
        + '<td>' + esc(item.amount || "—") + '</td>'
        + '<td>' + (item.financeApproval ? (item.financeApproval.status === "approved" ? status("موافقة المالية ✓", "green") : item.financeApproval.status === "rejected" ? status("مرفوض", "red") : status("بانتظار المالية", "amber")) : "—") + '<br>' + quotationLink(item) + '</td>'
        + '<td>' + statusByValue(item.status) + '</td>'
        + '<td>' + datesCell + (item.financeApproval && item.financeApproval.at ? stepDate("قرار المالية", item.financeApproval.at) : "") + '</td>'
        + (withActions ? '<td>' + action + '</td>' : "")
        + '</tr>';
    }).join("");
    var head = '<tr><th>الأوردر والمادة</th><th>المورد</th><th>PO</th><th>الكمية</th><th>أشهر الحاجة</th><th>تاريخ الأوردر</th><th>ETA</th><th>القيمة</th><th>المالية والكوتيشن</th><th>التوريد</th><th>تواريخ الخطوة</th>' + (withActions ? '<th>الإجراء</th>' : "") + '</tr>';
    var content = body ? '<div class="table-wrap commitments-table"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' : empty("لا توجد التزامات", "أنشئ التزامًا للنقص المؤكد من المخزن.");
    return card("Procurement Commitment", "جدول كامل: المورد وPO والكمية وأشهر الحاجة وETA والتوريد", content);
  }

  function renderProcurement() {
    // المالية ترى هذه الشاشة للاطلاع فقط: كانت أزرارها كاملة أمامها فتنشئ الأمر وتوافق عليه وتنفّذه.
    var canAct = state.role === "procurement" && procurementReleaseExists();
    var viewButton = '<button class="btn btn-beautify" type="button" data-action="toggle-procurement-view" aria-pressed="' + (procurementPolished ? "true" : "false") + '"><span aria-hidden="true">✦</span>' + (procurementPolished ? "العرض المعتاد" : "تحسين العرض") + '</button>';
    return pageHead("Procurement Commitment", "التزامات الشراء المفتوحة", "لا تظهر طلبات شراء جديدة قبل تحويل الإنتاج للملف بعد مراجعة المخزن وتأكيده.", viewButton + (canAct ? '<button class="btn btn-primary" type="button" data-action="new-commitment">التزام جديد</button>' : "")) + boundary() + warehouseReviewCard("raw") + warehouseReviewCard("packing") + (state.role === "procurement" && !canAct ? card("بانتظار الإنتاج", "المخزن أكد الملف، لكنه لم يُحوّل بعد إلى المشتريات.", '<div class="form-note locked">الخطوة الحالية: الإنتاج يراجع الملف، يعيده للمخزن إن عدّل، أو يضغط «تحويل للمشتريات» بعد التأكيد.</div>') : "") + renderStrategicCard(false) + renderCommitmentCard(canAct);
  }

  function renderRmStockCard(editable, category) {
    category = category || "raw";
    // صف واحد لكل كود مادة: الرصيد الفيزيائي واحد ولا يُعرض مكررًا لكل خطة.
    var codes = [];
    state.materials.forEach(function (item) { var code = normalizeCode(item.materialCode); var sent = state.materialDispatches && state.materialDispatches[item.category || "raw"] && state.materialDispatches[item.category || "raw"].status === "sent"; if ((item.category || "raw") === category && sent && codes.indexOf(code) === -1) codes.push(code); });
    var rows = codes.map(function (code) {
      var records = sortedCodeRecords(code).filter(function (record) { return (record.category || "raw") === category; });
      var sample = records[0];
      var storageMaster = rawMasterByCode(code, category);
      var confirmedRecords = records.filter(function (record) { return record.stockConfirmed; });
      var allConfirmed = records.every(function (record) { return record.stockConfirmed; });
      var reference = confirmedRecords[0] || null;
      var totalRemaining = records.reduce(function (sum, record) { return sum + effectiveRequired(record); }, 0);
      var totalInbound = records.reduce(function (sum, record) { return sum + Number(record.inbound || 0); }, 0);
      var needDates = records.map(function (record) { return record.needDate; }).filter(Boolean).sort();
      var available = reference ? materialAvailable(reference) : 0;
      var codeShortage = allConfirmed ? Math.max(0, totalRemaining - available - totalInbound) : 0;
      var stockState = !allConfirmed ? "pending" : codeShortage > 0 ? "shortage" : "available";
      var stockAction = editable ? '<div class="list-actions">' + statusByValue(stockState) + '<button class="btn btn-secondary btn-sm" type="button" data-action="confirm-stock" data-category="' + category + '" data-id="' + esc(sample.id) + '">' + (allConfirmed ? "تعديل الرصيد" : "تأكيد الرصيد") + '</button></div>' : '<span class="read-only">قراءة فقط</span>';
      return '<tr><td><strong class="code-chip">' + esc(code) + '</strong><br>' + esc(sample.material) + '</td>'
        + '<td class="required-qty-cell"><strong class="number">' + formatNumber(totalRemaining) + '</strong><span>' + esc(sample.unit || "وحدة") + '</span></td>'
        + '<td><time class="need-date">' + esc(needDates[0] || "غير مسجل") + '</time></td>'
        + '<td>' + (reference ? '<span class="number">' + formatNumber(reference.onHand) + '</span>' : "—") + '</td>'
        + '<td>' + (reference ? '<span class="number">' + formatNumber(reference.reserved) + '</span>' : "—") + '</td>'
        + '<td>' + (reference ? '<span class="number">' + formatNumber(reference.hold) + '</span>' : "—") + '</td>'
        + '<td>' + (reference ? '<span class="number">' + formatNumber(available) + '</span>' : "—") + '</td>'
        + '<td>' + (function () {
          // نقطة إعادة الطلب: متوسط الطلب اليومي × مدة التوريد + المخزون الاستراتيجي.
          var rop = reorderPointFor(code);
          if (rop == null) return '<span class="read-only">حدّد مدة التوريد</span>';
          var below = reference && available < rop;
          return '<span class="number">' + formatNumber(rop) + '</span>' + (below ? '<br>' + status("تحت نقطة الطلب", "red") : "");
        })() + '</td>'
        + '<td><span class="number">' + formatNumber(totalInbound) + '</span></td>'
        + '<td>' + (allConfirmed ? '<strong class="number">' + formatNumber(codeShortage) + '</strong>' : "—") + '</td>'
        + '<td>' + (wasteQtyForCode(code) ? '<strong class="number">' + formatNumber(wasteQtyForCode(code)) + '</strong>' : "—") + '</td>'
        + '<td>' + stepDate("آخر تأكيد", reference ? reference.stockConfirmedAt : "") + '</td>'
        + '<td>' + stockAction + '</td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap rm-stock-table"><table><thead><tr><th>المادة</th><th>المطلوب المتبقي (كل الخطط)</th><th>أقرب تاريخ حاجة</th><th>On Hand</th><th>Reserved</th><th>Hold</th><th>Available</th><th>نقطة إعادة الطلب</th><th>Inbound</th><th>النقص الكلي</th><th>التوالف</th><th>تاريخ الرصيد</th><th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد مواد للمراجعة", "تصل المادة هنا بعد أن يضيفها قسم الإنتاج إلى الخطة.");
    return card(category === "packing" ? "جدول مواد التغليف" : "جدول المواد الأولية", editable ? "صف واحد لكل مادة — لا تظهر هنا منتجات المبيعات أو تفاصيلها" : "عرض قراءة للمشتريات", content);
  }

  function renderRmStock() {
    var editable = state.role === "rmWarehouse";
    return pageHead("مستودع المواد الأولية", editable ? "حقيقة مخزون المواد الأولية" : "مخزون المواد الأولية — قراءة فقط", editable ? "أكّد الكمية والحجز والحظر والوارد للمواد الأولية." : "يمكن للمشتريات الاطلاع لاتخاذ قرار، ولا يمكنها تعديل أي رصيد.", editable ? '<button class="btn btn-primary" type="button" data-action="confirm-stock" data-category="raw">رفع الرصيد الحالي</button><button class="btn btn-secondary" type="button" data-action="download-warehouse-file" data-category="raw">تنزيل ملف المخزن</button><label class="btn btn-secondary file-button">رفع ملف المخزن<input type="file" accept=".xlsx,.xls,.csv" data-action="import-warehouse-file" data-category="raw"></label>' : "") + boundary() + warehouseReviewCard("raw") + (editable ? renderJourneyCard() : "") + renderRmStockCard(editable, "raw") + renderWasteCard(false);
  }

  function renderPackingStock() {
    var editable = state.role === "rmWarehouse";
    return pageHead("مستودع مواد التغليف", editable ? "حقيقة مخزون مواد التغليف" : "مخزون مواد التغليف — قراءة فقط", editable ? "أكّد الكمية والحجز والحظر والوارد لمواد التغليف فقط." : "يمكن للمشتريات الاطلاع لاتخاذ قرار، ولا يمكنها تعديل أي رصيد.", editable ? '<button class="btn btn-primary" type="button" data-action="confirm-stock" data-category="packing">رفع الرصيد الحالي</button><button class="btn btn-secondary" type="button" data-action="download-warehouse-file" data-category="packing">تنزيل ملف المخزن</button><label class="btn btn-secondary file-button">رفع ملف المخزن<input type="file" accept=".xlsx,.xls,.csv" data-action="import-warehouse-file" data-category="packing"></label>' : "") + boundary() + warehouseReviewCard("packing") + renderRmStockCard(editable, "packing");
  }

  function renderRawReceipts(category) {
    category = category || "raw";
    var body = state.rawReceipts.filter(function (item) { var master = rawMasterByCode(item.materialCode); return (master ? master.category : "raw") === category; }).map(function (item) {
      var relatedCommitment = state.commitments.find(function (commitment) { return commitment.id === item.commitmentId; });
      var waitingLabel = "بانتظار In Transit من المشتريات";
      var action = item.status === "expected"
        ? (receiptReadyForWarehouse(item) ? '<button class="btn btn-primary btn-sm" type="button" data-action="receive-material" data-id="' + esc(item.id) + '">تسجيل الاستلام</button>' : '<button class="btn btn-secondary btn-sm" type="button" disabled>' + waitingLabel + '</button>')
        : (state.role === "rmWarehouse" && item.status === "received" ? '<button class="btn btn-danger btn-sm" type="button" data-action="undo-receipt" data-id="' + esc(item.id) + '">تراجع عن الاستلام</button>' : "");
      var partialBadge = item.status === "received" && Number(item.received) < Number(item.qty) ? '<span>' + statusByValue("partial") + '</span>' : "";
      return '<div class="list-item"><div><h3><span class="code-chip">' + esc(item.materialCode) + '</span> ' + esc(item.id + " · " + item.material) + '</h3><p>متوقع <span class="number">' + formatNumber(item.qty) + '</span> · مستلم <span class="number">' + formatNumber(item.received) + '</span></p><div class="list-meta"><span>' + statusByValue(item.status) + '</span>' + partialBadge + stepDate("إنشاء الوارد", item.expectedAt) + (relatedCommitment && relatedCommitment.inTransitAt ? stepDate("In Transit", relatedCommitment.inTransitAt) : "") + (item.receivedAt ? stepDate("تأكيد الاستلام", item.receivedAt) : "") + '</div></div><div class="list-actions">' + action + '</div></div>';
    }).join("");
    var title = category === "packing" ? "استلام مواد التغليف" : "استلام المواد الأولية";
    return pageHead(title, "الوارد الفعلي إلى المخزن", "سجّل الكمية المستلمة؛ تضاف مباشرة إلى رصيد المادة في مستودعها المنفصل.", '<button class="btn btn-primary" type="button" data-action="receive-material" data-category="' + category + '">تسجيل استلام</button>') + boundary() + card("الوارد", "الكمية المستلمة تضاف مباشرة إلى رصيد المادة", body ? '<div class="list">' + body + '</div>' : empty("لا يوجد وارد متوقع", "يظهر هنا بعد أن تنشئ المشتريات التزام شراء."));
  }

  function renderPackingReceipts() { return renderRawReceipts("packing"); }

  // بطاقة الخطة الرئيسية: الفوركاست ⇐ ما أُنتج ⇐ ما يغطيه المخزون ⇐ الصافي المطلوب إنتاجه.
  function renderMpsCard() {
    var codes = [];
    state.forecasts.filter(function (item) { return item.status === "fixed"; }).forEach(function (forecast) {
      forecast.items.forEach(function (line) {
        var code = normalizeCode(line.productCode);
        if (codes.indexOf(code) === -1) codes.push(code);
      });
    });
    if (!codes.length) return "";
    var rows = [];
    codes.sort().forEach(function (code) {
      productionNetPlanFor(code).forEach(function (row) {
        rows.push('<tr><td><strong class="code-chip">' + esc(row.productCode) + '</strong><br><small>' + esc(row.productName) + '</small></td>'
          + '<td>' + esc(monthLabel(row.month)) + '<br><small class="read-only">' + esc(row.forecastId) + '</small></td>'
          + '<td><span class="number">' + formatNumber(row.gross) + '</span> ' + esc(row.unit || "") + '</td>'
          + '<td>' + (row.produced > 0 ? '<span class="number">' + formatNumber(row.produced) + '</span>' : '<span class="read-only">—</span>') + '</td>'
          + '<td>' + (row.fromStock > 0 ? '<strong class="number">' + formatNumber(row.fromStock) + '</strong>' : '<span class="read-only">—</span>') + '</td>'
          + '<td>' + (row.net > QTY_EPSILON ? '<strong class="number">' + formatNumber(row.net) + '</strong>' : status("مغطى", "green")) + '</td></tr>');
      });
    });
    if (!rows.length) return "";
    return card("الخطة الرئيسية للإنتاج — الصافي بعد المخزون", "لا تُنتج فوق رصيد قائم: المتاح من المنتج النهائي يُخصم من أقرب الأشهر أولًا",
      '<div class="table-wrap"><table><thead><tr><th scope="col">المنتج</th><th scope="col">الشهر</th><th scope="col">الفوركاست</th><th scope="col">أُنتج</th><th scope="col">مغطى من المخزون</th><th scope="col">الصافي المطلوب إنتاجه</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div>');
  }

  function renderAccuracyCard() {
    var codes = [];
    state.products.forEach(function (item) { codes.push(normalizeCode(item.code)); });
    var rows = codes.map(function (code) {
      var accuracy = demandAccuracyFor(code);
      if (!accuracy) return "";
      var product = state.products.find(function (item) { return normalizeCode(item.code) === code; });
      var biasTone = Math.abs(accuracy.bias) <= 5 ? "green" : Math.abs(accuracy.bias) <= 10 ? "amber" : "red";
      return '<tr><td><strong class="code-chip">' + esc(code) + '</strong><br><small>' + esc(product ? product.name : "") + '</small></td>'
        + '<td><span class="number">' + formatNumber(accuracy.planned) + '</span></td>'
        + '<td><span class="number">' + formatNumber(accuracy.actual) + '</span></td>'
        + '<td>' + status((accuracy.bias > 0 ? "+" : "") + accuracy.bias + "٪", biasTone) + '</td>'
        + '<td><span class="number">' + accuracy.wmape + '٪</span></td>'
        + '<td>' + accuracy.months + '</td></tr>';
    }).filter(Boolean);
    if (!rows.length) return "";
    return card("دقة التنبؤ — المثبت مقابل المبيعات الفعلية", "الانحياز الموجب يعني تخطيطًا أقل من الطلب، والسالب يعني إنتاجًا فائضًا",
      '<div class="table-wrap"><table><thead><tr><th scope="col">المنتج</th><th scope="col">المخطط</th><th scope="col">الفعلي</th><th scope="col">الانحياز</th><th scope="col">نسبة الخطأ</th><th scope="col">أشهر مقيسة</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div><div class="form-note">الانحياز ضمن ±5٪ صحي؛ تجاوزه المستمر يعني خللًا بنيويًا في طريقة التقدير لا مجرد تذبذب. يظهر الرقم أيضًا داخل نافذة «بناء Forecast من مصادر الطلب» أمام كل منتج.</div>');
  }

  function renderExecution() {
    var body = state.actuals.map(function (item) {
      return '<div class="list-item"><div><h3><span class="code-chip">' + esc(item.productCode) + '</span> ' + esc(item.batch + " · " + item.product) + '</h3><p>شهر <strong>' + esc(monthLabel(item.month)) + '</strong> · مخطط الشهر <span class="number">' + formatNumber(item.planned) + '</span> · Actual <span class="number">' + formatNumber(item.actual) + '</span> · الفرق <span class="number">' + formatNumber(item.actual - item.planned) + '</span></p><div class="list-meta"><span>تاريخ الإنجاز: ' + esc(item.date) + '</span><span>' + statusByValue(item.status) + '</span>' + stepDate("تسجيل الفعلي", item.recordedAt) + '</div></div><div class="list-actions"><button class="btn btn-secondary btn-sm" type="button" data-action="new-actual">تحديث جديد</button></div></div>';
    }).join("");
    return pageHead("Production Actual", "تنفيذ الإنتاج الفعلي شهرًا بشهر", "التسلسل إلزامي: لا تشغيل قبل اعتماد الخطة الأسبوعية لذلك الشهر وتغطية المواد (شراء المشتريات لأي نقص). الإنتاج يسجل ما أُنتج؛ المخزن يؤكد ما استلمه.", '<button class="btn btn-primary" type="button" data-action="new-actual">تسجيل Actual</button>') + boundary() + renderMpsCard() + card("الدفعات", "التسجيل يستهلك حصة الشهر من المواد ولا يرفع رصيد FG تلقائيًا", body ? '<div class="list">' + body + '</div>' : empty("لا يوجد إنتاج فعلي", "بعد اعتماد الخطة الأسبوعية وتغطية المواد سجّل الكمية المنتجة لكل شهر."));
  }

  // المبيعات اليومية: تجميع سجل البيع يومًا بيوم.
  function renderDailySalesCard() {
    var days = [];
    state.salesRecords.forEach(function (item) {
      var entry = days.find(function (d) { return d.date === item.date; });
      if (!entry) { entry = { date: item.date, total: 0, parts: {} }; days.push(entry); }
      entry.total += Number(item.qty || 0);
      entry.parts[item.productCode] = (entry.parts[item.productCode] || 0) + Number(item.qty || 0);
    });
    days.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var rows = days.map(function (entry) {
      var parts = Object.keys(entry.parts).map(function (code) { return '<small class="req-po"><span class="code-chip">' + esc(code) + '</span> <span class="number">' + formatNumber(entry.parts[code]) + '</span></small>'; }).join(" ");
      return '<tr><td><time class="need-date">' + esc(entry.date) + '</time></td><td>' + parts + '</td><td><strong class="number">' + formatNumber(entry.total) + '</strong></td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>اليوم</th><th>تفصيل المنتجات</th><th>إجمالي اليوم</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا مبيعات يومية بعد", "يظهر هنا مجموع كل يوم فور تسجيل المبيعات.");
    return card("المبيعات اليومية", "مجموع البيع يومًا بيوم لكل المنتجات", content);
  }

  // المتابعة الشهرية: مخطط/فعلي/مباع/انحراف لكل منتج وشهر + حركة المواد (محجوبة عن المبيعات).
  function renderMonthly() {
    var productRows = [];
    fixedForecasts().forEach(function (forecast) {
      forecast.items.forEach(function (line) {
        forecast.months.forEach(function (month) {
          var planned = Number(line.monthlyQty[month] || 0);
          if (planned <= 0) return;
          var produced = producedQty(forecast.id, line.productCode, month);
          var sold = soldInMonth(line.productCode, month);
          var deviation = sold - planned;
          var badge = sold >= planned ? status("حقق المخطط", "green") : produced >= planned ? status("منتج وغير مباع بعد", "amber") : status("انحراف", deviation < 0 ? "amber" : "green");
          productRows.push('<tr><td><strong class="code-chip">' + esc(line.productCode) + '</strong><br><small>' + esc(line.productName) + '</small></td><td><strong>' + esc(monthLabel(month)) + '</strong></td><td><span class="number">' + formatNumber(planned) + '</span></td><td><span class="number">' + formatNumber(produced) + '</span></td><td><span class="number">' + formatNumber(sold) + '</span></td><td><strong class="number">' + formatNumber(deviation) + '</strong>' + (planned ? '<br><small>' + Math.round(sold / planned * 100) + '٪ من المخطط</small>' : "") + '</td><td>' + badge + '</td></tr>');
        });
      });
    });
    var productTable = productRows.length ? '<div class="table-wrap"><table><thead><tr><th>المنتج</th><th>الشهر</th><th>المخطط</th><th>المنتَج فعليًا</th><th>المباع</th><th>الانحراف (مباع − مخطط)</th><th>الحالة</th></tr></thead><tbody>' + productRows.join("") + '</tbody></table></div>' : empty("لا بيانات شهرية بعد", "تظهر الصفوف بعد تثبيت Forecast.");
    var productsCard = card("مباع مقابل مخطط", "لكل منتج وشهر: المخطط المثبت والمنتَج والمباع والانحراف", productTable);
    if (state.role === "sales") {
      // المبيعات لا ترى المواد الأولية — بطاقة الحركة محجوبة عنها.
      return pageHead("المتابعة الشهرية", "مباع مقابل مخطط", "تابع تحقق Forecast شهرًا بشهر: المخطط والمنتَج والمباع والانحراف.", "") + boundary() + renderAccuracyCard() + productsCard + renderDailySalesCard();
    }
    var monthSet = [];
    fixedForecasts().forEach(function (forecast) { forecast.months.forEach(function (month) { if (monthSet.indexOf(month) === -1) monthSet.push(month); }); });
    state.materialMoves.forEach(function (move) { if (move.month && monthSet.indexOf(move.month) === -1) monthSet.push(move.month); });
    monthSet.sort();
    var codes = [];
    state.materials.forEach(function (item) { var code = normalizeCode(item.materialCode); if (codes.indexOf(code) === -1) codes.push(code); });
    var moveHead = '<tr><th>المادة</th>' + monthSet.map(function (month) { return '<th class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th>الرصيد الحالي</th></tr>';
    var moveRows = codes.map(function (code) {
      var sample = state.materials.find(function (item) { return normalizeCode(item.materialCode) === code; });
      var cells = monthSet.map(function (month) {
        var received = movesInMonth(code, month, "receive");
        var withdrawn = movesInMonth(code, month, "withdraw");
        var wasted = movesInMonth(code, month, "waste");
        // التوالف كانت محسوبة وخارج الشرط، فتختفي 300 كغم مخصومة فعلًا من الرصيد بلا أي أثر في الجدول.
        if (!received && !withdrawn && !wasted) return '<td><span class="read-only">—</span></td>';
        return '<td>' + (received ? '<small class="req-po">وارد: <span class="number">' + formatNumber(received) + '</span></small><br>' : "") + (withdrawn ? '<small class="req-po">مسحوب: <span class="number">' + formatNumber(withdrawn) + '</span></small><br>' : "") + (wasted ? '<small class="req-po">توالف: <span class="number">' + formatNumber(wasted) + '</span></small>' : "") + '</td>';
      }).join("");
      var onHand = materialOnHandByCode(code);
      return '<tr><td><strong class="code-chip">' + esc(code) + '</strong><br><small>' + esc(sample ? sample.material : "") + '</small></td>' + cells + '<td>' + (onHand == null ? "—" : '<strong class="number">' + formatNumber(onHand) + '</strong> ' + esc(sample ? sample.unit || "" : "")) + '</td></tr>';
    }).join("");
    var movesTable = moveRows ? '<div class="table-wrap"><table class="forecast-monthly-table"><thead>' + moveHead + '</thead><tbody>' + moveRows + '</tbody></table></div>' : empty("لا حركة مواد بعد", "الوارد والمسحوب يسجلان تلقائيًا مع الاستلام والإنتاج الفعلي.");
    var movesCard = card("حركة المواد شهرًا بشهر", "الوارد من الاستلام والمسحوب من الإنتاج الفعلي — لا تظهر هذه البطاقة للمبيعات", movesTable);
    return pageHead("المتابعة الشهرية", "مباع مقابل مخطط + حركة المواد", "جدول شهري واحد يجمع تحقق Forecast وحركة المواد الفعلية.", "") + boundary() + renderAccuracyCard() + productsCard + movesCard + renderDailySalesCard();
  }

  function renderFgSummaryCard() {
    // ملخص لكل منتج: المؤكد − المباع = الصافي المتاح للبيع.
    var codes = [];
    state.fgReceipts.forEach(function (item) { var code = normalizeCode(item.productCode); if (codes.indexOf(code) === -1) codes.push(code); });
    var body = codes.map(function (code) {
      var receipts = state.fgReceipts.filter(function (item) { return normalizeCode(item.productCode) === code; });
      var sample = receipts[0];
      var confirmedAvailable = receipts.reduce(function (sum, item) { return sum + fgAvailable(item); }, 0);
      var sold = productSoldQty(code);
      var net = productNetAvailable(code);
      return '<div class="list-item"><div><h3><span class="code-chip">' + esc(code) + '</span> ' + esc(sample.product) + '</h3><p>الصافي المتاح للبيع: <strong class="number">' + formatNumber(net) + '</strong></p><div class="list-meta"><span>المؤكد المتاح: <span class="number">' + formatNumber(confirmedAvailable) + '</span></span><span>المباع: <span class="number">' + formatNumber(sold) + '</span></span><span>Reserved: <span class="number">' + formatNumber(receipts.reduce(function (s, i) { return s + Number(i.reserved || 0); }, 0)) + '</span></span><span>Blocked: <span class="number">' + formatNumber(receipts.reduce(function (s, i) { return s + Number(i.blocked || 0); }, 0)) + '</span></span></div></div><div class="list-actions">' + statusByValue("confirmed") + '</div></div>';
    }).join("");
    return card("المتاح للبيع", "الصافي = المؤكد من المخزن − المباع؛ لا تظهر أي معلومات عن المواد الأولية", body ? '<div class="list">' + body + '</div>' : empty("لا يوجد منتج متاح بعد", "يظهر هنا فور تأكيد مخزن المنتج النهائي استلام الدفعة."));
  }

  function renderSalesLogCard(withAction) {
    var rows = state.salesRecords.map(function (item) {
      return '<tr><td><time class="need-date">' + esc(item.date) + '</time></td><td><strong class="code-chip">' + esc(item.productCode) + '</strong><br><small>' + esc(item.product) + '</small></td><td><strong class="number">' + formatNumber(item.qty) + '</strong> ' + esc(item.unit || "") + '</td><td>' + esc(item.note || "—") + '</td><td>' + stepDate("التسجيل", item.recordedAt) + '</td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>تاريخ البيع</th><th>المنتج</th><th>الكمية</th><th>ملاحظة</th><th>وقت التسجيل</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا مبيعات مسجلة بعد", "كل عملية بيع تسجل هنا وتخصم من الصافي المتاح.");
    return card("سجل المبيعات", "كل بيع يُخصم من الصافي المتاح للبيع فورًا", content, withAction ? '<button class="btn btn-primary btn-sm" type="button" data-action="new-sale">تسجيل مبيعات</button>' : "");
  }

  function renderFgView() {
    var canSell = state.role === "sales";
    return pageHead("Available for Sales", "المنتج النهائي المؤكد والمباع", "المبيعات ترى وتبيع الصافي المتاح فقط: المؤكد − المباع.", canSell ? '<button class="btn btn-primary" type="button" data-action="new-sale">تسجيل مبيعات</button>' : "") + boundary() + renderFgSummaryCard() + (canSell ? renderDailySalesCard() : "") + renderSalesLogCard(canSell);
  }

  function renderFgStockCard(withActions) {
    var rows = state.fgReceipts.map(function (item) {
      // شهر الدفعة وحالتها عمودان مستقلان: بلا هذا لا يوجد في الجدول أي بُعد قابل للفلترة غير المنتج.
      var linkedActual = state.actuals.find(function (record) { return record.id === item.actualId; });
      var batchMonth = linkedActual && linkedActual.month ? linkedActual.month : monthKeyOf(item.confirmedAt);
      var variance = Number(item.received || 0) - Number(item.produced || 0);
      var available = fgAvailable(item);
      var batchState = variance !== 0 ? status("فرق كميات", "red")
        : available <= 0 ? status("مستنفد", "gray")
        : Number(item.blocked || 0) > 0 ? status("محظور جزئيًا", "amber")
        : Number(item.reserved || 0) > 0 ? status("محجوز جزئيًا", "amber")
        : status("متاح", "green");
      return '<tr><td><strong class="code-chip">' + esc(item.productCode) + '</strong><br>' + esc(item.product) + '<br><small>' + esc(item.id) + '</small></td><td>' + (batchMonth ? '<strong>' + esc(monthLabel(batchMonth)) + '</strong>' : '<span class="read-only">—</span>') + '</td><td><span class="number">' + formatNumber(item.produced) + '</span></td><td><span class="number">' + formatNumber(item.received) + '</span></td><td><span class="number">' + formatNumber(variance) + '</span></td><td><span class="number">' + formatNumber(item.reserved) + '</span></td><td><span class="number">' + formatNumber(item.blocked) + '</span></td><td><strong class="number">' + formatNumber(available) + '</strong></td><td>' + batchState + '</td><td>' + stepDate("الاستلام", item.confirmedAt) + '</td><td>' + (withActions ? '<button class="btn btn-secondary btn-sm" type="button" data-action="confirm-fg" data-id="' + esc(item.id) + '">تأكيد جديد</button>' : status("قراءة", "gray")) + '</td></tr>';
    }).join("");
    var content = rows ? '<div class="table-wrap"><table><thead><tr><th>المنتج</th><th>الشهر</th><th>Produced</th><th>Received</th><th>Variance</th><th>Reserved</th><th>Blocked</th><th>Available</th><th>الحالة</th><th>تواريخ الخطوة</th><th>الإجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty("لا توجد دفعات مستلمة", "تظهر هنا بعد أن يسجل الإنتاج الكمية الفعلية ويؤكد المخزن الاستلام.");
    return card("Finished Goods Stock", "Available = Released Received − Reserved − Blocked", content);
  }

  function renderFgReceipts() {
    return pageHead("FG Receipt", "تأكيد استلام المنتج النهائي", "قارن Production Actual بما وصل فعليًا، وسجّل أي فرق تلقائيًا كقضية.", '<button class="btn btn-primary" type="button" data-action="confirm-fg">تأكيد استلام</button>') + boundary() + renderFgStockCard(true);
  }

  function renderFgStock() {
    var editable = state.role === "fgWarehouse";
    return pageHead("Finished Goods", "مخزون المنتج النهائي", "مخزن المنتج النهائي هو مالك الرصيد التجاري المؤكد، وكل بيع مسجل يظهر هنا.", "") + boundary() + renderFgStockCard(editable) + renderSalesLogCard(false);
  }

  function renderFinanceCard() {
    // المالية: مراجعة Forecast وموافقة أوامر الشراء.
    var poRows = state.commitments.map(function (item) {
      var material = state.materials.find(function (m) { return m.id === item.materialId; });
      var orderUnitNote = item.orderQty != null && Number(item.conversionFactor) > 1
        ? '<br><small class="read-only">أُمر بـ ' + formatNumber(item.orderQty) + ' ' + esc(item.purchaseUnit || "وحدة شراء") + '</small>'
        : "";
      return '<tr><td><strong>' + esc(item.id) + '</strong>' + (material ? '<br><small><span class="code-chip">' + esc(material.materialCode) + '</span> ' + esc(material.material) + '</small>' : "") + '</td><td>' + esc(item.supplier) + '</td><td><strong>' + esc(item.po) + '</strong></td><td><span class="number">' + formatNumber(item.qty) + '</span> ' + esc(material ? material.unit || "" : "") + orderUnitNote + '</td><td>' + esc(item.orderDate || "—") + '</td><td>' + esc(item.eta || "—") + '</td><td>' + esc(item.amount || "—") + '</td><td>' + statusByValue(item.status) + '</td></tr>';
    }).join("");
    var poTable = poRows ? '<div class="table-wrap commitments-table"><table><thead><tr><th>الأوردر والمادة</th><th>المورد</th><th>PO</th><th>الكمية</th><th>تاريخ الأوردر</th><th>ETA</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>' + poRows + '</tbody></table></div>' : empty("لا توجد مشتريات بعد", "تظهر أوامر الشراء هنا فور إنشائها للمراقبة.");
    var receiptRows = state.rawReceipts.map(function (item) {
      return '<tr><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br>' + esc(item.material) + '</td><td><span class="number">' + formatNumber(item.qty) + '</span></td><td><span class="number">' + formatNumber(item.received) + '</span></td><td>' + statusByValue(item.status) + '</td><td>' + esc(displayTimestamp(item.receivedAt) || "—") + '</td></tr>';
    }).join("");
    var receiptTable = receiptRows ? '<div class="table-wrap"><table><thead><tr><th>المادة</th><th>المتوقع</th><th>المستلَم</th><th>الحالة</th><th>تاريخ الاستلام</th></tr></thead><tbody>' + receiptRows + '</tbody></table></div>' : empty("لا يوجد وارد", "تظهر حركات الاستلام هنا للمراقبة.");
    var pendingApprovals = state.commitments.filter(function (item) { return item.financeApproval && item.financeApproval.status !== "approved" && item.status !== "cancelled" && item.status !== "received"; });
    var approvalRows = pendingApprovals.map(function (item) {
      var material = state.materials.find(function (m) { return m.id === item.materialId; });
      return '<div class="list-item"><div><h3>' + esc(item.id + " · " + item.po) + ' — ' + esc(item.supplier) + '</h3><p>' + (material ? '<span class="code-chip">' + esc(material.materialCode) + '</span> ' + esc(material.material) + ' · ' : "") + 'الكمية <span class="number">' + formatNumber(item.qty) + '</span> · القيمة ' + esc(item.amount || "—") + ' · ETA ' + esc(item.eta || "—") + '</p><div class="list-meta">' + quotationLink(item) + (item.financeApproval.status === "rejected" ? status("مرفوض سابقًا", "red") : status("بانتظار موافقتك", "amber")) + '</div></div><div class="list-actions">' + (item.quotation && item.quotation.dataUrl ? '<button class="btn btn-primary btn-sm" type="button" data-action="finance-po-decision" data-id="' + esc(item.id) + '" data-decision="approved">موافقة</button>' : '<button class="btn btn-secondary btn-sm" type="button" disabled>الموافقة تتطلب كوتيشن</button>') + '<button class="btn btn-danger btn-sm" type="button" data-action="finance-po-decision" data-id="' + esc(item.id) + '" data-decision="rejected">رفض</button></div></div>';
    }).join("");
    var approvalCard = card("موافقة المالية على أوامر الشراء", "قرار الشراء لا يعبر للتوريد قبل موافقتك — راجع الكوتيشن المرفق", approvalRows ? '<div class="list">' + approvalRows + '</div>' : empty("لا أوامر بانتظار موافقتك", "يصل كل أمر شراء جديد هنا مع كوتيشنه قبل أن يبدأ توريده."));
    return approvalCard + card("مراقبة المشتريات", "بقية الشاشات مراقبة قراءة فقط", poTable)
      + card("مراقبة الوارد إلى المخازن", "قراءة فقط", receiptTable)
      + renderStrategicCard(false)
      + renderRmStockCard(false)
      + renderFgStockCard(false);
  }

  function renderFinance() {
    return pageHead("المراقبة المالية", "موافقة أوامر الشراء + اطلاع كامل", "قرار الشراء لا يعبر قبل موافقة المالية (مع الكوتيشن المرفق)؛ وبقية الشاشات مراقبة قراءة فقط.", "") + boundary() + renderFinanceCard();
  }

  function issueVisibleToRole(issue) {
    if (state.role === "sales") return issue.visibility === "commercial";
    return true;
  }

  // تنقيح موحّد لنص القضايا أمام المبيعات: كان يُطبَّق في البطاقة ويُهمل في نافذة التفاصيل،
  // فتظهر «نقص مادة السكر 4 طن» كاملة عند الضغط على «فتح».
  function redactForSales(text) {
    if (state.role !== "sales") return String(text == null ? "" : text);
    return String(text == null ? "" : text).replace(/مادة[^؛.]*/g, "عامل تشغيلي").replace(/المواد الأولية/g, "عوامل تشغيلية");
  }

  function issueActionButtons(item) {
    if (item.status === "closed") {
      return (state.role === "executive" || state.role === "admin")
        ? '<button class="btn btn-secondary btn-sm" type="button" data-action="reopen-issue" data-id="' + esc(item.id) + '">إعادة فتح</button>'
        : "";
    }
    var buttons = "";
    if (canResolveIssue(item) && !canVerifyIssue(item)) {
      buttons += '<button class="btn btn-primary btn-sm" type="button" data-action="close-issue" data-id="' + esc(item.id) + '">' + (item.status === "resolved" ? "تعديل الحل" : "تسجيل الحل") + '</button>';
    }
    if (canVerifyIssue(item)) {
      buttons += '<button class="btn btn-primary btn-sm" type="button" data-action="close-issue" data-id="' + esc(item.id) + '">تحقق وإغلاق</button>';
    }
    return buttons;
  }

  function renderIssueCard(items, withActions) {
    var body = items.filter(issueVisibleToRole).map(function (item) {
      var tone = item.status === "closed" ? "green" : item.severity === "critical" ? "red" : "";
      return '<article class="issue"><i class="issue-bar ' + tone + '" aria-hidden="true"></i><div><h3>' + esc(item.title) + '</h3><p>' + esc(redactForSales(item.impact)) + '</p><div class="issue-meta"><span>القسم: ' + esc(item.department || "—") + '</span><span>المُبلِّغ: ' + esc(item.raisedBy || "—") + '</span><span>المالك: ' + esc(item.owner) + '</span><span>الموعد: ' + esc(item.due) + '</span><span>' + statusByValue(item.status) + '</span>' + stepDate("فتح القضية", item.createdAt) + (item.closedAt ? stepDate("إغلاق القضية", item.closedAt) : "") + '</div>' + (item.resolution ? '<div class="issue-resolution' + (item.status === "closed" ? "" : " pending") + '"><strong>' + (item.status === "closed" ? "انحلّت" : "انحلّت — بانتظار التحقق") + '</strong><span><b>السبب:</b> ' + esc(redactForSales(item.rootCause)) + '</span><span><b>الحل:</b> ' + esc(redactForSales(item.resolution)) + '</span>' + (item.prevention ? '<span><b>المنع:</b> ' + esc(redactForSales(item.prevention)) + '</span>' : "") + '</div>' : "") + '</div><div class="list-actions"><button class="btn btn-secondary btn-sm" type="button" data-action="view-issue" data-id="' + esc(item.id) + '">فتح</button>' + (withActions ? issueActionButtons(item) : "") + '</div></article>';
    }).join("");
    return card("القضايا", "لكل قضية: القسم والمُبلِّغ والمالك والتاريخ — وعند الإغلاق السبب والحل", body ? '<div class="issue-list">' + body + '</div>' : empty("لا توجد قضايا مرئية", "لا توجد مشكلات ضمن نطاق هذا الدور."));
  }

  function renderIssues() {
    var actions = '<button class="btn btn-primary" type="button" data-action="new-issue">تسجيل مشكلة</button>';
    return pageHead("Issues & Actions", "المشكلات والإجراءات", "يمكن لأي قسم التسجيل؛ الإدارة العليا أو مسؤول النظام يتحقق ويغلق.", actions) + boundary() + renderIssueCard(state.issues, true);
  }

  function renderAudit() {
    var body = state.audit.map(function (item) {
      return '<div class="audit-item"><time>' + esc(item.time) + '</time><b>' + esc(item.actor) + '</b><span>' + esc(item.text) + '</span></div>';
    }).join("");
    return pageHead("Audit Trail", "سجل الأحداث", "من فعل ماذا ومتى؛ لا يمكن تعديل هذا السجل من الواجهة التجريبية.", "") + boundary() + card("آخر الأحداث", "", body ? '<div class="audit-list">' + body + '</div>' : empty("لا توجد أحداث بعد", "يبدأ السجل تلقائيًا عند أول إجراء في النظام."));
  }

  function latestTimestamp(items, fields) {
    var values = [];
    (items || []).forEach(function (item) {
      (fields || []).forEach(function (field) { if (item && item[field]) values.push(String(item[field])); });
    });
    values.sort();
    return values.length ? values[values.length - 1] : "";
  }

  function roadmapMilestone(key, label, owner, milestoneStatus, date, detail) {
    return { key: key, label: label, owner: owner, status: milestoneStatus, date: date || "", detail: detail || "" };
  }

  function issueMatchesOrder(issue, references) {
    var source = String(issue.source || "");
    return references.some(function (reference) { return reference && source.indexOf(reference) !== -1; });
  }

  function executiveOrderRecords() {
    var records = [];
    state.forecasts.forEach(function (forecast) {
      if (forecast.status === "cancelled") return;
      forecast.items.forEach(function (line) {
        var requirements = forecastRequirements(forecast.id, line.productCode);
        var requirementIds = requirements.map(function (item) { return item.id; });
        var commitments = state.commitments.filter(function (item) { return requirementIds.indexOf(item.materialId) !== -1 && item.status !== "cancelled"; });
        var commitmentIds = commitments.map(function (item) { return item.id; });
        var rawReceipts = state.rawReceipts.filter(function (item) { return commitmentIds.indexOf(item.commitmentId) !== -1; });
        var actuals = state.actuals.filter(function (item) { return item.forecastId === forecast.id && normalizeCode(item.productCode) === normalizeCode(line.productCode); });
        var actualIds = actuals.map(function (item) { return item.id; });
        var fgReceipts = state.fgReceipts.filter(function (item) { return actualIds.indexOf(item.actualId) !== -1; });
        var references = [forecast.id].concat(requirementIds, commitmentIds, rawReceipts.map(function (item) { return item.id; }), actualIds, fgReceipts.map(function (item) { return item.id; }));
        var issues = state.issues.filter(function (item) { return item.status === "open" && issueMatchesOrder(item, references); });
        var isFixed = forecast.status === "fixed";
        var stockConfirmed = requirements.length > 0 && requirements.every(function (item) { return item.stockConfirmed; });

        var purchaseNeeded = requirements.some(function (item) { return item.stockConfirmed && materialAllocatedAvailable(item) < effectiveRequired(item); });
        var purchaseCreated = commitments.length > 0;
        var allInTransit = purchaseCreated && commitments.every(function (item) { return item.status === "in_transit" || item.status === "received"; });
        var allRawReceived = purchaseCreated && commitments.every(function (commitment) {
          return rawReceipts.some(function (receipt) { return receipt.commitmentId === commitment.id && receipt.status === "received"; });
        });
        var noPurchaseRequired = requirements.length > 0 && stockConfirmed && !purchaseNeeded;
        var lineTotal = Number(line.qty || 0);
        var producedTotal = actuals.reduce(function (sum, item) { return sum + Number(item.actual || 0); }, 0);
        var productionComplete = actuals.length > 0 && producedTotal >= lineTotal;
        var milestones = [];
        milestones.push(roadmapMilestone("forecast", "Forecast السنة شهرًا بشهر", "المبيعات", "done", forecast.submittedAt, formatNumber(lineTotal) + " " + (line.unit || "وحدة") + " · " + forecastPeriod(forecast)));
        milestones.push(roadmapMilestone("readiness_materials", "الاحتياجات المبدئية (فحص الجاهزية)", "الإنتاج", isFixed || requirements.length ? "done" : "active", latestTimestamp(requirements, ["createdAt"]), requirements.length ? requirements.length + " مادة محسوبة" : "قبل رد الإنتاج على المبيعات"));
        milestones.push(roadmapMilestone("readiness_stock", "رفع رصيد المخزن", "مخزن المواد الأولية", !requirements.length ? "pending" : stockConfirmed ? "done" : "active", latestTimestamp(requirements, ["stockConfirmedAt"]), stockConfirmed ? "تم رفع رصيد " + requirements.length + " مادة" : "بانتظار رفع الرصيد ليحسب التطبيق النقص"));
        milestones.push(roadmapMilestone("readiness_supply", "تأكيد إمكانية التوريد", "المشتريات", isFixed || (forecast.supplyFeasibility && forecast.supplyFeasibility.confirmed) ? "done" : forecast.supplyFeasibility && forecast.supplyFeasibility.confirmed === false ? "blocked" : !stockConfirmed ? "pending" : "active", forecast.supplyFeasibility ? forecast.supplyFeasibility.at : "", forecast.supplyFeasibility ? (forecast.supplyFeasibility.confirmed ? "المشتريات تؤكد التغطية في المواعيد" : "تعذر التوريد — يلزم رد معدل للمبيعات") : "قرار المشتريات قبل التثبيت"));
        milestones.push(roadmapMilestone("negotiation", "رد الإنتاج والتثبيت", "الإنتاج والمبيعات", isFixed ? "done" : "active", forecast.fixedAt, isFixed ? "المستند مثبت " + (forecast.version || "") : forecast.status === "production_feedback" ? "تعديلات الإنتاج بانتظار رد المبيعات" : forecast.readinessStale ? "أعيد فتح فحص الجاهزية بعد تعديل الكميات" : "بانتظار اكتمال الجاهزية ثم رد الإنتاج"));
        var weeklyMonths = forecast.months.filter(function (month) { return Number(line.monthlyQty[month] || 0) > 0; });
        var weeklyApproved = weeklyMonths.filter(function (month) {
          var weeklyPlanRecord = weeklyPlanFor(forecast.id, line.productCode, month);
          return weeklyPlanRecord && weeklyPlanRecord.status === "approved";
        }).length;
        milestones.push(roadmapMilestone("weekly", "الخطة الأسبوعية واعتمادها", "الإنتاج والمبيعات ومخزن FG", !isFixed ? "pending" : weeklyMonths.length && weeklyApproved === weeklyMonths.length ? "done" : "active", latestTimestamp(state.weeklyPlans.filter(function (item) { return item.forecastId === forecast.id && normalizeCode(item.productCode) === normalizeCode(line.productCode); }), ["approvedAt", "salesForwardedAt", "createdAt"]), weeklyMonths.length ? weeklyApproved + " من " + weeklyMonths.length + " أشهر معتمدة أسبوعيًا" : "لا شهور بكميات"));
        milestones.push(roadmapMilestone("purchase", "طلب الشراء — قرار المشتريات النهائي", "المشتريات", !isFixed || !stockConfirmed ? "pending" : noPurchaseRequired ? "done" : purchaseCreated ? "done" : "active", latestTimestamp(commitments, ["createdAt"]), noPurchaseRequired ? "الرصيد يغطي الاحتياج؛ لا شراء" : purchaseCreated ? commitments.length + " أمر شراء" : "النقص وصل المشتريات مباشرة — بانتظار أمر الشراء"));
        milestones.push(roadmapMilestone("transit", "تأكيد الأوردر وبدء التوريد", "المشتريات", noPurchaseRequired ? "done" : !purchaseCreated ? "pending" : allInTransit ? "done" : "active", latestTimestamp(commitments, ["inTransitAt", "poConfirmedAt"]), noPurchaseRequired ? "غير مطلوب" : allInTransit ? "بدأ توريد جميع الأوامر" : "نقرة واحدة تؤكد الأوردر وتبدأ التوريد"));
        milestones.push(roadmapMilestone("raw_receipt", "استلام المواد حسب الوصول", "مخزن المواد الأولية", noPurchaseRequired ? "done" : !allInTransit ? "pending" : allRawReceived ? "done" : "active", latestTimestamp(rawReceipts, ["receivedAt", "expectedAt"]), noPurchaseRequired ? "من الرصيد المتاح" : allRawReceived ? "تم الاستلام وإضافته مباشرة إلى الرصيد" : "بانتظار الاستلام الفعلي"));
        milestones.push(roadmapMilestone("production", "الإنتاج الفعلي شهرًا بشهر", "الإنتاج", productionComplete ? "done" : actuals.length || productMaterialsReady(forecast.id, line.productCode) ? "active" : "pending", latestTimestamp(actuals, ["recordedAt", "date"]), productionComplete ? formatNumber(producedTotal) + " منتج فعلي مكتمل" : actuals.length ? "أُنتج " + formatNumber(producedTotal) + " من " + formatNumber(lineTotal) : "بانتظار جاهزية المواد والتنفيذ"));
        milestones.push(roadmapMilestone("fg_receipt", "استلام المنتج والمتاح للبيع", "مخزن المنتج النهائي / المبيعات", !actuals.length ? "pending" : fgReceipts.length ? "done" : "active", latestTimestamp(fgReceipts, ["confirmedAt"]), fgReceipts.length ? "Available for Sales: " + formatNumber(fgReceipts.reduce(function (sum, item) { return sum + fgAvailable(item); }, 0)) : "بانتظار تأكيد المخزن"));
        var completedCount = milestones.filter(function (item) { return item.status === "done"; }).length;
        var current = milestones.find(function (item) { return item.status !== "done"; });
        var progress = Math.round(completedCount / milestones.length * 100);
        var riskReasons = milestones.filter(function (item) { return item.status === "blocked"; }).map(function (item) { return item.label + ": " + item.detail; });
        issues.forEach(function (issue) { riskReasons.push(issue.title); });
        var lastMonth = Array.isArray(forecast.months) && forecast.months.length ? forecast.months[forecast.months.length - 1] : "";
        var overdue = lastMonth && lastMonth < monthKeyOf(dateDaysFromNow(0)) && progress < 100;
        if (overdue) riskReasons.push("تجاوزت الطلبية آخر شهر في Forecast");
        var health = progress === 100 ? "completed" : riskReasons.length && milestones.some(function (item) { return item.status === "blocked"; }) ? "blocked" : riskReasons.length || overdue ? "attention" : "on_track";
        records.push({
          id: forecast.id + "::" + line.productCode,
          displayId: forecast.id + " / " + line.productCode,
          forecast: forecast,
          line: line,
          requirements: requirements,
          commitments: commitments,
          rawReceipts: rawReceipts,
          actuals: actuals,
          fgReceipts: fgReceipts,
          issues: issues,
          milestones: milestones,
          progress: progress,
          currentStageKey: current ? current.key : milestones[milestones.length - 1].key,
          currentStageLabel: current ? current.label : "مكتملة ومتاحة للبيع",
          currentOwner: current ? current.owner : "المبيعات",
          health: health,
          riskReasons: riskReasons,
          forecastQty: lineTotal,
          planQty: lineTotal,
          actualQty: producedTotal,
          availableQty: fgReceipts.reduce(function (sum, item) { return sum + fgAvailable(item); }, 0)
        });
      });
    });
    return records;
  }

  function executiveHealthInfo(value) {
    var map = { completed: ["مكتملة", "green"], on_track: ["على المسار", "blue"], attention: ["تحتاج انتباهًا", "amber"], blocked: ["متوقفة", "red"] };
    return map[value] || [value, "gray"];
  }

  function executiveHealthBadge(value) {
    var info = executiveHealthInfo(value);
    return status(info[0], info[1]);
  }

  function filteredExecutiveOrders(records, ignoreKey) {
    var query = String(executiveFilters.query || "").trim().toLowerCase();
    var filtered = records.filter(function (item) {
      if (ignoreKey !== "health" && executiveFilters.health !== "all" && item.health !== executiveFilters.health) return false;
      if (ignoreKey !== "stage" && executiveFilters.stage !== "all" && item.currentStageKey !== executiveFilters.stage) return false;
      if (executiveFilters.product !== "all" && item.line.productCode !== executiveFilters.product) return false;
      if (executiveFilters.from && item.forecast.endDate < executiveFilters.from) return false;
      if (executiveFilters.to && item.forecast.startDate > executiveFilters.to) return false;
      if (query && (item.displayId + " " + item.line.productName + " " + item.currentStageLabel).toLowerCase().indexOf(query) === -1) return false;
      return true;
    });
    var healthOrder = { blocked: 0, attention: 1, on_track: 2, completed: 3 };
    filtered.sort(function (a, b) {
      if (executiveFilters.sort === "progress") return a.progress - b.progress;
      if (executiveFilters.sort === "newest") return String(b.forecast.submittedAt || b.forecast.startDate).localeCompare(String(a.forecast.submittedAt || a.forecast.startDate));
      return healthOrder[a.health] - healthOrder[b.health] || a.progress - b.progress;
    });
    return filtered;
  }

  // ===== مخططات الداشبورد التفاعلية (SVG ذاتي بلا مكتبات) =====
  // ألوان مدققة بفاحص تباين وعمى الألوان: سلاسل الخط والفئات بترتيب ثابت لا يتغير مع الفلترة.
  var EXEC_STAGE_COLORS = ["#2563eb", "#d97706", "#0d9488", "#a855f7", "#db2777", "#65a30d"];
  var EXEC_HEALTH_COLORS = { completed: "#16a34a", on_track: "#2563eb", attention: "#d97706", blocked: "#dc2626" };
  var EXEC_SERIES = [
    { key: "planned", label: "المخطط المثبت", color: "#2563eb" },
    { key: "produced", label: "المنتَج فعليًا", color: "#0d9488" },
    { key: "sold", label: "المباع", color: "#d97706" }
  ];
  var executiveHiddenSeries = {};

  function donutSegmentPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
    var rad = function (deg) { return (deg - 90) * Math.PI / 180; };
    var large = endDeg - startDeg > 180 ? 1 : 0;
    var x1 = cx + rOuter * Math.cos(rad(startDeg)), y1 = cy + rOuter * Math.sin(rad(startDeg));
    var x2 = cx + rOuter * Math.cos(rad(endDeg)), y2 = cy + rOuter * Math.sin(rad(endDeg));
    var x3 = cx + rInner * Math.cos(rad(endDeg)), y3 = cy + rInner * Math.sin(rad(endDeg));
    var x4 = cx + rInner * Math.cos(rad(startDeg)), y4 = cy + rInner * Math.sin(rad(startDeg));
    return "M" + x1.toFixed(2) + " " + y1.toFixed(2)
      + " A" + rOuter + " " + rOuter + " 0 " + large + " 1 " + x2.toFixed(2) + " " + y2.toFixed(2)
      + " L" + x3.toFixed(2) + " " + y3.toFixed(2)
      + " A" + rInner + " " + rInner + " 0 " + large + " 0 " + x4.toFixed(2) + " " + y4.toFixed(2) + " Z";
  }

  // دونات تفاعلي: النقر على شريحة أو وسيلتها يفلتر الداشبورد، والنقر مجددًا يلغي الفلتر.
  function renderDonutPanel(title, subtitle, data, filterKey, activeValue, centerLabel) {
    var total = data.reduce(function (sum, item) { return sum + item.value; }, 0);
    var svg;
    if (!total) {
      svg = '<div class="chart-empty">لا بيانات ضمن الفلتر الحالي.</div>';
    } else {
      var angle = 0;
      var segments = data.filter(function (item) { return item.value > 0; }).map(function (item) {
        var sweep = item.value / total * 360;
        // شريحة كاملة (منتج واحد/حالة واحدة): نقص جزءًا من الدرجة حتى لا تنهار نقطتا البداية والنهاية على بعضهما.
        var endDeg = sweep >= 359.6 ? angle + 359.6 : angle + sweep;
        var isActive = activeValue === item.key;
        var pct = Math.round(item.value / total * 100);
        var path = '<path class="donut-seg' + (isActive ? " active" : "") + '" d="' + donutSegmentPath(110, 110, 92, 56, angle, endDeg) + '" fill="' + item.color + '" data-action="executive-chart" data-filter="' + esc(filterKey) + '" data-value="' + esc(item.key) + '" data-tip="' + esc(item.label + ": " + formatNumber(item.value) + " (" + pct + "٪)") + '" role="button" tabindex="0" aria-label="' + esc(item.label + ": " + formatNumber(item.value) + " — " + pct + "٪. اضغط للفلترة") + '"><title>' + esc(item.label + ": " + formatNumber(item.value) + " (" + pct + "٪)") + '</title></path>';
        angle += sweep;
        return path;
      }).join("");
      svg = '<div class="donut-wrap" dir="ltr"><svg class="exec-pie" viewBox="0 0 220 220" role="img" aria-label="' + esc(title) + '">' + segments + '<text x="110" y="104" text-anchor="middle" class="donut-center-value">' + formatNumber(total) + '</text><text x="110" y="126" text-anchor="middle" class="donut-center-label">' + esc(centerLabel) + '</text></svg></div>';
    }
    var legend = '<div class="chart-legend">' + data.map(function (item) {
      var pct = total ? Math.round(item.value / total * 100) : 0;
      return '<button type="button" class="legend-chip' + (activeValue === item.key ? " active" : "") + '" data-action="executive-chart" data-filter="' + esc(filterKey) + '" data-value="' + esc(item.key) + '"><i class="legend-swatch" style="background:' + item.color + '"></i><span>' + esc(item.label) + '</span><b>' + formatNumber(item.value) + (total ? " · " + pct + "٪" : "") + '</b></button>';
    }).join("") + '</div>';
    return '<article class="dashboard-panel chart-panel"><div class="dashboard-panel-head"><div><span class="eyebrow">' + esc(subtitle) + '</span><h2>' + esc(title) + '</h2></div><strong>' + formatNumber(total) + '</strong></div>' + svg + legend + '<p class="chart-hint">اضغط شريحة أو وسيلتها لفلترة كامل الداشبورد؛ الضغط مجددًا يلغي الفلتر.</p></article>';
  }

  // المخطط الخطي الشهري: المخطط المثبت مقابل المنتَج والمباع — يتبع الفلاتر ويسمح بإخفاء السلاسل.
  function renderExecutiveLineChart(filtered) {
    var months = [];
    filtered.forEach(function (order) { order.forecast.months.forEach(function (month) { if (months.indexOf(month) === -1) months.push(month); }); });
    months.sort();
    var productCodes = [];
    filtered.forEach(function (order) { if (productCodes.indexOf(order.line.productCode) === -1) productCodes.push(order.line.productCode); });
    var seriesValues = {
      planned: months.map(function (month) { return filtered.reduce(function (sum, order) { return sum + Number(order.line.monthlyQty[month] || 0); }, 0); }),
      produced: months.map(function (month) { return filtered.reduce(function (sum, order) { return sum + producedQty(order.forecast.id, order.line.productCode, month); }, 0); }),
      sold: months.map(function (month) { return productCodes.reduce(function (sum, code) { return sum + soldInMonth(code, month); }, 0); })
    };
    var legend = '<div class="chart-legend">' + EXEC_SERIES.map(function (series) {
      var hidden = executiveHiddenSeries[series.key];
      var seriesTotal = seriesValues[series.key].reduce(function (sum, value) { return sum + value; }, 0);
      return '<button type="button" class="legend-chip' + (hidden ? " muted" : "") + '" data-action="toggle-series" data-series="' + series.key + '" aria-pressed="' + (!hidden) + '"><i class="legend-swatch" style="background:' + series.color + '"></i><span>' + esc(series.label) + '</span><b>' + formatNumber(seriesTotal) + '</b></button>';
    }).join("") + '</div>';
    if (!months.length) {
      return '<article class="dashboard-panel chart-panel"><div class="dashboard-panel-head"><div><span class="eyebrow">Trend</span><h2>المسار الشهري: مخطط × منتَج × مباع</h2></div></div><div class="chart-empty">لا أشهر مثبتة ضمن الفلتر الحالي.</div>' + legend + '</article>';
    }
    var width = 760, height = 300, padLeft = 56, padRight = 20, padTop = 18, padBottom = 44;
    var plotW = width - padLeft - padRight, plotH = height - padTop - padBottom;
    var maxValue = 0;
    EXEC_SERIES.forEach(function (series) {
      if (executiveHiddenSeries[series.key]) return;
      seriesValues[series.key].forEach(function (value) { if (value > maxValue) maxValue = value; });
    });
    if (maxValue <= 0) maxValue = 1;
    var niceMax = Math.ceil(maxValue / 4) * 4;
    var xOf = function (index) { return months.length === 1 ? padLeft + plotW / 2 : padLeft + plotW * index / (months.length - 1); };
    var yOf = function (value) { return padTop + plotH - plotH * value / niceMax; };
    var grid = [0, 1, 2, 3, 4].map(function (step) {
      var value = niceMax * step / 4;
      var y = yOf(value);
      return '<line class="chart-grid" x1="' + padLeft + '" y1="' + y.toFixed(1) + '" x2="' + (width - padRight) + '" y2="' + y.toFixed(1) + '"></line><text class="chart-axis" x="' + (padLeft - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + formatNumber(value) + '</text>';
    }).join("");
    var xLabels = months.map(function (month, index) {
      return '<text class="chart-axis" x="' + xOf(index).toFixed(1) + '" y="' + (height - padBottom + 20) + '" text-anchor="middle">' + esc(month.slice(5, 7) + "/" + month.slice(2, 4)) + '</text>';
    }).join("");
    var seriesMarkup = EXEC_SERIES.filter(function (series) { return !executiveHiddenSeries[series.key]; }).map(function (series) {
      var values = seriesValues[series.key];
      var points = values.map(function (value, index) { return xOf(index).toFixed(1) + "," + yOf(value).toFixed(1); }).join(" ");
      var dots = values.map(function (value, index) {
        return '<circle class="line-pt" cx="' + xOf(index).toFixed(1) + '" cy="' + yOf(value).toFixed(1) + '" r="4.5" fill="' + series.color + '" data-tip="' + esc(monthLabel(months[index]) + " — " + series.label + ": " + formatNumber(value)) + '"><title>' + esc(monthLabel(months[index]) + " — " + series.label + ": " + formatNumber(value)) + '</title></circle>';
      }).join("");
      return '<g class="line-series"><polyline class="line-path" points="' + points + '" fill="none" stroke="' + series.color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>' + dots + '</g>';
    }).join("");
    var svg = '<div class="line-wrap" dir="ltr"><svg class="exec-line" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="المسار الشهري: المخطط والمنتَج والمباع">' + grid + xLabels + seriesMarkup + '</svg></div>';
    return '<article class="dashboard-panel chart-panel chart-panel-wide"><div class="dashboard-panel-head"><div><span class="eyebrow">Trend</span><h2>المسار الشهري: مخطط × منتَج × مباع</h2><p>يتبع الفلاتر أعلاه؛ اضغط اسم سلسلة لإخفائها أو إظهارها، ومرّر على النقاط للتفاصيل.</p></div><strong>' + months.length + ' أشهر</strong></div>' + svg + legend + '</article>';
  }

  function renderExecutiveRoadmapStrip(order) {
    var current = order.milestones.find(function (item) { return item.key === order.currentStageKey; }) || order.milestones[order.milestones.length - 1];
    var stateLabels = { done: "مكتملة", active: "قيد التنفيذ", blocked: "متوقفة", pending: "قادمة" };
    var currentLabel = order.health === "completed" ? "اكتملت الطلبية" : current.status === "blocked" ? "المسار متوقف هنا" : "الطلبية الآن هنا";
    var banner = '<div class="roadmap-current-banner ' + esc(current.status) + '" role="status"><span class="roadmap-live-pulse" aria-hidden="true"></span><div><small>' + esc(currentLabel) + '</small><strong>' + esc(current.label) + '</strong><p>' + esc(current.owner + " · " + current.detail) + '</p></div><time>' + esc(displayTimestamp(current.date)) + '</time></div>';
    var nodes = order.milestones.map(function (item, index) {
      var isCurrent = item.key === order.currentStageKey;
      return '<button class="roadmap-node ' + esc(item.status) + (isCurrent ? ' is-current' : '') + '" type="button" role="listitem" data-action="open-order-roadmap" data-order-id="' + esc(order.id) + '"' + (isCurrent ? ' aria-current="step"' : '') + ' aria-label="' + esc((index + 1) + ". " + item.label + "، " + stateLabels[item.status] + "، " + item.owner) + '"><span class="roadmap-node-marker"><i aria-hidden="true">' + (item.status === "done" ? "✓" : item.status === "blocked" ? "!" : item.status === "active" ? "●" : (index + 1)) + '</i>' + (isCurrent ? '<em>أنت هنا</em>' : '') + '</span><b>' + esc(item.label) + '</b><small>' + esc(item.owner) + '</small><span class="roadmap-node-state">' + esc(stateLabels[item.status]) + '</span></button>';
    }).join("");
    return '<div class="order-roadmap">' + banner + '<div class="order-roadmap-legend" aria-label="دليل حالات المسار"><span class="done">✓ مكتملة</span><span class="active">● قيد التنفيذ</span><span class="blocked">! متوقفة</span><span class="pending">○ قادمة</span></div><div class="order-roadmap-strip" role="list" aria-label="Roadmap الطلبية؛ اضغط أي مرحلة لفتح التفاصيل">' + nodes + '</div></div>';
  }

  function renderExecutiveOrderCard(order) {
    var risk = order.riskReasons.length ? '<div class="order-risk"><strong>تنبيه:</strong> ' + esc(order.riskReasons[0]) + (order.riskReasons.length > 1 ? ' <span>+' + (order.riskReasons.length - 1) + '</span>' : '') + '</div>' : "";
    return '<article class="executive-order ' + esc(order.health) + '"><header><div><span class="eyebrow">' + esc(order.displayId) + '</span><h3>' + esc(order.line.productName) + '</h3><p>' + esc(frequencyLabel(order.forecast.frequency) + " · " + forecastPeriod(order.forecast)) + '</p></div><div class="order-head-status">' + executiveHealthBadge(order.health) + '<strong>' + esc(order.currentStageLabel) + '</strong><small>المسؤول الآن: ' + esc(order.currentOwner) + '</small></div></header><div class="order-metrics"><span><small>Forecast</small><strong>' + formatNumber(order.forecastQty) + ' <i class="metric-unit">' + esc(order.line.unit || "") + '</i></strong></span><span><small>الخطة</small><strong>' + formatNumber(order.planQty) + ' <i class="metric-unit">' + esc(order.line.unit || "") + '</i></strong></span><span><small>Actual</small><strong>' + formatNumber(order.actualQty) + ' <i class="metric-unit">' + esc(order.line.unit || "") + '</i></strong></span><span><small>Available</small><strong>' + formatNumber(order.availableQty) + ' <i class="metric-unit">' + esc(order.line.unit || "") + '</i></strong></span><span class="order-progress-metric"><small>نسبة الإنجاز</small><strong>' + order.progress + '٪</strong><i><b style="width:' + order.progress + '%"></b></i></span></div>' + renderExecutiveRoadmapStrip(order) + risk + '<footer><span>آخر حركة: ' + esc(displayTimestamp(latestTimestamp(order.milestones, ["date"]))) + '</span><button class="btn btn-primary btn-sm" type="button" data-action="open-order-roadmap" data-order-id="' + esc(order.id) + '">فتح التفاصيل والـRoadmap</button></footer></article>';
  }

  // ودجات الداشبورد: يحدد مسؤول النظام ظهورها لكل حساب، ولا يعتمد الأمر على تفضيل المتصفح المشترك.
  var EXEC_WIDGETS = [
    { key: "kpis", label: "مؤشرات KPI الأساسية" },
    { key: "orderKpis", label: "مؤشرات الطلبيات" },
    { key: "filters", label: "الفلاتر" },
    { key: "healthChart", label: "مخطط الحالة (دونات)" },
    { key: "stageChart", label: "مخطط المراحل (دونات)" },
    { key: "lineChart", label: "المخطط الخطي الشهري" },
    { key: "attention", label: "أهم الحالات للمتابعة" },
    { key: "strategic", label: "تنبيهات المخزون الاستراتيجي" },
    { key: "orders", label: "لوحة الطلبيات Roadmap" }
  ];
  // كل قسم يرى فقط أدوات المتابعة اللازمة لعمله اليومي في الصفحة الرئيسية.
  var HOME_DASHBOARD_WIDGETS = {
    sales: [{ key: "kpis", label: "ملخص Forecast والمبيعات" }, { key: "available", label: "المتاح للبيع" }, { key: "forecast", label: "متابعة مستندات Forecast" }],
    production: [{ key: "kpis", label: "ملخص القدرة والتنفيذ" }, { key: "materials", label: "لقطة احتياجات المواد" }],
    procurement: [{ key: "kpis", label: "ملخص النقص والتوريد" }, { key: "requirements", label: "الاحتياجات والنقص" }, { key: "commitments", label: "التزامات الشراء" }],
    rmWarehouse: [{ key: "kpis", label: "ملخص الرصيد والاستلام" }, { key: "stock", label: "رصيد المواد" }, { key: "waste", label: "التوالف" }],
    fgWarehouse: [{ key: "kpis", label: "ملخص المتاح والاستلام" }, { key: "stock", label: "رصيد المنتج النهائي" }],
    finance: [{ key: "kpis", label: "ملخص الرقابة المالية" }, { key: "finance", label: "قرارات وأوامر الشراء" }],
    admin: [{ key: "kpis", label: "ملخص التهيئة والوصول" }, { key: "boundaries", label: "حدود العمل المحمية" }]
  };
  var execPickerOpen = false;

  function dashboardWidgetsForUser(user) {
    return user && user.dashboardWidgets && typeof user.dashboardWidgets === "object" && !Array.isArray(user.dashboardWidgets) ? user.dashboardWidgets : {};
  }

  function dashboardWidgetVisibleForUser(user, key) {
    return dashboardWidgetsForUser(user)[key] !== false;
  }

  function homeDashboardWidgetsForUser(user) {
    return user && user.homeDashboardWidgets && typeof user.homeDashboardWidgets === "object" && !Array.isArray(user.homeDashboardWidgets) ? user.homeDashboardWidgets : {};
  }

  function homeWidgetVisible(key) {
    var user = (state.users || []).find(function (item) { return item.id === state.currentUserId; });
    return homeDashboardWidgetsForUser(user)[key] !== false;
  }

  function execWidgetVisible(key) {
    var user = (state.users || []).find(function (item) { return item.id === state.currentUserId; });
    return dashboardWidgetVisibleForUser(user, key);
  }

  function execWidgetPickerHtml() {
    return '<span class="read-only">محتوى الداشبورد يحدده مسؤول النظام لكل حساب من شاشة الصلاحيات.</span>';
  }

  function kpiFilterTile(title, value, copy, tone, healthKey) {
    var active = executiveFilters.health === healthKey;
    return '<button type="button" class="summary kpi-filter-tile ' + (tone || "") + (active ? " is-active" : "") + '" data-action="exec-kpi-health" data-health="' + esc(healthKey) + '" title="اضغط للفلترة"><div class="summary-top"><span>' + esc(title) + '</span><span class="summary-icon" aria-hidden="true">' + (active ? "✓" : "◎") + '</span></div><strong>' + esc(value) + '</strong><small>' + esc(copy) + '</small></button>';
  }

  function renderExecutiveCoreKpis() {
    var planned = 0;
    state.forecasts.filter(function (forecast) { return forecast.status === "fixed"; }).forEach(function (forecast) {
      (forecast.items || []).forEach(function (line) {
        Object.keys(line.monthlyQty || {}).forEach(function (monthKey) { planned += Number(line.monthlyQty[monthKey] || 0); });
      });
    });
    var produced = state.actuals.reduce(function (sum, item) { return sum + Number(item.actual || 0); }, 0);
    var sold = state.salesRecords.reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
    var execPct = planned ? Math.round((produced / planned) * 100) : 0;
    var netAvailable = state.products.reduce(function (sum, item) { return sum + productNetAvailable(item.code); }, 0);
    var openPos = state.commitments.filter(function (item) { return item.status !== "received" && item.status !== "cancelled"; }).length;
    var financePending = state.commitments.filter(function (item) { return item.financeApproval && item.financeApproval.status === "pending" && item.status !== "cancelled" && item.status !== "received"; }).length;
    var shortageReady = purchasableShortages().length;
    var strategicBelow = strategicAlerts().length;
    var openIssues = state.issues.filter(function (item) { return item.status === "open"; }).length;
    return '<section class="exec-core-kpis"><div class="executive-section-head"><div><span class="eyebrow">Core KPIs</span><h2>مؤشرات الأداء الأساسية</h2><p>صورة السنة كاملة عبر كل الأقسام — لا تتأثر بفلاتر الطلبيات.</p></div></div><div class="executive-kpi-grid">'
      + summary("المخطط المثبت", formatNumber(planned), "إجمالي كميات السنة المثبتة", "blue", "P")
      + summary("المنتَج الفعلي", formatNumber(produced), "نسبة التنفيذ " + execPct + "٪", execPct >= 80 ? "" : "amber", "F")
      + summary("المباع", formatNumber(sold), "يُخصم من الصافي فورًا", "", "S")
      + summary("الصافي المتاح للبيع", formatNumber(netAvailable), "بعد الحجز والحظر والبيع", "blue", "A")
      + summary("PO مفتوح", String(openPos), financePending ? "منها " + financePending + " بانتظار المالية" : "لا شيء بانتظار المالية", financePending ? "amber" : "", "O")
      + summary("نقص جاهز للشراء", String(shortageReady), "من رفع رصيد المخزن مباشرة", shortageReady ? "red" : "", "M")
      + summary("تحت الحد الاستراتيجي", String(strategicBelow), "مواد تحتاج شراء وقائيًا", strategicBelow ? "red" : "", "!")
      + summary("طلب الوكلاء", formatNumber(agentDemandTotal()), activeAgentOrders().length + " أوردر · " + formatNumber(agentDemandUncovered()) + " غير مغطى", agentDemandUncovered() ? "amber" : "blue", "G")
      + summary("توالف المواد", formatNumber(totalWasteQty()), (state.wasteRecords || []).length + " سجل مخصوم من الرصيد", totalWasteQty() ? "red" : "", "T")
      + summary("قضايا مفتوحة", String(openIssues), "مشكلات بانتظار الحل", openIssues ? "amber" : "", "I")
      + '</div></section>';
  }

  function renderExecutive() {
    var records = executiveOrderRecords();
    var filtered = filteredExecutiveOrders(records);
    var products = records.reduce(function (all, item) { if (!all.some(function (product) { return product.code === item.line.productCode; })) all.push({ code: item.line.productCode, name: item.line.productName }); return all; }, []);
    var stageOptions = records.reduce(function (all, item) { if (!all.some(function (stage) { return stage.key === item.currentStageKey; })) all.push({ key: item.currentStageKey, label: item.currentStageLabel }); return all; }, []);
    var completed = filtered.filter(function (item) { return item.health === "completed"; }).length;
    var blocked = filtered.filter(function (item) { return item.health === "blocked"; }).length;
    var attention = filtered.filter(function (item) { return item.health === "attention"; }).length;
    var averageProgress = filtered.length ? Math.round(filtered.reduce(function (sum, item) { return sum + item.progress; }, 0) / filtered.length) : 0;
    var totalAvailable = filtered.reduce(function (sum, item) { return sum + item.availableQty; }, 0);
    var healthOptions = '<option value="all">كل الحالات</option><option value="on_track"' + (executiveFilters.health === "on_track" ? " selected" : "") + '>على المسار</option><option value="attention"' + (executiveFilters.health === "attention" ? " selected" : "") + '>تحتاج انتباهًا</option><option value="blocked"' + (executiveFilters.health === "blocked" ? " selected" : "") + '>متوقفة</option><option value="completed"' + (executiveFilters.health === "completed" ? " selected" : "") + '>مكتملة</option>';
    var productOptions = '<option value="all">كل المنتجات</option>' + products.map(function (item) { return '<option value="' + esc(item.code) + '"' + (executiveFilters.product === item.code ? " selected" : "") + '>' + esc(item.code + " · " + item.name) + '</option>'; }).join("");
    var stageOptionsHtml = '<option value="all">كل المراحل</option>' + stageOptions.map(function (item) { return '<option value="' + esc(item.key) + '"' + (executiveFilters.stage === item.key ? " selected" : "") + '>' + esc(item.label) + '</option>'; }).join("");
    var filters = '<section class="executive-filters"><div class="executive-filter-head"><div><span class="eyebrow">تحكم مباشر</span><h2>فلترة الطلبيات</h2><p>جميع المؤشرات والقوائم تتغير حسب الاختيار.</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="reset-executive-filters">مسح الفلاتر</button></div><div class="executive-filter-grid"><label><span>الحالة</span><select class="select" data-action="executive-filter" data-filter="health">' + healthOptions + '</select></label><label><span>المرحلة الحالية</span><select class="select" data-action="executive-filter" data-filter="stage">' + stageOptionsHtml + '</select></label><label><span>المنتج</span><select class="select" data-action="executive-filter" data-filter="product">' + productOptions + '</select></label><label><span>من تاريخ</span><input class="input" type="date" value="' + esc(executiveFilters.from) + '" data-action="executive-filter" data-filter="from"></label><label><span>إلى تاريخ</span><input class="input" type="date" value="' + esc(executiveFilters.to) + '" data-action="executive-filter" data-filter="to"></label><label><span>الترتيب</span><select class="select" data-action="executive-filter" data-filter="sort"><option value="risk"' + (executiveFilters.sort === "risk" ? " selected" : "") + '>الأكثر خطورة أولًا</option><option value="progress"' + (executiveFilters.sort === "progress" ? " selected" : "") + '>الأقل إنجازًا أولًا</option><option value="newest"' + (executiveFilters.sort === "newest" ? " selected" : "") + '>الأحدث أولًا</option></select></label><label class="executive-search"><span>بحث</span><div><input class="input" id="executive-search" value="' + esc(executiveFilters.query) + '" placeholder="رقم الطلبية أو المنتج أو المرحلة"><button class="btn btn-primary btn-sm" type="button" data-action="apply-executive-search">بحث</button></div></label></div></section>';
    var healthPoolForKpis = filteredExecutiveOrders(records, "health");
    var onTrackCount = healthPoolForKpis.filter(function (item) { return item.health === "on_track"; }).length;
    var kpis = '<section class="executive-kpi-grid">'
      + summary("الطلبيات الظاهرة", String(filtered.length), "من أصل " + records.length, "blue", "O")
      + kpiFilterTile("على المسار", String(onTrackCount), "اضغط للفلترة", "", "on_track")
      + kpiFilterTile("مكتملة", String(healthPoolForKpis.filter(function (item) { return item.health === "completed"; }).length), "وصلت إلى Available for Sales", "", "completed")
      + kpiFilterTile("تحتاج انتباهًا", String(healthPoolForKpis.filter(function (item) { return item.health === "attention"; }).length), "تأخير أو قضية مفتوحة", attention ? "amber" : "", "attention")
      + kpiFilterTile("متوقفة", String(healthPoolForKpis.filter(function (item) { return item.health === "blocked"; }).length), "قرار أو جودة توقف المسار", blocked ? "red" : "", "blocked")
      + summary("متوسط الإنجاز", averageProgress + "٪", "عبر المراحل التشغيلية", "blue", "%")
      + summary("Available for Sales", formatNumber(totalAvailable), "للطلبات ضمن الفلتر", "", "A")
      + '</section>';
    // بيانات الدونات تُحسب مع تجاهل فلتر بعدها نفسه حتى تبقى الشرائح قابلة للنقر دائمًا.
    var healthPool = filteredExecutiveOrders(records, "health");
    var healthOrderKeys = ["on_track", "attention", "blocked", "completed"];
    var healthDonutData = healthOrderKeys.map(function (key) {
      return { key: key, label: executiveHealthInfo(key)[0], value: healthPool.filter(function (item) { return item.health === key; }).length, color: EXEC_HEALTH_COLORS[key] };
    });
    var stagePool = filteredExecutiveOrders(records, "stage");
    var stageAgg = [];
    stagePool.forEach(function (item) {
      var entry = stageAgg.find(function (record) { return record.key === item.currentStageKey; });
      if (!entry) stageAgg.push({ key: item.currentStageKey, label: item.currentStageLabel, value: 1 });
      else entry.value += 1;
    });
    stageAgg.sort(function (a, b) { return b.value - a.value; });
    var stageDonutData = stageAgg.slice(0, 6).map(function (entry, index) { return { key: entry.key, label: entry.label, value: entry.value, color: EXEC_STAGE_COLORS[index] }; });
    var stageRest = stageAgg.slice(6);
    if (stageRest.length) stageDonutData.push({ key: "__rest", label: "مراحل أخرى (" + stageRest.length + ")", value: stageRest.reduce(function (sum, entry) { return sum + entry.value; }, 0), color: "#64748b" });
    var chartPanels = "";
    if (execWidgetVisible("healthChart")) chartPanels += renderDonutPanel("توزيع الطلبيات حسب الحالة", "Pie · Health", healthDonutData, "health", executiveFilters.health, "طلبية");
    if (execWidgetVisible("stageChart")) chartPanels += renderDonutPanel("توزيع الطلبيات حسب المرحلة الحالية", "Pie · Pipeline", stageDonutData, "stage", executiveFilters.stage, "طلبية");
    if (execWidgetVisible("lineChart")) chartPanels += renderExecutiveLineChart(filtered);
    var charts = chartPanels ? '<section class="exec-charts">' + chartPanels + '</section>' : "";
    var riskOrders = filtered.filter(function (item) { return item.riskReasons.length; }).slice(0, 6).map(function (item) { return '<button class="decision-row" type="button" data-action="open-order-roadmap" data-order-id="' + esc(item.id) + '"><span>' + executiveHealthBadge(item.health) + '</span><div><strong>' + esc(item.displayId + " · " + item.line.productName) + '</strong><small>' + esc(item.riskReasons[0]) + '</small></div><b>عرض ←</b></button>'; }).join("");
    var attentionSection = execWidgetVisible("attention") ? '<section class="executive-insights"><article class="dashboard-panel"><div class="dashboard-panel-head"><div><span class="eyebrow">Management Attention</span><h2>أهم الحالات المطلوب متابعتها</h2></div><strong>' + (blocked + attention) + '</strong></div><div class="decision-list">' + (riskOrders || '<div class="dashboard-clear"><b>✓</b><span>لا توجد حالات متوقفة أو متأخرة ضمن الفلتر.</span></div>') + '</div></article></section>' : "";
    var insights = charts + attentionSection;
    var orders = filtered.map(renderExecutiveOrderCard).join("");
    var orderSection = '<section class="executive-orders-section"><div class="executive-section-head"><div><span class="eyebrow">Order Control Tower</span><h2>Roadmap وحالة كل طلبية</h2><p>كل طلبية تمثل منتجًا واحدًا داخل Forecast، وتُربط تلقائيًا بجميع سجلات الأقسام.</p></div><strong>' + filtered.length + ' طلبية</strong></div><div class="executive-orders">' + (orders || empty(records.length ? "لا توجد نتائج مطابقة" : "لا توجد طلبيات بعد", records.length ? "غيّر الفلاتر لعرض طلبيات أخرى." : "تظهر اللوحة تلقائيًا عند إنشاء أول Forecast من المبيعات.")) + '</div></section>';
    var strategicSection = execWidgetVisible("strategic") ? '<section class="exec-strategic">' + renderStrategicCard(false) + '</section>' : "";
    return pageHead("Executive Control Tower", "داشبورد الإدارة الديناميكي", "متابعة كل طلبية من Forecast حتى Available for Sales، مع الحالة والمسؤول والـRoadmap والتفاصيل المرتبطة. خصص اللوحة وأخفِ ما لا تريده من قائمة «تخصيص اللوحة».", execWidgetPickerHtml() + '<button class="btn btn-secondary" type="button" data-action="refresh-executive">تحديث البيانات</button>') + boundary()
      + (execWidgetVisible("kpis") ? renderExecutiveCoreKpis() : "")
      + (execWidgetVisible("filters") ? filters : "")
      + (execWidgetVisible("orderKpis") ? kpis : "")
      + insights
      + strategicSection
      + (execWidgetVisible("orders") ? orderSection : "");
  }

  function openExecutiveOrderRoadmap(orderId) {
    var order = executiveOrderRecords().find(function (item) { return item.id === orderId; });
    if (!order) { showToast("تعذر العثور على الطلبية.", "error"); return; }
    var timeline = order.milestones.map(function (item, index) {
      var icon = item.status === "done" ? "✓" : item.status === "blocked" ? "!" : item.status === "active" ? "●" : "○";
      var isCurrent = item.key === order.currentStageKey;
      return '<article class="roadmap-detail-step ' + esc(item.status) + (isCurrent ? ' is-current' : '') + '"' + (isCurrent ? ' aria-current="step"' : '') + '><span class="roadmap-detail-index">' + icon + '</span><div><small>' + (index + 1) + ' · ' + esc(item.owner) + (isCurrent ? ' · <b>المرحلة الحالية</b>' : '') + '</small><h3>' + esc(item.label) + '</h3><p>' + esc(item.detail) + '</p></div><time>' + esc(displayTimestamp(item.date)) + '</time></article>';
    }).join("");
    var materials = order.requirements.map(function (item) { return '<tr><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br>' + esc(item.material) + '</td><td>' + formatNumber(item.required) + ' ' + esc(item.unit || "") + '</td><td>' + formatNumber(materialAllocatedAvailable(item)) + '</td><td>' + formatNumber(item.inbound) + '</td><td>' + statusByValue(!item.stockConfirmed ? "pending" : materialShortage(item) ? "shortage" : "available") + '</td></tr>'; }).join("");
    var purchases = order.commitments.map(function (item) { return '<tr><td>' + esc(item.po) + '</td><td>' + esc(item.supplier) + '</td><td>' + formatNumber(item.qty) + '</td><td>' + esc(item.orderDate || "—") + '</td><td>' + esc(item.eta || "—") + '</td><td>' + statusByValue(item.status) + '</td></tr>'; }).join("");
    var rawReceiptRows = order.rawReceipts.map(function (item) { return '<tr><td>' + esc(item.id) + '</td><td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br>' + esc(item.material) + '</td><td>' + formatNumber(item.qty) + '</td><td>' + formatNumber(item.received) + '</td><td>' + esc(displayTimestamp(item.receivedAt)) + '</td><td>' + statusByValue(item.status === "received" && Number(item.received) < Number(item.qty) ? "partial" : item.status) + '</td></tr>'; }).join("");
    var executionRows = order.actuals.map(function (item) {
      var fg = order.fgReceipts.find(function (record) { return record.actualId === item.id; });
      return '<tr><td>' + esc(item.batch || item.id) + '</td><td>' + formatNumber(item.planned) + '</td><td>' + formatNumber(item.actual) + '</td><td>' + esc(item.date || "—") + '</td><td>' + (fg ? formatNumber(fg.received) : "—") + '</td><td>' + (fg ? statusByValue("confirmed") : status("بانتظار المخزن", "amber")) + '</td><td>' + (fg ? formatNumber(fgAvailable(fg)) : "0") + '</td></tr>';
    }).join("");
    var issueRows = order.issues.map(function (item) { return '<div class="roadmap-issue"><div><strong>' + esc(item.title) + '</strong><p>' + esc(item.impact) + '</p></div><span>' + statusByValue(item.severity === "critical" ? "blocked" : "exception") + '<small>' + esc(item.owner + " · " + item.due) + '</small></span></div>'; }).join("");
    var linkedDetails = '<div class="roadmap-linked-grid"><section><span class="eyebrow">Forecast & Production</span><div class="question-grid"><div class="question"><span>Forecast</span><strong>' + esc(order.forecast.id) + '</strong></div><div class="question"><span>المنتج</span><strong>' + esc(order.line.productCode + " · " + order.line.productName) + '</strong></div><div class="question"><span>الطلب</span><strong>' + formatNumber(order.forecastQty) + '</strong></div><div class="question"><span>المخطط</span><strong>' + formatNumber(order.planQty) + '</strong></div><div class="question"><span>Actual</span><strong>' + formatNumber(order.actualQty) + '</strong></div><div class="question"><span>Available</span><strong>' + formatNumber(order.availableQty) + '</strong></div></div></section><section><span class="eyebrow">المواد</span>' + (materials ? '<div class="table-wrap"><table><thead><tr><th>المادة</th><th>المطلوب</th><th>المتاح</th><th>Inbound</th><th>الحالة</th></tr></thead><tbody>' + materials + '</tbody></table></div>' : '<p class="muted">لم تُحدد مواد لهذه الطلبية بعد.</p>') + '</section><section><span class="eyebrow">الشراء والتوريد</span>' + (purchases ? '<div class="table-wrap"><table><thead><tr><th>PO</th><th>المورد</th><th>الكمية</th><th>تاريخ الطلب</th><th>ETA</th><th>التوريد</th></tr></thead><tbody>' + purchases + '</tbody></table></div>' : '<p class="muted">لا توجد أوامر شراء مرتبطة.</p>') + '</section><section><span class="eyebrow">استلام المواد</span>' + (rawReceiptRows ? '<div class="table-wrap"><table><thead><tr><th>الوارد</th><th>المادة</th><th>المتوقع</th><th>المستلم</th><th>تاريخ الاستلام</th><th>الحالة</th></tr></thead><tbody>' + rawReceiptRows + '</tbody></table></div>' : '<p class="muted">لا توجد دفعات مواد مستلمة.</p>') + '</section><section><span class="eyebrow">التنفيذ والمنتج النهائي</span>' + (executionRows ? '<div class="table-wrap"><table><thead><tr><th>Batch</th><th>Plan</th><th>Actual</th><th>تاريخ الإنتاج</th><th>FG Received</th><th>الحالة</th><th>Available</th></tr></thead><tbody>' + executionRows + '</tbody></table></div>' : '<p class="muted">لم يبدأ الإنتاج الفعلي بعد.</p>') + '</section><section><span class="eyebrow">المشكلات المفتوحة</span>' + (issueRows || '<p class="muted">لا توجد مشكلات مفتوحة مرتبطة بهذه الطلبية.</p>') + '</section></div>';
    var activeMilestone = order.milestones.find(function (item) { return item.key === order.currentStageKey; }) || order.milestones[order.milestones.length - 1];
    var body = '<div class="roadmap-dialog-live ' + esc(activeMilestone.status) + '"><span class="roadmap-live-pulse" aria-hidden="true"></span><div><small>' + (order.health === "completed" ? "المحطة النهائية" : "الموقع الحالي في المسار") + '</small><strong>' + esc(order.currentStageLabel) + '</strong><p>' + esc(order.currentOwner + " · " + activeMilestone.detail) + '</p></div><time>' + esc(displayTimestamp(activeMilestone.date)) + '</time></div><div class="roadmap-dialog-summary"><div><span>الحالة</span>' + executiveHealthBadge(order.health) + '</div><div><span>المرحلة الحالية</span><strong>' + esc(order.currentStageLabel) + '</strong></div><div><span>المسؤول الآن</span><strong>' + esc(order.currentOwner) + '</strong></div><div><span>الإنجاز</span><strong>' + order.progress + '٪</strong></div></div><div class="roadmap-detail-list">' + timeline + '</div>' + linkedDetails;
    openDialog('<header class="dialog-head"><div><span class="eyebrow">' + esc(order.displayId) + '</span><h2 id="dialog-title">Roadmap الطلبية · ' + esc(order.line.productName) + '</h2><p>' + esc(forecastPeriod(order.forecast)) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-primary" type="button" data-action="close-dialog">إغلاق</button></footer>', "wide");
  }

  // ===== نظام التقارير المفصل: جداول لكل مرحلة مع تصدير Excel (CSV بترميز يفتح عربيًا) =====
  var reportMonthFilter = "";
  var reportProductFilter = "";

  function reportMonthsList() {
    var months = [];
    var push = function (key) { if (key && months.indexOf(key) === -1) months.push(key); };
    state.forecasts.forEach(function (forecast) {
      (forecast.items || []).forEach(function (line) { Object.keys(line.monthlyQty || {}).forEach(push); });
    });
    state.weeklyPlans.forEach(function (plan) { push(plan.month); });
    state.actuals.forEach(function (item) { push(item.month); });
    state.materialMoves.forEach(function (move) { push(move.month); });
    state.salesRecords.forEach(function (item) { push(monthKeyOf(item.date)); });
    return months.sort();
  }

  function reportMatchMonth(monthKey) { return !reportMonthFilter || monthKey === reportMonthFilter; }
  function reportMatchProduct(code) { return !reportProductFilter || normalizeCode(code) === normalizeCode(reportProductFilter); }

  function financeApprovalLabel(item) {
    if (!item.financeApproval) return "—";
    if (item.financeApproval.status === "approved") return "موافقة";
    if (item.financeApproval.status === "rejected") return "مرفوض";
    return "بانتظار المالية";
  }

  function buildReport(key) {
    if (key === "forecasts") {
      var fRows = [];
      state.forecasts.forEach(function (forecast) {
        (forecast.items || []).forEach(function (line) {
          if (!reportMatchProduct(line.productCode)) return;
          Object.keys(line.monthlyQty || {}).sort().forEach(function (monthKey) {
            if (!reportMatchMonth(monthKey)) return;
            if (!(Number(line.monthlyQty[monthKey]) > 0)) return;
            fRows.push([forecast.id, forecast.version || "V1", forecastStatusInfo(forecast.status)[0], line.productCode, line.productName, monthLabel(monthKey), monthKey, Number(line.monthlyQty[monthKey]), forecast.createdAt || "", forecast.fixedAt || ""]);
          });
        });
      });
      return { key: key, title: "تقرير المستندات والتفاوض", subtitle: "كل (مستند × منتج × شهر) بكميته وحالته",
        headers: ["المستند", "الإصدار", "الحالة", "كود المنتج", "المنتج", "الشهر", "مفتاح الشهر", "الكمية", "تاريخ الإنشاء", "تاريخ التثبيت"], rows: fRows };
    }
    if (key === "monthlyExec") {
      var eRows = [];
      state.forecasts.filter(function (forecast) { return forecast.status === "fixed"; }).forEach(function (forecast) {
        (forecast.items || []).forEach(function (line) {
          if (!reportMatchProduct(line.productCode)) return;
          Object.keys(line.monthlyQty || {}).sort().forEach(function (monthKey) {
            if (!reportMatchMonth(monthKey)) return;
            var planned = Number(line.monthlyQty[monthKey] || 0);
            if (!(planned > 0)) return;
            var produced = state.actuals.filter(function (item) { return item.forecastId === forecast.id && normalizeCode(item.productCode) === normalizeCode(line.productCode) && item.month === monthKey; })
              .reduce(function (sum, item) { return sum + Number(item.actual || 0); }, 0);
            var sold = soldInMonth(line.productCode, monthKey);
            eRows.push([line.productCode, line.productName, monthLabel(monthKey), monthKey, planned, produced, planned - produced, planned ? Math.round((produced / planned) * 100) + "%" : "—", sold, forecast.id]);
          });
        });
      });
      return { key: key, title: "تقرير التنفيذ الشهري", subtitle: "المخطط مقابل المنتَج والمباع والانحراف لكل (منتج × شهر)",
        headers: ["كود المنتج", "المنتج", "الشهر", "مفتاح الشهر", "المخطط", "المنتَج الفعلي", "الانحراف", "نسبة التنفيذ", "المباع", "المستند"], rows: eRows };
    }
    if (key === "weekly") {
      var wRows = [];
      state.weeklyPlans.forEach(function (plan) {
        if (!reportMatchMonth(plan.month) || !reportMatchProduct(plan.productCode)) return;
        var granLabel = plan.granularity === "monthly" ? "شهرية" : plan.granularity === "daily" ? "يومية" : "أسبوعية";
        planUnits(plan).forEach(function (unit) {
          wRows.push([plan.id, plan.productCode, plan.product, monthLabel(plan.month), plan.month, granLabel, unit.key, unit.label, Number(unit.qty || 0),
            unitApprovedBy(plan, unit.key, "production") ? "معتمد" : "لا", unitApprovedBy(plan, unit.key, "fgWarehouse") ? "معتمد" : "لا", weeklyPlanStatusInfo(plan.status)[0]]);
        });
      });
      return { key: key, title: "تقرير الخطط والاعتمادات", subtitle: "كل وحدة خطة (أسبوع/يوم/شهر) مع اعتمادي الإنتاج ومخزن FG",
        headers: ["الخطة", "كود المنتج", "المنتج", "الشهر", "مفتاح الشهر", "الحبيبة", "الوحدة", "الفترة", "الكمية", "اعتماد الإنتاج", "اعتماد مخزن FG", "حالة الخطة"], rows: wRows };
    }
    if (key === "sales") {
      var sRows = state.salesRecords.filter(function (item) { return reportMatchMonth(monthKeyOf(item.date)) && reportMatchProduct(item.productCode); })
        .map(function (item) { return [item.date || "", item.productCode, item.product, Number(item.qty || 0), item.unit || "", item.channel === "agent" ? "أوردر وكيل" : "بيع مباشر", item.agentCode ? agentName(item.agentCode) : "", item.agentOrderId || "", item.note || "", item.recordedAt || ""]; });
      return { key: key, title: "تقرير المبيعات اليومية", subtitle: "كل عملية بيع مسجلة بتاريخها",
        headers: ["التاريخ", "كود المنتج", "المنتج", "الكمية", "الوحدة", "القناة", "الوكيل", "الأوردر", "ملاحظة", "وقت التسجيل"], rows: sRows };
    }
    if (key === "fg") {
      var gRows = state.fgReceipts.filter(function (item) { return reportMatchProduct(item.productCode); }).map(function (item) {
        return [item.productCode, item.product, Number(item.produced || 0), Number(item.received || 0), Number(item.reserved || 0), Number(item.blocked || 0), fgAvailable(item), item.confirmedAt || ""];
      });
      return { key: key, title: "تقرير مخزون المنتج النهائي", subtitle: "كل دفعة مستلمة: المنتَج والمستلم والمحجوز والمحظور والمتاح",
        headers: ["كود المنتج", "المنتج", "Produced", "Received", "Reserved", "Blocked", "Available", "تاريخ التأكيد"], rows: gRows };
    }
    if (key === "requirements") {
      var qRows = state.materials.map(function (item) {
        var monthsText = Object.keys(item.monthlyQty || {}).filter(function (k) { return Number(item.monthlyQty[k]) > 0; }).sort()
          .map(function (k) { return k + ": " + Number(item.monthlyQty[k]); }).join(" | ");
        var reqMaster = rawMasterByCode(item.materialCode);
        return [item.forecastId || "", item.materialCode, item.material, materialCategoryLabel(reqMaster ? reqMaster.category : "raw"), item.unit || "", Number(item.required || 0), Number(item.consumed || 0), effectiveRequired(item),
          item.stockConfirmed ? materialAllocatedAvailable(item) : "", Number(item.inbound || 0), item.stockConfirmed ? materialShortage(item) : "", monthsText,
          item.stockConfirmed ? "مؤكد" : "غير مؤكد", materialForecastFixed(item) ? "مثبت" : "قيد الجاهزية"];
      });
      return { key: key, title: "تقرير الاحتياجات والنقص", subtitle: "كل مادة لكل مستند: المطلوب والمتاح والقادم والنقص وأشهر الحاجة",
        headers: ["المستند", "كود المادة", "المادة", "النوع", "الوحدة", "المطلوب", "المستهلك", "المتبقي", "المتاح", "القادم", "النقص", "أشهر الحاجة", "حالة المخزن", "حالة المستند"], rows: qRows, hideForSales: true };
    }
    if (key === "purchases") {
      var pRows = state.commitments.map(function (item) {
        var material = state.materials.find(function (record) { return record.id === item.materialId; });
        return [item.id, item.po, item.supplier, material ? material.materialCode : item.materialId, material ? material.material : "", Number(item.qty || 0),
          item.orderDate || "", item.eta || "", item.amount || "", financeApprovalLabel(item), item.financeApproval && item.financeApproval.at ? item.financeApproval.at : "",
          item.quotation && item.quotation.name ? item.quotation.name : "لا كوتيشن", statusInfo(item.status)[0], item.createdAt || "", item.inTransitAt || ""];
      });
      return { key: key, title: "تقرير أوامر الشراء", subtitle: "كل أمر: المورد والكمية والقيمة وموافقة المالية والكوتيشن وحالة التوريد",
        headers: ["الأوردر", "PO", "المورد", "كود المادة", "المادة", "الكمية", "تاريخ الأوردر", "ETA", "القيمة", "موافقة المالية", "تاريخ قرار المالية", "الكوتيشن", "حالة التوريد", "تاريخ الإنشاء", "بدء التوريد"], rows: pRows, hideForSales: true };
    }
    if (key === "agentOrders") {
      var aoRows = [];
      state.agentOrders.forEach(function (order) {
        (order.lines || []).forEach(function (line) {
          var lineMonth = line.month || order.month;
          if (!reportMatchMonth(lineMonth) || !reportMatchProduct(line.productCode)) return;
          var product = state.products.find(function (item) { return normalizeCode(item.code) === normalizeCode(line.productCode); });
          aoRows.push([order.id, order.orderDate || "", order.agentCode, agentName(order.agentCode), (agentByCode(order.agentCode) || {}).region || "",
            monthLabel(lineMonth), lineMonth, line.productCode, product ? product.name : "", Number(line.qty || 0),
            line.price == null ? "" : Number(line.price), line.price == null ? "" : Number(line.qty || 0) * Number(line.price),
            agentOrderDeliveredQty(order.id, line.productCode), agentOrderStatusInfo(order)[0], line.note || ""]);
        });
      });
      return { key: key, title: "تقرير أوردرات الوكلاء", subtitle: "سطرًا سطرًا: الوكيل والمنتج والشهر والكمية والقيمة والمسلّم",
        headers: ["الأوردر", "تاريخ الأوردر", "كود الوكيل", "الوكيل", "المنطقة", "الشهر", "مفتاح الشهر", "كود المنتج", "المنتج", "الكمية", "السعر", "القيمة", "المسلّم", "الحالة", "ملاحظة"], rows: aoRows };
    }
    if (key === "agentCoverage") {
      var acMatrix = agentDemandMatrix();
      var acRows = [];
      Object.keys(acMatrix).forEach(function (code) {
        if (!reportMatchProduct(code)) return;
        var product = state.products.find(function (item) { return normalizeCode(item.code) === code; });
        Object.keys(acMatrix[code]).sort().forEach(function (month) {
          if (!reportMatchMonth(month)) return;
          var demand = acMatrix[code][month];
          var fixed = fixedForecastQty(code, month);
          var direct = state.salesRecords.filter(function (item) { return item.channel !== "agent" && normalizeCode(item.productCode) === code && monthKeyOf(item.date) === month; })
            .reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
          acRows.push([code, product ? product.name : "", monthLabel(month), month, demand, fixed, fixed - demand, fixed ? Math.round((demand / fixed) * 100) + "%" : "—", direct]);
        });
      });
      return { key: key, title: "تقرير تغطية طلب الوكلاء", subtitle: "طلب الوكلاء مقابل المثبت في المستندات، ومساهمة البيع المباشر",
        headers: ["كود المنتج", "المنتج", "الشهر", "مفتاح الشهر", "طلب الوكلاء", "المثبت في المستندات", "الفرق", "نسبة الوكلاء من المثبت", "مبيعات مباشرة في الشهر"], rows: acRows };
    }
    if (key === "waste") {
      var wRows = (state.wasteRecords || []).filter(function (item) { return reportMatchMonth(monthKeyOf(item.date)); }).map(function (item) {
        var wasteMaster = rawMasterByCode(item.materialCode);
        return [item.date || "", item.materialCode, item.material, materialCategoryLabel(wasteMaster ? wasteMaster.category : "raw"), Number(item.qty || 0), item.unit || "", wasteReasonLabel(item.reason), item.note || "", item.by || "", item.recordedAt || ""];
      });
      return { key: key, title: "تقرير التوالف", subtitle: "كل كمية تالفة من المواد والباكينغ بسببها — مخصومة من الرصيد",
        headers: ["التاريخ", "كود المادة", "المادة", "النوع", "الكمية التالفة", "الوحدة", "السبب", "ملاحظة", "المسجّل", "وقت التسجيل"], rows: wRows, hideForSales: true };
    }
    if (key === "moves") {
      var mRows = state.materialMoves.filter(function (move) { return reportMatchMonth(move.month); }).map(function (move) {
        return [move.at || "", move.type === "receive" ? "استلام" : move.type === "waste" ? "توالف" : "سحب", move.materialCode, move.material, Number(move.qty || 0), move.unit || "", move.month || "", move.ref || ""];
      });
      return { key: key, title: "تقرير حركة المواد", subtitle: "كل استلام وسحب بمرجعه وشهره",
        headers: ["الوقت", "النوع", "كود المادة", "المادة", "الكمية", "الوحدة", "الشهر", "المرجع"], rows: mRows, hideForSales: true };
    }
    if (key === "strategic") {
      var tRows = state.rawMaterials.filter(function (item) { return item.active !== false; }).map(function (item) {
        var onHand = materialOnHandByCode(item.code);
        var below = item.strategicStock != null && onHand != null && onHand < Number(item.strategicStock);
        return [item.code, item.name, materialCategoryLabel(item.category), item.supplier || "", item.unit || "", item.strategicStock == null ? "" : Number(item.strategicStock), onHand == null ? "" : onHand,
          item.strategicStock != null && onHand != null ? Math.max(0, Number(item.strategicStock) - onHand) : "", item.leadTimeDays == null ? "" : Number(item.leadTimeDays),
          item.strategicStock == null ? "لم يُحدد" : onHand == null ? "لا رصيد معروف" : below ? "تحت الحد" : "سليم"];
      });
      return { key: key, title: "تقرير المخزون الاستراتيجي ومدد التوريد", subtitle: "الحد والرصيد والفجوة ومدة التوريد لكل مادة",
        headers: ["كود المادة", "المادة", "النوع", "المورد", "الوحدة", "الحد الاستراتيجي", "الرصيد الحالي", "الفجوة", "مدة التوريد (يوم)", "الحالة"], rows: tRows, hideForSales: true };
    }
    return null;
  }

  var REPORT_KEYS = ["agentOrders", "agentCoverage", "forecasts", "monthlyExec", "weekly", "sales", "fg", "requirements", "purchases", "waste", "moves", "strategic"];

  function visibleReportKeys() {
    return REPORT_KEYS.filter(function (key) {
      if (state.role !== "sales") return true;
      var def = buildReport(key);
      return !(def && def.hideForSales);
    });
  }

  function reportCsv(report) {
    var cell = function (value) {
      var text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    };
    var lines = [report.headers.map(function (header) { return cell(localizeText(header)); }).join(",")];
    report.rows.forEach(function (row) { lines.push(row.map(cell).join(",")); });
    return "\uFEFF" + lines.join("\n") + "\n";
  }

  // ===== تنزيل الملفات =====
  // كانت كل التنزيلات تستخدم رابط data: مع خاصية download — وسفاري (خصوصًا على file://)
  // يتجاهل هذه الخاصية مع روابط data: فلا ينزل شيء بينما تظهر رسالة النجاح.
  // الحل: Blob + createObjectURL وهو ما يحترمه سفاري، مع نافذة نسخ احتياطية عند الفشل.
  var pendingDownloadText = "";

  function openDownloadFallback(filename, text) {
    pendingDownloadText = text;
    var body = '<div class="form-note">تعذر بدء التنزيل التلقائي في هذا المتصفح. انسخ المحتوى أدناه والصقه في ملف جديد باسم <strong>' + esc(filename) + '</strong> ثم افتحه في Excel.</div>'
      + '<div class="field full"><label class="sr-only" for="download-fallback-text">محتوى الملف</label><textarea class="input" id="download-fallback-text" rows="12" readonly>' + esc(text) + '</textarea></div>';
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">نسخة نصية جاهزة للنسخ</h2><p>' + esc(filename) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-secondary" type="button" data-action="close-dialog">إغلاق</button><button class="btn btn-primary" type="button" data-action="copy-download-text">نسخ المحتوى</button></footer>', "wide");
  }

  function downloadTextFile(filename, text, mime) {
    var type = (mime || "text/csv") + ";charset=utf-8";
    try {
      var blob = new Blob([text], { type: type });
      if (window.navigator && window.navigator.msSaveBlob) { window.navigator.msSaveBlob(blob, filename); return true; }
      var url = window.URL.createObjectURL(blob);
      var link = document.createElement("a");
      if (typeof link.download === "undefined") { window.URL.revokeObjectURL(url); openDownloadFallback(filename, text); return false; }
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 8000);
      return true;
    } catch (error) {
      openDownloadFallback(filename, text);
      return false;
    }
  }

  function exportReport(key) {
    var report = buildReport(key);
    if (!report || (report.hideForSales && state.role === "sales")) { showToast("هذا التقرير غير متاح لدورك.", "error"); return; }
    if (!report.rows.length) { showToast("لا توجد بيانات في هذا التقرير حسب الفلاتر الحالية.", "error"); return; }
    if (!downloadTextFile("EMICP-report-" + key + "-" + currentTimestamp().slice(0, 10) + ".csv", reportCsv(report))) return;
    showToast("صُدّر " + report.title + " (" + report.rows.length + " صفًا) — يفتح في Excel مباشرة.", "success");
  }

  // ===== صندوق الموافقات الموحّد =====
  // المشكلة: 139 منتجًا × 12 شهرًا = 1,668 خطة أسبوعية، كل واحدة تمرّ بمراجعة المبيعات
  // ثم اعتماد الإنتاج ثم اعتماد مخزن FG — أكثر من خمسة آلاف موافقة في السنة، موزّعة على شاشات.
  // الحل هنا مبدآن: (1) شاشة واحدة تجمع كل ما ينتظر دورك من كل الأقسام،
  // (2) الموافقة بالاستثناء: ما هو داخل حدّ التفويض يأتي محددًا مسبقًا، والاستثناء وحده يطلب قرارك.
  var APPROVAL_TOLERANCE_DEFAULT = 5;

  function approvalTolerance() {
    var value = Number(state.approvalTolerancePct);
    return Number.isFinite(value) && value >= 0 ? value : APPROVAL_TOLERANCE_DEFAULT;
  }

  // انحراف مجموع الخطة الأسبوعية عن صافي احتياج الشهر في المستند المثبّت.
  function planDeviationPct(plan) {
    var net = productionNetNeed(plan.forecastId, plan.productCode, plan.month);
    var total = weeklyPlanTotal(plan);
    if (!(net > QTY_EPSILON)) return total > QTY_EPSILON ? 100 : 0;
    return Math.abs(total - net) / net * 100;
  }

  function pendingApprovalsFor(role) {
    var tolerance = approvalTolerance();
    var items = [];
    if (role === "sales") {
      state.weeklyPlans.filter(function (plan) { return plan.status === "awaiting_sales"; }).forEach(function (plan) {
        var deviation = planDeviationPct(plan);
        items.push({
          kind: "weekly-forward", id: plan.id, source: "الخطة الأسبوعية",
          title: plan.productCode + " — " + plan.product, subtitle: monthLabel(plan.month) + " · " + plan.forecastId,
          qty: roundQty(weeklyPlanTotal(plan)), unit: plan.unit || "",
          deviation: deviation, withinPolicy: deviation <= tolerance + QTY_EPSILON,
          reason: deviation <= tolerance + QTY_EPSILON ? "مطابق للفوركاست ضمن الحدّ" : "انحراف " + deviation.toFixed(1) + "٪ عن صافي الفوركاست",
          decision: "إرسال للاعتماد"
        });
      });
    }
    if (role === "production" || role === "fgWarehouse") {
      state.weeklyPlans.filter(function (plan) {
        return plan.status === "awaiting_approvals" && !planFullyApprovedByRole(plan, role);
      }).forEach(function (plan) {
        var deviation = planDeviationPct(plan);
        var progress = planApprovalProgress(plan, role);
        items.push({
          kind: "weekly-approve", id: plan.id, source: "الخطة الأسبوعية",
          title: plan.productCode + " — " + plan.product, subtitle: monthLabel(plan.month) + " · " + progress.done + "/" + progress.total + " وحدة معتمدة",
          qty: roundQty(weeklyPlanTotal(plan)), unit: plan.unit || "",
          deviation: deviation, withinPolicy: deviation <= tolerance + QTY_EPSILON,
          reason: deviation <= tolerance + QTY_EPSILON ? "مطابق للفوركاست ضمن الحدّ" : "انحراف " + deviation.toFixed(1) + "٪ عن صافي الفوركاست",
          decision: "اعتماد كل الوحدات"
        });
      });
    }
    if (role === "finance") {
      state.commitments.filter(function (item) {
        if (item.status === "received" || item.status === "cancelled" || item.status === "in_transit") return false;
        return !item.financeApproval || item.financeApproval.status === "pending";
      }).forEach(function (item) {
        // سياسة المالية ليست نسبة: الكوتيشن المرفق هو الشرط الذي يمنع الموافقة أصلًا بدونه.
        var hasQuotation = Boolean(item.quotation && item.quotation.dataUrl);
        items.push({
          kind: "po-approve", id: item.id, source: "أوامر الشراء",
          title: item.po + " — " + (item.supplier || "بلا مورد"), subtitle: item.materialCode + " · " + (item.materialName || ""),
          qty: roundQty(Number(item.orderQty || item.qty || 0)), unit: item.purchaseUnit || item.unit || "",
          deviation: null, withinPolicy: hasQuotation,
          reason: hasQuotation ? "كوتيشن مرفق" : "بلا كوتيشن — لا تُقبل الموافقة",
          decision: "موافقة مالية"
        });
      });
    }
    return items;
  }

  function renderApprovalsInbox() {
    var role = state.role;
    var items = pendingApprovalsFor(role);
    var tolerance = approvalTolerance();
    var head = pageHead("Approvals Inbox", "صندوق الموافقات",
      "كل ما ينتظر دورك في شاشة واحدة. ما هو داخل حدّ التفويض (±" + formatNumber(tolerance) + "٪) يأتي محددًا مسبقًا؛ الاستثناء وحده يطلب قرارك.", "") + boundary();
    if (!items.length) {
      return head + card("لا شيء ينتظرك", "", empty("صندوقك فارغ", "لا توجد موافقات مستحقة لدورك الآن."));
    }
    var withinCount = items.filter(function (item) { return item.withinPolicy; }).length;
    var rows = items.map(function (item, index) {
      var tone = item.withinPolicy ? "green" : "amber";
      var badge = item.withinPolicy ? "داخل حدّ التفويض" : "استثناء — يحتاج قرارك";
      return '<tr class="' + (item.withinPolicy ? "row-picked" : "row-exception") + '">'
        + '<td><label class="sr-only" for="ap-pick-' + index + '">تحديد ' + esc(item.title) + '</label><input type="checkbox" id="ap-pick-' + index + '" name="apPick_' + index + '" data-action="approval-pick" data-within="' + (item.withinPolicy ? "1" : "0") + '"' + (item.withinPolicy ? " checked" : "") + '>'
        + '<input type="hidden" name="apKind_' + index + '" value="' + esc(item.kind) + '"><input type="hidden" name="apId_' + index + '" value="' + esc(item.id) + '"></td>'
        + '<td><strong class="code-chip">' + esc(item.source) + '</strong><br>' + esc(item.title) + '<br><small>' + esc(item.subtitle) + '</small></td>'
        + '<td class="number">' + formatNumber(item.qty) + ' ' + esc(item.unit) + '</td>'
        + '<td>' + status(badge, tone) + '<br><small>' + esc(item.reason) + '</small></td>'
        + '<td>' + esc(item.decision) + '</td></tr>';
    }).join("");
    var toolbar = '<div class="bulk-tools bulk-apply">'
      + '<div><strong>الموافقة بالاستثناء</strong><p>المحدد يُعتمد بضغطة واحدة. البنود خارج حدّ التفويض تصل غير محددة عمدًا — حدّدها بنفسك بعد المراجعة، أو اتركها لتعود في المرة القادمة.</p></div>'
      + '<button class="btn btn-secondary btn-sm" type="button" data-action="approval-select-within">تحديد ما هو داخل الحدّ فقط</button>'
      + '<button class="btn btn-secondary btn-sm" type="button" data-action="approval-select-all">تحديد الكل</button>'
      + '<button class="btn btn-secondary btn-sm" type="button" data-action="approval-select-none">إلغاء التحديد</button>'
      + '<button class="btn btn-primary btn-sm" type="submit">اعتماد المحدد</button>'
      + '<span class="table-count" id="ap-selected-count"></span>'
      + '</div>';
    var body = '<form id="approvals-inbox-form"><input type="hidden" name="apCount" value="' + items.length + '">' + toolbar
      + '<div class="table-wrap"><table><thead><tr><th scope="col"><label class="sr-only" for="ap-pick-all">تحديد كل البنود</label><input type="checkbox" id="ap-pick-all" data-action="approval-pick-all"></th><th scope="col">البند</th><th scope="col">الكمية</th><th scope="col">السياسة</th><th scope="col">القرار</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-note">حدّ التفويض يضبطه مسؤول النظام من تهيئة النظام. الحدّ يقرر ما يأتي محددًا مسبقًا فقط — لا يعتمد شيئًا نيابة عنك، وكل موافقة تُسجَّل في سجل الأحداث باسمك.</div>'
      + '</form>';
    return head + card("ينتظر دورك: " + formatNumber(items.length) + " بندًا", formatNumber(withinCount) + " داخل حدّ التفويض · " + formatNumber(items.length - withinCount) + " استثناء", body);
  }

  function renderReports() {
    var months = reportMonthsList();
    var monthOptions = '<option value="">كل الأشهر</option>' + months.map(function (key) { return '<option value="' + esc(key) + '"' + (reportMonthFilter === key ? " selected" : "") + '>' + esc(monthLabel(key)) + '</option>'; }).join("");
    var productOptions = '<option value="">كل المنتجات</option>' + state.products.map(function (item) { return '<option value="' + esc(item.code) + '"' + (normalizeCode(reportProductFilter) === normalizeCode(item.code) ? " selected" : "") + '>' + esc(item.code + " — " + item.name) + '</option>'; }).join("");
    var filters = card("فلاتر التقارير", "الشهر والمنتج يطبقان على التقارير الزمنية؛ التصدير يلتزم بالفلاتر",
      '<div class="report-filters"><label>الشهر <select data-action="report-month-filter">' + monthOptions + '</select></label>' +
      '<label>المنتج <select data-action="report-product-filter">' + productOptions + '</select></label>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-action="export-all-reports">تصدير كل التقارير</button></div>');
    var cards = visibleReportKeys().map(function (key) {
      var report = buildReport(key);
      var table;
      if (!report.rows.length) table = empty("لا بيانات", "لا توجد صفوف حسب الفلاتر الحالية.");
      else {
        var shown = report.rows.slice(0, 200);
        table = '<div class="table-wrap"><table><thead><tr>' + report.headers.map(function (header) { return '<th scope="col">' + esc(header) + '</th>'; }).join("") + '</tr></thead><tbody>' +
          shown.map(function (row) { return '<tr>' + row.map(function (value) { return '<td>' + (typeof value === "number" ? '<span class="number">' + formatNumber(value) + '</span>' : esc(String(value == null ? "" : value))) + '</td>'; }).join("") + '</tr>'; }).join("") +
          '</tbody></table></div>' + (report.rows.length > 200 ? '<div class="form-note">يعرض أول 200 صف من ' + report.rows.length + ' — التصدير يشمل كل الصفوف.</div>' : "");
      }
      return card(report.title + " (" + report.rows.length + ")", report.subtitle, table,
        '<button class="btn btn-primary btn-sm" type="button" data-action="export-report" data-report="' + esc(key) + '">تصدير إلى Excel</button>');
    }).join("");
    return pageHead("التقارير", "نظام تقارير مفصل", "جدول كامل لكل مرحلة من المسار، وكل تقرير يُصدَّر ملف CSV يفتح في Excel مباشرة بالعربية.", "") + boundary() + filters + cards;
  }

  // ===== جدول اللغات في لوحة التحكم: العربية والإنجليزية والكردية مقابل بعض، وكل خلية قابلة للتعديل =====
  var langSearchFilter = "";
  var langMissFilter = "";

  function allLangKeys() {
    var keys = Object.keys(window.EMICP_DICT || {});
    Object.keys(state.langOverrides || {}).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
    Object.keys(missingPhrases).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
    return keys.sort(function (a, b) { return a.localeCompare(b, "ar"); });
  }

  function renderLanguages() {
    var keys = allLangKeys();
    var needle = langSearchFilter.trim().toLowerCase();
    var filtered = keys.filter(function (key) {
      var entry = dictEntry(key);
      if (langMissFilter === "en" && entry.en) return false;
      if (langMissFilter === "ku" && entry.ku) return false;
      if (langMissFilter === "any" && entry.en && entry.ku) return false;
      if (!needle) return true;
      return key.toLowerCase().includes(needle) || entry.ar.toLowerCase().includes(needle) || entry.en.toLowerCase().includes(needle) || entry.ku.toLowerCase().includes(needle);
    });
    var missingEn = keys.filter(function (key) { return !dictEntry(key).en; }).length;
    var missingKu = keys.filter(function (key) { return !dictEntry(key).ku; }).length;
    var shown = filtered.slice(0, 150);
    var rows = shown.map(function (key, index) {
      var entry = dictEntry(key);
      var override = (state.langOverrides || {})[key];
      return '<tr>'
        + '<td><input class="input lang-cell" type="text" dir="rtl" data-lt-key="' + esc(key) + '" data-lt-lang="ar" value="' + esc(entry.ar) + '"></td>'
        + '<td><input class="input lang-cell" type="text" dir="ltr" data-lt-key="' + esc(key) + '" data-lt-lang="en" value="' + esc(entry.en) + '"' + (entry.en ? "" : ' placeholder="بلا ترجمة"') + '></td>'
        + '<td><input class="input lang-cell" type="text" dir="rtl" data-lt-key="' + esc(key) + '" data-lt-lang="ku" value="' + esc(entry.ku) + '"' + (entry.ku ? "" : ' placeholder="بلا ترجمة"') + '></td>'
        + '<td>' + (override ? status("معدّلة", "amber") : '<span class="read-only">أصلية</span>') + '</td>'
        + '</tr>';
    }).join("");
    var table = shown.length
      ? '<div class="table-wrap lang-table"><table><thead><tr><th scope="col">العربية (المصدر)</th><th scope="col">English</th><th scope="col">کوردی سۆرانی</th><th scope="col">الحالة</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        + (filtered.length > 150 ? '<div class="form-note">يعرض أول 150 من ' + filtered.length + ' نتيجة — ضيّق البحث للوصول للبقية.</div>' : "")
      : empty("لا نتائج", "لا توجد عبارات مطابقة للبحث أو الفلتر.");
    var controls = '<div class="report-filters">'
      + '<label>بحث في العبارات <input class="input" type="text" data-action="lang-filter" value="' + esc(langSearchFilter) + '" placeholder="اكتب جزءًا من العبارة بأي لغة ثم اضغط Enter"></label>'
      + '<label>عرض <select data-action="lang-miss-filter"><option value=""' + (langMissFilter === "" ? " selected" : "") + '>كل العبارات</option><option value="en"' + (langMissFilter === "en" ? " selected" : "") + '>بلا إنجليزية</option><option value="ku"' + (langMissFilter === "ku" ? " selected" : "") + '>بلا كردية</option><option value="any"' + (langMissFilter === "any" ? " selected" : "") + '>الناقصة (أي لغة)</option></select></label>'
      + '<button class="btn btn-primary btn-sm" type="button" data-action="save-languages">حفظ تعديلات اللغة</button>'
      + '</div>';
    return pageHead("جدول اللغات", "لوحة تحكم الترجمة", "العبارات الثلاث مقابل بعض للتأكد من اللغة: عدّل أي خلية ثم احفظ — التعديل يظهر فورًا في كل الشاشات. إجمالي العبارات: " + keys.length + " (بلا إنجليزية: " + missingEn + " · بلا كردية: " + missingKu + ").", "")
      + boundary() + card("العربية × English × کوردی", "التعديلات تُحفظ في هذا المتصفح فوق القاموس الأساسي", controls + table);
  }

  function saveLanguageEdits() {
    var inputs = document.querySelectorAll("#page-content input[data-lt-key]");
    var grouped = {};
    inputs.forEach(function (input) {
      var key = input.getAttribute("data-lt-key");
      grouped[key] = grouped[key] || {};
      grouped[key][input.getAttribute("data-lt-lang")] = input.value.trim();
    });
    var changed = 0;
    Object.keys(grouped).forEach(function (key) {
      var base = (window.EMICP_DICT || {})[key];
      var baseEn = (base && base[0]) || "";
      var baseKu = (base && base[1]) || "";
      var edit = grouped[key];
      var override = {};
      if (edit.ar != null && edit.ar !== "" && edit.ar !== key) override.ar = edit.ar;
      if (edit.en != null && edit.en !== baseEn) { if (edit.en !== "") override.en = edit.en; }
      if (edit.ku != null && edit.ku !== baseKu) { if (edit.ku !== "") override.ku = edit.ku; }
      var existing = (state.langOverrides || {})[key];
      var same = JSON.stringify(existing || {}) === JSON.stringify(override);
      if (Object.keys(override).length) { if (!same) { state.langOverrides[key] = override; changed += 1; } }
      else if (existing) { delete state.langOverrides[key]; changed += 1; }
    });
    langCache = {};
    saveState();
    renderApp();
    showToast(changed ? "حُفظ " + changed + " تعديل لغة — يطبق فورًا على كل الشاشات." : "لا تغييرات لغة للحفظ.", changed ? "success" : "error");
  }

  function renderAdmin() {
    var labels = {
      setup: "تهيئة النظام", productMaster: "تعريف المنتجات", materialMaster: "تعريف المواد الأولية",
      workflow: "عرض المسار العام", forecasts: "عرض Forecast", weekly: "الخطة الأسبوعية", monthly: "المتابعة الشهرية", fgView: "عرض المتاح للبيع",
      materials: "احتياجات المواد", execution: "Production Actual", requirements: "طلبات المواد",
      procurement: "التزامات الشراء", rmStock: "مستودع المواد الأولية", receipts: "استلام المواد", fgReceipts: "استلام FG",
      fgStock: "مخزون FG", finance: "المراقبة المالية", reports: "التقارير", agentOrders: "أوردرات الوكلاء", agentMaster: "تعريف الوكلاء",
      issues: "المشكلات والإجراءات", audit: "سجل الأحداث", executive: "داشبورد الإدارة"
    };
    var roleChoices = {
      sales: ["workflow", "agentOrders", "forecasts", "weekly", "monthly", "reports", "fgView", "issues"],
      production: ["workflow", "forecasts", "weekly", "monthly", "materials", "execution", "reports", "fgView", "issues"],
      procurement: ["workflow", "requirements", "procurement", "rmStock", "packingStock", "reports", "issues"],
      rmWarehouse: ["workflow", "materials", "rmStock", "receipts", "packingStock", "packingReceipts", "reports", "issues"],
      fgWarehouse: ["workflow", "weekly", "fgReceipts", "fgStock", "reports", "issues"],
      finance: ["finance", "monthly", "rmStock", "procurement", "fgStock", "reports", "audit", "issues"],
      executive: ["executive", "monthly", "agentOrders", "reports", "issues", "audit"]
    };
    var cards = Object.keys(roleChoices).map(function (role) {
      var active = state.permissions[role] || ["home"];
      var toggles = roleChoices[role].map(function (page) {
        var locked = pageProtectedForRole(role, page);
        var granted = active.indexOf(page) !== -1 && !locked;
        return '<button type="button" class="permission-toggle ' + (locked ? "locked" : granted ? "active" : "") + '" data-action="toggle-permission" data-role="' + role + '" data-page-key="' + page + '" aria-pressed="' + (granted ? "true" : "false") + '"' + (locked ? ' disabled aria-disabled="true"' : "") + '><i aria-hidden="true">' + (locked ? "×" : granted ? "✓" : "+") + '</i><span>' + esc(labels[page] || pageLabels[page]) + (locked ? " — محظور" : "") + '</span></button>';
      }).join("");
      return '<article class="permission-card"><h3>' + esc(roleName(role)) + '</h3>' + toggles + '</article>';
    }).join("");
    var userRows = (state.users || []).map(function (user) {
      var isLastAdmin = user.role === "admin" && user.active !== false && activeAdminCount(user.id) === 0;
      return '<tr>'
        + '<td><strong>' + esc(user.name) + '</strong></td>'
        + '<td>' + esc(roleName(user.role)) + '</td>'
        + '<td>' + (user.active === false ? status("موقوف — لا يظهر في لوحة الدخول", "gray") : status("فعال", "green")) + (user.id === state.currentUserId ? '<br><small>المستخدم الحالي</small>' : "") + '</td>'
        + '<td>' + (user.passHash ? status("محمي بكلمة مرور", "green") : status("بلا كلمة مرور", "amber")) + '</td>'
        + '<td>' + (user.createdAt ? stepDate("الإنشاء", user.createdAt) : '<span class="read-only">افتراضي</span>') + '</td>'
        + '<td><button class="btn btn-secondary btn-sm" type="button" data-action="toggle-user" data-id="' + esc(user.id) + '"' + (isLastAdmin ? " disabled" : "") + '>' + (user.active === false ? "تفعيل" : "إيقاف الظهور") + '</button><button class="btn btn-danger btn-sm" type="button" data-action="delete-user" data-id="' + esc(user.id) + '"' + (isLastAdmin ? " disabled" : "") + '>حذف</button><button class="btn btn-secondary btn-sm" type="button" data-action="set-password" data-id="' + esc(user.id) + '">كلمة المرور</button></td>'
        + '</tr>';
    }).join("");
    var usersCard = card("إدارة المستخدمين (" + state.users.length + ")", "إضافة وحذف وإيقاف ظهور المستخدمين — الموقوف لا يظهر في لوحة الدخول",
      '<div class="table-wrap"><table><thead><tr><th scope="col">الاسم</th><th scope="col">الدور</th><th scope="col">الحالة</th><th scope="col">كلمة المرور</th><th scope="col">الإنشاء</th><th scope="col">الإجراء</th></tr></thead><tbody>' + userRows + '</tbody></table></div><div class="form-note">لا يمكن حذف أو إيقاف آخر مسؤول نظام فعال حتى لا تُقفل لوحة التحكم.</div>',
      '<button class="btn btn-primary btn-sm" type="button" data-action="new-users">إضافة مستخدمين</button>');
    var branding = state.branding || {};
    var brandingCard = card("الهوية واللوغو والثيم", "اسم الشركة واللوغو يظهران في الواجهة ولوحة الدخول، ولون الثيم يطبق فورًا",
      '<div class="branding-grid">'
      + '<div class="field"><label for="brand-name-input">اسم الشركة</label><input class="input" id="brand-name-input" type="text" value="' + esc(brandName()) + '"></div>'
      + '<div class="field"><label>اللوغو</label><div class="branding-logo-row">' + brandMarkHtml() + '<label class="btn btn-secondary btn-sm file-button">رفع اللوغو<input type="file" accept="image/*" data-action="branding-logo"></label>' + (branding.logo ? '<button class="btn btn-danger btn-sm" type="button" data-action="remove-logo">إزالة اللوغو</button>' : "") + '</div><small class="read-only">صورة حتى 300KB — تُحفظ داخل المتصفح.</small></div>'
      + '<div class="field"><label for="brand-color-input">لون الثيم</label><div class="branding-logo-row"><input id="brand-color-input" type="color" value="' + esc(/^#[0-9a-fA-F]{6}$/.test(branding.themeColor || "") ? branding.themeColor : "#103f4a") + '" data-action="branding-color"><button class="btn btn-secondary btn-sm" type="button" data-action="reset-theme">استعادة اللون الافتراضي</button></div><small class="read-only">اختيار اللون يطبق فورًا على الشريط والأزرار.</small></div>'
      + '</div>',
      '<button class="btn btn-primary btn-sm" type="button" data-action="save-branding">حفظ الهوية</button>');
    var demoOn = state.demoMode !== false;
    var demoCard = card("وضع العرض التجريبي", "يتحكم في ظهور مبدّل الدور «تجربة دور» في الشريط العلوي",
      '<div class="form-note' + (demoOn ? "" : " locked") + '"><strong>الحالة: ' + (demoOn ? "مفعّل — كل مستخدم يستطيع تبديل الدور للعرض والتجربة." : "مطفأ — تبديل الدور لمسؤول النظام وحده، وكل مستخدم محصور بدوره.") + '</strong><br>أطفئه قبل أي تشغيل حقيقي في المصنع: عندها يعمل كل قسم داخل صلاحياته فقط، وتُقيَّد كل عملية بدور صاحبها في سجل التدقيق.</div>',
      '<button class="btn ' + (demoOn ? "btn-danger" : "btn-primary") + ' btn-sm" type="button" data-action="toggle-demo-mode">' + (demoOn ? "إطفاء وضع العرض" : "تفعيل وضع العرض") + '</button>');
    var dashboardCards = (state.users || []).map(function (user) {
      var widgets = HOME_DASHBOARD_WIDGETS[user.role] || [];
      var widgetSettings = homeDashboardWidgetsForUser(user);
      var visibleCount = widgets.filter(function (widget) { return widgetSettings[widget.key] !== false; }).length;
      var toggles = widgets.map(function (widget) {
        var visible = widgetSettings[widget.key] !== false;
        return '<button type="button" class="permission-toggle ' + (visible ? "active" : "") + '" data-action="toggle-dashboard-widget" data-dashboard-kind="home" data-user-id="' + esc(user.id) + '" data-widget="' + esc(widget.key) + '" aria-pressed="' + (visible ? "true" : "false") + '"><i aria-hidden="true">' + (visible ? "✓" : "+") + '</i><span>' + esc(widget.label) + '</span></button>';
      }).join("");
      var executiveGranted = (state.permissions[user.role] || []).indexOf("executive") !== -1 && !pageProtectedForRole(user.role, "executive");
      var executiveToggles = executiveGranted ? EXEC_WIDGETS.map(function (widget) {
        var visible = dashboardWidgetVisibleForUser(user, widget.key);
        return '<button type="button" class="permission-toggle ' + (visible ? "active" : "") + '" data-action="toggle-dashboard-widget" data-dashboard-kind="executive" data-user-id="' + esc(user.id) + '" data-widget="' + esc(widget.key) + '" aria-pressed="' + (visible ? "true" : "false") + '"><i aria-hidden="true">' + (visible ? "✓" : "+") + '</i><span>' + esc(widget.label) + '</span></button>';
      }).join("") : "";
      var homeControls = widgets.length ? '<p>لوحة العمل الرئيسية: ' + visibleCount + '/' + widgets.length + ' أقسام ظاهرة</p>' + toggles + '<button class="btn btn-secondary btn-sm" type="button" data-action="show-all-dashboard-widgets" data-dashboard-kind="home" data-user-id="' + esc(user.id) + '">إظهار أقسام الرئيسية</button>' : '';
      return '<article class="permission-card dashboard-account-card"><h3>' + esc(user.name) + '</h3><p>' + esc(roleName(user.role)) + '</p>'
        + homeControls
        + (executiveToggles ? '<hr><p>Dashboard الإدارة</p>' + executiveToggles + '<button class="btn btn-secondary btn-sm" type="button" data-action="show-all-dashboard-widgets" data-dashboard-kind="executive" data-user-id="' + esc(user.id) + '">إظهار أقسام الإدارة</button>' : '') + '</article>';
    }).join("");
    var dashboardAccessCard = card("لوحة عمل لكل حساب", "تظهر لكل قسم لوحة رئيسية تناسب مهامه فقط؛ حدّد الأقسام التي يحتاجها كل مستخدم. أما Dashboard الإدارة فتظهر فقط للحسابات المصرّح لها بها ضمن الحدود المحمية.", '<section class="dashboard-account-grid">' + dashboardCards + '</section>');
    var backup = state.backupSettings || {};
    var backupCard = card("النسخ الاحتياطي", "صدّر نسخة كاملة قابلة للحفظ خارج المتصفح. التذكير والنسخ التلقائي اختياريان.",
      '<div class="facts"><div class="fact"><span>آخر نسخة يدوية</span><strong>' + esc(displayTimestamp(backup.lastManualBackupAt)) + '</strong></div><div class="fact"><span>آخر أرشيف تلقائي</span><strong>' + esc(backup.lastAutoBackupDate || "غير مفعّل") + '</strong></div></div><div class="form-note">النسخ التلقائي يُحفظ كأرشيف محلي داخل هذا المتصفح من تاريخ البدء المحدد؛ لتنزيل ملف مستقل استخدم «تنزيل نسخة الآن».</div>',
      '<button class="btn btn-primary btn-sm" type="button" data-action="export-backup">تنزيل نسخة الآن</button><button class="btn btn-secondary btn-sm" type="button" data-action="backup-settings">إعدادات النسخ</button>');
    return pageHead("System Admin", "المستخدمون والهوية والصلاحيات", "أضف المستخدمين وأوقفهم، وخصص اللوغو ولون الثيم، وامنح الشاشات ضمن حدود العمل المحمية.", "") + boundary() + backupCard + demoCard + usersCard + dashboardAccessCard + brandingCard + '<section class="permission-grid">' + cards + '</section>';
  }

  function openBackupSettings() {
    var settings = state.backupSettings || {};
    var body = '<div class="form-grid"><div class="field full"><label><input type="checkbox" name="backupReminder"' + (settings.reminderEnabled ? " checked" : "") + '> تذكير يومي اختياري لتنزيل نسخة احتياطية</label></div><div class="field full"><label><input type="checkbox" name="backupAuto"' + (settings.autoEnabled ? " checked" : "") + '> نسخ تلقائي محلي اختياري</label><small>لا يستطيع المتصفح تنزيل ملف تلقائيًا من دون نقرة؛ لذلك يحفظ التطبيق أرشيفًا محليًا مستقلًا كل يوم.</small></div><div class="field"><label for="backup-start-date">بدء النسخ التلقائي من تاريخ</label><input class="input" id="backup-start-date" type="date" name="backupStartDate" value="' + esc(settings.autoStartDate || "") + '"><small>اختياري؛ اتركه فارغًا للبدء اليوم عند التفعيل.</small></div></div>';
    openDialog(dialogShell("إعدادات النسخ الاحتياطي", "كل الخيارات اختيارية ويمكن تغييرها أو إيقافها لاحقًا.", body, "حفظ الإعدادات", "backup-settings-form"));
  }

  function openPasswordForm(userId) {
    var user = state.users.find(function (item) { return item.id === userId; });
    if (!user) { showToast("تعذر العثور على المستخدم.", "error"); return; }
    var body = '<input type="hidden" name="pwUser" value="' + esc(user.id) + '"><div class="form-grid"><div class="field full"><label for="pw-value">كلمة المرور الجديدة للمستخدم ' + esc(user.name) + '</label><input class="input" id="pw-value" type="password" name="pwValue" placeholder="4 أحرف على الأقل — اتركها فارغة لإزالة كلمة المرور"></div></div><div class="form-note">' + (user.passHash ? "المستخدم محمي حاليًا بكلمة مرور؛ الحقل الفارغ يزيلها فيدخل مباشرة." : "لا كلمة مرور حاليًا؛ بعد التعيين ستُطلب في لوحة الدخول.") + '</div>';
    openDialog(dialogShell("كلمة المرور — " + user.name, "تُطلب في لوحة الدخول عند كل دخول.", body, "حفظ كلمة المرور", "password-form"));
  }

  function openUserForm() {
    var roleOptionsHtml = Object.keys(roles).map(function (key) { return '<option value="' + key + '">' + esc(roles[key].name) + '</option>'; }).join("");
    var rows = [];
    for (var i = 0; i < 5; i += 1) {
      rows.push('<tr><td><input class="input" type="text" name="uName_' + i + '" placeholder="اسم المستخدم"></td><td><select class="select" name="uRole_' + i + '">' + roleOptionsHtml + '</select></td><td><input class="input" type="password" name="uPass_' + i + '" placeholder="4 أحرف على الأقل أو فارغ"></td></tr>');
    }
    var body = '<input type="hidden" name="uCount" value="5"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">الاسم</th><th scope="col">الدور</th><th scope="col">كلمة المرور</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div><div class="form-note">جدول واحد لإضافة عدة مستخدمين دفعة واحدة — اترك الصفوف الزائدة فارغة. كلمة المرور اختيارية: من دونها يدخل المستخدم مباشرة، ويمكن تعيينها لاحقًا من زر «كلمة المرور».</div>';
    openDialog(dialogShell("إضافة مستخدمين", "كل مستخدم باسم ودور، ويظهر مباشرة في لوحة الدخول.", body, "إضافة المستخدمين", "user-form"), "wide");
  }

  function parseCsvText(text) {
    var rows = [], row = [], cell = "", quoted = false;
    text = String(text || "").replace(/^\uFEFF/, "");
    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell.trim()); cell = "";
        if (row.some(function (value) { return value !== ""; })) rows.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell.trim());
    if (row.some(function (value) { return value !== ""; })) rows.push(row);
    return rows;
  }

  // ملفات Excel XML 2003: تعمل مباشرة في Excel وتحافظ على ألوان الخلايا،
  // من دون إضافة مكتبة خارجية إلى النموذج المحلي. يقبلها المستورد أيضًا كملف .xls.
  function xmlEsc(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
  function downloadExcelXml(filename, rows) {
    var styles = '<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/></Style><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#103F4A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style><Style ss:ID="red"><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Font ss:Color="#7F1D1D" ss:Bold="1"/></Style><Style ss:ID="green"><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/><Font ss:Color="#14532D" ss:Bold="1"/></Style><Style ss:ID="yellow"><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Font ss:Color="#78350F" ss:Bold="1"/></Style></Styles>';
    var xmlRows = (rows || []).map(function (row, rIndex) {
      return '<Row>' + row.map(function (cell) {
        var item = cell && typeof cell === "object" && Object.prototype.hasOwnProperty.call(cell, "value") ? cell : { value: cell, style: rIndex === 0 ? "header" : "" };
        var numeric = typeof item.value === "number" && Number.isFinite(item.value);
        return '<Cell' + ((item.style || (rIndex === 0 ? "header" : "")) ? ' ss:StyleID="' + xmlEsc(item.style || "header") + '"' : "") + '><Data ss:Type="' + (numeric ? "Number" : "String") + '">' + xmlEsc(item.value) + '</Data></Cell>';
      }).join("") + '</Row>';
    }).join("");
    var xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' + styles + '<Worksheet ss:Name="EMICP"><Table>' + xmlRows + '</Table></Worksheet></Workbook>';
    return downloadTextFile(filename, xml, "application/vnd.ms-excel");
  }

  // ملف موحد للمخزن: يخرج من التطبيق وفيه حقيقة ما يحتاجه مدير المخزن
  // ليعيده بعد تعبئة الموجود والتوالف والسعة. الحقول القابلة للتعديل بالأحمر.
  function downloadWarehouseFile(category) {
    category = category === "packing" ? "packing" : "raw";
    var codes = [];
    state.rawMaterials.filter(function (master) { return master.category === category && master.active !== false; }).forEach(function (master) {
      var code = normalizeCode(master.code);
      if (codes.indexOf(code) === -1) codes.push(code);
    });
    if (!codes.length) { showToast("لا توجد مواد مطلوبة في هذا المستودع بعد.", "error"); return; }
    var rows = [["material_code", "material_name", "unit", "required_qty", "available_qty", "expiry_date", "waste_qty", "waste_reason", "can_store_yes_no", "storage_capacity"]];
    codes.forEach(function (code) {
      var records = materialRecordsSameCode(code).filter(function (record) { return (record.category || "raw") === category; });
      var master = rawMasterByCode(code, category);
      var sample = records[0] || { material: master && master.name || "", unit: master && master.unit || "" };
      var reference = records.find(function (record) { return record.stockConfirmed; }) || sample;
      var latestWaste = (state.wasteRecords || []).filter(function (item) { return normalizeCode(item.materialCode) === code; }).sort(function (a, b) { return String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")); })[0];
      rows.push([
        code, sample.material || (master && master.name) || "", sample.unit || (master && master.unit) || "",
        records.reduce(function (sum, record) { return sum + Number(record.required || 0); }, 0),
        { value: reference && reference.stockConfirmed ? materialAvailable(reference) : "", style: "red" },
        { value: reference && reference.expiryDate || "", style: "red" },
        { value: latestWaste ? Number(latestWaste.qty || 0) : "", style: "red" },
        { value: latestWaste ? wasteReasonLabel(latestWaste.reason) : "", style: "red" },
        { value: master && master.storageCapacity != null ? "نعم" : "", style: "red" },
        { value: master && master.storageCapacity != null ? Number(master.storageCapacity) : "", style: "red" }
      ]);
    });
    var filename = category === "packing" ? "EMICP-warehouse-packaging-review.xls" : "EMICP-warehouse-raw-materials-review.xls";
    if (downloadExcelXml(filename, rows)) showToast("نُزّل ملف المخزن. الخانات الحمراء هي التي يملؤها أو يعدلها مدير المخزن.", "success");
  }

  async function importWarehouseFile(file, category) {
    category = category === "packing" ? "packing" : "raw";
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var changed = 0, skipped = 0, stamp = currentTimestamp();
    rows.forEach(function (row) {
      var code = normalizeCode(firstField(row, ["material_code", "code", "كود_المادة", "كود"]));
      var master = rawMasterByCode(code, category);
      var records = materialRecordsSameCode(code).filter(function (record) { return (record.category || "raw") === category; });
      if (!code || !master) { skipped += 1; return; }
      var qtyRaw = String(firstField(row, ["available_qty", "on_hand", "الكمية_المتوفرة", "المتوفر"]) || "").trim();
      var expiry = String(firstField(row, ["expiry_date", "تاريخ_الصلاحية", "تاريخ_الانتهاء"]) || "").trim();
      var capacityRaw = String(firstField(row, ["storage_capacity", "الكمية_القادر_على_استيعابها", "السعة"]) || "").trim();
      var canStore = String(firstField(row, ["can_store_yes_no", "قدرة_الاستيعاب", "هل_يمكن_الاستيعاب"]) || "").trim().toLowerCase();
      var wasteRaw = String(firstField(row, ["waste_qty", "كمية_التوالف", "التوالف"]) || "").trim();
      var wasteReasonRaw = String(firstField(row, ["waste_reason", "سبب_التوالف", "السبب"]) || "").trim().toLowerCase();
      if (qtyRaw && !validNumber(qtyRaw, true)) { skipped += 1; return; }
      if (capacityRaw && !validNumber(capacityRaw, true)) { skipped += 1; return; }
      if (wasteRaw && !validNumber(wasteRaw, true)) { skipped += 1; return; }
      if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) { skipped += 1; return; }
      var onHand = qtyRaw ? Number(qtyRaw) : Number(records[0] && records[0].onHand || 0);
      if (qtyRaw) master.openingQty = onHand;
      records.forEach(function (record) {
        record.onHand = onHand; record.reserved = 0; record.hold = 0; record.expiryDate = expiry || record.expiryDate || "";
        record.stockConfirmed = true; record.stockConfirmedAt = stamp; record.status = materialShortage(record) > 0 ? "shortage" : "available";
      });
      if (/^(نعم|yes|y|1)$/i.test(canStore)) master.storageCapacity = capacityRaw ? Number(capacityRaw) : master.storageCapacity;
      if (/^(لا|no|n|0)$/i.test(canStore)) master.storageCapacity = 0;
      if (wasteRaw && Number(wasteRaw) > 0) {
        var wasteReason = /انتهاء|expiry/.test(wasteReasonRaw) ? "expiry" : /كسر|break/.test(wasteReasonRaw) ? "breakage" : /فقد|loss/.test(wasteReasonRaw) ? "loss" : /جود|quality|رفض/.test(wasteReasonRaw) ? "quality" : /تلف|damage/.test(wasteReasonRaw) ? "damage" : "other";
        state.wasteRecords.unshift({ id: createId("WST"), materialCode: code, material: master.name, unit: master.unit, qty: Number(wasteRaw), reason: wasteReason, note: "مرفوع ضمن ملف المخزن", date: stamp.slice(0, 10), recordedAt: stamp, by: roleName(state.role) });
      }
      changed += 1;
    });
    if (!changed) throw new Error("لم تُحدّث أي مادة. تحقق من عمود material_code ومن أن الملف يخص هذا المستودع.");
    if (!window.confirm("نتيجة ملف المخزن قبل الحفظ:\nمواد محدّثة: " + changed + "\nصفوف متجاوزة: " + skipped + "\n\nهل تريد حفظ الملف؟")) return;
    state.warehouseReviews[category] = { status: "uploaded", at: stamp, by: roleName(state.role) };
    addAudit("رفع ملف المخزن: " + changed + " مادة", roleName(state.role));
    refresh("تم حفظ ملف المخزن. اضغط «إرسال للإنتاج» بعد المراجعة." + (skipped ? " تجاوز " + skipped + " صفًا غير مطابق." : ""));
  }

  function warehouseReviewCard(category) {
    category = category === "packing" ? "packing" : "raw";
    var review = (state.warehouseReviews || {})[category];
    if (!review) return "";
    var label = category === "packing" ? "مواد التغليف" : "المواد الأولية";
    var text = review.status === "uploaded" ? "تم رفع الملف وحفظه؛ بانتظار إرساله للإنتاج" : review.status === "sent_production" ? "أرسل المخزن الملف للإنتاج للمراجعة" : review.status === "returned_warehouse" ? "أعاد الإنتاج الملف إلى المخزن للتأكيد" : review.status === "confirmed" ? "أكد المخزن الملف؛ بانتظار تحويل الإنتاج للمشتريات" : review.status === "released_procurement" ? "حوّل الإنتاج الملف إلى المشتريات" : "ملف المخزن قيد الإعداد";
    var actions = "";
    if (state.role === "rmWarehouse" && review.status === "uploaded") actions = '<button class="btn btn-primary btn-sm" type="button" data-action="warehouse-send" data-category="' + category + '">إرسال للإنتاج</button>';
    if (state.role === "production" && review.status === "sent_production") actions = '<button class="btn btn-secondary btn-sm" type="button" data-action="warehouse-return" data-category="' + category + '">إعادة الملف للمخزن للتأكيد</button>';
    if (state.role === "rmWarehouse" && review.status === "returned_warehouse") actions = '<button class="btn btn-primary btn-sm" type="button" data-action="warehouse-confirm" data-category="' + category + '">تأكيد ملف المخزن</button>';
    if (state.role === "production" && review.status === "confirmed") actions = '<button class="btn btn-primary btn-sm" type="button" data-action="warehouse-release" data-category="' + category + '">تحويل للمشتريات</button>';
    return card("ملف مراجعة المخزن — " + label, text + (review.at ? " · " + displayTimestamp(review.at) : ""), '<div class="form-note">أي تغيير في ملف Excel يظهر بخلفية حمراء لتسهيل المراجعة.</div>', actions);
  }

  function parseSpreadsheetXml(text) {
    var doc = new DOMParser().parseFromString(String(text || ""), "application/xml");
    var rows = Array.prototype.slice.call(doc.getElementsByTagName("Row"));
    return rows.map(function (row) {
      return Array.prototype.slice.call(row.getElementsByTagName("Cell")).map(function (cell) {
        var data = cell.getElementsByTagName("Data")[0];
        return data ? data.textContent : "";
      });
    }).filter(function (row) { return row.some(function (value) { return String(value || "").trim() !== ""; }); });
  }

  function columnIndex(reference) {
    var letters = String(reference || "A1").match(/[A-Z]+/i);
    return (letters ? letters[0].toUpperCase() : "A").split("").reduce(function (value, letter) { return value * 26 + letter.charCodeAt(0) - 64; }, 0) - 1;
  }

  function zipDirectory(buffer) {
    var view = new DataView(buffer), bytes = new Uint8Array(buffer), decoder = new TextDecoder("utf-8"), eocd = -1;
    for (var i = Math.max(0, buffer.byteLength - 65557); i <= buffer.byteLength - 22; i += 1) {
      if (view.getUint32(i, true) === 0x06054b50) eocd = i;
    }
    if (eocd < 0) throw new Error("ملف Excel غير صالح.");
    var count = view.getUint16(eocd + 10, true), offset = view.getUint32(eocd + 16, true), entries = {};
    for (var n = 0; n < count; n += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      var nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true);
      var name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      entries[name] = { method: view.getUint16(offset + 10, true), size: view.getUint32(offset + 20, true), localOffset: view.getUint32(offset + 42, true) };
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function unzipText(buffer, entry) {
    var view = new DataView(buffer), bytes = new Uint8Array(buffer), offset = entry.localOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error("تعذر قراءة ملف Excel.");
    var nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
    var packed = bytes.slice(offset + 30 + nameLength + extraLength, offset + 30 + nameLength + extraLength + entry.size);
    if (entry.method === 0) return new TextDecoder("utf-8").decode(packed);
    if (entry.method !== 8) throw new Error("نوع ضغط ملف Excel غير مدعوم.");
    if (window.pako && typeof window.pako.inflateRaw === "function") {
      return new TextDecoder("utf-8").decode(window.pako.inflateRaw(packed));
    }
    if (typeof DecompressionStream !== "undefined") {
      try {
        var stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new TextDecoder("utf-8").decode(await new Response(stream).arrayBuffer());
      } catch (error) { /* use the clear compatibility error below */ }
    }
    throw new Error("تعذر فك ضغط Excel في هذا المتصفح؛ استخدم CSV أو افتح النموذج في متصفح حديث.");
  }

  async function parseXlsxBuffer(buffer) {
    var entries = zipDirectory(buffer);
    var sheetName = Object.keys(entries).filter(function (name) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(name); }).sort()[0];
    if (!sheetName) throw new Error("لم يتم العثور على ورقة بيانات في ملف Excel.");
    var shared = [];
    if (entries["xl/sharedStrings.xml"]) {
      var sharedXml = new DOMParser().parseFromString(await unzipText(buffer, entries["xl/sharedStrings.xml"]), "application/xml");
      shared = Array.prototype.slice.call(sharedXml.getElementsByTagName("si")).map(function (item) {
        return Array.prototype.slice.call(item.getElementsByTagName("t")).map(function (node) { return node.textContent; }).join("");
      });
    }
    var sheetXml = new DOMParser().parseFromString(await unzipText(buffer, entries[sheetName]), "application/xml");
    return Array.prototype.slice.call(sheetXml.getElementsByTagName("row")).map(function (rowNode) {
      var row = [];
      Array.prototype.slice.call(rowNode.getElementsByTagName("c")).forEach(function (cellNode) {
        var type = cellNode.getAttribute("t"), valueNode = cellNode.getElementsByTagName("v")[0], value = "";
        if (type === "s" && valueNode) value = shared[Number(valueNode.textContent)] || "";
        else if (type === "inlineStr") value = Array.prototype.slice.call(cellNode.getElementsByTagName("t")).map(function (node) { return node.textContent; }).join("");
        else if (valueNode) value = valueNode.textContent;
        row[columnIndex(cellNode.getAttribute("r"))] = value;
      });
      return row;
    }).filter(function (row) { return row.some(function (value) { return String(value || "").trim() !== ""; }); });
  }

  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function spreadsheetObjects(rows) {
    if (!rows.length) return [];
    var headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map(function (row) {
      var item = {};
      headers.forEach(function (header, index) { if (header) item[header] = row[index] == null ? "" : String(row[index]).trim(); });
      return item;
    }).filter(function (item) { return Object.keys(item).some(function (key) { return item[key] !== ""; }); });
  }

  function firstField(row, names) {
    for (var i = 0; i < names.length; i += 1) if (row[names[i]] != null && row[names[i]] !== "") return row[names[i]];
    return "";
  }

  async function readSpreadsheetFile(file) {
    var name = String(file.name || "").toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) throw new Error("اختر ملف Excel بصيغة XLSX أو XLS أو ملف CSV فقط.");
    var rows = name.endsWith(".csv") ? parseCsvText(await file.text()) : name.endsWith(".xls") ? parseSpreadsheetXml(await file.text()) : await parseXlsxBuffer(await file.arrayBuffer());
    return spreadsheetObjects(rows);
  }

  function downloadAgentOrdersTemplate() {
    var agents = activeAgents();
    var products = state.products.filter(function (item) { return item.active !== false; });
    if (!agents.length || !products.length) { showToast("عرّف الوكلاء والمنتجات أولًا.", "error"); return; }
    var workbookRows = [["agent_code", "order_date", "month", "product_code", "qty", "price", "note"]];
    var sampleMonth = defaultForecastMonths()[0];
    agents.slice(0, 2).forEach(function (agent) {
      products.slice(0, 3).forEach(function (product) {
        workbookRows.push([agent.code, currentTimestamp().slice(0, 10), sampleMonth, product.code, "", "", ""]);
      });
    });
    if (!downloadExcelXml("EMICP-agent-orders-template.xls", workbookRows)) return;
    showToast("نُزّل تمبليت أوردرات الوكلاء؛ صف لكل (وكيل × منتج) — عبّئ الكميات ثم ارفعه.", "success");
  }

  // رفع أوردرات الوكلاء: كل صف سطر أوردر، وتُجمَّع الأسطر بحسب (وكيل + شهر + تاريخ) في أوردر واحد.
  async function importAgentOrdersFile(file) {
    if (state.role !== "sales") throw new Error("تسجيل أوردرات الوكلاء للمبيعات فقط.");
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var grouped = {};
    var skipped = 0;
    rows.forEach(function (row) {
      var agentCode = normalizeCode(firstField(row, ["agent_code", "agent", "كود_الوكيل", "الوكيل"]));
      var productCode = normalizeCode(firstField(row, ["product_code", "product", "كود_المنتج", "المنتج"]));
      var qtyRaw = String(firstField(row, ["qty", "quantity", "الكمية"]) || "").trim();
      var monthRaw = normalizeMonthCell(firstField(row, ["month", "delivery_month", "الشهر", "شهر_التسليم"]));
      var dateRaw = String(firstField(row, ["order_date", "date", "تاريخ_الأوردر", "التاريخ"]) || "").trim();
      var agent = agentByCode(agentCode);
      var product = state.products.find(function (item) { return normalizeCode(item.code) === productCode && item.active !== false; });
      if (!agent || agent.active === false || !product || !monthRaw || qtyRaw === "" || !validNumber(qtyRaw, false)) { skipped += 1; return; }
      var orderDate = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : currentTimestamp().slice(0, 10);
      var key = agent.code + "|" + monthRaw + "|" + orderDate;
      grouped[key] = grouped[key] || { agentCode: agent.code, month: monthRaw, orderDate: orderDate, lines: [] };
      var priceRaw = String(firstField(row, ["price", "السعر"]) || "").trim();
      grouped[key].lines.push({ productCode: product.code, qty: Number(qtyRaw), price: priceRaw !== "" && validNumber(priceRaw, true) ? Number(priceRaw) : null, month: monthRaw, note: String(firstField(row, ["note", "ملاحظة"]) || "").trim() });
    });
    var keys = Object.keys(grouped);
    if (!keys.length) throw new Error("لم يُقبل أي صف. تحقق من كود الوكيل وكود المنتج والشهر والكمية.");
    keys.forEach(function (key) {
      var group = grouped[key];
      var order = { id: createId("AO"), agentCode: group.agentCode, orderDate: group.orderDate, month: group.month, note: "مستورد من ملف", status: "confirmed", lines: group.lines, createdAt: currentTimestamp() };
      state.agentOrders.unshift(order);
    });
    addAudit("استيراد " + keys.length + " أوردر وكيل من Excel", roleName(state.role));
    refresh("استُوردت " + keys.length + " أوردرات وكلاء" + (skipped ? " وتُجوهل " + skipped + " صفًا غير صالح." : "."));
  }

  // قالب التعريفات يولَّد لحظيًا بكل الأعمدة الحالية (بما فيها التفاصيل الموسعة) فلا يتقادم أبدًا.
  var MASTER_TEMPLATE_COLUMNS = {
    agents: ["code", "name", "region", "contact", "phone", "note"],
    cities: ["code", "name"],
    products: ["code", "name", "unit"],
    materials: ["code", "name", "category"]
  };

  function downloadMasterTemplate(kind, forcedCategory) {
    var columns = MASTER_TEMPLATE_COLUMNS[kind];
    if (!columns) { showToast("نوع التعريف غير معروف.", "error"); return; }
    var csvCell = function (value) {
      var text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    };
    var workbookRows = [columns];
    if (kind === "agents") {
      var agentSample = state.agents.length ? state.agents : [{ code: "AG-001", name: "وكيل بغداد", region: "بغداد", contact: "", phone: "", note: "" }];
      agentSample.forEach(function (item) { workbookRows.push([item.code, item.name, item.region || "", item.contact || "", item.phone || "", item.note || ""]); });
    } else if (kind === "cities") {
      var citySample = state.cities.length ? state.cities : [{ code: "BAGHDAD", name: "بغداد" }];
      citySample.forEach(function (item) { workbookRows.push([item.code, item.name]); });
    } else if (kind === "products") {
      var productSample = state.products.length ? state.products : [{ code: "PRD-001", name: "منتج تجريبي", unit: "كرتون" }];
      productSample.forEach(function (item) { workbookRows.push([item.code, item.name, item.unit]); });
    } else {
      var materialSample = state.rawMaterials.filter(function (item) { return !forcedCategory || item.category === forcedCategory; });
      if (!materialSample.length) materialSample = forcedCategory === "packing" ? [{ code: "PK-001", name: "كوب", category: "packing" }] : [{ code: "RM-001", name: "سكر", category: "raw" }];
      materialSample.forEach(function (item) {
        workbookRows.push([item.code, item.name, item.category || "raw"]);
      });
    }
    var templateName = kind === "products" ? "EMICP-products-template.xls" : kind === "agents" ? "EMICP-agents-template.xls" : kind === "cities" ? "EMICP-cities-template.xls" : "EMICP-materials-template.xls";
    if (!downloadExcelXml(templateName, workbookRows)) return;
    showToast("نُزّل القالب بـ" + columns.length + " عمودًا؛ أدخل الحقول المطلوبة فقط.", "success");
  }

  async function importMasterFile(file, kind, forcedCategory) {
    if (kind !== "products" && kind !== "materials" && kind !== "agents" && kind !== "cities") throw new Error("نوع التعريف غير معروف.");
    if (kind === "cities") {
      var cityRows = await readSpreadsheetFile(file);
      var citiesBeforeImport = clone(state.cities);
      var cityExisting = state.cities.map(function (item) { return normalizeCode(item.code); });
      var cityAdded = 0, citySkipped = 0;
      cityRows.forEach(function (row) {
        var importCityCode = normalizeCode(firstField(row, ["code", "city_code", "الكود", "كود_المدينة"]));
        var importCityName = String(firstField(row, ["name", "city_name", "الاسم", "اسم_المدينة"]) || "").trim();
        if (!validMasterCode(importCityCode) || !importCityName || cityExisting.indexOf(importCityCode) !== -1) { citySkipped += 1; return; }
        state.cities.push({ code: importCityCode, name: importCityName, createdAt: currentTimestamp() });
        cityExisting.push(importCityCode); cityAdded += 1;
      });
      if (!cityAdded) throw new Error("لم تُضف مدن. تحقق من عمودي code وname والأكواد الفريدة.");
      if (!window.confirm("نتيجة ملف المدن قبل الحفظ:\nإجمالي الصفوف: " + cityRows.length + "\nمدن صالحة للإضافة: " + cityAdded + "\nصفوف متجاوزة: " + citySkipped + "\n\nهل تريد حفظ هذه النتيجة؟")) { state.cities = citiesBeforeImport; showToast("أُلغي الحفظ؛ لم تُضف أي مدينة."); return; }
      addAudit("استيراد " + cityAdded + " مدينة من Excel", roleName(state.role));
      refresh("تم استيراد " + cityAdded + " مدينة" + (citySkipped ? " وتجاوز " + citySkipped + " صف غير صالح أو مكرر." : "."));
      return;
    }
    if (kind === "agents") {
      var agentRows = await readSpreadsheetFile(file);
      var agentsBeforeImport = clone(state.agents);
      var agentExisting = state.agents.map(function (item) { return normalizeCode(item.code); });
      var agentAdded = 0, agentSkipped = 0;
      agentRows.forEach(function (row) {
        var code = normalizeCode(firstField(row, ["code", "agent_code", "الكود", "كود_الوكيل"]));
        var name = firstField(row, ["name", "agent_name", "الاسم", "اسم_الوكيل"]);
        var region = String(firstField(row, ["region", "المنطقة", "المحافظة", "المدينة"]) || "").trim();
        if (!code || !name || !region || agentExisting.indexOf(code) !== -1 || !/^[A-Z0-9_-]+$/.test(code) || !state.cities.some(function (city) { return city.name === region; })) { agentSkipped += 1; return; }
        state.agents.push({
          code: code, name: String(name).trim(), region: region,
          contact: String(firstField(row, ["contact", "جهة_الاتصال"]) || "").trim(), phone: String(firstField(row, ["phone", "الهاتف"]) || "").trim(),
          note: String(firstField(row, ["note", "ملاحظة"]) || "").trim(), active: true, createdAt: currentTimestamp()
        });
        agentExisting.push(code); agentAdded += 1;
      });
      if (!agentAdded) throw new Error("لم تُضف سجلات. عرّف المدن أولًا ثم تحقق من أعمدة code وname وregion والأكواد الفريدة.");
      if (!window.confirm("نتيجة الملف قبل الحفظ:\nإجمالي الصفوف: " + agentRows.length + "\nسجلات صالحة للإضافة: " + agentAdded + "\nصفوف متجاوزة: " + agentSkipped + "\n\nهل تريد حفظ هذه النتيجة؟")) { state.agents = agentsBeforeImport; showToast("أُلغي الحفظ؛ لم تُضف أي سجلات."); return; }
      addAudit("استيراد " + agentAdded + " وكيل من Excel", roleName(state.role));
      refresh("تم استيراد " + agentAdded + " وكيل" + (agentSkipped ? " وتجاوز " + agentSkipped + " صف غير صالح أو مكرر." : "."));
      return;
    }
    var rows = await readSpreadsheetFile(file), target = kind === "products" ? state.products : state.rawMaterials;
    var productsBeforeImport = clone(state.products), materialsBeforeImport = clone(state.rawMaterials);
    // المنتجات النهائية والمواد جدولان مستقلان: لا يجوز أن يرفض استيراد منتج
    // لأن الكود نفسه موجود في جدول مواد، والعكس صحيح.
    // التعريفان مستقلان: يجوز أن يظهر الكود نفسه مرة في المواد الأولية ومرة
    // في مواد التغليف. التكرار الممنوع هو داخل القسم الذي يجري استيراده فقط.
    var existing = (kind === "products" ? state.products : state.rawMaterials.filter(function (item) {
      return !forcedCategory || item.category === forcedCategory;
    })).map(function (item) { return normalizeCode(item.code); });
    var added = 0, quantityUpdated = 0, skipped = 0, duplicateCodes = 0, invalidRows = 0;
    rows.forEach(function (row) {
      var code = normalizeCode(firstField(row, ["code", "product_code", "material_code", "الكود", "كود", "كود_المنتج", "كود_المادة"]));
      var name = firstField(row, ["name", "product_name", "material_name", "material", "الاسم", "اسم_المنتج", "اسم_المادة", "المادة", "مادة"]);
      var unit = firstField(row, ["unit", "uom", "الوحدة", "وحدة_القياس"]);
      var openingQtyRaw = kind === "materials" ? String(firstField(row, ["opening_qty", "on_hand", "qty", "quantity", "الكمية", "الرصيد"]) || "").trim() : "";
      if (!code || !name || (kind === "products" && !unit) || !/^[A-Z0-9_-]+$/.test(code)) { skipped += 1; invalidRows += 1; return; }
      if (existing.indexOf(code) !== -1) {
        // عند استيراد ملف من شاشة تعريف منفصلة، قد تكون المواد قد دخلت سابقًا
        // في التعريف الآخر قبل إضافة الفصل. انقلها بدل رفض الملف كله.
        var existingMaterial = kind === "materials" && state.rawMaterials.find(function (item) {
          return normalizeCode(item.code) === code && (!forcedCategory || item.category === forcedCategory);
        });
        if (existingMaterial && openingQtyRaw !== "" && validNumber(openingQtyRaw, true)) {
          var uploadedQty = Number(openingQtyRaw);
          if (existingMaterial.openingQty !== uploadedQty) {
            existingMaterial.openingQty = uploadedQty;
            existingMaterial.updatedAt = currentTimestamp();
            // الرصيد المؤكد لا يُمس؛ تُحدَّث فقط السجلات التي ما زالت بانتظار تأكيد المخزن.
            materialRecordsSameCode(code).filter(function (record) { return !record.stockConfirmed; }).forEach(function (record) { record.onHand = uploadedQty; });
            quantityUpdated += 1;
          }
        }
        if (existingMaterial && openingQtyRaw !== "" && validNumber(openingQtyRaw, true)) return;
        skipped += 1; duplicateCodes += 1; return;
      }
      var masterEntry = { code: code, name: name, unit: kind === "materials" ? String(unit || "وحدة") : unit, active: true, createdAt: currentTimestamp() };
      if (kind === "materials") {
        masterEntry.openingQty = openingQtyRaw !== "" && validNumber(openingQtyRaw, true) ? Number(openingQtyRaw) : null;
        var catRaw = String(firstField(row, ["category", "النوع", "التصنيف"]) || "").trim().toLowerCase();
        masterEntry.category = forcedCategory === "packing" ? "packing" : forcedCategory === "raw" ? "raw" : (/pack|تغليف|باكينغ|باكنك/.test(catRaw) ? "packing" : "raw");
        masterEntry.purchaseUnit = String(firstField(row, ["purchase_unit", "وحدة_الشراء"]) || "").trim();
        masterEntry.packType = String(firstField(row, ["pack_type", "نوع_العبوة"]) || "").trim();
        masterEntry.packSize = String(firstField(row, ["pack_size", "المقاس"]) || "").trim();
        masterEntry.supplier = String(firstField(row, ["supplier", "المورد"]) || "").trim();
        masterEntry.originCountry = String(firstField(row, ["origin", "origin_country", "بلد_المنشأ"]) || "").trim();
        masterEntry.currency = String(firstField(row, ["currency", "العملة"]) || "").trim();
        masterEntry.qualityNote = String(firstField(row, ["quality_note", "ملاحظة_جودة"]) || "").trim();
        var storageRaw = String(firstField(row, ["storage", "التخزين"]) || "").trim().toLowerCase();
        masterEntry.storage = /froz|مجمد/.test(storageRaw) ? "frozen" : /chill|مبرد/.test(storageRaw) ? "chilled" : /dry|جاف/.test(storageRaw) ? "dry" : "";
        [["conversion_factor", "conversionFactor"], ["pieces_per_carton", "piecesPerCarton"], ["price", "approxPrice"], ["moq", "moq"], ["shelf_life_days", "shelfLifeDays"]].forEach(function (pair) {
          var numRaw = String(firstField(row, [pair[0]]) || "").trim();
          masterEntry[pair[1]] = numRaw !== "" && validNumber(numRaw, true) ? Number(numRaw) : null;
        });
      }
      target.push(masterEntry); existing.push(code); added += 1;
    });
    if (!added && !quantityUpdated) throw new Error("لم تُضف سجلات في جدول " + (kind === "products" ? "المنتجات النهائية" : "المواد") + ": " + (duplicateCodes ? duplicateCodes + " كود مكرر داخل هذا القسم نفسه. " : "") + (invalidRows ? invalidRows + " صف بلا كود أو اسم صالح" + (kind === "products" ? " أو وحدة قياس" : "") + "." : "") + " الملف يحتاج code وname" + (kind === "products" ? " وunit" : "") + ".");
    var importedLabel = kind === "products" ? "المنتجات النهائية" : (forcedCategory === "packing" ? "مواد التغليف" : "المواد الأولية");
    var materialAccepted = kind === "materials" ? added : added;
    var skippedDetails = skipped ? "\nتفصيل المتجاوزة: " + duplicateCodes + " كود مكرر في جدول " + importedLabel + " نفسه، " + invalidRows + " صف ناقص أو غير صالح." : "";
    var acceptedSummary = kind === "materials" ? "\nإجمالي المواد التي ستصبح في هذا القسم: " + materialAccepted : "\nسجلات مضافة: " + added;
    if (!window.confirm("نتيجة ملف " + importedLabel + " قبل الحفظ:\nإجمالي الصفوف: " + rows.length + acceptedSummary + "\nسجلات جديدة فعلًا: " + added + "\nكميات مواد محدّثة: " + quantityUpdated + "\nصفوف متجاوزة: " + skipped + skippedDetails + "\n\nلا تُقارن هذه النتيجة بجدول " + (kind === "products" ? "المواد" : "المنتجات النهائية") + ".\n\nهل تريد حفظ هذه النتيجة؟")) { state.products = productsBeforeImport; state.rawMaterials = materialsBeforeImport; showToast("أُلغي الحفظ؛ لم تُضف أي سجلات."); return; }
    addAudit("استيراد " + added + (kind === "products" ? " منتج" : " مادة") + " من Excel", roleName(state.role));
    refresh("نتيجة الاستيراد: قرأ " + rows.length + " صفًا؛ " + (kind === "materials" ? "أضاف " + materialAccepted + " مادة إلى " + (forcedCategory === "packing" ? "مواد التغليف" : "المواد الأولية") : "أضاف " + added + " سجل") + "، وحدّث كمية " + quantityUpdated + " مادة" + (skipped ? " وتجاوز " + skipped + " صف غير صالح أو مكرر." : "."));
  }

  var dialogDirty = false;

  function attemptCloseDialog() {
    var dialog = document.getElementById("app-dialog");
    if (dialog && dialog.open && dialogDirty && !window.confirm("إغلاق النافذة وفقدان ما أدخلته؟")) return;
    closeDialog();
  }

  function openDialog(html, size) {
    var dialog = document.getElementById("app-dialog");
    dialogDirty = false;
    dialog.classList.remove("dialog-wide");
    if (size === "wide") dialog.classList.add("dialog-wide");
    document.getElementById("dialog-content").innerHTML = localizeHtml(html);
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else {
        dialog.setAttribute("open", "");
        dialog.classList.add("dialog-fallback");
      }
    }
    enhanceDataTables(document.getElementById("dialog-content"), "dialog#");
    refreshWeeklySelection();
    window.setTimeout(function () {
      var first = dialog.querySelector("input, select, textarea, button");
      if (first) first.focus();
    }, 0);
  }

  function closeDialog() {
    var dialog = document.getElementById("app-dialog");
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.classList.remove("dialog-fallback");
    }
    dialog.classList.remove("dialog-wide");
    document.getElementById("dialog-content").innerHTML = "";
    dialogDirty = false;
  }

  function dialogShell(title, copy, body, submitLabel, formId, noValidate, submitAction) {
    var submitAttributes = submitAction ? 'type="button" data-action="' + esc(submitAction) + '"' : 'type="button" data-action="submit-dialog-form" data-form-id="' + esc(formId) + '"';
    var errorBlock = noValidate ? "" : '<div class="form-error dialog-form-error" id="' + esc(formId) + '-error" role="alert" aria-live="polite"></div>';
    var forecastActions = submitAction === "save-and-send-forecast"
      ? '<button class="btn btn-primary" type="button" data-action="save-forecast-draft">حفظ كمسودة</button>'
      : '<button class="btn btn-primary" ' + submitAttributes + '>' + esc(submitLabel) + '</button>';
    return '<form id="' + esc(formId) + '" novalidate><header class="dialog-head"><div><h2 id="dialog-title">' + esc(title) + '</h2><p>' + esc(copy) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + errorBlock + '</div><footer class="dialog-foot"><button class="btn btn-secondary" type="button" data-action="close-dialog">إلغاء</button>' + forecastActions + '</footer></form>';
  }

  function setDialogFormError(form, message) {
    var error = form && document.getElementById(form.id + "-error");
    if (error) error.textContent = message || "";
    if (message) showToast(message, "error");
  }

  function submitDialogForm(form) {
    if (!form) { showToast("تعذر تنفيذ التسجيل. أغلق النافذة وافتحها مجددًا.", "error"); return; }
    if (typeof form.requestSubmit === "function") { form.requestSubmit(); return; }
    if (typeof form.dispatchEvent === "function" && typeof Event === "function") {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return;
    }
    showToast("تعذر تنفيذ التسجيل في هذا المتصفح.", "error");
  }

  function showToast(message, kind) {
    var region = document.getElementById("toast-region");
    var toast = document.createElement("div");
    toast.className = "toast " + (kind || "");
    toast.textContent = localizeText(message);
    region.appendChild(toast);
    window.setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3600);
  }

  function refresh(message, kind) {
    saveState();
    renderApp();
    if (message) showToast(message, kind || "success");
  }

  function navigate(page) {
    if (!canAccess(page)) {
      showToast("هذه الشاشة خارج صلاحيات الدور الحالي.", "error");
      return;
    }
    state.page = page;
    saveState();
    renderApp();
    var main = document.getElementById("main-content");
    if (main) main.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function validMasterCode(value) {
    return /^[A-Z0-9_-]{1,32}$/.test(normalizeCode(value));
  }

  function validNumber(value, allowZero) {
    if (value == null || String(value).trim() === "") return false;
    var number = Number(value);
    return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0);
  }

  function validDateRange(start, end) {
    return /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start;
  }

  // بالتوقيت المحلي لا العالمي: toISOString كان يُرجع تاريخ الأمس قبل الثالثة فجرًا في بغداد،
  // فينزلق تجميد الأسبوع يومًا كاملًا.
  function toDateInput(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function dateDaysFromNow(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return toDateInput(date);
  }

  function shiftDate(dateText, days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ""))) return "";
    var parts = String(dateText).split("-");
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    date.setDate(date.getDate() + days);
    return toDateInput(date);
  }

  function currentTimestamp() {
    var date = new Date();
    var local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16).replace("T", " ");
  }

  function displayTimestamp(value) {
    return value ? String(value).replace("T", " ") : "غير مسجل";
  }

  function stepDate(label, value) {
    return '<span class="step-date"><b>' + esc(label) + ':</b> <time>' + esc(displayTimestamp(value)) + '</time></span>';
  }

  function masterCodeExists(code) {
    return state.products.concat(state.rawMaterials).some(function (item) { return normalizeCode(item.code) === normalizeCode(code); });
  }

  function codeExistsIn(list, code) {
    return (list || []).some(function (item) { return normalizeCode(item.code) === normalizeCode(code); });
  }

  function productSelectOptions(selected) {
    return '<option value="">اختر المنتج من التعريفات</option>' + state.products.filter(function (item) { return item.active !== false; }).map(function (item) {
      return '<option value="' + esc(item.code) + '"' + (item.code === selected ? " selected" : "") + '>' + esc(item.code + " · " + item.name + " · " + item.unit) + '</option>';
    }).join("");
  }

  function openProductForm() {
    var body = '<div class="form-grid"><div class="field"><label for="product-code">الكود الفريد</label><input class="input code-input" id="product-code" name="code" maxlength="32" pattern="[A-Za-z0-9_-]+" placeholder="مثال: PRD-001" required><small>حروف إنجليزية وأرقام و- أو _ فقط</small></div><div class="field"><label for="product-unit">وحدة القياس</label><input class="input" id="product-unit" name="unit" placeholder="مثال: كرتون أو كغم" required></div><div class="field full"><label for="product-name">اسم المنتج</label><input class="input" id="product-name" name="name" placeholder="اسم المنتج الكامل" required></div></div>';
    openDialog(dialogShell("إضافة منتج", "سيظهر هذا المنتج داخل Dropdown الـForecast.", body, "حفظ المنتج", "product-master-form"));
  }

  function openMasterEditForm(kind, code) {
    var list = kind === "product" ? state.products : state.rawMaterials;
    var item = list.find(function (record) { return normalizeCode(record.code) === normalizeCode(code); });
    if (!item) { showToast("تعذر العثور على التعريف.", "error"); return; }
    var formId = kind === "product" ? "product-edit-form" : "raw-material-edit-form";
    var unitField = kind === "product" ? '<div class="field"><label for="edit-unit">وحدة القياس</label><input class="input" id="edit-unit" name="unit" value="' + esc(item.unit) + '" required></div>' : '';
    var body = '<div class="form-grid"><input type="hidden" name="code" value="' + esc(item.code) + '"><div class="field"><label>الكود الفريد (لا يتغير)</label><input class="input" value="' + esc(item.code) + '" disabled></div>' + unitField + '<div class="field full"><label for="edit-name">الاسم</label><input class="input" id="edit-name" name="name" value="' + esc(item.name) + '" required></div><div class="field"><label for="edit-active">الحالة</label><select class="select" id="edit-active" name="active"><option value="true"' + (item.active === false ? "" : " selected") + '>فعال</option><option value="false"' + (item.active === false ? " selected" : "") + '>غير فعال</option></select></div></div><div class="form-note">تعطيل التعريف يخفيه من القوائم الجديدة دون المساس بالسجلات التاريخية المرتبطة به.</div>';
    if (kind !== "product") body += materialDetailFieldsHtml(item);
    openDialog(dialogShell(kind === "product" ? "تعديل منتج" : "تعديل مادة", kind === "product" ? "الكود ثابت؛ يمكن تعديل الاسم والوحدة والحالة." : "الكود ثابت؛ يمكن تعديل الاسم والنوع والحالة.", body, "حفظ التعديل", formId), kind === "product" ? undefined : "wide");
  }

  // وصفة الباكينغ لكل منتج: كم تستهلك وحدة المنتج الواحدة من كل مادة تغليف — تغذي الحساب التلقائي للاحتياجات.
  function openPackingBomForm(productCode) {
    var product = state.products.find(function (item) { return normalizeCode(item.code) === normalizeCode(productCode); });
    if (!product) { showToast("تعذر العثور على التعريف.", "error"); return; }
    var packingMaterials = state.rawMaterials.filter(function (item) { return item.active !== false && item.category === "packing"; });
    if (!packingMaterials.length) { showToast("لا توجد مواد مصنفة «باكينغ وتغليف» بعد — عدّل موادك في تعريف المواد الأولية وصنّفها أولًا.", "error"); return; }
    var bom = Array.isArray(product.packingBom) ? product.packingBom : [];
    var rows = packingMaterials.map(function (mat, index) {
      var entry = bom.find(function (record) { return normalizeCode(record.materialCode) === normalizeCode(mat.code); });
      // الاشتقاق من «القطع في الكرتون» يمنع خطأ إدخال المقلوب يدويًا (24 بدل 0.041667 = خطأ ×576).
      var suggested = Number(mat.piecesPerCarton) > 0 ? roundQty(1 / Number(mat.piecesPerCarton)) : null;
      var suggestNote = suggested != null
        ? '<br><small class="read-only">الكرتون ' + formatNumber(mat.piecesPerCarton) + ' قطعة ⇐ المقترح ' + suggested + '</small>'
          + '<button class="btn btn-secondary btn-sm" type="button" data-action="apply-bom-suggestion" data-target="pbQty_' + index + '" data-value="' + esc(String(suggested)) + '">استخدم المقترح</button>'
        : "";
      return '<tr><td><strong class="code-chip">' + esc(mat.code) + '</strong><br><small>' + esc(mat.name) + (mat.packType ? ' · ' + esc(mat.packType) + (mat.packSize ? ' ' + esc(mat.packSize) : '') : '') + '</small><input type="hidden" name="pbCode_' + index + '" value="' + esc(mat.code) + '"></td><td>' + esc(mat.unit) + '</td><td><input class="input plan-cell-input" name="pbQty_' + index + '" type="number" min="0" step="any" inputmode="decimal" value="' + (entry ? esc(String(entry.qtyPerUnit)) : (suggested != null ? esc(String(suggested)) : "")) + '" placeholder="0">' + suggestNote + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="pbProduct" value="' + esc(product.code) + '"><input type="hidden" name="pbCount" value="' + packingMaterials.length + '">'
      + '<div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">مادة التغليف</th><th scope="col">الوحدة</th><th scope="col">الكمية لكل وحدة منتج</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-note">مثال: كوب = 1، غطاء = 1، كرتون 24 قطعة = 0.041667 (يُشتق تلقائيًا من «القطع في الكرتون» متى عُرِّفت). الفارغ يزيل المادة من الوصفة. هذه الوصفة تعريف إداري مرجعي؛ مدير الإنتاج يرفع كميات الاحتياج فقط ولا يراها أو يعدّلها من شاشة الاستيراد.</div>';
    openDialog(dialogShell("وصفة الباكينغ — " + product.code + " · " + product.name, "استهلاك وحدة المنتج الواحدة من مواد التغليف.", body, "حفظ الوصفة", "packing-bom-form"), "wide");
  }

  // ===== التفاصيل الموسعة للمواد الأولية (Schema 20): تصنيف ووحدات وباكينغ ومورد وتخزين =====
  var MATERIAL_CATEGORIES = { raw: "مواد أولية", packing: "مواد تغليف" };
  var STORAGE_TYPES = { "": "غير محدد", dry: "تخزين جاف", chilled: "مبرد", frozen: "مجمد" };

  function materialCategoryLabel(category) {
    return MATERIAL_CATEGORIES[category] || MATERIAL_CATEGORIES.raw;
  }

  function materialCategoryBadge(category) {
    var tone = category === "packing" ? "amber" : "blue";
    return status(materialCategoryLabel(category), tone);
  }

  function materialDetailFieldsHtml(item) {
    item = item || {};
    var categoryOptions = Object.keys(MATERIAL_CATEGORIES).map(function (key) {
      return '<option value="' + key + '"' + ((item.category || "raw") === key ? " selected" : "") + '>' + esc(MATERIAL_CATEGORIES[key]) + '</option>';
    }).join("");
    return '<div class="form-grid"><div class="field"><label for="rm-category">النوع</label><select class="select" id="rm-category" name="rmCategory">' + categoryOptions + '</select></div></div>';
  }

  function applyMaterialDetails(data, item, form) {
    var category = String(data.get("rmCategory") || "raw");
    item.category = MATERIAL_CATEGORIES[category] ? category : "raw";
    return true;
  }

  function openRawMaterialForm(category) {
    category = category === "packing" ? "packing" : "raw";
    var body = '<div class="form-grid"><input type="hidden" name="rmCategory" value="' + category + '"><div class="field"><label for="raw-code">الكود الفريد</label><input class="input code-input" id="raw-code" name="code" maxlength="32" pattern="[A-Za-z0-9_-]+" placeholder="مثال: ' + (category === "packing" ? "PK-001" : "RM-001") + '" required><small>حروف إنجليزية وأرقام و- أو _ فقط</small></div><div class="field full"><label for="raw-name">اسم المادة</label><input class="input" id="raw-name" name="name" placeholder="اسم المادة الكامل" required></div></div>';
    openDialog(dialogShell(category === "packing" ? "إضافة مادة تغليف" : "إضافة مادة أولية", "سيختارها الإنتاج بكودها عند إضافة احتياج المواد.", body, "حفظ المادة", "raw-material-master-form"));
  }

  function forecastGridHtml(months, valueOf, noteOf, cellStateOf) {
    var actives = state.products.filter(function (item) { return item.active !== false; });
    var head = '<tr><th>المنتج</th>' + months.map(function (month) { return '<th class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th>ملاحظة المنتج</th></tr>';
    var rows = actives.map(function (product, pIndex) {
      var cells = months.map(function (month, mIndex) {
        var cellId = "fq-" + pIndex + "-" + mIndex;
        var cellState = cellStateOf ? cellStateOf(product.code, month) : null;
        var cellClass = cellState && cellState.className ? " " + cellState.className : "";
        var cellData = cellState && cellState.data ? cellState.data : "";
        return '<td><label class="sr-only" for="' + cellId + '">كمية ' + esc(product.name) + ' في ' + esc(monthLabel(month)) + '</label><input class="input plan-cell-input month-qty-input forecast-sales-cell' + cellClass + '" id="' + cellId + '" name="fq_' + pIndex + '_' + mIndex + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(valueOf(product.code, month)) + '" placeholder="0"' + cellData + '></td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(product.code) + '</strong><br><small>' + esc(product.name) + ' · ' + esc(product.unit) + '</small><input type="hidden" name="fqProduct_' + pIndex + '" value="' + esc(product.code) + '"></td>' + cells + '<td><label class="sr-only" for="fnote-' + pIndex + '">ملاحظة ' + esc(product.name) + '</label><input class="input plan-cell-input" id="fnote-' + pIndex + '" name="fnote_' + pIndex + '" value="' + esc(noteOf(product.code)) + '" placeholder="اختياري"></td></tr>';
    }).join("");
    return '<input type="hidden" name="fqProductCount" value="' + actives.length + '"><input type="hidden" name="gridMonths" value="' + esc(months.join(",")) + '"><div class="table-wrap plan-entry-table forecast-grid-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  // يقرأ الكميات الحالية من الجدول قبل إعادة بنائه عند تغيير الأشهر حتى لا تضيع المدخلات.
  function readForecastGridValues(form) {
    var values = {}, notes = {};
    if (!form) return { values: values, notes: notes };
    var data = new FormData(form);
    var count = Number(data.get("fqProductCount") || 0);
    var months = String(data.get("gridMonths") || "").split(",").filter(Boolean);
    for (var p = 0; p < count; p += 1) {
      var code = normalizeCode(data.get("fqProduct_" + p));
      if (!code) continue;
      values[code] = {};
      months.forEach(function (month, mIndex) {
        var raw = data.get("fq_" + p + "_" + mIndex);
        var trimmed = String(raw == null ? "" : raw).trim();
        if (trimmed !== "") values[code][month] = trimmed;
      });
      notes[code] = String(data.get("fnote_" + p) || "");
    }
    return { values: values, notes: notes };
  }

  function rebuildForecastGrid() {
    var form = document.getElementById("forecast-form");
    var container = document.getElementById("forecast-month-grid");
    if (!form || !container) return;
    var data = new FormData(form);
    var months = monthsBetween(String(data.get("fromMonth") || ""), String(data.get("toMonth") || ""));
    if (!months.length) return;
    var current = readForecastGridValues(form);
    container.innerHTML = localizeHtml(forecastGridHtml(months, function (code, month) {
      return current.values[code] && current.values[code][month] != null ? current.values[code][month] : "";
    }, function (code) { return current.notes[code] || ""; }));
  }

  function defaultForecastMonths() {
    var today = dateDaysFromNow(0);
    var parts = today.split("-");
    var endDate = new Date(Number(parts[0]), Number(parts[1]) - 1 + 11, 1);
    var endKey = endDate.getFullYear() + "-" + ("0" + (endDate.getMonth() + 1)).slice(-2);
    return monthsBetween(monthKeyOf(today), endKey);
  }

  function openForecastForm(editId, prefill) {
    if (!state.products.length) { showToast("عرّف المنتجات في تهيئة النظام قبل إنشاء Forecast.", "error"); return; }
    var editing = editId ? state.forecasts.find(function (item) { return item.id === editId; }) : null;
    if (editId && !editing) { showToast("تعذر العثور على المستند.", "error"); return; }
    if (editing && (editing.status === "fixed" || editing.status === "cancelled")) { showToast("لا يمكن تعديل مستند مثبت أو ملغى؛ أنشئ Forecast جديدًا.", "error"); return; }
    var months = prefill && prefill.months && prefill.months.length ? prefill.months : editing && editing.months.length ? editing.months : defaultForecastMonths();
    var priority = prefill ? prefill.priority : editing ? editing.priority : "";
    var generalNote = prefill ? prefill.note || "" : editing ? editing.note || "" : "";
    var prOption = function (label) { return '<option' + (priority === label ? " selected" : "") + '>' + label + '</option>'; };
    var valueOf = function (code, month) {
      if (prefill) return prefill.values[normalizeCode(code)] && prefill.values[normalizeCode(code)][month] != null ? prefill.values[normalizeCode(code)][month] : "";
      if (!editing) return "";
      var line = editing.items.find(function (item) { return normalizeCode(item.productCode) === normalizeCode(code); });
      return line && line.monthlyQty && Number(line.monthlyQty[month]) > 0 ? line.monthlyQty[month] : "";
    };
    var noteOf = function (code) {
      if (prefill) return prefill.notes && prefill.notes[normalizeCode(code)] || "";
      if (!editing) return "";
      var line = editing.items.find(function (item) { return normalizeCode(item.productCode) === normalizeCode(code); });
      return line ? line.note || "" : "";
    };
    var importTools = '<div class="bulk-tools"><div><strong>استيراد الكميات من Excel</strong><p>حمّل التمبليت الجاهز بأشهر مستندك ومنتجاتك، عبّئه، ثم ارفعه — أو ارفع أي ملف واربط أعمدته (Data Mapping).</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-forecast-template">تحميل التمبليت (حسب الأشهر المحددة)</button><a class="btn btn-secondary btn-sm" href="EMICP-forecast-import-template.xlsx" download>قالب Excel عام</a><label class="btn btn-secondary btn-sm file-button">رفع ملف Excel/CSV<input type="file" accept=".xlsx,.xls,.csv" data-action="import-forecast"></label></div>';
    var importSummary = prefill && prefill.importSummary;
    var importSummaryHtml = importSummary
      ? '<section class="plan-table-summary" aria-label="ملخص الملف قبل الحفظ"><div><span>نتيجة الملف</span><strong>' + esc(importSummary.rowsLabel || "تمت قراءة الملف") + '</strong></div><div><span>الإجمالي الكلي</span><strong>' + formatNumber(importSummary.total || 0) + '</strong></div>' + (importSummary.months || []).map(function (entry) { return '<div><span>' + esc(monthLabel(entry.month)) + '</span><strong>' + formatNumber(entry.qty) + '</strong></div>'; }).join("") + '</section><div class="form-note locked">هذه نتيجة الاستيراد قبل الحفظ. راجعها والكميات في الجدول، ثم احفظ كمسودة أولًا أو احفظ وأرسل للإنتاج.</div>'
      : "";
    var financeEditing = state.role === "finance" && editing && editing.status === "finance_review";
    var body = '<input type="hidden" name="forecastMode" value="' + (financeEditing ? "finance" : "draft") + '">' + (editing ? '<input type="hidden" name="editForecastId" value="' + esc(editing.id) + '">' : "")
      + '<div class="form-grid"><div class="field"><label for="fc-from">من شهر</label><input class="input" id="fc-from" name="fromMonth" type="month" value="' + esc(months[0]) + '" data-action="forecast-range" required></div><div class="field"><label for="fc-to">إلى شهر</label><input class="input" id="fc-to" name="toMonth" type="month" value="' + esc(months[months.length - 1]) + '" data-action="forecast-range" required></div><div class="field"><label for="fc-priority">الأولوية</label><select class="select" id="fc-priority" name="priority">' + prOption("عادية") + prOption("عالية") + prOption("حرجة") + '</select></div><div class="field full"><label for="fc-note">ملاحظة عامة</label><input class="input" id="fc-note" name="note" value="' + esc(generalNote) + '" placeholder="معلومة تجارية مؤثرة على كامل Forecast"></div></div>'
      + importSummaryHtml
      + importTools
      + '<div id="forecast-month-grid">' + forecastGridHtml(months, valueOf, noteOf, editing && editing.status === "production_feedback" ? function (code, month) { var key = forecastCellKey(code, month); var changed = (editing.productionChanges || {})[key]; return { className: changed ? "forecast-cell-red" : "", data: ' data-production-value="' + esc(forecastCellQty(editing.items, code, month)) + '" data-production-changed="' + (changed ? "1" : "0") + '"' }; } : null) + '</div>'
      + '<div class="form-note">أدخل كمية كل منتج في كل شهر واترك ما لا تحتاجه فارغًا. تغيير «من/إلى شهر» يعيد بناء الجدول مع الحفاظ على ما أدخلته، والاستيراد من Excel يعبئ الجدول للمراجعة قبل الإرسال.</div>' + (editing && editing.status === "production_feedback" ? '<div class="form-note locked">ألوان مراجعة رد الإنتاج: الأحمر = تعديل الإنتاج، الأخضر = وافقت عليه المبيعات كما هو، الأصفر = عدّلته المبيعات بعد تعديل الإنتاج. أي تغيير آخر من المبيعات يظهر بالأحمر.</div>' : '') + '<div class="form-note locked">المستند الواحد يغطي السنة شهرًا بشهر، ولا توجد فيه أي حقول مواد أولية أو مورد أو مخزون.</div>';
    openDialog(dialogShell(editing ? "تعديل " + editing.id + " — إصدار جديد" : "Forecast سنوي شهرًا بشهر", financeEditing ? "عدّل الكميات أو ارفع نسخة مالية معدلة؛ ثم أرسلها للمبيعات للمراجعة." : "راجع النتيجة ثم احفظها كمسودة. بعد الحفظ يظهر زر مستقل لإرسالها للإنتاج.", body, financeEditing ? "حفظ وإرسال للمبيعات" : "حفظ كمسودة", "forecast-form", false, "save-and-send-forecast"), "wide");
  }

  // استيراد Forecast بربط الأعمدة: يلتقط وضع النموذج الحالي، يقرأ الملف، ثم يفتح شاشة الربط.
  var forecastImportContext = null;

  async function beginForecastImport(file) {
    var form = document.getElementById("forecast-form");
    if (!form) { showToast("افتح نافذة Forecast أولًا.", "error"); return; }
    var data = new FormData(form);
    var months = String(data.get("gridMonths") || "").split(",").filter(Boolean);
    if (!months.length) { showToast("حدد الأشهر أولًا قبل الاستيراد.", "error"); return; }
    var current = readForecastGridValues(form);
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    // تحويل رؤوس التواريخ التسلسلية من Excel إلى صيغة YYYY-MM قبل الربط.
    var serialMap = {};
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (key) {
        if (serialMap[key] !== undefined) return;
        serialMap[key] = excelSerialHeaderToMonth(key) || "";
      });
    });
    if (Object.keys(serialMap).some(function (key) { return serialMap[key]; })) {
      rows = rows.map(function (row) {
        var converted = {};
        Object.keys(row).forEach(function (key) { converted[serialMap[key] || key] = row[key]; });
        return converted;
      });
    }
    var headers = [];
    rows.forEach(function (row) { Object.keys(row).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
    forecastImportContext = {
      editId: String(data.get("editForecastId") || "") || null,
      months: months,
      values: current.values,
      notes: current.notes,
      priority: String(data.get("priority") || ""),
      note: String(data.get("note") || ""),
      rows: rows,
      headers: headers
    };
    openForecastImportMap();
  }

  // تمبليت الاستيراد: يولَّد لحظيًا حسب الأشهر المحددة في النافذة ومنتجاتك المعرفة،
  // فتأتي الأعمدة مطابقة تمامًا ويلتقطها الربط التلقائي بلا أي ضبط.
  function downloadForecastTemplate() {
    var form = document.getElementById("forecast-form");
    if (!form) { showToast("افتح نافذة Forecast أولًا.", "error"); return; }
    var data = new FormData(form);
    var months = String(data.get("gridMonths") || "").split(",").filter(Boolean);
    if (!months.length) { showToast("حدد الأشهر أولًا ثم حمّل التمبليت.", "error"); return; }
    var actives = state.products.filter(function (item) { return item.active !== false; });
    if (!actives.length) { showToast("عرّف المنتجات أولًا.", "error"); return; }
    var rows = [["product_code", "product_name"].concat(months)].concat(actives.map(function (product) { return [product.code, product.name].concat(months.map(function () { return ""; })); }));
    if (!downloadExcelXml("EMICP-forecast-template-" + months[0] + "_" + months[months.length - 1] + ".xls", rows)) return;
    showToast("نُزّل التمبليت بأعمدة " + months.length + " شهرًا و" + actives.length + " منتجًا؛ عبّئ الكميات ثم ارفعه.", "success");
  }

  // Excel يحول رؤوس الأشهر المكتوبة "2026-09" إلى تواريخ تُخزن أرقامًا تسلسلية —
  // نعيدها هنا إلى صيغة الشهر حتى تنجح المطابقة التلقائية مهما فعل Excel.
  function excelSerialHeaderToMonth(header) {
    var match = /^(\d{4,5})(?:\.0+)?$/.exec(String(header || "").trim());
    if (!match) return "";
    var serial = Number(match[1]);
    if (serial < 32874 || serial > 73050) return "";
    var date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
  }

  function guessProductHeader(headers) {
    var candidates = ["product_code", "code", "الكود", "كود", "كود_المنتج", "المنتج", "product"];
    for (var i = 0; i < candidates.length; i += 1) if (headers.indexOf(candidates[i]) !== -1) return candidates[i];
    return "";
  }

  // ===== التعرّف على أعمدة الأشهر في ملف خارجي =====
  // الصيغة السابقة كانت تفهم 2026-10 فقط، فملفات ERP التي تكتب 10_2027 أو Oct-26
  // كانت تصل إلى النافذة بكل الأشهر على "تجاهل" ويربطها المستخدم يدويًا اثني عشر مرة.
  function headerMonthParts(header) {
    var text = String(header == null ? "" : header).replace(/\s+/g, " ").trim();
    if (!text) return null;
    var made = function (year, month) {
      var m = Number(month);
      if (!(m >= 1 && m <= 12)) return null;
      return { year: year == null ? null : Number(year), month: m };
    };
    var hit = /^(\d{4})[-_\/. ]?(\d{1,2})$/.exec(text);            // 2026-10 · 2026_10 · 202610
    if (hit) return made(hit[1], hit[2]);
    hit = /^(\d{1,2})[-_\/. ](\d{4})$/.exec(text);                 // 10_2027 · 10-2027
    if (hit) return made(hit[2], hit[1]);
    hit = /^(\d{1,2})[-_\/. ](\d{2})$/.exec(text);                 // 10-26
    if (hit) return made(2000 + Number(hit[2]), hit[1]);
    hit = /^(?:m|month)[-_ ]?(\d{1,2})$/i.exec(text);              // m10 · month_10
    if (hit) return made(null, hit[1]);
    hit = /^(\d{1,2})$/.exec(text);                                // 10
    if (hit) return made(null, hit[1]);
    return null;
  }

  // مطابقة عمود واحد بالسنة والشهر معًا؛ عمود مأخوذ لشهر سابق لا يُؤخذ مرتين.
  function guessMonthHeader(headers, month, usedHeaders) {
    var used = usedHeaders || [];
    var free = function (header) { return used.indexOf(header) === -1; };
    var underscored = String(month).replace(/-/g, "_");
    var exact = headers.filter(free).filter(function (header) { return header === month || header === underscored; })[0];
    if (exact) return exact;
    var wantYear = Number(String(month).slice(0, 4));
    var wantMonth = Number(String(month).slice(5, 7));
    var full = headers.filter(free).filter(function (header) {
      var parts = headerMonthParts(header);
      return parts && parts.year === wantYear && parts.month === wantMonth;
    })[0];
    if (full) return full;
    var label = monthLabel(month);
    var byLabel = headers.filter(free).filter(function (header) { return String(header).replace(/\s+/g, " ").trim() === label; })[0];
    return byLabel || "";
  }

  // ربط كل أشهر المستند دفعة واحدة: قرار "نطابق بالشهر وحده" لا يصح إلا بعد رؤية كل الأعمدة.
  // ملفات كثيرة تحمل نفس الأشهر بسنة أخرى (سنة الحاجة لا سنة الخطة)؛ نقبلها لكن نحذّر بوضوح.
  function mapMonthHeaders(headers, months) {
    var used = [];
    var map = {};
    var exactHits = 0;
    months.forEach(function (month) {
      var hit = guessMonthHeader(headers, month, used);
      map[month] = hit;
      if (hit) { used.push(hit); exactHits += 1; }
    });
    var yearShift = false;
    var fileYears = [];
    if (!exactHits) {
      months.forEach(function (month) {
        var wantMonth = Number(String(month).slice(5, 7));
        var hit = headers.filter(function (header) { return used.indexOf(header) === -1; }).filter(function (header) {
          var parts = headerMonthParts(header);
          return parts && parts.month === wantMonth;
        })[0];
        if (!hit) return;
        map[month] = hit;
        used.push(hit);
        yearShift = true;
        var parts = headerMonthParts(hit);
        if (parts && parts.year && fileYears.indexOf(parts.year) === -1) fileYears.push(parts.year);
      });
    }
    var matched = months.filter(function (month) { return map[month]; }).length;
    return { map: map, matched: matched, yearShift: yearShift, fileYears: fileYears.sort() };
  }

  function monthShiftWarning(result) {
    if (!result.yearShift) return "";
    return '<div class="form-note locked"><strong>' + localizeText("انتبه: سنة أعمدة الملف تختلف عن سنة المستند.") + '</strong> '
      + (result.fileYears.length ? esc(result.fileYears.join("، ")) + ' ' : '')
      + localizeText("طوبقت بالشهر وحده لأن أي عمود لم يطابق السنة والشهر معًا. راجع كل سطر أدناه قبل التعبئة.") + '</div>';
  }

  function openForecastImportMap() {
    var context = forecastImportContext;
    if (!context) { showToast("لا يوجد ملف قيد الاستيراد.", "error"); return; }
    var headerOptions = function (selected, allowNone) {
      return (allowNone ? '<option value="">— تجاهل هذا الشهر —</option>' : '<option value="">اختر العمود</option>') + context.headers.map(function (header) {
        return '<option value="' + esc(header) + '"' + (header === selected ? " selected" : "") + '>' + esc(header) + '</option>';
      }).join("");
    };
    var monthMatch = mapMonthHeaders(context.headers, context.months);
    var monthFields = context.months.map(function (month, kIndex) {
      return '<div class="field"><label for="fm-month-' + kIndex + '">عمود ' + esc(monthLabel(month)) + '</label><select class="select" id="fm-month-' + kIndex + '" name="fmMonth_' + kIndex + '">' + headerOptions(monthMatch.map[month], true) + '</select></div>';
    }).join("");
    var previewHead = '<tr>' + context.headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join("") + '</tr>';
    var previewRows = context.rows.slice(0, 3).map(function (row) {
      return '<tr>' + context.headers.map(function (header) { return '<td>' + esc(row[header] == null ? "" : row[header]) + '</td>'; }).join("") + '</tr>';
    }).join("");
    var monthHits = monthMatch.matched;
    var looksLikeMasterTemplate = ["code", "name", "unit"].every(function (key) { return context.headers.indexOf(key) !== -1; }) && !monthHits;
    var mismatchWarning = "";
    if (!monthHits) {
      mismatchWarning = '<div class="form-note locked"><strong>تنبيه: أعمدة هذا الملف لا تطابق تمبليت Forecast.</strong> ' + (looksLikeMasterTemplate
        ? "يبدو أنك رفعت قالب تعريف المنتجات أو المواد (code / name / unit) بدل ملف كميات Forecast — أغلق النافذة وحمّل «التمبليت (حسب الأشهر المحددة)» من نافذة Forecast ثم عبّئه وارفعه."
        : "لم يُعثر على أي عمود يطابق أشهر المستند (" + context.headers.join("، ") + ") — اربط الأعمدة يدويًا إن كانت صحيحة، أو حمّل التمبليت الجاهز.") + '</div>';
    }
    var body = '<input type="hidden" name="fmMonthCount" value="' + context.months.length + '">' + mismatchWarning + monthShiftWarning(monthMatch)
      + '<div class="form-note">اربط أعمدة ملفك بحقول النظام قبل التعبئة — هذا يمنع استيراد الكميات في الشهر الخطأ أو للمنتج الخطأ. الصفوف التي لا يطابق كودها منتجًا معرفًا تُتجاهل ويُبلّغ عنها.</div>'
      + '<div class="form-grid"><div class="field"><label for="fm-product">عمود كود المنتج (إجباري)</label><select class="select" id="fm-product" name="fmProduct">' + headerOptions(guessProductHeader(context.headers), false) + '</select></div>' + monthFields + '</div>'
      + '<section class="material-plan-section"><span class="eyebrow">معاينة أول 3 صفوف من الملف (' + context.rows.length + ' صف)</span><div class="table-wrap plan-entry-table"><table><thead>' + previewHead + '</thead><tbody>' + previewRows + '</tbody></table></div></section>'
      + '<div class="form-note locked">التعبئة تملأ جدول Forecast للمراجعة ولا تُرسل شيئًا؛ الإرسال يبقى بيدك بعد التدقيق.</div>';
    openDialog(dialogShell("Data Mapping — ربط أعمدة الملف", "حدد عمود كود المنتج وعمود كل شهر، أو تجاهل أشهرًا لا يغطيها الملف.", body, "تعبئة الجدول من الملف", "forecast-map-form"), "wide");
  }



  // رد الإنتاج: فحص قدرة الآلات — تثبيت كما هو أو إرسال أرقام معدلة للمبيعات.
  function openForecastProductionReview(forecastId) {
    var forecast = state.forecasts.find(function (item) { return item.id === forecastId; });
    if (!forecast || forecast.status !== "submitted") { showToast("هذا المستند ليس بانتظار رد الإنتاج.", "error"); return; }
    var head = '<tr><th>المنتج</th>' + forecast.months.map(function (month) { return '<th class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th>طلب المبيعات</th></tr>';
    var rows = forecast.items.map(function (line, pIndex) {
      var cells = forecast.months.map(function (month, mIndex) {
        var cellId = "pq-" + pIndex + "-" + mIndex;
        var qty = Number(line.monthlyQty[month] || 0);
        var reviewClass = forecastCellChangeClass(forecast, line.productCode, month);
        return '<td><label class="sr-only" for="' + cellId + '">كمية ' + esc(line.productName) + ' في ' + esc(monthLabel(month)) + '</label><input class="input plan-cell-input month-qty-input production-forecast-cell ' + reviewClass + '" id="' + cellId + '" name="pq_' + pIndex + '_' + mIndex + '" type="number" min="0" step="any" inputmode="decimal" value="' + (qty || "") + '" placeholder="0" data-original-value="' + qty + '"></td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(line.productCode) + '</strong><br><small>' + esc(line.productName) + '</small><input type="hidden" name="pqProduct_' + pIndex + '" value="' + esc(line.productCode) + '"></td>' + cells + '<td><strong class="number">' + formatNumber(line.qty) + '</strong> ' + esc(line.unit || "") + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="forecastId" value="' + esc(forecast.id) + '"><input type="hidden" name="pqItemCount" value="' + forecast.items.length + '">'
      + '<div class="plan-table-summary"><div><span>المستند</span><strong>' + esc(forecast.id + " · " + forecast.version) + '</strong></div><div><span>الفترة</span><strong>' + esc(forecastPeriod(forecast)) + '</strong></div><div><span>الإجمالي المطلوب</span><strong>' + formatNumber(forecastTotalQty(forecast)) + '</strong></div><div><span>الأولوية</span><strong>' + esc(forecast.priority || "—") + '</strong></div></div>'
      + '<div class="table-wrap plan-entry-table forecast-grid-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-grid"><div class="field"><label for="pr-decision">إرسال الإنتاج للمبيعات</label><select class="select" id="pr-decision" name="decision"><option value="confirm">إرسال للتأكيد النهائي دون تغيير</option><option value="feedback">إرسال أرقامي المعدلة إلى المبيعات</option></select></div><div class="field full"><label for="pr-note">ملاحظة القدرة</label><input class="input" id="pr-note" name="feedbackNote" placeholder="مثال: قدرة الخط 2 لا تسمح بأكثر من ذلك في آذار"></div></div>'
      + '<div class="form-note">عند تعديل الإنتاج لأي كمية تصبح الخلية حمراء كاملة. يمكنك تصدير Forecast الوارد، تعديله في Excel، ثم رفع النسخة المعدلة هنا لتعبئة الجدول قبل إرسال الرد للمبيعات.</div><div class="list-actions"><button class="btn btn-secondary btn-sm" type="button" data-action="download-production-forecast" data-id="' + esc(forecast.id) + '">تصدير Forecast الوارد</button><label class="btn btn-primary btn-sm file-button">رفع النسخة المعدلة<input type="file" accept=".xlsx,.xls,.csv" data-action="import-production-review"></label><button class="btn btn-secondary btn-sm" type="button" data-action="download-production-review-draft">تحميل النسخة المعدلة</button></div>';
    openDialog(dialogShell("رد الإنتاج على " + forecast.id, "افحص قدرة الآلات وإمكانية التحقيق لكل شهر.", body, "حفظ الرد", "production-review-form"), "wide");
  }

  function forecastSnapshotTable(months, items, forecast) {
    var head = '<tr><th>المنتج</th>' + months.map(function (month) { return '<th class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th>الإجمالي</th></tr>';
    var body = items.map(function (line) {
      var total = 0;
      var cells = months.map(function (month) {
        var qty = Number(line.monthlyQty && line.monthlyQty[month] || 0);
        total += qty;
        var changeClass = forecast ? forecastCellChangeClass(forecast, line.productCode, month) : "";
        return '<td class="' + changeClass + '">' + (qty ? '<span class="number">' + formatNumber(qty) + '</span>' : '<span class="read-only">—</span>') + '</td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(line.productCode) + '</strong><br><small>' + esc(line.productName) + '</small></td>' + cells + '<td><strong class="number">' + formatNumber(total) + '</strong></td></tr>';
    }).join("");
    return '<div class="table-wrap"><table class="forecast-monthly-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  // مراجعة المبيعات لرد الإنتاج: مقارنة الإصدارين ثم قبول (تثبيت) أو تعديل وإعادة إرسال.
  function openForecastFeedbackReview(forecastId) {
    var forecast = state.forecasts.find(function (item) { return item.id === forecastId; });
    if (!forecast || forecast.status !== "production_feedback") { showToast("هذا المستند ليس بانتظار قرار المبيعات.", "error"); return; }
    var previous = forecast.history.length ? forecast.history[forecast.history.length - 1] : null;
    var body = '<div class="plan-table-summary"><div><span>المستند</span><strong>' + esc(forecast.id + " · " + forecast.version) + '</strong></div><div><span>الفترة</span><strong>' + esc(forecastPeriod(forecast)) + '</strong></div><div><span>رد الإنتاج</span><strong>' + esc(displayTimestamp(forecast.productionFeedbackAt)) + '</strong></div><div><span>ملاحظة الإنتاج</span><strong>' + esc(forecast.productionNote || "بدون ملاحظة") + '</strong></div></div>'
      + '<section><span class="eyebrow">أرقام الإنتاج المقترحة (الإصدار الحالي)</span>' + forecastSnapshotTable(forecast.months, forecast.items, forecast) + '</section>'
      + (previous ? '<section><span class="eyebrow">طلبك السابق (' + esc(previous.version || "") + ')</span>' + forecastSnapshotTable(previous.months || forecast.months, previous.items || []) + '</section>' : "")
      + '<div class="form-note">الأحمر: عدّله الإنتاج. عند فتح التعديل والإرسال: تبقى هذه القيمة أخضر إن قبلتها كما هي، وأصفر إن عدلتها؛ وأي خلية أخرى تغيّرها المبيعات تصبح حمراء. القبول يثبت المستند بهذه الأرقام ويبدأ حساب المواد.</div>';
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">مراجعة رد الإنتاج</h2><p>' + esc(forecast.id) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-secondary" type="button" data-action="close-dialog">إغلاق</button><button class="btn btn-secondary" type="button" data-action="download-sales-feedback-forecast" data-id="' + esc(forecast.id) + '">تنزيل ملف المراجعة</button><label class="btn btn-secondary file-button">رفع ملف المبيعات المعدّل<input type="file" accept=".xlsx,.xls,.csv" data-action="import-sales-feedback" data-id="' + esc(forecast.id) + '"></label><button class="btn btn-secondary" type="button" data-action="edit-forecast" data-id="' + esc(forecast.id) + '">تعديل وإعادة الإرسال</button><button class="btn btn-primary" type="button" data-action="accept-production-feedback" data-id="' + esc(forecast.id) + '">قبول أرقام الإنتاج وتثبيت المستند</button></footer>', "wide");
  }

  function openForecastHistory(forecastId) {
    var forecast = state.forecasts.find(function (item) { return item.id === forecastId; });
    if (!forecast) { showToast("تعذر العثور على المستند.", "error"); return; }
    var entries = forecast.history.map(function (entry, index) {
      return '<section class="forecast-history-entry"><div class="list-meta"><span><strong>' + esc(entry.version || "V" + (index + 1)) + '</strong> · ' + esc(entry.by || "") + '</span>' + stepDate("التاريخ", entry.at) + '</div>' + forecastSnapshotTable(entry.months || forecast.months, entry.items || []) + '</section>';
    }).join("");
    var current = '<section class="forecast-history-entry"><div class="list-meta"><span><strong>' + esc(forecast.version) + ' (الحالي)</strong> · ' + esc(forecastStatusInfo(forecast.status)[0]) + '</span>' + (forecast.fixedAt ? stepDate("التثبيت", forecast.fixedAt) : stepDate("آخر تحديث", forecast.updatedAt || forecast.submittedAt)) + '</div>' + forecastSnapshotTable(forecast.months, forecast.items) + '</section>';
    var body = '<div class="form-note">كل تعديل من المبيعات أو الإنتاج يحفظ الإصدار السابق هنا؛ لا يضيع أي رقم من التفاوض.</div>' + entries + current;
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">إصدارات ' + esc(forecast.id) + '</h2><p>' + (forecast.history.length + 1) + ' إصدارات محفوظة</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-primary" type="button" data-action="close-dialog">إغلاق</button></footer>', "wide");
  }

  function materialRequirementSection(forecast, sIndex, prefill, category) {
    var actives = state.rawMaterials.filter(function (item) { return item.active !== false && item.category === category; });
    var months = forecast.months;
    var head = '<tr><th scope="col">المادة الأولية</th>' + months.map(function (month) { return '<th scope="col" class="month-col">' + esc(monthLabel(month)) + '</th>'; }).join("") + '<th scope="col">الإجمالي الحالي</th><th scope="col">الحالة الحالية</th></tr>';
    var rows = actives.map(function (mat, mIndex) {
      var existing = state.materials.find(function (record) { return record.forecastId === forecast.id && normalizeCode(record.materialCode) === normalizeCode(mat.code); });
      var hasCommitment = existing && state.commitments.some(function (record) { return record.materialId === existing.id; });
      var statusCell = existing ? (existing.stockConfirmed ? statusByValue(materialShortage(existing) > 0 ? "shortage" : "available") : statusByValue("pending")) : '<span class="read-only">غير مطلوبة</span>';
      var cells = months.map(function (month, kIndex) {
        var cellId = "mr-" + sIndex + "-" + mIndex + "-" + kIndex;
        var value = existing && existing.monthlyQty && Number(existing.monthlyQty[month]) > 0 ? existing.monthlyQty[month] : "";
        var prefillValue = prefill && prefill[forecast.id] && prefill[forecast.id][normalizeCode(mat.code)] && prefill[forecast.id][normalizeCode(mat.code)][month];
        if (prefillValue != null && prefillValue !== "") value = prefillValue;
        return '<td><label class="sr-only" for="' + cellId + '">إجمالي ' + esc(mat.name) + ' في ' + esc(monthLabel(month)) + '</label><input class="input plan-cell-input month-qty-input" id="' + cellId + '" name="mrQty_' + sIndex + '_' + mIndex + '_' + kIndex + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(value) + '" placeholder="0"></td>';
      }).join("");
      return '<tr><td><strong class="code-chip">' + esc(mat.code) + '</strong><br><small>' + esc(mat.name) + ' · ' + esc(mat.unit) + '</small><input type="hidden" name="mrCode_' + sIndex + '_' + mIndex + '" value="' + esc(mat.code) + '">' + (hasCommitment ? '<br>' + status("مرتبطة بأمر شراء", "blue") : "") + '</td>' + cells + '<td>' + (existing ? '<strong class="number">' + formatNumber(existing.required) + '</strong>' : "—") + '</td><td>' + statusCell + '</td></tr>';
    }).join("");
    var monthHidden = months.map(function (month, kIndex) { return '<input type="hidden" name="mrMonth_' + sIndex + '_' + kIndex + '" value="' + esc(month) + '">'; }).join("");
    return '<section class="material-plan-section"><div class="plan-table-summary"><div><span>المستند</span><strong>' + esc(forecast.id + " · " + forecast.version) + '</strong></div><div><span>الفترة</span><strong>' + esc(forecastPeriod(forecast)) + '</strong></div></div><input type="hidden" name="mrForecast_' + sIndex + '" value="' + esc(forecast.id) + '"><input type="hidden" name="mrMatCount_' + sIndex + '" value="' + actives.length + '"><input type="hidden" name="mrMonthCount_' + sIndex + '" value="' + months.length + '">' + monthHidden + '<div class="table-wrap plan-entry-table"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function openMaterialForm(forecastId, prefill, category) {
    category = category === "packing" ? "packing" : "raw";
    // الاحتياجات تُدخل فقط بعد تثبيت الأرقام بين المبيعات والإنتاج.
    var eligible = state.forecasts.filter(function (item) { return item.status === "fixed"; });
    if (!eligible.length) { showToast("لا يوجد Forecast مثبت بعد. راجع رد الإنتاج مع المبيعات أولًا.", "error"); return; }
    if (!state.rawMaterials.length) { showToast("عرّف المواد الأولية في تهيئة النظام قبل إضافة الاحتياج.", "error"); return; }
    var ordered = forecastId ? eligible.filter(function (item) { return item.id === forecastId; }).concat(eligible.filter(function (item) { return item.id !== forecastId; })) : eligible;
    if (!state.rawMaterials.some(function (item) { return item.active !== false && item.category === category; })) { showToast(category === "packing" ? "عرّف مواد التغليف أولًا." : "عرّف المواد الأولية أولًا.", "error"); return; }
    var sections = ordered.map(function (forecast, sIndex) { return materialRequirementSection(forecast, sIndex, prefill, category); }).join("");
    var importTools = '<div class="bulk-tools"><div><strong>استيراد كميات الاحتياج من Excel</strong><p>حمّل التمبليت الجاهز، أدخل كميات المواد فقط حسب الأشهر، ثم ارفعه — أو ارفع أي ملف واربط أعمدته (Data Mapping).</p></div><button class="btn btn-secondary btn-sm" type="button" data-action="download-material-template">تحميل تمبليت الكميات</button><label class="btn btn-secondary btn-sm file-button">رفع كميات Excel/CSV<input type="file" accept=".xlsx,.xls,.csv" data-action="import-material"></label></div>';
    var typeName = category === "packing" ? "مواد التغليف" : "المواد الأولية";
    var body = '<input type="hidden" name="mrCategory" value="' + category + '"><input type="hidden" name="mrSectionCount" value="' + ordered.length + '">' + importTools + sections + '<div class="form-note">ملف ' + typeName + ' مستقل. الاستيراد يقرأ كود المادة وكميات الأشهر فقط. بعد رفع المخزون يعرض التطبيق المقارنة للإنتاج ليعدّل أو يثبت الكميات.</div>';
    openDialog(dialogShell("Material Requirement — " + typeName, "ملف مستقل لكل مستودع، بكميات شهرية فقط. احفظ أولًا ثم أرسله صراحةً للمستودع.", body, "حفظ الملف", "material-form"), "wide");
  }

  // استيراد الاحتياجات: تمبليت مولّد بالمواد وأشهر المستندات + Data Mapping — التعبئة للمراجعة فقط.
  var materialImportContext = null;

  function materialImportMonths(orderedForecasts) {
    var months = [];
    orderedForecasts.forEach(function (forecast) {
      (forecast.months || []).forEach(function (month) { if (months.indexOf(month) === -1) months.push(month); });
    });
    return months.sort();
  }

  function eligibleRequirementForecasts() {
    return state.forecasts.filter(function (item) { return item.status === "fixed"; });
  }

  function downloadMaterialTemplate() {
    var eligible = eligibleRequirementForecasts();
    if (!eligible.length) { showToast("لا يوجد Forecast مثبت بعد. راجع رد الإنتاج مع المبيعات أولًا.", "error"); return; }
    var activeForm = document.getElementById("material-form");
    var categoryField = activeForm && activeForm.querySelector('[name="mrCategory"]');
    var category = categoryField && categoryField.value === "packing" ? "packing" : "raw";
    var actives = state.rawMaterials.filter(function (item) { return item.active !== false && item.category === category; });
    if (!actives.length) { showToast("عرّف المواد الأولية أولًا.", "error"); return; }
    var months = materialImportMonths(eligible);
    // اسم المادة للقراءة والتحقق البصري؛ المطابقة التقنية تبقى بالكود، والكميات هي أعمدة الأشهر فقط.
    var workbookRows = [["material_code", "material_name"].concat(months)];
    actives.forEach(function (mat) {
      var existing = state.materials.find(function (record) { return normalizeCode(record.materialCode) === normalizeCode(mat.code) && (record.category || "raw") === category; });
      workbookRows.push([mat.code, mat.name || ""].concat(months.map(function (month) {
        var value = existing && existing.monthlyQty && Number(existing.monthlyQty[month]) > 0 ? existing.monthlyQty[month] : "";
        return value;
      })));
    });
    var templateFileName = category === "packing" ? "EMICP-packaging-requirements-template.xls" : "EMICP-raw-materials-requirements-template.xls";
    if (!downloadExcelXml(templateFileName, workbookRows)) return;
    showToast("نُزّل قالب Excel لـ" + (category === "packing" ? "مواد التغليف" : "المواد الأولية") + " (" + (workbookRows.length - 1) + " صفًا) ويحتوي الكود واسم المادة؛ عبّئ كميات الأشهر فقط ثم ارفعه.", "success");
  }

  function readMaterialFormValues(form) {
    var data = new FormData(form);
    var prefill = {};
    var sectionCount = Number(data.get("mrSectionCount") || 0);
    for (var sIdx = 0; sIdx < sectionCount; sIdx += 1) {
      var forecastId = String(data.get("mrForecast_" + sIdx) || "");
      var matCount = Number(data.get("mrMatCount_" + sIdx) || 0);
      var monthCount = Number(data.get("mrMonthCount_" + sIdx) || 0);
      if (!forecastId) continue;
      prefill[forecastId] = prefill[forecastId] || {};
      for (var mIdx = 0; mIdx < matCount; mIdx += 1) {
        var matCode = normalizeCode(data.get("mrCode_" + sIdx + "_" + mIdx));
        if (!matCode) continue;
        for (var kIdx = 0; kIdx < monthCount; kIdx += 1) {
          var month = String(data.get("mrMonth_" + sIdx + "_" + kIdx) || "");
          var raw = String(data.get("mrQty_" + sIdx + "_" + mIdx + "_" + kIdx) == null ? "" : data.get("mrQty_" + sIdx + "_" + mIdx + "_" + kIdx)).trim();
          if (!month || raw === "") continue;
          prefill[forecastId][matCode] = prefill[forecastId][matCode] || {};
          prefill[forecastId][matCode][month] = raw;
        }
      }
    }
    return prefill;
  }

  async function beginMaterialImport(file) {
    var form = document.getElementById("material-form");
    if (!form) { showToast("افتح نافذة جدول الاحتياجات أولًا.", "error"); return; }
    var eligible = eligibleRequirementForecasts();
    var current = readMaterialFormValues(form);
    var rows = await readSpreadsheetFile(file);
    if (!rows.length) throw new Error("الملف فارغ أو بلا صفوف بيانات.");
    var serialMap = {};
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (key) {
        if (serialMap[key] !== undefined) return;
        serialMap[key] = excelSerialHeaderToMonth(key) || "";
      });
    });
    if (Object.keys(serialMap).some(function (key) { return serialMap[key]; })) {
      rows = rows.map(function (row) {
        var converted = {};
        Object.keys(row).forEach(function (key) { converted[serialMap[key] || key] = row[key]; });
        return converted;
      });
    }
    var headers = [];
    rows.forEach(function (row) { Object.keys(row).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
    materialImportContext = {
      category: (new FormData(form).get("mrCategory") === "packing" ? "packing" : "raw"),
      months: materialImportMonths(eligible),
      forecastIds: eligible.map(function (item) { return item.id; }),
      current: current,
      rows: rows,
      headers: headers
    };
    openMaterialImportMap();
  }

  function guessMaterialHeader(headers) {
    var candidates = ["material_code", "code", "كود_المادة", "المادة", "كود", "material"];
    for (var i = 0; i < candidates.length; i += 1) if (headers.indexOf(candidates[i]) !== -1) return candidates[i];
    return "";
  }

  function guessDocumentHeader(headers) {
    var candidates = ["document", "doc", "المستند", "مستند", "forecast"];
    for (var i = 0; i < candidates.length; i += 1) if (headers.indexOf(candidates[i]) !== -1) return candidates[i];
    return "";
  }

  function openMaterialImportMap() {
    var context = materialImportContext;
    if (!context) { showToast("لا يوجد ملف قيد الاستيراد.", "error"); return; }
    var headerOptions = function (selected, allowNone, noneLabel) {
      return (allowNone ? '<option value="">' + noneLabel + '</option>' : '<option value="">اختر العمود</option>') + context.headers.map(function (header) {
        return '<option value="' + esc(header) + '"' + (header === selected ? " selected" : "") + '>' + esc(header) + '</option>';
      }).join("");
    };
    var monthMatch = mapMonthHeaders(context.headers, context.months);
    var monthFields = context.months.map(function (month, kIndex) {
      return '<div class="field"><label for="mm-month-' + kIndex + '">عمود ' + esc(monthLabel(month)) + '</label><select class="select" id="mm-month-' + kIndex + '" name="mmMonth_' + kIndex + '">' + headerOptions(monthMatch.map[month], true, "— تجاهل هذا الشهر —") + '</select></div>';
    }).join("");
    var previewHead = '<tr>' + context.headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join("") + '</tr>';
    var previewRows = context.rows.slice(0, 3).map(function (row) {
      return '<tr>' + context.headers.map(function (header) { return '<td>' + esc(row[header] == null ? "" : row[header]) + '</td>'; }).join("") + '</tr>';
    }).join("");
    var monthHits = monthMatch.matched;
    var mismatchWarning = monthHits ? "" : '<div class="form-note locked"><strong>تنبيه: أعمدة هذا الملف لا تطابق تمبليت الاحتياجات.</strong> لم يُعثر على أي عمود يطابق أشهر المستندات (' + context.headers.join("، ") + ') — اربط الأعمدة يدويًا إن كانت صحيحة، أو حمّل التمبليت الجاهز من نافذة الاحتياجات.</div>';
    var body = '<input type="hidden" name="mmMonthCount" value="' + context.months.length + '">' + mismatchWarning + monthShiftWarning(monthMatch)
      + '<div class="form-note">اربط أعمدة ملفك بحقول النظام قبل التعبئة. الصفوف التي لا يطابق كودها مادة معرفة تُتجاهل ويُبلّغ عنها، وعمود المستند اختياري عندما يكون هناك مستند واحد.</div>'
      + '<div class="form-grid"><div class="field"><label for="mm-material">عمود كود المادة (إجباري)</label><select class="select" id="mm-material" name="mmMaterial">' + headerOptions(guessMaterialHeader(context.headers), false, "") + '</select></div><div class="field"><label for="mm-document">عمود المستند (اختياري)</label><select class="select" id="mm-document" name="mmDocument">' + headerOptions(guessDocumentHeader(context.headers), true, "— بلا عمود مستند —") + '</select></div>' + monthFields + '</div>'
      + '<section class="material-plan-section"><span class="eyebrow">معاينة أول 3 صفوف من الملف (' + context.rows.length + ' صف)</span><div class="table-wrap plan-entry-table"><table><thead>' + previewHead + '</thead><tbody>' + previewRows + '</tbody></table></div></section>'
      + '<div class="form-note locked">التعبئة تملأ جدول الاحتياجات للمراجعة ولا تُرسل شيئًا؛ الحفظ يبقى بيدك بعد التدقيق.</div>';
    openDialog(dialogShell("Data Mapping — ربط أعمدة ملف الاحتياجات", "حدد عمود كود المادة وأعمدة الأشهر، وعمود المستند إن وُجد.", body, "تعبئة الجدول من الملف", "material-map-form"), "wide");
  }

  function openWasteForm() {
    if (state.role !== "rmWarehouse") { showToast("تسجيل التوالف لمخزن المواد الأولية فقط.", "error"); return; }
    var codes = [];
    state.materials.forEach(function (item) {
      var code = normalizeCode(item.materialCode);
      if (item.stockConfirmed && codes.indexOf(code) === -1) codes.push(code);
    });
    if (!codes.length) { showToast("أكّد رصيد المواد أولًا قبل تسجيل التوالف.", "error"); return; }
    var reasonOptions = Object.keys(WASTE_REASONS).map(function (key) { return '<option value="' + key + '">' + esc(WASTE_REASONS[key]) + '</option>'; }).join("");
    var rows = codes.map(function (code, index) {
      var records = sortedCodeRecords(code);
      var reference = records.filter(function (record) { return record.stockConfirmed; })[0];
      var master = rawMasterByCode(code);
      var onHand = reference ? Number(reference.onHand || 0) : 0;
      return '<tr>'
        + '<td><strong class="code-chip">' + esc(code) + '</strong><br><small>' + esc(reference ? reference.material : code) + '</small><br>' + materialCategoryBadge(master ? master.category : "raw") + '<input type="hidden" name="wsCode_' + index + '" value="' + esc(code) + '"></td>'
        + '<td><strong class="number">' + formatNumber(onHand) + '</strong> ' + esc(reference ? reference.unit || "" : "") + '</td>'
        + '<td><input class="input plan-cell-input" name="wsQty_' + index + '" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></td>'
        + '<td><select class="select" name="wsReason_' + index + '">' + reasonOptions + '</select></td>'
        + '<td><input class="input" name="wsNote_' + index + '" type="text" placeholder="اختياري"></td>'
        + '</tr>';
    }).join("");
    var body = '<input type="hidden" name="wsCount" value="' + codes.length + '">'
      + '<div class="form-grid"><div class="field"><label for="ws-date">تاريخ التسجيل</label><input class="input" id="ws-date" name="wsDate" type="date" value="' + esc(currentTimestamp().slice(0, 10)) + '" required></div></div>'
      + '<div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المادة</th><th scope="col">الرصيد الحالي</th><th scope="col">كمية التوالف</th><th scope="col">السبب</th><th scope="col">ملاحظة</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-note locked">التوالف تُخصم فورًا من الرصيد الفيزيائي للمادة (خام أو باكينغ) وتُسجَّل في حركة المواد والتقارير، ولا يمكن أن تتجاوز الرصيد الحالي. أدخل الكميات التالفة فقط واترك الباقي فارغًا.</div>';
    openDialog(dialogShell("تسجيل توالف المواد", "الكمية التالفة تُخصم من الرصيد وتظهر في التقارير.", body, "حفظ التوالف وخصمها من الرصيد", "waste-form"), "wide");
  }

  function renderWasteCard(canEdit) {
    var records = (state.wasteRecords || []).slice(0, 60);
    var rows = records.map(function (item) {
      var master = rawMasterByCode(item.materialCode);
      return '<tr><td>' + esc(item.date || "") + '</td>'
        + '<td><strong class="code-chip">' + esc(item.materialCode) + '</strong><br><small>' + esc(item.material) + '</small></td>'
        + '<td>' + materialCategoryBadge(master ? master.category : "raw") + '</td>'
        + '<td><strong class="number">' + formatNumber(item.qty) + '</strong> ' + esc(item.unit || "") + '</td>'
        + '<td>' + status(wasteReasonLabel(item.reason), item.reason === "quality" ? "red" : "amber") + '</td>'
        + '<td>' + (item.note ? esc(item.note) : '<span class="read-only">بدون ملاحظة</span>') + '</td>'
        + '<td>' + stepDate("التسجيل", item.recordedAt) + '</td></tr>';
    }).join("");
    var content = rows
      ? '<div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>المادة</th><th>النوع</th><th>الكمية</th><th>السبب</th><th>ملاحظة</th><th>وقت التسجيل</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : empty("لا توالف مسجلة", "سجّل أي كمية تالفة لتُخصم من الرصيد وتظهر في التقارير.");
    return card("توالف المواد (" + (state.wasteRecords || []).length + ")", "كل كمية تالفة بسببها — مخصومة من الرصيد الفيزيائي",
      content, canEdit ? '<button class="btn btn-danger btn-sm" type="button" data-action="new-waste">تسجيل توالف</button>' : "");
  }

  function openStockForm(id, category) {
    if (!state.materials.length) { showToast("لا توجد مواد بانتظار تأكيد المخزن.", "error"); return; }
    var requested = id ? state.materials.find(function (item) { return item.id === id; }) : null;
    // صف واحد لكل كود مادة: الرصيد الفيزيائي واحد مهما تعددت الخطط.
    var codes = [];
    state.materials.forEach(function (item) { var code = normalizeCode(item.materialCode); var sent = state.materialDispatches && state.materialDispatches[item.category || "raw"] && state.materialDispatches[item.category || "raw"].status === "sent"; if ((!category || (item.category || "raw") === category) && sent && codes.indexOf(code) === -1) codes.push(code); });
    if (requested) {
      var requestedCode = normalizeCode(requested.materialCode);
      codes = [requestedCode].concat(codes.filter(function (code) { return code !== requestedCode; }));
    }
    if (!codes.length) { showToast("لا توجد احتياجات مرسلة من الإنتاج إلى هذا المستودع بعد.", "error"); return; }
    var rows = codes.map(function (code, index) {
      var records = materialRecordsSameCode(code).filter(function (record) { return !category || (record.category || "raw") === category; });
      var totalRequired = records.reduce(function (sum, record) { return sum + Number(record.required || 0); }, 0);
      var totalInbound = records.reduce(function (sum, record) { return sum + Number(record.inbound || 0); }, 0);
      var needDates = records.map(function (record) { return record.needDate; }).filter(Boolean).sort();
      var reference = latestConfirmedStockForCode(code, null) || records.find(function (record) { return record.stockConfirmed; }) || null;
      var allConfirmed = records.every(function (record) { return record.stockConfirmed; });
      var sample = records[0];
      var value = function (field) {
        if (reference && reference[field] != null) return esc(reference[field]);
        if (field === "onHand") { var openingMaster = rawMasterByCode(code, category); return openingMaster && openingMaster.openingQty != null ? esc(openingMaster.openingQty) : "0"; }
        return "0";
      };
      return '<tr><td><strong class="code-chip">' + esc(code) + '</strong><br><small>' + esc(sample.material) + '</small><input type="hidden" name="stockCode_' + index + '" value="' + esc(code) + '"></td>'
        + '<td><strong class="number">' + formatNumber(totalRequired) + '</strong> ' + esc(sample.unit || "") + '<br><small>' + records.length + ' ' + (records.length === 1 ? "منتج" : "منتجات") + '</small></td>'
        + '<td><time class="need-date">' + esc(needDates[0] || "—") + '</time></td>'
        + '<td><label class="sr-only" for="stock-' + index + '-onhand">On Hand لمادة ' + esc(sample.material) + '</label><input class="input plan-cell-input" id="stock-' + index + '-onhand" name="stockOnHand_' + index + '" data-stock-row="' + index + '" type="number" inputmode="decimal" min="0" step="any" value="' + value("onHand") + '"></td>'
        + '<td><label class="sr-only" for="stock-' + index + '-reserved">Reserved لمادة ' + esc(sample.material) + '</label><input class="input plan-cell-input" id="stock-' + index + '-reserved" name="stockReserved_' + index + '" data-stock-row="' + index + '" type="number" inputmode="decimal" min="0" step="any" value="' + value("reserved") + '"></td>'
        + '<td><label class="sr-only" for="stock-' + index + '-hold">Hold لمادة ' + esc(sample.material) + '</label><input class="input plan-cell-input" id="stock-' + index + '-hold" name="stockHold_' + index + '" data-stock-row="' + index + '" type="number" inputmode="decimal" min="0" step="any" value="' + value("hold") + '"></td>'
        + '<td><label class="sr-only" for="stock-' + index + '-expiry">تاريخ انتهاء ' + esc(sample.material) + '</label><input class="input plan-cell-input" id="stock-' + index + '-expiry" name="stockExpiry_' + index + '" type="date" value="' + esc(reference && reference.expiryDate || "") + '"></td>'
        + '<td><label class="sr-only" for="stock-' + index + '-capacity">أقصى طاقة تخزين ' + esc(sample.material) + '</label><input class="input plan-cell-input" id="stock-' + index + '-capacity" name="stockCapacity_' + index + '" data-stock-row="' + index + '" type="number" inputmode="decimal" min="0" step="any" value="' + esc(storageMaster && storageMaster.storageCapacity != null ? storageMaster.storageCapacity : "") + '" placeholder="أقصى كمية"></td>'
        + '<td><span class="number">' + formatNumber(totalInbound) + '</span></td>'
        + '<td class="stock-confirm-cell"><input type="checkbox" id="stock-' + index + '-confirm" name="stockConfirm_' + index + '"' + (allConfirmed ? "" : " checked") + ' aria-label="تأكيد رصيد ' + esc(sample.material) + '"></td>'
        + '<td>' + (allConfirmed ? statusByValue("confirmed") : statusByValue("pending")) + '</td></tr>';
    }).join("");
    var body = '<input type="hidden" name="stockCategory" value="' + esc(category || "raw") + '"><input type="hidden" name="stockCount" value="' + codes.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المادة</th><th scope="col">إجمالي المطلوب</th><th scope="col">أقرب تاريخ حاجة</th><th scope="col">On Hand</th><th scope="col">Reserved</th><th scope="col">Hold</th><th scope="col">تاريخ الانتهاء</th><th scope="col">أقصى طاقة تخزين</th><th scope="col">القادم</th><th scope="col">تأكيد</th><th scope="col">الحالة</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">أدخل تاريخ الانتهاء وأقصى طاقة تخزين لكل مادة عند تثبيت الإمكانية. تُحفظ الصفوف المحددة فقط.</div>';
    openDialog(dialogShell("تأكيد أرصدة المواد — جدول واحد", "مخزن المواد هو مالك هذه الأرقام، وتُحفظ الصفوف المحددة دفعة واحدة.", body, "حفظ وتأكيد الصفوف المحددة", "stock-form"), "wide");
  }

  function openCommitmentForm(materialId) {
    if (state.role === "procurement" && !procurementReleaseExists()) { showToast("لا يمكن إنشاء التزام شراء قبل أن يحوّل الإنتاج ملف المخزن المؤكد إلى المشتريات.", "error"); return; }
    if (materialId) {
      var requestedMaterial = state.materials.find(function (item) { return item.id === materialId; });
      if (requestedMaterial && !warehouseReviewReleased(requestedMaterial)) { showToast("هذه المادة ما زالت بانتظار مراجعة الإنتاج وتأكيد المخزن.", "error"); return; }
    }
    // الشراء صار على فترات: صف لكل (مادة × شهر حاجة) بكمية تلك الفترة وحدها،
    // بدل صف واحد يجمع احتياج المدة كلها فيُشترى اليوم ويُجمّد النقد ويُخزَّن ما لا يُستهلك.
    var periods = purchasablePeriods();
    if (!periods.length) { showToast("لا يوجد صافي احتياج جاهز للشراء (يلزم رصيد مرفوع من المخزن وحاجة غير مغطاة).", "error"); return; }
    if (materialId) {
      var focus = state.materials.find(function (item) { return item.id === materialId; });
      if (focus) {
        var focusCode = normalizeCode(focus.materialCode);
        periods = periods.filter(function (entry) { return entry.plan.code === focusCode; })
          .concat(periods.filter(function (entry) { return entry.plan.code !== focusCode; }));
      }
    }
    var rows = periods.map(function (entry, index) {
      var plan = entry.plan;
      var row = entry.row;
      var buy = purchasePlanFor(plan.code, row.net);
      var unitNote = buy.factor > 1
        ? '<br><small class="read-only">وحدة الشراء: ' + esc(buy.purchaseUnit || ("×" + formatNumber(buy.factor))) + ' — كل وحدة = ' + formatNumber(buy.factor) + ' ' + esc(plan.unit || "") + '</small>'
        : "";
      var moqNote = buy.moqApplied ? '<br><small class="read-only">رُفعت إلى الحد الأدنى للمورد (' + formatNumber(buy.moq) + ')</small>' : "";
      var orderNote = row.orderBy ? '<br><small class="read-only">آخر موعد للأوردر: ' + esc(row.orderBy) + '</small>' : "";
      var needDate = row.month + "-01";
      return '<tr><td><strong class="code-chip">' + esc(plan.code) + '</strong><br><small>' + esc(plan.material) + '</small>' + leadTimeBadge(plan.code)
        + '<input type="hidden" name="pcMaterial_' + index + '" value="' + esc(plan.anchorId) + '">'
        + '<input type="hidden" name="pcFactor_' + index + '" value="' + esc(buy.factor) + '">'
        + '<input type="hidden" name="pcMonth_' + index + '" value="' + esc(row.month) + '"></td>'
        + '<td><strong>' + esc(monthLabel(row.month)) + '</strong><br><small class="read-only">رصيد أول الشهر ' + formatNumber(row.opening) + ' · وارد ' + formatNumber(row.receipts) + ' · حاجة ' + formatNumber(row.requirement) + '</small></td>'
        + '<td><strong class="number">' + formatNumber(row.net) + '</strong> ' + esc(plan.unit || "") + (plan.floor > 0 ? '<br><small class="read-only">يحافظ على المخزون الاستراتيجي ' + formatNumber(plan.floor) + '</small>' : "") + '</td>'
        + '<td><label class="sr-only" for="pc-' + index + '-supplier">مورد ' + esc(plan.material) + '</label><input class="input plan-cell-input" id="pc-' + index + '-supplier" name="pcSupplier_' + index + '" placeholder="اسم المورد"></td>'
        + '<td><label class="sr-only" for="pc-' + index + '-po">PO لمادة ' + esc(plan.material) + '</label><input class="input plan-cell-input" id="pc-' + index + '-po" name="pcPo_' + index + '" placeholder="رقم PO"></td>'
        + '<td><label class="sr-only" for="pc-' + index + '-qty">كمية شراء ' + esc(plan.material) + ' بوحدة الشراء</label><input class="input plan-cell-input" id="pc-' + index + '-qty" name="pcQty_' + index + '" type="number" min="0" step="any" value="' + esc(buy.orderQty) + '">' + unitNote + moqNote + '</td>'
        + '<td><label class="sr-only" for="pc-' + index + '-order">تاريخ أوردر ' + esc(plan.material) + '</label><input class="input plan-cell-input" id="pc-' + index + '-order" name="pcOrder_' + index + '" type="date" value="' + (row.orderBy && row.orderBy > dateDaysFromNow(0) ? esc(row.orderBy) : dateDaysFromNow(0)) + '">' + orderNote + '</td>'
        + '<td><label class="sr-only" for="pc-' + index + '-eta">ETA لمادة ' + esc(plan.material) + '</label><input class="input plan-cell-input" id="pc-' + index + '-eta" name="pcEta_' + index + '" type="date" data-need="' + esc(needDate) + '"><br><small class="read-only">الحاجة: ' + esc(needDate) + '</small></td>'
        + '<td><label class="sr-only" for="pc-' + index + '-amount">قيمة شراء ' + esc(plan.material) + '</label><input class="input plan-cell-input" id="pc-' + index + '-amount" name="pcAmount_' + index + '" placeholder="اختياري"></td>'
        + '<td><label class="btn btn-secondary btn-sm file-button">إرفاق كوتيشن<input type="file" data-action="quotation-file" data-row="' + index + '"></label><br><small class="quotation-name" id="quotation-name-' + index + '">لا مرفق</small></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="pcCount" value="' + periods.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المادة</th><th scope="col">فترة الحاجة</th><th scope="col">صافي احتياج الفترة</th><th scope="col">المورد</th><th scope="col">PO</th><th scope="col">الكمية بوحدة الشراء</th><th scope="col">تاريخ الأوردر</th><th scope="col">ETA</th><th scope="col">القيمة</th><th scope="col">الكوتيشن</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">صف لكل مادة في كل شهر حاجة، وكميته صافي تلك الفترة وحدها بعد ترحيل رصيد الشهر السابق وطرح الوارد المتوقع في موعده — لا تشتري احتياج السنة اليوم. الكمية بوحدة الشراء ومرفوعة إلى الحد الأدنى للمورد عند اللزوم، والمخزون يُقيَّد بوحدة الاستهلاك. «تاريخ الأوردر» معبّأ بآخر موعد يسمح بوصول المادة قبل حاجتها. اشترِ ما تحتاجه الآن واترك بقية الفترات لموعدها.</div>';
    pendingQuotations = {};
    openDialog(dialogShell("Procurement Commitment — الشراء على فترات", "صافي الاحتياج شهرًا بشهر؛ كل أمر يمر بموافقة المالية مع مرفق الكوتيشن.", body, "إنشاء الالتزامات وإرسالها لموافقة المالية", "commitment-form"), "wide");
  }

  // مرفقات الكوتيشن: تُقرأ محليًا وتُخزن مع الأوردر (حد 1.5MB للملف حفاظًا على تخزين المتصفح).
  var pendingQuotations = {};

  function readQuotationFile(input) {
    var file = input.files && input.files[0];
    var rowIndex = Number(input.getAttribute("data-row"));
    var label = document.getElementById("quotation-name-" + rowIndex);
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      showToast("ملف الكوتيشن أكبر من 1.5MB — صغّره أو أرفق نسخة PDF أخف.", "error");
      input.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      pendingQuotations[rowIndex] = { name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result) };
      if (label) label.textContent = file.name;
      showToast("أُرفق الكوتيشن: " + file.name, "success");
    };
    reader.onerror = function () { showToast("تعذر قراءة الملف.", "error"); };
    reader.readAsDataURL(file);
  }

  // إرفاق أو استبدال الكوتيشن لأمر قائم — قبل موافقة المالية — حتى ترى المالية الملف قبل قرارها.
  function readLateQuotationFile(input) {
    if (state.role !== "procurement") { showToast("إرفاق الكوتيشن لدور المشتريات فقط.", "error"); input.value = ""; return; }
    var commitment = state.commitments.find(function (item) { return item.id === input.getAttribute("data-id"); });
    var file = input.files && input.files[0];
    if (!commitment || !file) return;
    if (commitment.financeApproval && commitment.financeApproval.status === "approved") { showToast("هذا الأوردر معتمد من المالية — لا يُستبدل كوتيشنه.", "error"); input.value = ""; return; }
    if (file.size > 1.5 * 1024 * 1024) { showToast("ملف الكوتيشن أكبر من 1.5MB — صغّره أو أرفق نسخة PDF أخف.", "error"); input.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () {
      commitment.quotation = { name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result) };
      addAudit("إرفاق كوتيشن لأمر الشراء " + commitment.id + " · " + commitment.po + " (" + file.name + ")", roleName(state.role));
      saveState();
      renderApp();
      showToast("أُرفق الكوتيشن: " + file.name + " — أصبح مرئيًا للمالية قبل قرارها.", "success");
    };
    reader.onerror = function () { showToast("تعذر قراءة الملف.", "error"); };
    reader.readAsDataURL(file);
  }

  function quotationLink(commitment) {
    if (!commitment.quotation || !commitment.quotation.dataUrl) return '<span class="read-only">لا كوتيشن مرفق — مطلوب قبل موافقة المالية</span>';
    return '<button class="btn btn-secondary btn-sm" type="button" data-action="open-quotation" data-id="' + esc(commitment.id) + '">فتح الكوتيشن (' + esc(commitment.quotation.name) + ')</button>';
  }

  function openReceiptForm(id, category) {
    var expected = state.rawReceipts.filter(function (item) { return item.status === "expected" && receiptReadyForWarehouse(item); });
    if (category === "raw" || category === "packing") expected = expected.filter(function (item) { var master = rawMasterByCode(item.materialCode); return (master ? master.category : "raw") === category; });
    if (!expected.length) { showToast("لا يوجد وارد بحالة In Transit وجاهز للاستلام.", "error"); return; }
    if (id) expected = expected.filter(function (item) { return item.id === id; }).concat(expected.filter(function (item) { return item.id !== id; }));
    var rows = expected.map(function (item, index) {
      var commitment = state.commitments.find(function (record) { return record.id === item.commitmentId; });
      return '<tr><td><strong>' + esc(item.id) + '</strong><br><small><span class="code-chip">' + esc(item.materialCode) + '</span> ' + esc(item.material) + '</small><input type="hidden" name="rrId_' + index + '" value="' + esc(item.id) + '"></td>'
        + '<td>' + (commitment ? esc(commitment.supplier) + '<br><small>' + esc(commitment.po) + '</small>' : "—") + '</td>'
        + '<td>' + (commitment ? '<time class="need-date">' + esc(commitment.eta || "—") + '</time>' : "—") + '</td>'
        + '<td><strong class="number">' + formatNumber(item.qty) + '</strong></td>'
        + '<td><label class="sr-only" for="rr-' + index + '-qty">الكمية المستلمة من ' + esc(item.material) + '</label><input class="input plan-cell-input" id="rr-' + index + '-qty" name="rrQty_' + index + '" type="number" inputmode="decimal" min="0" step="any" placeholder="المتوقع: ' + esc(item.qty) + '"></td>'
        + '<td><label class="sr-only" for="rr-' + index + '-note">ملاحظة استلام ' + esc(item.material) + '</label><input class="input plan-cell-input" id="rr-' + index + '-note" name="rrNote_' + index + '" placeholder="ملاحظة أو رقم المستند"></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="rrCount" value="' + expected.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">الوارد والمادة</th><th scope="col">المورد وPO</th><th scope="col">ETA</th><th scope="col">المتوقع</th><th scope="col">المستلم فعليًا</th><th scope="col">ملاحظة</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note locked">أدخل الكمية للوارد الذي وصل فعليًا فقط واترك بقية الصفوف فارغة. الكمية المستلمة تضاف مباشرة إلى الرصيد، وأي متبقٍ من الأوردر يظهر كنقص جديد للمشتريات، ويسجل النظام تاريخ ووقت التأكيد تلقائيًا.</div>';
    openDialog(dialogShell("تسجيل استلام المواد — جدول واحد", "كل الوارد الجاهز للاستلام في جدول، والمخزن يؤكد ما وصل دفعة واحدة.", body, "حفظ وتأكيد الاستلامات", "receipt-form"), "wide");
  }

  function openActualForm() {
    if (!pendingProductionEntries().length) { showToast("لا توجد تشغيلات جاهزة — التسلسل إلزامي: تثبيت المستند، واعتماد الخطة الأسبوعية (الإنتاج + مخزن FG)، وتغطية المواد عبر شراء المشتريات لأي نقص.", "error"); return; }
    // المكتمل يبقى في الجدول للمراجعة لكن مقفلًا، والصفوف غير المكتملة أولًا.
    var entries = productionEntries(true).sort(function (a, b) {
      if ((a.state === "مكتمل") !== (b.state === "مكتمل")) return a.state === "مكتمل" ? 1 : -1;
      return 0;
    });
    var rows = entries.map(function (entry, index) {
      var produced = entry.produced;
      var remaining = entry.remaining;
      var plannedWhole = planQty(entry.planned);
      var done = entry.state === "مكتمل";
      var lock = done ? " disabled" : "";
      return '<tr class="' + (done ? "row-done" : "") + '"><td><strong class="code-chip">' + esc(entry.line.productCode) + '</strong><br><small>' + esc(entry.line.productName) + '</small><br><small>' + esc(entry.forecast.id) + '</small><input type="hidden" name="paForecast_' + index + '" value="' + esc(entry.forecast.id) + '"><input type="hidden" name="paProduct_' + index + '" value="' + esc(entry.line.productCode) + '"><input type="hidden" name="paMonth_' + index + '" value="' + esc(entry.month) + '"></td>'
        + '<td><strong>' + esc(monthLabel(entry.month)) + '</strong></td>'
        + '<td><strong class="number">' + formatNumber(plannedWhole) + '</strong> ' + esc(entry.line.unit || "") + '</td>'
        + '<td><span class="number">' + formatNumber(produced) + '</span></td>'
        + '<td><strong class="number">' + formatNumber(remaining) + '</strong></td>'
        + '<td>' + status(entry.state, done ? "green" : entry.state === "جزئي" ? "amber" : "") + '</td>'
        + '<td><label class="sr-only" for="pa-' + index + '-qty">الكمية الفعلية لمنتج ' + esc(entry.line.productName) + ' في ' + esc(monthLabel(entry.month)) + '</label><input class="input plan-cell-input" id="pa-' + index + '-qty" name="paQty_' + index + '" type="number" min="1" step="1" inputmode="numeric" placeholder="' + (done ? "سُجّل بالكامل" : "فارغ = لا تسجيل") + '"' + lock + '></td>'
        + '<td><label class="sr-only" for="pa-' + index + '-batch">رقم دفعة ' + esc(entry.line.productName) + '</label><input class="input plan-cell-input" id="pa-' + index + '-batch" name="paBatch_' + index + '" placeholder="رقم الدفعة"' + lock + '></td>'
        + '<td><label class="sr-only" for="pa-' + index + '-date">تاريخ إنجاز ' + esc(entry.line.productName) + '</label><input class="input plan-cell-input" id="pa-' + index + '-date" name="paDate_' + index + '" type="date" value="' + dateDaysFromNow(0) + '"' + lock + '></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="paCount" value="' + entries.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج والمستند</th><th scope="col">الشهر</th><th scope="col">مخطط الشهر</th><th scope="col">المنجز سابقًا</th><th scope="col">المتبقي</th><th scope="col">الحالة</th><th scope="col">الكمية الفعلية</th><th scope="col">Batch</th><th scope="col">تاريخ الإنجاز</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">كل صف تشغيل هو منتج × شهر. سجّل الكمية ورقم الدفعة للصفوف المنتجة الآن فقط واترك الباقي فارغًا. التسجيل يسحب حصة الشهر من المواد تلقائيًا، ولا يرفع مخزون المنتج النهائي قبل استلام FG Warehouse. الصفوف المكتملة تبقى ظاهرة مقفلة لتراجع ما سُجّل سابقًا — استخدم فلتر «الحالة» أعلى الجدول لإخفائها.</div>';
    openDialog(dialogShell("Production Actual — منتج × شهر", "كل التشغيلات الجاهزة في جدول واحد، والدفعات تُسجل معًا.", body, "تسجيل الفعلي للصفوف المعبأة", "actual-form"), "wide");
  }

  function openFgForm(id) {
    if (!state.actuals.length) { showToast("لا يوجد Production Actual لاستلامه بعد.", "error"); return; }
    var current = id ? state.fgReceipts.find(function (item) { return item.id === id; }) : null;
    var actuals = state.actuals.slice();
    if (current) actuals = actuals.filter(function (item) { return item.id === current.actualId; }).concat(actuals.filter(function (item) { return item.id !== current.actualId; }));
    var rows = actuals.map(function (item, index) {
      var existing = state.fgReceipts.find(function (record) { return record.actualId === item.id; });
      return '<tr><td><strong class="code-chip">' + esc(item.productCode) + '</strong><br><small>' + esc(item.product) + '</small><br><small>' + esc(item.batch || item.id) + '</small><input type="hidden" name="fgActual_' + index + '" value="' + esc(item.id) + '"></td>'
        + '<td><strong class="number">' + formatNumber(item.actual) + '</strong><br><small>' + esc(item.date || "") + '</small></td>'
        + '<td>' + (existing ? statusByValue("confirmed") : '<span class="read-only">لم يُستلم</span>') + '</td>'
        + '<td><label class="sr-only" for="fg-' + index + '-received">الكمية المستلمة من دفعة ' + esc(item.batch || item.id) + '</label><input class="input plan-cell-input" id="fg-' + index + '-received" name="fgReceived_' + index + '" type="number" min="0" step="any" value="' + esc(existing ? existing.received : "") + '" placeholder="فارغ = لم يصل"></td>'
        + '<td><label class="sr-only" for="fg-' + index + '-reserved">المحجوز من دفعة ' + esc(item.batch || item.id) + '</label><input class="input plan-cell-input" id="fg-' + index + '-reserved" name="fgReserved_' + index + '" type="number" min="0" step="any" value="' + esc(existing ? existing.reserved : "") + '" placeholder="0"></td>'
        + '<td><label class="sr-only" for="fg-' + index + '-blocked">المحظور من دفعة ' + esc(item.batch || item.id) + '</label><input class="input plan-cell-input" id="fg-' + index + '-blocked" name="fgBlocked_' + index + '" type="number" min="0" step="any" value="' + esc(existing ? existing.blocked : "") + '" placeholder="0"></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="fgCount" value="' + actuals.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج والدفعة</th><th scope="col">Produced</th><th scope="col">حالة الاستلام</th><th scope="col">المستلم فعليًا</th><th scope="col">المحجوز</th><th scope="col">المحظور</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note locked">أدخل الكمية المستلمة للدفعات التي وصلت فقط واترك الباقي فارغًا. إذا اختلف Produced عن Received ينشئ EMICP قضية تلقائيًا، والمؤكد يصبح متاحًا للبيع مباشرة.</div>';
    openDialog(dialogShell("FG Warehouse Receipt — جدول واحد", "كل دفعات الإنتاج في جدول، والاستلام يؤكد دفعة واحدة.", body, "تأكيد الاستلامات", "fg-form"), "wide");
  }

  function openAgentForm(code) {
    var agent = code ? agentByCode(code) : null;
    if (code && !agent) { showToast("تعذر العثور على التعريف.", "error"); return; }
    if (!agent && !state.cities.length) { showToast("تنبيه: عرّف مدينة واحدة على الأقل قبل إضافة وكيل.", "error"); return; }
    var cityOptions = '<option value="">— اختر مدينة —</option>' + state.cities.map(function (city) { return '<option value="' + esc(city.name) + '"' + (agent && agent.region === city.name ? " selected" : "") + '>' + esc(city.name) + '</option>'; }).join("");
    var body = '<div class="form-grid">'
      + (agent ? '<input type="hidden" name="agCode" value="' + esc(agent.code) + '"><div class="field"><label>الكود الفريد (لا يتغير)</label><input class="input" value="' + esc(agent.code) + '" disabled></div>'
               : '<div class="field"><label for="ag-code">الكود الفريد</label><input class="input code-input" id="ag-code" name="agCode" maxlength="32" pattern="[A-Za-z0-9_-]+" placeholder="مثال: AG-001" required></div>')
      + '<div class="field"><label for="ag-name">اسم الوكيل</label><input class="input" id="ag-name" name="agName" value="' + esc(agent ? agent.name : "") + '" required></div>'
      + '<div class="field"><label for="ag-region">المدينة</label>' + (state.cities.length ? '<select class="select" id="ag-region" name="agRegion">' + cityOptions + '</select>' : '<input class="input" id="ag-region" name="agRegion" value="' + esc(agent ? agent.region : "") + '" placeholder="عرّف المدن أولًا" disabled>') + '</div>'
      + '<div class="field"><label for="ag-contact">جهة الاتصال</label><input class="input" id="ag-contact" name="agContact" value="' + esc(agent ? agent.contact : "") + '"></div>'
      + '<div class="field"><label for="ag-phone">الهاتف</label><input class="input" id="ag-phone" name="agPhone" value="' + esc(agent ? agent.phone : "") + '"></div>'
      + '<div class="field"><label for="ag-active">الحالة</label><select class="select" id="ag-active" name="agActive"><option value="true"' + (agent && agent.active === false ? "" : " selected") + '>فعال</option><option value="false"' + (agent && agent.active === false ? " selected" : "") + '>موقوف</option></select></div>'
      + '<div class="field full"><label for="ag-note">ملاحظة</label><input class="input" id="ag-note" name="agNote" value="' + esc(agent ? agent.note : "") + '" placeholder="اختياري"></div>'
      + '</div><div class="form-note">المدينة إلزامية وتُختار من تعريف المدن. الوكيل الموقوف لا يظهر في قائمة تسجيل الأوردرات الجديدة، وأوردراته السابقة تبقى محفوظة.</div>';
    openDialog(dialogShell(agent ? "تعديل وكيل" : "إضافة وكيل", "يختاره المبيعات عند تسجيل الأوردرات.", body, "حفظ الوكيل", "agent-form"));
  }

  function openAgentOrderForm() {
    if (state.role !== "sales") { showToast("تسجيل أوردرات الوكلاء للمبيعات فقط.", "error"); return; }
    var agents = activeAgents();
    if (!agents.length) { showToast("عرّف الوكلاء أولًا من تهيئة النظام (تعريف الوكلاء).", "error"); return; }
    var products = state.products.filter(function (item) { return item.active !== false; });
    if (!products.length) { showToast("عرّف المنتجات أولًا.", "error"); return; }
    var agentOptions = agents.map(function (item) { return '<option value="' + esc(item.code) + '">' + esc(item.code + " · " + item.name + (item.region ? " · " + item.region : "")) + '</option>'; }).join("");
    var rows = products.map(function (product, index) {
      return '<tr><td><strong class="code-chip">' + esc(product.code) + '</strong><br><small>' + esc(product.name) + ' · ' + esc(product.unit || "") + '</small><input type="hidden" name="aoProduct_' + index + '" value="' + esc(product.code) + '"></td>'
        + '<td><input class="input plan-cell-input" name="aoQty_' + index + '" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></td>'
        + '<td><input class="input plan-cell-input" name="aoPrice_' + index + '" type="number" min="0" step="any" inputmode="decimal" placeholder="اختياري"></td>'
        + '<td><input class="input" name="aoLineMonth_' + index + '" type="month" placeholder="شهر السطر"></td>'
        + '<td><input class="input" name="aoNote_' + index + '" type="text" placeholder="اختياري"></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="aoCount" value="' + products.length + '">'
      + '<div class="form-grid"><div class="field"><label for="ao-agent">الوكيل</label><select class="select" id="ao-agent" name="aoAgent">' + agentOptions + '</select></div>'
      + '<div class="field"><label for="ao-date">تاريخ الأوردر</label><input class="input" id="ao-date" name="aoDate" type="date" value="' + esc(currentTimestamp().slice(0, 10)) + '" required></div>'
      + '<div class="field"><label for="ao-month">شهر التسليم المطلوب</label><input class="input" id="ao-month" name="aoMonth" type="month" value="' + esc(defaultForecastMonths()[0]) + '" required></div>'
      + '<div class="field full"><label for="ao-note">ملاحظة الأوردر</label><input class="input" id="ao-note" name="aoNote" placeholder="اختياري"></div></div>'
      + '<div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج</th><th scope="col">الكمية</th><th scope="col">السعر (اختياري)</th><th scope="col">شهر السطر (اختياري)</th><th scope="col">ملاحظة السطر</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="form-note">أدخل الكميات للمنتجات المطلوبة فقط واترك الباقي فارغًا. شهر السطر يتجاوز شهر التسليم العام عند الحاجة، والأوردر يدخل الطلب المجمّع فورًا لبناء الفوركاست.</div>';
    openDialog(dialogShell("تسجيل أوردر وكيل", "أوردر واحد بكل تفاصيل أسطره.", body, "حفظ الأوردر", "agent-order-form"), "wide");
  }

  // بناء الفوركاست من مصادر الطلب: وكلاء + مبيعات مباشرة مقترحة + تعديل يدوي + هامش نمو.
  function openDemandComposer() {
    if (state.role !== "sales") { showToast("بناء الفوركاست للمبيعات فقط.", "error"); return; }
    var products = state.products.filter(function (item) { return item.active !== false; });
    if (!products.length) { showToast("عرّف المنتجات أولًا.", "error"); return; }
    var matrix = agentDemandMatrix();
    var currentMonth = monthKeyOf(dateDaysFromNow(0));
    var months = [];
    // لا تخطيط لشهر مضى: أوردر مسلَّم في كانون الثاني كان يظل يولّد صفًا في آب.
    Object.keys(matrix).forEach(function (code) { Object.keys(matrix[code]).forEach(function (month) { if (month >= currentMonth && months.indexOf(month) === -1) months.push(month); }); });
    if (!months.length) months = defaultForecastMonths().slice(0, 3);
    months.sort();
    var rows = [];
    products.forEach(function (product, pIndex) {
      var code = normalizeCode(product.code);
      var stats = directSalesStats(code);
      var suggestion = stats.average;
      var confidence = stats.monthsWithData === 0
        ? '<br><small class="read-only">لا تاريخ مبيعات مباشرة — أدخل تقديرك</small>'
        : '<br><small class="read-only">متوسط ' + stats.windowMonths + ' أشهر · بيانات في ' + stats.monthsWithData + ' منها</small>';
      var accuracy = demandAccuracyFor(code);
      var accuracyNote = accuracy
        ? '<br><small class="read-only">دقة التنبؤ السابق: انحياز ' + (accuracy.bias > 0 ? "+" : "") + accuracy.bias + '٪ · نسبة خطأ ' + accuracy.wmape + '٪ على ' + accuracy.months + ' أشهر</small>'
        : "";
      months.forEach(function (month, mIndex) {
        var demand = (matrix[code] && matrix[code][month]) || 0;
        if (!demand && !suggestion) return;
        rows.push('<tr><td><strong class="code-chip">' + esc(product.code) + '</strong><br><small>' + esc(product.name) + '</small></td>'
          + '<td>' + esc(monthLabel(month)) + '<input type="hidden" name="dcProduct_' + pIndex + '_' + mIndex + '" value="' + esc(product.code) + '"><input type="hidden" name="dcMonth_' + pIndex + '_' + mIndex + '" value="' + esc(month) + '"></td>'
          + '<td><strong class="number">' + formatNumber(demand) + '</strong></td>'
          + '<td><input class="input plan-cell-input" name="dcDirect_' + pIndex + '_' + mIndex + '" type="number" min="0" step="any" value="' + (suggestion || "") + '">' + confidence + accuracyNote + '</td>'
          + '<td><input class="input plan-cell-input" name="dcAdjust_' + pIndex + '_' + mIndex + '" type="number" step="any" placeholder="0"></td></tr>');
      });
    });
    if (!rows.length) { showToast("لا توجد أوردرات وكلاء ولا تاريخ مبيعات مباشرة لبناء مقترح — سجّل أوردرًا أولًا.", "error"); return; }
    var body = '<input type="hidden" name="dcProductCount" value="' + products.length + '"><input type="hidden" name="dcMonthCount" value="' + months.length + '">'
      + '<div class="form-grid"><div class="field"><label for="dc-growth">هامش أمان / نمو %</label><input class="input" id="dc-growth" name="dcGrowth" type="number" min="0" step="any" value="0"></div></div>'
      + '<div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج</th><th scope="col">الشهر</th><th scope="col">طلب الوكلاء</th><th scope="col">مبيعات مباشرة (مقترح)</th><th scope="col">تعديل يدوي (+/−)</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div>'
      + '<div class="form-note locked">طلب الوكلاء مجمّع تلقائيًا من الأوردرات بعد طرح ما سُلِّم منها، والمبيعات المباشرة مقترحة من متوسط ستة أشهر مكتملة وقابلة للتعديل. الإجمالي = وكلاء + (مباشر + تعديل) × (1 + الهامش) — الهامش على الجزء التقديري وحده لأن أوردر الوكيل مؤكد. يُعبَّأ في جدول Forecast للمراجعة فقط قبل الإرسال.</div>';
    openDialog(dialogShell("بناء Forecast من مصادر الطلب", "وكلاء + مبيعات مباشرة + تعديلك — ثم مراجعة قبل الإرسال.", body, "تعبئة جدول Forecast بالمقترح", "demand-composer-form"), "wide");
  }

  function openAgentOrderOptions(productCode) {
    return activeAgentOrders().filter(function (order) {
      return (order.lines || []).some(function (line) { return normalizeCode(line.productCode) === normalizeCode(productCode); })
        && agentOrderDeliveredQty(order.id, productCode) < (order.lines || []).filter(function (line) { return normalizeCode(line.productCode) === normalizeCode(productCode); }).reduce(function (sum, line) { return sum + Number(line.qty || 0); }, 0);
    }).map(function (order) {
      return '<option value="' + esc(order.id) + '">' + esc(order.id + " · " + agentName(order.agentCode) + " · " + monthLabel(order.month)) + '</option>';
    }).join("");
  }

  function openSalesForm() {
    var candidates = [];
    state.products.forEach(function (product) {
      var net = productNetAvailable(product.code);
      if (net > 0) candidates.push({ product: product, net: net });
    });
    if (!candidates.length) { showToast("لا يوجد صافٍ متاح للبيع؛ ينتظر تأكيد مخزن المنتج النهائي.", "error"); return; }
    var rows = candidates.map(function (entry, index) {
      return '<tr><td><strong class="code-chip">' + esc(entry.product.code) + '</strong><br><small>' + esc(entry.product.name) + '</small><input type="hidden" name="slProduct_' + index + '" value="' + esc(entry.product.code) + '"></td>'
        + '<td><strong class="number">' + formatNumber(entry.net) + '</strong> ' + esc(entry.product.unit || "") + '</td>'
        + '<td><label class="sr-only" for="sl-' + index + '-qty">كمية بيع ' + esc(entry.product.name) + '</label><input class="input plan-cell-input" id="sl-' + index + '-qty" name="slQty_' + index + '" type="number" min="1" step="any" inputmode="decimal" placeholder="فارغ = لا بيع"></td>'
        + '<td><label class="sr-only" for="sl-' + index + '-date">تاريخ بيع ' + esc(entry.product.name) + '</label><input class="input plan-cell-input" id="sl-' + index + '-date" name="slDate_' + index + '" type="date" value="' + dateDaysFromNow(0) + '"></td>'
        + '<td><select class="select" name="slChannel_' + index + '"><option value="direct">بيع مباشر</option><option value="agent">أوردر وكيل</option></select></td>'
        + '<td><select class="select" name="slOrder_' + index + '"><option value="">— بلا أوردر —</option>' + openAgentOrderOptions(entry.product.code) + '</select></td>'
        + '<td><label class="sr-only" for="sl-' + index + '-note">ملاحظة بيع ' + esc(entry.product.name) + '</label><input class="input plan-cell-input" id="sl-' + index + '-note" name="slNote_' + index + '" placeholder="العميل أو رقم المستند (اختياري)"></td></tr>';
    }).join("");
    var body = '<input type="hidden" name="slCount" value="' + candidates.length + '"><div class="table-wrap plan-entry-table"><table><thead><tr><th scope="col">المنتج</th><th scope="col">الصافي المتاح</th><th scope="col">كمية البيع</th><th scope="col">تاريخ البيع</th><th scope="col">القناة</th><th scope="col">أوردر الوكيل</th><th scope="col">ملاحظة</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="form-note">أدخل الكمية للمنتجات المباعة الآن فقط واترك الباقي فارغًا. البيع يُخصم من الصافي المتاح فورًا ولا يمكن أن يتجاوزه. حدد القناة: بيع مباشر (يغذي اقتراح القناة المباشرة في الفوركاست القادم) أو أوردر وكيل (يُحسب ضمن تسليم ذلك الأوردر).</div>';
    openDialog(dialogShell("تسجيل المبيعات — جدول واحد", "كل عملية بيع تسجل وتخصم من الصافي المتاح.", body, "تسجيل المبيعات", "sales-form"), "wide");
  }

  function roleOptionsHtml(selected) {
    return Object.keys(roles).map(function (key) {
      return '<option value="' + esc(key) + '"' + (key === selected ? " selected" : "") + '>' + esc(roles[key].name) + '</option>';
    }).join("");
  }

  function openIssueForm() {
    // اقتراحات السجلات الموجودة حتى لا يُكتب رقم السجل يدويًا بخطأ يفصل المشكلة عن طلبيتها.
    var sourceIds = [];
    state.forecasts.forEach(function (item) { sourceIds.push(item.id); });
    state.materials.forEach(function (item) { sourceIds.push(item.id); });
    state.commitments.forEach(function (item) { sourceIds.push(item.id); if (item.po) sourceIds.push(item.po); });
    state.rawReceipts.forEach(function (item) { sourceIds.push(item.id); });
    state.actuals.forEach(function (item) { sourceIds.push(item.id); });
    state.fgReceipts.forEach(function (item) { sourceIds.push(item.id); });
    var sourceList = '<datalist id="issue-source-list">' + sourceIds.map(function (id) { return '<option value="' + esc(id) + '"></option>'; }).join("") + '</datalist>';
    var body = '<div class="form-grid"><div class="field full"><label for="is-title">عنوان المشكلة</label><input class="input" id="is-title" name="title" placeholder="اكتب المشكلة باختصار" required></div><div class="field"><label for="is-source">السجل المرتبط</label><input class="input" id="is-source" name="source" list="issue-source-list" placeholder="اختر من الاقتراحات أو اكتب الرقم" required>' + sourceList + '</div><div class="field"><label for="is-severity">الأولوية</label><select class="select" id="is-severity" name="severity"><option value="normal">عادية</option><option value="high">عالية</option><option value="critical">حرجة</option></select></div><div class="field full"><label for="is-impact">الأثر</label><textarea class="textarea" id="is-impact" name="impact" placeholder="ما أثر المشكلة على العمل أو الموعد؟" required></textarea></div><div class="field full"><label for="is-action">الإجراء المطلوب</label><input class="input" id="is-action" name="action" placeholder="ما الإجراء الذي يجب تنفيذه؟" required></div><div class="field"><label for="is-dept">القسم الذي عنده المشكلة</label><select class="select" id="is-dept" name="department">' + roleOptionsHtml(state.role) + '</select></div><div class="field"><label for="is-owner">المالك (اسم المسؤول عن الحل)</label><input class="input" id="is-owner" name="owner" placeholder="اسم المسؤول عن الحل" required></div><div class="field"><label for="is-due">الموعد</label><input class="input" id="is-due" name="due" type="date" required></div><div class="field full"><div class="form-note">المُبلِّغ يُسجَّل تلقائيًا باسم دورك الحالي (' + esc(roleName(state.role)) + ') مع تاريخ ووقت الفتح، ولا يمكن تعديله لاحقًا.</div></div></div>';
    openDialog(dialogShell("تسجيل مشكلة", "أي قسم يستطيع التسجيل، لكن يجب تحديد أثر وإجراء ومالك وموعد.", body, "فتح القضية", "issue-form"));
  }

  // الإغلاق بضغطة واحدة كان يكتب «تم التحقق» بلا سبب ولا حل، فلا يتعلم المصنع من مشكلاته.
  // الآن الإغلاق يطلب: السبب الجذري، والحل المنفَّذ، وإجراء المنع (اختياري).
  // من يحلّ المشكلة هو القسم الذي عندها أو من بلّغ عنها — لا الإدارة وحدها.
  // كانت أزرار الحل مقصورة على الإدارة العليا ومسؤول النظام، فيبقى القسم المسؤول بلا زر أصلًا.
  function canResolveIssue(issue) {
    if (!issue || issue.status === "closed") return false;
    if (state.role === "executive" || state.role === "admin") return true;
    return state.role === issue.departmentRole || state.role === issue.raisedByRole;
  }

  function canVerifyIssue(issue) {
    return Boolean(issue) && issue.status !== "closed" && (state.role === "executive" || state.role === "admin");
  }

  function openIssueCloseForm(id) {
    var item = state.issues.find(function (issue) { return issue.id === id; });
    if (!item || !issueVisibleToRole(item)) { showToast("تعذر العثور على القضية.", "error"); return; }
    if (item.status === "closed") { showToast("هذه القضية مغلقة أصلًا.", "error"); return; }
    if (!canResolveIssue(item)) { showToast("تسجيل الحل لقسم المشكلة أو من بلّغ عنها أو الإدارة.", "error"); return; }
    var verifying = canVerifyIssue(item);
    var body = '<input type="hidden" name="icId" value="' + esc(item.id) + '">'
      + '<div class="question-grid"><div class="question"><span>القضية</span><strong>' + esc(item.title) + '</strong></div>'
      + '<div class="question"><span>القسم</span><strong>' + esc(item.department) + '</strong></div>'
      + '<div class="question"><span>المُبلِّغ</span><strong>' + esc(item.raisedBy || item.department) + '</strong></div>'
      + '<div class="question"><span>تاريخ الفتح</span><strong>' + esc(displayTimestamp(item.createdAt)) + '</strong></div></div>'
      + '<div class="form-grid"><div class="field full"><label for="ic-cause">سبب المشكلة الجذري</label><textarea class="textarea" id="ic-cause" name="icCause" placeholder="لماذا حدثت؟ اكتب السبب لا العَرَض" required>' + esc(item.rootCause || "") + '</textarea></div>'
      + '<div class="field full"><label for="ic-fix">الحل المنفَّذ</label><textarea class="textarea" id="ic-fix" name="icFix" placeholder="ما الذي عُمل فعلًا حتى انحلّت؟" required>' + esc(item.resolution || "") + '</textarea></div>'
      + '<div class="field full"><label for="ic-prevent">إجراء المنع (اختياري)</label><input class="input" id="ic-prevent" name="icPrevent" placeholder="ما الذي يمنع تكرارها؟" value="' + esc(item.prevention || "") + '"></div></div>'
      + '<div class="form-note">' + (verifying
        ? "لا تُغلق قضية بلا سبب وحل مكتوبين؛ هذا ما يجعل سجل المشكلات مرجعًا للمصنع لا قائمة شكاوى."
        : "سجّل السبب والحل كما نفّذته؛ تصبح القضية «انحلّت — بانتظار التحقق»، والإدارة تتحقق وتغلق.") + '</div>';
    openDialog(dialogShell(
      (verifying ? "إغلاق القضية — " : "تسجيل حل القضية — ") + item.id,
      verifying ? "اكتب السبب والحل قبل الإغلاق." : "اكتب السبب والحل كما نفّذته.",
      body, verifying ? "تأكيد الحل وإغلاق القضية" : "تسجيل الحل", "issue-close-form"), "wide");
  }

  function openIssueDetails(id) {
    var item = state.issues.find(function (issue) { return issue.id === id; });
    if (!item || !issueVisibleToRole(item)) return;
    var safeSource = state.role === "sales" ? "سجل تشغيلي مرتبط" : item.source;
    var body = '<div class="question-grid"><div class="question"><span>القضية</span><strong>' + esc(item.id) + '</strong></div><div class="question"><span>السجل المرتبط</span><strong>' + esc(safeSource) + '</strong></div><div class="question"><span>القسم</span><strong>' + esc(item.department) + '</strong></div><div class="question"><span>الحالة</span><strong>' + esc(statusInfo(item.status)[0]) + '</strong></div><div class="question"><span>تاريخ الفتح</span><strong>' + esc(displayTimestamp(item.createdAt)) + '</strong></div><div class="question"><span>تاريخ الإغلاق</span><strong>' + esc(displayTimestamp(item.closedAt)) + '</strong></div><div class="question"><span>الأثر</span><strong>' + esc(redactForSales(item.impact)) + '</strong></div><div class="question"><span>الإجراء</span><strong>' + esc(redactForSales(item.action)) + '</strong></div><div class="question"><span>المالك</span><strong>' + esc(item.owner) + '</strong></div><div class="question"><span>الموعد</span><strong>' + esc(item.due) + '</strong></div><div class="question"><span>المُبلِّغ</span><strong>' + esc(item.raisedBy || "—") + '</strong></div><div class="question"><span>سبب المشكلة</span><strong>' + esc(redactForSales(item.rootCause) || "لم يُكتب بعد") + '</strong></div><div class="question"><span>الحل المنفَّذ</span><strong>' + esc(redactForSales(item.resolution) || "لم يُكتب بعد") + '</strong></div><div class="question"><span>إجراء المنع</span><strong>' + esc(redactForSales(item.prevention) || "—") + '</strong></div><div class="question"><span>سجّل الحل</span><strong>' + esc(item.resolvedBy || "—") + '</strong></div><div class="question"><span>تاريخ تسجيل الحل</span><strong>' + esc(displayTimestamp(item.resolvedAt)) + '</strong></div><div class="question"><span>أغلقها</span><strong>' + esc(item.closedBy || "—") + '</strong></div><div class="question"><span>الدليل</span><strong>' + esc(item.evidence || "لم يُرفق بعد") + '</strong></div></div>';
    openDialog('<header class="dialog-head"><div><h2 id="dialog-title">' + esc(item.title) + '</h2><p>' + esc(item.id) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="إغلاق">×</button></header><div class="dialog-body">' + body + '</div><footer class="dialog-foot"><button class="btn btn-primary" type="button" data-action="close-dialog">إغلاق</button></footer>');
  }

  function saveStockForm(form) {
    if (!form) { showToast("تعذر فتح نموذج الرصيد. أغلق النافذة وافتحها مجددًا.", "error"); return; }
    var data = new FormData(form);
    var stockCategory = data.get("stockCategory") === "packing" ? "packing" : "raw";
    var stockCount = Number(data.get("stockCount") || 0);
    if (!stockCount) { setDialogFormError(form, "لا توجد مواد في الجدول."); return; }
    var stockRows = [];
    for (var sIndex = 0; sIndex < stockCount; sIndex += 1) {
      // تُحفظ الصفوف المحددة بعمود «تأكيد» فقط؛ الصف يتحدد تلقائيًا عند تعديل أرقامه.
      if (data.get("stockConfirm_" + sIndex) == null) continue;
      var stockCode = normalizeCode(data.get("stockCode_" + sIndex));
      var onHandRaw = data.get("stockOnHand_" + sIndex);
      var reservedRaw = data.get("stockReserved_" + sIndex);
      var holdRaw = data.get("stockHold_" + sIndex);
      var expiryDate = String(data.get("stockExpiry_" + sIndex) || "");
      var capacityRaw = String(data.get("stockCapacity_" + sIndex) == null ? "" : data.get("stockCapacity_" + sIndex)).trim();
      if (![onHandRaw, reservedRaw, holdRaw].every(function (value) { return validNumber(value, true); })) { setDialogFormError(form, "أدخل أرقام مخزون صحيحة وغير سالبة لجميع حقول المادة " + stockCode + "."); return; }
      if (capacityRaw !== "" && !validNumber(capacityRaw, true)) { setDialogFormError(form, "أدخل أقصى طاقة تخزين صحيحة وغير سالبة للمادة " + stockCode + " أو اتركها فارغة."); return; }
      if (Number(reservedRaw) + Number(holdRaw) > Number(onHandRaw)) { setDialogFormError(form, "المحجوز مع Hold لا يمكن أن يتجاوز On Hand للمادة " + stockCode + "."); return; }
      if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) { setDialogFormError(form, "أدخل تاريخ انتهاء صحيحًا للمادة " + stockCode + "."); return; }
      stockRows.push({ code: stockCode, category: stockCategory, onHand: Number(onHandRaw), reserved: Number(reservedRaw), hold: Number(holdRaw), expiryDate: expiryDate, storageCapacity: capacityRaw === "" ? null : Number(capacityRaw) });
    }
    if (!stockRows.length) { setDialogFormError(form, "حدد صفًا واحدًا على الأقل في عمود «تأكيد» — يتحدد تلقائيًا عند تعديل أرقامه."); return; }
    var confirmedCodes = 0, shortageCodes = 0;
    var stamp = currentTimestamp();
      stockRows.forEach(function (row) {
        var stockMaster = rawMasterByCode(row.code, row.category);
        if (stockMaster) { stockMaster.storageCapacity = row.storageCapacity; stockMaster.storageCapacityConfirmedAt = stamp; stockMaster.storageCapacityConfirmedBy = roleName(state.role); }
        var records = materialRecordsSameCode(row.code).filter(function (record) { return (record.category || "raw") === row.category; });
      if (!records.length) return;
      records.forEach(function (record) {
        record.onHand = row.onHand;
        record.reserved = row.reserved;
        record.hold = row.hold;
        record.expiryDate = row.expiryDate;
        record.stockConfirmed = true;
        record.stockConfirmedAt = stamp;
        record.status = materialShortage(record) > 0 ? "shortage" : "available";
      });
      confirmedCodes += 1;
      if (records.some(function (record) { return materialShortage(record) > 0; })) shortageCodes += 1;
    });
    if (!confirmedCodes) { setDialogFormError(form, "لم يتم تأكيد أي مادة."); return; }
    var reviewCategory = stockCategory;
    state.warehouseReviews[reviewCategory] = { status: "sent_production", at: stamp, by: roleName(state.role) };
    addAudit("تأكيد أرصدة " + confirmedCodes + " مادة من جدول واحد؛ مواد فيها نقص: " + shortageCodes, roleName(state.role));
    closeDialog();
    refresh("تم تأكيد وإرسال ملف " + (reviewCategory === "packing" ? "مواد التغليف" : "المواد الأولية") + " إلى الإنتاج للمراجعة.");
  }

  function saveReceiptForm(form) {
    if (!form) { showToast("تعذر فتح نموذج الاستلام. أغلق النافذة وافتحها مجددًا.", "error"); return; }
    var data = new FormData(form);
    var rrCount = Number(data.get("rrCount") || 0);
    if (!rrCount) { setDialogFormError(form, "لا يوجد وارد في الجدول."); return; }
    var receiptRows = [];
    for (var rIndex = 0; rIndex < rrCount; rIndex += 1) {
      var rrId = String(data.get("rrId_" + rIndex) || "");
      var rrQtyValue = data.get("rrQty_" + rIndex);
      var rrQtyRaw = String(rrQtyValue == null ? "" : rrQtyValue).trim();
      if (rrQtyRaw === "") continue;
      var receiptRecord = state.rawReceipts.find(function (item) { return item.id === rrId; });
      if (!receiptRecord) continue;
      if (!validNumber(rrQtyRaw, true)) { setDialogFormError(form, "أدخل كمية مستلمة صحيحة وغير سالبة للوارد " + rrId + " أو اتركه فارغًا."); return; }
      if (!receiptReadyForWarehouse(receiptRecord)) { setDialogFormError(form, "الوارد " + rrId + " غير جاهز للاستلام قبل اعتماد Finance وIn Transit."); return; }
      receiptRows.push({ receipt: receiptRecord, received: Number(rrQtyRaw), note: String(data.get("rrNote_" + rIndex) || "") });
    }
    if (!receiptRows.length) { setDialogFormError(form, "أدخل الكمية المستلمة لوارد واحد على الأقل، واترك ما لم يصل فارغًا."); return; }
    var totalShortfall = 0;
    receiptRows.forEach(function (row) {
      var receipt = row.receipt;
      receipt.received = row.received;
      receipt.status = "received";
      receipt.receivedDate = dateDaysFromNow(0);
      receipt.receivedAt = currentTimestamp();
      receipt.note = row.note;
      receipt.postedToStock = true;
      var receivedCommitment = state.commitments.find(function (item) { return item.id === receipt.commitmentId; });
      if (receivedCommitment) {
        // كان الأوردر يُقفل «مستلم» حتى عند استلام صفر أو جزء — فيتعذر إلغاؤه أو متابعته.
        receivedCommitment.status = receipt.received >= Number(receipt.qty) ? "received" : "partial";
        receivedCommitment.receivedAt = receipt.receivedAt;
      }
      // الاستلام يُرحّل مباشرة إلى الرصيد، ويُخصم كامل المتوقع من Inbound
      // حتى لا تبقى كمية "قادمة" وهمية تخفي نقصًا حقيقيًا عند الاستلام الجزئي.
      var receiptMaterial = receivedCommitment && state.materials.find(function (item) { return item.id === receivedCommitment.materialId; });
      var remainingShortfall = Math.max(0, Number(receipt.qty) - receipt.received);
      totalShortfall += remainingShortfall;
      if (receiptMaterial) {
        receiptMaterial.onHand = Number(receiptMaterial.onHand || 0) + receipt.received;
        receiptMaterial.inbound = Math.max(0, Number(receiptMaterial.inbound || 0) - Number(receipt.qty));
        receiptMaterial.status = materialShortage(receiptMaterial) > 0 ? "shortage" : "available";
        syncMaterialStockAcrossPlans(receiptMaterial);
      }
      recordMaterialMove("receive", { materialCode: receipt.materialCode, material: receipt.material, unit: receiptMaterial ? receiptMaterial.unit : "" }, receipt.received, monthKeyOf(receipt.receivedDate), receipt.id);
      addAudit("تأكيد استلام " + receipt.id + " بكمية " + receipt.received + (remainingShortfall ? "؛ متبقٍ غير مستلم " + remainingShortfall : ""), roleName(state.role));
    });
    closeDialog();
    refresh(totalShortfall > 0 ? "تم استلام " + receiptRows.length + " وارد؛ إجمالي المتبقي غير المستلم " + formatNumber(totalShortfall) + " ظهر كنقص جديد للمشتريات." : "تم استلام " + receiptRows.length + " وارد وإضافته مباشرة إلى الرصيد المتاح.");
  }

  document.addEventListener("submit", function (event) {
    event.preventDefault();
    var form = event.target;
    var data = new FormData(form);
    setDialogFormError(form, "");

    // الحارس المركزي: يُفحص قبل أي معالج، فلا يعود إخفاء الزر هو ما يحمي البيانات.
    var formAllowed = rolesAllowedFor(FORM_ROLES, form.id);
    if (formAllowed && formAllowed.indexOf(state.role) === -1) {
      setDialogFormError(form, denialMessage(formAllowed));
      return;
    }

    if (form.id === "city-form") {
      var cityCode = normalizeCode(data.get("cityCode"));
      var cityName = String(data.get("cityName") || "").trim();
      if (!validMasterCode(cityCode) || !cityName) { setDialogFormError(form, "أدخل كودًا صالحًا واسم المدينة."); return; }
      if (state.cities.some(function (item) { return normalizeCode(item.code) === cityCode; })) { setDialogFormError(form, "كود المدينة مستخدم مسبقًا."); return; }
      state.cities.push({ code: cityCode, name: cityName, createdAt: currentTimestamp() });
      addAudit("إضافة مدينة " + cityCode + " · " + cityName, roleName(state.role));
      closeDialog(); refresh("تم حفظ المدينة."); return;
    }

    if (form.id === "backup-settings-form") {
      if (state.role !== "admin") { setDialogFormError(form, "إعدادات النسخ الاحتياطي لمسؤول النظام فقط."); return; }
      var backupStartDate = String(data.get("backupStartDate") || "");
      if (backupStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(backupStartDate)) { setDialogFormError(form, "أدخل تاريخ بدء صحيحًا أو اتركه فارغًا."); return; }
      state.backupSettings = state.backupSettings || {};
      state.backupSettings.reminderEnabled = data.get("backupReminder") === "on";
      state.backupSettings.autoEnabled = data.get("backupAuto") === "on";
      state.backupSettings.autoStartDate = backupStartDate;
      addAudit("تعديل إعدادات النسخ الاحتياطي: تذكير " + (state.backupSettings.reminderEnabled ? "مفعّل" : "مطفأ") + "، تلقائي " + (state.backupSettings.autoEnabled ? "مفعّل" : "مطفأ"), roleName(state.role));
      closeDialog();
      refresh("تم حفظ إعدادات النسخ الاحتياطي.");
      return;
    }

    if (form.id === "password-form") {
      if (state.role !== "admin") { setDialogFormError(form, "إدارة المستخدمين لمسؤول النظام فقط."); return; }
      var pwUser = state.users.find(function (item) { return item.id === String(data.get("pwUser")); });
      if (!pwUser) { setDialogFormError(form, "تعذر العثور على المستخدم."); return; }
      var pwValue = String(data.get("pwValue") || "");
      if (pwValue && pwValue.length < 4) { setDialogFormError(form, "كلمة المرور قصيرة — 4 أحرف على الأقل أو اتركها فارغة للإزالة."); return; }
      pwUser.passHash = hashPassword(pwValue);
      addAudit((pwValue ? "تعيين كلمة مرور للمستخدم " : "إزالة كلمة مرور المستخدم ") + pwUser.name, roleName(state.role));
      closeDialog();
      refresh(pwValue ? "حُفظت كلمة المرور — ستُطلب في لوحة الدخول." : "أُزيلت كلمة المرور — يدخل المستخدم مباشرة.");
      return;
    }

    if (form.id === "user-form") {
      if (state.role !== "admin") { setDialogFormError(form, "إدارة المستخدمين لمسؤول النظام فقط."); return; }
      var uCount = Number(data.get("uCount") || 0);
      var newUsers = [];
      for (var uIndex = 0; uIndex < uCount; uIndex += 1) {
        var uName = String(data.get("uName_" + uIndex) || "").trim();
        var uRole = String(data.get("uRole_" + uIndex) || "");
        if (!uName) continue;
        if (!roles[uRole]) { setDialogFormError(form, "اختر دورًا صحيحًا للمستخدم " + uName + "."); return; }
        if (state.users.some(function (user) { return user.name === uName && user.role === uRole; }) || newUsers.some(function (user) { return user.name === uName && user.role === uRole; })) { setDialogFormError(form, "المستخدم " + uName + " موجود مسبقًا بنفس الدور."); return; }
        var uPass = String(data.get("uPass_" + uIndex) || "");
        if (uPass && uPass.length < 4) { setDialogFormError(form, "كلمة مرور المستخدم " + uName + " قصيرة — 4 أحرف على الأقل أو اتركها فارغة."); return; }
        newUsers.push({ id: createId("U"), name: uName, role: uRole, active: true, passHash: hashPassword(uPass), createdAt: currentTimestamp(), dashboardWidgets: {}, homeDashboardWidgets: {} });
      }
      if (!newUsers.length) { setDialogFormError(form, "أدخل اسم مستخدم واحد على الأقل."); return; }
      newUsers.forEach(function (user) { state.users.push(user); addAudit("إضافة المستخدم " + user.name + " (" + roleName(user.role) + ")", roleName(state.role)); });
      closeDialog();
      refresh("أُضيف " + newUsers.length + " مستخدم — أصبحوا ظاهرين في لوحة الدخول.");
      return;
    }

    if (form.id === "login-form") {
      var shouldOpenGuide = !state.guideSeen;
      var loginUser = activeUsers().find(function (user) { return user.id === String(data.get("user") || ""); });
      if (!loginUser) { showToast("اختر مستخدمًا فعالًا للدخول.", "error"); return; }
      if (loginUser.passHash && hashPassword(String(data.get("password") || "")) !== loginUser.passHash) { showToast("كلمة المرور غير صحيحة للمستخدم " + loginUser.name + ".", "error"); return; }
      state.currentUserId = loginUser.id;
      state.role = loginUser.role;
      state.page = state.role === "admin" && !state.products.length ? "setup" : "home";
      state.loggedIn = true;
      state.guideSeen = true;
      saveState();
      renderApp();
      showToast("تم الدخول إلى مساحة " + roleName(state.role) + " باسم " + loginUser.name + ".", "success");
      if (shouldOpenGuide) window.setTimeout(openGuide, 150);
      return;
    }

    if (form.id === "agent-form") {
      if (state.role !== "admin" && state.role !== "sales") { setDialogFormError(form, "تعريف الوكلاء لمسؤول النظام والمبيعات فقط."); return; }
      var agCode = normalizeCode(data.get("agCode"));
      var agName = String(data.get("agName") || "").trim();
      if (!validMasterCode(agCode) || !agName) { setDialogFormError(form, "أدخل كودًا صحيحًا واسم الوكيل."); return; }
      var agRegion = String(data.get("agRegion") || "").trim();
      if (!agRegion) { setDialogFormError(form, "اختر مدينة للوكيل. إذا لم تظهر مدينة، عرّفها أولًا من «تعريف المدن»."); return; }
      if (state.cities.length && !state.cities.some(function (city) { return city.name === agRegion; })) { setDialogFormError(form, "المدينة المختارة غير معرفة في النظام. عرّفها أولًا من «تعريف المدن»."); return; }
      var agExisting = agentByCode(agCode);
      var agEntry = agExisting || { code: agCode, createdAt: currentTimestamp() };
      if (!agExisting && agentByCode(agCode)) { setDialogFormError(form, "كود الوكيل مستخدم مسبقًا في جدول الوكلاء. أدخل كودًا فريدًا."); return; }
      agEntry.name = agName;
      agEntry.region = agRegion;
      agEntry.contact = String(data.get("agContact") || "").trim();
      agEntry.phone = String(data.get("agPhone") || "").trim();
      agEntry.note = String(data.get("agNote") || "").trim();
      agEntry.active = String(data.get("agActive")) !== "false";
      if (!agExisting) state.agents.push(agEntry);
      agEntry.updatedAt = currentTimestamp();
      addAudit((agExisting ? "تعديل الوكيل " : "تعريف الوكيل ") + agCode + " · " + agName, roleName(state.role));
      closeDialog(); refresh(agExisting ? "حُفظ تعديل الوكيل." : "أُضيف الوكيل وأصبح متاحًا لتسجيل الأوردرات."); return;
    }

    if (form.id === "agent-order-form") {
      if (state.role !== "sales") { setDialogFormError(form, "تسجيل أوردرات الوكلاء للمبيعات فقط."); return; }
      var aoAgent = agentByCode(data.get("aoAgent"));
      if (!aoAgent) { setDialogFormError(form, "اختر وكيلًا فعالًا."); return; }
      var aoDate = String(data.get("aoDate") || "");
      var aoMonth = String(data.get("aoMonth") || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(aoDate) || !/^\d{4}-\d{2}$/.test(aoMonth)) { setDialogFormError(form, "أدخل تاريخ أوردر وشهر تسليم صحيحين."); return; }
      var aoCount = Number(data.get("aoCount") || 0);
      var aoLines = [];
      for (var aoIndex = 0; aoIndex < aoCount; aoIndex += 1) {
        var aoRaw = String(data.get("aoQty_" + aoIndex) == null ? "" : data.get("aoQty_" + aoIndex)).trim();
        if (aoRaw === "") continue;
        var aoProductCode = normalizeCode(data.get("aoProduct_" + aoIndex));
        if (!validNumber(aoRaw, false)) { setDialogFormError(form, "أدخل كمية صحيحة موجبة للمنتج " + aoProductCode + " أو اترك صفه فارغًا."); return; }
        var aoPriceRaw = String(data.get("aoPrice_" + aoIndex) == null ? "" : data.get("aoPrice_" + aoIndex)).trim();
        if (aoPriceRaw !== "" && !validNumber(aoPriceRaw, true)) { setDialogFormError(form, "أدخل سعرًا صحيحًا للمنتج " + aoProductCode + " أو اتركه فارغًا."); return; }
        var aoLineMonth = String(data.get("aoLineMonth_" + aoIndex) || "");
        if (aoLineMonth && !/^\d{4}-\d{2}$/.test(aoLineMonth)) { setDialogFormError(form, "شهر السطر للمنتج " + aoProductCode + " غير صحيح."); return; }
        aoLines.push({ productCode: aoProductCode, qty: Number(aoRaw), price: aoPriceRaw === "" ? null : Number(aoPriceRaw), month: aoLineMonth || aoMonth, note: String(data.get("aoNote_" + aoIndex) || "").trim() });
      }
      if (!aoLines.length) { setDialogFormError(form, "أدخل كمية لمنتج واحد على الأقل في الأوردر."); return; }
      var aoOrder = { id: createId("AO"), agentCode: aoAgent.code, orderDate: aoDate, month: aoMonth, note: String(data.get("aoNote") || "").trim(), status: "confirmed", lines: aoLines, createdAt: currentTimestamp() };
      state.agentOrders.unshift(aoOrder);
      addAudit("تسجيل أوردر وكيل " + aoOrder.id + " للوكيل " + aoAgent.code + " (" + aoLines.length + " منتج · " + formatNumber(agentOrderQty(aoOrder)) + ")", roleName(state.role));
      closeDialog(); refresh("سُجّل أوردر الوكيل ودخل الطلب المجمّع لبناء الفوركاست."); return;
    }

    if (form.id === "demand-composer-form") {
      if (state.role !== "sales") { setDialogFormError(form, "بناء الفوركاست للمبيعات فقط."); return; }
      var dcGrowthRaw = String(data.get("dcGrowth") || "0").trim();
      if (dcGrowthRaw !== "" && !validNumber(dcGrowthRaw, true)) { setDialogFormError(form, "أدخل هامشًا رقميًا غير سالب."); return; }
      var dcGrowth = dcGrowthRaw === "" ? 0 : Number(dcGrowthRaw);
      var dcProductCount = Number(data.get("dcProductCount") || 0);
      var dcMonthCount = Number(data.get("dcMonthCount") || 0);
      var dcValues = {};
      var dcMonths = [];
      var dcFilled = 0;
      for (var dcP = 0; dcP < dcProductCount; dcP += 1) {
        for (var dcM = 0; dcM < dcMonthCount; dcM += 1) {
          var dcCode = normalizeCode(data.get("dcProduct_" + dcP + "_" + dcM));
          var dcMonth = String(data.get("dcMonth_" + dcP + "_" + dcM) || "");
          if (!dcCode || !dcMonth) continue;
          var dcDirectRaw = String(data.get("dcDirect_" + dcP + "_" + dcM) == null ? "" : data.get("dcDirect_" + dcP + "_" + dcM)).trim();
          var dcAdjustRaw = String(data.get("dcAdjust_" + dcP + "_" + dcM) == null ? "" : data.get("dcAdjust_" + dcP + "_" + dcM)).trim();
          if (dcDirectRaw !== "" && !validNumber(dcDirectRaw, true)) { setDialogFormError(form, "أدخل قيمة مبيعات مباشرة صحيحة للمنتج " + dcCode + "."); return; }
          if (dcAdjustRaw !== "" && isNaN(Number(dcAdjustRaw))) { setDialogFormError(form, "أدخل تعديلًا رقميًا صحيحًا للمنتج " + dcCode + "."); return; }
          // الهامش على الجزء التقديري فقط: طلب الوكلاء مؤكد ولا عدم يقين فيه يبرر تضخيمه.
          var dcAgentQty = agentDemandFor(dcCode, dcMonth);
          var dcEstimated = (dcDirectRaw === "" ? 0 : Number(dcDirectRaw)) + (dcAdjustRaw === "" ? 0 : Number(dcAdjustRaw));
          var dcTotal = Math.max(0, Math.round(dcAgentQty + dcEstimated * (1 + dcGrowth / 100)));
          if (!dcTotal) continue;
          dcValues[dcCode] = dcValues[dcCode] || {};
          dcValues[dcCode][dcMonth] = String(dcTotal);
          if (dcMonths.indexOf(dcMonth) === -1) dcMonths.push(dcMonth);
          dcFilled += 1;
        }
      }
      if (!dcFilled) { setDialogFormError(form, "المقترح فارغ — أدخل مبيعات مباشرة أو تعديلًا، أو سجّل أوردرات وكلاء."); return; }
      dcMonths.sort();
      // أشهر متصلة: تمرير الأشهر ذات القيم فقط كان يجعل نموذج Forecast يرفض الحفظ دائمًا
      // لأنه يعيد توليد المدى كاملًا ثم يقارنه بالشبكة.
      var dcRange = monthsBetween(dcMonths[0], dcMonths[dcMonths.length - 1]);
      if (!dcRange.length) dcRange = dcMonths;
      addAudit("بناء مقترح Forecast من مصادر الطلب (" + dcFilled + " خانة، هامش " + dcGrowth + "٪ على الجزء التقديري)", roleName(state.role));
      closeDialog();
      openForecastForm(null, { months: dcRange, values: dcValues, notes: {}, priority: "", note: "مبني من أوردرات الوكلاء والمبيعات المباشرة" });
      showToast("عُبّئ المقترح (" + dcFilled + " خانة) — راجع الأرقام ثم أرسل المستند.", "success");
      return;
    }

    if (form.id === "packing-bom-form") {
      if (state.role !== "admin") { setDialogFormError(form, "التعريفات لمسؤول النظام فقط."); return; }
      var pbProduct = state.products.find(function (item) { return normalizeCode(item.code) === normalizeCode(data.get("pbProduct")); });
      if (!pbProduct) { setDialogFormError(form, "تعذر العثور على التعريف."); return; }
      var pbCount = Number(data.get("pbCount") || 0);
      var pbEntries = [];
      for (var pbIndex = 0; pbIndex < pbCount; pbIndex += 1) {
        var pbCode = normalizeCode(data.get("pbCode_" + pbIndex));
        var pbRaw = String(data.get("pbQty_" + pbIndex) == null ? "" : data.get("pbQty_" + pbIndex)).trim();
        if (!pbCode || pbRaw === "") continue;
        if (!validNumber(pbRaw, true) || !(Number(pbRaw) > 0)) { setDialogFormError(form, "أدخل كمية صحيحة موجبة للمادة " + pbCode + " أو اتركها فارغة."); return; }
        pbEntries.push({ materialCode: pbCode, qtyPerUnit: Number(pbRaw) });
      }
      pbProduct.packingBom = pbEntries;
      addAudit("حفظ وصفة الباكينغ للمنتج " + pbProduct.code + " (" + pbEntries.length + " مواد)", roleName(state.role));
      closeDialog();
      refresh(pbEntries.length ? "حُفظت وصفة الباكينغ — الحساب التلقائي في جدول الاحتياجات أصبح جاهزًا." : "أُزيلت وصفة الباكينغ لهذا المنتج.");
      return;
    }

    if (form.id === "product-master-form") {
      var productCode = normalizeCode(data.get("code"));
      var productName = String(data.get("name") || "").trim();
      var productUnit = String(data.get("unit") || "").trim();
      if (!validMasterCode(productCode) || !productName || !productUnit) { setDialogFormError(form, "أدخل كودًا صحيحًا واسم المنتج ووحدة القياس."); return; }
      if (codeExistsIn(state.products, productCode)) { setDialogFormError(form, "كود المنتج مستخدم مسبقًا في جدول المنتجات النهائية. أدخل كودًا فريدًا."); return; }
      state.products.push({ code: productCode, name: productName, unit: productUnit, active: true, createdAt: currentTimestamp() });
      addAudit("تعريف المنتج " + productCode, roleName(state.role));
      closeDialog(); refresh("تم حفظ المنتج وإتاحته في قائمة Forecast."); return;
    }

    if (form.id === "raw-material-master-form") {
      var rawCode = normalizeCode(data.get("code"));
      var rawName = String(data.get("name") || "").trim();
      var rawUnit = String(data.get("unit") || "وحدة").trim() || "وحدة";
      if (!validMasterCode(rawCode) || !rawName) { setDialogFormError(form, "أدخل كودًا صحيحًا واسم المادة."); return; }
      if (codeExistsIn(state.rawMaterials, rawCode)) { setDialogFormError(form, "كود المادة مستخدم مسبقًا في جدول المواد الأولية ومواد التغليف. أدخل كودًا فريدًا."); return; }
      var rawEntry = { code: rawCode, name: rawName, unit: rawUnit, active: true, createdAt: currentTimestamp() };
      if (!applyMaterialDetails(data, rawEntry, form)) return;
      state.rawMaterials.push(rawEntry);
      addAudit("تعريف المادة الأولية " + rawCode, roleName(state.role));
      closeDialog(); refresh("تم حفظ المادة وإتاحتها للإنتاج."); return;
    }

    if (form.id === "product-edit-form" || form.id === "raw-material-edit-form") {
      var editList = form.id === "product-edit-form" ? state.products : state.rawMaterials;
      var editItem = editList.find(function (record) { return normalizeCode(record.code) === normalizeCode(data.get("code")); });
      var editName = String(data.get("name") || "").trim();
      var editUnit = form.id === "product-edit-form" ? String(data.get("unit") || "").trim() : (editItem && editItem.unit || "وحدة");
      if (!editItem || !editName || !editUnit) { setDialogFormError(form, form.id === "product-edit-form" ? "أدخل الاسم ووحدة القياس." : "أدخل اسم المادة."); return; }
      editItem.name = editName;
      editItem.unit = editUnit;
      editItem.active = String(data.get("active")) !== "false";
      if (form.id === "raw-material-edit-form" && !applyMaterialDetails(data, editItem, form)) return;
      editItem.updatedAt = currentTimestamp();
      addAudit("تعديل التعريف " + editItem.code + (editItem.active ? "" : " وتعطيله"), roleName(state.role));
      closeDialog(); refresh("تم حفظ التعديل."); return;
    }

    if (form.id === "waste-form") {
      if (state.role !== "rmWarehouse") { setDialogFormError(form, "تسجيل التوالف لمخزن المواد الأولية فقط."); return; }
      var wsDate = String(data.get("wsDate") || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wsDate)) { setDialogFormError(form, "أدخل تاريخًا صحيحًا للتسجيل."); return; }
      var wsCount = Number(data.get("wsCount") || 0);
      var wsRows = [];
      for (var wsIndex = 0; wsIndex < wsCount; wsIndex += 1) {
        var wsCode = normalizeCode(data.get("wsCode_" + wsIndex));
        var wsRaw = String(data.get("wsQty_" + wsIndex) == null ? "" : data.get("wsQty_" + wsIndex)).trim();
        if (!wsCode || wsRaw === "") continue;
        if (!validNumber(wsRaw, true) || !(Number(wsRaw) > 0)) { setDialogFormError(form, "أدخل كمية توالف صحيحة موجبة للمادة " + wsCode + " أو اتركها فارغة."); return; }
        var wsRecords = sortedCodeRecords(wsCode).filter(function (record) { return record.stockConfirmed; });
        if (!wsRecords.length) { setDialogFormError(form, "المادة " + wsCode + " بلا رصيد مؤكد."); return; }
        var wsOnHand = Number(wsRecords[0].onHand || 0);
        if (Number(wsRaw) > wsOnHand) { setDialogFormError(form, "كمية التوالف للمادة " + wsCode + " تتجاوز الرصيد الحالي (" + formatNumber(wsOnHand) + ")."); return; }
        wsRows.push({ code: wsCode, qty: Number(wsRaw), reason: String(data.get("wsReason_" + wsIndex) || "other"), note: String(data.get("wsNote_" + wsIndex) || "").trim(), records: wsRecords });
      }
      if (!wsRows.length) { setDialogFormError(form, "أدخل كمية توالف لمادة واحدة على الأقل."); return; }
      wsRows.forEach(function (row) {
        var reference = row.records[0];
        var newOnHand = Math.max(0, Number(reference.onHand || 0) - row.qty);
        row.records.forEach(function (record) {
          record.onHand = newOnHand;
          record.status = materialShortage(record) > 0 ? "shortage" : "available";
        });
        state.wasteRecords.unshift({
          id: createId("WS"), materialCode: row.code, material: reference.material, unit: reference.unit || "",
          qty: row.qty, reason: WASTE_REASONS[row.reason] ? row.reason : "other", note: row.note,
          date: wsDate, recordedAt: currentTimestamp(), by: "مخزن المواد الأولية"
        });
        recordMaterialMove("waste", reference, row.qty, monthKeyOf(wsDate), wasteReasonLabel(row.reason));
        addAudit("تسجيل توالف " + formatNumber(row.qty) + " " + (reference.unit || "") + " من " + row.code + " (" + wasteReasonLabel(row.reason) + ") وخصمها من الرصيد", roleName(state.role));
      });
      closeDialog();
      refresh("سُجّلت توالف " + wsRows.length + " مادة وخُصمت من الرصيد الفيزيائي.");
      return;
    }

    if (form.id === "material-map-form") {
      var mmContext = materialImportContext;
      if (!mmContext) { setDialogFormError(form, "انتهت جلسة الاستيراد؛ ارفع الملف مجددًا."); return; }
      var mmMaterialCol = String(data.get("mmMaterial") || "");
      if (!mmMaterialCol) { setDialogFormError(form, "حدد عمود كود المادة."); return; }
      var mmDocumentCol = String(data.get("mmDocument") || "");
      var mmMonthCols = mmContext.months.map(function (month, kIndex) { return String(data.get("mmMonth_" + kIndex) || ""); });
      if (!mmMonthCols.some(Boolean)) { setDialogFormError(form, "اربط عمودًا واحدًا على الأقل بشهر."); return; }
      var mmChosen = mmMonthCols.filter(Boolean);
      if (new Set(mmChosen).size !== mmChosen.length) { setDialogFormError(form, "لا يمكن ربط نفس عمود الملف بأكثر من شهر."); return; }
      var mmForecasts = eligibleRequirementForecasts();
      var mmMatched = 0, mmSkipped = 0, mmInvalid = 0, mmFilled = 0;
      var mmPrefill = mmContext.current;
      mmContext.rows.forEach(function (row) {
        var mmCode = normalizeCode(row[mmMaterialCol]);
        var mmMaterial = state.rawMaterials.find(function (item) {
          return normalizeCode(item.code) === mmCode && item.active !== false && item.category === mmContext.category;
        });
        if (!mmMaterial) { mmSkipped += 1; return; }
        var mmDocRaw = mmDocumentCol ? normalizeCode(row[mmDocumentCol]) : "";
        var mmTargets = mmDocRaw
          ? mmForecasts.filter(function (item) { return normalizeCode(item.id) === mmDocRaw; })
          : (mmForecasts.length === 1 ? mmForecasts : []);
        if (mmDocRaw && !mmTargets.length) { mmSkipped += 1; return; }
        if (!mmTargets.length) { mmSkipped += 1; return; }
        mmMatched += 1;
        mmTargets.forEach(function (forecast) {
          mmPrefill[forecast.id] = mmPrefill[forecast.id] || {};
          mmContext.months.forEach(function (month, kIndex) {
            var mmCol = mmMonthCols[kIndex];
            if (!mmCol || forecast.months.indexOf(month) === -1) return;
            var mmRaw = String(row[mmCol] == null ? "" : row[mmCol]).trim();
            if (mmRaw === "") return;
            if (!validNumber(mmRaw, true)) { mmInvalid += 1; return; }
            mmPrefill[forecast.id][mmCode] = mmPrefill[forecast.id][mmCode] || {};
            mmPrefill[forecast.id][mmCode][month] = String(Number(mmRaw));
            mmFilled += 1;
          });
        });
      });
      if (!mmMatched) { setDialogFormError(form, mmDocumentCol ? "لا يوجد صف يطابق مادة معرفة ومستندًا صحيحًا. تحقق من عمودي الكود والمستند." : (mmForecasts.length > 1 ? "يوجد أكثر من مستند — اربط عمود المستند حتى تُوزع الكميات على المستند الصحيح." : "لا يوجد أي صف كوده يطابق مادة معرفة. تحقق من عمود الكود.")); return; }
      var mmSummaryParts = ["طابق " + mmMatched + " صفًا", "عبّأ " + mmFilled + " خانة"];
      if (mmSkipped) mmSummaryParts.push("تجاهل " + mmSkipped + " صفًا غير مطابق");
      if (mmInvalid) mmSummaryParts.push(mmInvalid + " قيمة غير رقمية تُجوهلت");
      addAudit("استيراد الاحتياجات من Excel بربط الأعمدة: " + mmSummaryParts.join(" و"), roleName(state.role));
      materialImportContext = null;
      openMaterialForm(null, mmPrefill, mmContext.category);
      showToast("تمت التعبئة: " + mmSummaryParts.join("، ") + ". راجع الجدول ثم احفظ.", mmSkipped || mmInvalid ? "error" : "success");
      return;
    }

    if (form.id === "forecast-map-form") {
      var fmContext = forecastImportContext;
      if (!fmContext) { setDialogFormError(form, "انتهت جلسة الاستيراد؛ ارفع الملف مجددًا."); return; }
      var fmProductCol = String(data.get("fmProduct") || "");
      if (!fmProductCol) { setDialogFormError(form, "حدد عمود كود المنتج."); return; }
      var fmMonthCols = fmContext.months.map(function (month, kIndex) { return String(data.get("fmMonth_" + kIndex) || ""); });
      if (!fmMonthCols.some(Boolean)) { setDialogFormError(form, "اربط عمودًا واحدًا على الأقل بشهر."); return; }
      var fmDuplicates = fmMonthCols.filter(Boolean);
      if (new Set(fmDuplicates).size !== fmDuplicates.length) { setDialogFormError(form, "لا يمكن ربط نفس عمود الملف بأكثر من شهر."); return; }
      var fmMatched = 0, fmSkipped = 0, fmInvalid = 0, fmFilled = 0;
      fmContext.rows.forEach(function (row) {
        var fmCode = normalizeCode(row[fmProductCol]);
        var fmProduct = state.products.find(function (item) { return normalizeCode(item.code) === fmCode && item.active !== false; });
        if (!fmProduct) { fmSkipped += 1; return; }
        fmMatched += 1;
        if (!fmContext.values[fmCode]) fmContext.values[fmCode] = {};
        fmContext.months.forEach(function (month, kIndex) {
          var fmCol = fmMonthCols[kIndex];
          if (!fmCol) return;
          var fmRaw = String(row[fmCol] == null ? "" : row[fmCol]).trim();
          if (fmRaw === "") return;
          if (!validNumber(fmRaw, true)) { fmInvalid += 1; return; }
          fmContext.values[fmCode][month] = String(Number(fmRaw));
          fmFilled += 1;
        });
      });
      if (!fmMatched) { setDialogFormError(form, "لا يوجد أي صف كوده يطابق منتجًا معرفًا. تحقق من عمود الكود."); return; }
      var fmSummaryParts = ["طابق " + fmMatched + " منتجًا", "عبّأ " + fmFilled + " خانة"];
      if (fmSkipped) fmSummaryParts.push("تجاهل " + fmSkipped + " صفًا بكود غير معرف");
      if (fmInvalid) fmSummaryParts.push(fmInvalid + " قيمة غير رقمية تُجوهلت");
      addAudit("استيراد Forecast من Excel بربط الأعمدة: " + fmSummaryParts.join(" و"), roleName(state.role));
      var fmMonthlyTotals = fmContext.months.map(function (month) {
        return { month: month, qty: Object.keys(fmContext.values).reduce(function (sum, code) { return sum + Number((fmContext.values[code] || {})[month] || 0); }, 0) };
      });
      var fmPrefill = { months: fmContext.months, values: fmContext.values, notes: fmContext.notes, priority: fmContext.priority, note: fmContext.note,
        importSummary: { rowsLabel: fmSummaryParts.join("، "), months: fmMonthlyTotals, total: fmMonthlyTotals.reduce(function (sum, entry) { return sum + entry.qty; }, 0) } };
      var fmEditId = fmContext.editId;
      forecastImportContext = null;
      openForecastForm(fmEditId, fmPrefill);
      showToast("ظهرت نتيجة الملف الإجمالية والشهرية. راجعها ثم احفظ كمسودة أو احفظ وأرسل.", fmSkipped || fmInvalid ? "error" : "success");
      return;
    }

    if (form.id === "forecast-form") {
      var fromMonth = String(data.get("fromMonth") || "");
      var toMonth = String(data.get("toMonth") || "");
      var fcMonths = monthsBetween(fromMonth, toMonth);
      if (!fcMonths.length) { setDialogFormError(form, "أدخل شهر بداية وشهر نهاية صحيحين؛ النهاية لا تسبق البداية وبحد أقصى 24 شهرًا."); return; }
      var gridMonths = String(data.get("gridMonths") || "").split(",").filter(Boolean);
      if (gridMonths.join(",") !== fcMonths.join(",")) { setDialogFormError(form, "تغيرت الأشهر بعد بناء الجدول؛ أعد تحديد الأشهر ليُعاد بناء الجدول ثم احفظ."); return; }
      var fcProductCount = Number(data.get("fqProductCount") || 0);
      var forecastItems = [];
      for (var fpIndex = 0; fpIndex < fcProductCount; fpIndex += 1) {
        var fpCode = normalizeCode(data.get("fqProduct_" + fpIndex));
        var fpProduct = state.products.find(function (item) { return normalizeCode(item.code) === fpCode; });
        if (!fpProduct) continue;
        var fpMonthly = {};
        var fpTotal = 0;
        var fpInvalid = false;
        for (var fmIndex = 0; fmIndex < fcMonths.length; fmIndex += 1) {
          var fpRaw = data.get("fq_" + fpIndex + "_" + fmIndex);
          var fpTrimmed = String(fpRaw == null ? "" : fpRaw).trim();
          if (fpTrimmed === "" || Number(fpTrimmed) === 0) continue;
          if (!validNumber(fpTrimmed, false)) { fpInvalid = true; break; }
          fpMonthly[fcMonths[fmIndex]] = Number(fpTrimmed);
          fpTotal += Number(fpTrimmed);
        }
        if (fpInvalid) { setDialogFormError(form, "أدخل كميات شهرية صحيحة موجبة للمنتج " + fpCode + " أو اترك خاناته فارغة."); return; }
        if (fpTotal <= 0) continue;
        forecastItems.push({ productCode: fpProduct.code, productName: fpProduct.name, unit: fpProduct.unit, qty: fpTotal, monthlyQty: fpMonthly, note: String(data.get("fnote_" + fpIndex) || "") });
      }
      if (!forecastItems.length) { setDialogFormError(form, "أدخل كمية شهرية واحدة على الأقل لمنتج واحد قبل الإرسال."); return; }
      var requestedForecastMode = String(data.get("forecastMode") || "draft");
      var forecastMode = requestedForecastMode === "finance" ? "finance_sales_confirm" : requestedForecastMode === "draft" ? "draft" : "submitted";
      var forecastModeLabel = requestedForecastMode === "finance" ? "وإرساله إلى المبيعات" : forecastMode === "draft" ? "كمسودة" : "وإرساله إلى الإنتاج";
      var editForecastId = String(data.get("editForecastId") || "");
      if (editForecastId) {
        var editingForecast = state.forecasts.find(function (item) { return item.id === editForecastId; });
        if (!editingForecast || editingForecast.status === "fixed" || editingForecast.status === "cancelled") { setDialogFormError(form, "لا يمكن تعديل هذا المستند بعد تثبيته أو إلغائه."); return; }
        var salesReview = {};
        if (editingForecast.status === "production_feedback") {
          var productionChanges = editingForecast.productionChanges || {};
          var reviewCodes = {};
          editingForecast.items.concat(forecastItems).forEach(function (line) { reviewCodes[normalizeCode(line.productCode)] = line.productCode; });
          Object.keys(reviewCodes).forEach(function (code) {
            fcMonths.forEach(function (month) {
              var reviewKey = forecastCellKey(code, month);
              var submittedQty = forecastCellQty(forecastItems, code, month);
              var productionQty = forecastCellQty(editingForecast.items, code, month);
              if (productionChanges[reviewKey]) salesReview[reviewKey] = submittedQty === productionQty ? "accepted" : "sales_override";
              else if (submittedQty !== productionQty) salesReview[reviewKey] = "sales_other";
            });
          });
        }
        editingForecast.history.push({ version: editingForecast.version, by: editingForecast.status === "production_feedback" ? "الإنتاج" : "المبيعات", at: editingForecast.updatedAt || editingForecast.productionFeedbackAt || editingForecast.submittedAt, status: editingForecast.status, months: clone(editingForecast.months), items: clone(editingForecast.items), note: editingForecast.note || "" });
        var versionNumber = parseInt(String(editingForecast.version || "V1").replace(/\D/g, ""), 10) || 1;
        editingForecast.version = "V" + (versionNumber + 1);
        editingForecast.months = fcMonths;
        editingForecast.startDate = fcMonths[0] + "-01";
        editingForecast.endDate = fcMonths[fcMonths.length - 1] + "-28";
        editingForecast.priority = String(data.get("priority"));
        editingForecast.note = String(data.get("note") || "");
        var editQtyChanged = JSON.stringify(editingForecast.items.map(function (item) { return [item.productCode, item.monthlyQty]; })) !== JSON.stringify(forecastItems.map(function (item) { return [item.productCode, item.monthlyQty]; }));
        var financeBeforeItems = clone(editingForecast.items);
        editingForecast.items = forecastItems;
        if (requestedForecastMode === "finance") editingForecast.financeChanges = buildForecastCellChanges(financeBeforeItems, forecastItems, fcMonths);
        if (Object.keys(salesReview).length) editingForecast.salesReview = salesReview;
        else delete editingForecast.salesReview;
        editingForecast.status = forecastMode;
        editingForecast.updatedAt = currentTimestamp();
        // تعديل الكميات يجعل فحص الجاهزية السابق قديمًا: يعاد تأكيد الاحتياجات وقرار التوريد.
        if (editQtyChanged && forecastRequirements(editingForecast.id).length) {
          editingForecast.readinessStale = true;
          editingForecast.supplyFeasibility = null;
          // كانت سجلات الاحتياج تبقى على الأشهر القديمة بعد تقليص المستند، فيُشترى ضعف الحاجة
          // وتبقى أشهر لا تُستهلك أبدًا فتولّد نقصًا وهميًا دائمًا.
          var liveMonths = editingForecast.months || [];
          var trimmed = 0;
          forecastRequirements(editingForecast.id).forEach(function (item) {
            var kept = {};
            var dropped = false;
            Object.keys(item.monthlyQty || {}).forEach(function (month) {
              if (liveMonths.indexOf(month) !== -1) kept[month] = item.monthlyQty[month];
              else if (Number(item.monthlyQty[month] || 0) > 0) dropped = true;
            });
            if (dropped) trimmed += 1;
            item.monthlyQty = kept;
            item.required = roundQty(Object.keys(kept).reduce(function (sum, month) { return sum + Number(kept[month] || 0); }, 0));
            if (item.consumed > item.required) item.consumed = item.required;
            var monthsLeft = Object.keys(kept).filter(function (month) { return Number(kept[month] || 0) > 0; }).sort();
            if (monthsLeft.length) item.needDate = monthsLeft[0] + "-01";
          });
          state.materials = state.materials.filter(function (item) { return item.forecastId !== editingForecast.id || item.required > 0; });
          addAudit("تعديل كميات " + editingForecast.id + " أعاد المستند إلى فحص الجاهزية" + (trimmed ? " وقُصّت أشهر " + trimmed + " سجل احتياج على مدى المستند الجديد" : ""), roleName(state.role));
        }
        if (forecastMode === "submitted") editingForecast.submittedAt = editingForecast.updatedAt;
        addAudit("تعديل " + editingForecast.id + " إلى الإصدار " + editingForecast.version + " وحفظه " + forecastModeLabel, roleName(state.role));
        closeDialog(); refresh("تم حفظ الإصدار " + editingForecast.version + " " + forecastModeLabel + (editQtyChanged && editingForecast.readinessStale ? "؛ أعيد فتح فحص الجاهزية لتغير الكميات." : "؛ الإصدار السابق محفوظ في السجل.")); return;
      }
      var forecastId = createId("FC");
      var forecastSavedAt = currentTimestamp();
      state.forecasts.unshift({ id: forecastId, version: "V1", months: fcMonths, startDate: fcMonths[0] + "-01", endDate: fcMonths[fcMonths.length - 1] + "-28", frequency: "monthly", priority: String(data.get("priority")), note: String(data.get("note") || ""), items: forecastItems, status: forecastMode, createdBy: "Sales", createdAt: forecastSavedAt, submittedAt: forecastMode === "submitted" ? forecastSavedAt : "", history: [], supplyFeasibility: null, readinessStale: false });
      addAudit((forecastMode === "draft" ? "حفظ مسودة " : "إرسال ") + forecastId + " (" + fcMonths.length + " أشهر · " + forecastItems.length + " منتجات)" + (forecastMode === "draft" ? " دون إرسال" : " إلى الإنتاج"), roleName(state.role));
      closeDialog(); refresh(forecastMode === "draft" ? "تم حفظ Forecast كمسودة. افتحه لاحقًا ثم اضغط «إرسال للإنتاج»." : "تم حفظ Forecast وإرساله إلى الإنتاج لفحص القدرة."); return;
    }

    if (form.id === "production-review-form") {
      var prForecast = state.forecasts.find(function (item) { return item.id === String(data.get("forecastId")); });
      if (!prForecast || prForecast.status !== "submitted") { setDialogFormError(form, "هذا المستند لم يعد بانتظار رد الإنتاج."); return; }
      var prDecision = String(data.get("decision") || "confirm");
      var prNote = String(data.get("feedbackNote") || "").trim();
      var prItemCount = Number(data.get("pqItemCount") || 0);
      var prItems = [];
      for (var pqIndex = 0; pqIndex < prItemCount; pqIndex += 1) {
        var pqCode = normalizeCode(data.get("pqProduct_" + pqIndex));
        var pqLine = prForecast.items.find(function (item) { return normalizeCode(item.productCode) === pqCode; });
        if (!pqLine) continue;
        var pqMonthly = {};
        var pqTotal = 0;
        var pqInvalid = false;
        for (var pqmIndex = 0; pqmIndex < prForecast.months.length; pqmIndex += 1) {
          var pqRaw = data.get("pq_" + pqIndex + "_" + pqmIndex);
          var pqTrimmed = String(pqRaw == null ? "" : pqRaw).trim();
          if (pqTrimmed === "" || Number(pqTrimmed) === 0) continue;
          if (!validNumber(pqTrimmed, false)) { pqInvalid = true; break; }
          pqMonthly[prForecast.months[pqmIndex]] = Number(pqTrimmed);
          pqTotal += Number(pqTrimmed);
        }
        if (pqInvalid) { setDialogFormError(form, "أدخل كميات شهرية صحيحة للمنتج " + pqCode + " أو اترك خاناته فارغة."); return; }
        if (pqTotal <= 0) continue;
        prItems.push({ productCode: pqLine.productCode, productName: pqLine.productName, unit: pqLine.unit, qty: pqTotal, monthlyQty: pqMonthly, note: pqLine.note || "" });
      }
      var prChanged = JSON.stringify(prItems.map(function (item) { return [item.productCode, item.monthlyQty]; })) !== JSON.stringify(prForecast.items.map(function (item) { return [item.productCode, item.monthlyQty]; }));
      if (prDecision === "feedback" || prDecision === "confirm") {
        if (!prItems.length) { setDialogFormError(form, "أبقِ كمية شهرية واحدة على الأقل لمنتج واحد."); return; }
        var priorSalesItems = clone(prForecast.items);
        prForecast.history.push({ version: prForecast.version, by: "المبيعات", at: prForecast.updatedAt || prForecast.submittedAt, status: "submitted", months: clone(prForecast.months), items: clone(prForecast.items), note: prForecast.note || "" });
        var prVersionNumber = parseInt(String(prForecast.version || "V1").replace(/\D/g, ""), 10) || 1;
        prForecast.version = "V" + (prVersionNumber + 1);
        prForecast.items = prItems;
        prForecast.productionChanges = buildForecastCellChanges(priorSalesItems, prItems, prForecast.months);
        delete prForecast.salesReview;
        prForecast.status = "production_feedback";
        prForecast.productionFeedbackAt = currentTimestamp();
        prForecast.updatedAt = prForecast.productionFeedbackAt;
        prForecast.productionNote = prNote;
        addAudit("إرسال الإنتاج " + prForecast.id + (prChanged ? " بأرقام معدلة حسب قدرة الآلات" : " للتأكيد النهائي دون تعديل"), roleName(state.role));
        closeDialog(); refresh(prChanged ? "أُرسلت تعديلات الإنتاج إلى المبيعات للمراجعة؛ إصدار المبيعات محفوظ في السجل." : "أُرسل Forecast إلى المبيعات للتأكيد النهائي؛ لن تنتقل الاحتياجات قبل موافقتها."); return;
      }
      setDialogFormError(form, "اختر إرسال Forecast إلى المبيعات للتأكيد النهائي."); return;
    }

    if (form.id === "material-form") {
      var mrCategory = String(data.get("mrCategory") || "raw") === "packing" ? "packing" : "raw";
      var mrSectionCount = Number(data.get("mrSectionCount") || 0);
      if (!mrSectionCount) { setDialogFormError(form, "لا توجد منتجات مثبتة في النموذج."); return; }
      var mrOps = [];
      for (var sIdx = 0; sIdx < mrSectionCount; sIdx += 1) {
        var mrForecastId = String(data.get("mrForecast_" + sIdx) || "");
        var mrForecastDoc = state.forecasts.find(function (item) { return item.id === mrForecastId && item.status === "fixed"; });
        if (!mrForecastDoc) continue;
        var mrMonthCount = Number(data.get("mrMonthCount_" + sIdx) || 0);
        var mrMonths = [];
        for (var kIdx = 0; kIdx < mrMonthCount; kIdx += 1) mrMonths.push(String(data.get("mrMonth_" + sIdx + "_" + kIdx) || ""));
        var mrMatCount = Number(data.get("mrMatCount_" + sIdx) || 0);
        for (var mIdx = 0; mIdx < mrMatCount; mIdx += 1) {
          var mrCode = normalizeCode(data.get("mrCode_" + sIdx + "_" + mIdx));
          var mrMaster = state.rawMaterials.find(function (item) { return normalizeCode(item.code) === mrCode && item.category === mrCategory; });
          var mrExisting = state.materials.find(function (record) { return record.forecastId === mrForecastId && normalizeCode(record.materialCode) === mrCode && (record.category || "raw") === mrCategory; });
          var mrMonthly = {};
          var mrTotal = 0;
          var mrInvalidMonth = "";
          for (var kk = 0; kk < mrMonths.length; kk += 1) {
            var mrRaw = data.get("mrQty_" + sIdx + "_" + mIdx + "_" + kk);
            var mrTrimmed = String(mrRaw == null ? "" : mrRaw).trim();
            if (mrTrimmed === "" || Number(mrTrimmed) === 0) continue;
            if (!validNumber(mrTrimmed, false)) { mrInvalidMonth = mrMonths[kk]; break; }
            mrMonthly[mrMonths[kk]] = Number(mrTrimmed);
            mrTotal += Number(mrTrimmed);
          }
          if (mrInvalidMonth) { setDialogFormError(form, "أدخل كمية صحيحة موجبة للمادة " + mrCode + " في " + monthLabel(mrInvalidMonth) + " أو اتركها فارغة."); return; }
          if (mrTotal <= 0) {
            if (mrExisting) {
              var mrHasCommitment = state.commitments.some(function (record) { return record.materialId === mrExisting.id; });
              if (mrHasCommitment) { setDialogFormError(form, "لا يمكن إزالة " + mrCode + " من المستند " + mrForecastId + " لارتباطها بأمر شراء؛ أعد إدخال الكمية."); return; }
              mrOps.push({ type: "remove", existing: mrExisting });
            }
            continue;
          }
          if (!mrMaster) continue;
          var mrFirstMonth = Object.keys(mrMonthly).sort()[0];
          mrOps.push({ type: mrExisting ? "update" : "create", existing: mrExisting, forecastId: mrForecastId, master: mrMaster, qty: mrTotal, monthly: mrMonthly, needDate: mrFirstMonth + "-01" });
        }
      }
      var capacityConflict = mrOps.find(function (op) {
        if (op.type === "remove" || !op.master || op.master.storageCapacity == null) return false;
        return Object.keys(op.monthly || {}).some(function (month) { return Number(op.monthly[month] || 0) > Number(op.master.storageCapacity); });
      });
      if (capacityConflict) {
        var capacityMonth = Object.keys(capacityConflict.monthly || {}).find(function (month) { return Number(capacityConflict.monthly[month] || 0) > Number(capacityConflict.master.storageCapacity); });
        setDialogFormError(form, "كمية " + capacityConflict.master.code + " في " + monthLabel(capacityMonth) + " تتجاوز طاقة التخزين التي ثبتها المخزن (" + formatNumber(capacityConflict.master.storageCapacity) + "). عدّل الجدول قبل الإرسال.");
        return;
      }
      var mrCreated = 0, mrUpdated = 0, mrRemoved = 0;
      mrOps.forEach(function (op) {
        if (op.type === "remove") {
          state.materials = state.materials.filter(function (record) { return record.id !== op.existing.id; });
          mrRemoved += 1;
          return;
        }
        if (op.type === "update") {
          if (Number(op.existing.required) === op.qty && JSON.stringify(op.existing.monthlyQty || {}) === JSON.stringify(op.monthly)) return;
          var mrPreviousRequired = Number(op.existing.required);
          op.existing.required = op.qty;
          op.existing.monthlyQty = op.monthly;
          op.existing.needDate = op.needDate;
          if (op.existing.stockConfirmed) op.existing.status = materialShortage(op.existing) > 0 ? "shortage" : "available";
          // تغيير احتياج مرتبط بأمر شراء قائم لا يمر بصمت: علامة دائمة وحدث بارز في السجل.
          var mrLinkedOrder = state.commitments.some(function (record) { return record.materialId === op.existing.id && record.status !== "cancelled"; });
          if (mrLinkedOrder) {
            op.existing.changedAfterOrder = currentTimestamp();
            addAudit("تنبيه: تغيّر احتياج " + op.existing.materialCode + " من " + formatNumber(mrPreviousRequired) + " إلى " + formatNumber(op.qty) + " بعد صدور أمر شراء", roleName(state.role));
          }
          mrUpdated += 1;
          return;
        }
        state.materials.unshift({ id: createId("MR"), forecastId: op.forecastId, productCode: "", materialCode: op.master.code, material: op.master.name, category: mrCategory, unit: op.master.unit, required: op.qty, monthlyQty: op.monthly, consumed: 0, needDate: op.needDate, onHand: Number(op.master.openingQty || 0), reserved: 0, hold: 0, inbound: 0, stockConfirmed: false, productionApproved: false, status: "pending", createdAt: currentTimestamp() });
        mrCreated += 1;
      });
      // إعادة تأكيد بعد تعديل المبيعات: حفظ الجدول (ولو بلا تغيير) يزيل علامة إعادة الفحص عن المستند.
      var mrStaleCleared = 0;
      for (var stIdx = 0; stIdx < mrSectionCount; stIdx += 1) {
        var mrStaleDoc = state.forecasts.find(function (item) { return item.id === String(data.get("mrForecast_" + stIdx)); });
        if (mrStaleDoc && mrStaleDoc.readinessStale) { mrStaleDoc.readinessStale = false; mrStaleCleared += 1; }
      }
      if (!mrCreated && !mrUpdated && !mrRemoved) {
        if (mrStaleCleared) {
          addAudit("إعادة تأكيد الإنتاج للاحتياجات بعد تعديل المبيعات (" + mrStaleCleared + " مستند)", roleName(state.role));
          closeDialog(); refresh("أُعيد تأكيد الاحتياجات؛ بانتظار تأكيد المشتريات لإمكانية التوريد من جديد."); return;
        }
        var mrHasSavedRows = state.materials.some(function (item) { return (item.category || "raw") === mrCategory; });
        if (mrHasSavedRows) {
          state.materialDispatches[mrCategory] = { status: "saved", at: currentTimestamp(), by: roleName(state.role) };
          addAudit("تأكيد حفظ احتياجات " + (mrCategory === "packing" ? "مواد التغليف" : "المواد الأولية") + " دون تعديل", roleName(state.role));
          closeDialog(); refresh("الملف محفوظ بالفعل وجاهز للإرسال إلى المستودع. استخدم زر «إرسال إلى المستودع».");
          return;
        }
        setDialogFormError(form, "أدخل كمية شهرية لمادة واحدة على الأقل قبل الحفظ.");
        return;
      }
      var mrSummaryParts = [];
      if (mrCreated) mrSummaryParts.push(mrCreated + " جديدة");
      if (mrUpdated) mrSummaryParts.push(mrUpdated + " محدّثة");
      if (mrRemoved) mrSummaryParts.push(mrRemoved + " محذوفة");
      state.materialDispatches[mrCategory] = { status: "saved", at: currentTimestamp(), by: roleName(state.role) };
      addAudit("جدول احتياجات المواد الشهرية: " + mrSummaryParts.join(" و"), roleName(state.role));
      closeDialog(); refresh("تم حفظ احتياجات " + (mrCategory === "packing" ? "مواد التغليف" : "المواد الأولية") + " (" + mrSummaryParts.join(" و") + "). أرسلها للمستودع من الزر الظاهر في الصفحة."); return;
    }

    if (form.id === "stock-form") {
      saveStockForm(form); return;
    }

    if (form.id === "commitment-form") {
      var pcCount = Number(data.get("pcCount") || 0);
      if (!pcCount) { setDialogFormError(form, "لا يوجد نقص معتمد في الجدول."); return; }
      var pcRows = [];
      for (var cIndex = 0; cIndex < pcCount; cIndex += 1) {
        var pcMaterialId = String(data.get("pcMaterial_" + cIndex) || "");
        var pcSupplier = String(data.get("pcSupplier_" + cIndex) || "").trim();
        var pcPo = String(data.get("pcPo_" + cIndex) || "").trim();
        var pcQtyRaw = String(data.get("pcQty_" + cIndex) == null ? "" : data.get("pcQty_" + cIndex)).trim();
        var pcOrderDate = String(data.get("pcOrder_" + cIndex) || "");
        var pcEta = String(data.get("pcEta_" + cIndex) || "");
        var pcAmount = String(data.get("pcAmount_" + cIndex) || "").trim();
        var pcTouched = pcSupplier !== "" || pcPo !== "" || pcEta !== "";
        if (!pcTouched) continue;
        var pcMaterial = state.materials.find(function (item) { return item.id === pcMaterialId && item.stockConfirmed; });
        if (!pcMaterial) { setDialogFormError(form, "تعذر ربط أحد الصفوف بمادة مؤكدة الرصيد. حدّث الشاشة وأعد المحاولة."); return; }
        if (!pcSupplier || !pcPo || !validNumber(pcQtyRaw, false) || !/^\d{4}-\d{2}-\d{2}$/.test(pcOrderDate) || !/^\d{4}-\d{2}-\d{2}$/.test(pcEta) || pcEta < pcOrderDate) { setDialogFormError(form, "أكمل المورد وPO والكمية وتاريخ الأوردر وETA بشكل صحيح للمادة " + pcMaterial.materialCode + "."); return; }
        // الكمية المُدخلة بوحدة الشراء؛ المخزون يُقيَّد بوحدة الاستهلاك عبر معامل التحويل.
        var pcFactor = Number(data.get("pcFactor_" + cIndex) || 1);
        if (!Number.isFinite(pcFactor) || pcFactor <= 0) pcFactor = 1;
        var pcOrderQty = Number(pcQtyRaw);
        var pcMaster = rawMasterByCode(pcMaterial.materialCode);
        var pcMonth = String(data.get("pcMonth_" + cIndex) || "");
        pcRows.push({
          material: pcMaterial, supplier: pcSupplier, po: pcPo,
          orderQty: roundQty(pcOrderQty), factor: pcFactor,
          purchaseUnit: pcMaster && pcMaster.purchaseUnit ? pcMaster.purchaseUnit : "",
          qty: roundQty(pcOrderQty * pcFactor),
          orderDate: pcOrderDate, eta: pcEta, amount: pcAmount || "لم تُدخل قيمة",
          needMonth: pcMonth,
          needDate: pcMonth ? pcMonth + "-01" : (pcMaterial.needDate || ""),
          quotation: pendingQuotations[cIndex] || null
        });
      }
      if (!pcRows.length) { setDialogFormError(form, "أكمل المورد وPO وETA لصف واحد على الأقل قبل الإنشاء."); return; }
      var pcLateEta = 0;
      pcRows.forEach(function (row) {
        var commitmentId = createId("PC");
        var commitmentCreatedAt = currentTimestamp();
        state.commitments.unshift({ id: commitmentId, materialId: row.material.id, supplier: row.supplier, po: row.po, qty: row.qty, orderQty: row.orderQty, conversionFactor: row.factor, purchaseUnit: row.purchaseUnit, needMonth: row.needMonth || "", orderDate: row.orderDate, eta: row.eta, amount: row.amount, status: "submitted", financeApproval: { status: "pending", note: "", at: "" }, quotation: row.quotation || null, createdAt: commitmentCreatedAt });
        row.material.inbound = roundQty(Number(row.material.inbound || 0) + row.qty);
        state.rawReceipts.unshift({ id: createId("RR"), commitmentId: commitmentId, materialCode: row.material.materialCode, material: row.material.material, qty: row.qty, received: 0, status: "expected", postedToStock: false, expectedAt: commitmentCreatedAt });
        addAudit("إنشاء Procurement Commitment " + commitmentId + " بكمية " + formatNumber(row.orderQty) + (row.purchaseUnit ? " " + row.purchaseUnit : "") + " = " + formatNumber(row.qty) + " " + (row.material.unit || ""), roleName(state.role));
        // وصول متأخر عن تاريخ الحاجة يُسجَّل كمشكلة بدل أن يمر بلا أثر.
        if (row.needDate && row.eta > row.needDate) {
          pcLateEta += 1;
          state.issues.unshift({
            id: createId("IS"), title: "وصول متوقع بعد تاريخ الحاجة", severity: "high", visibility: "internal",
            source: "أمر شراء " + commitmentId + " · " + row.material.materialCode,
            impact: "ETA " + row.eta + " متأخر عن تاريخ الحاجة " + row.needDate + " لمادة " + row.material.materialCode + ".",
            action: "فاوض المورد على تعجيل الشحنة أو ابحث عن مصدر بديل قبل تاريخ الحاجة.",
            status: "open", createdAt: currentTimestamp()
          });
        }
      });
      pendingQuotations = {};
      closeDialog();
      refresh("تم إنشاء " + pcRows.length + " التزام شراء وإرسالها لموافقة المالية؛ لا توريد قبل موافقتها."
        + (pcLateEta ? " تنبيه: " + pcLateEta + " أمرًا وصولها المتوقع بعد تاريخ الحاجة — سُجّلت كمشكلة." : ""),
        pcLateEta ? "warning" : "success");
      return;
    }

    if (form.id === "receipt-form") {
      saveReceiptForm(form); return;
    }

    if (form.id === "actual-form") {
      var paCount = Number(data.get("paCount") || 0);
      if (!paCount) { setDialogFormError(form, "لا توجد تشغيلات جاهزة في الجدول."); return; }
      var paRows = [];
      for (var aIndex = 0; aIndex < paCount; aIndex += 1) {
        var paForecastId = String(data.get("paForecast_" + aIndex) || "");
        var paProductCode = normalizeCode(data.get("paProduct_" + aIndex));
        var paMonth = String(data.get("paMonth_" + aIndex) || "");
        var paQtyValue = data.get("paQty_" + aIndex);
        var paQtyRaw = String(paQtyValue == null ? "" : paQtyValue).trim();
        var paBatch = String(data.get("paBatch_" + aIndex) || "").trim();
        var paDate = String(data.get("paDate_" + aIndex) || "");
        if (paQtyRaw === "" && !paBatch) continue;
        var paForecast = state.forecasts.find(function (item) { return item.id === paForecastId && item.status === "fixed"; });
        var paLine = paForecast && paForecast.items.find(function (item) { return normalizeCode(item.productCode) === paProductCode; });
        var paGatesOk = paForecast && paLine && productMaterialsReady(paForecastId)
          && weeklyPlanApprovedFor(paForecastId, paProductCode, paMonth);
        if (!paGatesOk) { setDialogFormError(form, "تعذر ربط أحد الصفوف بتشغيل جاهز (يلزم: تثبيت + خطة أسبوعية معتمدة + مواد مغطاة عبر شراء المشتريات). حدّث الشاشة وأعد المحاولة."); return; }
        if (!validNumber(paQtyRaw, false) || !paBatch || !/^\d{4}-\d{2}-\d{2}$/.test(paDate)) { setDialogFormError(form, "أكمل الكمية الفعلية ورقم الدفعة وتاريخ الإنجاز للمنتج " + paLine.productName + " أو اترك صفه فارغًا."); return; }
        paRows.push({ forecast: paForecast, line: paLine, month: paMonth, qty: Number(paQtyRaw), batch: paBatch, date: paDate });
      }
      if (!paRows.length) { setDialogFormError(form, "أدخل الكمية ورقم الدفعة لتشغيل واحد على الأقل قبل التسجيل."); return; }
      withBatchedSave(function () {
      paRows.forEach(function (row) {
        var actualId = createId("PA");
        var plannedMonth = Number(row.line.monthlyQty[row.month] || 0);
        state.actuals.unshift({ id: actualId, forecastId: row.forecast.id, productCode: row.line.productCode, product: row.line.productName, month: row.month, planned: plannedMonth, actual: row.qty, batch: row.batch, date: row.date, status: "completed", recordedAt: currentTimestamp() });
        addAudit("تسجيل Production Actual " + actualId + " لمنتج " + row.line.productCode + " · " + monthLabel(row.month), roleName(state.role));
        consumeMaterialsForRun(row.forecast, row.line.productCode, row.month, row.qty);
      });
      });
      closeDialog(); refresh("تم تسجيل " + paRows.length + " دفعة إنتاج فعلية وسحب موادها؛ بانتظار استلام FG Warehouse."); return;
    }

    if (form.id === "fg-form") {
      var fgCount = Number(data.get("fgCount") || 0);
      if (!fgCount) { setDialogFormError(form, "لا توجد دفعات إنتاج في الجدول."); return; }
      var fgRows = [];
      var fgUntouched = 0;
      for (var fIndex = 0; fIndex < fgCount; fIndex += 1) {
        var fgActualId = String(data.get("fgActual_" + fIndex) || "");
        var fgReceivedRaw = String(data.get("fgReceived_" + fIndex) == null ? "" : data.get("fgReceived_" + fIndex)).trim();
        if (fgReceivedRaw === "") continue;
        var fgActual = state.actuals.find(function (item) { return item.id === fgActualId; });
        if (!fgActual) continue;
        var fgReservedRaw = String(data.get("fgReserved_" + fIndex) == null ? "" : data.get("fgReserved_" + fIndex)).trim() || "0";
        var fgBlockedRaw = String(data.get("fgBlocked_" + fIndex) == null ? "" : data.get("fgBlocked_" + fIndex)).trim() || "0";
        if (![fgReceivedRaw, fgReservedRaw, fgBlockedRaw].every(function (value) { return validNumber(value, true); })) { setDialogFormError(form, "أدخل كميات استلام وحجز وحظر صحيحة لدفعة " + (fgActual.batch || fgActual.id) + "."); return; }
        if (Number(fgReservedRaw) + Number(fgBlockedRaw) > Number(fgReceivedRaw)) { setDialogFormError(form, "المحجوز مع المحظور لا يمكن أن يتجاوز المستلم لدفعة " + (fgActual.batch || fgActual.id) + "."); return; }
        // الصف غير المتغير لا يعاد حفظه حتى لا تُمس تواريخ استلام الدفعات القديمة.
        var fgUnchanged = state.fgReceipts.find(function (item) { return item.actualId === fgActualId; });
        if (fgUnchanged && Number(fgUnchanged.received) === Number(fgReceivedRaw) && Number(fgUnchanged.reserved) === Number(fgReservedRaw) && Number(fgUnchanged.blocked) === Number(fgBlockedRaw)) { fgUntouched += 1; continue; }
        fgRows.push({ actual: fgActual, received: Number(fgReceivedRaw), reserved: Number(fgReservedRaw), blocked: Number(fgBlockedRaw) });
      }
      if (!fgRows.length) { setDialogFormError(form, fgUntouched ? "لا توجد تغييرات للحفظ في جدول الاستلام." : "أدخل الكمية المستلمة لدفعة واحدة على الأقل، واترك ما لم يصل فارغًا."); return; }
      fgRows.forEach(function (row) {
        var existing = state.fgReceipts.find(function (item) { return item.actualId === row.actual.id; });
        var fgId = existing ? existing.id : createId("FG");
        var record = existing || { id: fgId, actualId: row.actual.id, productCode: row.actual.productCode, product: row.actual.product };
        record.produced = row.actual.actual; record.received = row.received; record.reserved = row.reserved; record.blocked = row.blocked; record.status = "confirmed"; record.confirmedAt = currentTimestamp();
        if (!existing) state.fgReceipts.unshift(record);
        // فحص التكرار يشمل القضايا المغلقة أيضًا حتى لا تُفتح قضية فرق جديدة عن نفس الدفعة بعد إغلاقها.
        var existingVarianceIssue = state.issues.find(function (item) { return item.source === row.actual.id + " / " + fgId; });
        if (row.received !== row.actual.actual && !existingVarianceIssue) {
          var issueId = createId("DEV");
          state.issues.unshift({ id: issueId, title: "فرق بين Production Actual وFG Receipt", source: row.actual.id + " / " + fgId, department: "مخزن المنتج النهائي", impact: "فرق " + formatNumber(Math.abs(row.actual.actual - row.received)) + " وحدة غير متاحة للمبيعات", action: "مطابقة الدفعة وحركة النقل الداخلي", owner: "مشرف مخزن المنتج النهائي", due: dateDaysFromNow(1), severity: "high", status: "open", evidence: "", visibility: "commercial", createdAt: currentTimestamp() });
          addAudit("إنشاء " + issueId + " بسبب فرق FG", "EMICP");
        }
        addAudit("تأكيد استلام " + fgId + " بكمية " + row.received, roleName(state.role));
      });
      closeDialog(); refresh("تم تأكيد استلام " + fgRows.length + " دفعة وأصبح المؤكد ضمن المتاح للبيع مباشرة."); return;
    }

    if (form.id === "weekly-map-form") {
      var wmContext = weeklyImportContext;
      if (!wmContext) { setDialogFormError(form, "انتهت جلسة الاستيراد؛ ارفع الملف مجددًا."); return; }
      var wmProductCol = String(data.get("wmProduct") || "");
      var wmMonthCol = String(data.get("wmMonth") || "");
      if (!wmProductCol || !wmMonthCol) { setDialogFormError(form, "حدد عمود كود المنتج وعمود الشهر."); return; }
      var wmWeekCols = [0, 1, 2, 3].map(function (k) { return String(data.get("wmWeek_" + k) || ""); });
      if (!wmWeekCols.some(Boolean)) { setDialogFormError(form, "اربط عمود أسبوع واحدًا على الأقل."); return; }
      var wmChosen = [wmProductCol, wmMonthCol].concat(wmWeekCols.filter(Boolean));
      if (new Set(wmChosen).size !== wmChosen.length) { setDialogFormError(form, "لا يمكن ربط نفس عمود الملف بأكثر من حقل."); return; }
      var wmTargets = pendingWeeklyPlanTargets();
      var wmMatched = 0, wmSkipped = 0, wmInvalid = 0;
      wmContext.rows.forEach(function (row) {
        var wmCode = normalizeCode(row[wmProductCol]);
        var wmMonth = normalizeMonthCell(row[wmMonthCol]);
        var wmTarget = wmTargets.find(function (target) { return normalizeCode(target.line.productCode) === wmCode && target.month === wmMonth; });
        if (!wmTarget) { wmSkipped += 1; return; }
        wmMatched += 1;
        var wmKey = wmCode + "|" + wmMonth;
        if (!wmContext.values[wmKey]) wmContext.values[wmKey] = ["", "", "", ""];
        wmWeekCols.forEach(function (col, kIndex) {
          if (!col) return;
          var wmRaw = String(row[col] == null ? "" : row[col]).trim();
          if (wmRaw === "") return;
          if (!validNumber(wmRaw, true)) { wmInvalid += 1; return; }
          wmContext.values[wmKey][kIndex] = String(Number(wmRaw));
        });
      });
      if (!wmMatched) { setDialogFormError(form, "لا يوجد صف يطابق (منتج × شهر) بانتظار التقسيم. تحقق من عمودي الكود والشهر."); return; }
      var wmSummary = ["طابق " + wmMatched + " صفًا"];
      if (wmSkipped) wmSummary.push("تجاهل " + wmSkipped + " صفًا غير مطابق");
      if (wmInvalid) wmSummary.push(wmInvalid + " قيمة غير رقمية تُجوهلت");
      addAudit("استيراد توزيع الأسابيع من Excel بربط الأعمدة: " + wmSummary.join(" و"), roleName(state.role));
      var wmValues = wmContext.values;
      weeklyImportContext = null;
      openWeeklyPlanForm(wmValues);
      showToast("تمت التعبئة: " + wmSummary.join("، ") + ". راجع الجدول ثم أرسل.", wmSkipped || wmInvalid ? "error" : "success");
      return;
    }

    if (form.id === "weekly-plan-form") {
      var wpCount = Number(data.get("wpCount") || 0);
      if (!wpCount) { setDialogFormError(form, "لا توجد شهور في النموذج."); return; }
      var wpRows = [];
      for (var wpIndex = 0; wpIndex < wpCount; wpIndex += 1) {
        var wpForecastId = String(data.get("wpForecast_" + wpIndex) || "");
        var wpProductCode = normalizeCode(data.get("wpProduct_" + wpIndex));
        var wpMonth = String(data.get("wpMonth_" + wpIndex) || "");
        var wpForecast = state.forecasts.find(function (item) { return item.id === wpForecastId && item.status === "fixed"; });
        var wpLine = wpForecast && wpForecast.items.find(function (item) { return normalizeCode(item.productCode) === wpProductCode; });
        if (!wpForecast || !wpLine) continue;
        if (weeklyPlanFor(wpForecastId, wpProductCode, wpMonth)) continue;
        // هدف الخطة صار الصافي بعد المخزون افتراضيًا، مع خيار العودة إلى الفوركاست الخام.
        // السقف أيضًا بالكرتون الكامل، وإلا قُصّ هدفٌ صحيح (1) إلى كسر الفوركاست (0.618).
        var wpGross = planQty(wpLine.monthlyQty[wpMonth]);
        var wpBasis = String(data.get("wpBasis_" + wpIndex) || "net");
        var wpTargetRaw = String(data.get("wpTarget_" + wpIndex) == null ? "" : data.get("wpTarget_" + wpIndex)).trim();
        var wpPlanned = planQty(wpBasis === "gross" ? wpGross : (wpTargetRaw === "" || !validNumber(wpTargetRaw, true) ? productionNetNeed(wpForecastId, wpProductCode, wpMonth) : wpTargetRaw));
        if (wpPlanned > wpGross + QTY_EPSILON) wpPlanned = wpGross;
        if (wpPlanned <= QTY_EPSILON) continue;
        var wpGran = String(data.get("wpGran_" + wpIndex) || "weekly");
        if (wpGran !== "monthly" && wpGran !== "daily") wpGran = "weekly";
        var wpWeeks = weeksOfMonth(wpMonth);
        if (wpGran === "monthly") {
          // شهرية: تجاوز التقسيم — الشهر كتلة واحدة بوحدة اعتماد واحدة.
          var wpLast = lastDayOfMonth(wpMonth);
          wpRows.push({ forecast: wpForecast, line: wpLine, month: wpMonth, granularity: "monthly", weeks: [{ key: "W1", label: "الشهر كاملًا (01–" + String(wpLast).padStart(2, "0") + ")", start: wpMonth + "-01", end: wpMonth + "-" + String(wpLast).padStart(2, "0") }], qtys: [wpPlanned] });
          continue;
        }
        var wpSum = 0;
        var wpInvalid = false;
        var wpQtys = wpWeeks.map(function (week, kIndex) {
          var raw = data.get("wpQty_" + wpIndex + "_" + kIndex);
          var trimmed = String(raw == null ? "" : raw).trim();
          if (trimmed === "") return 0;
          if (!validNumber(trimmed, true)) { wpInvalid = true; return 0; }
          wpSum += Number(trimmed);
          return Number(trimmed);
        });
        if (wpInvalid) { setDialogFormError(form, "أدخل كميات أسبوعية صحيحة غير سالبة للمنتج " + wpProductCode + " في " + monthLabel(wpMonth) + "."); return; }
        if (Math.abs(wpSum - wpPlanned) > QTY_EPSILON) { setDialogFormError(form, "مجموع أسابيع " + wpProductCode + " في " + monthLabel(wpMonth) + " (" + formatNumber(wpSum) + ") يجب أن يساوي هدف الخطة (" + formatNumber(wpPlanned) + ")."); return; }
        wpRows.push({ forecast: wpForecast, line: wpLine, month: wpMonth, granularity: wpGran, weeks: wpWeeks, qtys: wpQtys });
      }
      if (!wpRows.length) { setDialogFormError(form, "لا توجد خطط صالحة للإنشاء."); return; }
      wpRows.forEach(function (row) {
        state.weeklyPlans.unshift({
          id: createId("WP"), version: "V1", forecastId: row.forecast.id, productCode: row.line.productCode, product: row.line.productName, unit: row.line.unit,
          month: row.month, granularity: row.granularity || "weekly",
          weeks: row.weeks.map(function (week, kIndex) { return { key: week.key, label: week.label, start: week.start, end: week.end, qty: row.qtys[kIndex], days: {} }; }),
          status: "awaiting_sales", approvals: {}, unitApprovals: {}, history: [], createdAt: currentTimestamp()
        });
        addAudit("تقسيم خطة " + row.line.productCode + " لشهر " + monthLabel(row.month) + " أسابيع وإرسالها للمبيعات", roleName(state.role));
      });
      closeDialog(); refresh("أُرسلت " + wpRows.length + " خطة أسبوعية إلى المبيعات للمراجعة."); return;
    }

    if (form.id === "approval-policy-form") {
      var apTol = String(data.get("apTolerance") == null ? "" : data.get("apTolerance")).trim();
      if (!validNumber(apTol, true) || Number(apTol) < 0 || Number(apTol) > 100) { showToast("أدخل نسبة بين 0 و100.", "error"); return; }
      state.approvalTolerancePct = Number(apTol);
      addAudit("ضبط حدّ التفويض في الموافقات إلى " + formatNumber(Number(apTol)) + "٪", roleName(state.role));
      refresh("حُفظ حدّ التفويض: ±" + formatNumber(Number(apTol)) + "٪.");
      return;
    }
    if (form.id === "approvals-inbox-form") {
      var apCount = Number(data.get("apCount") || 0);
      var apDone = 0;
      var apSkipped = [];
      withBatchedSave(function () {
      for (var apIndex = 0; apIndex < apCount; apIndex += 1) {
        if (data.get("apPick_" + apIndex) == null) continue;
        var apBox = document.getElementById("ap-pick-" + apIndex);
        if (apBox && !rowVisible(apBox)) continue;
        var apKind = String(data.get("apKind_" + apIndex) || "");
        var apId = String(data.get("apId_" + apIndex) || "");
        if (apKind === "weekly-forward") {
          var fwPlan = state.weeklyPlans.find(function (item) { return item.id === apId && item.status === "awaiting_sales"; });
          if (!fwPlan) { apSkipped.push(apId); continue; }
          fwPlan.status = "awaiting_approvals";
          fwPlan.approvals = {};
          fwPlan.unitApprovals = {};
          fwPlan.salesForwardedAt = currentTimestamp();
          addAudit("مراجعة المبيعات للخطة الأسبوعية " + fwPlan.id + " وإرسالها للاعتماد (صندوق الموافقات)", roleName(state.role));
          apDone += 1;
          continue;
        }
        if (apKind === "weekly-approve") {
          var apRoleKey = state.role === "production" ? "production" : state.role === "fgWarehouse" ? "fgWarehouse" : "";
          var apPlan = state.weeklyPlans.find(function (item) { return item.id === apId && item.status === "awaiting_approvals"; });
          if (!apRoleKey || !apPlan || planFullyApprovedByRole(apPlan, apRoleKey)) { apSkipped.push(apId); continue; }
          approvePlanUnits(apPlan, apRoleKey, planUnits(apPlan).map(function (unit) { return unit.key; }));
          addAudit("اعتماد " + roleName(state.role) + " لكل وحدات الخطة " + apPlan.id + " (صندوق الموافقات)", roleName(state.role));
          recomputePlanApproval(apPlan);
          apDone += 1;
          continue;
        }
        if (apKind === "po-approve") {
          if (state.role !== "finance") { apSkipped.push(apId); continue; }
          var apPo = state.commitments.find(function (item) { return item.id === apId; });
          if (!apPo || apPo.status === "received" || apPo.status === "cancelled" || apPo.status === "in_transit") { apSkipped.push(apId); continue; }
          // نفس قاعدة الشاشة المفردة: لا موافقة مالية بلا كوتيشن مرفق.
          if (!(apPo.quotation && apPo.quotation.dataUrl)) { apSkipped.push(apPo.po || apId); continue; }
          apPo.financeApproval = { status: "approved", note: "", at: currentTimestamp() };
          addAudit("موافقة المالية على أمر الشراء " + apPo.id + " · " + apPo.po + " (صندوق الموافقات)", roleName(state.role));
          apDone += 1;
        }
      }
      });
      if (!apDone && !apSkipped.length) { showToast("لم تحدد أي بند.", "error"); return; }
      var apMessage = "اعتُمد " + apDone + " بندًا من صندوق الموافقات.";
      if (apSkipped.length) apMessage += " تُخطّي " + apSkipped.length + " بندًا لم يعد مؤهلًا (" + apSkipped.slice(0, 3).join("، ") + (apSkipped.length > 3 ? "…" : "") + ").";
      refresh(apMessage);
      return;
    }
    if (form.id === "unit-approve-form") {
      var uaPlan = state.weeklyPlans.find(function (item) { return item.id === String(data.get("uaPlan")); });
      if (!uaPlan || uaPlan.status !== "awaiting_approvals") { setDialogFormError(form, "هذه الخطة لم تعد بانتظار الاعتماد."); return; }
      var uaRole = state.role === "production" ? "production" : state.role === "fgWarehouse" ? "fgWarehouse" : "";
      if (!uaRole) { setDialogFormError(form, "الاعتماد للإنتاج ومخزن المنتج النهائي فقط."); return; }
      var uaCount = Number(data.get("uaCount") || 0);
      var uaSelected = [];
      for (var uaIndex = 0; uaIndex < uaCount; uaIndex += 1) {
        var uaKey = data.get("uaUnit_" + uaIndex);
        if (uaKey != null) uaSelected.push(String(uaKey));
      }
      if (!uaSelected.length) { setDialogFormError(form, "حدد وحدة واحدة على الأقل للاعتماد."); return; }
      var uaApproved = approvePlanUnits(uaPlan, uaRole, uaSelected);
      if (!uaApproved) { setDialogFormError(form, "الوحدات المحددة معتمدة مسبقًا."); return; }
      addAudit("اعتماد " + roleName(state.role) + " لـ " + uaApproved + " وحدة من الخطة " + uaPlan.id + " بالتحديد", roleName(state.role));
      recomputePlanApproval(uaPlan);
      closeDialog(); refresh(uaPlan.status === "approved" ? "اكتمل اعتماد كل الوحدات؛ الخطة دخلت التنفيذ." : "اعتُمدت " + uaApproved + " وحدة؛ الباقي بانتظار الاعتماد."); return;
    }

    if (form.id === "weekly-review-form") {
      var wrCount = Number(data.get("wrCount") || 0);
      if (!wrCount) { setDialogFormError(form, "لا توجد خطط في النموذج."); return; }
      var wrRows = [];
      for (var wrIndex = 0; wrIndex < wrCount; wrIndex += 1) {
        var wrPlan = state.weeklyPlans.find(function (item) { return item.id === String(data.get("wrPlan_" + wrIndex)) && item.status === "awaiting_sales"; });
        if (!wrPlan) continue;
        var wrTotal = weeklyPlanTotal(wrPlan);
        var wrSum = 0;
        var wrInvalid = false;
        var wrQtys = wrPlan.weeks.map(function (week, kIndex) {
          var raw = data.get("wrQty_" + wrIndex + "_" + kIndex);
          var trimmed = String(raw == null ? "" : raw).trim();
          if (trimmed === "") return 0;
          if (!validNumber(trimmed, true)) { wrInvalid = true; return 0; }
          wrSum += Number(trimmed);
          return Number(trimmed);
        });
        if (wrInvalid) { setDialogFormError(form, "أدخل كميات صحيحة غير سالبة للخطة " + wrPlan.id + "."); return; }
        if (Math.abs(wrSum - wrTotal) > QTY_EPSILON) { setDialogFormError(form, "مجموع أسابيع " + wrPlan.productCode + " في " + monthLabel(wrPlan.month) + " (" + formatNumber(wrSum) + ") يجب أن يبقى مساويًا لكمية الشهر (" + formatNumber(wrTotal) + ")."); return; }
        wrRows.push({ plan: wrPlan, qtys: wrQtys });
      }
      if (!wrRows.length) { setDialogFormError(form, "لا توجد خطط بانتظار المراجعة."); return; }
      withBatchedSave(function () {
      wrRows.forEach(function (row) {
        var changed = row.plan.weeks.some(function (week, kIndex) { return Number(week.qty) !== row.qtys[kIndex]; });
        if (changed) {
          row.plan.history.push({ version: row.plan.version, by: "المبيعات", at: currentTimestamp(), weeks: clone(row.plan.weeks) });
          var wrVersion = parseInt(String(row.plan.version || "V1").replace(/\D/g, ""), 10) || 1;
          row.plan.version = "V" + (wrVersion + 1);
          row.plan.weeks.forEach(function (week, kIndex) { week.qty = row.qtys[kIndex]; });
        }
        row.plan.status = "awaiting_approvals";
        row.plan.approvals = {};
        row.plan.unitApprovals = {};
        row.plan.salesForwardedAt = currentTimestamp();
        addAudit("مراجعة المبيعات للخطة الأسبوعية " + row.plan.id + (changed ? " مع تعديل التوزيع" : "") + " وإرسالها للاعتماد", roleName(state.role));
      });
      });
      closeDialog(); refresh("أُرسلت " + wrRows.length + " خطة لاعتماد الإنتاج ومخزن المنتج النهائي."); return;
    }

    if (form.id === "week-edit-form") {
      var wePlan = state.weeklyPlans.find(function (item) { return item.id === String(data.get("wePlan")); });
      if (!wePlan) { setDialogFormError(form, "تعذر العثور على الخطة."); return; }
      // كان المعالج يقبل التعديل حتى بعد تسجيل إنتاج فعلي واستهلاك المواد، فتعود الخطة «بانتظار الاعتماد»
      // ويختفي شهرها من التشغيلات الجاهزة بينما المواد مسحوبة أصلًا.
      if (wePlan.status === "cancelled") { setDialogFormError(form, "هذه الخطة ملغاة."); return; }
      if (producedQty(wePlan.forecastId, wePlan.productCode, wePlan.month) > 0) { setDialogFormError(form, "سُجّل إنتاج فعلي لهذا الشهر؛ لا تُعدَّل كمياته — سجّل مشكلة بدل ذلك."); return; }
      var weTotal = weeklyPlanTotal(wePlan);
      var weSum = 0;
      var weInvalid = false;
      var weChangedFrozen = "";
      var weQtys = wePlan.weeks.map(function (week, kIndex) {
        var raw = data.get("weQty_" + kIndex);
        var trimmed = String(raw == null ? "" : raw).trim();
        var value = trimmed === "" ? 0 : Number(trimmed);
        if (trimmed !== "" && !validNumber(trimmed, true)) { weInvalid = true; }
        if (!weekEditable(week) && value !== Number(week.qty)) weChangedFrozen = week.label;
        weSum += value;
        return value;
      });
      if (weInvalid) { setDialogFormError(form, "أدخل كميات صحيحة غير سالبة."); return; }
      if (weChangedFrozen) { setDialogFormError(form, "لا يمكن تعديل " + weChangedFrozen + ": الأسبوع مجمّد (بدأ أو يبدأ خلال أقل من يومين)."); return; }
      if (Math.abs(weSum - weTotal) > QTY_EPSILON) { setDialogFormError(form, "مجموع الأسابيع (" + formatNumber(weSum) + ") يجب أن يبقى مساويًا لكمية الشهر (" + formatNumber(weTotal) + ")."); return; }
      var weChanged = wePlan.weeks.some(function (week, kIndex) { return Number(week.qty) !== weQtys[kIndex]; });
      if (!weChanged) { setDialogFormError(form, "لا توجد تغييرات للحفظ."); return; }
      wePlan.history.push({ version: wePlan.version, by: roleName(state.role), at: currentTimestamp(), weeks: clone(wePlan.weeks) });
      var weVersion = parseInt(String(wePlan.version || "V1").replace(/\D/g, ""), 10) || 1;
      wePlan.version = "V" + (weVersion + 1);
      wePlan.weeks.forEach(function (week, kIndex) { week.qty = weQtys[kIndex]; });
      wePlan.status = "awaiting_approvals";
      wePlan.approvals = {};
      wePlan.unitApprovals = {};
      addAudit("تعديل أسبوع قادم في الخطة " + wePlan.id + " (" + wePlan.productCode + " · " + monthLabel(wePlan.month) + ") وإعادتها للاعتماد", roleName(state.role));
      closeDialog(); refresh("حُفظ التعديل وأعيدت الخطة لاعتماد الإنتاج ومخزن FG؛ الإصدار السابق محفوظ."); return;
    }

    if (form.id === "day-form") {
      var dayPlan = state.weeklyPlans.find(function (item) { return item.id === String(data.get("dayPlan")); });
      if (!dayPlan) { setDialogFormError(form, "تعذر العثور على الخطة."); return; }
      var daySaved = 0;
      for (var dwIndex = 0; dwIndex < dayPlan.weeks.length; dwIndex += 1) {
        if (data.get("dayWeek_" + dwIndex) == null) continue;
        var dayWeek = dayPlan.weeks[dwIndex];
        if (!weekEditable(dayWeek)) continue;
        var startDay = Number(dayWeek.start.slice(8));
        var endDay = Number(dayWeek.end.slice(8));
        var dayMap = {};
        var daySum = 0;
        var dayInvalid = "";
        for (var dayNum = startDay; dayNum <= endDay; dayNum += 1) {
          var dayRaw = data.get("dayQty_" + dwIndex + "_" + dayNum);
          var dayTrimmed = String(dayRaw == null ? "" : dayRaw).trim();
          if (dayTrimmed === "" || Number(dayTrimmed) === 0) continue;
          if (!validNumber(dayTrimmed, false)) { dayInvalid = String(dayNum); break; }
          var dateKey = dayPlan.month + "-" + String(dayNum).padStart(2, "0");
          dayMap[dateKey] = Number(dayTrimmed);
          daySum += Number(dayTrimmed);
        }
        if (dayInvalid) { setDialogFormError(form, "أدخل كمية صحيحة ليوم " + dayInvalid + " في " + dayWeek.label + " أو اتركه فارغًا."); return; }
        // الأسبوع إما غير موزَّع (يبقى بحبيبة الأسبوع) أو موزَّع بالكامل. التوزيع الجزئي كان
        // يُنقص وحدات الاعتماد فتمر كميات بلا اعتماد أي طرف بينما الجدول يعرضها كاملة.
        if (daySum > QTY_EPSILON && Math.abs(daySum - Number(dayWeek.qty)) > QTY_EPSILON) { setDialogFormError(form, "مجموع أيام " + dayWeek.label + " (" + formatNumber(daySum) + ") يجب أن يساوي كمية الأسبوع (" + formatNumber(dayWeek.qty) + ") — أو اترك الأسبوع كله فارغًا ليبقى بحبيبة الأسبوع."); return; }
        dayPlan.weeks[dwIndex].days = dayMap;
        daySaved += 1;
      }
      if (!daySaved) { setDialogFormError(form, "لا توجد أسابيع قابلة للتعديل في هذه الخطة."); return; }
      // توزيع الأيام يغيّر وحدات الاعتماد من أسابيع إلى أيام. كانت الخطة تبقى «معتمدة» بينما
      // العدّاد يقول «0/7 وحدة معتمدة»، وأزرار الاعتماد مخفية — حالة يتيمة لا مخرج منها.
      var dayUnitsChanged = dayPlan.granularity === "daily" && dayPlan.status === "approved";
      if (dayUnitsChanged) {
        dayPlan.status = "awaiting_approvals";
        dayPlan.unitApprovals = {};
        dayPlan.approvals = {};
        dayPlan.approvedAt = "";
      }
      addAudit("حفظ التوزيع اليومي للخطة " + dayPlan.id + " (" + dayPlan.productCode + ")" + (dayUnitsChanged ? " وإعادتها للاعتماد بوحدات يومية" : ""), roleName(state.role));
      closeDialog(); refresh(dayUnitsChanged ? "حُفظ التوزيع اليومي؛ الخطة عادت للاعتماد لأن وحدات الاعتماد صارت أيامًا." : "حُفظ التوزيع اليومي."); return;
    }

    if (form.id === "strategic-form") {
      if (state.role !== "production" && state.role !== "procurement") { setDialogFormError(form, "ضبط الحدود للإنتاج والمشتريات فقط."); return; }
      var stCount = Number(data.get("stCount") || 0);
      if (!stCount) { setDialogFormError(form, "لا مواد في الجدول."); return; }
      var stChanged = 0;
      var canLead = state.role === "procurement";
      for (var stIndex = 0; stIndex < stCount; stIndex += 1) {
        var stMaster = rawMasterByCode(String(data.get("stCode_" + stIndex) || ""));
        if (!stMaster) continue;
        var stStockRawValue = data.get("stStock_" + stIndex);
        var stStockRaw = String(stStockRawValue == null ? "" : stStockRawValue).trim();
        if (stStockRaw !== "" && !validNumber(stStockRaw, true)) { setDialogFormError(form, "أدخل حدًا استراتيجيًا صحيحًا غير سالب للمادة " + stMaster.code + " أو اتركه فارغًا."); return; }
        var stNewStock = stStockRaw === "" ? null : Number(stStockRaw);
        if (stNewStock !== stMaster.strategicStock) {
          stMaster.strategicStock = stNewStock;
          stMaster.strategicSetBy = roleName(state.role);
          stMaster.strategicSetAt = currentTimestamp();
          addAudit((stNewStock == null ? "إلغاء الحد الاستراتيجي لمادة " : "ضبط المخزون الاستراتيجي لمادة ") + stMaster.code + (stNewStock == null ? "" : " عند " + formatNumber(stNewStock)), roleName(state.role));
          stChanged += 1;
        }
        if (canLead) {
          var stLeadRawValue = data.get("stLead_" + stIndex);
          var stLeadRaw = String(stLeadRawValue == null ? "" : stLeadRawValue).trim();
          if (stLeadRaw !== "" && !validNumber(stLeadRaw, true)) { setDialogFormError(form, "أدخل مدة توريد صحيحة بالأيام للمادة " + stMaster.code + " أو اتركها فارغة."); return; }
          var stNewLead = stLeadRaw === "" ? null : Number(stLeadRaw);
          if (stNewLead !== stMaster.leadTimeDays) {
            stMaster.leadTimeDays = stNewLead;
            addAudit((stNewLead == null ? "إلغاء مدة التوريد لمادة " : "ضبط مدة التوريد التقريبية لمادة ") + stMaster.code + (stNewLead == null ? "" : " عند " + formatNumber(stNewLead) + " يوم"), roleName(state.role));
            stChanged += 1;
          }
        }
      }
      if (!stChanged) { setDialogFormError(form, "لا توجد تغييرات للحفظ."); return; }
      closeDialog(); refresh("حُفظت الحدود والمدد (" + stChanged + " تغيير)؛ التنبيهات تتحدث تلقائيًا."); return;
    }

    if (form.id === "supply-form") {
      if (state.role !== "procurement") { setDialogFormError(form, "قرار إمكانية التوريد للمشتريات فقط."); return; }
      var supplyForecast = state.forecasts.find(function (item) { return item.id === String(data.get("supplyForecast")); });
      if (!supplyForecast || supplyForecast.status !== "submitted") { setDialogFormError(form, "هذا المستند لم يعد في مرحلة فحص الجاهزية."); return; }
      var supplyReadiness = forecastReadiness(supplyForecast);
      if (!supplyReadiness.hasMaterials || !supplyReadiness.allConfirmed || supplyForecast.readinessStale) { setDialogFormError(form, "لا يكتمل القرار قبل حساب الاحتياجات ورفع رصيد المخزن كاملًا."); return; }
      var supplyOk = String(data.get("supplyDecision")) === "yes";
      supplyForecast.supplyFeasibility = { confirmed: supplyOk, note: String(data.get("supplyNote") || "").trim(), at: currentTimestamp() };
      addAudit((supplyOk ? "تأكيد المشتريات إمكانية التوريد لمستند " : "إبلاغ المشتريات بتعذر التوريد لمستند ") + supplyForecast.id, roleName(state.role));
      closeDialog(); refresh(supplyOk ? "تم تأكيد إمكانية التوريد؛ أصبح رد الإنتاج على المبيعات متاحًا." : "سُجّل تعذر التوريد؛ لا يمكن التثبيت — على الإنتاج إرسال أرقام معدلة للمبيعات."); return;
    }

    if (form.id === "sales-form") {
      var slCount = Number(data.get("slCount") || 0);
      if (!slCount) { setDialogFormError(form, "لا توجد منتجات في الجدول."); return; }
      var slRows = [];
      for (var slIndex = 0; slIndex < slCount; slIndex += 1) {
        var slCode = normalizeCode(data.get("slProduct_" + slIndex));
        var slQtyRawValue = data.get("slQty_" + slIndex);
        var slQtyRaw = String(slQtyRawValue == null ? "" : slQtyRawValue).trim();
        if (slQtyRaw === "") continue;
        var slProduct = state.products.find(function (item) { return normalizeCode(item.code) === slCode; });
        if (!slProduct) continue;
        var slDate = String(data.get("slDate_" + slIndex) || "");
        if (!validNumber(slQtyRaw, false) || !/^\d{4}-\d{2}-\d{2}$/.test(slDate)) { setDialogFormError(form, "أدخل كمية صحيحة موجبة وتاريخًا صحيحًا للمنتج " + slCode + " أو اترك صفه فارغًا."); return; }
        var slNet = productNetAvailable(slCode) - slRows.filter(function (row) { return row.code === slCode; }).reduce(function (sum, row) { return sum + row.qty; }, 0);
        if (Number(slQtyRaw) > slNet) { setDialogFormError(form, "كمية بيع " + slCode + " (" + formatNumber(Number(slQtyRaw)) + ") تتجاوز الصافي المتاح (" + formatNumber(slNet) + ")."); return; }
        var slOrderId = String(data.get("slOrder_" + slIndex) || "");
        var slChannel = String(data.get("slChannel_" + slIndex) || "direct") === "agent" ? "agent" : "direct";
        var slOrder = slOrderId ? state.agentOrders.find(function (item) { return item.id === slOrderId; }) : null;
        if (slChannel === "agent" && !slOrder) { setDialogFormError(form, "اختر أوردر الوكيل للمنتج " + slCode + " أو اجعل القناة بيعًا مباشرًا."); return; }
        slRows.push({ code: slCode, product: slProduct, qty: Number(slQtyRaw), date: slDate, note: String(data.get("slNote_" + slIndex) || "").trim(), channel: slOrder ? "agent" : slChannel, order: slOrder });
      }
      if (!slRows.length) { setDialogFormError(form, "أدخل كمية بيع لمنتج واحد على الأقل."); return; }
      slRows.forEach(function (row) {
        var saleId = createId("SL");
        state.salesRecords.unshift({ id: saleId, productCode: row.product.code, product: row.product.name, unit: row.product.unit, qty: row.qty, date: row.date, note: row.note, channel: row.channel, agentOrderId: row.order ? row.order.id : "", agentCode: row.order ? row.order.agentCode : "", recordedAt: currentTimestamp() });
        addAudit("تسجيل بيع " + formatNumber(row.qty) + " " + (row.product.unit || "") + " من " + row.product.code + " بتاريخ " + row.date + (row.order ? " ضمن أوردر الوكيل " + row.order.id : " (بيع مباشر)"), roleName(state.role));
      });
      closeDialog(); refresh("سُجّلت " + slRows.length + " عملية بيع وخُصمت من الصافي المتاح."); return;
    }

    if (form.id === "issue-close-form") {
      var icIssue = state.issues.find(function (item) { return item.id === String(data.get("icId") || ""); });
      if (!icIssue || !issueVisibleToRole(icIssue)) { setDialogFormError(form, "تعذر العثور على القضية."); return; }
      if (icIssue.status === "closed") { setDialogFormError(form, "هذه القضية مغلقة أصلًا."); return; }
      var icCause = String(data.get("icCause") || "").trim();
      var icFix = String(data.get("icFix") || "").trim();
      if (!icCause || !icFix) { setDialogFormError(form, "اكتب سبب المشكلة والحل المنفَّذ قبل الإغلاق."); return; }
      if (!canResolveIssue(icIssue)) { setDialogFormError(form, "تسجيل الحل لقسم المشكلة أو من بلّغ عنها أو الإدارة."); return; }
      icIssue.rootCause = icCause;
      icIssue.resolution = icFix;
      icIssue.prevention = String(data.get("icPrevent") || "").trim();
      icIssue.resolvedBy = roleName(state.role);
      icIssue.resolvedAt = currentTimestamp();
      // التحقق والإغلاق للإدارة؛ القسم يسجّل الحل فتصير القضية «انحلّت — بانتظار التحقق».
      if (canVerifyIssue(icIssue)) {
        icIssue.status = "closed";
        icIssue.closedBy = roleName(state.role);
        icIssue.closedAt = currentTimestamp();
        icIssue.evidence = "انحلّت — تحقق " + roleName(state.role);
        addAudit("إغلاق القضية " + icIssue.id + " — السبب: " + icCause.slice(0, 60) + " · الحل: " + icFix.slice(0, 60), roleName(state.role));
        closeDialog(); refresh("انحلّت القضية وسُجّل سببها وحلها.");
        return;
      }
      icIssue.status = "resolved";
      icIssue.evidence = "سجّل الحل " + roleName(state.role) + " — بانتظار تحقق الإدارة";
      addAudit("تسجيل حل القضية " + icIssue.id + " — السبب: " + icCause.slice(0, 60) + " · الحل: " + icFix.slice(0, 60), roleName(state.role));
      closeDialog(); refresh("سُجّل الحل؛ القضية بانتظار تحقق الإدارة."); return;
    }

    if (form.id === "issue-form") {
      var issueTitle = String(data.get("title") || "").trim();
      var issueSource = String(data.get("source") || "").trim();
      var issueImpact = String(data.get("impact") || "").trim();
      var issueAction = String(data.get("action") || "").trim();
      var issueOwner = String(data.get("owner") || "").trim();
      var issueDue = String(data.get("due") || "");
      if (!issueTitle || !issueSource || !issueImpact || !issueAction || !issueOwner || !/^\d{4}-\d{2}-\d{2}$/.test(issueDue)) { setDialogFormError(form, "أكمل عنوان المشكلة والسجل والأثر والإجراء والمالك والموعد."); return; }
      var issueIdNew = createId("ISS");
      var issueDeptKey = String(data.get("department") || state.role);
      if (!roles[issueDeptKey]) issueDeptKey = state.role;
      state.issues.unshift({
        id: issueIdNew, title: issueTitle, source: issueSource,
        // «عند أي قسم المشكلة» يختلف عن «من بلّغ عنها»: القسم المسؤول يُختار، والمُبلِّغ يُسجَّل تلقائيًا.
        departmentRole: issueDeptKey, department: roles[issueDeptKey].name,
        raisedByRole: state.role, raisedBy: roleName(state.role),
        impact: issueImpact, action: issueAction, owner: issueOwner, due: issueDue,
        severity: String(data.get("severity")), status: "open", evidence: "",
        rootCause: "", resolution: "", prevention: "", closedBy: "",
        visibility: state.role === "sales" ? "commercial" : "internal", createdAt: currentTimestamp()
      });
      addAudit("فتح القضية " + issueIdNew + " — القسم: " + roles[issueDeptKey].name + " · المُبلِّغ: " + roleName(state.role), roleName(state.role));
      closeDialog(); refresh("تم تسجيل المشكلة وإظهارها للإدارة."); return;
    }

  });

  // نفس الحارس المركزي لمسارات الرفع والتغيير — الاستيراد يكتب في البيانات كالنماذج تمامًا.
  var CHANGE_ROLES = {
    "import-material": ["production"], "import-forecast": ["sales", "finance"], "import-sales-feedback": ["sales"], "import-production-review": ["production"], "import-weekly": ["production"], "import-strategic": ["production"],
    "import-agent-orders": ["sales"], "import-master": ["admin"], "import-warehouse-file": ["rmWarehouse"],
    "quotation-file": ["procurement"], "late-quotation-file": ["procurement"], "logo-file": ["admin"]
  };

  document.addEventListener("change", function (event) {
    var changeAction = event.target.getAttribute && event.target.getAttribute("data-action");
    var changeAllowed = changeAction ? rolesAllowedFor(CHANGE_ROLES, changeAction) : null;
    if (changeAllowed && changeAllowed.indexOf(state.role) === -1) {
      showToast(denialMessage(changeAllowed), "error");
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="exec-widget-toggle"]')) {
      var widgetKey = event.target.getAttribute("data-widget");
      var currentDashboardUser = (state.users || []).find(function (user) { return user.id === state.currentUserId; });
      if (state.role !== "admin" || !currentDashboardUser || !EXEC_WIDGETS.some(function (widget) { return widget.key === widgetKey; })) { showToast("تخصيص الداشبورد من مسؤول النظام فقط.", "error"); renderApp(); return; }
      var currentSettings = dashboardWidgetsForUser(currentDashboardUser);
      if (event.target.checked) delete currentSettings[widgetKey];
      else currentSettings[widgetKey] = false;
      currentDashboardUser.dashboardWidgets = currentSettings;
      execPickerOpen = true;
      saveState();
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="executive-filter"]')) {
      var executiveFilterKey = event.target.getAttribute("data-filter");
      if (Object.prototype.hasOwnProperty.call(executiveFilters, executiveFilterKey)) executiveFilters[executiveFilterKey] = event.target.value;
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="table-filter"]')) {
      var filterKey = event.target.getAttribute("data-table");
      var filterColumn = event.target.getAttribute("data-column");
      var filterView = tableViewState[filterKey] || (tableViewState[filterKey] = { q: "", cols: {}, sort: null });
      if (event.target.value) filterView.cols[filterColumn] = event.target.value;
      else delete filterView.cols[filterColumn];
      var filterTable = tableByKey(filterKey);
      if (filterTable) applyTableView(filterTable);
      ensureTableClearButton(event.target.closest(".table-toolbar"), filterKey);
      return;
    }
    if (event.target.matches('[data-action="approval-pick-all"]')) {
      var apAll = event.target.checked;
      Array.prototype.forEach.call(document.querySelectorAll('[data-action="approval-pick"]'), function (box) { box.checked = apAll; });
      refreshApprovalSelection();
      return;
    }
    if (event.target.matches('[data-action="approval-pick"]')) {
      refreshApprovalSelection();
      return;
    }
    if (event.target.matches('[data-action="weekly-pick-all"]')) {
      var allChecked = event.target.checked;
      weeklyPickBoxes().forEach(function (box) { box.checked = allChecked; });
      refreshWeeklySelection();
      return;
    }
    if (event.target.matches('[data-action="weekly-pick"]')) {
      refreshWeeklySelection();
      return;
    }
    if (event.target.matches('[data-action="weekly-select-month"]')) {
      var wantedMonth = event.target.value;
      if (wantedMonth) {
        weeklyPickBoxes().forEach(function (box) { box.checked = box.getAttribute("data-month") === wantedMonth; });
        refreshWeeklySelection();
      }
      return;
    }
    if (event.target.matches('[data-action="weekly-basis"]')) {
      var basisRow = event.target.getAttribute("data-row");
      var basisTarget = planQty(event.target.value === "gross" ? event.target.getAttribute("data-gross") : event.target.getAttribute("data-net"));
      var basisField = document.getElementById("wp-target-" + basisRow);
      var basisLabel = document.getElementById("wp-target-label-" + basisRow);
      if (basisField) basisField.value = basisTarget;
      if (basisLabel) basisLabel.textContent = formatNumber(basisTarget);
      weeklySplitValues(basisTarget, "equal").forEach(function (value, kIndex) {
        var cell = document.querySelector('[name="wpQty_' + basisRow + '_' + kIndex + '"]');
        if (cell) cell.value = value;
      });
      return;
    }
    if (event.target.matches('[data-action="forecast-range"]')) {
      rebuildForecastGrid();
      return;
    }
    if (event.target.matches('[data-action="import-material"]')) {
      var materialFile = event.target.files && event.target.files[0];
      if (!materialFile) return;
      beginMaterialImport(materialFile).catch(function (error) { showToast(error.message || "تعذر قراءة الملف.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-warehouse-file"]')) {
      var warehouseFile = event.target.files && event.target.files[0];
      if (!warehouseFile) return;
      importWarehouseFile(warehouseFile, event.target.getAttribute("data-category")).catch(function (error) { showToast(error.message || "تعذر قراءة ملف المخزن.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-strategic"]')) {
      var strategicFile = event.target.files && event.target.files[0];
      if (!strategicFile) return;
      importStrategicFile(strategicFile, event.target.getAttribute("data-category")).catch(function (error) { showToast(error.message || "تعذر قراءة جدول الحدود والمدد.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-forecast"]')) {
      var forecastFile = event.target.files && event.target.files[0];
      if (!forecastFile) return;
      beginForecastImport(forecastFile).catch(function (error) { showToast(error.message || "تعذر قراءة الملف.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-production-review"]')) {
      var productionReviewFile = event.target.files && event.target.files[0];
      if (!productionReviewFile) return;
      importProductionReviewFile(productionReviewFile).catch(function (error) { showToast(error.message || "تعذر رفع النسخة المعدلة.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-sales-feedback"]')) {
      var salesFeedbackFile = event.target.files && event.target.files[0];
      if (!salesFeedbackFile) return;
      importSalesFeedbackFile(salesFeedbackFile, event.target.getAttribute("data-id")).catch(function (error) { showToast(error.message || "تعذر رفع ملف المبيعات المعدّل.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="quotation-file"]')) {
      readQuotationFile(event.target);
      return;
    }
    if (event.target.matches('[data-action="quotation-late"]')) {
      readLateQuotationFile(event.target);
      return;
    }
    if (event.target.matches('[data-action="import-weekly"]')) {
      var weeklyFile = event.target.files && event.target.files[0];
      if (!weeklyFile) return;
      beginWeeklyImport(weeklyFile).catch(function (error) { showToast(error.message || "تعذر قراءة الملف.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="branding-color"]')) {
      if (state.role !== "admin") { showToast("الهوية لمسؤول النظام فقط.", "error"); return; }
      var pickedColor = String(event.target.value || "");
      if (/^#[0-9a-fA-F]{6}$/.test(pickedColor)) {
        state.branding.themeColor = pickedColor;
        saveState();
        applyBranding();
        showToast("طُبق لون الثيم الجديد فورًا.", "success");
      }
      return;
    }
    if (event.target.matches('[data-action="branding-logo"]')) {
      if (state.role !== "admin") { showToast("الهوية لمسؤول النظام فقط.", "error"); event.target.value = ""; return; }
      readBrandingLogo(event.target);
      return;
    }
    if (event.target.matches('[data-action="switch-lang"]')) {
      state.lang = LANGS[event.target.value] ? event.target.value : "ar";
      langCache = {};
      saveState();
      renderApp();
      showToast(state.lang === "ar" ? "تم التحويل إلى العربية." : state.lang === "en" ? "Language switched to English." : "زمان گۆڕدرا بۆ کوردی سۆرانی.", "success");
      return;
    }
    if (event.target.matches('[data-action="lang-filter"]')) {
      langSearchFilter = event.target.value;
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="lang-miss-filter"]')) {
      langMissFilter = event.target.value;
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="report-month-filter"]')) {
      reportMonthFilter = event.target.value;
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="report-product-filter"]')) {
      reportProductFilter = event.target.value;
      renderApp();
      return;
    }
    if (event.target.matches('[data-action="switch-role"]')) {
      if (!demoRoleSwitchAllowed()) { showToast("تبديل الدور متاح لمسؤول النظام فقط بعد إطفاء وضع العرض التجريبي.", "error"); renderApp(); return; }
      state.role = event.target.value;
      var roleUser = activeUsers().find(function (user) { return user.role === event.target.value; });
      state.currentUserId = roleUser ? roleUser.id : "";
      state.page = "home";
      saveState();
      renderApp();
      showToast("تم التبديل إلى مساحة " + roleName(state.role) + ".", "success");
      return;
    }
    if (event.target.matches('[data-action="import-agent-orders"]')) {
      var agentOrderFile = event.target.files && event.target.files[0];
      if (!agentOrderFile) return;
      importAgentOrdersFile(agentOrderFile).catch(function (error) { showToast(error.message || "تعذر استيراد الملف.", "error"); });
      event.target.value = "";
      return;
    }
    if (event.target.matches('[data-action="import-master"]')) {
      var masterFile = event.target.files && event.target.files[0];
      if (!masterFile) return;
      importMasterFile(masterFile, event.target.getAttribute("data-kind"), event.target.getAttribute("data-category")).catch(function (error) { showToast(error.message || "تعذر استيراد الملف.", "error"); });
      event.target.value = "";
      return;
    }
  });

  document.addEventListener("input", function (event) {
    if (!event.target || !event.target.getAttribute) return;
    if (event.target.getAttribute("data-action") === "list-search") {
      var listKey = event.target.getAttribute("data-list");
      var listView = tableViewState[listKey] || (tableViewState[listKey] = { q: "", cols: {}, sort: null });
      listView.q = event.target.value;
      var listNode = listByKey(listKey);
      if (listNode) applyListView(listNode);
      var listBar = event.target.closest(".table-toolbar");
      if (listBar && listView.q && !listBar.querySelector('[data-action="list-clear"]')) {
        var listClear = document.createElement("button");
        listClear.className = "btn btn-secondary btn-sm";
        listClear.type = "button";
        listClear.setAttribute("data-action", "list-clear");
        listClear.setAttribute("data-list", listKey);
        listClear.textContent = localizeText("مسح البحث");
        listBar.appendChild(listClear);
      }
      return;
    }
    if (event.target.getAttribute("data-action") === "table-search") {
      // بلا إعادة رسم: التصفية تجري على الصفوف مباشرة فلا يفقد الحقل التركيز أثناء الكتابة.
      var searchKey = event.target.getAttribute("data-table");
      var searchView = tableViewState[searchKey] || (tableViewState[searchKey] = { q: "", cols: {}, sort: null });
      searchView.q = event.target.value;
      var searchTable = tableByKey(searchKey);
      if (searchTable) applyTableView(searchTable);
      if (searchView.q) ensureTableClearButton(event.target.closest(".table-toolbar"), searchKey);
      return;
    }
    // أي إدخال داخل النافذة يجعل إغلاقها العرضي (Esc أو النقر خارجها) يطلب تأكيدًا.
    if (event.target.closest && event.target.closest("#app-dialog")) dialogDirty = true;
    // تعديل أرقام صف في جدول الرصيد يحدد خانة تأكيده تلقائيًا.
    var stockRow = event.target.getAttribute("data-stock-row");
    if (stockRow != null) {
      var confirmBox = document.querySelector('input[name="stockConfirm_' + stockRow + '"]');
      if (confirmBox) confirmBox.checked = true;
    }
    if (event.target.matches && event.target.matches(".production-forecast-cell")) {
      event.target.classList.toggle("forecast-cell-red", Number(event.target.value || 0) !== Number(event.target.getAttribute("data-original-value") || 0));
      return;
    }
    if (event.target.matches && event.target.matches(".forecast-sales-cell")) {
      var productionChanged = event.target.getAttribute("data-production-changed") === "1";
      var productionValue = Number(event.target.getAttribute("data-production-value") || 0);
      event.target.classList.remove("forecast-cell-red", "forecast-cell-green", "forecast-cell-yellow");
      if (productionChanged) event.target.classList.add(Number(event.target.value || 0) === productionValue ? "forecast-cell-green" : "forecast-cell-yellow");
      else if (event.target.getAttribute("data-production-value") != null && Number(event.target.value || 0) !== productionValue) event.target.classList.add("forecast-cell-red");
    }
  });

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action], [data-page]");
    if (!target) return;
    var page = target.getAttribute("data-page");
    var action = target.getAttribute("data-action");
    if (page && !action) { navigate(page); return; }

    if (action === "toggle-procurement-view") {
      procurementPolished = !procurementPolished;
      try { window.localStorage.setItem(PROCUREMENT_VIEW_KEY, procurementPolished ? "1" : "0"); } catch (error) {}
      renderApp();
      showToast(procurementPolished ? "تم تفعيل العرض المحسّن لصفحة المشتريات." : "تمت استعادة العرض المعتاد.", "success");
      return;
    }

    // فلاتر الجداول تعمل على الشاشة وحدها ولا تكتب في البيانات، فلا تمر بجدول التفويض.
    if (action === "table-sort") {
      var sortKey = target.getAttribute("data-table");
      var sortColumn = Number(target.getAttribute("data-column"));
      var sortTable = tableByKey(sortKey);
      if (!sortTable) return;
      var sortView = tableViewState[sortKey] || (tableViewState[sortKey] = { q: "", cols: {}, sort: null });
      if (sortView.sort && sortView.sort.column === sortColumn) {
        sortView.sort = sortView.sort.dir === "asc" ? { column: sortColumn, dir: "desc" } : null;
      } else {
        sortView.sort = { column: sortColumn, dir: "asc" };
      }
      renderApp();
      return;
    }
    if (action === "copy-download-text") {
      var area = document.getElementById("download-fallback-text");
      if (area) {
        area.focus();
        area.select();
        var copied = false;
        try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
        if (!copied && window.navigator && window.navigator.clipboard) {
          window.navigator.clipboard.writeText(pendingDownloadText).then(function () { showToast("نُسخ المحتوى إلى الحافظة.", "success"); });
          return;
        }
        showToast(copied ? "نُسخ المحتوى إلى الحافظة." : "حدد النص يدويًا وانسخه.", copied ? "success" : "error");
      }
      return;
    }
    if (action === "open-quotation") {
      // مرفق الكوتيشن كان رابط data: وسفاري يمنع فتحه أو تنزيله؛ الآن يُحوَّل إلى Blob.
      var quotationCommitment = state.commitments.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!quotationCommitment || !quotationCommitment.quotation || !quotationCommitment.quotation.dataUrl) { showToast("لا يوجد مرفق لهذا الأوردر.", "error"); return; }
      try {
        var parts = String(quotationCommitment.quotation.dataUrl).split(",");
        var meta = parts[0] || "";
        var binary = window.atob(parts[1] || "");
        var bytes = new Uint8Array(binary.length);
        for (var b = 0; b < binary.length; b += 1) bytes[b] = binary.charCodeAt(b);
        var quotationType = /:(.*?);/.exec(meta);
        var quotationBlob = new Blob([bytes], { type: quotationType ? quotationType[1] : "application/octet-stream" });
        var quotationUrl = window.URL.createObjectURL(quotationBlob);
        var quotationLink = document.createElement("a");
        quotationLink.href = quotationUrl;
        quotationLink.download = quotationCommitment.quotation.name || "quotation";
        quotationLink.rel = "noopener";
        document.body.appendChild(quotationLink);
        quotationLink.click();
        document.body.removeChild(quotationLink);
        window.setTimeout(function () { window.URL.revokeObjectURL(quotationUrl); }, 8000);
        showToast("نُزّل الكوتيشن: " + quotationCommitment.quotation.name, "success");
      } catch (error) {
        showToast("تعذر فتح المرفق في هذا المتصفح.", "error");
      }
      return;
    }
    if (action === "approval-select-all" || action === "approval-select-none" || action === "approval-select-within") {
      visiblePickBoxes('[data-action="approval-pick"]').forEach(function (box) {
        box.checked = action === "approval-select-all" ? true
          : action === "approval-select-none" ? false
          : box.getAttribute("data-within") === "1";
      });
      refreshApprovalSelection();
      return;
    }
    if (action === "weekly-select-all" || action === "weekly-select-none") {
      var wantChecked = action === "weekly-select-all";
      visiblePickBoxes('[data-action="weekly-pick"]').forEach(function (box) { box.checked = wantChecked; });
      refreshWeeklySelection();
      return;
    }
    if (action === "weekly-apply-bulk") {
      var picked = weeklyPickBoxes().filter(function (box) { return box.checked && rowVisible(box); });
      if (!picked.length) { showToast("حدّد صفًا واحدًا على الأقل قبل تطبيق الأمر الجماعي.", "error"); return; }
      var patternField = document.getElementById("wp-bulk-pattern");
      var basisField = document.getElementById("wp-bulk-basis");
      var granField = document.getElementById("wp-bulk-gran");
      var options = {
        pattern: patternField ? patternField.value : "",
        basis: basisField ? basisField.value : "",
        granularity: granField ? granField.value : ""
      };
      if (!options.pattern && !options.basis && !options.granularity) { showToast("اختر نمطًا أو أساسًا أو مرونة قبل التطبيق.", "error"); return; }
      var applied = 0;
      picked.forEach(function (box) { if (applyWeeklyRow(box.getAttribute("data-row"), options)) applied += 1; });
      showToast("طُبِّق الأمر على " + formatNumber(applied) + " صفًا.", "success");
      return;
    }
    if (action === "table-export") {
      exportVisibleTable(target.getAttribute("data-table"));
      return;
    }
    if (action === "list-export") {
      exportVisibleList(target.getAttribute("data-list"));
      return;
    }
    if (action === "list-clear") {
      tableViewState[target.getAttribute("data-list")] = { q: "", cols: {}, sort: null };
      renderApp();
      return;
    }
    if (action === "table-clear") {
      var clearKey = target.getAttribute("data-table");
      tableViewState[clearKey] = { q: "", cols: {}, sort: null };
      // داخل نافذة حوار لا يمكن إعادة رسم الصفحة: نعيد ضبط عناصر الشريط في مكانها.
      var clearToolbar = target.closest(".table-toolbar");
      if (inDialog(target) && clearToolbar) {
        var searchField = clearToolbar.querySelector('[data-action="table-search"]');
        if (searchField) searchField.value = "";
        Array.prototype.forEach.call(clearToolbar.querySelectorAll('[data-action="table-filter"]'), function (select) { select.value = ""; });
        var clearedTable = tableByKey(clearKey);
        if (clearedTable) applyTableView(clearedTable);
        target.remove();
        return;
      }
      renderApp();
      return;
    }

    // الحارس المركزي لإجراءات النقر — نفس مبدأ حارس النماذج.
    var actionAllowed = rolesAllowedFor(ACTION_ROLES, action);
    if (actionAllowed && actionAllowed.indexOf(state.role) === -1) {
      showToast(denialMessage(actionAllowed), "error");
      return;
    }

    if (action === "logout") { state.loggedIn = false; saveState(); renderLogin(); return; }
    if (action === "guide") { openGuide(); return; }
    if (action === "submit-dialog-form") { submitDialogForm(document.getElementById(target.getAttribute("data-form-id"))); return; }
    if (action === "export-backup") { exportManualBackup(); return; }
    if (action === "backup-settings") { openBackupSettings(); return; }
    if (action === "save-forecast-draft") {
      var forecastForm = document.getElementById("forecast-form");
      if (!forecastForm) { showToast("تعذر العثور على نموذج Forecast.", "error"); return; }
      var forecastMode = forecastForm.querySelector('[name="forecastMode"]');
      if (forecastMode && state.role !== "finance") forecastMode.value = "draft";
      submitDialogForm(forecastForm);
      return;
    }
    if (action === "save-stock") { saveStockForm(document.getElementById("stock-form")); return; }
    if (action === "save-receipt") { saveReceiptForm(document.getElementById("receipt-form")); return; }
    if (action === "open-order-roadmap") { openExecutiveOrderRoadmap(target.getAttribute("data-order-id")); return; }
    if (action === "executive-chart") {
      var chartFilterKey = target.getAttribute("data-filter");
      var chartFilterValue = target.getAttribute("data-value");
      if (chartFilterKey && Object.prototype.hasOwnProperty.call(executiveFilters, chartFilterKey) && chartFilterValue !== "__rest") {
        executiveFilters[chartFilterKey] = executiveFilters[chartFilterKey] === chartFilterValue ? "all" : chartFilterValue;
        renderApp();
      }
      return;
    }
    if (action === "toggle-series") {
      var seriesKey = target.getAttribute("data-series");
      executiveHiddenSeries[seriesKey] = !executiveHiddenSeries[seriesKey];
      renderApp();
      return;
    }
    if (action === "apply-executive-search") {
      var executiveSearch = document.getElementById("executive-search");
      executiveFilters.query = executiveSearch ? executiveSearch.value : "";
      renderApp();
      return;
    }
    if (action === "toggle-exec-picker") {
      execPickerOpen = !execPickerOpen;
      renderApp();
      return;
    }
    if (action === "exec-widgets-show-all") {
      var dashboardCurrentUser = (state.users || []).find(function (user) { return user.id === state.currentUserId; });
      if (state.role !== "admin" || !dashboardCurrentUser) { showToast("تخصيص الداشبورد من مسؤول النظام فقط.", "error"); return; }
      dashboardCurrentUser.dashboardWidgets = {};
      execPickerOpen = true;
      saveState();
      renderApp();
      showToast("أُظهرت كل أقسام الداشبورد.", "success");
      return;
    }
    if (action === "exec-kpi-health") {
      var kpiHealth = target.getAttribute("data-health");
      executiveFilters.health = executiveFilters.health === kpiHealth ? "all" : kpiHealth;
      renderApp();
      return;
    }
    if (action === "reset-executive-filters") {
      executiveFilters = { health: "all", stage: "all", product: "all", from: "", to: "", sort: "risk", query: "" };
      executiveHiddenSeries = {};
      renderApp();
      return;
    }
    if (action === "refresh-live-data") { syncStateFromStorage(); renderApp(); showToast("تمت مزامنة أحدث بيانات الأقسام.", "success"); return; }
    if (action === "refresh-executive") { syncStateFromStorage(); state.page = "executive"; renderApp(); showToast("تم تحديث Dashboard من أحدث سجلات جميع الأقسام.", "success"); return; }
    if (action === "go-step") {
      // كان هذا الزر يمنح دور قسم آخر بنقرة واحدة. الآن ينقل الصفحة فقط ضمن صلاحية الدور الحالي.
      closeDialog();
      var stepRole = target.getAttribute("data-role") || state.role;
      var stepPage = target.getAttribute("data-page") || "home";
      if (stepRole !== state.role) { showToast("هذه الخطوة من مسؤولية " + roleName(stepRole) + "؛ لا يمكن تنفيذها من دورك الحالي.", "error"); return; }
      if (!canAccess(stepPage)) { showToast("هذه الشاشة خارج صلاحيات دورك.", "error"); return; }
      state.page = stepPage;
      saveState(); renderApp();
      return;
    }
    if (action === "reset") {
      var resetPassword = window.prompt("سيُمسح كل شيء، بما فيه التعريفات والمستخدمون والإعدادات. اكتب كلمة التأكيد للمتابعة:");
      if (resetPassword === "1975") {
        executiveFilters = { health: "all", stage: "all", product: "all", from: "", to: "", sort: "risk", query: "" };
        state = clone(defaultState);
        state.loggedIn = false;
        state.currentUserId = "";
        saveState(); renderLogin(); showToast("تم مسح كل بيانات التطبيق بالكامل. ادخل بالحساب الافتراضي لمسؤول النظام.", "success");
      } else if (resetPassword !== null) showToast("كلمة التأكيد غير صحيحة؛ لم يُمسح أي شيء.", "error");
      return;
    }
    if (action === "toggle-demo-mode") {
      state.demoMode = state.demoMode === false;
      addAudit((state.demoMode ? "تفعيل" : "إطفاء") + " وضع العرض التجريبي (مبدّل الدور)", roleName(state.role));
      saveState(); renderApp();
      showToast(state.demoMode ? "فُعّل وضع العرض؛ مبدّل الدور ظاهر للجميع." : "أُطفئ وضع العرض؛ تبديل الدور لمسؤول النظام وحده.", "success");
      return;
    }
    if (action === "close-dialog") { closeDialog(); return; }
    if (action === "apply-bom-suggestion") {
      var bomField = document.querySelector('[name="' + target.getAttribute("data-target") + '"]');
      if (bomField) { bomField.value = target.getAttribute("data-value") || ""; bomField.focus(); }
      return;
    }
    if (action === "go-first-task") {
      var firstTask = roleTaskSteps(state.role)[0];
      if (firstTask) navigate(firstTask.page); else showToast("لا توجد مهام مستحقة لهذا الدور الآن.", "success");
      return;
    }
    if (action === "new-product") { openProductForm(); return; }
    if (action === "new-raw-material") { openRawMaterialForm(target.getAttribute("data-category")); return; }
    if (action === "delete-master") {
      if (state.role !== "admin") { showToast("التعريفات لمسؤول النظام فقط.", "error"); return; }
      var masterKind = target.getAttribute("data-kind");
      var masterCode = normalizeCode(target.getAttribute("data-code"));
      if (masterKind === "product") {
        var productEntry = state.products.find(function (item) { return normalizeCode(item.code) === masterCode; });
        if (!productEntry) { showToast("تعذر العثور على التعريف.", "error"); return; }
        var productLinked = state.forecasts.some(function (forecast) { return (forecast.items || []).some(function (line) { return normalizeCode(line.productCode) === masterCode; }); })
          || state.weeklyPlans.some(function (plan) { return normalizeCode(plan.productCode) === masterCode; })
          || state.actuals.some(function (item) { return normalizeCode(item.productCode) === masterCode; })
          || state.salesRecords.some(function (item) { return normalizeCode(item.productCode) === masterCode; })
          || state.fgReceipts.some(function (item) { return normalizeCode(item.productCode) === masterCode; });
        if (productLinked) { showToast("لا يمكن حذف المنتج " + productEntry.code + " لارتباطه بسجلات تشغيلية — استخدم «تعديل» وعطّله بدلًا من الحذف.", "error"); return; }
        if (!window.confirm("حذف المنتج " + productEntry.code + " · " + productEntry.name + " نهائيًا؟")) return;
        state.products = state.products.filter(function (item) { return normalizeCode(item.code) !== masterCode; });
        addAudit("حذف تعريف المنتج " + productEntry.code + " · " + productEntry.name, roleName(state.role));
        refresh("حُذف المنتج " + productEntry.code + " من التعريفات."); return;
      }
      var materialEntry = state.rawMaterials.find(function (item) { return normalizeCode(item.code) === masterCode; });
      if (!materialEntry) { showToast("تعذر العثور على التعريف.", "error"); return; }
      var materialLinked = state.materials.some(function (item) { return normalizeCode(item.materialCode) === masterCode; })
        || state.rawReceipts.some(function (item) { return normalizeCode(item.materialCode) === masterCode; })
        || state.materialMoves.some(function (item) { return normalizeCode(item.materialCode) === masterCode; });
      if (materialLinked) { showToast("لا يمكن حذف المادة " + materialEntry.code + " لارتباطها بسجلات تشغيلية — استخدم «تعديل» وعطّلها بدلًا من الحذف.", "error"); return; }
      if (!window.confirm("حذف المادة " + materialEntry.code + " · " + materialEntry.name + " نهائيًا؟")) return;
      state.rawMaterials = state.rawMaterials.filter(function (item) { return normalizeCode(item.code) !== masterCode; });
      addAudit("حذف تعريف المادة " + materialEntry.code + " · " + materialEntry.name, roleName(state.role));
      refresh("حُذفت المادة " + materialEntry.code + " من التعريفات."); return;
    }
    if (action === "new-agent") { openAgentForm(null); return; }
    if (action === "new-city") { openCityForm(); return; }
    if (action === "open-templates") { openTemplatesDialog(); return; }
    if (action === "edit-agent") { openAgentForm(target.getAttribute("data-code")); return; }
    if (action === "delete-agent") {
      if (state.role !== "admin" && state.role !== "sales") { showToast("تعريف الوكلاء لمسؤول النظام والمبيعات فقط.", "error"); return; }
      var delAgent = agentByCode(target.getAttribute("data-code"));
      if (!delAgent) { showToast("تعذر العثور على التعريف.", "error"); return; }
      if (state.agentOrders.some(function (order) { return normalizeCode(order.agentCode) === normalizeCode(delAgent.code); })) { showToast("لا يمكن حذف الوكيل " + delAgent.code + " لارتباطه بأوردرات — عدّله وأوقفه بدلًا من الحذف.", "error"); return; }
      if (!window.confirm("حذف الوكيل " + delAgent.code + " · " + delAgent.name + " نهائيًا؟")) return;
      state.agents = state.agents.filter(function (item) { return normalizeCode(item.code) !== normalizeCode(delAgent.code); });
      addAudit("حذف الوكيل " + delAgent.code, roleName(state.role));
      refresh("حُذف الوكيل " + delAgent.code + "."); return;
    }
    if (action === "new-agent-order") { openAgentOrderForm(); return; }
    if (action === "build-forecast-from-demand") { openDemandComposer(); return; }
    if (action === "cancel-agent-order") {
      if (state.role !== "sales") { showToast("إلغاء الأوردر للمبيعات فقط.", "error"); return; }
      var cancelOrder = state.agentOrders.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!cancelOrder) { showToast("تعذر العثور على الأوردر.", "error"); return; }
      if (agentOrderDeliveredQty(cancelOrder.id) > 0) { showToast("لا يمكن إلغاء أوردر بدأ تسليمه.", "error"); return; }
      if (!window.confirm("إلغاء أوردر الوكيل " + cancelOrder.id + "؟")) return;
      cancelOrder.status = "cancelled";
      addAudit("إلغاء أوردر الوكيل " + cancelOrder.id, roleName(state.role));
      refresh("أُلغي الأوردر وخرج من الطلب المجمّع."); return;
    }
    if (action === "download-agent-orders-template") { downloadAgentOrdersTemplate(); return; }
    if (action === "packing-bom") {
      if (state.role !== "admin") { showToast("التعريفات لمسؤول النظام فقط.", "error"); return; }
      openPackingBomForm(target.getAttribute("data-code"));
      return;
    }
    if (action === "edit-product") { openMasterEditForm("product", target.getAttribute("data-code")); return; }
    if (action === "edit-raw-material") { openMasterEditForm("material", target.getAttribute("data-code")); return; }
    if (action === "new-forecast") { openForecastForm(); return; }
    if (action === "download-forecast-template") { downloadForecastTemplate(); return; }
    if (action === "download-production-forecast" || action === "download-modified-production-forecast" || action === "download-sales-feedback-forecast" || action === "download-finance-forecast") {
      var reviewForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!reviewForecast) { showToast("تعذر العثور على مستند Forecast.", "error"); return; }
      downloadForecastReviewFile(reviewForecast, action === "download-sales-feedback-forecast" ? "sales" : action === "download-finance-forecast" ? "finance" : "production");
      return;
    }
    if (action === "download-production-review-draft") { downloadProductionReviewDraft(); return; }
    if (action === "download-material-template") { downloadMaterialTemplate(); return; }
    if (action === "download-master-template") { downloadMasterTemplate(target.getAttribute("data-kind"), target.getAttribute("data-category")); return; }
    if (action === "edit-forecast") { openForecastForm(target.getAttribute("data-id")); return; }
    if (action === "finance-edit-forecast") { openForecastForm(target.getAttribute("data-id")); return; }
    if (action === "send-forecast") {
      var sendForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!sendForecast || sendForecast.status !== "draft") { showToast("هذه المسودة لم تعد متاحة للإرسال.", "error"); return; }
      sendForecast.status = "submitted";
      sendForecast.submittedAt = currentTimestamp();
      sendForecast.updatedAt = sendForecast.submittedAt;
      addAudit("إرسال المسودة " + sendForecast.id + " إلى الإنتاج", roleName(state.role));
      refresh("تم إرسال " + sendForecast.id + " إلى الإنتاج. لن يؤدي الحفظ السابق إلى إنشاء سجل إضافي.");
      return;
    }
    if (action === "revoke-fixed-forecast") {
      // خطأ رقمي واحد في مستند مثبت كان يحكم الدورة كلها بلا تعديل ولا إلغاء ولا فك تثبيت.
      var revokeForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!revokeForecast || revokeForecast.status !== "fixed") { showToast("هذا المستند غير مثبت.", "error"); return; }
      if (state.actuals.some(function (item) { return item.forecastId === revokeForecast.id; })) { showToast("سُجّل إنتاج فعلي على هذا المستند؛ لا يُفك تثبيته — سجّل مشكلة بدل ذلك.", "error"); return; }
      if (!window.confirm("فك تثبيت " + revokeForecast.id + "؟ يعود إلى المبيعات للتعديل، وتُلغى خططه الأسبوعية غير المنفَّذة، ويعاد فحص الجاهزية.")) return;
      var revokedPlans = 0;
      state.weeklyPlans = state.weeklyPlans.filter(function (plan) {
        if (plan.forecastId !== revokeForecast.id) return true;
        revokedPlans += 1;
        return false;
      });
      revokeForecast.status = "submitted";
      revokeForecast.fixedAt = "";
      revokeForecast.readinessStale = true;
      revokeForecast.supplyFeasibility = null;
      revokeForecast.updatedAt = currentTimestamp();
      addAudit("فك تثبيت " + revokeForecast.id + " للتصحيح مع إلغاء " + revokedPlans + " خطة أسبوعية غير منفَّذة", roleName(state.role));
      refresh("فُكّ التثبيت؛ المستند عاد إلى فحص الجاهزية" + (revokedPlans ? " وأُلغيت " + revokedPlans + " خطة أسبوعية" : "") + "."); return;
    }

    if (action === "cancel-forecast") {
      var cancelForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!cancelForecast || cancelForecast.status === "cancelled") return;
      if (cancelForecast.status === "fixed") { showToast("لا يمكن إلغاء مستند مثبت؛ سجّل مشكلة لمعالجته.", "error"); return; }
      if (!window.confirm("إلغاء " + cancelForecast.id + "؟ تبقى إصداراته محفوظة في السجل.")) return;
      cancelForecast.status = "cancelled";
      cancelForecast.cancelledAt = currentTimestamp();
      // كانت سجلات الاحتياج تبقى بعد الإلغاء فتنافس المستندات الحيّة على الرصيد وتولّد مهامًا أبدية.
      var orphanIds = state.materials.filter(function (item) { return item.forecastId === cancelForecast.id; }).map(function (item) { return item.id; });
      var releasedCommitments = 0;
      state.commitments.forEach(function (item) {
        if (orphanIds.indexOf(item.materialId) === -1) return;
        if (item.status === "received" || item.status === "cancelled") return;
        item.status = "cancelled";
        item.cancelledAt = currentTimestamp();
        releasedCommitments += 1;
      });
      state.rawReceipts = state.rawReceipts.filter(function (item) {
        var linked = state.commitments.find(function (record) { return record.id === item.commitmentId; });
        return !(linked && orphanIds.indexOf(linked.materialId) !== -1 && item.status === "expected");
      });
      state.materials = state.materials.filter(function (item) { return item.forecastId !== cancelForecast.id; });
      addAudit("إلغاء المستند " + cancelForecast.id + " مع " + orphanIds.length + " سجل احتياج و" + releasedCommitments + " أمر شراء غير مستلم", roleName(state.role));
      refresh("أُلغي المستند وأُزيلت " + orphanIds.length + " من سجلات احتياجه" + (releasedCommitments ? " وأُلغيت " + releasedCommitments + " أوامر شراء غير مستلمة" : "") + "."); return;
    }
    if (action === "undo-receipt") {
      // لم يكن هناك أي مسار لتصحيح استلام خاطئ: رقم مكتوب بالخطأ كان يبقى في الرصيد إلى الأبد.
      var undoReceipt = state.rawReceipts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!undoReceipt || undoReceipt.status !== "received") { showToast("لا يوجد استلام مسجَّل للتراجع عنه.", "error"); return; }
      if (!window.confirm("التراجع عن استلام " + undoReceipt.id + "؟ ستُخصم " + formatNumber(undoReceipt.received) + " من الرصيد ويعود الأوردر إلى حالة التوريد.")) return;
      var undoCommitment = state.commitments.find(function (item) { return item.id === undoReceipt.commitmentId; });
      var undoMaterial = undoCommitment && state.materials.find(function (item) { return item.id === undoCommitment.materialId; });
      if (undoMaterial) {
        undoMaterial.onHand = roundQty(Math.max(0, Number(undoMaterial.onHand || 0) - Number(undoReceipt.received || 0)));
        undoMaterial.inbound = roundQty(Number(undoMaterial.inbound || 0) + Number(undoReceipt.qty || 0));
        syncMaterialStockAcrossPlans(undoMaterial);
      }
      recordMaterialMove("withdraw", { materialCode: undoReceipt.materialCode, material: undoReceipt.material, unit: undoMaterial ? undoMaterial.unit : "" }, Number(undoReceipt.received || 0), monthKeyOf(undoReceipt.receivedDate), "تراجع عن " + undoReceipt.id);
      var undoneQty = Number(undoReceipt.received || 0);
      undoReceipt.received = 0;
      undoReceipt.status = "expected";
      undoReceipt.postedToStock = false;
      undoReceipt.receivedAt = "";
      undoReceipt.receivedDate = "";
      undoReceipt.note = "أُلغي استلام سابق بكمية " + formatNumber(undoneQty);
      if (undoCommitment) { undoCommitment.status = "in_transit"; undoCommitment.receivedAt = ""; }
      addAudit("تراجع عن استلام " + undoReceipt.id + " وإرجاع " + formatNumber(undoneQty) + " من الرصيد", roleName(state.role));
      refresh("تراجعتَ عن الاستلام؛ عاد الأوردر إلى التوريد والرصيد إلى ما كان عليه."); return;
    }

    if (action === "cancel-commitment") {
      var cancelCommitment = state.commitments.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!cancelCommitment) return;
      if (cancelCommitment.status !== "submitted" && cancelCommitment.status !== "confirmed") { showToast("لا يمكن إلغاء أوردر بدأ توريده أو استُلم.", "error"); return; }
      if (!window.confirm("إلغاء أمر الشراء " + cancelCommitment.po + "؟ سيعود النقص للظهور لدى المشتريات.")) return;
      cancelCommitment.status = "cancelled";
      cancelCommitment.cancelledAt = currentTimestamp();
      var cancelMaterial = state.materials.find(function (item) { return item.id === cancelCommitment.materialId; });
      if (cancelMaterial) {
        cancelMaterial.inbound = Math.max(0, Number(cancelMaterial.inbound || 0) - Number(cancelCommitment.qty || 0));
        cancelMaterial.status = !cancelMaterial.stockConfirmed ? "pending" : materialShortage(cancelMaterial) > 0 ? "shortage" : "available";
      }
      state.rawReceipts = state.rawReceipts.filter(function (item) { return !(item.commitmentId === cancelCommitment.id && item.status === "expected"); });
      addAudit("إلغاء أمر الشراء " + cancelCommitment.id + " · " + cancelCommitment.po, roleName(state.role));
      refresh("تم إلغاء الأوردر واسترجاع النقص إلى قائمة الشراء."); return;
    }
    if (action === "new-material") { openMaterialForm(target.getAttribute("data-forecast"), null, target.getAttribute("data-category")); return; }
    if (action === "send-materials-to-warehouse") {
      var dispatchCategory = target.getAttribute("data-category") === "packing" ? "packing" : "raw";
      var dispatch = state.materialDispatches && state.materialDispatches[dispatchCategory];
      if (!dispatch || dispatch.status !== "saved") { showToast("احفظ ملف الاحتياجات أولًا قبل إرساله للمستودع.", "error"); return; }
      dispatch.status = "sent"; dispatch.at = currentTimestamp(); dispatch.by = roleName(state.role);
      addAudit("إرسال احتياجات " + (dispatchCategory === "packing" ? "مواد التغليف" : "المواد الأولية") + " إلى المستودع", roleName(state.role));
      refresh("تم إرسال ملف الاحتياجات إلى " + (dispatchCategory === "packing" ? "مستودع مواد التغليف" : "مستودع المواد الأولية") + ".");
      return;
    }
    if (action === "download-strategic-template") { downloadStrategicTemplate(target.getAttribute("data-category")); return; }
    if (action === "new-commitment") { openCommitmentForm(target.getAttribute("data-material")); return; }
    if (action === "receive-material") { openReceiptForm(target.getAttribute("data-id"), target.getAttribute("data-category")); return; }
    if (action === "new-actual") { openActualForm(); return; }
    if (action === "confirm-fg") { openFgForm(target.getAttribute("data-id")); return; }
    if (action === "confirm-supply") { openSupplyForm(target.getAttribute("data-id")); return; }
    if (action === "finance-po-decision") {
      if (state.role !== "finance") { showToast("موافقة أوامر الشراء لدور المالية فقط.", "error"); return; }
      var poDecisionItem = state.commitments.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!poDecisionItem || poDecisionItem.status === "received" || poDecisionItem.status === "cancelled" || poDecisionItem.status === "in_transit") { showToast("هذا الأوردر لم يعد بانتظار قرار المالية.", "error"); return; }
      var poDecision = target.getAttribute("data-decision") === "approved" ? "approved" : "rejected";
      if (poDecision === "approved" && !(poDecisionItem.quotation && poDecisionItem.quotation.dataUrl)) { showToast("لا موافقة مالية بلا كوتيشن مرفق — اطلب من المشتريات إرفاقه أولًا.", "error"); return; }
      poDecisionItem.financeApproval = { status: poDecision, note: "", at: currentTimestamp() };
      addAudit((poDecision === "approved" ? "موافقة المالية على أمر الشراء " : "رفض المالية لأمر الشراء ") + poDecisionItem.id + " · " + poDecisionItem.po, roleName(state.role));
      refresh(poDecision === "approved" ? "تمت الموافقة؛ يمكن للمشتريات الآن تأكيد الأوردر وبدء التوريد." : "سُجّل الرفض؛ الأوردر لا يتقدم — يمكن للمشتريات إلغاؤه أو انتظار إعادة النظر."); return;
    }
    if (action === "set-strategic") { openStrategicForm(); return; }
    if (action === "new-sale") { openSalesForm(); return; }
    if (action === "new-issue") { openIssueForm(); return; }
    if (action === "view-issue") { openIssueDetails(target.getAttribute("data-id")); return; }

    if (action === "new-weekly-plan") { openWeeklyPlanForm(); return; }
    if (action === "download-weekly-template") { downloadWeeklyTemplate(); return; }
    if (action === "export-report") { exportReport(target.getAttribute("data-report")); return; }
    if (action === "save-languages") {
      if (state.role !== "admin") { showToast("جدول اللغات لمسؤول النظام فقط.", "error"); return; }
      saveLanguageEdits();
      return;
    }
    if (action === "set-password") {
      if (state.role !== "admin") { showToast("إدارة المستخدمين لمسؤول النظام فقط.", "error"); return; }
      openPasswordForm(target.getAttribute("data-id"));
      return;
    }
    if (action === "new-users") {
      if (state.role !== "admin") { showToast("إدارة المستخدمين لمسؤول النظام فقط.", "error"); return; }
      openUserForm();
      return;
    }
    if (action === "toggle-user" || action === "delete-user") {
      if (state.role !== "admin") { showToast("إدارة المستخدمين لمسؤول النظام فقط.", "error"); return; }
      var targetUser = state.users.find(function (user) { return user.id === target.getAttribute("data-id"); });
      if (!targetUser) { showToast("تعذر العثور على المستخدم.", "error"); return; }
      var wouldRemoveActive = targetUser.role === "admin" && targetUser.active !== false;
      if (wouldRemoveActive && activeAdminCount(targetUser.id) === 0) { showToast("لا يمكن حذف أو إيقاف آخر مسؤول نظام فعال.", "error"); return; }
      if (action === "toggle-user") {
        targetUser.active = targetUser.active === false;
        addAudit((targetUser.active ? "تفعيل المستخدم " : "إيقاف ظهور المستخدم ") + targetUser.name, roleName(state.role));
        refresh(targetUser.active ? "أصبح المستخدم فعالًا وظاهرًا في لوحة الدخول." : "أُوقف المستخدم — لن يظهر في لوحة الدخول."); return;
      }
      if (!window.confirm("حذف المستخدم " + targetUser.name + " نهائيًا؟")) return;
      state.users = state.users.filter(function (user) { return user.id !== targetUser.id; });
      if (state.currentUserId === targetUser.id) state.currentUserId = "";
      addAudit("حذف المستخدم " + targetUser.name, roleName(state.role));
      refresh("حُذف المستخدم " + targetUser.name + "."); return;
    }
    if (action === "save-branding") {
      if (state.role !== "admin") { showToast("الهوية لمسؤول النظام فقط.", "error"); return; }
      var brandNameInput = document.getElementById("brand-name-input");
      state.branding.name = brandNameInput && brandNameInput.value.trim() ? brandNameInput.value.trim() : "Ice Star";
      addAudit("تحديث الهوية: " + state.branding.name, roleName(state.role));
      refresh("حُفظت الهوية — الاسم واللون واللوغو مطبقة على الواجهة ولوحة الدخول."); return;
    }
    if (action === "remove-logo") {
      if (state.role !== "admin") { showToast("الهوية لمسؤول النظام فقط.", "error"); return; }
      state.branding.logo = null;
      addAudit("إزالة اللوغو", roleName(state.role));
      refresh("أُزيل اللوغو وعادت الأحرف الافتراضية."); return;
    }
    if (action === "reset-theme") {
      if (state.role !== "admin") { showToast("الهوية لمسؤول النظام فقط.", "error"); return; }
      state.branding.themeColor = "";
      addAudit("استعادة لون الثيم الافتراضي", roleName(state.role));
      refresh("عاد لون الثيم الافتراضي."); return;
    }
    if (action === "export-all-reports") {
      var exportedReports = 0;
      visibleReportKeys().forEach(function (key) {
        var reportDef = buildReport(key);
        if (reportDef && reportDef.rows.length) { exportReport(key); exportedReports += 1; }
      });
      if (!exportedReports) showToast("لا توجد بيانات في أي تقرير حسب الفلاتر الحالية.", "error");
      return;
    }
    if (action === "review-weekly") { openWeeklyReviewForm(); return; }
    if (action === "edit-weekly") { openWeekEditForm(target.getAttribute("data-id")); return; }
    if (action === "plan-days") { openDayForm(target.getAttribute("data-id")); return; }
    if (action === "approve-weekly") {
      var approveWp = state.weeklyPlans.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!approveWp || approveWp.status !== "awaiting_approvals") { showToast("هذه الخطة ليست بانتظار الاعتماد.", "error"); return; }
      var approverKey = state.role === "production" ? "production" : state.role === "fgWarehouse" ? "fgWarehouse" : "";
      if (!approverKey) { showToast("الاعتماد للإنتاج ومخزن المنتج النهائي فقط.", "error"); return; }
      if (planFullyApprovedByRole(approveWp, approverKey)) { showToast("سبق أن اعتمدت كل وحدات هذه الخطة.", "error"); return; }
      var bulkCount = approvePlanUnits(approveWp, approverKey, planUnits(approveWp).map(function (unit) { return unit.key; }));
      addAudit("اعتماد " + roleName(state.role) + " لكل وحدات الخطة " + approveWp.id + " (" + bulkCount + ")", roleName(state.role));
      recomputePlanApproval(approveWp);
      refresh(approveWp.status === "approved" ? "اكتمل الاعتماد؛ الخطة دخلت التنفيذ." : "اعتمدت كل وحداتك؛ بانتظار الطرف الآخر."); return;
    }
    if (action === "approve-units") { openUnitApproveForm(target.getAttribute("data-id")); return; }

    if (action === "forecast-production-review") { openForecastProductionReview(target.getAttribute("data-id")); return; }
    if (action === "review-forecast-feedback") { openForecastFeedbackReview(target.getAttribute("data-id")); return; }
    if (action === "forecast-history") { openForecastHistory(target.getAttribute("data-id")); return; }

    if (action === "accept-production-feedback") {
      var acceptForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!acceptForecast || acceptForecast.status !== "production_feedback") { closeDialog(); showToast("هذا المستند لم يعد بانتظار قرار المبيعات.", "error"); return; }
      // نفس بوابة مسار الإنتاج: قبول المبيعات كان يثبّت المستند متجاوزًا رفض المشتريات للتوريد.
      if (acceptForecast.supplyFeasibility && acceptForecast.supplyFeasibility.confirmed === false) { closeDialog(); showToast("المشتريات أكدت تعذر التوريد؛ لا يمكن التثبيت قبل تعديل الأرقام أو مراجعة قرار التوريد.", "error"); return; }
      var acceptConflicts = conflictingFixedCoverage(acceptForecast);
      if (acceptConflicts.length) { closeDialog(); showToast("تعارض تغطية مع المستند المثبت " + acceptConflicts[0].forecastId + " على " + acceptConflicts[0].productCode + " في " + monthLabel(acceptConflicts[0].month) + ".", "error"); return; }
      acceptForecast.status = "finance_review";
      acceptForecast.financeReviewAt = currentTimestamp();
      addAudit("قبول المبيعات أرقام الإنتاج وإرسال " + acceptForecast.id + " إلى المالية للمراجعة", roleName(state.role));
      closeDialog(); refresh("تم اعتماد أرقام الإنتاج وإرسال Forecast إلى المالية. لا تفتح احتياجات المواد قبل تأكيد المالية والمبيعات."); return;
    }

    if (action === "finance-approve-forecast") {
      var financeForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!financeForecast || financeForecast.status !== "finance_review") { showToast("هذا Forecast ليس بانتظار مراجعة المالية.", "error"); return; }
      financeForecast.status = "finance_sales_confirm";
      financeForecast.financeApprovedAt = currentTimestamp();
      addAudit("اعتماد المالية وإرسال Forecast إلى المبيعات للتأكيد: " + financeForecast.id, roleName(state.role));
      refresh("تم اعتماد Forecast من المالية وإرساله للمبيعات للتأكيد النهائي.");
      return;
    }

    if (action === "accept-finance-forecast") {
      var finalForecast = state.forecasts.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!finalForecast || finalForecast.status !== "finance_sales_confirm") { showToast("هذا Forecast ليس بانتظار تأكيد المبيعات لقرار المالية.", "error"); return; }
      finalForecast.status = "fixed";
      finalForecast.fixedAt = currentTimestamp();
      finalForecast.requirementsPendingAt = finalForecast.fixedAt;
      addAudit("تأكيد المبيعات لقرار المالية وتثبيت " + finalForecast.id, roleName(state.role));
      refresh("تم التثبيت النهائي بعد اعتماد المالية. يستطيع الإنتاج الآن تحضير احتياجات المواد.");
      return;
    }

    if (action === "confirm-stock") { openStockForm(target.getAttribute("data-id"), target.getAttribute("data-category")); return; }
    if (action === "download-warehouse-file") { downloadWarehouseFile(target.getAttribute("data-category")); return; }
    if (action === "warehouse-send" || action === "warehouse-return" || action === "warehouse-confirm" || action === "warehouse-release") {
      var warehouseCategory = target.getAttribute("data-category") === "packing" ? "packing" : "raw";
      var warehouseReview = state.warehouseReviews && state.warehouseReviews[warehouseCategory];
      if (!warehouseReview) { showToast("لا يوجد ملف مخزن في هذه المرحلة.", "error"); return; }
      warehouseReview.status = action === "warehouse-send" ? "sent_production" : action === "warehouse-return" ? "returned_warehouse" : action === "warehouse-confirm" ? "confirmed" : "released_procurement";
      warehouseReview.at = currentTimestamp();
      warehouseReview.by = roleName(state.role);
      addAudit((action === "warehouse-send" ? "أرسل المخزن ملفه للإنتاج" : action === "warehouse-return" ? "أعاد الإنتاج ملف المخزن للتأكيد" : action === "warehouse-confirm" ? "أكد المخزن ملفه" : "حوّل الإنتاج ملف المخزن للمشتريات") + " — " + (warehouseCategory === "packing" ? "مواد التغليف" : "المواد الأولية"), roleName(state.role));
      refresh(action === "warehouse-send" ? "تم إرسال ملف المخزن إلى الإنتاج." : action === "warehouse-return" ? "أعاد الإنتاج الملف للمخزن للتأكيد." : action === "warehouse-confirm" ? "تم تأكيد الملف؛ يستطيع الإنتاج تحويله للمشتريات." : "تم تحويل الملف للمشتريات.");
      return;
    }
    if (action === "new-waste") { openWasteForm(); return; }

    if (action === "advance-commitment") {
      var commitment = state.commitments.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!commitment) return;
      if (!commitment.financeApproval || commitment.financeApproval.status !== "approved") { showToast("قرار الشراء لا يعبر قبل موافقة المالية — لا تجاوز.", "error"); return; }
      if (commitment.status === "received") { showToast("اكتمل استلام هذا الأوردر.", "error"); return; }
      if (commitment.status !== "submitted" && commitment.status !== "confirmed") { showToast("الأوردر بانتظار استلام مخزن المواد.", "error"); return; }
      // نقرة واحدة: تأكيد PO وبدء التوريد معًا.
      commitment.status = "in_transit";
      commitment.poConfirmedAt = commitment.poConfirmedAt || currentTimestamp();
      commitment.inTransitAt = currentTimestamp();
      addAudit("تأكيد " + commitment.id + " وتحويله إلى In Transit", roleName(state.role));
      refresh("تم تأكيد الأوردر وبدء التوريد؛ أصبح جاهزًا لاستلام المخزن."); return;
    }

    if (action === "close-issue") { openIssueCloseForm(target.getAttribute("data-id")); return; }

    if (action === "reopen-issue") {
      // إغلاق بالخطأ كان بلا رجعة: لا إجراء لإعادة الفتح إطلاقًا.
      var reopenIssue = state.issues.find(function (item) { return item.id === target.getAttribute("data-id"); });
      if (!reopenIssue || !issueVisibleToRole(reopenIssue)) { showToast("تعذر العثور على القضية.", "error"); return; }
      if (reopenIssue.status !== "closed") { showToast("هذه القضية مفتوحة أصلًا.", "error"); return; }
      reopenIssue.status = "open";
      reopenIssue.closedAt = "";
      reopenIssue.closedBy = "";
      reopenIssue.evidence = "أُعيد فتحها بواسطة " + roleName(state.role) + " — التحقق السابق لم يُعتمد";
      addAudit("إعادة فتح القضية " + reopenIssue.id, roleName(state.role));
      refresh("أُعيدت القضية إلى الحالة المفتوحة."); return;
    }

    if (action === "toggle-permission") {
      var role = target.getAttribute("data-role");
      var pageKey = target.getAttribute("data-page-key");
      // كان الدور والصفحة يُقرآن من الصفحة بلا قائمة بيضاء، فأمكن سحب لوحة التحكم من الأدمن نهائيًا.
      if (!roles[role] || role === "admin") { showToast("لا تُعدَّل صلاحيات مسؤول النظام.", "error"); return; }
      if (!Object.prototype.hasOwnProperty.call(pageLabels, pageKey)) { showToast("صفحة غير معروفة.", "error"); return; }
      if (pageProtectedForRole(role, pageKey)) { showToast("هذه قاعدة عمل محمية ولا يمكن منحها لهذا الدور.", "error"); return; }
      var current = state.permissions[role] || ["home"];
      var pIndex = current.indexOf(pageKey);
      if (pIndex === -1) current.push(pageKey); else current.splice(pIndex, 1);
      state.permissions[role] = current;
      addAudit((pIndex === -1 ? "منح " : "سحب ") + pageLabels[pageKey] + " لدور " + roleName(role), roleName(state.role));
      refresh(pIndex === -1 ? "تم منح الصلاحية." : "تم سحب الصلاحية.");
    }

    if (action === "toggle-dashboard-widget" || action === "show-all-dashboard-widgets") {
      var dashboardUserId = target.getAttribute("data-user-id");
      var dashboardUser = (state.users || []).find(function (user) { return user.id === dashboardUserId; });
      if (!dashboardUser) { showToast("تعذر العثور على حساب المستخدم.", "error"); return; }
      var dashboardKind = target.getAttribute("data-dashboard-kind") === "home" ? "home" : "executive";
      var dashboardDefinitions = dashboardKind === "home" ? (HOME_DASHBOARD_WIDGETS[dashboardUser.role] || []) : EXEC_WIDGETS;
      var dashboardSettings = dashboardKind === "home" ? homeDashboardWidgetsForUser(dashboardUser) : dashboardWidgetsForUser(dashboardUser);
      var dashboardTitle = dashboardKind === "home" ? "لوحة العمل الرئيسية" : "داشبورد الإدارة";
      if (action === "show-all-dashboard-widgets") {
        if (dashboardKind === "home") dashboardUser.homeDashboardWidgets = {}; else dashboardUser.dashboardWidgets = {};
        addAudit("إظهار كل أقسام " + dashboardTitle + " لحساب " + dashboardUser.name, roleName(state.role));
        refresh("أُظهرت كل أقسام " + dashboardTitle + " لهذا الحساب.");
        return;
      }
      var dashboardWidgetKey = target.getAttribute("data-widget");
      var dashboardWidget = dashboardDefinitions.find(function (widget) { return widget.key === dashboardWidgetKey; });
      if (!dashboardWidget) { showToast("قسم داشبورد غير معروف.", "error"); return; }
      var wasVisible = dashboardSettings[dashboardWidgetKey] !== false;
      if (wasVisible) dashboardSettings[dashboardWidgetKey] = false;
      else delete dashboardSettings[dashboardWidgetKey];
      if (dashboardKind === "home") dashboardUser.homeDashboardWidgets = dashboardSettings; else dashboardUser.dashboardWidgets = dashboardSettings;
      addAudit((wasVisible ? "إخفاء " : "إظهار ") + dashboardWidget.label + " في " + dashboardTitle + " لحساب " + dashboardUser.name, roleName(state.role));
      refresh(wasVisible ? "تم إخفاء القسم لهذا الحساب." : "تم إظهار القسم لهذا الحساب.");
    }
  });

  // تلميح عائم للمخططات: أي عنصر يحمل data-tip يعرض تلميحًا يتبع المؤشر.
  var chartTip = null;
  function ensureChartTip() {
    if (!chartTip) {
      chartTip = document.createElement("div");
      chartTip.className = "chart-tooltip";
      chartTip.setAttribute("aria-hidden", "true");
      document.body.appendChild(chartTip);
    }
    return chartTip;
  }
  document.addEventListener("mousemove", function (event) {
    var tipTarget = event.target && event.target.closest ? event.target.closest("[data-tip]") : null;
    var tip = ensureChartTip();
    if (!tipTarget) { tip.style.display = "none"; return; }
    tip.textContent = tipTarget.getAttribute("data-tip");
    tip.style.display = "block";
    var x = event.clientX, y = event.clientY;
    tip.style.left = Math.max(8, Math.min(x + 14, (window.innerWidth || 1200) - 220)) + "px";
    tip.style.top = Math.max(8, y - 38) + "px";
  });

  document.getElementById("app-dialog").addEventListener("click", function (event) {
    if (event.target === this) attemptCloseDialog();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") attemptCloseDialog();
  });

  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", function (event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      // أي نافذة مفتوحة تعمل على حالة استُبدلت تحتها: تُغلق قبل الرسم بدل أن تُحفظ بأرقام بائتة.
      syncStateFromStorage();
      if (document.getElementById("app-dialog").open) { closeDialog(); showToast("حُدّثت البيانات من نافذة أخرى؛ أُغلقت النافذة المفتوحة لتعمل على الأرقام الجديدة.", "error"); }
      if (!sessionStillValid()) { endInvalidSession(); return; }
      if (state.loggedIn) renderApp(); else renderLogin();
    });
  }

  if (state.loggedIn) renderApp(); else renderLogin();
})();
