"use strict";

/* ============================================================
   PM Planner · MPR Smart Maintenance
   ------------------------------------------------------------
   ★ ตั้งค่าครั้งเดียว: วาง anon key ตัวเดียวกับที่ใช้ในแอป MPR
   ============================================================ */
const SUPABASE_URL = "https://hftlogubohbjiivcvkut.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGxvZ3Vib2hiamlpdmN2a3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDI2NDIsImV4cCI6MjA5OTY3ODY0Mn0.LFV6KC1PsdlmoMt4pBpon-rRnIl_CIajdKjGUEyu0XU";

"use strict";

let sb = null;

/* ---------- ค่าคงที่ ---------- */
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const FREQ_LABEL = {
  daily: "รายวัน", weekly: "รายสัปดาห์", monthly: "รายเดือน",
  bimonthly: "ราย 2 เดือน", quarterly: "ราย 3 เดือน",
  semiannual: "ราย 6 เดือน", annual: "รายปี"
};

const RESULT_LABEL = { ok: "ปกติ", fixed: "แก้ไขแล้ว", issue: "พบปัญหา" };
const RESULT_BADGE = { ok: "badge-done", fixed: "badge-warn", issue: "badge-late" };

const VIEW_TITLE = {
  dashboard: "แดชบอร์ด", board: "แผนประจำปี", due: "งานครบกำหนด",
  plans: "แผน PM", machines: "เครื่องจักร", history: "ประวัติ"
};

/* ---------- สถานะ ---------- */
const state = {
  depts: [], machines: [], plans: [], schedule: [],
  year: new Date().getFullYear(),
  dept: "all", view: "dashboard",
  dueRange: "overdue", histResult: "all",
  user: localStorage.getItem("pm_user") || "",
  userCode: localStorage.getItem("pm_user_code") || "",
  editScheduleId: null, editPlanId: null
};

/* ---------- ตัวช่วยทั่วไป ---------- */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(msg, isErr) {
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  $("toastWrap").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------- ตัวช่วยวันที่ (ISO yyyy-mm-dd, เที่ยงวันกัน timezone เพี้ยน) ---------- */
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function toISO(dt) {
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
function todayISO() { return toISO(new Date()); }
function addDaysISO(iso, n) {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function monthOf(iso) { return parseISO(iso).getMonth(); }

/* ---------- ดัชนีข้อมูล ---------- */
function deptById(id) { return state.depts.find((d) => d.id === id); }
function machineById(id) { return state.machines.find((m) => m.id === id); }
function planById(id) { return state.plans.find((p) => p.id === id); }

function planContext(planId) {
  const plan = planById(planId);
  const machine = plan ? machineById(plan.machine_id) : null;
  const dept = machine ? deptById(machine.dept_id) : null;
  return { plan, machine, dept };
}

function machineLabel(m) {
  if (!m) return "—";
  return (m.code ? m.code + " · " : "") + m.name;
}

/* กรองรายการกำหนดการตามแผนกที่เลือกใน topbar */
function scopedSchedule() {
  return state.schedule.filter((s) => {
    const { dept } = planContext(s.plan_id);
    if (!dept) return false;
    return state.dept === "all" || dept.id === state.dept;
  });
}

/* ============================================================
   โหลดข้อมูล
   ============================================================ */
async function loadAll() {
  if (!sb) return;
  try {
    const yStart = `${state.year}-01-01`;
    const yEnd = `${state.year}-12-31`;
    const [d, m, p, s] = await Promise.all([
      sb.from("departments").select("*").eq("is_active", true).order("sort_order"),
      sb.from("machines").select("*").eq("is_active", true).order("machine_name"),
      sb.from("pm_plans").select("*").order("created_at"),
      sb.from("pm_schedule").select("*").gte("due_date", yStart).lte("due_date", yEnd).order("due_date")
    ]);
    for (const r of [d, m, p, s]) if (r.error) throw r.error;

    /* normalize แผนกของ MPR → shape เดิมของแอป (id, name, code) */
    state.depts = (d.data || []).map((x) => ({
      id: x.id, code: x.dept_code, name: x.dept_name,
      sort: x.sort_order, is_active: x.is_active
    }));
    const deptByCode = {};
    state.depts.forEach((dp) => { deptByCode[dp.code] = dp; });

    /* normalize เครื่องจักรของ MPR → shape เดิม (code, name, line, dept_id=uuid ของแผนก) */
    state.machines = (m.data || []).map((x) => ({
      id: x.id,
      code: x.machine_no || x.legacy_machine_code || "",
      name: x.machine_name,
      line: x.production_line || x.area || "",
      dept_id: deptByCode[x.department_code]?.id || null,
      dept_code: x.department_code,
      is_active: x.is_active
    }));

    state.plans = p.data; state.schedule = s.data;
    renderDeptOptions();
    renderAll();
  } catch (err) {
    console.error(err);
    toast("โหลดข้อมูลไม่สำเร็จ: " + (err.message || err), true);
  }
}

/* ============================================================
   สร้างกำหนดการรายปีจากแผน
   ============================================================ */
function generateDatesForPlan(plan, year) {
  const dates = [];
  const yStartD = parseISO(`${year}-01-01`);
  const yEndD = parseISO(`${year}-12-31`);
  let d = parseISO(plan.start_date);
  if (d > yEndD) return dates;

  if (plan.frequency === "daily" || plan.frequency === "weekly") {
    const step = plan.frequency === "daily" ? 1 : 7;
    while (d < yStartD) d.setDate(d.getDate() + step);
    while (d <= yEndD) { dates.push(toISO(d)); d.setDate(d.getDate() + step); }
  } else {
    const stepM = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, annual: 12 }[plan.frequency];
    const anchorDay = parseISO(plan.start_date).getDate();
    let y = d.getFullYear(), mo = d.getMonth();
    while (y < year) { mo += stepM; y += Math.floor(mo / 12); mo %= 12; }
    while (y === year) {
      const lastDay = new Date(y, mo + 1, 0).getDate();
      const occ = new Date(y, mo, Math.min(anchorDay, lastDay), 12);
      if (occ >= parseISO(plan.start_date)) dates.push(toISO(occ));
      mo += stepM; y += Math.floor(mo / 12); mo %= 12;
    }
  }
  return dates;
}

async function generateSchedule() {
  if (!requireDb()) return;
  const activePlans = state.plans.filter((p) => {
    const m = machineById(p.machine_id);
    return p.is_active && m && m.is_active;
  });
  if (!activePlans.length) { toast("ยังไม่มีแผน PM — เพิ่มแผนก่อนครับ", true); return; }

  const rows = [];
  for (const p of activePlans) {
    for (const due of generateDatesForPlan(p, state.year)) {
      rows.push({ plan_id: p.id, due_date: due });
    }
  }
  if (!rows.length) { toast("ไม่มีรอบที่ต้องสร้างในปี " + state.year, true); return; }

  try {
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await sb.from("pm_schedule")
        .upsert(rows.slice(i, i + 400), { onConflict: "plan_id,due_date", ignoreDuplicates: true });
      if (error) throw error;
    }
    toast(`สร้างตารางปี ${state.year} เรียบร้อย (${rows.length} รอบ — รอบที่มีอยู่แล้วไม่ถูกเขียนทับ)`);
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("สร้างตารางไม่สำเร็จ: " + (err.message || err), true);
  }
}

/* ============================================================
   เรนเดอร์รวม
   ============================================================ */
function renderAll() {
  renderNavBadge();
  renderDashboard();
  renderBoard();
  renderDue();
  renderPlans();
  renderMachines();
  renderHistory();
}

function renderDeptOptions() {
  const opts = ['<option value="all">ทุกแผนก</option>']
    .concat(state.depts.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`));
  const sel = $("deptFilter");
  const cur = state.dept;
  sel.innerHTML = opts.join("");
  sel.value = state.depts.some((d) => d.id === cur) ? cur : "all";
  state.dept = sel.value;
  refreshSelect(sel);
}

function renderNavBadge() {
  const today = todayISO();
  const n = state.schedule.filter((s) => s.status === "planned" && s.due_date < today).length;
  const b = $("navDueBadge");
  b.textContent = n;
  b.classList.toggle("hidden", n === 0);
}

/* ============================================================
   แดชบอร์ด
   ============================================================ */
function complianceOf(items) {
  const today = todayISO();
  const dueToDate = items.filter((s) => s.due_date <= today && s.status !== "skipped");
  const done = dueToDate.filter((s) => s.status === "done");
  return { pct: dueToDate.length ? Math.round((done.length / dueToDate.length) * 100) : null,
           done: done.length, due: dueToDate.length };
}

function renderDashboard() {
  const items = scopedSchedule();
  const today = todayISO();
  const week7 = addDaysISO(today, 7);
  const day14 = addDaysISO(today, 14);
  const curMonth = today.slice(0, 7);

  const c = complianceOf(items);
  $("kpiCompliance").textContent = c.pct === null ? "—" : c.pct;
  $("kpiComplianceHint").textContent = c.due
    ? `ทำแล้ว ${c.done} จาก ${c.due} รอบที่ครบกำหนดแล้วในปี ${state.year}`
    : "ยังไม่มีรอบที่ครบกำหนดในปีนี้";

  /* ring gauge: เส้นรอบวง r=52 → C = 2πr ≈ 326.7 */
  const ringC = 2 * Math.PI * 52;
  const ring = $("heroRing");
  if (ring) {
    ring.style.strokeDasharray = ringC.toFixed(1);
    ring.style.strokeDashoffset = (ringC * (1 - (c.pct ?? 0) / 100)).toFixed(1);
  }

  const overdue = items.filter((s) => s.status === "planned" && s.due_date < today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const dueWeek = items.filter((s) => s.status === "planned" && s.due_date >= today && s.due_date <= week7);
  const monthDone = items.filter((s) => s.status === "done" && (s.done_date || "").slice(0, 7) === curMonth);

  $("kpiOverdue").textContent = overdue.length;
  $("kpiWeek").textContent = dueWeek.length;
  $("kpiMonthDone").textContent = monthDone.length;

  /* สถิติย่อในแถบ hero */
  const totalPlanned = items.filter((s) => s.status !== "skipped").length;
  const totalDone = items.filter((s) => s.status === "done").length;
  const sideStats = [
    ["รอบทั้งปี", totalPlanned],
    ["ทำแล้วสะสม", totalDone],
    ["เครื่องจักร", state.machines.filter((m) => m.is_active && (state.dept === "all" || m.dept_id === state.dept)).length]
  ];
  const hs = $("heroSideStats");
  if (hs) hs.innerHTML = sideStats.map(([label, val]) =>
    `<div class="hero-stat"><div class="hs-val">${val}</div><div class="hs-label">${label}</div></div>`).join("");

  /* แผนกละแท่ง */
  const bars = state.depts.map((d) => {
    const dItems = state.schedule.filter((s) => planContext(s.plan_id).dept?.id === d.id);
    const dc = complianceOf(dItems);
    const pct = dc.pct ?? 0;
    return `<div class="dept-bar-row">
      <div class="dept-bar-top">
        <span class="dept-bar-name">${esc(d.name)}</span>
        <span class="dept-bar-val">${dc.pct === null ? "ยังไม่มีงาน" : dc.done + "/" + dc.due + " · " + pct + "%"}</span>
      </div>
      <div class="dept-bar-track"><div class="dept-bar-fill${pct < 60 && dc.pct !== null ? " low" : ""}" style="width:${pct}%"></div></div>
    </div>`;
  });
  $("deptBars").innerHTML = bars.join("") || '<div class="empty-note">ยังไม่มีข้อมูล</div>';

  /* รายการเกินกำหนด */
  $("overdueList").innerHTML = overdue.slice(0, 8).map(miniItemHTML).join("")
    || '<div class="empty-note">ไม่มีงานเกินกำหนด 🎉</div>';

  /* ใกล้ครบกำหนด */
  const soon = items.filter((s) => s.status === "planned" && s.due_date >= today && s.due_date <= day14)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  $("dueSoonList").innerHTML = soon.slice(0, 8).map(miniItemHTML).join("")
    || '<div class="empty-note">ไม่มีงานใน 14 วันข้างหน้า</div>';
}

function miniItemHTML(s) {
  const { plan, machine } = planContext(s.plan_id);
  const late = s.status === "planned" && s.due_date < todayISO();
  return `<div class="mini-item">
    <i class="dot ${late ? "dot-late" : "dot-plan"}"></i>
    <div class="mini-main">
      <div class="mini-title">${esc(plan?.title || "—")}</div>
      <div class="mini-sub">${esc(machineLabel(machine))}</div>
    </div>
    <div class="mini-date${late ? " late" : ""}">${fmtDate(s.due_date)}</div>
  </div>`;
}

/* ============================================================
   แผนประจำปี (บอร์ดปี)
   ============================================================ */
function renderBoard() {
  const wrap = $("boardWrap");
  const today = todayISO();

  const visiblePlans = state.plans.filter((p) => {
    const m = machineById(p.machine_id);
    if (!p.is_active || !m || !m.is_active) return false;
    return state.dept === "all" || m.dept_id === state.dept;
  });

  if (!visiblePlans.length) {
    wrap.innerHTML = `<div class="board-empty">ยังไม่มีแผน PM ในมุมมองนี้<br>
      เริ่มจากเพิ่มเครื่องจักร → เพิ่มแผน PM → กด "สร้างตารางจากแผน"</div>`;
    return;
  }

  /* จัดกลุ่มกำหนดการ: plan_id → เดือน → รายการ */
  const byPlan = {};
  for (const s of state.schedule) {
    (byPlan[s.plan_id] ??= Array.from({ length: 12 }, () => []))[monthOf(s.due_date)].push(s);
  }

  /* เรียงตามแผนก → เครื่อง */
  const deptGroups = state.depts
    .filter((d) => state.dept === "all" || d.id === state.dept)
    .map((d) => ({
      dept: d,
      plans: visiblePlans
        .filter((p) => machineById(p.machine_id)?.dept_id === d.id)
        .sort((a, b) => machineLabel(machineById(a.machine_id)).localeCompare(machineLabel(machineById(b.machine_id)), "th"))
    }))
    .filter((g) => g.plans.length);

  let html = `<table class="board-table"><thead><tr><th class="col-task">เครื่อง / งาน PM</th>`;
  html += THAI_MONTHS.map((m) => `<th>${m}</th>`).join("");
  html += `</tr></thead><tbody>`;

  for (const g of deptGroups) {
    html += `<tr class="board-dept-row"><td colspan="13">${esc(g.dept.name)}</td></tr>`;
    for (const p of g.plans) {
      const m = machineById(p.machine_id);
      const months = byPlan[p.id] || Array.from({ length: 12 }, () => []);
      html += `<tr><td class="cell-task">
        <div class="bt-title">${esc(p.title)}</div>
        <div class="bt-sub"><span class="mono">${esc(machineLabel(m))}</span> · ${FREQ_LABEL[p.frequency]}</div>
      </td>`;
      for (let mo = 0; mo < 12; mo++) {
        const list = months[mo];
        if (!list.length) { html += `<td class="board-cell"></td>`; continue; }
        const doneN = list.filter((s) => s.status === "done").length;
        const lateN = list.filter((s) => s.status === "planned" && s.due_date < today).length;
        let inner;
        if (list.length <= 4) {
          inner = `<span class="cell-dots">` + list.map((s) => {
            let cls = "dot-plan";
            if (s.status === "done") cls = "dot-done";
            else if (s.status === "skipped") cls = "dot-skip";
            else if (s.due_date < today) cls = "dot-late";
            return `<i class="dot ${cls}"></i>`;
          }).join("") + `</span>`;
        } else {
          const cls = lateN ? "c-late" : (doneN === list.length ? "c-done" : "c-plan");
          inner = `<span class="cell-count ${cls}">${doneN}/${list.length}</span>`;
        }
        html += `<td class="board-cell has-items" data-plan="${p.id}" data-month="${mo}">${inner}</td>`;
      }
      html += `</tr>`;
    }
  }
  html += `</tbody></table>`;
  wrap.innerHTML = html;

  $$("#boardWrap .board-cell.has-items").forEach((cell) => {
    cell.addEventListener("click", () => openMonthModal(cell.dataset.plan, Number(cell.dataset.month)));
  });
}

function openMonthModal(planId, month) {
  const { plan, machine } = planContext(planId);
  $("monthModalTitle").textContent =
    `${plan?.title || ""} · ${THAI_MONTHS[month]} ${state.year}`;
  const items = state.schedule
    .filter((s) => s.plan_id === planId && monthOf(s.due_date) === month)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  $("monthList").innerHTML = items.map((s) => `
    <div class="mini-item">
      ${statusBadge(s)}
      <div class="mini-main">
        <div class="mini-title">${fmtDate(s.due_date)}</div>
        <div class="mini-sub">${esc(machineLabel(machine))}${s.done_by ? " · ทำโดย " + esc(s.done_by) : ""}</div>
      </div>
      <button class="btn ghost" data-sched="${s.id}">${s.status === "planned" ? "บันทึกผล" : "ดู / แก้ไข"}</button>
    </div>`).join("");
  $$("#monthList [data-sched]").forEach((b) =>
    b.addEventListener("click", () => { closeModal("monthModal"); openDoneModal(b.dataset.sched); }));
  openModal("monthModal");
}

function statusBadge(s) {
  if (s.status === "done") return `<span class="badge badge-done">ทำแล้ว</span>`;
  if (s.status === "skipped") return `<span class="badge badge-skip">ข้าม</span>`;
  if (s.due_date < todayISO()) return `<span class="badge badge-late">เกินกำหนด</span>`;
  return `<span class="badge badge-plan">ตามแผน</span>`;
}

/* ============================================================
   รายงานแผน PM ประจำปี (Annual PM Plan) เครื่อง × 12 เดือน
   ============================================================ */

/* รวบรวมข้อมูลตามแผนกที่เลือก → โครงสร้างพร้อมออกรายงาน
   แต่ละเซลล์เดือน: "" ว่าง | "P" ตามแผน | "P/late" เกินกำหนด
                    | "D" ทำแล้ว | "S" ข้าม  (ถ้าหลายรอบ รวมนับ) */
function buildReportModel() {
  const today = todayISO();

  const byPlanMonth = {};
  for (const s of state.schedule) {
    ((byPlanMonth[s.plan_id] ??= {})[monthOf(s.due_date)] ??= []).push(s);
  }

  const deptGroups = state.depts
    .filter((d) => state.dept === "all" || d.id === state.dept)
    .map((d) => {
      const plans = state.plans
        .filter((p) => {
          const m = machineById(p.machine_id);
          return p.is_active && m && m.is_active && m.dept_id === d.id;
        })
        .sort((a, b) => machineLabel(machineById(a.machine_id))
          .localeCompare(machineLabel(machineById(b.machine_id)), "th"));

      const rows = plans.map((p) => {
        const m = machineById(p.machine_id);
        const cells = Array.from({ length: 12 }, (_, mo) => {
          const list = (byPlanMonth[p.id] || {})[mo] || [];
          if (!list.length) return { mark: "", done: 0, total: 0, late: 0 };
          const done = list.filter((s) => s.status === "done").length;
          const skip = list.filter((s) => s.status === "skipped").length;
          const late = list.filter((s) => s.status === "planned" && s.due_date < today).length;
          let mark;
          if (done === list.length) mark = "D";
          else if (skip === list.length) mark = "S";
          else if (late) mark = "L";
          else mark = "P";
          return { mark, done, total: list.length, late, skip };
        });
        return { plan: p, machine: m, cells };
      });

      return { dept: d, rows };
    })
    .filter((g) => g.rows.length);

  return { deptGroups, year: state.year, deptScope: state.dept };
}

function openReportModal() {
  const model = buildReportModel();
  if (!model.deptGroups.length) {
    toast('ยังไม่มีแผน PM ในมุมมองนี้ — เพิ่มแผนและกด "สร้างตารางจากแผน" ก่อนครับ', true);
    return;
  }
  if (state.user && !$("repPreparedBy").value) $("repPreparedBy").value = state.user;
  openModal("reportModal");
}

/* ---------- ตัวช่วยหัวรายงาน ---------- */
function reportMeta() {
  const deptName = state.dept === "all" ? "ทุกแผนก" : (deptById(state.dept)?.name || "");
  return {
    company: ($("repCompany").value || "").trim() || "MPR Smart Maintenance",
    preparedBy: ($("repPreparedBy").value || "").trim(),
    approvedBy: ($("repApprovedBy").value || "").trim(),
    docNo: ($("repDocNo").value || "").trim(),
    deptName,
    year: state.year,
    yearBE: state.year + 543,
    printedAt: fmtDate(todayISO())
  };
}

const CELL_TEXT = { D: "ทำ", P: "P", L: "P", S: "งด", "": "" };

/* ---------- ออกเป็นหน้าพิมพ์ / PDF ---------- */
function exportReportPrint() {
  const model = buildReportModel();
  const meta = reportMeta();

  const monthHead = THAI_MONTHS.map((m) => `<th class="mcol">${m}</th>`).join("");

  let bodyRows = "";
  for (const g of model.deptGroups) {
    bodyRows += `<tr class="deptrow"><td class="deptcell" colspan="16">แผนก ${esc(g.dept.name)}</td></tr>`;
    g.rows.forEach((r, i) => {
      const cells = r.cells.map((c) => {
        if (!c.mark) return `<td class="mcell"></td>`;
        const cls = c.mark === "D" ? "c-done" : c.mark === "L" ? "c-late" : c.mark === "S" ? "c-skip" : "c-plan";
        const label = c.mark === "D"
          ? (c.total > 1 ? `● ${c.done}/${c.total}` : "●")
          : c.mark === "S" ? "งด"
          : (c.total > 1 ? `○ ${c.total}` : "○");
        return `<td class="mcell ${cls}">${label}</td>`;
      }).join("");
      bodyRows += `<tr>
        <td class="idx">${i + 1}</td>
        <td class="mc">${esc(machineLabel(r.machine))}</td>
        <td class="tk">${esc(r.plan.title)}</td>
        <td class="fq">${FREQ_LABEL[r.plan.frequency]}</td>
        ${cells}
      </tr>`;
    });
  }

  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>แผน PM ประจำปี ${meta.year} · ${esc(meta.deptName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Sarabun", sans-serif; color: #1C2430; font-size: 11px; padding: 18mm 12mm; }
  .rpt-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2B5C8A; padding-bottom: 10px; margin-bottom: 6px; }
  .rpt-company { font-size: 17px; font-weight: 700; color: #2B5C8A; }
  .rpt-title { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .rpt-sub { font-size: 11px; color: #66707E; margin-top: 2px; }
  .rpt-meta { text-align: right; font-size: 10.5px; color: #66707E; line-height: 1.7; }
  .rpt-meta b { color: #1C2430; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th, td { border: 1px solid #B9C1CC; padding: 4px 5px; text-align: center; vertical-align: middle; }
  thead th { background: #EAF1F7; font-weight: 600; font-size: 10px; color: #2B5C8A; }
  th.mcol { width: 5.1%; }
  td.idx { width: 3%; color: #66707E; }
  td.mc { text-align: left; width: 15%; font-weight: 600; }
  td.tk { text-align: left; width: 24%; }
  td.fq { width: 9%; color: #66707E; }
  tr.deptrow td { background: #F0F4F8; text-align: left; font-weight: 700; color: #2B5C8A; padding: 5px 8px; }
  td.mcell { font-weight: 600; }
  td.c-done { color: #2F7D5B; background: #EAF6EF; }
  td.c-plan { color: #2B5C8A; }
  td.c-late { color: #A8402F; background: #FBEEEB; }
  td.c-skip { color: #9AA3B0; }
  .legend { display: flex; gap: 20px; margin-top: 10px; font-size: 10px; color: #66707E; }
  .legend b { color: #1C2430; font-weight: 600; }
  .signs { display: flex; justify-content: flex-end; gap: 60px; margin-top: 34px; }
  .sign { text-align: center; font-size: 10.5px; width: 180px; }
  .sign .line { border-top: 1px dotted #66707E; margin: 34px 8px 5px; }
  .sign .role { color: #66707E; }
  .foot { margin-top: 14px; font-size: 9px; color: #9AA3B0; text-align: center; border-top: 1px solid #E3E6EB; padding-top: 6px; }
  @media print { body { padding: 10mm; } @page { size: A4 landscape; margin: 8mm; } }
</style></head><body>
  <div class="rpt-head">
    <div>
      <div class="rpt-company">${esc(meta.company)}</div>
      <div class="rpt-title">แผนการบำรุงรักษาเชิงป้องกันประจำปี (Annual Preventive Maintenance Plan)</div>
      <div class="rpt-sub">แผนก: ${esc(meta.deptName)} · ประจำปี พ.ศ. ${meta.yearBE} (ค.ศ. ${meta.year})</div>
    </div>
    <div class="rpt-meta">
      ${meta.docNo ? `เอกสารเลขที่ <b>${esc(meta.docNo)}</b><br>` : ""}
      วันที่พิมพ์ <b>${esc(meta.printedAt)}</b>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>ลำดับ</th><th>เครื่องจักร</th><th>งาน PM</th><th>ความถี่</th>${monthHead}
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="legend">
    <span>สัญลักษณ์:</span>
    <span><b>○</b> ตามแผน</span>
    <span><b style="color:#2F7D5B">●</b> ทำแล้ว</span>
    <span><b style="color:#A8402F">P (แดง)</b> เกินกำหนด</span>
    <span><b>งด</b> ข้ามรอบ</span>
    <span>ตัวเลข = จำนวนรอบในเดือนนั้น</span>
  </div>
  <div class="signs">
    <div class="sign"><div class="line"></div>( ${esc(meta.preparedBy || "………………………")} )<br><span class="role">ผู้จัดทำ</span></div>
    <div class="sign"><div class="line"></div>( ${esc(meta.approvedBy || "………………………")} )<br><span class="role">ผู้อนุมัติ</span></div>
  </div>
  <div class="foot">สร้างจากระบบ PM Planner · MPR Smart Maintenance</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { toast("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต pop-up แล้วลองอีกครั้ง", true); return; }
  w.document.write(html);
  w.document.close();
  closeModal("reportModal");
}

/* ---------- ออกเป็น Excel (.xlsx) ---------- */
function exportReportExcel() {
  if (typeof XLSX === "undefined") {
    toast("ไลบรารี Excel ยังโหลดไม่เสร็จ — ลองอีกครั้งในอีกสักครู่", true);
    return;
  }
  const model = buildReportModel();
  const meta = reportMeta();

  const aoa = [];
  aoa.push([meta.company]);
  aoa.push(["แผนการบำรุงรักษาเชิงป้องกันประจำปี (Annual PM Plan)"]);
  aoa.push([`แผนก: ${meta.deptName}`, "", "", "", `ปี พ.ศ. ${meta.yearBE} (ค.ศ. ${meta.year})`,
            "", "", "", meta.docNo ? `เอกสารเลขที่: ${meta.docNo}` : "",
            "", "", "", "", "", "", `วันที่พิมพ์: ${meta.printedAt}`]);
  aoa.push([]);
  const header = ["ลำดับ", "เครื่องจักร", "งาน PM", "ความถี่", ...THAI_MONTHS];
  aoa.push(header);

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } }
  ];

  let r = 5;
  for (const g of model.deptGroups) {
    aoa.push([`แผนก ${g.dept.name}`]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 15 } });
    r++;
    g.rows.forEach((row, i) => {
      const cells = row.cells.map((c) => {
        if (!c.mark) return "";
        const sym = c.mark === "D" ? "●" : c.mark === "S" ? "–" : c.mark === "L" ? "✕" : "○";
        return c.total > 1 ? `${sym} ${c.mark === "D" ? c.done + "/" + c.total : c.total}` : sym;
      });
      aoa.push([i + 1, machineLabel(row.machine), row.plan.title,
                FREQ_LABEL[row.plan.frequency], ...cells]);
      r++;
    });
  }

  /* แถวคำอธิบายสัญลักษณ์ท้ายตาราง */
  aoa.push([]);
  aoa.push(["สัญลักษณ์:", "● ทำแล้ว", "○ ตามแผน", "✕ เกินกำหนด", "– งดรอบนี้",
            "ตัวเลข = จำนวนรอบในเดือน (ทำ/ทั้งหมด)"]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 30 }, { wch: 12 },
    ...Array.from({ length: 12 }, () => ({ wch: 7 }))];

  const wb = XLSX.utils.book_new();
  const sheetName = ("PM " + meta.year + " " + meta.deptName).slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fname = `PM_Plan_${meta.deptName.replace(/[^\w\u0E00-\u0E7F]+/g, "")}_${meta.year}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast("ดาวน์โหลด Excel เรียบร้อย ✓");
  closeModal("reportModal");
}

/* ============================================================
   งานครบกำหนด
   ============================================================ */
function renderDue() {
  const today = todayISO();
  const week7 = addDaysISO(today, 7);
  const curMonth = today.slice(0, 7);
  let items = scopedSchedule().filter((s) => s.status === "planned");

  if (state.dueRange === "overdue") items = items.filter((s) => s.due_date < today);
  else if (state.dueRange === "week") items = items.filter((s) => s.due_date >= today && s.due_date <= week7);
  else if (state.dueRange === "month") items = items.filter((s) => s.due_date.slice(0, 7) === curMonth);

  items.sort((a, b) => a.due_date.localeCompare(b.due_date));

  $("dueList").innerHTML = items.map((s) => {
    const { plan, machine, dept } = planContext(s.plan_id);
    const late = s.due_date < today;
    return `<div class="due-item${late ? " late" : ""}">
      <div class="due-main">
        <div class="due-title">${esc(plan?.title || "—")}</div>
        <div class="due-sub"><span class="mono">${esc(machineLabel(machine))}</span> · ${esc(dept?.name || "")} · ${FREQ_LABEL[plan?.frequency] || ""}${plan?.assignee ? " · " + esc(plan.assignee) : ""}</div>
      </div>
      ${statusBadge(s)}
      <div class="due-date"><div class="d1">${fmtDate(s.due_date)}</div>
        <div class="d2">${late ? "เลยมา " + daysBetween(s.due_date, today) + " วัน" : "อีก " + daysBetween(today, s.due_date) + " วัน"}</div></div>
      <button class="btn primary" data-sched="${s.id}">บันทึกผล</button>
    </div>`;
  }).join("") || `<div class="empty-note">ไม่มีงานในช่วงนี้ ${state.dueRange === "overdue" ? "— เยี่ยมมาก ไม่มีงานค้าง 🎉" : ""}</div>`;

  $$("#dueList [data-sched]").forEach((b) =>
    b.addEventListener("click", () => openDoneModal(b.dataset.sched)));
}

function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000);
}

/* ============================================================
   บันทึกผล PM
   ============================================================ */
function openDoneModal(scheduleId) {
  const s = state.schedule.find((x) => x.id === scheduleId);
  if (!s) return;
  state.editScheduleId = scheduleId;
  const { plan, machine, dept } = planContext(s.plan_id);

  $("doneInfo").innerHTML = `<b>${esc(plan?.title || "")}</b><br>
    <span class="mono">${esc(machineLabel(machine))} · ${esc(dept?.name || "")} · กำหนด ${fmtDate(s.due_date)}</span>`;

  $("doneDate").value = s.done_date || todayISO();
  $("doneBy").value = s.done_by || state.user;
  $("doneResult").value = s.result || "ok";
  refreshSelect($("doneResult"));
  $("doneNote").value = s.note || "";

  const checklist = Array.isArray(plan?.checklist) ? plan.checklist : [];
  const prev = s.checklist_result || {};
  if (checklist.length) {
    $("doneChecklistWrap").classList.remove("hidden");
    $("doneChecklist").innerHTML = checklist.map((c, i) => `
      <label class="ck-item"><input type="checkbox" data-ck="${i}" ${prev[c] ? "checked" : ""}>
        <span>${esc(c)}</span></label>`).join("");
  } else {
    $("doneChecklistWrap").classList.add("hidden");
    $("doneChecklist").innerHTML = "";
  }
  openModal("doneModal");
}

async function saveDone() {
  if (!requireDb()) return;
  const s = state.schedule.find((x) => x.id === state.editScheduleId);
  if (!s) return;
  const doneDate = $("doneDate").value;
  const doneBy = $("doneBy").value.trim();
  if (!doneDate || !doneBy) { toast("กรอกวันที่ทำและผู้ทำก่อนครับ", true); return; }

  const { plan } = planContext(s.plan_id);
  const checklist = Array.isArray(plan?.checklist) ? plan.checklist : [];
  const ckResult = {};
  $$("#doneChecklist [data-ck]").forEach((cb) => {
    ckResult[checklist[Number(cb.dataset.ck)]] = cb.checked;
  });

  try {
    const { error } = await sb.from("pm_schedule").update({
      status: "done", done_date: doneDate, done_by: doneBy,
      result: $("doneResult").value, note: $("doneNote").value.trim() || null,
      checklist_result: checklist.length ? ckResult : null
    }).eq("id", s.id);
    if (error) throw error;
    closeModal("doneModal");
    toast("บันทึกผล PM เรียบร้อย ✓");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("บันทึกไม่สำเร็จ: " + (err.message || err), true);
  }
}

async function skipItem() {
  if (!requireDb()) return;
  const s = state.schedule.find((x) => x.id === state.editScheduleId);
  if (!s) return;
  if (!confirm("ยืนยันข้ามรอบนี้? (จะไม่ถูกนับเป็นงานค้าง)")) return;
  try {
    const { error } = await sb.from("pm_schedule").update({
      status: "skipped", note: $("doneNote").value.trim() || null,
      done_date: null, done_by: null, result: null, checklist_result: null
    }).eq("id", s.id);
    if (error) throw error;
    closeModal("doneModal");
    toast("ข้ามรอบนี้แล้ว");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("บันทึกไม่สำเร็จ: " + (err.message || err), true);
  }
}

async function revertItem(scheduleId) {
  if (!requireDb()) return;
  if (!confirm("ยกเลิกผลรอบนี้และคืนสถานะเป็น 'ตามแผน'?")) return;
  try {
    const { error } = await sb.from("pm_schedule").update({
      status: "planned", done_date: null, done_by: null,
      result: null, note: null, checklist_result: null
    }).eq("id", scheduleId);
    if (error) throw error;
    toast("คืนสถานะเรียบร้อย");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("ทำรายการไม่สำเร็จ: " + (err.message || err), true);
  }
}

/* ============================================================
   แผน PM (CRUD)
   ============================================================ */
function renderPlans() {
  const rows = state.plans.filter((p) => {
    const m = machineById(p.machine_id);
    if (!p.is_active || !m || !m.is_active) return false;
    return state.dept === "all" || m.dept_id === state.dept;
  });

  $("plansBody").innerHTML = rows.map((p) => {
    const m = machineById(p.machine_id);
    const d = m ? deptById(m.dept_id) : null;
    return `<tr>
      <td><div>${esc(m?.name || "—")}</div><div class="sub"><span class="mono">${esc(m?.code || "")}</span> ${esc(d?.name || "")}</div></td>
      <td>${esc(p.title)}${Array.isArray(p.checklist) && p.checklist.length ? `<div class="sub">เช็คลิสต์ ${p.checklist.length} ข้อ</div>` : ""}</td>
      <td><span class="badge badge-plan">${FREQ_LABEL[p.frequency]}</span></td>
      <td><span class="mono">${fmtDate(p.start_date)}</span></td>
      <td>${p.std_minutes ? p.std_minutes + " นาที" : "—"}</td>
      <td>${esc(p.assignee || "—")}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-plan="${p.id}" title="แก้ไข">✎</button>
        <button class="icon-btn danger" data-del-plan="${p.id}" title="ปิดใช้งานแผน">✕</button>
      </div></td></tr>`;
  }).join("") || `<tr><td colspan="7"><div class="empty-note">ยังไม่มีแผน PM — กด "+ เพิ่มแผน PM" เพื่อเริ่ม</div></td></tr>`;

  /* การ์ดสำหรับมือถือ */
  $("plansCards").innerHTML = rows.map((p) => {
    const m = machineById(p.machine_id);
    const d = m ? deptById(m.dept_id) : null;
    return `<div class="data-card">
      <div class="data-card-head">
        <div class="data-card-title">${esc(p.title)}
          <div class="sub"><span class="mono">${esc(machineLabel(m))}</span> · ${esc(d?.name || "")}</div></div>
        <span class="badge badge-plan">${FREQ_LABEL[p.frequency]}</span>
      </div>
      <div class="data-card-meta">
        <div>เริ่ม <b class="mono">${fmtDate(p.start_date)}</b></div>
        <div>เวลา <b>${p.std_minutes ? p.std_minutes + " นาที" : "—"}</b></div>
        <div>ผู้รับผิดชอบ <b>${esc(p.assignee || "—")}</b></div>
        ${Array.isArray(p.checklist) && p.checklist.length ? `<div>เช็คลิสต์ <b>${p.checklist.length} ข้อ</b></div>` : ""}
      </div>
      <div class="data-card-actions">
        <button class="btn ghost" data-edit-plan="${p.id}">แก้ไข</button>
        <button class="btn danger-ghost" data-del-plan="${p.id}">ปิดใช้งาน</button>
      </div>
    </div>`;
  }).join("") || `<div class="empty-note">ยังไม่มีแผน PM — กด "+ เพิ่มแผน PM" เพื่อเริ่ม</div>`;

  $$('[data-edit-plan]').forEach((b) =>
    b.addEventListener("click", () => openPlanModal(b.dataset.editPlan)));
  $$('[data-del-plan]').forEach((b) =>
    b.addEventListener("click", () => deactivatePlan(b.dataset.delPlan)));
}

function fillDeptSelect(sel, selectedId) {
  sel.innerHTML = state.depts.map((d) =>
    `<option value="${d.id}" ${d.id === selectedId ? "selected" : ""}>${esc(d.name)}</option>`).join("");
  refreshSelect(sel);
}

function fillMachineSelect(deptId, selectedId) {
  const list = state.machines.filter((m) => m.is_active && m.dept_id === deptId);
  $("planMachine").innerHTML = list.map((m) =>
    `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${esc(machineLabel(m))}</option>`).join("")
    || `<option value="">— ยังไม่มีเครื่องในแผนกนี้ —</option>`;
  refreshSelect($("planMachine"));
}

function openPlanModal(planId) {
  if (!state.depts.length) { toast("โหลดข้อมูลแผนกก่อนครับ (ตรวจการเชื่อมต่อ)", true); return; }
  state.editPlanId = planId || null;
  const p = planId ? planById(planId) : null;
  const m = p ? machineById(p.machine_id) : null;

  $("planModalTitle").textContent = p ? "แก้ไขแผน PM" : "เพิ่มแผน PM";
  const deptId = m?.dept_id || (state.dept !== "all" ? state.dept : state.depts[0].id);
  fillDeptSelect($("planDept"), deptId);
  fillMachineSelect(deptId, p?.machine_id);
  $("planTitle").value = p?.title || "";
  $("planFreq").value = p?.frequency || "monthly";
  refreshSelect($("planFreq"));
  $("planStart").value = p?.start_date || todayISO();
  $("planMinutes").value = p?.std_minutes ?? "";
  $("planAssignee").value = p?.assignee || "";
  $("planChecklist").value = Array.isArray(p?.checklist) ? p.checklist.join("\n") : "";
  openModal("planModal");
}

async function savePlan() {
  if (!requireDb()) return;
  const machineId = $("planMachine").value;
  const title = $("planTitle").value.trim();
  const startDate = $("planStart").value;
  if (!machineId) { toast("เลือกเครื่องจักรก่อนครับ (เครื่องจักรดึงจากระบบ MPR)", true); return; }
  if (!title || !startDate) { toast("กรอกชื่องานและวันเริ่มรอบแรกก่อนครับ", true); return; }

  const payload = {
    machine_id: machineId, title, frequency: $("planFreq").value,
    start_date: startDate,
    std_minutes: $("planMinutes").value ? Number($("planMinutes").value) : null,
    assignee: $("planAssignee").value.trim() || null,
    checklist: $("planChecklist").value.split("\n").map((s) => s.trim()).filter(Boolean)
  };

  try {
    let error;
    if (state.editPlanId) {
      ({ error } = await sb.from("pm_plans").update(payload).eq("id", state.editPlanId));
    } else {
      ({ error } = await sb.from("pm_plans").insert(payload));
    }
    if (error) throw error;
    closeModal("planModal");
    toast(state.editPlanId ? "แก้ไขแผนเรียบร้อย ✓" : 'เพิ่มแผนแล้ว — อย่าลืมกด "สร้างตารางจากแผน"');
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("บันทึกแผนไม่สำเร็จ: " + (err.message || err), true);
  }
}

async function deactivatePlan(planId) {
  if (!requireDb()) return;
  if (!confirm("ปิดใช้งานแผนนี้? ประวัติที่ทำไปแล้วยังอยู่ครบ แต่รอบในอนาคตที่ยังไม่ได้ทำจะถูกลบออก")) return;
  try {
    let res = await sb.from("pm_plans").update({ is_active: false }).eq("id", planId);
    if (res.error) throw res.error;
    res = await sb.from("pm_schedule").delete().eq("plan_id", planId).eq("status", "planned").gte("due_date", todayISO());
    if (res.error) throw res.error;
    toast("ปิดใช้งานแผนเรียบร้อย");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("ทำรายการไม่สำเร็จ: " + (err.message || err), true);
  }
}

/* ============================================================
   เครื่องจักร (CRUD)
   ============================================================ */
function renderMachines() {
  const rows = state.machines.filter((m) =>
    m.is_active && (state.dept === "all" || m.dept_id === state.dept));

  $("machinesBody").innerHTML = rows.map((m) => {
    const d = deptById(m.dept_id);
    const planCount = state.plans.filter((p) => p.is_active && p.machine_id === m.id).length;
    return `<tr>
      <td><span class="mono">${esc(m.code || "—")}</span></td>
      <td>${esc(m.name)}</td>
      <td>${esc(d?.name || m.dept_code || "—")}</td>
      <td>${esc(m.line || "—")}</td>
      <td>${planCount ? `<span class="badge badge-done">${planCount} แผน</span>` : `<span class="badge badge-skip">ยังไม่มีแผน</span>`}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5"><div class="empty-note">ไม่พบเครื่องจักรในแผนกนี้ (ข้อมูลมาจากระบบ MPR)</div></td></tr>`;

  /* การ์ดสำหรับมือถือ */
  $("machinesCards").innerHTML = rows.map((m) => {
    const d = deptById(m.dept_id);
    const planCount = state.plans.filter((p) => p.is_active && p.machine_id === m.id).length;
    return `<div class="data-card">
      <div class="data-card-head">
        <div class="data-card-title">${esc(m.name)}
          <div class="sub"><span class="mono">${esc(m.code || "—")}</span> · ${esc(d?.name || m.dept_code || "—")}</div></div>
        ${planCount ? `<span class="badge badge-done">${planCount} แผน</span>` : `<span class="badge badge-skip">ยังไม่มีแผน</span>`}
      </div>
      <div class="data-card-meta">
        <div>ไลน์ <b>${esc(m.line || "—")}</b></div>
      </div>
    </div>`;
  }).join("") || `<div class="empty-note">ไม่พบเครื่องจักรในแผนกนี้ (ข้อมูลมาจากระบบ MPR)</div>`;
}

/* ============================================================
   ประวัติ
   ============================================================ */
function renderHistory() {
  let items = scopedSchedule().filter((s) => s.status === "done" || s.status === "skipped");
  if (state.histResult !== "all") {
    items = items.filter((s) => s.result === state.histResult);
  }
  items.sort((a, b) => (b.done_date || b.due_date).localeCompare(a.done_date || a.due_date));

  $("historyList").innerHTML = items.map((s) => {
    const { plan, machine, dept } = planContext(s.plan_id);
    const badge = s.status === "skipped"
      ? `<span class="badge badge-skip">ข้าม</span>`
      : `<span class="badge ${RESULT_BADGE[s.result] || "badge-done"}">${RESULT_LABEL[s.result] || "ทำแล้ว"}</span>`;
    return `<div class="due-item done">
      <div class="due-main">
        <div class="due-title">${esc(plan?.title || "—")}</div>
        <div class="due-sub"><span class="mono">${esc(machineLabel(machine))}</span> · ${esc(dept?.name || "")}${s.done_by ? " · ทำโดย " + esc(s.done_by) : ""}${s.note ? " · " + esc(s.note) : ""}</div>
      </div>
      ${badge}
      <div class="due-date"><div class="d1">${fmtDate(s.done_date || s.due_date)}</div>
        <div class="d2">กำหนด ${fmtDate(s.due_date)}</div></div>
      <button class="btn ghost" data-sched="${s.id}">แก้ไข</button>
      <button class="icon-btn danger" data-revert="${s.id}" title="ยกเลิกผล คืนสถานะตามแผน">↩</button>
    </div>`;
  }).join("") || `<div class="empty-note">ยังไม่มีประวัติในปี ${state.year}</div>`;

  $$("#historyList [data-sched]").forEach((b) =>
    b.addEventListener("click", () => openDoneModal(b.dataset.sched)));
  $$("#historyList [data-revert]").forEach((b) =>
    b.addEventListener("click", () => revertItem(b.dataset.revert)));
}

/* ============================================================
   Modal & Navigation
   ============================================================ */
/* ============================================================
   Custom dropdown — ครอบ <select> เดิมไว้ (select จริงยังเป็นเจ้าของค่า)
   โค้ดส่วนอื่นยังใช้ $("planDept").value / .innerHTML ได้ตามปกติ
   ============================================================ */
const CS_REG = new Map();   // select element → controller

function enhanceSelect(sel) {
  if (!sel || CS_REG.has(sel)) return;

  const wrap = document.createElement("div");
  wrap.className = "cs";
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.classList.add("cs-native");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "cs-trigger";
  trigger.innerHTML = `<span class="cs-value"></span>
    <svg class="cs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  wrap.appendChild(trigger);

  const menu = document.createElement("div");
  menu.className = "cs-menu";
  wrap.appendChild(menu);

  const ctrl = { sel, wrap, trigger, menu, open: false, activeIdx: -1 };
  CS_REG.set(sel, ctrl);

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    ctrl.open ? closeCS(ctrl) : openCS(ctrl);
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!ctrl.open) openCS(ctrl); else moveCS(ctrl, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); if (ctrl.open) moveCS(ctrl, -1);
    } else if (e.key === "Escape") { closeCS(ctrl); }
  });

  /* ถ้าโค้ดอื่นเปลี่ยนค่า select ตรง ๆ ก็ให้ป้ายอัปเดตตาม */
  sel.addEventListener("change", () => syncCS(ctrl));

  syncCS(ctrl);
}

function syncCS(ctrl) {
  const { sel, trigger, menu } = ctrl;
  const opts = Array.from(sel.options);
  const cur = sel.selectedIndex;
  trigger.querySelector(".cs-value").textContent =
    cur >= 0 ? opts[cur].textContent : "";
  trigger.classList.toggle("is-placeholder", cur < 0 || !opts.length);

  menu.innerHTML = opts.map((o, i) =>
    `<button type="button" class="cs-opt${i === cur ? " selected" : ""}"
       data-i="${i}"${o.disabled ? " disabled" : ""}>
       <span>${esc(o.textContent)}</span>
       <svg class="cs-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
     </button>`).join("");

  menu.querySelectorAll(".cs-opt").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = Number(b.dataset.i);
      if (sel.selectedIndex !== i) {
        sel.selectedIndex = i;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      syncCS(ctrl);
      closeCS(ctrl);
    });
  });
}

function openCS(ctrl) {
  CS_REG.forEach((c) => { if (c !== ctrl) closeCS(c); });
  syncCS(ctrl);

  /* ถ้าพื้นที่ด้านล่างไม่พอ ให้เปิดขึ้นด้านบนแทน */
  const r = ctrl.trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom;
  const needed = Math.min(260, ctrl.sel.options.length * 38 + 16) + 12;
  ctrl.wrap.classList.toggle("cs-up", spaceBelow < needed && r.top > spaceBelow);

  ctrl.open = true;
  ctrl.wrap.classList.add("cs-open");
  ctrl.activeIdx = ctrl.sel.selectedIndex;
  highlightCS(ctrl);
  const selected = ctrl.menu.querySelector(".cs-opt.selected");
  if (selected) selected.scrollIntoView({ block: "nearest" });
}

function closeCS(ctrl) {
  ctrl.open = false;
  ctrl.wrap.classList.remove("cs-open");
}

function moveCS(ctrl, dir) {
  const items = Array.from(ctrl.menu.querySelectorAll(".cs-opt:not([disabled])"));
  if (!items.length) return;
  let idx = ctrl.activeIdx + dir;
  if (idx < 0) idx = items.length - 1;
  if (idx >= items.length) idx = 0;
  ctrl.activeIdx = idx;
  highlightCS(ctrl);
  items[idx].scrollIntoView({ block: "nearest" });
}

function highlightCS(ctrl) {
  ctrl.menu.querySelectorAll(".cs-opt").forEach((b, i) =>
    b.classList.toggle("active", i === ctrl.activeIdx));
}

/* เรียกหลังจากโค้ดอื่นเติม option ใหม่ลง select */
function refreshSelect(sel) {
  const ctrl = CS_REG.get(sel);
  if (ctrl) syncCS(ctrl);
}

function initCustomSelects() {
  $$("select").forEach(enhanceSelect);
  document.addEventListener("click", () => CS_REG.forEach(closeCS));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") CS_REG.forEach(closeCS);
  });
}

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function switchView(view) {
  state.view = view;
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $("viewTitle").textContent = VIEW_TITLE[view];
}

function requireDb() {
  if (sb) return true;
  toast("ยังไม่ได้ตั้งค่า Supabase — วาง anon key ใน app.js ก่อนครับ", true);
  return false;
}

/* ---------- ล็อกอินด้วยรหัสพนักงาน (ตรวจกับ technicians ของ MPR) ---------- */
function setUser(name, code) {
  state.user = name;
  state.userCode = code || "";
  localStorage.setItem("pm_user", name);
  localStorage.setItem("pm_user_code", state.userCode);
  $("userName").textContent = name;
  const uc = $("userCode");
  if (uc) uc.textContent = state.userCode ? "รหัส " + state.userCode : "";
}

function logout() {
  state.user = ""; state.userCode = "";
  localStorage.removeItem("pm_user");
  localStorage.removeItem("pm_user_code");
  $("userName").textContent = "—";
  if ($("userCode")) $("userCode").textContent = "";
  $("nameInput").value = "";
  showLoginError("");
  openModal("nameModal");
}

function showLoginError(msg) {
  const el = $("loginError");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function loginByCode() {
  const code = $("nameInput").value.trim();
  if (!code) { showLoginError("กรอกรหัสพนักงานก่อนครับ"); return; }
  if (!sb) { showLoginError("ยังไม่ได้เชื่อมต่อฐานข้อมูล (ตรวจ anon key)"); return; }

  const btn = $("nameSaveBtn");
  btn.disabled = true; btn.textContent = "กำลังตรวจสอบ…";
  try {
    const { data, error } = await sb.from("technicians")
      .select("*").eq("employee_code", code).limit(1);
    if (error) throw error;
    const tech = data && data[0];
    if (!tech) { showLoginError("ไม่พบรหัสพนักงานนี้ในระบบ"); return; }
    if (tech.is_active === false) { showLoginError("บัญชีนี้ถูกปิดใช้งาน"); return; }
    setUser(tech.full_name || code, tech.employee_code);
    showLoginError("");
    closeModal("nameModal");
    toast(`ยินดีต้อนรับ ${tech.full_name || code}`);
  } catch (err) {
    console.error(err);
    showLoginError("เข้าสู่ระบบไม่สำเร็จ: " + (err.message || err));
  } finally {
    btn.disabled = false; btn.textContent = "เข้าสู่ระบบ";
  }
}

/* ============================================================
   เริ่มระบบ
   ============================================================ */
function bindEvents() {
  $$(".nav-btn").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  $$("[data-jump]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.jump)));
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(b.dataset.close)));
  $$(".modal-veil").forEach((v) => v.addEventListener("click", (e) => {
    if (e.target === v && v.id !== "nameModal") v.classList.add("hidden");
  }));

  $("deptFilter").addEventListener("change", (e) => { state.dept = e.target.value; renderAll(); });
  $("yearSelect").addEventListener("change", (e) => { state.year = Number(e.target.value); loadAll(); });
  $("refreshBtn").addEventListener("click", loadAll);

  $("boardGenBtn").addEventListener("click", generateSchedule);
  $("genYearBtn").addEventListener("click", generateSchedule);

  $("boardReportBtn").addEventListener("click", openReportModal);
  $("repPrintBtn").addEventListener("click", exportReportPrint);
  $("repExcelBtn").addEventListener("click", exportReportExcel);

  $$("#dueRangeSeg .seg-btn").forEach((b) => b.addEventListener("click", () => {
    $$("#dueRangeSeg .seg-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.dueRange = b.dataset.range;
    renderDue();
  }));

  $$("#histResultSeg .seg-btn").forEach((b) => b.addEventListener("click", () => {
    $$("#histResultSeg .seg-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.histResult = b.dataset.result;
    renderHistory();
  }));

  $("planAddBtn").addEventListener("click", () => openPlanModal(null));
  $("planSaveBtn").addEventListener("click", savePlan);
  $("planDept").addEventListener("change", (e) => fillMachineSelect(e.target.value, null));

  $("doneSaveBtn").addEventListener("click", saveDone);
  $("skipBtn").addEventListener("click", skipItem);

  $("logoutBtn").addEventListener("click", () => {
    if (confirm("ออกจากระบบ?")) logout();
  });
  $("nameSaveBtn").addEventListener("click", loginByCode);
  $("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginByCode();
  });
}

function initYearSelect() {
  const y = new Date().getFullYear();
  const years = [y - 1, y, y + 1];
  $("yearSelect").innerHTML = years.map((v) =>
    `<option value="${v}" ${v === y ? "selected" : ""}>ปี ${v} (พ.ศ. ${v + 543})</option>`).join("");
}

function init() {
  initYearSelect();
  initCustomSelects();
  bindEvents();

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE")) {
    $("configBanner").classList.remove("hidden");
  } else {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  if (state.user) {
    $("userName").textContent = state.user;
    if ($("userCode")) $("userCode").textContent = state.userCode ? "รหัส " + state.userCode : "";
  } else {
    openModal("nameModal");
  }

  loadAll();
}

document.addEventListener("DOMContentLoaded", init);
