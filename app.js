const SUPABASE_URL = "https://crigkewtzvslkpmsufxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaWdrZXd0enZzbGtwbXN1ZnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MDc5OTQsImV4cCI6MjA5Mzk4Mzk5NH0.G13M84Qz7mjLXuCtdCHe07BpP7feeBwVD4c2K4czot4";

/* =========================================================
   MPR Smart Maintenance | PM Planner Pro V2
   - PM Dashboard
   - Manual PM Plan
   - Technician Friendly Checklist
   - PM Calendar
   - PM History
   - AI PM Suggestion
   - Auto AI วิเคราะห์ตอนเปิดเว็บ + Refresh
========================================================= */


const state = {
  sb: null,

  machines: [],
  areaPoints: [],
  technicians: [],

  plans: [],
  histories: [],

  repairLogs: [],
  aiPmSuggestions: [],

  currentPlan: null,
  currentChecklist: [],

  calendarDate: new Date(),

  autoAiTimer: null,
  autoAiReady: false
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

/* =========================================================
   INIT
========================================================= */

async function init() {
  cacheElements();
  bindEvents();
  setupDefaultDates();
  refreshIcons();

  if (!validateSupabaseConfig()) {
    setStatus("ยังไม่ได้ตั้งค่า Supabase", "error");
    toast("กรุณาใส่ SUPABASE_URL และ SUPABASE_ANON_KEY ใน pm-planner.js", "error");
    return;
  }

  state.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  await loadAllData();
  await autoRunAiPmGenerator();

  startAutoAiLoop();
}

function cacheElements() {
  Object.assign(els, {
    statusDot: document.getElementById("statusDot"),
    systemStatus: document.getElementById("systemStatus"),
    refreshBtn: document.getElementById("refreshBtn"),

mobileMenuBtn: document.getElementById("mobileMenuBtn"),
mobileMenuText: document.getElementById("mobileMenuText"),
tabShell: document.getElementById("tabShell"),

    tabs: document.querySelectorAll(".tab-btn"),
    panels: document.querySelectorAll(".tab-panel"),

    kpiTotal: document.getElementById("kpiTotal"),
    kpiPending: document.getElementById("kpiPending"),
    kpiCompleted: document.getElementById("kpiCompleted"),
    kpiOverdue: document.getElementById("kpiOverdue"),
    kpiCompletionRate: document.getElementById("kpiCompletionRate"),
    kpiNgFound: document.getElementById("kpiNgFound"),
    kpiFollowUp: document.getElementById("kpiFollowUp"),
    kpiAiSuggested: document.getElementById("kpiAiSuggested"),

    urgentPmList: document.getElementById("urgentPmList"),
    machineSummaryList: document.getElementById("machineSummaryList"),

    pmPlanForm: document.getElementById("pmPlanForm"),
    machineName: document.getElementById("machineName"),
    machineNo: document.getElementById("machineNo"),
    productionLine: document.getElementById("productionLine"),
    areaPoint: document.getElementById("areaPoint"),
    pmTitle: document.getElementById("pmTitle"),
    pmObjective: document.getElementById("pmObjective"),
    pmDetail: document.getElementById("pmDetail"),
    pmType: document.getElementById("pmType"),
    frequency: document.getElementById("frequency"),
    intervalMonths: document.getElementById("intervalMonths"),
    priority: document.getElementById("priority"),
    plannedDate: document.getElementById("plannedDate"),
    nextDueDateManual: document.getElementById("nextDueDateManual"),
    assignedToName: document.getElementById("assignedToName"),
    estimatedTime: document.getElementById("estimatedTime"),
    sourceType: document.getElementById("sourceType"),
    checklistText: document.getElementById("checklistText"),
    resetPlanBtn: document.getElementById("resetPlanBtn"),

    planSearch: document.getElementById("planSearch"),
    checklistSearch: document.getElementById("checklistSearch"),
    historySearch: document.getElementById("historySearch"),

    historyFromDate: document.getElementById("historyFromDate"),
    historyToDate: document.getElementById("historyToDate"),
    historyResultFilter: document.getElementById("historyResultFilter"),

    planTableBody: document.getElementById("planTableBody"),
    checklistPlanList: document.getElementById("checklistPlanList"),
    historyTableBody: document.getElementById("historyTableBody"),

    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    calendarTitle: document.getElementById("calendarTitle"),
    pmCalendar: document.getElementById("pmCalendar"),

    aiFromDate: document.getElementById("aiFromDate"),
    aiToDate: document.getElementById("aiToDate"),
    targetMttr: document.getElementById("targetMttr"),
    targetMtbf: document.getElementById("targetMtbf"),
    plannedHoursPerDay: document.getElementById("plannedHoursPerDay"),
    minPmScore: document.getElementById("minPmScore"),
    analyzeAiPmBtn: document.getElementById("analyzeAiPmBtn"),
    convertAllAiPmBtn: document.getElementById("convertAllAiPmBtn"),

    aiCriticalCount: document.getElementById("aiCriticalCount"),
    aiHighCount: document.getElementById("aiHighCount"),
    aiSuggestedCount: document.getElementById("aiSuggestedCount"),
    aiAvgInterval: document.getElementById("aiAvgInterval"),
    aiPmSuggestionList: document.getElementById("aiPmSuggestionList"),

    pmModal: document.getElementById("pmModal"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelExecuteBtn: document.getElementById("cancelExecuteBtn"),
    pmExecuteForm: document.getElementById("pmExecuteForm"),

    modalTitle: document.getElementById("modalTitle"),
    modalSubtitle: document.getElementById("modalSubtitle"),
    executeObjectiveBox: document.getElementById("executeObjectiveBox"),
    executeObjectiveText: document.getElementById("executeObjectiveText"),
    executeChecklistList: document.getElementById("executeChecklistList"),

    actualDate: document.getElementById("actualDate"),
    technicianCode: document.getElementById("technicianCode"),
    technicianName: document.getElementById("technicianName"),
    startTime: document.getElementById("startTime"),
    endTime: document.getElementById("endTime"),
    pmResult: document.getElementById("pmResult"),
    finding: document.getElementById("finding"),
    actionTaken: document.getElementById("actionTaken"),
    abnormalDetail: document.getElementById("abnormalDetail"),
    followUpRequired: document.getElementById("followUpRequired"),
    followUpDetail: document.getElementById("followUpDetail"),
    nextDueDate: document.getElementById("nextDueDate"),

    beforeImages: document.getElementById("beforeImages"),
    afterImages: document.getElementById("afterImages"),
    abnormalImages: document.getElementById("abnormalImages"),

    toast: document.getElementById("toast")
  });
}

function bindEvents() {
  els.refreshBtn.addEventListener("click", async () => {
    await loadAllData();
    await autoRunAiPmGenerator();
    toast("Refresh และวิเคราะห์ AI ใหม่แล้ว", "success");
  });
els.technicianCode.addEventListener("input", debounce(handleTechnicianCodeInput, 350));
els.technicianCode.addEventListener("blur", handleTechnicianCodeInput);

if (els.mobileMenuBtn) {
  els.mobileMenuBtn.addEventListener("click", () => {
    els.tabShell.classList.toggle("open");
  });
}

  els.tabs.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  els.machineName.addEventListener("change", handleMachineNameChange);
  els.machineNo.addEventListener("change", handleMachineNoChange);

  els.frequency.addEventListener("change", updateManualNextDueDate);
  els.intervalMonths.addEventListener("change", updateManualNextDueDate);
  els.plannedDate.addEventListener("change", updateManualNextDueDate);

  els.pmPlanForm.addEventListener("submit", createPmPlan);

  els.resetPlanBtn.addEventListener("click", () => {
    els.pmPlanForm.reset();
    setupDefaultDates();
    populateMachineNames();
  });

  els.planSearch.addEventListener("input", renderPlans);
  els.checklistSearch.addEventListener("input", renderChecklistPlans);
  els.historySearch.addEventListener("input", renderHistory);
  els.historyFromDate.addEventListener("change", renderHistory);
  els.historyToDate.addEventListener("change", renderHistory);
  els.historyResultFilter.addEventListener("change", renderHistory);

  els.prevMonthBtn.addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar();
  });

  els.nextMonthBtn.addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  els.analyzeAiPmBtn.addEventListener("click", analyzeAiPmGenerator);
  els.convertAllAiPmBtn.addEventListener("click", convertAllAiPmToPlans);

  els.closeModalBtn.addEventListener("click", closePmModal);
  els.cancelExecuteBtn.addEventListener("click", closePmModal);
  els.modalBackdrop.addEventListener("click", closePmModal);
  els.pmExecuteForm.addEventListener("submit", submitPmExecution);
}

function validateSupabaseConfig() {
  const invalidUrl =
    !SUPABASE_URL ||
    SUPABASE_URL.includes("ใส่_") ||
    !SUPABASE_URL.startsWith("https://") ||
    !SUPABASE_URL.includes(".supabase.co");

  const invalidKey =
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.includes("ใส่_") ||
    SUPABASE_ANON_KEY.length < 50;

  return !(invalidUrl || invalidKey);
}

function setupDefaultDates() {
  const today = new Date();

  if (els.plannedDate) els.plannedDate.value = toDateInput(today);
  if (els.actualDate) els.actualDate.value = toDateInput(today);

  const aiFrom = new Date();
  aiFrom.setDate(today.getDate() - 90);

  if (els.aiFromDate) els.aiFromDate.value = toDateInput(aiFrom);
  if (els.aiToDate) els.aiToDate.value = toDateInput(today);

  const historyFrom = new Date();
  historyFrom.setDate(today.getDate() - 90);

  if (els.historyFromDate) els.historyFromDate.value = toDateInput(historyFrom);
  if (els.historyToDate) els.historyToDate.value = toDateInput(today);

  updateManualNextDueDate();
}

function updateManualNextDueDate() {
  if (!els.plannedDate?.value) return;

  els.nextDueDateManual.value = calculateNextDueDate(
    els.plannedDate.value,
    els.frequency.value,
    Number(els.intervalMonths.value || 1)
  ) || "";
}

/* =========================================================
   DATA LOADING
========================================================= */

async function loadAllData() {
  try {
    setStatus("กำลังโหลดข้อมูล...", "warning");

    await Promise.all([
      loadMasters(),
      loadPlans(),
      loadHistory()
    ]);

    updateOverdueViewOnly();
    renderAll();

    setStatus("พร้อมใช้งาน", "success");
  } catch (err) {
    console.error("PM Load Error:", err);
    setStatus("โหลดข้อมูลไม่สำเร็จ", "error");
    toast(`โหลดข้อมูลไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
}

async function loadMasters() {
  const [machinesRes, areaRes, techRes] = await Promise.all([
    state.sb.from("machines").select("*").eq("is_active", true).order("machine_name"),
    state.sb.from("area_points").select("*").eq("is_active", true).order("point_name"),
    state.sb.from("technicians").select("*").eq("is_active", true).order("employee_code")
  ]);

  if (machinesRes.error) throw machinesRes.error;
  if (areaRes.error) throw areaRes.error;

  if (techRes.error) {
    console.warn("Technicians load skipped:", techRes.error);
  }

  state.machines = machinesRes.data || [];
  state.areaPoints = areaRes.data || [];
  state.technicians = techRes.data || [];

  populateMachineNames();
}

async function loadPlans() {
  let res = await state.sb
    .from("pm_plans_with_checklist")
    .select("*")
    .order("planned_date", { ascending: true });

  if (res.error) {
    console.warn("View pm_plans_with_checklist failed. Fallback pm_plans:", res.error);

    res = await state.sb
      .from("pm_plans")
      .select("*")
      .order("planned_date", { ascending: true });
  }

  if (res.error) throw res.error;

  state.plans = res.data || [];
}

async function loadHistory() {
  const res = await state.sb
    .from("pm_history")
    .select("*")
    .order("actual_date", { ascending: false })
    .limit(500);

  if (res.error) throw res.error;

  state.histories = res.data || [];
}

/* =========================================================
   MASTER DROPDOWN
========================================================= */

function populateMachineNames() {
  const names = [...new Set(state.machines.map(m => clean(m.machine_name)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "th"));

  els.machineName.innerHTML =
    `<option value="">-- เลือกเครื่องจักร --</option>` +
    names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  els.machineNo.innerHTML = `<option value="">-- เลือกหมายเลข --</option>`;
  els.areaPoint.innerHTML = `<option value="">-- เลือกจุด PM --</option>`;
}

function handleMachineNameChange() {
  const name = els.machineName.value;

  const machineNos = state.machines
    .filter(m => clean(m.machine_name) === name)
    .map(m => clean(m.machine_no))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "th"));

  els.machineNo.innerHTML =
    `<option value="">-- เลือกหมายเลข --</option>` +
    machineNos.map(no => `<option value="${escapeHtml(no)}">${escapeHtml(no)}</option>`).join("");

  els.productionLine.value = "";
  els.areaPoint.innerHTML = `<option value="">-- เลือกจุด PM --</option>`;
}

function handleMachineNoChange() {
  const machine = getSelectedMachine();

  els.productionLine.value = machine?.production_line || "";

  const points = machine
    ? state.areaPoints.filter(p => p.machine_id === machine.id)
    : [];

  const pointOptions = points.length ? points : state.areaPoints;

  els.areaPoint.innerHTML =
    `<option value="">-- เลือกจุด PM --</option>` +
    pointOptions.map(p => `
      <option value="${escapeHtml(p.point_name)}" data-id="${p.id}">
        ${escapeHtml(p.point_name)}
      </option>
    `).join("");
}

function getSelectedMachine() {
  return state.machines.find(m =>
    clean(m.machine_name) === els.machineName.value &&
    clean(m.machine_no) === els.machineNo.value
  );
}

function getSelectedAreaPoint() {
  const selected = els.areaPoint.options[els.areaPoint.selectedIndex];
  const id = selected?.dataset?.id;

  if (!id) return null;

  return state.areaPoints.find(p => p.id === id) || null;
}

/* =========================================================
   CREATE PM PLAN
========================================================= */

async function createPmPlan(event) {
  event.preventDefault();

  try {
    const checklistLines = els.checklistText.value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    if (!checklistLines.length) {
      toast("กรุณากรอก Checklist อย่างน้อย 1 รายการ", "warning");
      return;
    }

    const machine = getSelectedMachine();
    const point = getSelectedAreaPoint();
    const pmNo = await generatePmNo();
    const intervalMonths = Number(els.intervalMonths.value || 1);

    const objective = clean(els.pmObjective.value);
    const detail = clean(els.pmDetail.value);

    const combinedDetail = buildCombinedPmDetail(objective, detail);

    const planPayload = {
      pm_no: pmNo,

      machine_id: machine?.id || null,
      machine_name: els.machineName.value,
      machine_no: els.machineNo.value,
      production_line: els.productionLine.value || null,

      area_point_id: point?.id || null,
      area_point_name: els.areaPoint.value,

      pm_title: els.pmTitle.value.trim(),
      pm_detail: combinedDetail,

      pm_type: els.pmType.value,
      frequency: els.frequency.value,
      interval_months: intervalMonths,
      priority: els.priority.value,

      planned_date: els.plannedDate.value,
      next_due_date: calculateNextDueDate(els.plannedDate.value, els.frequency.value, intervalMonths),

      assigned_to_name: els.assignedToName.value.trim() || null,
      estimated_time_min: Number(els.estimatedTime.value || 0),

      source_type: els.sourceType.value,
      status: "Pending",
      created_by: "PM Planner Pro V2"
    };

    setStatus("กำลังบันทึกแผน PM...", "warning");

    const planRes = await state.sb
      .from("pm_plans")
      .insert(planPayload)
      .select()
      .single();

    if (planRes.error) throw planRes.error;

    const checklistPayload = checklistLines.map((line, index) => ({
      pm_plan_id: planRes.data.id,
      item_no: index + 1,
      check_title: normalizeManualChecklist(line, els.areaPoint.value),
      check_detail: null,
      standard_value: null,
      method: null,
      tool_required: null,
      is_required: true,
      sort_order: index + 1
    }));

    const checklistRes = await state.sb
      .from("pm_checklist_items")
      .insert(checklistPayload);

    if (checklistRes.error) throw checklistRes.error;

    els.pmPlanForm.reset();
    setupDefaultDates();
    populateMachineNames();

    await loadAllData();
    await autoRunAiPmGenerator();

    switchTab("planTab");
    toast(`สร้างแผน PM สำเร็จ: ${pmNo}`, "success");
  } catch (err) {
    console.error("Create PM Plan Error:", err);
    setStatus("บันทึกไม่สำเร็จ", "error");
    toast(`บันทึกแผน PM ไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
}

async function generatePmNo() {
  try {
    const res = await state.sb.rpc("generate_pm_no");

    if (!res.error && res.data) return res.data;
  } catch (err) {
    console.warn("RPC generate_pm_no fallback:", err);
  }

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const stamp =
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `PM-${ym}-${stamp}`;
}

function buildCombinedPmDetail(objective, detail) {
  const parts = [];

  if (objective) {
    parts.push(`[PM_OBJECTIVE] ${objective}`);
  }

  if (detail) {
    parts.push(`[PM_DETAIL] ${detail}`);
  }

  return parts.join("\n\n") || null;
}

function extractPmObjective(pmDetail) {
  const text = String(pmDetail || "");

  const match = text.match(/\[PM_OBJECTIVE\]\s*([\s\S]*?)(\n\n\[PM_DETAIL\]|\n\n|$)/);

  if (match?.[1]) return clean(match[1]);

  return "";
}

function extractPmDetailOnly(pmDetail) {
  const text = String(pmDetail || "");

  const match = text.match(/\[PM_DETAIL\]\s*([\s\S]*)/);

  if (match?.[1]) return clean(match[1]);

  return text.replace(/\[PM_OBJECTIVE\][^\n]*/g, "").trim();
}

function normalizeManualChecklist(line, areaPoint) {
  if (line.includes("||")) return line;

  const lower = line.toLowerCase();

  if (includesAny(lower, ["ลม", "clamp", "กระบอก", "fitting", "speed", "solenoid"])) {
    return makeTechChecklist({
      title: line,
      method: `ตรวจบริเวณ ${areaPoint || "จุดที่กำหนด"} โดยฟังเสียงรั่ว ใช้น้ำสบู่ และทดลองทำงาน Manual/Jog`,
      ok: "ไม่มีลมรั่ว ทำงานครบจังหวะ ไม่ค้าง ไม่สะดุด",
      ng: "มีลมรั่ว ทำงานไม่สุด Stroke ค้าง หรือทำงานช้าผิดปกติ",
      action: "ระบุจุดที่พบ เปลี่ยนสายลม/Fitting/ข้อต่อ หรือแจ้ง Follow-up พร้อมแนบรูป"
    });
  }

  if (includesAny(lower, ["sensor", "เซนเซอร์", "alarm", "limit", "photo"])) {
    return makeTechChecklist({
      title: line,
      method: "ทดลองให้ Sensor จับ/ไม่จับ ดูไฟ Indicator และจังหวะสัญญาณขณะเครื่องทำงาน",
      ok: "ไฟ Sensor ติด/ดับตรงจังหวะ เครื่องไม่ Alarm",
      ng: "Sensor ไม่ติด ติดค้าง ระยะจับเพี้ยน หรือเกิด Alarm ซ้ำ",
      action: "ทำความสะอาด ปรับระยะ ตรวจสาย/Connector และบันทึกจุดผิดปกติ"
    });
  }

  if (includesAny(lower, ["heater", "ฮีต", "ฮีท", "temp", "อุณหภูมิ"])) {
    return makeTechChecklist({
      title: line,
      method: "ตรวจสภาพ Heater, สายไฟ, Terminal และทดลองดูค่าอุณหภูมิจริงเทียบกับ Set Point",
      ok: "ไม่มีรอยไหม้ ขั้วต่อแน่น อุณหภูมิขึ้นปกติ",
      ng: "Heater แตก สายไหม้ Terminal หลวม หรือ Temp ไม่ขึ้น",
      action: "ระบุ Zone/ตำแหน่ง แจ้งเปลี่ยนอะไหล่ และแนบรูป"
    });
  }

  if (includesAny(lower, ["น้ำ", "chiller", "strainer", "filter", "ตะกรัน"])) {
    return makeTechChecklist({
      title: line,
      method: "ตรวจการไหลของน้ำ Hose/Fitting และถอดดู Y-Strainer หรือ Filter",
      ok: "น้ำไหลปกติ ไม่มีรั่ว ไม่มีตะกรันอุดตัน",
      ng: "น้ำไหลอ่อน น้ำรั่ว Y-Strainer ตัน หรือมีคราบตะกรันมาก",
      action: "ล้างหรือเปลี่ยนอะไหล่ ถ่ายรูปก่อน-หลัง และบันทึกผล"
    });
  }

  if (includesAny(lower, ["bearing", "roller", "ราง", "slide", "guide", "หล่อลื่น", "ติดขัด", "ฝืด"])) {
    return makeTechChecklist({
      title: line,
      method: "กด Manual/Jog ตรวจการเคลื่อนที่ ดูเสียงดัง ความฝืด และจุดหลวม",
      ok: "เคลื่อนที่ลื่น ไม่ฝืด ไม่สะดุด ไม่มีเสียงดัง",
      ng: "ฝืด สะดุด มีเสียงดัง หลวม หรือไม่กลับตำแหน่ง",
      action: "ทำความสะอาด หล่อลื่น ขันแน่น และแจ้ง Follow-up ถ้ายังผิดปกติ"
    });
  }

  return makeTechChecklist({
    title: line,
    method: "ตรวจตามสภาพหน้างาน ทดลองการทำงานจริง และสังเกตอาการผิดปกติ",
    ok: "ทำงานปกติ ไม่มีเสียงผิดปกติ ไม่รั่ว ไม่ค้าง และไม่มี Alarm",
    ng: "พบเสียงดัง รั่ว หลวม ติดขัด ไม่ทำงาน หรือ Alarm",
    action: "ระบุจุดที่พบ บันทึกหมายเหตุ แนบรูป และเลือก Need Follow-up หากยังไม่จบ"
  });
}

/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
  renderDashboard();
  renderPlans();
  renderChecklistPlans();
  renderHistory();
  renderCalendar();
  renderAiPmSuggestions();
  refreshIcons();
}

function renderDashboard() {
  const total = state.plans.length;
  const completed = state.plans.filter(p => p.status === "Completed").length;
  const pending = state.plans.filter(p => ["Pending", "In Progress"].includes(p.status)).length;
  const overdue = state.plans.filter(p => getEffectiveStatus(p) === "Overdue").length;

  const rate = total ? Math.round((completed / total) * 100) : 0;

  const ngFound = state.histories.filter(h =>
    ["Abnormal Found", "Need Spare Part", "Need Follow-up", "Temporary Fixed"].includes(h.result)
  ).length;

  const followUp = state.histories.filter(h => h.follow_up_required).length;

  els.kpiTotal.textContent = formatNumber(total);
  els.kpiPending.textContent = formatNumber(pending);
  els.kpiCompleted.textContent = formatNumber(completed);
  els.kpiOverdue.textContent = formatNumber(overdue);
  els.kpiCompletionRate.textContent = `${rate}%`;
  els.kpiNgFound.textContent = formatNumber(ngFound);
  els.kpiFollowUp.textContent = formatNumber(followUp);
  els.kpiAiSuggested.textContent = formatNumber(state.aiPmSuggestions.length);

  renderUrgentPm();
  renderMachineSummary();
}

function renderUrgentPm() {
  const urgent = [...state.plans]
    .filter(p => !["Completed", "Cancelled"].includes(p.status))
    .sort((a, b) => {
      const sa = priorityScore(a.priority) + (getEffectiveStatus(a) === "Overdue" ? 100 : 0);
      const sb = priorityScore(b.priority) + (getEffectiveStatus(b) === "Overdue" ? 100 : 0);

      if (sb !== sa) return sb - sa;

      return new Date(a.planned_date) - new Date(b.planned_date);
    })
    .slice(0, 8);

  if (!urgent.length) {
    els.urgentPmList.innerHTML = `<div class="empty">ไม่มี PM เร่งด่วน</div>`;
    return;
  }

  els.urgentPmList.innerHTML = urgent.map(plan => `
    <div class="summary-card">
      <h3>${escapeHtml(plan.machine_name)} | ${escapeHtml(plan.machine_no)}</h3>
      <p>${escapeHtml(plan.pm_title)}</p>
      <div class="pm-meta">
        ${statusBadge(getEffectiveStatus(plan))}
        ${priorityBadge(plan.priority)}
        <span class="badge Medium">${formatDate(plan.planned_date)}</span>
        <span class="badge Completed">ทุก ${formatNumber(plan.interval_months || 1)} เดือน</span>
      </div>
    </div>
  `).join("");
}

function renderMachineSummary() {
  const grouped = {};

  state.plans.forEach(plan => {
    const key = `${plan.machine_name}|${plan.machine_no}`;

    if (!grouped[key]) {
      grouped[key] = {
        machine_name: plan.machine_name,
        machine_no: plan.machine_no,
        total: 0,
        completed: 0,
        overdue: 0,
        critical: 0
      };
    }

    grouped[key].total += 1;
    if (plan.status === "Completed") grouped[key].completed += 1;
    if (getEffectiveStatus(plan) === "Overdue") grouped[key].overdue += 1;
    if (plan.priority === "Critical") grouped[key].critical += 1;
  });

  const data = Object.values(grouped)
    .sort((a, b) => {
      if (b.overdue !== a.overdue) return b.overdue - a.overdue;
      return b.total - a.total;
    })
    .slice(0, 8);

  if (!data.length) {
    els.machineSummaryList.innerHTML = `<div class="empty">ยังไม่มีข้อมูล PM</div>`;
    return;
  }

  els.machineSummaryList.innerHTML = data.map(item => {
    const rate = item.total ? Math.round((item.completed / item.total) * 100) : 0;

    return `
      <div class="summary-card">
        <h3>${escapeHtml(item.machine_name)} | ${escapeHtml(item.machine_no)}</h3>
        <p>PM ทั้งหมด ${item.total} รายการ / เสร็จแล้ว ${item.completed} / เลยกำหนด ${item.overdue}</p>
        <div class="pm-meta">
          <span class="badge Completed">Completion ${rate}%</span>
          ${item.overdue ? `<span class="badge Overdue">Overdue ${item.overdue}</span>` : ""}
          ${item.critical ? `<span class="badge Critical">Critical ${item.critical}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

/* =========================================================
   RENDER PLANS
========================================================= */

function renderPlans() {
  const keyword = clean(els.planSearch.value).toLowerCase();

  const data = state.plans.filter(plan => {
    const text = [
      plan.pm_no,
      plan.machine_name,
      plan.machine_no,
      plan.area_point_name,
      plan.pm_title,
      plan.priority,
      plan.status,
      plan.source_type
    ].join(" ").toLowerCase();

    return !keyword || text.includes(keyword);
  });

  if (!data.length) {
    els.planTableBody.innerHTML = `<tr><td colspan="10" class="empty">ไม่พบข้อมูลแผน PM</td></tr>`;
    return;
  }

  els.planTableBody.innerHTML = data.map(plan => `
    <tr>
      <td>
        <strong>${escapeHtml(plan.pm_no)}</strong><br>
        <small>${escapeHtml(plan.source_type || "-")}</small>
      </td>

      <td>
        <strong>${escapeHtml(plan.machine_name)}</strong><br>
        <small>${escapeHtml(plan.machine_no)}</small>
      </td>

      <td>${escapeHtml(plan.area_point_name)}</td>

      <td>
        <strong>${escapeHtml(plan.pm_title)}</strong><br>
        <small>${escapeHtml(plan.frequency)} / ${escapeHtml(plan.pm_type)}</small>
      </td>

      <td>
        ${formatDate(plan.planned_date)}<br>
        <small>Next: ${formatDate(plan.next_due_date)}</small>
      </td>

      <td>ทุก ${formatNumber(plan.interval_months || 1)} เดือน</td>

      <td>${priorityBadge(plan.priority)}</td>

      <td>${statusBadge(getEffectiveStatus(plan))}</td>

      <td>${plan.checklist_count || 0} รายการ</td>

      <td>
        <div class="table-actions">
          <button class="btn ghost small-btn" onclick="openPmExecution('${plan.id}')">
            ทำ PM
          </button>

          <button class="btn danger small-btn" onclick="deletePmPlan('${plan.id}')">
            ลบ
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderChecklistPlans() {
  const keyword = clean(els.checklistSearch.value).toLowerCase();

  const data = state.plans
    .filter(plan => !["Completed", "Cancelled"].includes(plan.status))
    .filter(plan => {
      const text = [
        plan.pm_no,
        plan.machine_name,
        plan.machine_no,
        plan.area_point_name,
        plan.pm_title,
        plan.priority,
        plan.status
      ].join(" ").toLowerCase();

      return !keyword || text.includes(keyword);
    })
    .sort((a, b) => {
      const oa = getEffectiveStatus(a) === "Overdue" ? 1 : 0;
      const ob = getEffectiveStatus(b) === "Overdue" ? 1 : 0;

      if (ob !== oa) return ob - oa;

      return new Date(a.planned_date) - new Date(b.planned_date);
    });

  if (!data.length) {
    els.checklistPlanList.innerHTML = `<div class="empty">ไม่มี PM ที่ต้องทำ</div>`;
    return;
  }

  els.checklistPlanList.innerHTML = data.map(plan => `
    <div class="pm-card">
      <div>
        <h3>${escapeHtml(plan.machine_name)} | ${escapeHtml(plan.machine_no)}</h3>
        <p>${escapeHtml(plan.pm_title)}</p>
        <p>จุด PM: ${escapeHtml(plan.area_point_name)}</p>
      </div>

      <div class="pm-meta">
        ${statusBadge(getEffectiveStatus(plan))}
        ${priorityBadge(plan.priority)}
        <span class="badge Medium">${formatDate(plan.planned_date)}</span>
        <span class="badge Completed">ทุก ${formatNumber(plan.interval_months || 1)} เดือน</span>
      </div>

      <button class="btn primary" onclick="openPmExecution('${plan.id}')">
        <i data-lucide="clipboard-check"></i>
        เปิด Checklist
      </button>
    </div>
  `).join("");

  refreshIcons();
}

/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {
  const keyword = clean(els.historySearch.value).toLowerCase();
  const fromDate = els.historyFromDate.value ? parseDate(els.historyFromDate.value) : null;
  const toDate = els.historyToDate.value ? parseDate(els.historyToDate.value) : null;
  const resultFilter = els.historyResultFilter.value;

  const data = state.histories.filter(row => {
    const text = [
      row.pm_no,
      row.machine_name,
      row.machine_no,
      row.area_point_name,
      row.pm_title,
      row.technician_name,
      row.result,
      row.finding
    ].join(" ").toLowerCase();

    const matchKeyword = !keyword || text.includes(keyword);

    const date = row.actual_date ? parseDate(row.actual_date) : null;

    const matchDate =
      (!fromDate || (date && date >= fromDate)) &&
      (!toDate || (date && date <= toDate));

    const matchResult = !resultFilter || row.result === resultFilter;

    return matchKeyword && matchDate && matchResult;
  });

  if (!data.length) {
    els.historyTableBody.innerHTML = `<tr><td colspan="8" class="empty">ยังไม่มีประวัติ PM</td></tr>`;
    return;
  }

  els.historyTableBody.innerHTML = data.map(row => `
    <tr>
      <td>${formatDate(row.actual_date)}</td>

      <td><strong>${escapeHtml(row.pm_no)}</strong></td>

      <td>
        <strong>${escapeHtml(row.machine_name)}</strong><br>
        <small>${escapeHtml(row.machine_no)}</small>
      </td>

      <td>${escapeHtml(row.area_point_name)}</td>

      <td>${escapeHtml(row.pm_title)}</td>

      <td>${escapeHtml(row.technician_name || "-")}</td>

      <td>${resultBadge(row.result)}</td>

      <td>
        ${row.follow_up_required
          ? `<span class="badge FollowUp">ต้องติดตาม</span>`
          : `<span class="badge Completed">ไม่ต้องติดตาม</span>`
        }
      </td>
    </tr>
  `).join("");
}

/* =========================================================
   CALENDAR
========================================================= */

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();

  els.calendarTitle.textContent = state.calendarDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const calendarStart = new Date(year, month, 1 - startDay);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `<div class="calendar-grid">`;

  weekdays.forEach(day => {
    html += `<div class="calendar-weekday">${day}</div>`;
  });

  for (let i = 0; i < 42; i++) {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + i);

    const dateKey = toDateInput(date);
    const isMuted = date.getMonth() !== month;

    const events = state.plans.filter(plan => plan.planned_date === dateKey);

    html += `
      <div class="calendar-day ${isMuted ? "is-muted" : ""}">
        <div class="calendar-day-number">${date.getDate()}</div>
        <div class="calendar-event-list">
          ${events.map(plan => renderCalendarEvent(plan)).join("")}
        </div>
      </div>
    `;
  }

  html += `</div>`;

  els.pmCalendar.innerHTML = html;
}

function renderCalendarEvent(plan) {
  const status = getEffectiveStatus(plan);

  let cls = "";

  if (status === "Overdue") cls = "overdue";
  else if (status === "Completed") cls = "completed";
  else if (plan.priority === "Critical") cls = "critical";

  return `
    <div class="calendar-event ${cls}" title="${escapeHtml(plan.pm_title)}">
      <strong>${escapeHtml(plan.machine_no || plan.machine_name)}</strong>
      ${escapeHtml(plan.pm_title)}
    </div>
  `;
}

/* =========================================================
   PM EXECUTION
========================================================= */

window.openPmExecution = async function(planId) {
  try {
    const plan = state.plans.find(p => p.id === planId);

    if (!plan) {
      toast("ไม่พบแผน PM", "error");
      return;
    }

    state.currentPlan = plan;

    const res = await state.sb
      .from("pm_checklist_items")
      .select("*")
      .eq("pm_plan_id", plan.id)
      .order("sort_order", { ascending: true });

    if (res.error) throw res.error;

    state.currentChecklist = res.data || [];

    els.modalTitle.textContent = `${plan.machine_name} | ${plan.machine_no}`;
    els.modalSubtitle.textContent = `${plan.pm_no} · ${plan.pm_title}`;

    const objective = extractPmObjective(plan.pm_detail) || buildFallbackObjective(plan);

    els.executeObjectiveText.textContent = objective;

    els.actualDate.value = toDateInput(new Date());
    els.technicianCode.value = "";
    els.technicianName.value = "";
    els.startTime.value = "";
    els.endTime.value = "";
    els.pmResult.value = "Completed";
    els.finding.value = "";
    els.actionTaken.value = "";
    els.abnormalDetail.value = "";
    els.followUpRequired.value = "false";
    els.followUpDetail.value = "";

    els.nextDueDate.value = calculateNextDueDate(
      toDateInput(new Date()),
      plan.frequency,
      Number(plan.interval_months || 1)
    ) || "";

    els.beforeImages.value = "";
    els.afterImages.value = "";
    els.abnormalImages.value = "";

    renderExecuteChecklist();

    els.pmModal.classList.remove("hidden");
    refreshIcons();

    if (plan.status === "Pending") {
      await state.sb
        .from("pm_plans")
        .update({ status: "In Progress" })
        .eq("id", plan.id);

      plan.status = "In Progress";
      renderAll();
    }
  } catch (err) {
    console.error("Open PM Execution Error:", err);
    toast(`เปิด Checklist ไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
};

function buildFallbackObjective(plan) {
  return `ตรวจเช็กจุด ${plan.area_point_name} ของเครื่อง ${plan.machine_name} | ${plan.machine_no} เพื่อป้องกันปัญหาซ้ำ ลด Downtime และทำให้เครื่องจักรพร้อมใช้งาน`;
}

function renderExecuteChecklist() {
  if (!state.currentChecklist.length) {
    els.executeChecklistList.innerHTML = `<div class="empty">ไม่มี Checklist ในแผนนี้</div>`;
    return;
  }

  const helpBox = `
    <div class="pm-help-box">
      <h3>วิธีทำ PM Checklist สำหรับช่าง</h3>
      <ul>
        <li><strong>OK</strong> = ตรวจแล้วปกติ ใช้งานได้</li>
        <li><strong>NG</strong> = พบความผิดปกติ ต้องระบุอาการหรือจุดที่พบ</li>
        <li><strong>Need Follow-up</strong> = ยังไม่จบ ต้องติดตามต่อหรือรออะไหล่</li>
        <li><strong>Not Applicable</strong> = ไม่เกี่ยวข้องกับเครื่องนี้หรือจุดนี้</li>
      </ul>
    </div>
  `;

  const checklistHtml = state.currentChecklist.map((item, index) => {
    const parsed = parseTechChecklist(item.check_title);

    return `
      <div class="execute-item" data-check-id="${item.id}">
        <div class="tech-check-card">
          <div class="tech-check-head">
            <div class="tech-check-no">${index + 1}</div>
            <div class="tech-check-title">${escapeHtml(parsed.title)}</div>
          </div>

          <div class="tech-check-body">
            <div class="tech-check-section">
              <strong>วิธีตรวจ</strong>
              <span>${escapeHtml(parsed.method)}</span>
            </div>

            <div class="tech-check-section ok">
              <strong>เกณฑ์ OK / ปกติ</strong>
              <span>${escapeHtml(parsed.ok)}</span>
            </div>

            <div class="tech-check-section ng">
              <strong>เกณฑ์ NG / ผิดปกติ</strong>
              <span>${escapeHtml(parsed.ng)}</span>
            </div>

            <div class="tech-check-section action">
              <strong>ถ้า NG ต้องทำอะไร</strong>
              <span>${escapeHtml(parsed.action)}</span>
            </div>
          </div>

          <div class="tech-check-control">
            <select class="check-result">
              <option value="OK">OK - ปกติ</option>
              <option value="NG">NG - ผิดปกติ</option>
              <option value="Need Follow-up">Need Follow-up - ต้องติดตามต่อ</option>
              <option value="Not Applicable">Not Applicable - ไม่เกี่ยวข้อง</option>
            </select>

            <input class="check-remark" type="text" placeholder="หมายเหตุ เช่น จุดที่พบ / ค่าที่วัดได้ / อะไหล่ที่ต้องเปลี่ยน" />
          </div>
        </div>
      </div>
    `;
  }).join("");

  els.executeChecklistList.innerHTML = helpBox + checklistHtml;
}

function parseTechChecklist(text) {
  const raw = String(text || "").trim();

  if (raw.includes("||")) {
    const parts = raw.split("||").map(x => x.trim());

    return {
      title: cleanChecklistLabel(parts[0]) || "รายการตรวจ PM",
      method: cleanChecklistLabel(parts.find(x => x.startsWith("วิธีตรวจ:"))) || "ตรวจสอบตามสภาพหน้างานและทดลองการทำงานจริง",
      ok: cleanChecklistLabel(parts.find(x => x.startsWith("OK:"))) || "ทำงานปกติ ไม่มีเสียง/รั่ว/ติดขัด/Alarm",
      ng: cleanChecklistLabel(parts.find(x => x.startsWith("NG:"))) || "พบความผิดปกติ เช่น หลวม รั่ว ติดขัด เสียงดัง หรือ Alarm",
      action: cleanChecklistLabel(parts.find(x => x.startsWith("ถ้า NG:"))) || "ระบุจุดผิดปกติ บันทึกหมายเหตุ และแจ้ง Follow-up หากยังไม่จบ"
    };
  }

  return {
    title: raw || "รายการตรวจ PM",
    method: "ตรวจสอบตามข้อความในรายการนี้ ทดลองการทำงานจริง และสังเกตอาการผิดปกติ",
    ok: "เครื่องทำงานปกติ ไม่มีเสียงผิดปกติ ไม่ค้าง ไม่รั่ว และไม่มี Alarm",
    ng: "พบอาการผิดปกติ เช่น เสียงดัง หลวม รั่ว ติดขัด ไม่ทำงาน หรือ Alarm",
    action: "บันทึกอาการที่พบ ระบุจุดให้ชัดเจน ถ่ายรูป และเลือก Need Follow-up หากต้องแก้ต่อ"
  };
}

function cleanChecklistLabel(value) {
  return String(value || "")
    .replace(/^วิธีตรวจ:\s*/i, "")
    .replace(/^OK:\s*/i, "")
    .replace(/^NG:\s*/i, "")
    .replace(/^ถ้า NG:\s*/i, "")
    .trim();
}

function closePmModal() {
  els.pmModal.classList.add("hidden");
  state.currentPlan = null;
  state.currentChecklist = [];
}

async function submitPmExecution(event) {
  event.preventDefault();

  if (!state.currentPlan) {
    toast("ไม่พบแผน PM ที่กำลังทำ", "error");
    return;
  }

  try {
    const plan = state.currentPlan;

    setStatus("กำลังบันทึกผล PM...", "warning");

    const actualTimeMin = calculateTimeDiffMin(els.startTime.value, els.endTime.value);
    const followUp = els.followUpRequired.value === "true";
    const historyStatus = deriveHistoryStatus(els.pmResult.value, followUp);

    const historyPayload = {
      pm_plan_id: plan.id,
      pm_no: plan.pm_no,

      actual_date: els.actualDate.value,

      technician_code: els.technicianCode.value.trim() || null,
      technician_name: els.technicianName.value.trim(),

      machine_id: plan.machine_id || null,
      machine_name: plan.machine_name,
      machine_no: plan.machine_no,
      production_line: plan.production_line || null,

      area_point_id: plan.area_point_id || null,
      area_point_name: plan.area_point_name,

      pm_title: plan.pm_title,
      pm_type: plan.pm_type,
      frequency: plan.frequency,
      interval_months: Number(plan.interval_months || 1),
      priority: plan.priority,

      start_time: els.startTime.value || null,
      end_time: els.endTime.value || null,
      actual_time_min: actualTimeMin,

      result: els.pmResult.value,
      finding: els.finding.value.trim() || null,
      action_taken: els.actionTaken.value.trim() || null,
      abnormal_detail: els.abnormalDetail.value.trim() || null,

      follow_up_required: followUp,
      follow_up_detail: els.followUpDetail.value.trim() || null,
      next_due_date: els.nextDueDate.value || null,

      status: historyStatus
    };

    const historyRes = await state.sb
      .from("pm_history")
      .insert(historyPayload)
      .select()
      .single();

    if (historyRes.error) throw historyRes.error;

    const history = historyRes.data;

    const checklistPayload = collectExecuteChecklist(history.id);

    if (checklistPayload.length) {
      const checklistRes = await state.sb
        .from("pm_history_checklist")
        .insert(checklistPayload);

      if (checklistRes.error) {
        console.warn("pm_history_checklist insert failed:", checklistRes.error);
      }
    }

    await uploadPmImages(history.id, plan.id, "Before", els.beforeImages.files);
    await uploadPmImages(history.id, plan.id, "After", els.afterImages.files);
    await uploadPmImages(history.id, plan.id, "Abnormal", els.abnormalImages.files);

    const newPlanStatus = followUp ? "In Progress" : "Completed";

    const updateRes = await state.sb
      .from("pm_plans")
      .update({
        status: newPlanStatus,
        next_due_date: els.nextDueDate.value || plan.next_due_date || null
      })
      .eq("id", plan.id);

    if (updateRes.error) throw updateRes.error;

    closePmModal();

    await loadAllData();
    await autoRunAiPmGenerator();

    toast("บันทึกผล PM สำเร็จ", "success");
  } catch (err) {
    console.error("Submit PM Error:", err);
    setStatus("บันทึกผล PM ไม่สำเร็จ", "error");
    toast(`บันทึกผล PM ไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
}

function collectExecuteChecklist(pmHistoryId) {
  const items = [...els.executeChecklistList.querySelectorAll(".execute-item")];

  return items.map((el, index) => {
    const checklistId = el.dataset.checkId;
    const master = state.currentChecklist.find(item => item.id === checklistId);
    const result = el.querySelector(".check-result")?.value || "OK";
    const remark = el.querySelector(".check-remark")?.value.trim() || null;

    return {
      pm_history_id: pmHistoryId,
      pm_checklist_item_id: checklistId || null,

      item_no: master?.item_no || index + 1,
      check_title: master?.check_title || `Checklist ${index + 1}`,
      check_detail: master?.check_detail || null,

      result,
      measured_value: null,
      remark
    };
  });
}

async function uploadPmImages(pmHistoryId, pmPlanId, imageType, fileList) {
  const files = Array.from(fileList || []);

  for (const file of files) {
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `${state.currentPlan.pm_no}/${pmHistoryId}/${imageType}-${Date.now()}-${safeName}`;

      const uploadRes = await state.sb.storage
        .from("pm-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadRes.error) throw uploadRes.error;

      const publicRes = state.sb.storage
        .from("pm-images")
        .getPublicUrl(path);

      const publicUrl = publicRes.data?.publicUrl || null;

      const imageRes = await state.sb.from("pm_images").insert({
        pm_plan_id: pmPlanId,
        pm_history_id: pmHistoryId,
        image_type: imageType,
        file_name: file.name,
        file_path: path,
        public_url: publicUrl,
        uploaded_by: els.technicianName.value.trim() || "PM Planner"
      });

      if (imageRes.error) throw imageRes.error;
    } catch (err) {
      console.warn(`Upload ${imageType} image failed:`, err);
    }
  }
}

/* =========================================================
   DELETE PM PLAN
========================================================= */

window.deletePmPlan = async function(planId) {
  const plan = state.plans.find(item => item.id === planId);

  if (!plan) {
    toast("ไม่พบแผน PM ที่ต้องการลบ", "error");
    return;
  }

  const usedHistory = state.histories.some(history => history.pm_plan_id === planId);

  let message = `ต้องการลบแผน PM นี้หรือไม่?\n\n${plan.pm_no}\n${plan.machine_name} | ${plan.machine_no}\n${plan.pm_title}`;

  if (usedHistory) {
    message += `\n\nหมายเหตุ: แผนนี้มีประวัติ PM แล้ว ถ้าฐานข้อมูลไม่อนุญาตให้ลบ ระบบจะเปลี่ยนสถานะเป็น Cancelled แทน`;
  }

  const ok = confirm(message);
  if (!ok) return;

  try {
    setStatus("กำลังลบแผน PM...", "warning");

    const { error } = await state.sb
      .from("pm_plans")
      .delete()
      .eq("id", planId);

    if (error) throw error;

    await loadAllData();
    await autoRunAiPmGenerator();

    setStatus("พร้อมใช้งาน", "success");
    toast("ลบแผน PM สำเร็จ", "success");
  } catch (err) {
    console.warn("Delete failed, trying soft cancel:", err);

    try {
      const { error: updateError } = await state.sb
        .from("pm_plans")
        .update({ status: "Cancelled" })
        .eq("id", planId);

      if (updateError) throw updateError;

      await loadAllData();
      await autoRunAiPmGenerator();

      setStatus("พร้อมใช้งาน", "success");
      toast("ลบจริงไม่ได้ จึงเปลี่ยนสถานะเป็น Cancelled แทน", "warning");
    } catch (finalErr) {
      console.error("Delete PM Plan Error:", finalErr);
      setStatus("ลบแผนไม่สำเร็จ", "error");
      toast(`ลบแผน PM ไม่สำเร็จ: ${getErrorMessage(finalErr)}`, "error");
    }
  }
};

/* =========================================================
   AUTO AI PM
========================================================= */

async function autoRunAiPmGenerator() {
  try {
    if (!state.sb) return;

    setStatus("AI กำลังวิเคราะห์ PM อัตโนมัติ...", "warning");

    prepareAiDefaultDates();

    const fromDate = els.aiFromDate.value;
    const toDate = els.aiToDate.value;

    const { data, error } = await state.sb
      .from("repair_logs")
      .select("*")
      .gte("repair_date", fromDate)
      .lte("repair_date", toDate)
      .order("repair_date", { ascending: false });

    if (error) throw error;

    state.repairLogs = data || [];

    if (!state.repairLogs.length) {
      state.aiPmSuggestions = [];
      renderAiPmSuggestions();
      renderDashboard();
      setStatus("พร้อมใช้งาน", "success");
      return;
    }

    let suggestions = generateAiPmSuggestions(state.repairLogs);

    suggestions = suggestions
      .map(item => enhanceAiSuggestionWithExistingPm(item))
      .filter(item => !item.has_active_pm);

    state.aiPmSuggestions = suggestions;

    renderAiPmSuggestions();
    renderDashboard();

    state.autoAiReady = true;
    setStatus("AI วิเคราะห์ PM ล่าสุดแล้ว", "success");
  } catch (err) {
    console.error("Auto AI PM Error:", err);
    setStatus("AI วิเคราะห์อัตโนมัติไม่สำเร็จ", "error");
  }
}

function startAutoAiLoop() {
  if (state.autoAiTimer) clearInterval(state.autoAiTimer);

  state.autoAiTimer = setInterval(async () => {
    await loadPlans();
    updateOverdueViewOnly();
    await autoRunAiPmGenerator();
    renderAll();
  }, 10 * 60 * 1000);
}

function prepareAiDefaultDates() {
  const today = new Date();

  if (!els.aiToDate.value) {
    els.aiToDate.value = toDateInput(today);
  }

  if (!els.aiFromDate.value) {
    const from = new Date();
    from.setDate(today.getDate() - 90);
    els.aiFromDate.value = toDateInput(from);
  }
}

function enhanceAiSuggestionWithExistingPm(item) {
  const activeStatuses = ["Pending", "In Progress", "Overdue"];

  const hasActivePm = state.plans.some(plan => {
    const sameMachine =
      clean(plan.machine_name) === clean(item.machine_name) &&
      clean(plan.machine_no) === clean(item.machine_no);

    const sameArea =
      clean(plan.area_point_name) === clean(item.area_point_name);

    const active = activeStatuses.includes(getEffectiveStatus(plan));

    const title = clean(plan.pm_title).toLowerCase();
    const itemTitle = clean(item.pm_title).toLowerCase();
    const area = clean(item.area_point_name).toLowerCase();
    const category = clean(item.problem_category).toLowerCase();

    const similarTitle =
      title.includes(area) ||
      title.includes(category) ||
      itemTitle.includes(clean(plan.area_point_name).toLowerCase());

    return sameMachine && sameArea && active && similarTitle;
  });

  return {
    ...item,
    has_active_pm: hasActivePm
  };
}

async function analyzeAiPmGenerator() {
  try {
    setStatus("AI กำลังวิเคราะห์ประวัติซ่อม...", "warning");

    const fromDate = els.aiFromDate.value;
    const toDate = els.aiToDate.value;

    if (!fromDate || !toDate) {
      toast("กรุณาเลือกช่วงวันที่สำหรับวิเคราะห์", "warning");
      return;
    }

    const { data, error } = await state.sb
      .from("repair_logs")
      .select("*")
      .gte("repair_date", fromDate)
      .lte("repair_date", toDate)
      .order("repair_date", { ascending: false });

    if (error) throw error;

    state.repairLogs = data || [];

    if (!state.repairLogs.length) {
      state.aiPmSuggestions = [];
      renderAiPmSuggestions();
      toast("ไม่พบประวัติซ่อมในช่วงวันที่เลือก", "warning");
      setStatus("พร้อมใช้งาน", "success");
      return;
    }

    state.aiPmSuggestions = generateAiPmSuggestions(state.repairLogs)
      .map(item => enhanceAiSuggestionWithExistingPm(item))
      .filter(item => !item.has_active_pm);

    renderAiPmSuggestions();
    renderDashboard();

    setStatus("พร้อมใช้งาน", "success");
    toast(`AI สร้างแผน PM แนะนำ ${state.aiPmSuggestions.length} รายการ`, "success");
  } catch (err) {
    console.error("AI PM Generator Error:", err);
    setStatus("AI วิเคราะห์ไม่สำเร็จ", "error");
    toast(`AI วิเคราะห์ไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
}

/* =========================================================
   AI PM GENERATION
========================================================= */

function generateAiPmSuggestions(rows) {
  const fromDate = parseDate(els.aiFromDate.value);
  const toDate = parseDate(els.aiToDate.value);

  const targetMttr = Number(els.targetMttr.value || 37);
  const targetMtbf = Number(els.targetMtbf.value || 100);
  const plannedHoursPerDay = Number(els.plannedHoursPerDay.value || 24);
  const minScore = Number(els.minPmScore.value || 40);

  const totalDays = Math.max(1, daysBetween(fromDate, toDate) + 1);
  const plannedHours = totalDays * plannedHoursPerDay;

  const grouped = {};

  rows.forEach(row => {
    const category = classifyPmCategory(row);

    const key = [
      clean(row.machine_name) || "-",
      clean(row.machine_no) || "-",
      clean(row.area_point_name) || "-",
      category
    ].join("|");

    if (!grouped[key]) {
      grouped[key] = {
        machine_name: clean(row.machine_name) || "-",
        machine_no: clean(row.machine_no) || "-",
        production_line: clean(row.production_line) || null,
        area_point_name: clean(row.area_point_name) || "-",
        problem_category: category,
        rows: []
      };
    }

    grouped[key].rows.push(row);
  });

  const suggestions = Object.values(grouped).map(group => {
    const dataRows = group.rows;

    const failureCount = dataRows.length;
    const totalDowntime = sumBy(dataRows, row => num(row.loss_time_min));
    const mttr = failureCount ? totalDowntime / failureCount : 0;
    const mtbf = failureCount ? Math.max(0, (plannedHours - totalDowntime / 60) / failureCount) : plannedHours;

    const topProblem = topCount(dataRows, row => clean(row.problem_name) || "-");
    const topCause = topCount(dataRows, row => clean(row.cause_name) || "-");
    const topAction = topCount(dataRows, row => clean(row.action_name) || "-");

    const repeatProblemCount = topProblem.count;
    const repeatAreaCount = dataRows.length;

    const followUpCount = dataRows.filter(row => isFollowUp(row.repair_result)).length;
    const temporaryCount = dataRows.filter(row => clean(row.repair_result) === "ใช้งานได้ชั่วคราว").length;
    const severeCount = dataRows.filter(row => String(row.severity || "").includes("รุนแรง")).length;
    const highDowntimeCount = dataRows.filter(row => num(row.loss_time_min) >= 60).length;
    const remarkRisk = calculateRemarkRisk(dataRows);

    const trend = calculateRepairTrend(dataRows, fromDate, toDate);

    const score = calculatePmScore({
      failureCount,
      totalDowntime,
      mttr,
      mtbf,
      targetMttr,
      targetMtbf,
      repeatProblemCount,
      repeatAreaCount,
      followUpCount,
      temporaryCount,
      severeCount,
      highDowntimeCount,
      trendRatio: trend.trendRatio,
      remarkRisk
    });

    const priority = determinePmPriority(score);
    const intervalMonths = determinePmIntervalMonths(score);
    const frequency = determinePmFrequency(intervalMonths);
    const plannedDate = determineFirstPlannedDate(score);
    const nextDueDate = addMonthsToDate(plannedDate, intervalMonths);

    const importantRemarks = extractImportantRemarks(dataRows);

    const pmTitle = buildPmTitle(group.problem_category, group.area_point_name, topProblem.name);

    const objective = buildAiObjective({
      group,
      topProblem,
      topCause,
      failureCount,
      totalDowntime,
      importantRemarks
    });

    const pmDetail = buildCombinedPmDetail(
      objective,
      buildPmDetail({
        group,
        failureCount,
        totalDowntime,
        mttr,
        mtbf,
        topProblem,
        topCause,
        score,
        intervalMonths,
        importantRemarks
      })
    );

    const checklist = buildPmChecklist({
      category: group.problem_category,
      areaPoint: group.area_point_name,
      problemName: topProblem.name,
      causeName: topCause.name,
      actionName: topAction.name,
      remarks: dataRows.map(row => row.remark).filter(Boolean),
      rows: dataRows
    });

    const reason = buildPmReason({
      failureCount,
      totalDowntime,
      mttr,
      mtbf,
      targetMttr,
      targetMtbf,
      topProblem,
      topCause,
      followUpCount,
      severeCount,
      highDowntimeCount,
      trend,
      remarkRisk
    });

    return {
      temp_id: makeTempId(),

      machine_name: group.machine_name,
      machine_no: group.machine_no,
      production_line: group.production_line,

      area_point_name: group.area_point_name,
      problem_category: group.problem_category,
      problem_name: topProblem.name,
      cause_name: topCause.name,
      action_name: topAction.name,

      failure_count: failureCount,
      total_downtime_min: totalDowntime,
      mttr,
      mtbf,
      trend_label: trend.trendLabel,
      trend_ratio: trend.trendRatio,

      pm_score: score,
      priority,
      interval_months: intervalMonths,
      frequency,
      planned_date: plannedDate,
      next_due_date: nextDueDate,

      pm_title: pmTitle,
      pm_detail: pmDetail,
      checklist,
      ai_reason: reason,
      status: "New"
    };
  });

  return suggestions
    .filter(item => item.pm_score >= minScore)
    .sort((a, b) => b.pm_score - a.pm_score)
    .slice(0, 20);
}

function buildAiObjective({ group, topProblem, topCause, failureCount, totalDowntime, importantRemarks }) {
  const remarkText = importantRemarks.length
    ? ` โดยมีหมายเหตุสำคัญจากช่าง เช่น ${importantRemarks.join(" / ")}`
    : "";

  return `ป้องกันปัญหาซ้ำที่จุด ${group.area_point_name} ของเครื่อง ${group.machine_name} | ${group.machine_no} จากอาการหลัก "${topProblem.name}" และสาเหตุ "${topCause.name}" ซึ่งพบ ${failureCount} ครั้ง Downtime รวม ${formatNumber(totalDowntime)} นาที${remarkText}`;
}

function calculatePmScore(params) {
  const {
    failureCount,
    totalDowntime,
    mttr,
    mtbf,
    targetMttr,
    targetMtbf,
    repeatProblemCount,
    repeatAreaCount,
    followUpCount,
    temporaryCount,
    severeCount,
    highDowntimeCount,
    trendRatio,
    remarkRisk = 0
  } = params;

  let score = 0;

  score += Math.min(30, failureCount * 8);
  score += Math.min(25, totalDowntime / 10);

  if (repeatProblemCount >= 2) score += Math.min(18, repeatProblemCount * 6);
  if (repeatAreaCount >= 2) score += Math.min(15, repeatAreaCount * 5);
  if (mttr > targetMttr) score += 10;
  if (mtbf < targetMtbf) score += 10;

  score += Math.min(20, followUpCount * 10);
  score += Math.min(15, temporaryCount * 8);
  score += Math.min(18, severeCount * 9);
  score += Math.min(15, highDowntimeCount * 7);

  if (trendRatio >= 2) score += 12;
  else if (trendRatio >= 1.5) score += 9;
  else if (trendRatio >= 1.2) score += 5;

  score += Math.min(15, remarkRisk);

  return clamp(Math.round(score), 0, 100);
}

function determinePmPriority(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function determinePmIntervalMonths(score) {
  if (score >= 80) return 1;
  if (score >= 60) return 2;
  if (score >= 40) return 3;
  if (score >= 20) return 6;
  return 12;
}

function determinePmFrequency(intervalMonths) {
  if (intervalMonths === 1) return "Monthly";
  if (intervalMonths === 2) return "Monthly";
  if (intervalMonths === 3) return "Quarterly";
  if (intervalMonths === 6) return "Quarterly";
  return "Yearly";
}

function determineFirstPlannedDate(score) {
  const date = new Date();

  if (score >= 80) date.setDate(date.getDate() + 7);
  else if (score >= 60) date.setDate(date.getDate() + 14);
  else if (score >= 40) date.setDate(date.getDate() + 30);
  else date.setDate(date.getDate() + 60);

  return toDateInput(date);
}

function classifyPmCategory(row) {
  const text = [
    row.machine_name,
    row.machine_no,
    row.area_point_name,
    row.problem_name,
    row.cause_name,
    row.action_name,
    row.remark,
    row.breakdown_type
  ].join(" ").toLowerCase();

  const rules = [
    {
      name: "Air / Pneumatic / Clamp",
      keywords: ["ลม", "รั่ว", "แคลมป์", "clamp", "air", "กระบอกลม", "speed control", "solenoid"]
    },
    {
      name: "Heater / Temperature",
      keywords: ["heater", "ฮีต", "ฮีท", "อุณหภูมิ", "หลอด", "ssr", "temp", "temperature"]
    },
    {
      name: "Sensor / Electrical / Control",
      keywords: ["sensor", "เซนเซอร์", "ไฟ", "ไฟฟ้า", "alarm", "control", "limit", "inverter", "drive", "plc", "encoder"]
    },
    {
      name: "Cooling / Water / Chiller",
      keywords: ["น้ำ", "chiller", "หล่อเย็น", "สายยาง", "วาย", "strainer", "water", "รั่ว"]
    },
    {
      name: "Mechanical / Moving Parts",
      keywords: ["สึก", "หลวม", "แตก", "หัก", "bearing", "roller", "โรลเลอร์", "โซ่", "สายพาน", "ติดขัด", "ราง", "slide", "guide"]
    },
    {
      name: "Hydraulic / Oil",
      keywords: ["ไฮดรอลิค", "น้ำมัน", "ปั๊ม", "ซีล", "โอริง", "รั่วซึม", "hydraulic", "oil"]
    },
    {
      name: "Vacuum System",
      keywords: ["vacuum", "แวคคัม", "ปั้ม vacuum", "vacuum pump", "ดูด", "pad"]
    }
  ];

  let best = { name: "General Machine Check", score: 0 };

  rules.forEach(rule => {
    const score = rule.keywords.reduce((sum, keyword) => {
      return sum + (text.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    if (score > best.score) {
      best = { name: rule.name, score };
    }
  });

  return best.name;
}

function buildPmTitle(category, areaPoint, problemName) {
  if (category.includes("Air")) return `ตรวจสอบระบบลมและชุด Clamp จุด ${areaPoint}`;
  if (category.includes("Heater")) return `ตรวจสอบระบบ Heater และวงจรควบคุมอุณหภูมิ จุด ${areaPoint}`;
  if (category.includes("Sensor")) return `ตรวจสอบ Sensor, Electrical และ Control จุด ${areaPoint}`;
  if (category.includes("Cooling")) return `ตรวจสอบระบบน้ำหล่อเย็น / Chiller จุด ${areaPoint}`;
  if (category.includes("Mechanical")) return `ตรวจสอบชุดกลไกและชิ้นส่วนเคลื่อนที่ จุด ${areaPoint}`;
  if (category.includes("Hydraulic")) return `ตรวจสอบระบบ Hydraulic / Oil จุด ${areaPoint}`;
  if (category.includes("Vacuum")) return `ตรวจสอบระบบ Vacuum จุด ${areaPoint}`;

  return `ตรวจสอบเชิงป้องกันจุด ${areaPoint} จากอาการ ${problemName}`;
}

function buildPmDetail({ group, failureCount, totalDowntime, mttr, mtbf, topProblem, topCause, score, intervalMonths, importantRemarks = [] }) {
  const remarkPart = importantRemarks.length
    ? `หมายเหตุจากช่างที่ควรนำมาพิจารณา: ${importantRemarks.join(" / ")}`
    : `ไม่มีหมายเหตุสำคัญเพิ่มเติมจากช่าง`;

  return [
    `AI วิเคราะห์จากประวัติซ่อมพบว่า ${group.machine_name} | ${group.machine_no} มีปัญหาที่จุด ${group.area_point_name}`,
    `กลุ่มปัญหา: ${group.problem_category}`,
    `อาการหลัก: ${topProblem.name}`,
    `สาเหตุที่พบมาก: ${topCause.name}`,
    `พบการเสีย ${failureCount} ครั้ง, Downtime รวม ${formatNumber(totalDowntime)} นาที, MTTR ${formatNumber(mttr, 1)} นาที, MTBF ${formatNumber(mtbf, 1)} ชั่วโมง`,
    remarkPart,
    `PM Score ${score} จึงแนะนำให้ทำ PM ทุก ${intervalMonths} เดือน เพื่อป้องกัน Breakdown ซ้ำในอนาคต`
  ].join(" | ");
}

function buildPmReason({ failureCount, totalDowntime, mttr, mtbf, targetMttr, targetMtbf, topProblem, topCause, followUpCount, severeCount, highDowntimeCount, trend, remarkRisk = 0 }) {
  const reasons = [];

  reasons.push(`พบการเสีย ${failureCount} ครั้ง`);
  reasons.push(`Downtime รวม ${formatNumber(totalDowntime)} นาที`);
  reasons.push(`อาการหลักคือ "${topProblem.name}" พบ ${topProblem.count} ครั้ง`);
  reasons.push(`สาเหตุหลักคือ "${topCause.name}"`);

  if (mttr > targetMttr) reasons.push(`MTTR ${formatNumber(mttr, 1)} นาที สูงกว่าเป้า ${targetMttr} นาที`);
  if (mtbf < targetMtbf) reasons.push(`MTBF ${formatNumber(mtbf, 1)} ชั่วโมง ต่ำกว่าเป้า ${targetMtbf} ชั่วโมง`);
  if (followUpCount > 0) reasons.push(`มีงานที่ต้องติดตามต่อ ${followUpCount} รายการ`);
  if (severeCount > 0) reasons.push(`มีงานรุนแรง ${severeCount} รายการ`);
  if (highDowntimeCount > 0) reasons.push(`มีงาน Downtime ≥ 60 นาที ${highDowntimeCount} รายการ`);
  if (remarkRisk > 0) reasons.push(`หมายเหตุช่างมีคำเสี่ยง เช่น แก้ชั่วคราว/รออะไหล่/ต้องติดตาม จึงเพิ่มความสำคัญของ PM`);

  reasons.push(`แนวโน้มล่าสุด: ${trend.trendLabel}`);

  return reasons.join(" / ");
}

/* =========================================================
   SMART CHECKLIST BUILDER
========================================================= */

function buildPmChecklist({ category, areaPoint, problemName, causeName, actionName, remarks = [], rows = [] }) {
  const remarkText = remarks.join(" ").toLowerCase();

  const fullText = [
    category,
    areaPoint,
    problemName,
    causeName,
    actionName,
    remarkText
  ].join(" ").toLowerCase();

  const hasLeak = includesAny(fullText, ["รั่ว", "leak", "ลมรั่ว", "น้ำรั่ว", "รั่วซึม"]);
  const hasStuck = includesAny(fullText, ["ค้าง", "ติด", "ติดขัด", "ไม่ถอย", "ไม่กลับ", "stuck"]);
  const hasLoose = includesAny(fullText, ["หลวม", "คลอน", "หลุด", "loose"]);
  const hasBroken = includesAny(fullText, ["แตก", "หัก", "ขาด", "ไหม้", "เสีย", "broken"]);
  const hasTemp = includesAny(fullText, ["อุณหภูมิ", "temp", "temperature", "heater", "ฮีต", "ฮีท"]);
  const hasDirty = includesAny(fullText, ["สกปรก", "ตัน", "ตะกรัน", "ฝุ่น", "คราบ", "อุดตัน"]);
  const hasAlarm = includesAny(fullText, ["alarm", "อลาม", "แจ้งเตือน"]);
  const hasTemporary = rows.some(row => clean(row.repair_result) === "ใช้งานได้ชั่วคราว");
  const hasFollowUp = rows.some(row => isFollowUp(row.repair_result));

  let checklist = [];

  if (category.includes("Air") || fullText.includes("clamp") || fullText.includes("กระบอกลม")) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจจุดรั่วของระบบลมบริเวณ ${areaPoint}`,
        method: `ฟังเสียงรั่ว หรือใช้น้ำสบู่แตะตามข้อต่อ สายลม Fitting และรอบกระบอกลม`,
        ok: `ไม่มีเสียงรั่ว ไม่มีฟองอากาศ กระบอกลมทำงานสุด Stroke และแรงลมไม่ตก`,
        ng: `มีเสียงลมรั่ว มีฟอง กระบอกลมไม่สุด ทำงานช้า หรือค้าง`,
        action: `ระบุจุดรั่ว เปลี่ยนสายลม/Fitting/ข้อต่อ หรือแจ้ง Follow-up พร้อมแนบรูป`
      }),

      makeTechChecklist({
        title: `ทดสอบกระบอกลมหรือชุด Clamp ของ ${areaPoint}`,
        method: `กด Manual หรือ Jog ให้ชุด Clamp เปิด-ปิดอย่างน้อย 5 รอบ`,
        ok: `เปิด-ปิดครบทุกจังหวะ ไม่ค้าง ไม่สะดุด และกลับตำแหน่งเดิมทุกครั้ง`,
        ng: `Clamp ค้าง ไม่สุด Stroke สะดุด หรือจังหวะช้าผิดปกติ`,
        action: `ตรวจแกนกระบอก จุดยึด Speed Control และ Sensor ถ้ายังไม่หายให้บันทึก Need Follow-up`
      }),

      makeTechChecklist({
        title: `ตรวจ Speed Control และ Solenoid Valve`,
        method: `สังเกตความเร็วเข้า-ออกของกระบอก และฟังเสียง Solenoid ขณะสั่งงาน`,
        ok: `ความเร็วเหมาะสม Solenoid มีเสียงทำงานครบจังหวะ ลมเข้า-ออกปกติ`,
        ng: `ความเร็วผิดปกติ Solenoid ไม่ทำงาน ลมไม่ออก หรือวาล์วค้าง`,
        action: `ปรับ Speed Control ตรวจ Coil/สายไฟ/ขั้วต่อ และระบุอุปกรณ์ที่ต้องเปลี่ยน`
      }),

      makeTechChecklist({
        title: `ตรวจ Sensor ตำแหน่ง Clamp/Cylinder`,
        method: `ทดลองขยับชุดทำงาน แล้วดูไฟ Sensor ว่าติด/ดับครบตามจังหวะ`,
        ok: `ไฟ Sensor ติด/ดับตรงจังหวะ เครื่องไม่ Alarm และตำแหน่งไม่เพี้ยน`,
        ng: `Sensor ไม่ติด ติดค้าง ระยะจับเพี้ยน หรือเกิด Alarm ซ้ำ`,
        action: `ทำความสะอาดหน้า Sensor ปรับระยะ ตรวจสาย/Connector หรือแจ้งเปลี่ยน Sensor`
      })
    ];

    if (hasLeak) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจซ้ำจุดลมรั่วเดิมจากประวัติซ่อม`,
        method: `ดูหมายเหตุงานซ่อมเดิม แล้วตรวจข้อต่อ/สายลมบริเวณที่เคยรั่วเป็นพิเศษ`,
        ok: `ไม่พบเสียงรั่ว ไม่มีฟอง และแรงดันลมใช้งานปกติ`,
        ng: `พบจุดรั่วซ้ำ หรือจุดเดิมยังมีอาการรั่ว`,
        action: `ทำเครื่องหมายจุดรั่ว เปลี่ยนอะไหล่ และบันทึกว่าเป็นปัญหาซ้ำ`
      }));
    }

    if (hasStuck) {
      checklist.push(makeTechChecklist({
        title: `ตรวจอาการค้าง/ติดขัดของชุดลม`,
        method: `ทดลองทำงานหลายรอบและสังเกตจังหวะที่ค้างหรือไม่กลับตำแหน่ง`,
        ok: `ทำงานลื่นต่อเนื่อง ไม่ค้าง ไม่ฝืด`,
        ng: `ยังมีอาการค้าง ฝืด หรือไม่กลับตำแหน่ง`,
        action: `ตรวจแกนกระบอก จุดฝืด และจุดยึด ถ้าแก้ไม่จบให้เลือก Need Follow-up`
      }));
    }
  }

  else if (category.includes("Heater") || hasTemp) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจสภาพ Heater บริเวณ ${areaPoint}`,
        method: `ดูสภาพ Heater ด้วยสายตา ตรวจรอยแตก ไหม้ บวม หรือขาด`,
        ok: `Heater ไม่แตก ไม่ไหม้ ไม่บวม และติดตั้งแน่น`,
        ng: `Heater แตก ไหม้ บวม ขาด หรือหลวม`,
        action: `ระบุ Zone/ตำแหน่ง Heater ที่เสีย แจ้งเปลี่ยน และแนบรูป`
      }),

      makeTechChecklist({
        title: `ตรวจ Terminal หางปลา และสายไฟ Heater`,
        method: `เปิดดูจุดต่อสาย ตรวจความแน่น รอยไหม้ และฉนวนสายไฟ`,
        ok: `ขั้วต่อแน่น ไม่มีรอยไหม้ สายไม่กรอบ ไม่แตกร้าว`,
        ng: `Terminal หลวม หางปลาไหม้ สายกรอบ หรือฉนวนเสียหาย`,
        action: `ขันแน่น เปลี่ยนหางปลา/สายไฟ และบันทึกจุดที่พบ`
      }),

      makeTechChecklist({
        title: `ตรวจการทำงานของ SSR/Relay/Contactor Heater`,
        method: `สั่งเปิด Heater แล้วดูการตอบสนองของอุปกรณ์ควบคุม`,
        ok: `อุปกรณ์ทำงานตามคำสั่ง ไม่ค้าง ไม่มีรอยไหม้`,
        ng: `อุปกรณ์ไม่ทำงาน ทำงานค้าง หรือมีรอยไหม้`,
        action: `ตรวจไฟสั่งงาน ตรวจขั้วต่อ และแจ้งเปลี่ยนอุปกรณ์ควบคุม`
      }),

      makeTechChecklist({
        title: `ตรวจอุณหภูมิจริงเทียบค่า Set Point`,
        method: `เปิด Heater แล้วดูค่าอุณหภูมิว่าขึ้นตามปกติหรือไม่`,
        ok: `อุณหภูมิขึ้นใกล้เคียงค่า Set Point และไม่แกว่งผิดปกติ`,
        ng: `Temp ไม่ขึ้น ขึ้นช้า แกว่งมาก หรือเกิด Alarm`,
        action: `ตรวจ Heater, Sensor อุณหภูมิ, SSR และบันทึกผลที่พบ`
      })
    ];

    if (hasBroken) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจจุด Heater ที่เคยแตก/ไหม้ซ้ำ`,
        method: `ดูตำแหน่งที่เคยเสียจากประวัติซ่อม แล้วตรวจซ้ำบริเวณเดิม`,
        ok: `ไม่พบรอยเสียหายซ้ำ จุดต่อแน่น และทำงานปกติ`,
        ng: `พบรอยแตก ไหม้ หรือสายกรอบซ้ำบริเวณเดิม`,
        action: `แจ้งเปลี่ยนอะไหล่และตรวจสาเหตุ เช่น หลวม ความร้อนสะสม หรือเดินสายไม่เหมาะสม`
      }));
    }
  }

  else if (category.includes("Sensor") || hasAlarm) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจตำแหน่ง Sensor บริเวณ ${areaPoint}`,
        method: `ดูตำแหน่ง Sensor ว่าเอียง หลุด หรือระยะจับเปลี่ยนหรือไม่`,
        ok: `Sensor อยู่ตำแหน่งเดิม ระยะจับเหมาะสม และยึดแน่น`,
        ng: `Sensor เอียง หลวม ระยะจับเพี้ยน หรือโดนชน`,
        action: `ปรับตำแหน่ง Sensor ขันแน่น และทำ Mark ตำแหน่งหลังปรับ`
      }),

      makeTechChecklist({
        title: `ทำความสะอาดหน้า Sensor`,
        method: `เช็ดหน้า Sensor/Photo Sensor ไม่ให้มีฝุ่น น้ำมัน หรือเศษพลาสติกบัง`,
        ok: `หน้า Sensor สะอาด จับชิ้นงานได้ปกติ`,
        ng: `มีคราบ ฝุ่น น้ำมัน หรือจับชิ้นงานไม่เสถียร`,
        action: `ทำความสะอาด ปรับระยะ และบันทึกถ้ายังจับไม่เสถียร`
      }),

      makeTechChecklist({
        title: `ตรวจไฟ Sensor และสัญญาณ Output`,
        method: `ทดลองให้ Sensor จับ/ไม่จับ แล้วดูไฟ Indicator หรือสัญญาณเข้า PLC`,
        ok: `ไฟติด/ดับตรงจังหวะ สัญญาณเข้า PLC ถูกต้อง`,
        ng: `ไฟไม่ติด ติดค้าง กระพริบผิดปกติ หรือสัญญาณไม่เข้า PLC`,
        action: `ตรวจสายไฟ Connector ไฟเลี้ยง และแจ้งเปลี่ยน Sensor ถ้าจำเป็น`
      }),

      makeTechChecklist({
        title: `ทดสอบ Alarm เดิมที่เคยเกิด`,
        method: `ทดลองจังหวะที่เคย Alarm อย่างน้อย 3 รอบ`,
        ok: `ไม่เกิด Alarm ซ้ำ เครื่องทำงานครบ Cycle`,
        ng: `Alarm ซ้ำ หรือจังหวะเครื่องยังเพี้ยน`,
        action: `บันทึก Alarm ที่เกิด ระบุจังหวะ และแจ้ง Follow-up`
      })
    ];

    if (hasAlarm) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจ Alarm ซ้ำจากประวัติซ่อม`,
        method: `ดูอาการ Alarm เดิม แล้วจำลองจังหวะการทำงานที่เกี่ยวข้อง`,
        ok: `ไม่มี Alarm ซ้ำ สัญญาณ Sensor/PLC ตรงจังหวะ`,
        ng: `Alarm เกิดซ้ำ หรือสัญญาณไม่เสถียร`,
        action: `บันทึกรหัส Alarm จังหวะที่เกิด และอุปกรณ์ที่สงสัย`
      }));
    }
  }

  else if (category.includes("Cooling") || fullText.includes("น้ำ") || fullText.includes("chiller")) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจการไหลเวียนน้ำบริเวณ ${areaPoint}`,
        method: `เปิดระบบน้ำแล้วดูการไหล ฟังเสียงปั๊ม และตรวจแรงดันถ้ามี Gauge`,
        ok: `น้ำไหลต่อเนื่อง ไม่ไหลอ่อนผิดปกติ ไม่มี Alarm`,
        ng: `น้ำไม่ไหล ไหลอ่อน มีเสียงผิดปกติ หรือ Alarm`,
        action: `ตรวจวาล์ว ปั๊ม Filter และบันทึกจุดที่ต้องแก้`
      }),

      makeTechChecklist({
        title: `ตรวจ Hose/Fitting/Clamp รัดสาย`,
        method: `ดูคราบน้ำ รอยเปียก รอยแตก และจับโยกข้อต่อเบา ๆ`,
        ok: `ไม่มีน้ำรั่ว ไม่มีคราบน้ำแห้ง สายไม่แตก ข้อต่อแน่น`,
        ng: `มีน้ำรั่ว สายแตก ข้อต่อหลวม หรือมีคราบน้ำ`,
        action: `เปลี่ยนสาย/ข้อต่อ/Clamp และแนบรูปจุดรั่ว`
      }),

      makeTechChecklist({
        title: `ถอดล้าง Y-Strainer หรือ Filter น้ำ`,
        method: `ถอดดูไส้กรอง/Y-Strainer และล้างคราบตะกรันหรือเศษอุดตัน`,
        ok: `ตะแกรงสะอาด ไม่มีเศษอุดตัน น้ำไหลดีหลังประกอบ`,
        ng: `มีตะกรัน เศษอุดตัน หรือไส้กรองสกปรกมาก`,
        action: `ล้างทำความสะอาด ถ่ายรูปก่อน-หลัง และบันทึกถ้าควรเปลี่ยน`
      }),

      makeTechChecklist({
        title: `ตรวจอุณหภูมิน้ำหรือ Chiller`,
        method: `ดูค่าอุณหภูมิน้ำเข้า-ออก หรือค่า Chiller ขณะเครื่องทำงาน`,
        ok: `อุณหภูมิอยู่ในช่วงใช้งานปกติและไม่แกว่งผิดปกติ`,
        ng: `อุณหภูมิสูง น้ำไม่เย็น หรือ Chiller Alarm`,
        action: `ตรวจ Filter, Condenser, น้ำหล่อเย็น และแจ้ง Follow-up`
      })
    ];

    if (hasDirty) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจตะกรัน/สิ่งอุดตันซ้ำจากประวัติเดิม`,
        method: `เปิดดู Y-Strainer และจุดที่เคยล้างตามหมายเหตุช่าง`,
        ok: `ไม่พบตะกรันสะสมมาก น้ำไหลปกติ`,
        ng: `มีตะกรันหรือสิ่งอุดตันซ้ำ`,
        action: `ล้างทันที ถ่ายรูปก่อน-หลัง และเสนอเพิ่มรอบ PM ให้ถี่ขึ้น`
      }));
    }

    if (hasLeak) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจน้ำรั่วซ้ำบริเวณ ${areaPoint}`,
        method: `ตรวจ Hose/Fitting ทุกจุดที่เกี่ยวข้องโดยดูรอยเปียกและคราบน้ำ`,
        ok: `ไม่มีน้ำรั่ว ไม่มีคราบน้ำ และข้อต่อแน่น`,
        ng: `พบรอยรั่ว คราบน้ำ หรือสายเริ่มแตก`,
        action: `เปลี่ยนอะไหล่ที่เสียและแนบรูปจุดรั่ว`
      }));
    }
  }

  else if (category.includes("Mechanical")) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจการเคลื่อนที่ของชุด ${areaPoint}`,
        method: `กด Manual/Jog ให้ชุดเคลื่อนที่ไป-กลับอย่างน้อย 3 รอบ`,
        ok: `เคลื่อนที่ลื่น ไม่ฝืด ไม่สะดุด ไม่ติดขัด`,
        ng: `ฝืด สะดุด ค้าง หรือไม่กลับตำแหน่ง`,
        action: `ทำความสะอาดราง ตรวจจุดฝืด หล่อลื่น และบันทึกจุดที่พบ`
      }),

      makeTechChecklist({
        title: `ตรวจ Bearing / Roller / Slide Rail / Guide`,
        method: `หมุนหรือขยับชิ้นส่วน สังเกตเสียงดัง ระยะคลอน และความฝืด`,
        ok: `ไม่มีเสียงดัง ไม่ฝืด ไม่คลอน และผิวสัมผัสปกติ`,
        ng: `เสียงดัง ฝืด คลอน สึก หรือหมุนไม่ลื่น`,
        action: `หล่อลื่น เปลี่ยน Bearing/Roller หรือแจ้ง Follow-up`
      }),

      makeTechChecklist({
        title: `ตรวจ Bolt / Nut / Bracket / จุดยึด`,
        method: `ตรวจด้วยสายตาและใช้ประแจเช็กความแน่นในจุดสำคัญ`,
        ok: `จุดยึดแน่น ไม่คลอน ไม่หลุด และไม่มีรอยแตกร้าว`,
        ng: `น็อตหลวม จุดยึดคลอน Bracket แตก หรือแนวเครื่องเยื้อง`,
        action: `ขันแน่น ทำ Mark หลังขัน และบันทึกจุดที่ต้องซ่อมต่อ`
      }),

      makeTechChecklist({
        title: `ทำความสะอาดและหล่อลื่นจุดเคลื่อนที่`,
        method: `ทำความสะอาดเศษฝุ่น/เศษพลาสติก แล้วหล่อลื่นจุด Slide/Bearing/Guide`,
        ok: `จุดเคลื่อนที่สะอาด มีสารหล่อลื่นพอดี และเคลื่อนที่ลื่น`,
        ng: `มีเศษสะสม จาระบีแห้ง หรือยังเคลื่อนที่ฝืด`,
        action: `ทำความสะอาดเพิ่ม หล่อลื่นซ้ำ และตรวจว่ามีชิ้นส่วนสึกหรือไม่`
      })
    ];

    if (hasStuck) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจอาการติดขัดซ้ำของ ${areaPoint}`,
        method: `ทดลอง Manual/Auto แล้วสังเกตจังหวะที่ฝืด สะดุด หรือค้าง`,
        ok: `ไม่มีจังหวะติดขัด เคลื่อนที่ครบ Cycle`,
        ng: `ยังมีจังหวะติดขัดหรือค้างซ้ำ`,
        action: `ระบุจังหวะที่ติด ตรวจราง/Guide/จุดยึด และแจ้ง Follow-up`
      }));
    }

    if (hasLoose) {
      checklist.unshift(makeTechChecklist({
        title: `ตรวจจุดหลวมซ้ำจากประวัติซ่อม`,
        method: `ตรวจจุดยึดที่เกี่ยวข้องกับ ${areaPoint} และทำ Mark หลังขันแน่น`,
        ok: `ไม่มีจุดหลวม ไม่มีการคลอนหลังทดสอบ`,
        ng: `ยังพบจุดหลวม คลอน หรือหลุดซ้ำ`,
        action: `ขันแน่น เปลี่ยนน็อต/แหวนรอง และบันทึกเป็นปัญหาซ้ำ`
      }));
    }

    if (hasBroken) {
      checklist.push(makeTechChecklist({
        title: `ตรวจชิ้นส่วนแตก/หัก/สึกหนัก`,
        method: `ดูรอยแตก รอยสึก และจุดที่เคยซ่อมจากประวัติ`,
        ok: `ไม่มีรอยแตก หัก หรือสึกจนเสี่ยงหยุดเครื่อง`,
        ng: `พบชิ้นส่วนแตก หัก หรือสึกหนัก`,
        action: `เสนอเปลี่ยนอะไหล่ก่อน Breakdown และแนบรูป`
      }));
    }
  }

  else if (category.includes("Hydraulic")) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจระดับและสภาพน้ำมัน Hydraulic`,
        method: `ดูระดับน้ำมัน สี ฟอง และสิ่งปนเปื้อนในถัง`,
        ok: `ระดับน้ำมันปกติ สีไม่ดำ ไม่มีฟองมาก`,
        ng: `น้ำมันต่ำ ดำ มีฟอง หรือมีสิ่งปนเปื้อน`,
        action: `เติม/เปลี่ยนน้ำมันตามแผน และบันทึกสภาพที่พบ`
      }),

      makeTechChecklist({
        title: `ตรวจจุดรั่วซึม Hydraulic`,
        method: `ดู Hose, Fitting, Cylinder, Seal และ O-Ring รอบจุดทำงาน`,
        ok: `ไม่มีคราบน้ำมัน ไม่มีหยดรั่ว และแรงดันปกติ`,
        ng: `มีคราบน้ำมัน รั่วซึม หรือแรงดันตก`,
        action: `ระบุจุดรั่ว เปลี่ยน Seal/O-Ring/Hose และแนบรูป`
      }),

      makeTechChecklist({
        title: `ทดสอบการเคลื่อนที่ของกระบอก Hydraulic`,
        method: `สั่งงานกระบอกแล้วสังเกตการเคลื่อนที่และเสียง Pump`,
        ok: `เคลื่อนที่เรียบ ไม่กระตุก ไม่ช้า ไม่ค้าง`,
        ng: `กระตุก ช้า ค้าง หรือ Pump มีเสียงผิดปกติ`,
        action: `ตรวจแรงดัน วาล์ว และแจ้ง Follow-up ถ้ายังผิดปกติ`
      })
    ];
  }

  else if (category.includes("Vacuum")) {
    checklist = [
      makeTechChecklist({
        title: `ตรวจระดับและสภาพน้ำมัน Vacuum Pump`,
        method: `ดูระดับน้ำมัน สีของน้ำมัน และคราบปนเปื้อน`,
        ok: `ระดับน้ำมันอยู่ในเกณฑ์ สีไม่ดำมาก ไม่มีสิ่งปนเปื้อน`,
        ng: `น้ำมันต่ำ ดำมาก มีฟอง หรือมีสิ่งปนเปื้อน`,
        action: `เติม/เปลี่ยนน้ำมันหรือวางแผนเปลี่ยนตามรอบ และบันทึกผล`
      }),

      makeTechChecklist({
        title: `ตรวจ Filter ของ Vacuum Pump`,
        method: `ตรวจ Oil Filter / Air Filter ว่าสกปรกหรือตันหรือไม่`,
        ok: `Filter ไม่ตัน ไม่สกปรกมาก แรงดูดปกติ`,
        ng: `Filter ตัน สกปรกมาก หรือแรงดูดตก`,
        action: `ทำความสะอาดหรือเสนอเปลี่ยน Filter`
      }),

      makeTechChecklist({
        title: `ตรวจ Hose / Fitting / Seal / Vacuum Pad`,
        method: `ตรวจรอยแตก แข็ง เสื่อม หลวม และจุดรั่วของระบบ Vacuum`,
        ok: `ไม่มีรั่ว Pad ไม่แข็งหรือฉีก งานจับอยู่ปกติ`,
        ng: `รั่ว Pad เสื่อม จับงานไม่อยู่ หรือแรงดูดตก`,
        action: `ระบุจุดรั่ว เปลี่ยน Pad/Hose/Seal และแนบรูป`
      }),

      makeTechChecklist({
        title: `ทดสอบ Vacuum Holding`,
        method: `ทดสอบจับงานหรือทดสอบแรงดูดตามจังหวะเครื่อง`,
        ok: `จับงานอยู่ตามเวลาที่ต้องการ แรงดูดไม่ตกผิดปกติ`,
        ng: `จับงานไม่อยู่ แรงดูดตก หรือหลุดระหว่าง Cycle`,
        action: `ตรวจจุดรั่วและบันทึกค่าแรงดูดถ้ามี Gauge`
      })
    ];
  }

  else {
    checklist = [
      makeTechChecklist({
        title: `ตรวจสภาพหน้างานบริเวณ ${areaPoint}`,
        method: `ตรวจตามอาการที่เคยเสีย: ${problemName}`,
        ok: `ไม่พบความผิดปกติ เครื่องทำงานปกติหลังทดสอบ`,
        ng: `พบอาการผิดปกติซ้ำ หรือพบจุดเสี่ยงใหม่`,
        action: `ระบุจุดที่พบ บันทึกอาการ และแนบรูป`
      }),

      makeTechChecklist({
        title: `ตรวจสาเหตุเดิมจากประวัติซ่อม`,
        method: `ตรวจสาเหตุที่เคยพบ: ${causeName || "-"}`,
        ok: `สาเหตุเดิมไม่เกิดซ้ำ และจุดที่เคยแก้ยังอยู่ในสภาพดี`,
        ng: `พบสาเหตุเดิมซ้ำ หรือจุดที่เคยแก้เริ่มเสียอีก`,
        action: `บันทึกเป็นปัญหาซ้ำและแจ้งหัวหน้าเพื่อติดตาม`
      }),

      makeTechChecklist({
        title: `ทดสอบการทำงานจริงหลัง PM`,
        method: `ทดลองเดินเครื่องหรือทดลอง Cycle อย่างน้อย 3 รอบ`,
        ok: `ทำงานครบ Cycle ไม่มีเสียง/รั่ว/ติดขัด/Alarm`,
        ng: `ยังมีอาการผิดปกติหรือเกิด Alarm`,
        action: `เลือก NG หรือ Need Follow-up พร้อมหมายเหตุ`
      })
    ];
  }

  if (hasTemporary) {
    checklist.push(makeTechChecklist({
      title: `ตรวจจุดที่เคยแก้ไขชั่วคราว`,
      method: `ดูประวัติ/หมายเหตุเดิม แล้วตรวจจุดที่เคยแก้ชั่วคราวซ้ำ`,
      ok: `จุดที่เคยแก้ชั่วคราวถูกแก้ถาวรแล้ว หรือยังใช้งานได้ปลอดภัย`,
      ng: `ยังเป็นการแก้ชั่วคราว เสี่ยงเสียซ้ำ หรือยังรออะไหล่`,
      action: `เลือก Need Follow-up ระบุอะไหล่/งานที่ต้องแก้ถาวร`
    }));
  }

  if (hasFollowUp) {
    checklist.push(makeTechChecklist({
      title: `ตรวจรายการที่ต้องติดตามต่อจากประวัติซ่อม`,
      method: `อ่านหมายเหตุเดิมและตรวจว่างานติดตามจบแล้วหรือยัง`,
      ok: `งานติดตามจบแล้ว เครื่องใช้งานปกติ`,
      ng: `ยังมีงานค้าง รออะไหล่ หรือยังไม่จบ`,
      action: `เลือก Need Follow-up และกรอกรายละเอียดให้ชัดเจน`
    }));
  }

  return uniqueChecklist(checklist).slice(0, 10);
}

function makeTechChecklist({ title, method, ok, ng, action }) {
  return [
    title,
    `วิธีตรวจ: ${method}`,
    `OK: ${ok}`,
    `NG: ${ng}`,
    `ถ้า NG: ${action}`
  ].join("||");
}

/* =========================================================
   AI RENDER / CONVERT
========================================================= */

function renderAiPmSuggestions() {
  const suggestions = state.aiPmSuggestions || [];

  const criticalCount = suggestions.filter(item => item.priority === "Critical").length;
  const highCount = suggestions.filter(item => item.priority === "High").length;
  const avgInterval = suggestions.length
    ? Math.round(sumBy(suggestions, item => Number(item.interval_months || 0)) / suggestions.length)
    : 0;

  els.aiCriticalCount.textContent = formatNumber(criticalCount);
  els.aiHighCount.textContent = formatNumber(highCount);
  els.aiSuggestedCount.textContent = formatNumber(suggestions.length);
  els.aiAvgInterval.textContent = suggestions.length ? `${avgInterval} เดือน` : "-";

  if (!suggestions.length) {
    els.aiPmSuggestionList.innerHTML = `<div class="empty">ยังไม่มี PM ที่ระบบแนะนำ หรือมีแผน PM ของจุดนี้อยู่แล้ว</div>`;
    refreshIcons();
    return;
  }

  els.aiPmSuggestionList.innerHTML = suggestions.map(item => `
    <article class="ai-pm-card ${escapeHtml(item.priority)}">
      <div class="ai-pm-top">
        <div class="ai-pm-title">
          <h3>${escapeHtml(item.machine_name)} | ${escapeHtml(item.machine_no)}</h3>
          <p>${escapeHtml(item.area_point_name)} · ${escapeHtml(item.problem_category)}</p>
        </div>

        <div class="ai-score ${escapeHtml(item.priority)}">${item.pm_score}</div>
      </div>

      <div>
        <h3>${escapeHtml(item.pm_title)}</h3>
        <p>${escapeHtml(extractPmObjective(item.pm_detail) || item.pm_detail)}</p>
      </div>

      <div class="ai-pm-meta">
        ${priorityBadge(item.priority)}
        <span class="badge Medium">ทุก ${item.interval_months} เดือน</span>
        <span class="badge Pending">Plan: ${formatDate(item.planned_date)}</span>
        <span class="badge Completed">Next: ${formatDate(item.next_due_date)}</span>
      </div>

      <div class="ai-pm-reason">
        <strong>เหตุผลที่ระบบแนะนำ PM นี้:</strong><br>
        ${escapeHtml(item.ai_reason)}
      </div>

      <div class="ai-pm-reason">
        <strong>KPI Trigger:</strong><br>
        Breakdown ${item.failure_count} ครั้ง · Downtime ${formatNumber(item.total_downtime_min)} นาที ·
        MTTR ${formatNumber(item.mttr, 1)} นาที · MTBF ${formatNumber(item.mtbf, 1)} ชั่วโมง · Trend ${escapeHtml(item.trend_label)}
      </div>

      <div class="ai-pm-checklist">
        <strong>Checklist ที่ระบบแนะนำ</strong>
        <ul>
          ${item.checklist.map(check => {
            const parsed = parseTechChecklist(check);
            return `<li>${escapeHtml(parsed.title)}</li>`;
          }).join("")}
        </ul>
      </div>

      <div class="ai-pm-actions">
        <button type="button" class="btn primary" onclick="convertAiPmToPlan('${item.temp_id}')">
          <i data-lucide="calendar-plus"></i>
          Convert to PM Plan
        </button>
      </div>
    </article>
  `).join("");

  refreshIcons();
}

async function convertAiPmToPlan(tempId) {
  const item = state.aiPmSuggestions.find(row => row.temp_id === tempId);

  if (!item) {
    toast("ไม่พบ AI PM Suggestion", "error");
    return;
  }

  try {
    setStatus("กำลังสร้าง PM Plan จาก AI...", "warning");

    const pmNo = await generatePmNo();

    const machine = state.machines.find(m =>
      clean(m.machine_name) === item.machine_name &&
      clean(m.machine_no) === item.machine_no
    );

    const areaPoint = state.areaPoints.find(p =>
      clean(p.point_name) === item.area_point_name &&
      (!machine || p.machine_id === machine.id)
    );

    const planPayload = {
      pm_no: pmNo,

      machine_id: machine?.id || null,
      machine_name: item.machine_name,
      machine_no: item.machine_no,
      production_line: item.production_line || machine?.production_line || null,

      area_point_id: areaPoint?.id || null,
      area_point_name: item.area_point_name,

      pm_title: item.pm_title,
      pm_detail: item.pm_detail,

      pm_type: guessPmType(item.problem_category),
      frequency: item.frequency,
      interval_months: item.interval_months,
      priority: item.priority,

      planned_date: item.planned_date,
      next_due_date: item.next_due_date,

      assigned_to_name: "Maintenance Team",
      estimated_time_min: estimatePmTime(item.priority, item.problem_category),

      source_type: "AI Suggested",
      source_note: item.ai_reason,
      status: "Pending",
      created_by: "AI PM Generator"
    };

    const planRes = await state.sb
      .from("pm_plans")
      .insert(planPayload)
      .select()
      .single();

    if (planRes.error) throw planRes.error;

    const checklistPayload = item.checklist.map((check, index) => ({
      pm_plan_id: planRes.data.id,
      item_no: index + 1,
      check_title: check,
      check_detail: null,
      standard_value: null,
      method: null,
      tool_required: null,
      is_required: true,
      sort_order: index + 1
    }));

    const checkRes = await state.sb
      .from("pm_checklist_items")
      .insert(checklistPayload);

    if (checkRes.error) throw checkRes.error;

    await saveAiPmSuggestionRecord(item, planRes.data.id);

    state.aiPmSuggestions = state.aiPmSuggestions.filter(row => row.temp_id !== tempId);

    await loadAllData();
    await autoRunAiPmGenerator();

    setStatus("พร้อมใช้งาน", "success");
    toast(`สร้าง PM Plan สำเร็จ: ${pmNo}`, "success");
  } catch (err) {
    console.error("Convert AI PM Error:", err);
    setStatus("สร้าง PM จาก AI ไม่สำเร็จ", "error");
    toast(`สร้าง PM จาก AI ไม่สำเร็จ: ${getErrorMessage(err)}`, "error");
  }
}

window.convertAiPmToPlan = convertAiPmToPlan;

async function convertAllAiPmToPlans() {
  if (!state.aiPmSuggestions.length) {
    toast("ยังไม่มี AI PM Suggestion ให้ Convert", "warning");
    return;
  }

  const ok = confirm(`ต้องการ Convert PM ที่ระบบแนะนำทั้งหมด ${state.aiPmSuggestions.length} รายการ เป็น PM Plan จริงหรือไม่?`);
  if (!ok) return;

  const ids = [...state.aiPmSuggestions.map(item => item.temp_id)];

  for (const id of ids) {
    await convertAiPmToPlan(id);
  }

  toast("Convert AI PM ทั้งหมดเสร็จแล้ว", "success");
}

async function saveAiPmSuggestionRecord(item, pmPlanId) {
  try {
    const payload = {
      machine_name: item.machine_name,
      machine_no: item.machine_no,
      production_line: item.production_line,

      area_point_name: item.area_point_name,
      problem_name: item.problem_name,

      problem_category: item.problem_category,
      pm_score: item.pm_score,

      risk_score: item.pm_score,
      probability_7d: 0,
      probability_14d: 0,
      probability_30d: 0,
      prediction_confidence: calculateSuggestionConfidence(item),

      ai_reason: item.ai_reason,
      ai_suggestion: item.pm_detail,

      recommended_pm_title: item.pm_title,
      recommended_pm_detail: item.pm_detail,
      recommended_priority: item.priority,
      recommended_due_date: item.planned_date,
      recommended_interval_months: item.interval_months,

      planned_date: item.planned_date,
      next_due_date: item.next_due_date,

      status: "Converted",
      converted_pm_plan_id: pmPlanId
    };

    const res = await state.sb
      .from("pm_ai_suggestions")
      .insert(payload);

    if (res.error) {
      console.warn("Save pm_ai_suggestions skipped:", res.error);
    }
  } catch (err) {
    console.warn("Save AI suggestion failed:", err);
  }
}

/* =========================================================
   SUPPORT AI LOGIC
========================================================= */

function guessPmType(category) {
  if (category.includes("Air")) return "Inspection";
  if (category.includes("Heater")) return "Condition Check";
  if (category.includes("Sensor")) return "Inspection";
  if (category.includes("Cooling")) return "Cleaning";
  if (category.includes("Mechanical")) return "Lubrication";
  if (category.includes("Hydraulic")) return "Condition Check";
  if (category.includes("Vacuum")) return "Condition Check";
  return "Inspection";
}

function estimatePmTime(priority, category) {
  let base = 30;

  if (priority === "Critical") base = 75;
  else if (priority === "High") base = 60;
  else if (priority === "Medium") base = 45;

  if (category.includes("Heater")) base += 15;
  if (category.includes("Vacuum")) base += 15;
  if (category.includes("Cooling")) base += 10;

  return base;
}

function calculateSuggestionConfidence(item) {
  let confidence = 35;

  confidence += Math.min(30, item.failure_count * 6);
  confidence += Math.min(20, item.total_downtime_min / 20);

  if (item.trend_ratio >= 1.2) confidence += 10;
  if (item.pm_score >= 60) confidence += 10;

  return clamp(Math.round(confidence), 20, 95);
}

function calculateRemarkRisk(rows) {
  const remarks = rows
    .map(row => clean(row.remark))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  const highRiskWords = [
    "ชั่วคราว",
    "แก้ไขชั่วคราว",
    "รออะไหล่",
    "ไม่มีอะไหล่",
    "ต้องติดตาม",
    "ยังไม่จบ",
    "ควรเปลี่ยน",
    "ใช้ได้ชั่วคราว"
  ];

  const failureWords = [
    "รั่ว",
    "แตก",
    "หัก",
    "ไหม้",
    "ตัน",
    "ตะกรัน",
    "หลวม",
    "ติดขัด",
    "ค้าง",
    "alarm",
    "เสียงดัง",
    "สั่น",
    "ฝืด"
  ];

  highRiskWords.forEach(word => {
    if (remarks.includes(word.toLowerCase())) score += 5;
  });

  failureWords.forEach(word => {
    if (remarks.includes(word.toLowerCase())) score += 2;
  });

  return Math.min(score, 20);
}

function extractImportantRemarks(rows) {
  const remarks = rows
    .map(row => clean(row.remark))
    .filter(Boolean)
    .filter(text => text !== "-" && text.length >= 3);

  const importantKeywords = [
    "ชั่วคราว",
    "รออะไหล่",
    "ต้องติดตาม",
    "ยังไม่จบ",
    "รั่ว",
    "แตก",
    "หัก",
    "ไหม้",
    "ตัน",
    "ตะกรัน",
    "หลวม",
    "ติดขัด",
    "ค้าง",
    "alarm",
    "แก้ไขชั่วคราว",
    "ควรเปลี่ยน",
    "ไม่มีอะไหล่"
  ];

  const important = remarks.filter(text => {
    const lower = text.toLowerCase();
    return importantKeywords.some(key => lower.includes(key.toLowerCase()));
  });

  return [...new Set(important)].slice(0, 3);
}

function calculateRepairTrend(rows, fromDate, toDate) {
  const totalDays = Math.max(1, daysBetween(fromDate, toDate) + 1);
  const halfDays = Math.ceil(totalDays / 2);

  const midDate = new Date(toDate);
  midDate.setDate(toDate.getDate() - halfDays);

  const previousCount = rows.filter(row => {
    const d = parseDate(row.repair_date);
    return d >= fromDate && d < midDate;
  }).length;

  const recentCount = rows.filter(row => {
    const d = parseDate(row.repair_date);
    return d >= midDate && d <= toDate;
  }).length;

  let trendRatio = 0;

  if (previousCount > 0) trendRatio = recentCount / previousCount;
  else if (recentCount > 0) trendRatio = 2;

  let trendLabel = "ทรงตัว";

  if (trendRatio >= 2) trendLabel = "เพิ่มขึ้นแรง";
  else if (trendRatio >= 1.5) trendLabel = "เพิ่มขึ้น";
  else if (trendRatio >= 1.2) trendLabel = "เริ่มเพิ่มขึ้น";
  else if (trendRatio > 0 && trendRatio < 0.75) trendLabel = "ลดลง";
  else if (trendRatio === 0) trendLabel = "ยังไม่เห็นแนวโน้ม";

  return { previousCount, recentCount, trendRatio, trendLabel };
}

/* =========================================================
   UTILITY
========================================================= */

function switchTab(tabId) {
  let activeLabel = "Dashboard";

  els.tabs.forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);

    if (isActive) {
      activeLabel = btn.dataset.label || btn.innerText.trim();
    }
  });

  els.panels.forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  if (els.mobileMenuText) {
    els.mobileMenuText.textContent = activeLabel;
  }

  if (els.tabShell) {
    els.tabShell.classList.remove("open");
  }

  refreshIcons();
}
function updateOverdueViewOnly() {
  state.plans = state.plans.map(plan => {
    if (
      plan.status !== "Completed" &&
      plan.status !== "Cancelled" &&
      isPastDate(plan.planned_date)
    ) {
      return { ...plan, _effectiveStatus: "Overdue" };
    }

    return { ...plan, _effectiveStatus: plan.status };
  });
}

function getEffectiveStatus(plan) {
  return plan._effectiveStatus || plan.status || "Pending";
}

function isPastDate(value) {
  if (!value) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(`${value}T00:00:00`);

  return date < today;
}

function priorityScore(priority) {
  const map = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };

  return map[priority] || 0;
}

function deriveHistoryStatus(result, followUp) {
  if (followUp || result === "Need Follow-up" || result === "Need Spare Part") {
    return "Need Follow-up";
  }

  if (result === "Temporary Fixed") {
    return "Temporary Completed";
  }

  return "Completed";
}

function calculateTimeDiffMin(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin < startMin) endMin += 24 * 60;

  return Math.max(0, endMin - startMin);
}

function calculateNextDueDate(dateValue, frequency, intervalMonths = 1) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T00:00:00`);

  switch (frequency) {
    case "Daily":
      date.setDate(date.getDate() + 1);
      break;

    case "Weekly":
      date.setDate(date.getDate() + 7);
      break;

    case "Monthly":
      date.setMonth(date.getMonth() + Number(intervalMonths || 1));
      break;

    case "Quarterly":
      date.setMonth(date.getMonth() + Number(intervalMonths || 3));
      break;

    case "Yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;

    default:
      if (intervalMonths) date.setMonth(date.getMonth() + Number(intervalMonths));
      else return null;
  }

  return toDateInput(date);
}

function addMonthsToDate(dateValue, months) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 1));

  return toDateInput(date);
}

function statusBadge(status) {
  const cls = String(status || "Pending").replace(/\s+/g, "");

  return `<span class="badge ${cls}">${escapeHtml(status || "Pending")}</span>`;
}

function priorityBadge(priority) {
  return `<span class="badge ${escapeHtml(priority || "Medium")}">${escapeHtml(priority || "Medium")}</span>`;
}

function resultBadge(result) {
  const danger = ["Abnormal Found", "Need Spare Part", "Need Follow-up", "Temporary Fixed"].includes(result);
  const cls = danger ? "NG" : "Completed";

  return `<span class="badge ${cls}">${escapeHtml(result || "-")}</span>`;
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00`);
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const ms = endDate - startDate;

  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function sanitizeFileName(name) {
  return String(name || "image")
    .replace(/[^\w.\-ก-๙]/g, "_")
    .replace(/_+/g, "_");
}

function clean(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const n = Number(value || 0);

  return Number.isFinite(n) ? n : 0;
}

function sumBy(rows, fn) {
  return rows.reduce((sum, row) => sum + fn(row), 0);
}

function topCount(rows, keyFn) {
  const grouped = rows.reduce((acc, row) => {
    const key = keyFn(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];

  return {
    name: top ? top[0] : "-",
    count: top ? top[1] : 0
  };
}

function isFollowUp(value) {
  return ["ใช้งานได้ชั่วคราว", "ต้องติดตามต่อ", "รอซ่อมเพิ่มเติม"].includes(clean(value));
}

function makeTempId() {
  return `AI-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function includesAny(text, keywords) {
  return keywords.some(keyword => String(text).includes(String(keyword).toLowerCase()));
}

function uniqueChecklist(items) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getErrorMessage(err) {
  return err?.message || err?.hint || err?.details || JSON.stringify(err) || "Unknown error";
}

function setStatus(text, type) {
  els.systemStatus.textContent = text;

  if (type === "success") els.statusDot.style.background = "#10b981";
  else if (type === "error") els.statusDot.style.background = "#ef4444";
  else els.statusDot.style.background = "#f59e0b";
}

function toast(message, type = "success") {
  els.toast.className = `toast ${type}`;
  els.toast.textContent = message;

  setTimeout(() => {
    els.toast.className = "toast hidden";
  }, 4200);
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}
async function handleTechnicianCodeInput() {
  const code = clean(els.technicianCode.value);

  if (!code) {
    els.technicianName.value = "";
    return;
  }

  if (code.length < 3) return;

  const localTech = state.technicians.find(t =>
    clean(t.employee_code) === code
  );

  if (localTech) {
    els.technicianName.value =
      localTech.full_name ||
      localTech.technician_name ||
      localTech.name ||
      "";
    return;
  }

  try {
    const { data, error } = await state.sb
      .from("technicians")
      .select("*")
      .eq("employee_code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      els.technicianName.value =
        data.full_name ||
        data.technician_name ||
        data.name ||
        "";

      const alreadyExists = state.technicians.some(t =>
        clean(t.employee_code) === clean(data.employee_code)
      );

      if (!alreadyExists) {
        state.technicians.push(data);
      }
    } else {
      els.technicianName.value = "";
      toast("ไม่พบรหัสช่างนี้ในฐานข้อมูล", "warning");
    }
  } catch (err) {
    console.warn("Load technician failed:", err);
    toast("ดึงข้อมูลช่างไม่สำเร็จ", "error");
  }
}

function debounce(fn, delay = 300) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}