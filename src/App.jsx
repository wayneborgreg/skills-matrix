import { useState, useMemo, useEffect, useCallback } from "react";

import { supabase } from './supabase'

function GlobalStyles() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'IBM Plex Sans',sans-serif!important;}
      ::-webkit-scrollbar{width:5px;height:5px;}
      ::-webkit-scrollbar-track{background:#080d1a;}
      ::-webkit-scrollbar-thumb{background:#1e2d4d;border-radius:4px;}
      .mcell:hover>div{filter:brightness(1.5);}
      .acard:hover{border-color:#2d4a7a!important;background:#0f1a30!important;}
      .trow:hover{background:#0f1e38!important;}
      .nbtn:hover{background:#1a2540!important;}
      .hrow:hover{background:#0d1e36!important;}
      .fadein{animation:fi 0.22s ease;}
      @keyframes fi{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
      input[type=month]{color-scheme:dark;}
      .stab-active{background:#1e3a5f!important;color:#7dd3fc!important;border-color:#1e3a5f!important;}
      .mrow td{background-color:var(--rbg,#080d1a);}
      .mrow:hover td{background-color:#0e1e38!important;}
      .ferr-msg{color:#f87171;font-size:10px;margin-top:3px;}
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
}

// ── ROLES ──────────────────────────────────────────────────────────────
const ROLES = [
  { id:"cx_probation",   label:"CX Agent (Probation)",  shortLabel:"CX Prob.",  tier:1, color:"#94a3b8" },
  { id:"cx_agent",       label:"CX Agent",               shortLabel:"CX Agent",  tier:2, color:"#60a5fa" },
  { id:"ops_agent",      label:"Operations Agent",        shortLabel:"Ops Agent", tier:3, color:"#34d399" },
  { id:"ops_specialist", label:"Operations Specialist",   shortLabel:"Ops Spec.", tier:4, color:"#fbbf24" },
  { id:"ops_senior",     label:"Operations Senior",       shortLabel:"Ops Sr.",   tier:5, color:"#f472b6" },
];
const getRoleInfo = id => ROLES.find(r => r.id === id);
const getNextRole = id => { const t = getRoleInfo(id)?.tier; return ROLES.find(r => r.tier === t + 1) || null; };
const MOD_COLORS = ["#64748b","#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#ef4444","#06b6d4","#84cc16","#f97316"];

// ── LOG CATEGORIES ──────────────────────────────────────────────────────
const LOG_CATS = [
  { id:"all",        label:"All Activity",      icon:"📋", color:"#64748b" },
  { id:"training",   label:"Training Records",  icon:"✅", color:"#34d399" },
  { id:"monthly",    label:"Monthly Metrics",   icon:"📅", color:"#60a5fa" },
  { id:"agent",      label:"Agents",            icon:"👤", color:"#a78bfa" },
  { id:"module",     label:"Modules",           icon:"📦", color:"#f59e0b" },
  { id:"task",       label:"Tasks",             icon:"📌", color:"#f472b6" },
  { id:"threshold",  label:"Thresholds",        icon:"📊", color:"#fb923c" },
  { id:"assessment", label:"Assessment Score",  icon:"🎯", color:"#e879f9" },
  { id:"shadowing",  label:"Shadowing",         icon:"👁",  color:"#38bdf8" },
  { id:"calendar",   label:"Calendar",          icon:"📆", color:"#4ade80" },
];

function tsLabel(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return Math.floor(diff/60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff/3600000) + "h ago";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) + " " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}

// ── SEED MODULES ────────────────────────────────────────────────────────
const SEED_MODULES = [
  { id:"m01", label:"Onboarding Basics",      color:"#64748b", requiredForRole:"cx_probation",  order:1 },
  { id:"m02", label:"CX Core",                 color:"#3b82f6", requiredForRole:"cx_agent",       order:2 },
  { id:"m03", label:"Operations Agent",         color:"#10b981", requiredForRole:"ops_agent",      order:3 },
  { id:"m04", label:"Operations Specialist",    color:"#f59e0b", requiredForRole:"ops_specialist", order:4 },
  { id:"m05", label:"Operations Senior",         color:"#ec4899", requiredForRole:"ops_senior",     order:5 },
];

const SEED_TASKS = [
  {id:"t01",label:"System Access & Tools Setup",        moduleId:"m01",order:1},
  {id:"t02",label:"Customer Greeting Standards",         moduleId:"m01",order:2},
  {id:"t03",label:"Basic Ticket Handling",               moduleId:"m01",order:3},
  {id:"t04",label:"Email Response Templates",            moduleId:"m01",order:4},
  {id:"t05",label:"Basic Escalation Procedures",         moduleId:"m01",order:5},
  {id:"t06",label:"CRM & Data Entry Basics",             moduleId:"m01",order:6},
  {id:"t07",label:"Live Chat Handling",                  moduleId:"m02",order:1},
  {id:"t08",label:"Phone Support Protocols",             moduleId:"m02",order:2},
  {id:"t09",label:"Complaint Resolution L1",             moduleId:"m02",order:3},
  {id:"t10",label:"Knowledge Base Navigation",           moduleId:"m02",order:4},
  {id:"t11",label:"SLA Awareness & Prioritization",      moduleId:"m02",order:5},
  {id:"t12",label:"Daily Metrics & Reporting",           moduleId:"m02",order:6},
  {id:"t13",label:"Workflow Management Basics",          moduleId:"m03",order:1},
  {id:"t14",label:"Queue Monitoring",                    moduleId:"m03",order:2},
  {id:"t15",label:"Cross-Team Coordination",             moduleId:"m03",order:3},
  {id:"t16",label:"Process Documentation",               moduleId:"m03",order:4},
  {id:"t17",label:"Complaint Resolution L2",             moduleId:"m03",order:5},
  {id:"t18",label:"Agent Onboarding (Shadow)",           moduleId:"m03",order:6},
  {id:"t19",label:"Shift Handover Procedures",           moduleId:"m03",order:7},
  {id:"t20",label:"Operational Reporting",               moduleId:"m03",order:8},
  {id:"t21",label:"Quality Assurance Auditing",          moduleId:"m04",order:1},
  {id:"t22",label:"Training Delivery",                   moduleId:"m04",order:2},
  {id:"t23",label:"Performance Coaching",                moduleId:"m04",order:3},
  {id:"t24",label:"Process Improvement Proposals",       moduleId:"m04",order:4},
  {id:"t25",label:"Escalation Management L3",            moduleId:"m04",order:5},
  {id:"t26",label:"KPI Dashboard Ownership",             moduleId:"m04",order:6},
  {id:"t27",label:"Strategic Planning & OKRs",           moduleId:"m05",order:1},
  {id:"t28",label:"Team Performance Reviews",            moduleId:"m05",order:2},
  {id:"t29",label:"Stakeholder Reporting",               moduleId:"m05",order:3},
  {id:"t30",label:"Hiring & Interviewing",               moduleId:"m05",order:4},
  {id:"t31",label:"Policy Development",                  moduleId:"m05",order:5},
  {id:"t32",label:"Cross-Functional Project Lead",       moduleId:"m05",order:6},
];

const SEED_AGENTS = [
  { id:"a01", name:"Sarah Mitchell",  email:"s.mitchell@rhinoentertainment.com",  role:"ops_senior",    startDate:"2021-03-10", lead:"Director" },
  { id:"a02", name:"James Okafor",    email:"j.okafor@rhinoentertainment.com",    role:"ops_specialist", startDate:"2022-01-15", lead:"Sarah Mitchell" },
  { id:"a03", name:"Priya Sharma",    email:"p.sharma@rhinoentertainment.com",    role:"ops_specialist", startDate:"2022-06-20", lead:"Sarah Mitchell" },
  { id:"a04", name:"Carlos Mendez",   email:"c.mendez@rhinoentertainment.com",    role:"ops_agent",     startDate:"2023-02-01", lead:"James Okafor" },
  { id:"a05", name:"Elena Vasquez",   email:"e.vasquez@rhinoentertainment.com",   role:"ops_agent",     startDate:"2023-05-14", lead:"James Okafor" },
  { id:"a06", name:"Tom Bradley",     email:"t.bradley@rhinoentertainment.com",   role:"ops_agent",     startDate:"2023-08-07", lead:"Priya Sharma" },
  { id:"a07", name:"Aisha Patel",     email:"a.patel@rhinoentertainment.com",     role:"cx_agent",      startDate:"2024-01-20", lead:"Carlos Mendez" },
  { id:"a08", name:"Marcus Chen",     email:"m.chen@rhinoentertainment.com",      role:"cx_agent",      startDate:"2024-03-05", lead:"Carlos Mendez" },
  { id:"a09", name:"Nadia Kowalski",  email:"n.kowalski@rhinoentertainment.com",  role:"cx_agent",      startDate:"2024-04-18", lead:"Elena Vasquez" },
  { id:"a10", name:"Sophie Laurent",  email:"s.laurent@rhinoentertainment.com",   role:"cx_probation",  startDate:"2025-01-08", lead:"Tom Bradley" },
  { id:"a11", name:"Ryan O'Brien",    email:"r.obrien@rhinoentertainment.com",    role:"cx_probation",  startDate:"2025-02-01", lead:"Tom Bradley" },
  { id:"a12", name:"David Kim",       email:"d.kim@rhinoentertainment.com",       role:"ops_agent",     startDate:"2023-11-12", lead:"Priya Sharma" },
];

// ── ADMIN STAFF ─────────────────────────────────────────────────────────
// Admin/management roles — not in skills matrix, but run training & shadowing
const ADMIN_ROLES = ["Shift Leader","QA Lead","Trainer","Operations Performance Manager","Team Leader","Other"];
const ADMIN_COLOR = "#f59e0b"; // amber — distinct from ROLES palette
const SEED_STAFF = [
  { id:"s01", name:"Victoria Nash",   email:"v.nash@rhinoentertainment.com",     title:"Operations Performance Manager", directReports:["a01","a02","a03"] },
  { id:"s02", name:"Leo Hartmann",    email:"l.hartmann@rhinoentertainment.com",  title:"Team Leader",                   directReports:["a04","a05","a06"] },
  { id:"s03", name:"Zara Ahmed",      email:"z.ahmed@rhinoentertainment.com",     title:"QA Lead",                       directReports:["a07","a08","a09"] },
  { id:"s04", name:"Ben Forsythe",    email:"b.forsythe@rhinoentertainment.com",  title:"Trainer",                       directReports:["a10","a11"] },
  { id:"s05", name:"Mei Lin",         email:"m.lin@rhinoentertainment.com",       title:"Shift Leader",                  directReports:["a04","a07","a10"] },
  { id:"s06", name:"Ravi Nair",       email:"r.nair@rhinoentertainment.com",      title:"Shift Leader",                  directReports:["a05","a08","a11"] },
];

const SEED_THRESHOLDS = {
  cx_probation:   { prodPct:90,  qaAbsolute:70, periodMonths:2,    noProd:false },
  cx_agent:       { prodPct:100, qaAbsolute:80, periodMonths:3,    noProd:false },
  ops_agent:      { prodPct:95,  qaAbsolute:85, periodMonths:5,    noProd:false },
  ops_specialist: { prodPct:90,  qaAbsolute:90, periodMonths:6,    noProd:false },
  ops_senior:     { prodPct:null,qaAbsolute:90, periodMonths:null, noProd:true  },
};

// ── SEED SHADOWING ──────────────────────────────────────────────────────
// shadowing[agentId] = [{ id, shadowedId, date, completed, notes }]
const SEED_SHADOWING = {
  a10: [
    { id:"sh01", shadowedId:"a06", date:"2025-01-20", completed:true,  taskIds:["t01","t02","t03"], notes:"Observed full ticket queue shift" },
    { id:"sh02", shadowedId:"a04", date:"2025-02-03", completed:true,  taskIds:["t05","t06"],       notes:"Focused on escalation handling" },
  ],
  a11: [
    { id:"sh03", shadowedId:"a06", date:"2025-02-10", completed:true,  taskIds:["t01","t02","t03","t04"], notes:"Full day onboarding shadow" },
    { id:"sh04", shadowedId:"a05", date:"2025-02-24", completed:false, taskIds:["t09"],               notes:"Scheduled — complaint resolution focus" },
  ],
  a07: [
    { id:"sh05", shadowedId:"a04", date:"2024-02-15", completed:true,  taskIds:["t07","t08"],       notes:"" },
    { id:"sh06", shadowedId:"a12", date:"2024-03-02", completed:true,  taskIds:["t11","t12"],        notes:"Ops workflow observation" },
  ],
  a08: [
    { id:"sh07", shadowedId:"a05", date:"2024-04-01", completed:true,  taskIds:["t07","t09","t10"], notes:"" },
  ],
  a09: [
    { id:"sh08", shadowedId:"a04", date:"2024-05-10", completed:true,  taskIds:["t08","t11"],       notes:"" },
    { id:"sh09", shadowedId:"a06", date:"2024-06-14", completed:false, taskIds:["t12"],              notes:"Pending rescheduling" },
  ],
  a04: [
    { id:"sh10", shadowedId:"a02", date:"2023-03-05", completed:true,  taskIds:["t13","t14","t15"], notes:"Ops agent transition shadow" },
  ],
  a05: [
    { id:"sh11", shadowedId:"a03", date:"2023-06-20", completed:true,  taskIds:["t13","t16"],       notes:"" },
  ],
};

// ── SEED CALENDAR EVENTS ────────────────────────────────────────────────
// cal event: { id, title, type, date, startTime, endTime, agentIds, trainerId, taskIds, location, notes, gcalCreated }
const today     = new Date();
const ym        = (d,delta=0) => { const t=new Date(d); t.setDate(t.getDate()+delta); return t.toISOString().slice(0,10); };
const SEED_CAL  = [
  { id:"c01", title:"Onboarding Basics — Group Session",  type:"training",  date:ym(today,2),  startTime:"09:00", endTime:"11:00", agentIds:["a10","a11"], trainerId:"a06", taskIds:["t01","t02","t03"], location:"Training Room A", notes:"Bring system logins ready", gcalCreated:false },
  { id:"c02", title:"Live Chat Shadowing",                type:"shadowing", date:ym(today,4),  startTime:"10:00", endTime:"11:30", agentIds:["a10"],        trainerId:"a07", taskIds:["t07"],            location:"Remote — Zoom",    notes:"",                        gcalCreated:false },
  { id:"c03", title:"Complaint Resolution Assessment",   type:"training",  date:ym(today,7),  startTime:"14:00", endTime:"15:00", agentIds:["a11"],        trainerId:"a05", taskIds:["t09"],            location:"Meeting Room 2",   notes:"Bring assessment sheet",  gcalCreated:true  },
  { id:"c04", title:"Ops Agent Intro Session",           type:"training",  date:ym(today,10), startTime:"09:30", endTime:"12:00", agentIds:["a07","a08"],  trainerId:"a04", taskIds:["t13","t14"],       location:"Training Room B",  notes:"",                        gcalCreated:false },
  { id:"c05", title:"Escalation Handling Shadow",        type:"shadowing", date:ym(today,-3), startTime:"11:00", endTime:"12:00", agentIds:["a09"],        trainerId:"a04", taskIds:["t05","t12"],       location:"Remote — Teams",   notes:"Session completed",       gcalCreated:true  },
  { id:"c06", title:"CRM Deep Dive",                     type:"training",  date:ym(today,14), startTime:"13:00", endTime:"14:30", agentIds:["a10"],        trainerId:"a06", taskIds:["t06"],            location:"Training Room A",  notes:"",                        gcalCreated:false },
];

// ── SEEDING ─────────────────────────────────────────────────────────────
const ri  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pad = n    => String(n).padStart(2,"0");
const uid = ()   => "x"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const SIGN_OFFS  = ["Sarah Mitchell","James Okafor","Priya Sharma","Carlos Mendez"];
const ALL_MONTHS = ["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];

function buildAllTasks(modules, tasks) {
  const modMap = Object.fromEntries(modules.map(m => [m.id, m]));
  return [...tasks].sort((a,b) => {
    const ma = modMap[a.moduleId], mb = modMap[b.moduleId];
    const ta = ROLES.find(r=>r.id===ma?.requiredForRole)?.tier||99;
    const tb = ROLES.find(r=>r.id===mb?.requiredForRole)?.tier||99;
    if (ta!==tb) return ta-tb;
    if ((ma?.order||0)!==(mb?.order||0)) return (ma?.order||0)-(mb?.order||0);
    return (a.order||0)-(b.order||0);
  }).map(t => ({...t, moduleLabel:modMap[t.moduleId]?.label||"Unknown", moduleColor:modMap[t.moduleId]?.color||"#475569", requiredForRole:modMap[t.moduleId]?.requiredForRole||"cx_probation"}));
}

function seedMonthly(agents) {
  const d = {};
  agents.forEach(a => {
    d[a.id] = {};
    const tier = ROLES.find(r=>r.id===a.role)?.tier||1;
    const n = Math.min(ALL_MONTHS.length, Math.max(2,tier+2));
    ALL_MONTHS.slice(ALL_MONTHS.length-n).forEach(m => {
      const base = 73+tier*3;
      d[a.id][m] = { prod:ri(base,Math.min(99,base+18)), qa:ri(Math.max(65,base-4),Math.min(99,base+16)) };
    });
  });
  return d;
}

function seedRecords(agents, allTasks) {
  const recs = {};
  agents.forEach(a => {
    recs[a.id] = {};
    const at = ROLES.find(r=>r.id===a.role)?.tier||1;
    allTasks.forEach(t => {
      const tt = ROLES.find(r=>r.id===t.requiredForRole)?.tier||1;
      let rec = { trained:false, trainingDate:null, assessmentScore:null, signOff:null };
      if (tt<at) rec = { trained:true, trainingDate:`202${tt}-${pad(ri(1,9))}-${pad(ri(10,28))}`, assessmentScore:ri(82,98), signOff:SIGN_OFFS[ri(0,3)] };
      else if (tt===at) { const x=Math.random(); if(x>0.42) rec={trained:true,trainingDate:`2024-${pad(ri(3,9))}-${pad(ri(5,28))}`,assessmentScore:ri(71,97),signOff:SIGN_OFFS[ri(0,3)]}; else if(x>0.18) rec={trained:true,trainingDate:`2025-0${ri(1,3)}-${pad(ri(5,25))}`,assessmentScore:null,signOff:SIGN_OFFS[ri(0,3)]}; }
      recs[a.id][t.id] = rec;
    });
  });
  return recs;
}

const _initAllTasks = buildAllTasks(SEED_MODULES, SEED_TASKS);
const INIT_RECORDS  = seedRecords(SEED_AGENTS, _initAllTasks);
const INIT_MONTHLY  = seedMonthly(SEED_AGENTS);

// ── CALC HELPERS ────────────────────────────────────────────────────────
const r1       = n  => Math.round(n*10)/10;
const fmtMonth = ym => { const [y,m]=ym.split("-"); return new Date(+y,+m-1).toLocaleString("en",{month:"short",year:"numeric"}); };

function agentAvg(agentId, periodMonths, monthly) {
  const entries = Object.entries(monthly[agentId]||{}).sort(([a],[b])=>b.localeCompare(a));
  const slice   = periodMonths ? entries.slice(0,periodMonths) : entries;
  if (!slice.length) return { prod:null, qa:null, count:0 };
  return { prod:r1(slice.reduce((s,[,v])=>s+v.prod,0)/slice.length), qa:r1(slice.reduce((s,[,v])=>s+v.qa,0)/slice.length), count:slice.length };
}
function groupAvg(roleId, agents, monthly, thresholds) {
  const t = thresholds[roleId];
  const grp = agents.filter(a=>a.role===roleId).map(a=>agentAvg(a.id,t.periodMonths,monthly)).filter(a=>a.prod!==null);
  if (!grp.length) return { prod:0, qa:0 };
  return { prod:r1(grp.reduce((s,a)=>s+a.prod,0)/grp.length), qa:r1(grp.reduce((s,a)=>s+a.qa,0)/grp.length) };
}
function checkThresh(agentId, roleId, agents, monthly, thresholds) {
  const t   = thresholds[roleId];
  const avg = agentAvg(agentId, t.periodMonths, monthly);
  const need = t.periodMonths||1;
  if (avg.count<need) return { prodMet:false, qaMet:false, insuf:true, avg, grp:null, prodReq:null, qaReq:t.qaAbsolute };
  const grp = groupAvg(roleId, agents, monthly, thresholds);
  let prodMet=true, prodReq=null;
  if (!t.noProd && t.prodPct!=null) { prodReq=r1(grp.prod*t.prodPct/100); prodMet=avg.prod>=prodReq; }
  return { prodMet, qaMet:avg.qa>=t.qaAbsolute, insuf:false, avg, grp, prodReq, qaReq:t.qaAbsolute };
}
function trainingProg(agentId, roleId, records, allTasks, passScore) {
  const tasks = allTasks.filter(t=>t.requiredForRole===roleId);
  const recs  = tasks.map(t=>records[agentId]?.[t.id]||{});
  return { total:tasks.length, trained:recs.filter(r=>r.trained).length, passed:recs.filter(r=>r.assessmentScore>=passScore).length };
}
function isReady(agentId, roleId, agents, records, monthly, thresholds, passScore, allTasks) {
  if (roleId==="ops_senior") return false;
  const {total,trained,passed} = trainingProg(agentId,roleId,records,allTasks,passScore);
  if (trained<total||passed<total) return false;
  const {prodMet,qaMet,insuf} = checkThresh(agentId,roleId,agents,monthly,thresholds);
  return !insuf && prodMet && qaMet;
}

const SC = { none:"#152033", trained:"#1e3a8a", passed:"#14532d", failed:"#7f1d1d" };
const SI = { none:"·", trained:"~", passed:"✓", failed:"✗" };
const cellSt = (aid,tid,records,ps) => { const r=records[aid]?.[tid]||{}; if(!r.trained) return"none"; if(r.assessmentScore==null) return"trained"; return r.assessmentScore>=ps?"passed":"failed"; };

// ── UI ATOMS ────────────────────────────────────────────────────────────
function Badge({role}) {
  return <span style={{fontSize:"10px",fontWeight:600,padding:"2px 8px",borderRadius:"4px",backgroundColor:role.color+"22",color:role.color,letterSpacing:"0.03em",whiteSpace:"nowrap"}}>{role.shortLabel}</span>;
}
function PBar({value,max,color,h=4}) {
  return <div style={{height:`${h}px`,backgroundColor:"#1e2d4d",borderRadius:"2px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,max>0?(value/max)*100:0)}%`,backgroundColor:color,borderRadius:"2px",transition:"width 0.4s"}}/></div>;
}
function Gauge({label,val,req,met,na,insuf}) {
  if(na) return <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"10px 12px",flex:1}}><div style={{fontSize:"9px",color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px"}}>{label}</div><div style={{fontSize:"13px",color:"#334155",fontFamily:"'IBM Plex Mono',monospace"}}>N/A</div></div>;
  const c=insuf?"#475569":met?"#22c55e":"#f87171";
  return(
    <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"10px 12px",flex:1}}>
      <div style={{fontSize:"9px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"6px"}}>{label}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:"5px",marginBottom:"5px"}}>
        <span style={{fontSize:"18px",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",color:c}}>{val!=null?`${val}%`:"—"}</span>
        {req!=null&&<span style={{fontSize:"10px",color:"#334155"}}>min {req}%</span>}
      </div>
      <PBar value={val||0} max={100} color={c} h={3}/>
      {insuf&&<div style={{fontSize:"9px",color:"#475569",marginTop:"3px"}}>Insufficient data</div>}
    </div>
  );
}
function SectionHeader({title,subtitle,action}) {
  return(
    <div style={{padding:"14px 20px",borderBottom:"1px solid #1a2b42",backgroundColor:"#0a1120",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
      <div><div style={{fontWeight:700,fontSize:"13px",color:"#e2e8f0"}}>{title}</div>{subtitle&&<div style={{fontSize:"11px",color:"#475569",marginTop:"2px"}}>{subtitle}</div>}</div>
      {action}
    </div>
  );
}
function ConfirmModal({title,body,confirmLabel,onConfirm,onCancel,danger=true}) {
  return(
    <div onClick={onCancel} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"16px"}}>
      <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:`1px solid ${danger?"#7f1d1d":"#1e2d4d"}`,borderRadius:"12px",padding:"28px",width:"380px",maxWidth:"100%",textAlign:"center"}}>
        <div style={{fontSize:"26px",marginBottom:"12px"}}>{danger?"⚠️":"💬"}</div>
        <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"8px"}}>{title}</h3>
        <p style={{color:"#64748b",fontSize:"13px",marginBottom:"20px",lineHeight:"1.6"}}>{body}</p>
        <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
          <button onClick={onCancel} style={{padding:"9px 20px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
          <button onClick={onConfirm} style={{padding:"9px 20px",backgroundColor:danger?"#7f1d1d":"#0ea5e9",border:"none",borderRadius:"6px",color:danger?"#fca5a5":"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const IS  = { width:"100%",backgroundColor:"#080d1a",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#e2e8f0",padding:"8px 12px",fontSize:"13px",outline:"none",fontFamily:"'IBM Plex Sans',sans-serif" };
const ISS = { ...IS, padding:"6px 10px", fontSize:"12px" };

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function SkillsMatrix() {
  const [modules,    setModules]    = useState(SEED_MODULES);
  const [tasks,      setTasks]      = useState(SEED_TASKS);
  const [agents,     setAgents]     = useState(SEED_AGENTS);
  const [staff,      setStaff]      = useState(SEED_STAFF);
  const [records,    setRecords]    = useState(INIT_RECORDS);
  const [monthly,    setMonthly]    = useState(INIT_MONTHLY);
  const [thresholds, setThresholds] = useState(SEED_THRESHOLDS);
  const [passScore,  setPassScore]  = useState(80);
  const [shadowing,  setShadowing]  = useState(SEED_SHADOWING);
  const [auditLog,   setAuditLog]   = useState([]);

  const allTasks = useMemo(() => buildAllTasks(modules, tasks), [modules, tasks]);

  // ── audit logger ─────────────────────────────────────────────────────
  const addLog = useCallback((category, action, detail, meta={}) => {
    setAuditLog(p => [{id:uid(), ts:new Date().toISOString(), category, action, detail, ...meta}, ...p].slice(0,500));
  }, []);

  // ── nav ──────────────────────────────────────────────────────────────
  const [view,       setView]       = useState("dashboard");
  const [selId,      setSelId]      = useState(null);
  const [filterRole, setFilterRole] = useState("all");
  const [settTab,    setSettTab]    = useState("agents");
  const [logFilter,  setLogFilter]  = useState("all");
  const [logSearch,  setLogSearch]  = useState("");

  // ── modals ───────────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [mModal,    setMModal]    = useState(null);
  const [mForm,     setMForm]     = useState({month:"",prod:"",qa:""});
  const [mEditing,  setMEditing]  = useState(null);
  const [agentModal, setAgentModal] = useState(null);
  const [agentForm,  setAgentForm]  = useState({});
  const [agentDel,   setAgentDel]   = useState(null);
  const [staffModal, setStaffModal] = useState(null); // null | "add" | staffId
  const [staffForm,  setStaffForm]  = useState({});
  const [staffDel,   setStaffDel]   = useState(null);
  const [modModal,   setModModal]   = useState(null);
  const [modForm,    setModForm]    = useState({});
  const [modDel,     setModDel]     = useState(null);
  const [taskModal,  setTaskModal]  = useState(null);
  const [taskForm,   setTaskForm]   = useState({});
  const [taskDel,    setTaskDel]    = useState(null);
  const [taskModuleFilter, setTaskModuleFilter] = useState("all");
  const [sRow,  setSRow]  = useState(null);
  const [sForm, setSForm] = useState({});

  // ── SHADOWING modal state ─────────────────────────────────────────────
  const [shadowModal, setShadowModal] = useState(null);
  const [shadowForm,  setShadowForm]  = useState({ shadowedId:"", date:"", completed:false, notes:"", taskIds:[] });
  const [shadowEdit,  setShadowEdit]  = useState(null);
  // inline shadow form inside the cell (task) modal
  const [cellShadowForm, setCellShadowForm] = useState({ shadowedId:"", date:"", completed:false, notes:"" });
  const [cellShadowEdit, setCellShadowEdit] = useState(null);

  // ── CALENDAR state ────────────────────────────────────────────────────
  const [calEvents,    setCalEvents]    = useState(SEED_CAL);
  const [calYear,      setCalYear]      = useState(new Date().getFullYear());
  const [calMonth,     setCalMonth]     = useState(new Date().getMonth()); // 0-based
  const [calEventModal,setCalEventModal]= useState(null); // null | "add" | eventId
  const [calForm,      setCalForm]      = useState({});
  const [calDelId,     setCalDelId]     = useState(null);

// ── SUPABASE LOAD ────────────────────────────────────────────────────────
useEffect(() => {
  supabase.from('app_state').select('data').eq('id','main').single()
    .then(({ data: row }) => {
      if (!row?.data || Object.keys(row.data).length === 0) return
      const s = row.data
      if (s.agents)     setAgents(s.agents)
      if (s.staff)      setStaff(s.staff)
      if (s.records)    setRecords(s.records)
      if (s.monthly)    setMonthly(s.monthly)
      if (s.modules)    setModules(s.modules)
      if (s.tasks)      setTasks(s.tasks)
      if (s.thresholds) setThresholds(s.thresholds)
      if (s.shadowing)  setShadowing(s.shadowing)
      if (s.calEvents)  setCalEvents(s.calEvents)
      if (s.passScore)  setPassScore(s.passScore)
      if (s.auditLog)   setAuditLog(s.auditLog)
    })
}, [])

// ── SUPABASE SAVE ────────────────────────────────────────────────────────
useEffect(() => {
  const timer = setTimeout(() => {
    supabase.from('app_state').update({
      data: { agents, staff, records, monthly, modules, tasks,
               thresholds, shadowing, calEvents, passScore, auditLog },
      updated_at: new Date().toISOString()
    }).eq('id','main').then()
  }, 1500)
  return () => clearTimeout(timer)
}, [agents, staff, records, monthly, modules, tasks,
    thresholds, shadowing, calEvents, passScore, auditLog])

  // ── UI helpers ────────────────────────────────────────────────────────
  const [showFormErr,    setShowFormErr]    = useState(false);
  const [clearLogConfirm,setClearLogConfirm]= useState(false);
  const [resetConfirm,   setResetConfirm]   = useState(false);

  const fAgents = useMemo(()=>filterRole==="all"?agents:agents.filter(a=>a.role===filterRole),[filterRole,agents]);
  const selAgt  = agents.find(a=>a.id===selId);

  const ready = useCallback((aid,rid) => isReady(aid,rid,agents,records,monthly,thresholds,passScore,allTasks),
    [agents,records,monthly,thresholds,passScore,allTasks]);
  const trainProg = useCallback((aid,rid) => trainingProg(aid,rid,records,allTasks,passScore),
    [records,allTasks,passScore]);

  // lookup helper: search agents first, then admin staff
  const findPerson = useCallback(id => agents.find(a=>a.id===id) || staff.find(s=>s.id===id), [agents,staff]);

  // ── ESCAPE KEY ────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = e => {
      if (e.key !== "Escape") return;
      if (calEventModal)  { setCalEventModal(null); return; }
      if (staffModal)     { setStaffModal(null);    return; }
      if (shadowModal)    { setShadowModal(null);   return; }
      if (editModal)      { setEditModal(null); setCellShadowEdit(null); return; }
      if (mModal)         { setMModal(null);        return; }
      if (agentModal)     { setAgentModal(null);    return; }
      if (modModal)       { setModModal(null);      return; }
      if (taskModal)      { setTaskModal(null);     return; }
      if (clearLogConfirm){ setClearLogConfirm(false); return; }
      if (resetConfirm)   { setResetConfirm(false);    return; }
      setAgentDel(null); setStaffDel(null); setModDel(null); setTaskDel(null); setCalDelId(null);
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [calEventModal, staffModal, shadowModal, editModal, mModal, agentModal, modModal, taskModal, clearLogConfirm, resetConfirm]);

  // ── RESET ALL DATA ────────────────────────────────────────────────────
  const resetAllData = () => {
    setAgents([]); setStaff([]);
    setRecords({}); setMonthly({}); setShadowing({}); setCalEvents([]);
    setModules(SEED_MODULES); setTasks(SEED_TASKS);
    setThresholds(SEED_THRESHOLDS); setPassScore(80);
    setAuditLog([{ id:uid(), ts:new Date().toISOString(), category:"agent", action:"App data reset", detail:"All agents, staff, records, shadowing and calendar events cleared. Module/task structure retained." }]);
    setResetConfirm(false);
  };

  // ── STAFF CRUD ────────────────────────────────────────────────────────
  const openAddStaff  = () => { setStaffForm({name:"",email:"",title:ADMIN_ROLES[0],directReports:[]}); setStaffModal("add"); setShowFormErr(false); };
  const openEditStaff = id => { setStaffForm({...staff.find(s=>s.id===id)}); setStaffModal(id); setShowFormErr(false); };
  const saveStaff = () => {
    if (!staffForm.name?.trim()||!staffForm.email?.trim()) { setShowFormErr(true); return; }
    if (staffModal==="add") {
      const nid=uid();
      setStaff(p=>[...p,{...staffForm,id:nid}]);
      addLog("agent","Added staff member",staffForm.name+" ("+staffForm.title+")");
    } else {
      const prev=staff.find(s=>s.id===staffModal);
      const ch=[];
      if(prev.name!==staffForm.name) ch.push("name: "+prev.name+" → "+staffForm.name);
      if(prev.title!==staffForm.title) ch.push("title: "+prev.title+" → "+staffForm.title);
      setStaff(p=>p.map(s=>s.id===staffModal?{...s,...staffForm,id:staffModal}:s));
      if(ch.length) addLog("agent","Updated staff member",staffForm.name+": "+ch.join(", "));
    }
    setStaffModal(null);
  };
  const deleteStaff = () => {
    const s=staff.find(x=>x.id===staffDel);
    setStaff(p=>p.filter(x=>x.id!==staffDel));
    addLog("agent","Removed staff member",s?.name+" ("+s?.title+")");
    setStaffDel(null);
  };

  // ── TRAINING RECORD EDIT ─────────────────────────────────────────────
  const openEdit = (aid,tid,e) => {
    e?.stopPropagation();
    const r=records[aid]?.[tid]||{};
    setEditForm({trained:r.trained||false,trainingDate:r.trainingDate||"",assessmentScore:r.assessmentScore??"",signOff:r.signOff||""});
    setCellShadowForm({ shadowedId:"", date:"", completed:false, notes:"" });
    setCellShadowEdit(null);
    setEditModal({aid,tid});
  };
  const saveEdit = () => {
    const agent=agents.find(a=>a.id===editModal.aid), task=allTasks.find(t=>t.id===editModal.tid);
    const prev=records[editModal.aid]?.[editModal.tid]||{};
    const newScore=editForm.assessmentScore===""?null:Number(editForm.assessmentScore);
    const changes=[];
    if(!!editForm.trained!==!!prev.trained) changes.push(editForm.trained?"marked trained":"unmarked trained");
    if(editForm.trainingDate!==(prev.trainingDate||"")) changes.push("date \u2192 "+(editForm.trainingDate||"cleared"));
    if(newScore!==prev.assessmentScore) changes.push("score \u2192 "+(newScore??"cleared"));
    if(editForm.signOff!==(prev.signOff||"")) changes.push("sign-off \u2192 "+(editForm.signOff||"cleared"));
    setRecords(p=>({...p,[editModal.aid]:{...p[editModal.aid],[editModal.tid]:{trained:editForm.trained,trainingDate:editForm.trainingDate,assessmentScore:newScore,signOff:editForm.signOff}}}));
    if(changes.length) addLog("training","Updated training record",agent?.name+" \u00b7 "+task?.label+": "+changes.join(", "),{agentName:agent?.name});
    setEditModal(null);
  };

  // ── MONTHLY ──────────────────────────────────────────────────────────
  const openMonthly = (aid,e) => { e?.stopPropagation(); setMForm({month:"",prod:"",qa:""}); setMEditing(null); setMModal(aid); setShowFormErr(false); };
  const startEditM  = (aid,ym) => { const v=monthly[aid]?.[ym]||{}; setMForm({month:ym,prod:v.prod??"",qa:v.qa??""}); setMEditing(ym); };
  const saveM = () => {
    const {month,prod,qa}=mForm;
    if(!month||prod===""||qa==="") { setShowFormErr(true); return; }
    const agent=agents.find(a=>a.id===mModal);
    const existed=!!monthly[mModal]?.[month];
    setMonthly(p=>({...p,[mModal]:{...p[mModal],[month]:{prod:Number(prod),qa:Number(qa)}}}));
    addLog("monthly",existed?"Updated monthly metrics":"Added monthly metrics",
      agent?.name+" \u00b7 "+fmtMonth(month)+": Prod "+prod+"%, QA "+qa+"%",{agentName:agent?.name});
    setMForm({month:"",prod:"",qa:""}); setMEditing(null);
  };
  const deleteM = (aid,ym) => {
    const agent=agents.find(a=>a.id===aid);
    setMonthly(p=>{const d={...p[aid]};delete d[ym];return{...p,[aid]:d};});
    addLog("monthly","Deleted monthly metrics",agent?.name+" \u00b7 "+fmtMonth(ym),{agentName:agent?.name});
    if(mEditing===ym){setMForm({month:"",prod:"",qa:""});setMEditing(null);}
  };

  // ── AGENTS ───────────────────────────────────────────────────────────
  const openAddAgent  = () => { setAgentForm({name:"",email:"",role:"cx_probation",startDate:new Date().toISOString().slice(0,10),lead:""}); setAgentModal("add"); setShowFormErr(false); };
  const openEditAgent = id => { setAgentForm({...agents.find(x=>x.id===id)}); setAgentModal(id); setShowFormErr(false); };
  const saveAgent = () => {
    if(!agentForm.name?.trim()||!agentForm.email?.trim()) { setShowFormErr(true); return; }
    if(agentModal==="add"){
      const nid=uid();
      setAgents(p=>[...p,{...agentForm,id:nid}]);
      setRecords(p=>({...p,[nid]:{}})); setMonthly(p=>({...p,[nid]:{}}));
      addLog("agent","Added agent",agentForm.name+" ("+getRoleInfo(agentForm.role)?.label+") \u00b7 "+agentForm.email,{agentName:agentForm.name});
    } else {
      const prev=agents.find(a=>a.id===agentModal);
      const ch=[];
      if(prev.name!==agentForm.name) ch.push("name: "+prev.name+" \u2192 "+agentForm.name);
      if(prev.email!==agentForm.email) ch.push("email: "+prev.email+" \u2192 "+agentForm.email);
      if(prev.role!==agentForm.role) ch.push("role: "+getRoleInfo(prev.role)?.shortLabel+" \u2192 "+getRoleInfo(agentForm.role)?.shortLabel);
      if(prev.lead!==agentForm.lead) ch.push("reports-to: "+(prev.lead||"none")+" \u2192 "+(agentForm.lead||"none"));
      if(prev.startDate!==agentForm.startDate) ch.push("start: "+prev.startDate+" \u2192 "+agentForm.startDate);
      setAgents(p=>p.map(a=>a.id===agentModal?{...agentForm,id:agentModal}:a));
      if(ch.length) addLog("agent","Edited agent",agentForm.name+": "+ch.join(" \u00b7 "),{agentName:agentForm.name});
    }
    setAgentModal(null);
  };
  const deleteAgent = () => {
    const ag=agents.find(a=>a.id===agentDel);
    setAgents(p=>p.filter(a=>a.id!==agentDel));
    setRecords(p=>{const d={...p};delete d[agentDel];return d;});
    setMonthly(p=>{const d={...p};delete d[agentDel];return d;});
    addLog("agent","Removed agent",ag?.name+" ("+getRoleInfo(ag?.role)?.label+") \u2014 all records deleted",{agentName:ag?.name});
    setAgentDel(null);
  };

  // ── MODULES ──────────────────────────────────────────────────────────
  const openAddModule  = () => { setModForm({label:"",color:MOD_COLORS[modules.length%MOD_COLORS.length],requiredForRole:"cx_probation"}); setModModal("add"); setShowFormErr(false); };
  const openEditModule = id => { setModForm({...modules.find(m=>m.id===id)}); setModModal(id); setShowFormErr(false); };
  const saveModule = () => {
    if(!modForm.label?.trim()) { setShowFormErr(true); return; }
    if(modModal==="add"){
      const nid=uid();
      setModules(p=>[...p,{...modForm,id:nid,order:p.length+1}]);
      addLog("module","Added module",modForm.label+" \u2192 "+getRoleInfo(modForm.requiredForRole)?.label);
    } else {
      const prev=modules.find(m=>m.id===modModal);
      const ch=[];
      if(prev.label!==modForm.label) ch.push("name: \""+prev.label+"\" \u2192 \""+modForm.label+"\"");
      if(prev.requiredForRole!==modForm.requiredForRole) ch.push("role: "+getRoleInfo(prev.requiredForRole)?.shortLabel+" \u2192 "+getRoleInfo(modForm.requiredForRole)?.shortLabel);
      if(prev.color!==modForm.color) ch.push("colour changed");
      setModules(p=>p.map(m=>m.id===modModal?{...m,...modForm,id:modModal}:m));
      if(ch.length) addLog("module","Edited module",modForm.label+": "+ch.join(" \u00b7 "));
    }
    setModModal(null);
  };
  const deleteModule = () => {
    const mod=modules.find(m=>m.id===modDel);
    const tids=tasks.filter(t=>t.moduleId===modDel).map(t=>t.id);
    setTasks(p=>p.filter(t=>t.moduleId!==modDel));
    setRecords(p=>{const nx={};Object.entries(p).forEach(([aid,r])=>{const nr={...r};tids.forEach(tid=>delete nr[tid]);nx[aid]=nr;});return nx;});
    setModules(p=>p.filter(m=>m.id!==modDel));
    addLog("module","Deleted module",mod?.label+" \u2014 "+tids.length+" tasks and all their records removed");
    setModDel(null);
  };

  // ── TASKS ────────────────────────────────────────────────────────────
  const openAddTask  = (moduleId) => { setTaskForm({label:"",moduleId:moduleId||modules[0]?.id||""}); setTaskModal("add"); setShowFormErr(false); };
  const openEditTask = id         => { setTaskForm({...tasks.find(t=>t.id===id)}); setTaskModal(id); setShowFormErr(false); };
  const saveTask = () => {
    if(!taskForm.label?.trim()||!taskForm.moduleId) { setShowFormErr(true); return; }
    const mod=modules.find(m=>m.id===taskForm.moduleId);
    if(taskModal==="add"){
      const nid=uid();
      const maxOrd=Math.max(0,...tasks.filter(t=>t.moduleId===taskForm.moduleId).map(t=>t.order||0));
      setTasks(p=>[...p,{...taskForm,id:nid,order:maxOrd+1}]);
      setRecords(p=>{const nx={...p};agents.forEach(a=>{nx[a.id]={...nx[a.id],[nid]:{trained:false,trainingDate:null,assessmentScore:null,signOff:null}};});return nx;});
      addLog("task","Added task","\""+taskForm.label+"\" \u2192 module: "+mod?.label);
    } else {
      const prev=tasks.find(t=>t.id===taskModal);
      const prevMod=modules.find(m=>m.id===prev?.moduleId);
      const ch=[];
      if(prev.label!==taskForm.label) ch.push("name: \""+prev.label+"\" \u2192 \""+taskForm.label+"\"");
      if(prev.moduleId!==taskForm.moduleId) ch.push("module: "+(prevMod?.label||"?")+" \u2192 "+mod?.label);
      setTasks(p=>p.map(t=>t.id===taskModal?{...t,...taskForm,id:taskModal}:t));
      if(ch.length) addLog("task","Edited task",ch.join(" \u00b7 "));
    }
    setTaskModal(null);
  };
  const deleteTask = () => {
    const task=tasks.find(t=>t.id===taskDel);
    const mod=modules.find(m=>m.id===task?.moduleId);
    setTasks(p=>p.filter(t=>t.id!==taskDel));
    setRecords(p=>{const nx={};Object.entries(p).forEach(([aid,r])=>{const nr={...r};delete nr[taskDel];nx[aid]=nr;});return nx;});
    addLog("task","Deleted task","\""+task?.label+"\" from "+mod?.label+" \u2014 all training records removed");
    setTaskDel(null);
  };
  const reassignTask = (taskId, newModuleId) => {
    const task=tasks.find(t=>t.id===taskId);
    const prevMod=modules.find(m=>m.id===task?.moduleId);
    const newMod=modules.find(m=>m.id===newModuleId);
    setTasks(p=>p.map(t=>t.id===taskId?{...t,moduleId:newModuleId}:t));
    addLog("task","Reassigned task","\""+task?.label+"\": "+(prevMod?.label||"?")+" \u2192 "+newMod?.label);
  };

  // ── SHADOWING CRUD ───────────────────────────────────────────────────
  const openShadow = (aid, e) => {
    e?.stopPropagation();
    const expAgents = agents.filter(a => a.id !== aid && getRoleInfo(a.role)?.tier >= (getRoleInfo(agents.find(x=>x.id===aid)?.role)?.tier||1));
    setShadowForm({ shadowedId: expAgents[0]?.id || "", date:"", completed:false, notes:"", taskIds:[] });
    setShadowEdit(null);
    setShadowModal(aid);
    setShowFormErr(false);
  };
  const startEditShadow = (aid, session) => {
    setShadowForm({ shadowedId:session.shadowedId, date:session.date, completed:session.completed, notes:session.notes||"", taskIds:session.taskIds||[] });
    setShadowEdit(session.id);
  };
  const toggleShadowTask = (tid) => {
    setShadowForm(f => ({ ...f, taskIds: f.taskIds.includes(tid) ? f.taskIds.filter(x=>x!==tid) : [...f.taskIds, tid] }));
  };
  const saveShadow = () => {
    const { shadowedId, date, completed, notes, taskIds } = shadowForm;
    if (!shadowedId || !date) { setShowFormErr(true); return; }
    const agent    = agents.find(a => a.id === shadowModal);
    const shadowed = findPerson(shadowedId);
    const taskLabel = taskIds.length ? ` · ${taskIds.length} task${taskIds.length>1?"s":""}` : "";
    if (shadowEdit) {
      setShadowing(p => ({ ...p, [shadowModal]: (p[shadowModal]||[]).map(s => s.id===shadowEdit ? { ...s, shadowedId, date, completed, notes, taskIds } : s) }));
      addLog("shadowing","Updated shadowing session", agent?.name+" shadowed "+shadowed?.name+" on "+date+taskLabel, { agentName:agent?.name });
    } else {
      const nid = uid();
      setShadowing(p => ({ ...p, [shadowModal]: [...(p[shadowModal]||[]), { id:nid, shadowedId, date, completed, notes, taskIds }] }));
      addLog("shadowing","Added shadowing session", agent?.name+" shadowed "+shadowed?.name+" on "+date+(completed?" (completed)":"")+taskLabel, { agentName:agent?.name });
    }
    setShadowForm({ shadowedId:"", date:"", completed:false, notes:"", taskIds:[] });
    setShadowEdit(null);
  };
  const deleteShadow = (aid, sid) => {
    const agent   = agents.find(a => a.id === aid);
    const session = (shadowing[aid]||[]).find(s => s.id === sid);
    const shadowed= findPerson(session?.shadowedId);
    setShadowing(p => ({ ...p, [aid]: (p[aid]||[]).filter(s => s.id !== sid) }));
    addLog("shadowing","Removed shadowing session", agent?.name+" / "+shadowed?.name+" on "+session?.date, { agentName:agent?.name });
    if (shadowEdit === sid) { setShadowForm({ shadowedId:"", date:"", completed:false, notes:"", taskIds:[] }); setShadowEdit(null); }
  };
  const toggleShadowComplete = (aid, sid) => {
    const agent   = agents.find(a => a.id === aid);
    const session = (shadowing[aid]||[]).find(s => s.id === sid);
    const shadowed= findPerson(session?.shadowedId);
    setShadowing(p => ({ ...p, [aid]: (p[aid]||[]).map(s => s.id===sid ? { ...s, completed:!s.completed } : s) }));
    addLog("shadowing", session?.completed?"Marked session incomplete":"Marked session complete", agent?.name+" / "+shadowed?.name+" on "+session?.date, { agentName:agent?.name });
  };

  // ── CELL-MODAL inline shadowing (task pre-scoped) ─────────────────────
  const startEditCellShadow = (session) => {
    setCellShadowForm({ shadowedId:session.shadowedId, date:session.date, completed:session.completed, notes:session.notes||"" });
    setCellShadowEdit(session.id);
  };
  const saveCellShadow = (aid, tid) => {
    const { shadowedId, date, completed, notes } = cellShadowForm;
    if (!shadowedId || !date) return;
    const agent   = agents.find(a => a.id === aid);
    const shadowed= findPerson(shadowedId);
    if (cellShadowEdit) {
      // Update existing session — ensure this task is in taskIds
      setShadowing(p => ({ ...p, [aid]: (p[aid]||[]).map(s => {
        if (s.id !== cellShadowEdit) return s;
        const taskIds = [...new Set([...(s.taskIds||[]), tid])];
        return { ...s, shadowedId, date, completed, notes, taskIds };
      })}));
      addLog("shadowing","Updated shadowing session", agent?.name+" / "+shadowed?.name+" on "+date+" · "+allTasks.find(t=>t.id===tid)?.label, { agentName:agent?.name });
    } else {
      const nid = uid();
      setShadowing(p => ({ ...p, [aid]: [...(p[aid]||[]), { id:nid, shadowedId, date, completed, notes, taskIds:[tid] }] }));
      addLog("shadowing","Added shadowing session", agent?.name+" shadowed "+shadowed?.name+" on "+date+(completed?" (completed)":"")+" · "+allTasks.find(t=>t.id===tid)?.label, { agentName:agent?.name });
    }
    setCellShadowForm({ shadowedId:"", date:"", completed:false, notes:"" });
    setCellShadowEdit(null);
  };

  // ── CALENDAR CRUD ─────────────────────────────────────────────────────
  const BLANK_CAL = { title:"", type:"training", date:"", startTime:"09:00", endTime:"10:00", agentIds:[], trainerId:"", taskIds:[], location:"", notes:"" };
  const openAddCal   = (date="") => { setCalForm({...BLANK_CAL, date}); setCalEventModal("add"); setShowFormErr(false); };
  const openEditCal  = (id)      => { setCalForm({...calEvents.find(e=>e.id===id)}); setCalEventModal(id); setShowFormErr(false); };
  const saveCalEvent = () => {
    if (!calForm.title?.trim() || !calForm.date) { setShowFormErr(true); return null; }
    let savedId;
    if (calEventModal==="add") {
      savedId = uid();
      setCalEvents(p=>[...p, {...calForm, id:savedId, gcalCreated:false}]);
      addLog("calendar","Scheduled session", calForm.title+" on "+calForm.date);
    } else {
      savedId = calEventModal;
      setCalEvents(p=>p.map(e=>e.id===calEventModal?{...e,...calForm}:e));
      addLog("calendar","Updated session", calForm.title+" on "+calForm.date);
    }
    setCalEventModal(null);
    return savedId;
  };
  const deleteCalEvent = (id) => {
    const ev = calEvents.find(e=>e.id===id);
    setCalEvents(p=>p.filter(e=>e.id!==id));
    addLog("calendar","Removed session", ev?.title+" on "+ev?.date);
    setCalDelId(null); setCalEventModal(null);
  };
  const markGcalCreated = (id) => setCalEvents(p=>p.map(e=>e.id===id?{...e,gcalCreated:true}:e));

  // Build a Google Calendar pre-filled URL and open it
  const openGcal = (ev) => {
    const fmt = (d,t) => d.replace(/-/g,"")+"T"+t.replace(":","")+"00";
    const params = new URLSearchParams();
    params.set("action","EDIT");
    params.set("text", ev.title);
    params.set("dates", fmt(ev.date,ev.startTime)+"/"+fmt(ev.date,ev.endTime));
    const allParticipantPeople = [...(ev.agentIds||[]), ev.trainerId].filter(Boolean).map(id=>findPerson(id)).filter(Boolean);
    let details = "";
    if (ev.type==="training") details += "Training Session\n";
    if (ev.type==="shadowing") details += "Shadowing Session\n";
    const taskNames = (ev.taskIds||[]).map(id=>allTasks.find(t=>t.id===id)?.label).filter(Boolean);
    if (taskNames.length) details += "Tasks: "+taskNames.join(", ")+"\n";
    if (ev.notes) details += "\n"+ev.notes;
    params.set("details", details.trim());
    if (ev.location) params.set("location", ev.location);
    allParticipantPeople.forEach(a=>params.append("add", a.email));
    window.open("https://calendar.google.com/calendar/render?"+params.toString(), "_blank");
    markGcalCreated(ev.id);
  };

  // ── THRESHOLDS ───────────────────────────────────────────────────────
  const startEditS = rid => { setSForm({...thresholds[rid]}); setSRow(rid); };
  const saveS = () => {
    const prev=thresholds[sRow], role=getRoleInfo(sRow);
    const newT={...sForm,prodPct:sForm.noProd?null:Number(sForm.prodPct),qaAbsolute:Number(sForm.qaAbsolute),periodMonths:sForm.noProd?null:Number(sForm.periodMonths)};
    const ch=[];
    if(prev.prodPct!==newT.prodPct) ch.push("prod% "+(prev.prodPct??"N/A")+" \u2192 "+(newT.prodPct??"N/A"));
    if(prev.qaAbsolute!==newT.qaAbsolute) ch.push("QA min "+prev.qaAbsolute+"% \u2192 "+newT.qaAbsolute+"%");
    if(prev.periodMonths!==newT.periodMonths) ch.push("period "+(prev.periodMonths??"N/A")+" \u2192 "+(newT.periodMonths??"N/A")+" months");
    if(prev.noProd!==newT.noProd) ch.push(newT.noProd?"prod threshold disabled":"prod threshold enabled");
    setThresholds(p=>({...p,[sRow]:newT}));
    if(ch.length) addLog("threshold","Updated threshold",role?.label+": "+ch.join(", "));
    setSRow(null);
  };

  // ── PASS SCORE ───────────────────────────────────────────────────────
  const updatePassScore = (val) => {
    const clamped=Math.min(100,Math.max(50,val));
    addLog("assessment","Changed pass score","Assessment pass score: "+passScore+"% \u2192 "+clamped+"%");
    setPassScore(clamped);
  };

  // ── DASHBOARD STATS ──────────────────────────────────────────────────
  const dashStats = useMemo(() => {
    const rc  = agents.filter(a=>ready(a.id,a.role)).length;
    const byr = ROLES.map(ro=>({...ro,count:agents.filter(a=>a.role===ro.id).length}));
    const cmp = agents.map(a=>{const{total,trained}=trainProg(a.id,a.role);return total>0?(trained/total)*100:0;});
    return{rc,byr,avgC:agents.length?Math.round(cmp.reduce((a,b)=>a+b,0)/cmp.length):0};
  },[agents,ready,trainProg]);

  // ── FILTERED LOG ─────────────────────────────────────────────────────
  const filteredLog = useMemo(() => {
    let l=auditLog;
    if(logFilter!=="all") l=l.filter(e=>e.category===logFilter);
    if(logSearch.trim()) l=l.filter(e=>
      e.detail.toLowerCase().includes(logSearch.toLowerCase())||
      e.action.toLowerCase().includes(logSearch.toLowerCase())||
      (e.agentName||"").toLowerCase().includes(logSearch.toLowerCase())
    );
    return l;
  },[auditLog,logFilter,logSearch]);

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return(
    <div style={{backgroundColor:"#080d1a",minHeight:"100vh",color:"#e2e8f0",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <GlobalStyles/>

      {/* HEADER */}
      <header style={{backgroundColor:"#0a1120",borderBottom:"1px solid #1a2b42",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:"52px",position:"sticky",top:0,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"26px",height:"26px",background:"linear-gradient(135deg,#0ea5e9,#8b5cf6)",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>⚡</div>
          <span style={{fontWeight:700,fontSize:"14px",letterSpacing:"-0.01em"}}>Operations Skills Matrix</span>
          <span style={{fontSize:"10px",color:"#2a3a52",fontFamily:"'IBM Plex Mono',monospace"}}>Rhino Entertainment Group</span>
        </div>
        <nav style={{display:"flex",gap:"2px",alignItems:"center"}}>
          {[{id:"dashboard",label:"Dashboard"},{id:"matrix",label:"Skills Matrix"},{id:"calendar",label:"📆 Calendar"},{id:"log",label:"Activity Log"},{id:"settings",label:"⚙ Settings"}].map(v=>(
            <button key={v.id} className="nbtn" onClick={()=>setView(v.id)} style={{padding:"5px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:500,backgroundColor:view===v.id?"#1e3a5f":"transparent",color:view===v.id?"#7dd3fc":"#64748b",transition:"all 0.15s",fontFamily:"'IBM Plex Sans',sans-serif",position:"relative"}}>
              {v.label}
              {v.id==="log"&&auditLog.length>0&&<span style={{position:"absolute",top:"-2px",right:"-2px",width:"7px",height:"7px",borderRadius:"50%",backgroundColor:"#0ea5e9",border:"2px solid #0a1120"}}/>}
            </button>
          ))}
        </nav>
      </header>

      <main style={{padding:"22px 24px",maxWidth:"1700px",margin:"0 auto"}}>

        {/* ═══════════════════════ DASHBOARD ═══════════════════════════ */}
        {view==="dashboard"&&(
          <div className="fadein">
            <div style={{marginBottom:"20px"}}><h1 style={{fontSize:"20px",fontWeight:700,marginBottom:"3px"}}>Team Overview</h1><p style={{color:"#475569",fontSize:"13px"}}>Rolling averages per role period · Click any card to view full profile</p></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"18px"}}>
              {[{label:"Total Agents",value:agents.length,icon:"👥",color:"#0ea5e9"},{label:"Ready to Progress",value:dashStats.rc,icon:"🚀",color:"#22c55e"},{label:"Avg Training Completion",value:`${dashStats.avgC}%`,icon:"📊",color:"#f59e0b"},{label:"Assessment Pass Score",value:`≥${passScore}%`,icon:"🎯",color:"#a78bfa"}].map(s=>(
                <div key={s.label} style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"18px 20px"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:"10px",color:"#475569",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div><div style={{fontSize:"28px",fontWeight:700,color:s.color,fontFamily:"'IBM Plex Mono',monospace"}}>{s.value}</div></div><span style={{fontSize:"18px",opacity:0.7}}>{s.icon}</span></div></div>
              ))}
            </div>
            <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"16px 20px",marginBottom:"18px"}}>
              <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"12px",fontWeight:600}}>Team Composition</div>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>{dashStats.byr.map(ro=>ro.count>0&&(<div key={ro.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",backgroundColor:"#080d1a",borderRadius:"8px",border:`1px solid ${ro.color}33`}}><div style={{width:"7px",height:"7px",borderRadius:"50%",backgroundColor:ro.color}}/><span style={{fontSize:"12px",color:"#94a3b8"}}>{ro.label}</span><span style={{fontSize:"20px",fontWeight:700,color:ro.color,fontFamily:"'IBM Plex Mono',monospace"}}>{ro.count}</span></div>))}</div>
            </div>
            <div style={{display:"flex",gap:"6px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:"10px",color:"#334155",letterSpacing:"0.07em",marginRight:"4px"}}>FILTER:</span>
              {[{id:"all",label:"All Roles",color:"#64748b"},...ROLES].map(ro=>(<button key={ro.id} onClick={()=>setFilterRole(ro.id)} style={{padding:"4px 12px",borderRadius:"20px",border:`1px solid ${filterRole===ro.id?(ro.color||"#7dd3fc"):"#1a2b42"}`,backgroundColor:filterRole===ro.id?(ro.color||"#7dd3fc")+"22":"transparent",color:filterRole===ro.id?(ro.color||"#7dd3fc"):"#64748b",fontSize:"11px",cursor:"pointer",transition:"all 0.15s",fontFamily:"'IBM Plex Sans',sans-serif"}}>{ro.label}</button>))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))",gap:"10px"}}>
              {fAgents.map(agent=>{
                const role=getRoleInfo(agent.role);
                const {total,trained,passed}=trainProg(agent.id,agent.role);
                const rdy=ready(agent.id,agent.role);
                const tc=checkThresh(agent.id,agent.role,agents,monthly,thresholds);
                const thr=thresholds[agent.role];
                return(
                  <div key={agent.id} className="acard" onClick={()=>{setSelId(agent.id);setView("agent");}} style={{backgroundColor:"#0d1527",border:`1px solid ${rdy?"#22c55e44":"#1a2b42"}`,borderRadius:"10px",padding:"16px",cursor:"pointer",transition:"all 0.15s",boxShadow:rdy?"0 0 18px #22c55e18":"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                      <div><div style={{fontWeight:600,fontSize:"13px",marginBottom:"2px"}}>{agent.name}</div><div style={{fontSize:"10px",color:"#334155",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"5px"}}>{agent.email}</div><Badge role={role}/></div>
                      {rdy&&<span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"4px",backgroundColor:"#14532d",color:"#86efac",fontWeight:700,letterSpacing:"0.04em",flexShrink:0}}>↑ READY</span>}
                    </div>
                    <div style={{marginBottom:"10px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#475569",marginBottom:"4px"}}><span>Training</span><span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#64748b"}}>{trained}/{total} · {passed} assessed</span></div><PBar value={trained} max={total} color={role.color}/></div>
                    <div style={{backgroundColor:"#080d1a",borderRadius:"7px",padding:"10px"}}>
                      {tc.insuf?<div style={{color:"#475569",fontSize:"11px",textAlign:"center"}}>📋 {tc.avg.count}{thr.periodMonths?`/${thr.periodMonths}`:""} months{thr.periodMonths&&tc.avg.count<thr.periodMonths&&<span style={{color:"#f59e0b"}}> — need {thr.periodMonths-tc.avg.count} more</span>}</div>:(
                        <div style={{display:"grid",gridTemplateColumns:thr.noProd?"1fr":"1fr 1fr",gap:"8px"}}>
                          {!thr.noProd&&<div><div style={{fontSize:"9px",color:"#475569",marginBottom:"2px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Prod ({thr.periodMonths}mo)</div><span style={{fontSize:"14px",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",color:tc.prodMet?"#22c55e":"#f87171"}}>{tc.avg.prod}%</span><span style={{fontSize:"9px",color:"#334155",marginLeft:"4px"}}>/ {tc.prodReq}%</span><div style={{fontSize:"8px",color:"#334155",marginTop:"1px"}}>Grp: {tc.grp?.prod}%</div></div>}
                          <div><div style={{fontSize:"9px",color:"#475569",marginBottom:"2px",textTransform:"uppercase",letterSpacing:"0.05em"}}>QA {thr.noProd?"(all)":`(${thr.periodMonths}mo)`}</div><span style={{fontSize:"14px",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",color:tc.qaMet?"#22c55e":"#f87171"}}>{tc.avg.qa}%</span><span style={{fontSize:"9px",color:"#334155",marginLeft:"4px"}}>/ {thr.qaAbsolute}%</span></div>
                        </div>
                      )}
                    </div>
                    <button onClick={e=>openMonthly(agent.id,e)} style={{marginTop:"8px",width:"100%",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"5px",fontSize:"10px",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",letterSpacing:"0.04em"}}>📅 EDIT MONTHLY METRICS</button>
                    <button onClick={e=>openShadow(agent.id,e)} style={{marginTop:"4px",width:"100%",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#38bdf8",padding:"5px",fontSize:"10px",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",letterSpacing:"0.04em"}}>👁 SHADOWING {(shadowing[agent.id]||[]).length>0?`(${(shadowing[agent.id]||[]).filter(s=>s.completed).length}/${(shadowing[agent.id]||[]).length})`:""}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════ MATRIX ═══════════════════════════ */}
        {view==="matrix"&&(
          <div className="fadein">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"14px",gap:"12px",flexWrap:"wrap"}}>
              <div><h1 style={{fontSize:"20px",fontWeight:700,marginBottom:"3px"}}>Skills Matrix</h1><p style={{color:"#475569",fontSize:"13px"}}>Click any cell to edit training records · Click agent name to open profile</p></div>
              <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} style={{...ISS,width:"auto",minWidth:"180px"}}><option value="all">All Roles</option>{ROLES.map(ro=><option key={ro.id} value={ro.id}>{ro.label}</option>)}</select>
            </div>
            <div style={{display:"flex",gap:"16px",marginBottom:"12px",flexWrap:"wrap",alignItems:"center"}}>
              {[{c:SC.none,l:"Not Started"},{c:SC.trained,l:"Trained – Pending Assessment"},{c:SC.passed,l:`Passed (≥${passScore}%)`},{c:SC.failed,l:`Failed (<${passScore}%)`}].map(x=>(
                <div key={x.l} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:"#64748b"}}><div style={{width:"11px",height:"11px",borderRadius:"3px",backgroundColor:x.c,border:"1px solid #1e2d4d"}}/>{x.l}</div>
              ))}
              <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:"#64748b"}}>
                <div style={{width:"11px",height:"11px",borderRadius:"3px",backgroundColor:SC.none,border:"1px solid #1e2d4d",position:"relative",display:"flex",alignItems:"flex-end",justifyContent:"flex-end"}}>
                  <div style={{width:"5px",height:"5px",borderRadius:"50%",backgroundColor:"#22d3ee",border:"1px solid #0a1a2e",position:"absolute",bottom:"-1px",right:"-1px"}}/>
                </div>
                Shadowed (completed session)
              </div>
            </div>
            <div style={{overflowX:"auto",borderRadius:"10px",border:"1px solid #1a2b42"}}>
              <table style={{borderCollapse:"collapse",fontSize:"11px",minWidth:"max-content"}}>
                <thead>
                  <tr style={{backgroundColor:"#0a1120"}}>
                    <th rowSpan={2} style={{width:"200px",minWidth:"200px",position:"sticky",left:0,zIndex:11,backgroundColor:"#0a1120",borderRight:"2px solid #1e2d4d",borderBottom:"2px solid #1e2d4d",padding:"10px 14px",textAlign:"left"}}><span style={{fontSize:"10px",color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>Agent</span></th>
                    {[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(mod=>{const mt=allTasks.filter(t=>t.moduleId===mod.id);if(!mt.length) return null;return <th key={mod.id} colSpan={mt.length} style={{borderBottom:"1px solid #1e2d4d",borderRight:"2px solid #1a2b42",padding:"7px 4px",textAlign:"center",backgroundColor:mod.color+"11"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}><div style={{width:"5px",height:"5px",borderRadius:"50%",backgroundColor:mod.color,flexShrink:0}}/><span style={{color:mod.color,fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{mod.label}</span></div></th>;})}
                    <th rowSpan={2} style={{minWidth:"110px",borderLeft:"2px solid #1e2d4d",borderBottom:"2px solid #1e2d4d",padding:"8px",textAlign:"center",backgroundColor:"#0a1120"}}><span style={{fontSize:"9px",color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>Metrics</span></th>
                    <th rowSpan={2} style={{minWidth:"96px",borderLeft:"1px solid #1e2d4d",borderBottom:"2px solid #1e2d4d",padding:"8px",textAlign:"center",backgroundColor:"#0a1120"}}><span style={{fontSize:"9px",color:"#38bdf8",textTransform:"uppercase",letterSpacing:"0.07em"}}>👁 Shadow</span></th>
                  </tr>
                  <tr style={{backgroundColor:"#080d1a"}}>
                    {allTasks.map((task,i)=>{const last=allTasks[i+1]?.moduleId!==task.moduleId;return <th key={task.id} title={task.label} style={{borderBottom:"2px solid #1e2d4d",borderRight:last?"2px solid #1a2b42":"1px solid #111827",padding:"4px 3px",width:"42px",minWidth:"42px",maxWidth:"42px"}}><div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:"9px",color:"#4b5563",maxHeight:"90px",overflow:"hidden",whiteSpace:"nowrap"}}>{task.label}</div></th>;})}
                  </tr>
                </thead>
                <tbody>
                  {fAgents.map((agent,ri)=>{
                    const role=getRoleInfo(agent.role);
                    const rdy=ready(agent.id,agent.role);
                    const tc=checkThresh(agent.id,agent.role,agents,monthly,thresholds);
                    const thr=thresholds[agent.role];
                    const rbg=ri%2===0?"#080d1a":"#0a1020";
                    return(
                      <tr key={agent.id} className="mrow" style={{"--rbg":rbg,borderBottom:"1px solid #111827"}}>
                        <td onClick={()=>{setSelId(agent.id);setView("agent");}} className="sticky-col" style={{position:"sticky",left:0,zIndex:5,borderRight:"2px solid #1e2d4d",padding:"7px 12px",cursor:"pointer",minWidth:"200px"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontWeight:600,fontSize:"12px",color:"#e2e8f0",marginBottom:"1px"}}>{agent.name}</div><div style={{fontSize:"9px",color:"#2a3a52",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"3px"}}>{agent.email}</div><Badge role={role}/></div>{rdy&&<span style={{fontSize:"12px"}}>🚀</span>}</div>
                        </td>
                        {allTasks.map((task,ci)=>{
                          const st=cellSt(agent.id,task.id,records,passScore);
                          const rec=records[agent.id]?.[task.id]||{};
                          const last=allTasks[ci+1]?.moduleId!==task.moduleId;
                          // shadowing: any completed session for this agent that includes this task
                          const hasShadow = (shadowing[agent.id]||[]).some(s=>s.completed && (s.taskIds||[]).includes(task.id));
                          return(
                            <td key={task.id} className="mcell" onClick={e=>openEdit(agent.id,task.id,e)} title={`${agent.name} — ${task.label}\n${st}${rec.assessmentScore!=null?`\nScore: ${rec.assessmentScore}%`:""}${rec.trainingDate?`\nDate: ${rec.trainingDate}`:""}${rec.signOff?`\nSigned: ${rec.signOff}`:""}${hasShadow?"\n👁 Shadowing completed":""}`} style={{width:"42px",minWidth:"42px",maxWidth:"42px",height:"38px",borderRight:last?"2px solid #1a2b42":"1px solid #0f1523",padding:"3px",cursor:"pointer"}}>
                              <div style={{height:"100%",borderRadius:"4px",backgroundColor:SC[st],display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:st==="none"?"#243247":"#fff",fontWeight:700,transition:"filter 0.1s",position:"relative"}}>
                                {SI[st]}
                                {hasShadow&&<div style={{position:"absolute",bottom:"1px",right:"1px",width:"6px",height:"6px",borderRadius:"50%",backgroundColor:"#22d3ee",border:"1.5px solid #080d1a",flexShrink:0}}/>}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{borderLeft:"2px solid #1e2d4d",padding:"5px 6px"}}>
                          <div onClick={e=>openMonthly(agent.id,e)} style={{backgroundColor:"#0a1120",border:"1px solid #1e2d4d",borderRadius:"6px",padding:"5px 7px",cursor:"pointer",minWidth:"96px"}}>
                            {tc.insuf?<div style={{fontSize:"9px",color:"#475569",textAlign:"center"}}>📋 {tc.avg.count}/{thr.periodMonths||"∞"}mo</div>:(
                              <>{!thr.noProd&&<div style={{fontSize:"9px",color:tc.prodMet?"#22c55e":"#f87171",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"2px"}}>P {tc.avg.prod}%<span style={{color:"#334155",fontSize:"8px"}}> /{tc.prodReq}%</span></div>}<div style={{fontSize:"9px",color:tc.qaMet?"#22c55e":"#f87171",fontFamily:"'IBM Plex Mono',monospace"}}>Q {tc.avg.qa}%<span style={{color:"#334155",fontSize:"8px"}}> /{thr.qaAbsolute}%</span></div></>
                            )}
                          </div>
                        </td>
                        <td style={{borderLeft:"1px solid #1e2d4d",padding:"5px 6px"}}>
                          {(()=>{
                            const sessions = shadowing[agent.id]||[];
                            const done     = sessions.filter(s=>s.completed).length;
                            return(
                              <div onClick={e=>openShadow(agent.id,e)} style={{backgroundColor:"#0a1120",border:"1px solid #1e2d4d",borderRadius:"6px",padding:"5px 7px",cursor:"pointer",minWidth:"82px",textAlign:"center"}}>
                                {sessions.length===0
                                  ? <div style={{fontSize:"9px",color:"#334155"}}>None</div>
                                  : <><div style={{fontSize:"11px",fontWeight:700,color:done===sessions.length?"#38bdf8":"#64748b",fontFamily:"'IBM Plex Mono',monospace"}}>{done}/{sessions.length}</div>
                                     <div style={{fontSize:"8px",color:"#334155",marginTop:"1px"}}>{done===sessions.length?"✓ all done":"in progress"}</div></>
                                }
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:"14px",display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {ROLES.map(ro=>{const n=agents.filter(a=>a.role===ro.id).length;const rd=agents.filter(a=>a.role===ro.id&&ready(a.id,a.role)).length;if(!n) return null;
                return <div key={ro.id} style={{backgroundColor:"#0d1527",border:`1px solid ${ro.color}33`,borderRadius:"8px",padding:"8px 14px",display:"flex",alignItems:"center",gap:"10px"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:ro.color}}/><span style={{fontSize:"11px",color:"#94a3b8"}}>{ro.shortLabel}</span><span style={{fontSize:"11px",fontFamily:"'IBM Plex Mono',monospace",color:ro.color}}>{n}</span>{rd>0&&<span style={{fontSize:"10px",color:"#22c55e",backgroundColor:"#14532d33",padding:"2px 6px",borderRadius:"4px"}}>↑ {rd} ready</span>}</div>;
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════ CALENDAR ════════════════════════════ */}
        {view==="calendar"&&(()=>{
          const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
          const TYPE_C = { training:"#0ea5e9", shadowing:"#22d3ee", other:"#a78bfa" };
          const TYPE_L = { training:"Training", shadowing:"Shadowing", other:"Other" };

          // Build grid cells for the month
          const firstDay  = new Date(calYear, calMonth, 1);
          const lastDay   = new Date(calYear, calMonth+1, 0);
          // Mon-based: Mon=0 … Sun=6
          const startDow  = (firstDay.getDay()+6)%7;
          const totalCells= Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
          const cells     = Array.from({length:totalCells},(_,i)=>{
            const d = i - startDow + 1;
            if (d<1||d>lastDay.getDate()) return null;
            return d;
          });
          const isoDay    = d => `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const todayISO  = new Date().toISOString().slice(0,10);
          const monthEvts = calEvents.filter(e=>e.date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,"0")}`));

          const upcomingEvts = [...calEvents].filter(e=>e.date>=todayISO).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)).slice(0,5);

          return(
            <div className="fadein">
              {/* Page header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px",flexWrap:"wrap",gap:"10px"}}>
                <div>
                  <h1 style={{fontSize:"20px",fontWeight:700,marginBottom:"3px"}}>Training Calendar</h1>
                  <p style={{color:"#475569",fontSize:"13px"}}>Schedule training and shadowing sessions · syncs to Google Calendar</p>
                </div>
                <button onClick={()=>openAddCal()} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"8px",color:"#fff",padding:"9px 20px",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",gap:"7px"}}>＋ Schedule Session</button>
              </div>

              {/* Upcoming strip */}
              {upcomingEvts.length>0&&(
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"14px 18px",marginBottom:"16px"}}>
                  <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px",fontWeight:600}}>Upcoming Sessions</div>
                  <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px"}}>
                    {upcomingEvts.map(ev=>{
                      const c=TYPE_C[ev.type]||"#a78bfa";
                      const evAgents=(ev.agentIds||[]).map(id=>agents.find(a=>a.id===id)?.name.split(" ")[0]).filter(Boolean);
                      const daysAway=Math.round((new Date(ev.date)-new Date(todayISO))/(864e5));
                      return(
                        <div key={ev.id} onClick={()=>openEditCal(ev.id)} style={{flexShrink:0,backgroundColor:"#080d1a",border:`1px solid ${c}33`,borderLeft:`3px solid ${c}`,borderRadius:"8px",padding:"10px 14px",cursor:"pointer",minWidth:"180px",maxWidth:"220px"}}>
                          <div style={{fontSize:"10px",color:c,fontWeight:700,marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{TYPE_L[ev.type]} · {daysAway===0?"Today":daysAway===1?"Tomorrow":"in "+daysAway+"d"}</div>
                          <div style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0",marginBottom:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</div>
                          <div style={{fontSize:"10px",color:"#475569"}}>📅 {ev.date} · {ev.startTime}–{ev.endTime}</div>
                          {evAgents.length>0&&<div style={{fontSize:"10px",color:"#475569",marginTop:"2px"}}>👤 {evAgents.join(", ")}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month nav + grid */}
              <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden"}}>
                {/* Month navigation */}
                <div style={{padding:"14px 20px",borderBottom:"1px solid #1a2b42",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <button onClick={()=>{const d=new Date(calYear,calMonth-1);setCalYear(d.getFullYear());setCalMonth(d.getMonth());}} style={{background:"none",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"5px 12px",cursor:"pointer",fontSize:"13px",fontFamily:"'IBM Plex Sans',sans-serif"}}>‹</button>
                  <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                    <span style={{fontWeight:700,fontSize:"16px"}}>{new Date(calYear,calMonth).toLocaleString("en",{month:"long",year:"numeric"})}</span>
                    <button onClick={()=>{const n=new Date();setCalYear(n.getFullYear());setCalMonth(n.getMonth());}} style={{background:"none",border:"1px solid #1e2d4d",borderRadius:"5px",color:"#475569",padding:"3px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Today</button>
                  </div>
                  <button onClick={()=>{const d=new Date(calYear,calMonth+1);setCalYear(d.getFullYear());setCalMonth(d.getMonth());}} style={{background:"none",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"5px 12px",cursor:"pointer",fontSize:"13px",fontFamily:"'IBM Plex Sans',sans-serif"}}>›</button>
                </div>

                {/* Type legend */}
                <div style={{padding:"8px 20px",borderBottom:"1px solid #1a2b42",display:"flex",gap:"16px",flexWrap:"wrap"}}>
                  {Object.entries(TYPE_L).map(([k,l])=>(
                    <div key={k} style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:"#64748b"}}>
                      <div style={{width:"10px",height:"10px",borderRadius:"2px",backgroundColor:TYPE_C[k]+"44",border:`1px solid ${TYPE_C[k]}88`}}/>
                      {l}
                    </div>
                  ))}
                  <div style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",color:"#64748b",marginLeft:"auto"}}>
                    <div style={{width:"10px",height:"10px",borderRadius:"50%",backgroundColor:"#4ade80"}}/>
                    Added to Google Calendar
                  </div>
                </div>

                {/* Day headers */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #1a2b42"}}>
                  {DAYS.map(d=><div key={d} style={{padding:"8px 0",textAlign:"center",fontSize:"10px",color:"#334155",fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"}}>{d}</div>)}
                </div>

                {/* Calendar grid */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                  {cells.map((day,ci)=>{
                    const iso     = day ? isoDay(day) : null;
                    const isToday = iso===todayISO;
                    const isPast  = iso && iso<todayISO;
                    const dayEvts = day ? monthEvts.filter(e=>e.date===iso).sort((a,b)=>a.startTime.localeCompare(b.startTime)) : [];
                    const isLastRow=ci>=cells.length-7;
                    const isLastCol=(ci+1)%7===0;
                    return(
                      <div key={ci} onClick={()=>day&&!isPast&&openAddCal(iso)} style={{minHeight:"110px",borderRight:isLastCol?"none":"1px solid #0f1a2e",borderBottom:isLastRow?"none":"1px solid #0f1a2e",padding:"6px",cursor:day&&!isPast?"pointer":"default",backgroundColor:isToday?"#0a1f30":isPast?"#080c18":"transparent",transition:"background 0.1s"}}
                        onMouseEnter={e=>{if(day&&!isPast)e.currentTarget.style.backgroundColor=isToday?"#0c2540":"#0d1527";}}
                        onMouseLeave={e=>{if(day&&!isPast)e.currentTarget.style.backgroundColor=isToday?"#0a1f30":"transparent";}}>
                        {day&&(
                          <>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
                              <span style={{fontSize:"12px",fontWeight:isToday?700:400,color:isToday?"#7dd3fc":isPast?"#2a3a52":"#94a3b8",width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",backgroundColor:isToday?"#1e3a5f":"transparent"}}>{day}</span>
                              {dayEvts.length>0&&<span style={{fontSize:"9px",color:"#334155",fontFamily:"'IBM Plex Mono',monospace"}}>{dayEvts.length}</span>}
                            </div>
                            <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
                              {dayEvts.slice(0,3).map(ev=>{
                                const c=TYPE_C[ev.type]||"#a78bfa";
                                return(
                                  <div key={ev.id} onClick={e=>{e.stopPropagation();openEditCal(ev.id);}} style={{backgroundColor:c+"22",border:`1px solid ${c}44`,borderLeft:`2px solid ${c}`,borderRadius:"3px",padding:"2px 5px",cursor:"pointer",position:"relative"}} title={ev.title+" · "+ev.startTime}>
                                    <div style={{fontSize:"9px",color:c,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:ev.gcalCreated?"10px":"0"}}>{ev.startTime} {ev.title}</div>
                                    {ev.gcalCreated&&<div style={{position:"absolute",top:"2px",right:"3px",width:"5px",height:"5px",borderRadius:"50%",backgroundColor:"#4ade80"}} title="Added to Google Calendar"/>}
                                  </div>
                                );
                              })}
                              {dayEvts.length>3&&<div style={{fontSize:"9px",color:"#334155",paddingLeft:"4px"}}>+{dayEvts.length-3} more</div>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════ AGENT DETAIL ═══════════════════════ */}
        {view==="agent"&&selAgt&&(()=>{
          const role=getRoleInfo(selAgt.role),nxtR=getNextRole(selAgt.role),rdy=ready(selAgt.id,selAgt.role);
          const tc=checkThresh(selAgt.id,selAgt.role,agents,monthly,thresholds),thr=thresholds[selAgt.role];
          const mEnt=Object.entries(monthly[selAgt.id]||{}).sort(([a],[b])=>b.localeCompare(a));
          return(
            <div className="fadein">
              <button onClick={()=>setView("dashboard")} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"12px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"4px",fontFamily:"'IBM Plex Sans',sans-serif"}}>← Back to Dashboard</button>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"18px"}}>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"20px"}}>
                  <div style={{fontSize:"10px",color:role.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"6px"}}>{role.label}</div>
                  <div style={{fontSize:"22px",fontWeight:700,marginBottom:"4px"}}>{selAgt.name}</div>
                  <div style={{fontSize:"11px",color:"#475569",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"12px"}}>{selAgt.email}</div>
                  <div style={{display:"flex",gap:"16px",fontSize:"12px",color:"#475569",flexWrap:"wrap"}}><span>📋 Reports to: <span style={{color:"#94a3b8"}}>{selAgt.lead}</span></span><span>📅 Started: <span style={{color:"#94a3b8"}}>{selAgt.startDate}</span></span></div>
                </div>
                <div style={{backgroundColor:rdy?"#0a1f14":"#0d1527",border:`1px solid ${rdy?"#22c55e55":"#1a2b42"}`,borderRadius:"10px",padding:"18px 20px"}}>
                  <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"12px",fontWeight:600}}>Progression Status{nxtR&&<span style={{color:"#334155"}}> → {nxtR.label}</span>}</div>
                  {nxtR?(
                    <>
                      <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}><Gauge label={`Prod (${thr.periodMonths}mo avg)`} val={tc.avg.prod} req={tc.prodReq} met={tc.prodMet} na={thr.noProd} insuf={tc.insuf}/><Gauge label={`QA (${thr.periodMonths?thr.periodMonths+"mo":"all"})`} val={tc.avg.qa} req={thr.qaAbsolute} met={tc.qaMet} na={false} insuf={tc.insuf}/></div>
                      {!tc.insuf&&!thr.noProd&&tc.grp&&<div style={{fontSize:"10px",color:"#334155",marginBottom:"8px",backgroundColor:"#080d1a",borderRadius:"5px",padding:"6px 10px"}}>Group avg: <span style={{color:"#60a5fa",fontFamily:"'IBM Plex Mono',monospace"}}>Prod {tc.grp.prod}%  QA {tc.grp.qa}%</span> · Need {thr.prodPct}% of group = {tc.prodReq}%</div>}
                      {tc.insuf&&<div style={{fontSize:"11px",color:"#f59e0b",backgroundColor:"#78350f22",borderRadius:"6px",padding:"8px 10px",marginBottom:"8px"}}>⚠ {tc.avg.count} of {thr.periodMonths} required months recorded.</div>}
                      <div style={{padding:"10px 14px",borderRadius:"8px",backgroundColor:rdy?"#14532d":"#1a1f2e",border:`1px solid ${rdy?"#22c55e55":"#2d3748"}`,textAlign:"center"}}><span style={{fontSize:"13px",fontWeight:700,color:rdy?"#86efac":"#64748b"}}>{rdy?"✓ Ready to Progress":"⏳ Not Yet Eligible for Promotion"}</span></div>
                    </>
                  ):(
                    <div style={{padding:"18px",backgroundColor:"#1f0a2e",borderRadius:"8px",textAlign:"center",border:"1px solid #f472b633"}}><div style={{fontSize:"22px",marginBottom:"6px"}}>🏆</div><div style={{color:"#f472b6",fontWeight:700,fontSize:"14px"}}>Maximum Level Reached</div><div style={{fontSize:"11px",color:"#9d4e7f",marginTop:"4px"}}>Maintaining QA ≥ {thr.qaAbsolute}%</div></div>
                  )}
                </div>
              </div>

              {/* Monthly table */}
              <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",marginBottom:"14px",overflow:"hidden"}}>
                <SectionHeader title="Monthly Performance Data" subtitle={thr.periodMonths?`Last ${thr.periodMonths} months used for threshold`:"All months averaged"} action={<button onClick={e=>openMonthly(selAgt.id,e)} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>+ Add / Edit Month</button>}/>
                <div style={{overflowX:"auto"}}>
                  <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                    <thead><tr style={{backgroundColor:"#080d1a"}}>{["Month","Prod %","QA %","In Window","Prod vs Req","QA vs Req",""].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {mEnt.map(([ym,vals],idx)=>{
                        const inW=thr.periodMonths?idx<thr.periodMonths:true;
                        return(<tr key={ym} className="hrow" style={{borderBottom:"1px solid #111827",backgroundColor:"transparent"}}>
                          <td style={{padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",color:"#94a3b8",fontSize:"11px"}}>{fmtMonth(ym)}</td>
                          <td style={{padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:"#e2e8f0"}}>{vals.prod}%</td>
                          <td style={{padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:"#e2e8f0"}}>{vals.qa}%</td>
                          <td style={{padding:"9px 14px"}}><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"4px",backgroundColor:inW?"#1e3a8a33":"#1a1f2e",color:inW?"#60a5fa":"#334155"}}>{inW?"✓ Included":"Excluded"}</span></td>
                          <td style={{padding:"9px 14px",fontSize:"11px",color:(!thr.noProd&&tc.prodReq!=null)?(vals.prod>=tc.prodReq?"#22c55e":"#f87171"):"#334155"}}>{thr.noProd?"N/A":tc.prodReq!=null?(vals.prod>=tc.prodReq?"✓":`✗ ${(tc.prodReq-vals.prod).toFixed(1)}% below`):"—"}</td>
                          <td style={{padding:"9px 14px",fontSize:"11px",color:vals.qa>=thr.qaAbsolute?"#22c55e":"#f87171"}}>{vals.qa>=thr.qaAbsolute?"✓":`✗ ${(thr.qaAbsolute-vals.qa).toFixed(1)}% below`}</td>
                          <td style={{padding:"9px 10px"}}>
                            <button onClick={()=>{setMModal(selAgt.id);startEditM(selAgt.id,ym);}} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"4px",color:"#64748b",padding:"3px 8px",cursor:"pointer",fontSize:"10px",marginRight:"4px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                            <button onClick={()=>deleteM(selAgt.id,ym)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"4px",color:"#ef4444",padding:"3px 8px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button>
                          </td>
                        </tr>);
                      })}
                      {!mEnt.length&&<tr><td colSpan={7} style={{padding:"20px",textAlign:"center",color:"#334155",fontSize:"12px"}}>No monthly data yet.</td></tr>}
                    </tbody>
                    {mEnt.length>0&&<tfoot><tr style={{backgroundColor:"#0a1120",borderTop:"2px solid #1e2d4d"}}><td style={{padding:"9px 14px",fontSize:"11px",color:"#475569"}}>{thr.periodMonths?`${Math.min(mEnt.length,thr.periodMonths)}-mo avg`:"All-time avg"}</td><td style={{padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",color:tc.prodMet||thr.noProd?"#22c55e":"#f87171",fontWeight:700}}>{tc.avg.prod??"-"}%</td><td style={{padding:"9px 14px",fontFamily:"'IBM Plex Mono',monospace",color:tc.qaMet?"#22c55e":"#f87171",fontWeight:700}}>{tc.avg.qa??"-"}%</td><td colSpan={4} style={{padding:"9px 14px",fontSize:"10px",color:"#334155"}}>{!thr.noProd&&`Prod req: ${tc.prodReq}% · `}QA req: {thr.qaAbsolute}%</td></tr></tfoot>}
                  </table>
                </div>
              </div>

              {/* Task modules */}
              {(()=>{
                const agentSessions = shadowing[selAgt.id]||[];
                const doneCount = agentSessions.filter(s=>s.completed).length;
                return(
                  <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",marginBottom:"14px",overflow:"hidden"}}>
                    <div style={{padding:"14px 20px",borderBottom:"1px solid #1a2b42",backgroundColor:"#0a1120",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                          <span style={{fontSize:"13px",fontWeight:700}}>👁 Shadowing Sessions</span>
                          {agentSessions.length>0&&<span style={{fontSize:"10px",backgroundColor:"#0a1f2e",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"2px 8px",color:"#38bdf8",fontFamily:"'IBM Plex Mono',monospace"}}>{doneCount}/{agentSessions.length} completed</span>}
                        </div>
                        <div style={{fontSize:"11px",color:"#475569"}}>Sessions where {selAgt.name.split(" ")[0]} observed experienced agents</div>
                      </div>
                      <button onClick={e=>openShadow(selAgt.id,e)} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>+ Add Session</button>
                    </div>
                    {agentSessions.length===0
                      ? <div style={{padding:"24px",textAlign:"center",color:"#334155",fontSize:"12px"}}>No shadowing sessions recorded yet. Add one to track observations.</div>
                      : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1px",backgroundColor:"#111827"}}>
                          {[...agentSessions].sort((a,b)=>b.date.localeCompare(a.date)).map(session=>{
                            const shadowed=findPerson(session.shadowedId);
                            const sRole=getRoleInfo(shadowed?.role);
                            const sessionTasks=(session.taskIds||[]).map(tid=>allTasks.find(t=>t.id===tid)).filter(Boolean);
                            return(
                              <div key={session.id} style={{backgroundColor:"#0d1527",padding:"13px 16px"}}>
                                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"8px"}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                                      <div style={{width:"22px",height:"22px",borderRadius:"50%",backgroundColor:(sRole?.color||"#64748b")+"22",border:`1px solid ${sRole?.color||"#64748b"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:sRole?.color||"#64748b",flexShrink:0}}>{(shadowed?.name||"?").split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
                                      <span style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0"}}>{shadowed?.name||"Unknown"}</span>
                                    </div>
                                    {sRole&&<div style={{marginLeft:"28px",marginBottom:"3px"}}><Badge role={sRole}/></div>}
                                  </div>
                                  <button onClick={()=>toggleShadowComplete(selAgt.id,session.id)} title={session.completed?"Mark incomplete":"Mark complete"} style={{width:"26px",height:"26px",flexShrink:0,borderRadius:"6px",backgroundColor:session.completed?"#164e63":"#152033",border:`1px solid ${session.completed?"#22d3ee44":"#1e2d4d"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"13px",color:session.completed?"#22d3ee":"#475569"}}>{session.completed?"✓":"·"}</button>
                                </div>
                                <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:sessionTasks.length||session.notes?"6px":"0"}}>
                                  <span style={{fontSize:"10px",color:"#475569"}}>📅 {session.date}</span>
                                  <span style={{fontSize:"10px",padding:"1px 7px",borderRadius:"4px",backgroundColor:session.completed?"#164e6322":"#1a1f2e",color:session.completed?"#22d3ee":"#475569",fontWeight:600}}>{session.completed?"Completed":"Pending"}</span>
                                </div>
                                {sessionTasks.length>0&&(
                                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginTop:"5px"}}>
                                    {sessionTasks.map(t=>(
                                      <span key={t.id} style={{fontSize:"9px",padding:"2px 6px",borderRadius:"4px",backgroundColor:t.moduleColor+"18",color:t.moduleColor,border:`1px solid ${t.moduleColor}33`,whiteSpace:"nowrap",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis"}} title={t.label}>{t.label}</span>
                                    ))}
                                  </div>
                                )}
                                {session.notes&&<div style={{fontSize:"10px",color:"#475569",fontStyle:"italic",marginTop:"4px",borderLeft:"2px solid #1e2d4d",paddingLeft:"8px"}}>{session.notes}</div>}
                                <div style={{display:"flex",gap:"5px",marginTop:"8px"}}>
                                  <button onClick={()=>{setShadowModal(selAgt.id);startEditShadow(selAgt.id,session);}} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"4px",color:"#60a5fa",padding:"3px 9px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                                  <button onClick={()=>deleteShadow(selAgt.id,session.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"4px",color:"#ef4444",padding:"3px 9px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                );
              })()}

              {/* Task modules */}
              {[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(mod=>{
                const mt=ROLES.find(r=>r.id===mod.requiredForRole)?.tier||99,at=role.tier;
                const modTasks=allTasks.filter(t=>t.moduleId===mod.id);
                if(!modTasks.length) return null;
                const recs=modTasks.map(t=>({task:t,rec:records[selAgt.id]?.[t.id]||{}}));
                const tr=recs.filter(({rec})=>rec.trained).length,pa=recs.filter(({rec})=>rec.assessmentScore>=passScore).length;
                const cur=mt===at,past=mt<at;
                return(
                  <div key={mod.id} style={{backgroundColor:"#0d1527",border:`1px solid ${cur?mod.color+"44":"#1a2b42"}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
                    <div style={{padding:"12px 18px",backgroundColor:cur?mod.color+"0d":"transparent",borderBottom:"1px solid #1a2b42",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}><div style={{width:"7px",height:"7px",borderRadius:"50%",backgroundColor:mod.color}}/><span style={{fontWeight:700,color:mod.color,fontSize:"13px"}}>{mod.label}</span><span style={{fontSize:"10px",color:"#475569"}}>→ {getRoleInfo(mod.requiredForRole)?.label}</span>{cur&&<span style={{fontSize:"10px",backgroundColor:mod.color+"22",color:mod.color,padding:"2px 8px",borderRadius:"4px"}}>Current Tier</span>}{past&&<span style={{fontSize:"10px",color:"#22c55e"}}>✓ Complete</span>}{mt>at&&<span style={{fontSize:"10px",color:"#334155"}}>Locked</span>}</div>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px",color:"#475569"}}>{tr}/{modTasks.length} trained · {pa}/{modTasks.length} passed</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1px",backgroundColor:"#111827"}}>
                      {recs.map(({task,rec})=>{
                        const st=!rec.trained?"none":rec.assessmentScore==null?"trained":rec.assessmentScore>=passScore?"passed":"failed";
                        return(
                          <div key={task.id} className="trow" onClick={e=>openEdit(selAgt.id,task.id,e)} style={{backgroundColor:"#0d1527",padding:"11px 16px",cursor:"pointer",transition:"background-color 0.1s"}}>
                            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
                              <div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:500,color:"#e2e8f0",marginBottom:"5px"}}>{task.label}</div><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{rec.trained&&rec.trainingDate&&<span style={{fontSize:"10px",color:"#475569"}}>📅 {rec.trainingDate}</span>}{rec.signOff&&<span style={{fontSize:"10px",color:"#475569"}}>✍ {rec.signOff}</span>}{rec.assessmentScore!=null&&<span style={{fontSize:"10px",fontFamily:"'IBM Plex Mono',monospace",color:rec.assessmentScore>=passScore?"#22c55e":"#f87171",fontWeight:600}}>{rec.assessmentScore}%</span>}</div></div>
                              <div style={{width:"26px",height:"26px",flexShrink:0,borderRadius:"6px",backgroundColor:SC[st],display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,color:st==="none"?"#243247":"#fff"}}>{SI[st]}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ═══════════════════════ ACTIVITY LOG ═══════════════════════ */}
        {view==="log"&&(
          <div className="fadein">
            <div style={{marginBottom:"20px"}}>
              <h1 style={{fontSize:"20px",fontWeight:700,marginBottom:"3px"}}>Activity Log</h1>
              <p style={{color:"#475569",fontSize:"13px"}}>Every change made to agents, training records, monthly metrics, modules, tasks, thresholds and assessment settings</p>
            </div>

            {/* Filters + search */}
            <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"14px 16px",marginBottom:"14px"}}>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
                {LOG_CATS.map(cat=>{
                  const count=auditLog.filter(e=>e.category===cat.id).length;
                  const active=logFilter===cat.id;
                  return(
                    <button key={cat.id} onClick={()=>setLogFilter(cat.id)} style={{padding:"5px 13px",borderRadius:"20px",border:`1px solid ${active?cat.color:"#1a2b42"}`,backgroundColor:active?cat.color+"22":"transparent",color:active?cat.color:"#64748b",fontSize:"11px",cursor:"pointer",transition:"all 0.15s",fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"12px"}}>{cat.icon}</span>
                      <span>{cat.label}</span>
                      {cat.id!=="all"&&<span style={{fontSize:"9px",backgroundColor:"#080d1a",borderRadius:"10px",padding:"1px 6px",color:active?cat.color:"#334155",fontFamily:"'IBM Plex Mono',monospace",minWidth:"16px",textAlign:"center"}}>{count}</span>}
                      {cat.id==="all"&&<span style={{fontSize:"9px",backgroundColor:"#080d1a",borderRadius:"10px",padding:"1px 6px",color:active?"#64748b":"#334155",fontFamily:"'IBM Plex Mono',monospace",minWidth:"16px",textAlign:"center"}}>{auditLog.length}</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <input value={logSearch} onChange={e=>setLogSearch(e.target.value)} placeholder="Search by action, detail, or agent name…" style={{...ISS,flex:1}}/>
                {logSearch&&<button onClick={()=>setLogSearch("")} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"6px 12px",cursor:"pointer",fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>✕ Clear</button>}
              </div>
            </div>

            {/* Count + actions */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <span style={{fontSize:"11px",color:"#334155",fontFamily:"'IBM Plex Mono',monospace"}}>
                {filteredLog.length === auditLog.length
                  ? `${auditLog.length} total entr${auditLog.length===1?"y":"ies"}`
                  : `${filteredLog.length} of ${auditLog.length} entries`}
              </span>
              {auditLog.length>0&&<button onClick={()=>setClearLogConfirm(true)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"6px",color:"#ef4444",padding:"5px 12px",cursor:"pointer",fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear all</button>}
            </div>

            {/* Log entries */}
            {filteredLog.length===0?(
              <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"56px",textAlign:"center"}}>
                <div style={{fontSize:"32px",marginBottom:"14px",opacity:0.25}}>📋</div>
                <div style={{color:"#475569",fontSize:"14px",fontWeight:500,marginBottom:"6px"}}>{auditLog.length===0?"No activity yet":"No matching entries"}</div>
                <div style={{color:"#334155",fontSize:"12px"}}>{auditLog.length===0?"Start making changes — every update will be recorded here automatically.":"Try a different filter or clear your search."}</div>
              </div>
            ):(
              <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden"}}>
                {filteredLog.map((entry,idx)=>{
                  const cat=LOG_CATS.find(c=>c.id===entry.category)||LOG_CATS[0];
                  const isLast=idx===filteredLog.length-1;
                  return(
                    <div key={entry.id} style={{padding:"13px 20px",borderBottom:isLast?"none":"1px solid #0d1827",display:"flex",gap:"14px",alignItems:"flex-start",transition:"background 0.1s"}} className="hrow">
                      {/* Icon + connector line */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:"32px"}}>
                        <div style={{width:"32px",height:"32px",borderRadius:"9px",backgroundColor:cat.color+"15",border:`1px solid ${cat.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>{cat.icon}</div>
                        {!isLast&&<div style={{width:"1px",flexGrow:1,minHeight:"18px",background:"linear-gradient(to bottom, "+cat.color+"30, #1a2b4220)",marginTop:"5px"}}/>}
                      </div>
                      {/* Main content */}
                      <div style={{flex:1,minWidth:0,paddingBottom:isLast?0:"4px",paddingTop:"2px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"13px",fontWeight:600,color:"#e2e8f0",lineHeight:1}}>{entry.action}</span>
                          <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"4px",backgroundColor:cat.color+"15",color:cat.color,letterSpacing:"0.04em",fontWeight:600,border:`1px solid ${cat.color}25`}}>{cat.label}</span>
                        </div>
                        <div style={{fontSize:"12px",color:"#64748b",lineHeight:"1.55",wordBreak:"break-word"}}>{entry.detail}</div>
                      </div>
                      {/* Timestamp */}
                      <div style={{flexShrink:0,textAlign:"right",paddingTop:"3px",minWidth:"70px"}}>
                        <div style={{fontSize:"11px",color:"#475569",fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}} title={new Date(entry.ts).toLocaleString()}>{tsLabel(entry.ts)}</div>
                        <div style={{fontSize:"9px",color:"#253345",fontFamily:"'IBM Plex Mono',monospace",marginTop:"3px"}}>{new Date(entry.ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ SETTINGS ═══════════════════════════ */}
        {view==="settings"&&(
          <div className="fadein">
            <div style={{marginBottom:"22px"}}><h1 style={{fontSize:"20px",fontWeight:700,marginBottom:"3px"}}>Settings & Configuration</h1><p style={{color:"#475569",fontSize:"13px"}}>All changes apply immediately and are recorded in the Activity Log</p></div>
            <div style={{display:"flex",gap:"2px",marginBottom:"20px",backgroundColor:"#0a1120",borderRadius:"10px",padding:"4px",width:"fit-content",border:"1px solid #1a2b42"}}>
              {[{id:"agents",label:"👥 Agents"},{id:"staff",label:"🏷 Admin Staff"},{id:"tasks",label:"📋 Tasks & Modules"},{id:"thresholds",label:"📊 Thresholds"},{id:"assessment",label:"🎯 Assessment"}].map(t=>(
                <button key={t.id} className={settTab===t.id?"stab-active":""} onClick={()=>setSettTab(t.id)} style={{padding:"7px 18px",borderRadius:"7px",border:"1px solid transparent",cursor:"pointer",fontSize:"12px",fontWeight:500,backgroundColor:"transparent",color:"#64748b",transition:"all 0.15s",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>{t.label}</button>
              ))}
            </div>

            {/* ── AGENTS TAB ── */}
            {settTab==="agents"&&(
              <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden"}}>
                <SectionHeader title="Agent Roster" subtitle={`${agents.length} agents · names and emails apply everywhere`} action={<button onClick={openAddAgent} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>＋ Add Agent</button>}/>
                <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                  <thead><tr style={{backgroundColor:"#080d1a"}}>{["Name & Email","Role","Reports To","Start Date","Training",""].map(h=><th key={h} style={{padding:"10px 16px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {agents.map(agent=>{
                      const role=getRoleInfo(agent.role),rdy=ready(agent.id,agent.role);
                      const {total,trained}=trainProg(agent.id,agent.role);
                      return(
                        <tr key={agent.id} className="hrow" style={{borderBottom:"1px solid #111827",backgroundColor:"transparent"}}>
                          <td style={{padding:"12px 16px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                              <div style={{width:"30px",height:"30px",borderRadius:"50%",backgroundColor:role.color+"22",border:`1px solid ${role.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:role.color,flexShrink:0}}>{agent.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
                              <div><div style={{fontWeight:600,color:"#e2e8f0",marginBottom:"2px"}}>{agent.name}{rdy&&<span style={{fontSize:"9px",color:"#22c55e",backgroundColor:"#14532d33",padding:"1px 5px",borderRadius:"3px",marginLeft:"6px"}}>↑ ready</span>}</div><div style={{fontSize:"10px",fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{agent.email}</div></div>
                            </div>
                          </td>
                          <td style={{padding:"12px 16px"}}><Badge role={role}/></td>
                          <td style={{padding:"12px 16px",color:"#64748b",fontSize:"11px"}}>{agent.lead||"—"}</td>
                          <td style={{padding:"12px 16px",fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px",color:"#64748b"}}>{agent.startDate}</td>
                          <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"80px"}}><PBar value={trained} max={total} color={role.color} h={4}/></div><span style={{fontSize:"10px",color:"#475569",fontFamily:"'IBM Plex Mono',monospace"}}>{trained}/{total}</span></div></td>
                          <td style={{padding:"12px 16px"}}><div style={{display:"flex",gap:"6px"}}>
                            <button onClick={()=>{setSelId(agent.id);setView("agent");}} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"5px",color:"#64748b",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>View</button>
                            <button onClick={()=>openEditAgent(agent.id)} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"5px",color:"#60a5fa",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                            <button onClick={()=>setAgentDel(agent.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"5px",color:"#ef4444",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Remove</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── ADMIN STAFF TAB ── */}
            {settTab==="staff"&&(
              <div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden",marginBottom:"14px"}}>
                  <SectionHeader
                    title="Admin & Management Staff"
                    subtitle={`${staff.length} staff members · not included in Skills Matrix · available as trainers and shadowing agents`}
                    action={<button onClick={openAddStaff} style={{backgroundColor:ADMIN_COLOR,border:"none",borderRadius:"6px",color:"#000",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>＋ Add Staff Member</button>}
                  />
                  {/* Role type legend */}
                  <div style={{padding:"10px 18px",borderBottom:"1px solid #1a2b42",display:"flex",gap:"8px",flexWrap:"wrap"}}>
                    {ADMIN_ROLES.filter(r=>r!=="Other").map(r=>(
                      <span key={r} style={{fontSize:"10px",padding:"2px 9px",borderRadius:"10px",backgroundColor:ADMIN_COLOR+"18",color:ADMIN_COLOR,border:`1px solid ${ADMIN_COLOR}33`,fontWeight:500}}>{r}</span>
                    ))}
                  </div>
                  <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                    <thead>
                      <tr style={{backgroundColor:"#080d1a"}}>
                        {["Name & Email","Title","Direct Reports",""].map(h=>(
                          <th key={h} style={{padding:"10px 16px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map(s=>{
                        const reports=(s.directReports||[]).map(id=>agents.find(a=>a.id===id)?.name).filter(Boolean);
                        return(
                          <tr key={s.id} className="hrow" style={{borderBottom:"1px solid #111827",backgroundColor:"transparent"}}>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                                <div style={{width:"30px",height:"30px",borderRadius:"50%",backgroundColor:ADMIN_COLOR+"22",border:`1px solid ${ADMIN_COLOR}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:ADMIN_COLOR,flexShrink:0}}>{s.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
                                <div>
                                  <div style={{fontWeight:600,color:"#e2e8f0",marginBottom:"2px"}}>{s.name}</div>
                                  <div style={{fontSize:"10px",fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <span style={{fontSize:"11px",padding:"3px 9px",borderRadius:"5px",backgroundColor:ADMIN_COLOR+"18",color:ADMIN_COLOR,border:`1px solid ${ADMIN_COLOR}33`,fontWeight:500}}>{s.title}</span>
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              {reports.length>0
                                ? <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>{reports.map(n=><span key={n} style={{fontSize:"10px",backgroundColor:"#0a1120",border:"1px solid #1e2d4d",borderRadius:"4px",padding:"1px 6px",color:"#64748b"}}>{n}</span>)}</div>
                                : <span style={{color:"#334155",fontSize:"11px"}}>—</span>
                              }
                            </td>
                            <td style={{padding:"12px 16px"}}>
                              <div style={{display:"flex",gap:"6px"}}>
                                <button onClick={()=>openEditStaff(s.id)} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"5px",color:"#60a5fa",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                                <button onClick={()=>setStaffDel(s.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"5px",color:"#ef4444",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Remove</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {staff.length===0&&(
                        <tr><td colSpan={4} style={{padding:"24px",textAlign:"center",color:"#334155",fontSize:"12px"}}>No admin staff added yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Info card */}
                <div style={{backgroundColor:"#0d1527",border:`1px solid ${ADMIN_COLOR}33`,borderRadius:"10px",padding:"16px 20px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
                  <span style={{fontSize:"20px",flexShrink:0}}>ℹ️</span>
                  <div style={{fontSize:"12px",color:"#64748b",lineHeight:"1.7"}}>
                    <div style={{color:"#94a3b8",fontWeight:600,marginBottom:"4px"}}>Admin staff are separate from the Skills Matrix</div>
                    Admin staff (Shift Leaders, QA Leads, Trainers, etc.) are not tracked in the Skills Matrix or training records. They appear <strong style={{color:ADMIN_COLOR}}>highlighted at the top</strong> of trainer and shadowing agent dropdowns throughout the app — in calendar events and shadowing sessions.
                  </div>
                </div>
              </div>
            )}

            {/* ── TASKS & MODULES TAB ── */}
            {settTab==="tasks"&&(
              <div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden",marginBottom:"16px"}}>
                  <SectionHeader title="Training Modules" subtitle={`${modules.length} modules · each module belongs to a role and groups related tasks`} action={<button onClick={openAddModule} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>＋ Add Module</button>}/>
                  <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                    <thead><tr style={{backgroundColor:"#080d1a"}}>{["Module","Colour","Required For Role","Tasks",""].map(h=><th key={h} style={{padding:"10px 16px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42",fontWeight:600}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(mod=>{
                        const roleInfo=getRoleInfo(mod.requiredForRole);
                        return(
                          <tr key={mod.id} className="hrow" style={{borderBottom:"1px solid #111827",backgroundColor:"transparent"}}>
                            <td style={{padding:"13px 16px"}}><div style={{display:"flex",alignItems:"center",gap:"10px"}}><div style={{width:"10px",height:"10px",borderRadius:"3px",backgroundColor:mod.color,flexShrink:0}}/><span style={{fontWeight:600,color:"#e2e8f0"}}>{mod.label}</span></div></td>
                            <td style={{padding:"13px 16px"}}><div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{MOD_COLORS.map(c=><div key={c} style={{width:"13px",height:"13px",borderRadius:"3px",backgroundColor:c,border:mod.color===c?"2px solid #fff":"2px solid transparent",opacity:0.8}}/>)}</div></td>
                            <td style={{padding:"13px 16px"}}><Badge role={roleInfo}/></td>
                            <td style={{padding:"13px 16px",fontFamily:"'IBM Plex Mono',monospace",color:"#64748b"}}>{tasks.filter(t=>t.moduleId===mod.id).length} tasks</td>
                            <td style={{padding:"13px 16px"}}><div style={{display:"flex",gap:"6px"}}>
                              <button onClick={()=>openEditModule(mod.id)} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"5px",color:"#60a5fa",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                              <button onClick={()=>setModDel(mod.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"5px",color:"#ef4444",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Delete</button>
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden"}}>
                  <SectionHeader title="Tasks" subtitle={`${tasks.length} tasks across ${modules.length} modules — module determines role tier`}
                    action={<div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                      <select value={taskModuleFilter} onChange={e=>setTaskModuleFilter(e.target.value)} style={{...ISS,width:"auto",minWidth:"160px"}}><option value="all">All Modules</option>{[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
                      <button onClick={()=>openAddTask(taskModuleFilter!=="all"?taskModuleFilter:modules[0]?.id)} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>＋ Add Task</button>
                    </div>}
                  />
                  {[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).filter(mod=>taskModuleFilter==="all"||mod.id===taskModuleFilter).map(mod=>{
                    const modTasks=[...tasks].filter(t=>t.moduleId===mod.id).sort((a,b)=>(a.order||0)-(b.order||0));
                    const roleInfo=getRoleInfo(mod.requiredForRole);
                    return(
                      <div key={mod.id}>
                        <div style={{padding:"10px 16px",backgroundColor:mod.color+"0d",borderTop:"1px solid #1a2b42",borderBottom:"1px solid #1a2b42",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"10px"}}><div style={{width:"8px",height:"8px",borderRadius:"2px",backgroundColor:mod.color}}/><span style={{fontWeight:700,color:mod.color,fontSize:"12px"}}>{mod.label}</span><Badge role={roleInfo}/><span style={{fontSize:"10px",color:"#334155"}}>{modTasks.length} tasks</span></div>
                          <button onClick={()=>openAddTask(mod.id)} style={{backgroundColor:"transparent",border:`1px solid ${mod.color}44`,borderRadius:"5px",color:mod.color,padding:"3px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>＋ Add task here</button>
                        </div>
                        {modTasks.length===0&&<div style={{padding:"14px 20px",color:"#334155",fontSize:"12px",fontStyle:"italic"}}>No tasks yet.</div>}
                        {modTasks.map((task,ti)=>(
                          <div key={task.id} className="hrow" style={{padding:"10px 16px",borderBottom:"1px solid #0f1523",display:"flex",alignItems:"center",gap:"12px",backgroundColor:"transparent"}}>
                            <div style={{width:"20px",height:"20px",borderRadius:"4px",backgroundColor:mod.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:mod.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,flexShrink:0}}>{ti+1}</div>
                            <span style={{flex:1,fontSize:"12px",color:"#e2e8f0"}}>{task.label}</span>
                            <select value={task.moduleId} onChange={e=>reassignTask(task.id,e.target.value)} style={{...ISS,width:"auto",minWidth:"150px",fontSize:"10px",padding:"4px 8px"}} title="Move to module">
                              {[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                            <div style={{display:"flex",gap:"5px"}}>
                              <button onClick={()=>openEditTask(task.id)} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"5px",color:"#60a5fa",padding:"3px 9px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                              <button onClick={()=>setTaskDel(task.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"5px",color:"#ef4444",padding:"3px 9px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── THRESHOLDS TAB ── */}
            {settTab==="thresholds"&&(
              <div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden",marginBottom:"16px"}}>
                  <SectionHeader title="Role Promotion Thresholds" subtitle="prodPct = % of group average · qaAbsolute = fixed floor · period = rolling window"/>
                  <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                    <thead><tr style={{backgroundColor:"#080d1a"}}>{["Role","Prod % of Group","QA Absolute Min","Rolling Period","No Prod Required",""].map(h=><th key={h} style={{padding:"10px 16px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42",fontWeight:600}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ROLES.map(ro=>{
                        const t=thresholds[ro.id],isE=sRow===ro.id;
                        return(
                          <tr key={ro.id} className="hrow" style={{borderBottom:"1px solid #111827",backgroundColor:"transparent"}}>
                            <td style={{padding:"13px 16px"}}><div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"7px",height:"7px",borderRadius:"50%",backgroundColor:ro.color,flexShrink:0}}/><span style={{fontWeight:600,color:"#e2e8f0"}}>{ro.label}</span></div></td>
                            <td style={{padding:"13px 16px"}}>{isE?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><input type="number" min="0" max="200" disabled={sForm.noProd} value={sForm.prodPct??""} onChange={e=>setSForm(f=>({...f,prodPct:e.target.value}))} style={{...ISS,width:"70px",opacity:sForm.noProd?0.3:1}}/><span style={{fontSize:"10px",color:"#475569"}}>%</span></div>:<span style={{fontFamily:"'IBM Plex Mono',monospace",color:t.noProd?"#334155":ro.color}}>{t.noProd?"N/A":`${t.prodPct}%`}</span>}</td>
                            <td style={{padding:"13px 16px"}}>{isE?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><input type="number" min="0" max="100" value={sForm.qaAbsolute??""} onChange={e=>setSForm(f=>({...f,qaAbsolute:e.target.value}))} style={{...ISS,width:"70px"}}/><span style={{fontSize:"10px",color:"#475569"}}>%</span></div>:<span style={{fontFamily:"'IBM Plex Mono',monospace",color:ro.color}}>≥ {t.qaAbsolute}%</span>}</td>
                            <td style={{padding:"13px 16px"}}>{isE?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><input type="number" min="1" max="24" disabled={sForm.noProd} value={sForm.periodMonths??""} onChange={e=>setSForm(f=>({...f,periodMonths:e.target.value}))} style={{...ISS,width:"70px",opacity:sForm.noProd?0.3:1}}/><span style={{fontSize:"10px",color:"#475569"}}>months</span></div>:<span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#94a3b8"}}>{t.periodMonths!=null?`${t.periodMonths} months`:<span style={{color:"#334155"}}>N/A</span>}</span>}</td>
                            <td style={{padding:"13px 16px"}}>{isE?<label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}><input type="checkbox" checked={!!sForm.noProd} onChange={e=>setSForm(f=>({...f,noProd:e.target.checked}))} style={{width:"14px",height:"14px",accentColor:"#0ea5e9"}}/><span style={{fontSize:"12px",color:"#94a3b8"}}>QA only</span></label>:<span style={{fontSize:"11px",color:t.noProd?"#22c55e":"#334155"}}>{t.noProd?"✓ QA only":"No"}</span>}</td>
                            <td style={{padding:"13px 16px"}}>{isE?<div style={{display:"flex",gap:"6px"}}><button onClick={saveS} style={{backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>Save</button><button onClick={()=>setSRow(null)} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"6px 10px",cursor:"pointer",fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button></div>:<button onClick={()=>startEditS(ro.id)} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",padding:"5px 12px",cursor:"pointer",fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"18px 20px"}}>
                  <div style={{fontWeight:700,fontSize:"13px",marginBottom:"14px"}}>How Each Role's Thresholds Work</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"10px"}}>
                    {ROLES.map(ro=>{const t=thresholds[ro.id];return(<div key={ro.id} style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"14px",border:`1px solid ${ro.color}22`}}><div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:ro.color}}/><span style={{fontWeight:700,color:ro.color,fontSize:"12px"}}>{ro.label}</span></div><div style={{fontSize:"11px",color:"#64748b",lineHeight:"1.8"}}>{!t.noProd&&<div>Prod ≥ <span style={{color:"#e2e8f0",fontFamily:"'IBM Plex Mono',monospace"}}>{t.prodPct}%</span> of group avg</div>}<div>QA ≥ <span style={{color:"#e2e8f0",fontFamily:"'IBM Plex Mono',monospace"}}>{t.qaAbsolute}%</span> absolute</div>{t.periodMonths&&<div>Period: last <span style={{color:"#e2e8f0",fontFamily:"'IBM Plex Mono',monospace"}}>{t.periodMonths} months</span></div>}{t.noProd&&<div style={{color:"#22c55e"}}>No productivity requirement</div>}</div></div>);})}
                  </div>
                </div>
              </div>
            )}

            {/* ── ASSESSMENT TAB ── */}
            {settTab==="assessment"&&(
              <div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",overflow:"hidden",marginBottom:"16px"}}>
                  <SectionHeader title="Assessment Pass Score" subtitle="Minimum score for a task assessment to be considered passed — applies to all roles and tasks"/>
                  <div style={{padding:"24px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"24px",marginBottom:"20px"}}>
                      <div><div style={{fontSize:"11px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>Current Pass Score</div><div style={{fontSize:"48px",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",color:"#a78bfa",lineHeight:1}}>{passScore}%</div></div>
                      <div style={{flex:1,maxWidth:"320px"}}>
                        <div style={{fontSize:"11px",color:"#475569",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Adjust Score</div>
                        <div style={{display:"flex",alignItems:"center",gap:"10px"}}><input type="range" min="50" max="100" value={passScore} onChange={e=>updatePassScore(Number(e.target.value))} style={{flex:1,accentColor:"#a78bfa",cursor:"pointer"}}/><input type="number" min="50" max="100" value={passScore} onChange={e=>updatePassScore(Number(e.target.value))} style={{...ISS,width:"70px"}}/></div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#334155",marginTop:"4px"}}><span>50%</span><span>100%</span></div>
                      </div>
                    </div>
                    <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"14px 16px",border:"1px solid #1e2d4d",fontSize:"12px",color:"#64748b",lineHeight:"1.7"}}>
                      <div>Score ≥ <span style={{color:"#a78bfa",fontFamily:"'IBM Plex Mono',monospace"}}>{passScore}%</span> → <span style={{color:"#22c55e"}}>Passed ✓</span></div>
                      <div>Score &lt; <span style={{color:"#a78bfa",fontFamily:"'IBM Plex Mono',monospace"}}>{passScore}%</span> → <span style={{color:"#f87171"}}>Failed ✗</span></div>
                      <div style={{marginTop:"6px",color:"#475569",fontSize:"11px"}}>Applies to all {tasks.length} tasks across all {agents.length} agents.</div>
                    </div>
                  </div>
                </div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #7f1d1d55",borderRadius:"10px",padding:"18px 20px",marginBottom:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"13px",marginBottom:"3px",color:"#fca5a5"}}>⚠ Reset All Data</div>
                      <div style={{fontSize:"11px",color:"#64748b",lineHeight:"1.6"}}>Wipes all agents, staff, training records, shadowing sessions, and calendar events. Module and task structure is kept. Use this before going live to replace seed data.</div>
                    </div>
                    <button onClick={()=>setResetConfirm(true)} style={{flexShrink:0,padding:"8px 20px",backgroundColor:"transparent",border:"1px solid #7f1d1d",borderRadius:"6px",color:"#f87171",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>Reset All Data</button>
                  </div>
                </div>
                <div style={{backgroundColor:"#0d1527",border:"1px solid #1a2b42",borderRadius:"10px",padding:"18px 20px"}}>
                  <div style={{fontWeight:700,fontSize:"13px",marginBottom:"14px"}}>Current Impact at {passScore}%</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"10px"}}>
                    {ROLES.map(ro=>{const ga=agents.filter(a=>a.role===ro.id);if(!ga.length) return null;const ap=ga.map(a=>{const{total,passed}=trainProg(a.id,ro.id);return{total,passed};});const tt=ap.reduce((s,x)=>s+x.total,0),tp=ap.reduce((s,x)=>s+x.passed,0);return(<div key={ro.id} style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"12px 14px",border:`1px solid ${ro.color}22`}}><div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"8px"}}><div style={{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:ro.color}}/><span style={{color:ro.color,fontWeight:600,fontSize:"11px"}}>{ro.label}</span></div><div style={{fontSize:"11px",color:"#64748b",lineHeight:"1.7"}}><div>{ga.length} agents · {tt} assessments</div><div><span style={{color:"#22c55e",fontFamily:"'IBM Plex Mono',monospace"}}>{tp}</span> passed · <span style={{color:"#f87171",fontFamily:"'IBM Plex Mono',monospace"}}>{tt-tp}</span> failed/pending</div></div></div>);
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══ CELL MODAL: TRAINING RECORD + SHADOWING ═══ */}
      {editModal&&(()=>{
        const task   = allTasks.find(t=>t.id===editModal.tid);
        const agent  = agents.find(a=>a.id===editModal.aid);
        const agentTier = getRoleInfo(agent?.role)?.tier||1;
        // Sessions that already include this task
        const taskSessions = (shadowing[editModal.aid]||[]).filter(s=>(s.taskIds||[]).includes(editModal.tid));
        // Eligible agents to shadow (same tier or higher, not self)
        const eligible = agents.filter(a => a.id!==editModal.aid && (getRoleInfo(a.role)?.tier||1) >= agentTier);
        const canSaveShadow = cellShadowForm.shadowedId && cellShadowForm.date;
        const hasShadowed   = taskSessions.some(s=>s.completed);
        return(
          <div onClick={()=>{setEditModal(null);setCellShadowEdit(null);}} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",width:"560px",maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>

              {/* Header */}
              <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #1a2b42"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"4px"}}>
                      <div style={{width:"8px",height:"8px",borderRadius:"2px",backgroundColor:task?.moduleColor,flexShrink:0}}/>
                      <span style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em"}}>{task?.moduleLabel}</span>
                    </div>
                    <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"3px",color:"#e2e8f0"}}>{task?.label}</h3>
                    <p style={{color:"#64748b",fontSize:"12px"}}>{agent?.name} · <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{agent?.email}</span></p>
                  </div>
                  {hasShadowed&&<span style={{fontSize:"10px",backgroundColor:"#164e6322",border:"1px solid #22d3ee33",borderRadius:"6px",padding:"3px 8px",color:"#22d3ee",whiteSpace:"nowrap",flexShrink:0}}>👁 Shadowed</span>}
                </div>
              </div>

              {/* ── Section 1: Training Record ── */}
              <div style={{padding:"18px 24px",borderBottom:"2px solid #1a2b42"}}>
                <div style={{fontSize:"11px",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"14px",display:"flex",alignItems:"center",gap:"7px"}}>
                  <span style={{color:"#0ea5e9"}}>①</span> Training Record
                </div>
                {[{key:"trained",label:"Training Completed",type:"checkbox"},{key:"trainingDate",label:"Training Date",type:"date"},{key:"assessmentScore",label:`Assessment Score (pass ≥${passScore}%)`,type:"number"}].map(f=>(
                  <div key={f.key} style={{marginBottom:"13px"}}>
                    <label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{f.label}</label>
                    {f.type==="checkbox"
                      ?<label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}><input type="checkbox" checked={!!editForm[f.key]} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.checked}))} style={{width:"15px",height:"15px",accentColor:"#0ea5e9"}}/><span style={{fontSize:"13px",color:"#e2e8f0"}}>{editForm[f.key]?"Yes":"No"}</span></label>
                      :<input type={f.type} value={editForm[f.key]??""} min={f.type==="number"?0:undefined} max={f.type==="number"?100:undefined} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))} style={IS}/>
                    }
                  </div>
                ))}
                <div style={{marginBottom:"13px"}}>
                  <label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Signed Off By</label>
                  <select value={editForm.signOff||""} onChange={e=>setEditForm(p=>({...p,signOff:e.target.value}))} style={IS}>
                    <option value="">— None —</option>
                    {staff.length>0&&<optgroup label="── Admin & Management Staff">{staff.map(s=><option key={s.id} value={s.name}>⭐ {s.name} ({s.title})</option>)}</optgroup>}
                    {agents.length>0&&<optgroup label="── Matrix Agents">{agents.map(a=>{const r=getRoleInfo(a.role);return <option key={a.id} value={a.name}>{a.name} ({r?.label})</option>;})}</optgroup>}
                  </select>
                </div>
                <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"16px"}}>
                  <button onClick={()=>{setEditModal(null);setCellShadowEdit(null);}} style={{padding:"8px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
                  <button onClick={saveEdit} style={{padding:"8px 22px",backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif"}}>Save Training Record</button>
                </div>
              </div>

              {/* ── Section 2: Shadowing Sessions ── */}
              <div style={{padding:"18px 24px 20px"}}>
                <div style={{fontSize:"11px",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"14px",display:"flex",alignItems:"center",gap:"7px"}}>
                  <span style={{color:"#22d3ee"}}>②</span> Shadowing Sessions
                  {taskSessions.length>0&&<span style={{fontSize:"10px",backgroundColor:"#0a1f2e",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"1px 7px",color:"#38bdf8",fontFamily:"'IBM Plex Mono',monospace",fontWeight:400}}>{taskSessions.filter(s=>s.completed).length}/{taskSessions.length} completed</span>}
                </div>

                {/* Existing sessions for this task */}
                {taskSessions.length>0&&(
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden",marginBottom:"14px"}}>
                    {[...taskSessions].sort((a,b)=>b.date.localeCompare(a.date)).map((session,idx)=>{
                      const shadowed = findPerson(session.shadowedId);
                      const sRole    = getRoleInfo(shadowed?.role);
                      const isEd     = cellShadowEdit===session.id;
                      // Other tasks in this session beyond the current one
                      const otherTasks = (session.taskIds||[]).filter(id=>id!==editModal.tid).map(id=>allTasks.find(t=>t.id===id)).filter(Boolean);
                      return(
                        <div key={session.id} style={{padding:"10px 14px",borderBottom:idx<taskSessions.length-1?"1px solid #111827":"none",backgroundColor:isEd?"#0a1f30":"transparent"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:"8px",flex:1}}>
                              {/* Complete toggle */}
                              <button onClick={()=>toggleShadowComplete(editModal.aid,session.id)} title={session.completed?"Mark incomplete":"Mark complete"} style={{width:"20px",height:"20px",flexShrink:0,marginTop:"1px",borderRadius:"4px",backgroundColor:session.completed?"#164e63":"#152033",border:`1px solid ${session.completed?"#22d3ee44":"#1e2d4d"}`,cursor:"pointer",fontSize:"10px",color:session.completed?"#22d3ee":"#475569",display:"flex",alignItems:"center",justifyContent:"center"}}>{session.completed?"✓":"·"}</button>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                                  <span style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0"}}>{shadowed?.name||"Unknown"}</span>
                                  {sRole&&<Badge role={sRole}/>}
                                  <span style={{fontSize:"10px",color:"#475569"}}>📅 {session.date}</span>
                                  <span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"4px",backgroundColor:session.completed?"#164e6322":"#1a1f2e",color:session.completed?"#22d3ee":"#475569"}}>{session.completed?"Done":"Pending"}</span>
                                </div>
                                {otherTasks.length>0&&(
                                  <div style={{display:"flex",alignItems:"center",gap:"4px",marginTop:"4px",flexWrap:"wrap"}}>
                                    <span style={{fontSize:"9px",color:"#334155"}}>Also covered:</span>
                                    {otherTasks.map(t=><span key={t.id} style={{fontSize:"9px",padding:"1px 5px",borderRadius:"3px",backgroundColor:t.moduleColor+"18",color:t.moduleColor,border:`1px solid ${t.moduleColor}22`}} title={t.label}>{t.label.length>22?t.label.slice(0,20)+"…":t.label}</span>)}
                                  </div>
                                )}
                                {session.notes&&<div style={{fontSize:"10px",color:"#475569",fontStyle:"italic",marginTop:"3px"}}>{session.notes}</div>}
                              </div>
                            </div>
                            <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                              <button onClick={()=>{startEditCellShadow(session);}} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"4px",color:"#60a5fa",padding:"2px 7px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                              <button onClick={()=>{deleteShadow(editModal.aid,session.id);if(cellShadowEdit===session.id){setCellShadowEdit(null);setCellShadowForm({shadowedId:"",date:"",completed:false,notes:""});}}} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"4px",color:"#ef4444",padding:"2px 7px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline add/edit form */}
                <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"14px",border:"1px solid #1e2d4d"}}>
                  <div style={{fontSize:"10px",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"12px",fontWeight:600}}>{cellShadowEdit?"✏ Editing Session":"＋ Add Shadow Session"} <span style={{color:"#334155",textTransform:"none",letterSpacing:0,fontWeight:400}}>— {task?.label} will be auto-included</span></div>

                  <div style={{marginBottom:"10px"}}>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Shadowed Agent *</label>
                    <select value={cellShadowForm.shadowedId} onChange={e=>setCellShadowForm(f=>({...f,shadowedId:e.target.value}))} style={IS}>
                      <option value="">— Select trainer / experienced agent —</option>
                      {staff.length>0&&<optgroup label="── Admin & Management Staff">
                        {staff.map(s=><option key={s.id} value={s.id}>⭐ {s.name} ({s.title})</option>)}
                      </optgroup>}
                      {eligible.length>0&&<optgroup label="── Matrix Agents (same tier or higher)">
                        {eligible.map(a=>{const r=getRoleInfo(a.role);return <option key={a.id} value={a.id}>{a.name} ({r?.label})</option>;})}
                      </optgroup>}
                    </select>
                    {staff.length===0&&eligible.length===0&&<div style={{fontSize:"10px",color:"#f59e0b",marginTop:"3px"}}>No eligible trainers available.</div>}
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                    <div>
                      <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Session Date *</label>
                      <input type="date" value={cellShadowForm.date} onChange={e=>setCellShadowForm(f=>({...f,date:e.target.value}))} style={IS}/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                      <label style={{display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",padding:"8px 10px",backgroundColor:"#0d1527",borderRadius:"6px",border:"1px solid #1e2d4d"}}>
                        <input type="checkbox" checked={!!cellShadowForm.completed} onChange={e=>setCellShadowForm(f=>({...f,completed:e.target.checked}))} style={{width:"13px",height:"13px",accentColor:"#22d3ee"}}/>
                        <span style={{fontSize:"11px",color:"#e2e8f0"}}>Completed</span>
                      </label>
                    </div>
                  </div>

                  <div style={{marginBottom:"12px"}}>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Notes <span style={{color:"#334155",textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                    <input value={cellShadowForm.notes} onChange={e=>setCellShadowForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Observed full workflow end-to-end" style={IS}/>
                  </div>

                  <div style={{display:"flex",gap:"8px"}}>
                    <button onClick={()=>saveCellShadow(editModal.aid,editModal.tid)} disabled={!canSaveShadow} style={{flex:1,backgroundColor:"#164e63",border:"1px solid #22d3ee44",borderRadius:"6px",color:"#22d3ee",padding:"8px",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:canSaveShadow?1:0.4}}>{cellShadowEdit?"Update Session":"Save Shadow Session"}</button>
                    {cellShadowEdit&&<button onClick={()=>{setCellShadowForm({shadowedId:"",date:"",completed:false,notes:""});setCellShadowEdit(null);}} style={{padding:"8px 12px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear</button>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ═══ MONTHLY MODAL ═══ */}
      {mModal&&(()=>{
        const agent=agents.find(a=>a.id===mModal),thr=thresholds[agent.role];
        const entries=Object.entries(monthly[mModal]||{}).sort(([a],[b])=>b.localeCompare(a));
        const avg=agentAvg(mModal,thr.periodMonths,monthly);
        const tc=checkThresh(mModal,agent.role,agents,monthly,thresholds);
        return(
          <div onClick={()=>{setMModal(null);setMEditing(null);}} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",padding:"24px",width:"540px",maxWidth:"100%",maxHeight:"88vh",overflowY:"auto"}}>
              <div style={{marginBottom:"18px"}}><h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"2px"}}>Monthly Performance Metrics</h3><p style={{color:"#64748b",fontSize:"12px"}}>{agent?.name} · <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{agent?.email}</span></p><p style={{color:"#334155",fontSize:"11px",marginTop:"3px"}}>{thr.periodMonths?`Last ${thr.periodMonths} months used`:"All months averaged"}</p></div>
              {entries.length>0&&(
                <div style={{marginBottom:"18px"}}>
                  <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px",fontWeight:600}}>Recorded Months</div>
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden"}}>
                    <table style={{borderCollapse:"collapse",width:"100%",fontSize:"12px"}}>
                      <thead><tr style={{backgroundColor:"#080d1a"}}>{["Month","Prod %","QA %","Window",""].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",color:"#475569",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1a2b42"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {entries.map(([ym,vals],idx)=>{const inW=thr.periodMonths?idx<thr.periodMonths:true,isE=mEditing===ym;return(<tr key={ym} style={{borderBottom:"1px solid #111827",backgroundColor:isE?"#0a1f30":"transparent"}}><td style={{padding:"8px 12px",fontFamily:"'IBM Plex Mono',monospace",color:"#94a3b8",fontSize:"11px"}}>{fmtMonth(ym)}</td><td style={{padding:"8px 12px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:"#e2e8f0"}}>{vals.prod}%</td><td style={{padding:"8px 12px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:"#e2e8f0"}}>{vals.qa}%</td><td style={{padding:"8px 12px"}}><span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"4px",backgroundColor:inW?"#1e3a8a33":"#1a1f2e",color:inW?"#60a5fa":"#334155"}}>{inW?"✓ Included":"Excluded"}</span></td><td style={{padding:"8px 8px"}}><button onClick={()=>startEditM(mModal,ym)} style={{backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"4px",color:"#64748b",padding:"2px 7px",cursor:"pointer",fontSize:"10px",marginRight:"3px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button><button onClick={()=>deleteM(mModal,ym)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"4px",color:"#ef4444",padding:"2px 7px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button></td></tr>);})}
                      </tbody>
                    </table>
                  </div>
                  {avg.count>0&&<div style={{marginTop:"8px",backgroundColor:"#080d1a",borderRadius:"6px",padding:"9px 14px",display:"flex",gap:"20px",fontSize:"11px",flexWrap:"wrap"}}><span style={{color:"#475569"}}>{thr.periodMonths?`${Math.min(avg.count,thr.periodMonths)}-mo avg:`:"All-time avg:"}</span>{!thr.noProd&&<span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#60a5fa"}}>Prod <strong>{avg.prod}%</strong></span>}<span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#60a5fa"}}>QA <strong>{avg.qa}%</strong></span></div>}
                </div>
              )}
              <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"16px",border:"1px solid #1e2d4d"}}>
                <div style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"12px",fontWeight:600}}>{mEditing?"✏ Editing — "+fmtMonth(mEditing):"＋ Add New Month"}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"12px"}}>
                  <div><label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Month</label><input type="month" value={mForm.month} onChange={e=>setMForm(f=>({...f,month:e.target.value}))} style={ISS} readOnly={!!mEditing}/></div>
                  <div><label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Productivity %</label><input type="number" min="0" max="100" value={mForm.prod} onChange={e=>setMForm(f=>({...f,prod:e.target.value}))} placeholder="92" style={ISS}/></div>
                  <div><label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>QA Score %</label><input type="number" min="0" max="100" value={mForm.qa} onChange={e=>setMForm(f=>({...f,qa:e.target.value}))} placeholder="88" style={ISS}/></div>
                </div>
                <div style={{display:"flex",gap:"8px"}}><button onClick={saveM} disabled={!mForm.month||mForm.prod===""||mForm.qa===""} style={{flex:1,backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"9px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:(!mForm.month||mForm.prod===""||mForm.qa==="")?0.4:1}}>{mEditing?"Update Entry":"Add Entry"}</button>{mEditing&&<button onClick={()=>{setMForm({month:"",prod:"",qa:""});setMEditing(null);}} style={{padding:"9px 14px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear</button>}</div>
              </div>
              <button onClick={()=>{setMModal(null);setMEditing(null);}} style={{marginTop:"14px",width:"100%",padding:"9px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ═══ AGENT MODAL ═══ */}
      {agentModal&&(
        <div onClick={()=>setAgentModal(null)} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
          <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",padding:"24px",width:"480px",maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"4px"}}>{agentModal==="add"?"Add New Agent":"Edit Agent"}</h3>
            <p style={{color:"#64748b",fontSize:"12px",marginBottom:"20px"}}>Details apply across all views and are logged</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Full Name *</label><input value={agentForm.name||""} onChange={e=>{setAgentForm(f=>({...f,name:e.target.value}));setShowFormErr(false);}} placeholder="Jane Smith" style={{...IS,...(showFormErr&&!agentForm.name?.trim()?{borderColor:"#ef444488"}:{})}}/>{showFormErr&&!agentForm.name?.trim()&&<div className="ferr-msg">Name is required</div>}</div>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Email Address</label><input type="email" value={agentForm.email||""} onChange={e=>setAgentForm(f=>({...f,email:e.target.value}))} placeholder="jane.smith@rhinoentertainment.com" style={IS}/></div>
              <div><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Role</label><select value={agentForm.role||"cx_probation"} onChange={e=>setAgentForm(f=>({...f,role:e.target.value}))} style={IS}>{ROLES.map(ro=><option key={ro.id} value={ro.id}>{ro.label}</option>)}</select></div>
              <div><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Start Date</label><input type="date" value={agentForm.startDate||""} onChange={e=>setAgentForm(f=>({...f,startDate:e.target.value}))} style={IS}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Reports To</label><select value={agentForm.lead||""} onChange={e=>setAgentForm(f=>({...f,lead:e.target.value}))} style={IS}><option value="">— Select manager —</option><option value="Director">Director</option>{agents.filter(a=>a.id!==agentModal).map(a=><option key={a.id} value={a.name}>{a.name} ({getRoleInfo(a.role)?.shortLabel})</option>)}</select></div>
            </div>
            {agentForm.role&&<div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"12px 14px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"10px",border:"1px solid #1e2d4d"}}><Badge role={getRoleInfo(agentForm.role)}/><span style={{fontSize:"11px",color:"#475569"}}>Training starts at <strong style={{color:"#e2e8f0"}}>{modules.find(m=>m.requiredForRole===agentForm.role)?.label||"—"}</strong></span></div>}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setAgentModal(null)} style={{padding:"8px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
              <button onClick={saveAgent} disabled={!agentForm.name?.trim()} style={{padding:"8px 22px",backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:agentForm.name?.trim()?1:0.4}}>{agentModal==="add"?"Add Agent":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODULE MODAL ═══ */}
      {modModal&&(
        <div onClick={()=>setModModal(null)} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
          <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",padding:"24px",width:"460px",maxWidth:"100%"}}>
            <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"4px"}}>{modModal==="add"?"Add New Module":"Edit Module"}</h3>
            <p style={{color:"#64748b",fontSize:"12px",marginBottom:"20px"}}>Modules group related tasks and are assigned to a role tier</p>
            <div style={{marginBottom:"14px"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Module Name *</label><input value={modForm.label||""} onChange={e=>{setModForm(f=>({...f,label:e.target.value}));setShowFormErr(false);}} placeholder="e.g. Advanced Escalations" style={{...IS,...(showFormErr&&!modForm.label?.trim()?{borderColor:"#ef444488"}:{})}}/>{showFormErr&&!modForm.label?.trim()&&<div className="ferr-msg">Module name is required</div>}</div>
            <div style={{marginBottom:"14px"}}>
              <label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Colour</label>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{MOD_COLORS.map(c=><div key={c} onClick={()=>setModForm(f=>({...f,color:c}))} style={{width:"28px",height:"28px",borderRadius:"6px",backgroundColor:c,cursor:"pointer",border:modForm.color===c?"3px solid #fff":"3px solid transparent",transition:"transform 0.1s",transform:modForm.color===c?"scale(1.15)":"scale(1)"}}/>)}</div>
              {modForm.color&&<div style={{marginTop:"10px",padding:"8px 12px",backgroundColor:modForm.color+"11",border:`1px solid ${modForm.color}44`,borderRadius:"6px",display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"10px",height:"10px",borderRadius:"3px",backgroundColor:modForm.color}}/><span style={{fontSize:"12px",color:modForm.color,fontWeight:600}}>{modForm.label||"Module Preview"}</span></div>}
            </div>
            <div style={{marginBottom:"18px"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Required For Role</label><select value={modForm.requiredForRole||"cx_probation"} onChange={e=>setModForm(f=>({...f,requiredForRole:e.target.value}))} style={IS}>{ROLES.map(ro=><option key={ro.id} value={ro.id}>{ro.label}</option>)}</select></div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setModModal(null)} style={{padding:"8px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
              <button onClick={saveModule} disabled={!modForm.label?.trim()} style={{padding:"8px 22px",backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:modForm.label?.trim()?1:0.4}}>{modModal==="add"?"Add Module":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TASK MODAL ═══ */}
      {taskModal&&(
        <div onClick={()=>setTaskModal(null)} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
          <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",padding:"24px",width:"440px",maxWidth:"100%"}}>
            <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"4px"}}>{taskModal==="add"?"Add New Task":"Edit Task"}</h3>
            <p style={{color:"#64748b",fontSize:"12px",marginBottom:"20px"}}>Tasks are grouped into modules which determine their role tier</p>
            <div style={{marginBottom:"14px"}}><label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Task Name *</label><input value={taskForm.label||""} onChange={e=>{setTaskForm(f=>({...f,label:e.target.value}));setShowFormErr(false);}} placeholder="e.g. Handle Complex Escalations" style={{...IS,...(showFormErr&&!taskForm.label?.trim()?{borderColor:"#ef444488"}:{})}}/>{showFormErr&&!taskForm.label?.trim()&&<div className="ferr-msg">Task name is required</div>}</div>
            <div style={{marginBottom:"18px"}}>
              <label style={{fontSize:"11px",color:"#64748b",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Module</label>
              <select value={taskForm.moduleId||""} onChange={e=>setTaskForm(f=>({...f,moduleId:e.target.value}))} style={IS}><option value="">— Select a module —</option>{[...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(m=>{const ri=getRoleInfo(m.requiredForRole);return <option key={m.id} value={m.id}>{m.label} → {ri?.label}</option>;})}</select>
              {taskForm.moduleId&&(()=>{const m=modules.find(x=>x.id===taskForm.moduleId),ri=getRoleInfo(m?.requiredForRole);return m&&<div style={{marginTop:"8px",padding:"8px 12px",backgroundColor:m.color+"11",border:`1px solid ${m.color}44`,borderRadius:"6px",display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"8px",height:"8px",borderRadius:"2px",backgroundColor:m.color}}/><span style={{fontSize:"11px",color:m.color}}>{m.label}</span><span style={{fontSize:"10px",color:"#475569"}}>→</span><Badge role={ri}/></div>;})()}
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setTaskModal(null)} style={{padding:"8px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
              <button onClick={saveTask} disabled={!taskForm.label?.trim()||!taskForm.moduleId} style={{padding:"8px 22px",backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:taskForm.label?.trim()&&taskForm.moduleId?1:0.4}}>{taskModal==="add"?"Add Task":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SHADOWING MODAL ═══ */}
      {shadowModal&&(()=>{
        const agent      = agents.find(a=>a.id===shadowModal);
        const sessions   = shadowing[shadowModal]||[];
        const agentTier  = getRoleInfo(agent?.role)?.tier||1;
        const eligibleShadowed = agents.filter(a => a.id!==shadowModal && (getRoleInfo(a.role)?.tier||1) >= agentTier);
        const canSave    = shadowForm.shadowedId && shadowForm.date;
        // Group allTasks by module for the task picker
        const tasksByModule = [...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(mod=>({
          mod, tasks: allTasks.filter(t=>t.moduleId===mod.id)
        })).filter(g=>g.tasks.length>0);
        return(
          <div onClick={()=>{setShadowModal(null);setShadowEdit(null);}} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",padding:"24px",width:"600px",maxWidth:"100%",maxHeight:"88vh",overflowY:"auto"}}>
              <div style={{marginBottom:"18px"}}>
                <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"2px"}}>👁 Shadowing Sessions</h3>
                <p style={{color:"#64748b",fontSize:"12px"}}>{agent?.name} · <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{agent?.email}</span></p>
              </div>

              {/* Existing sessions list */}
              {sessions.length>0&&(
                <div style={{marginBottom:"20px"}}>
                  <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px",fontWeight:600}}>Recorded Sessions</div>
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden"}}>
                    {[...sessions].sort((a,b)=>b.date.localeCompare(a.date)).map((session,idx)=>{
                      const shadowed   = findPerson(session.shadowedId);
                      const sRole      = getRoleInfo(shadowed?.role);
                      const isEd       = shadowEdit===session.id;
                      const sessionTasks = (session.taskIds||[]).map(tid=>allTasks.find(t=>t.id===tid)).filter(Boolean);
                      return(
                        <div key={session.id} style={{padding:"11px 14px",borderBottom:idx<sessions.length-1?"1px solid #111827":"none",backgroundColor:isEd?"#0a1f30":"transparent"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:"8px",flex:1}}>
                              <button onClick={()=>toggleShadowComplete(shadowModal,session.id)} title={session.completed?"Mark incomplete":"Mark complete"} style={{width:"22px",height:"22px",flexShrink:0,marginTop:"1px",borderRadius:"5px",backgroundColor:session.completed?"#164e63":"#152033",border:`1px solid ${session.completed?"#22d3ee44":"#1e2d4d"}`,cursor:"pointer",fontSize:"11px",color:session.completed?"#22d3ee":"#475569",display:"flex",alignItems:"center",justifyContent:"center"}}>{session.completed?"✓":"·"}</button>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
                                  <span style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0"}}>{shadowed?.name||"Unknown"}</span>
                                  {sRole&&<Badge role={sRole}/>}
                                  <span style={{fontSize:"10px",color:"#475569"}}>· 📅 {session.date}</span>
                                  <span style={{fontSize:"10px",color:session.completed?"#22d3ee":"#64748b",backgroundColor:session.completed?"#164e6322":"#152033",padding:"1px 6px",borderRadius:"4px"}}>{session.completed?"✓ Done":"⏳ Pending"}</span>
                                </div>
                                {sessionTasks.length>0&&(
                                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginTop:"5px"}}>
                                    {sessionTasks.map(t=>(
                                      <span key={t.id} style={{fontSize:"9px",padding:"2px 6px",borderRadius:"4px",backgroundColor:t.moduleColor+"18",color:t.moduleColor,border:`1px solid ${t.moduleColor}33`,whiteSpace:"nowrap",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis"}} title={t.label}>{t.label}</span>
                                    ))}
                                  </div>
                                )}
                                {session.notes&&<div style={{fontSize:"10px",color:"#475569",fontStyle:"italic",marginTop:"4px",borderLeft:"2px solid #1e2d4d",paddingLeft:"7px"}}>{session.notes}</div>}
                              </div>
                            </div>
                            <div style={{display:"flex",gap:"5px",flexShrink:0}}>
                              <button onClick={()=>startEditShadow(shadowModal,session)} style={{backgroundColor:"transparent",border:"1px solid #1e3a5f",borderRadius:"4px",color:"#60a5fa",padding:"3px 8px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Edit</button>
                              <button onClick={()=>deleteShadow(shadowModal,session.id)} style={{backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"4px",color:"#ef4444",padding:"3px 8px",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add / Edit form */}
              <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"16px",border:"1px solid #1e2d4d"}}>
                <div style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"14px",fontWeight:600}}>{shadowEdit?"✏ Editing Session":"＋ Add New Session"}</div>

                {/* Shadowed agent */}
                <div style={{marginBottom:"12px"}}>
                  <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Trainer / Shadowed Agent *</label>
                  <select value={shadowForm.shadowedId} onChange={e=>{setShadowForm(f=>({...f,shadowedId:e.target.value}));setShowFormErr(false);}} style={{...IS,...(showFormErr&&!shadowForm.shadowedId?{borderColor:"#ef444488"}:{})}}>
                    <option value="">— Select trainer / experienced agent —</option>
                    {staff.length>0&&<optgroup label="── Admin & Management Staff">
                      {staff.map(s=><option key={s.id} value={s.id}>⭐ {s.name} ({s.title})</option>)}
                    </optgroup>}
                    {eligibleShadowed.length>0&&<optgroup label="── Matrix Agents (same tier or higher)">
                      {eligibleShadowed.map(a=>{const r=getRoleInfo(a.role);return <option key={a.id} value={a.id}>{a.name} ({r?.label})</option>;})}
                    </optgroup>}
                  </select>
                  {staff.length===0&&eligibleShadowed.length===0&&<div style={{fontSize:"10px",color:"#f59e0b",marginTop:"4px"}}>No eligible trainers available.</div>}
                  {showFormErr&&!shadowForm.shadowedId&&<div className="ferr-msg">Please select a trainer</div>}
                </div>

                {/* Date + completed */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Session Date *</label>
                    <input type="date" value={shadowForm.date} onChange={e=>{setShadowForm(f=>({...f,date:e.target.value}));setShowFormErr(false);}} style={{...IS,...(showFormErr&&!shadowForm.date?{borderColor:"#ef444488"}:{})}}/>
                    {showFormErr&&!shadowForm.date&&<div className="ferr-msg">Date is required</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:"1px"}}>
                    <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"9px 12px",backgroundColor:"#0d1527",borderRadius:"6px",border:"1px solid #1e2d4d"}}>
                      <input type="checkbox" checked={!!shadowForm.completed} onChange={e=>setShadowForm(f=>({...f,completed:e.target.checked}))} style={{width:"14px",height:"14px",accentColor:"#22d3ee"}}/>
                      <span style={{fontSize:"12px",color:"#e2e8f0"}}>Mark as completed</span>
                    </label>
                  </div>
                </div>

                {/* Tasks covered — grouped multi-select */}
                <div style={{marginBottom:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                    <label style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>Tasks Covered <span style={{color:"#334155",textTransform:"none",letterSpacing:0}}>(optional · select all that apply)</span></label>
                    {shadowForm.taskIds.length>0&&(
                      <button onClick={()=>setShadowForm(f=>({...f,taskIds:[]}))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear all</button>
                    )}
                  </div>
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden",maxHeight:"220px",overflowY:"auto"}}>
                    {tasksByModule.map((group,gi)=>(
                      <div key={group.mod.id}>
                        {/* Module sub-header */}
                        <div style={{padding:"6px 12px",backgroundColor:group.mod.color+"0d",borderBottom:"1px solid #111827",borderTop:gi>0?"1px solid #111827":"none",display:"flex",alignItems:"center",gap:"7px",position:"sticky",top:0,zIndex:1}}>
                          <div style={{width:"6px",height:"6px",borderRadius:"2px",backgroundColor:group.mod.color,flexShrink:0}}/>
                          <span style={{fontSize:"10px",fontWeight:700,color:group.mod.color}}>{group.mod.label}</span>
                          <span style={{fontSize:"9px",color:"#334155"}}>{getRoleInfo(group.mod.requiredForRole)?.label}</span>
                          <button onClick={()=>{
                            const allIds=group.tasks.map(t=>t.id);
                            const allSelected=allIds.every(id=>shadowForm.taskIds.includes(id));
                            setShadowForm(f=>({...f,taskIds:allSelected?f.taskIds.filter(id=>!allIds.includes(id)):[...new Set([...f.taskIds,...allIds])]}));
                          }} style={{marginLeft:"auto",background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:"9px",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                            {group.tasks.every(t=>shadowForm.taskIds.includes(t.id))?"deselect all":"select all"}
                          </button>
                        </div>
                        {/* Task checkboxes */}
                        {group.tasks.map((task,ti)=>{
                          const checked=shadowForm.taskIds.includes(task.id);
                          return(
                            <label key={task.id} onClick={()=>toggleShadowTask(task.id)} style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 12px",cursor:"pointer",borderBottom:ti<group.tasks.length-1?"1px solid #0f1523":"none",backgroundColor:checked?group.mod.color+"11":"transparent",transition:"background 0.1s"}}>
                              <div style={{width:"14px",height:"14px",borderRadius:"3px",flexShrink:0,border:`1.5px solid ${checked?group.mod.color:"#1e2d4d"}`,backgroundColor:checked?group.mod.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.1s"}}>
                                {checked&&<span style={{fontSize:"9px",color:group.mod.color,fontWeight:700,lineHeight:1}}>✓</span>}
                              </div>
                              <span style={{fontSize:"11px",color:checked?"#e2e8f0":"#64748b",transition:"color 0.1s"}}>{task.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {shadowForm.taskIds.length>0&&(
                    <div style={{marginTop:"6px",fontSize:"10px",color:"#38bdf8"}}>
                      {shadowForm.taskIds.length} task{shadowForm.taskIds.length>1?"s":""} selected
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={{marginBottom:"14px"}}>
                  <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Notes <span style={{color:"#334155",textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                  <input value={shadowForm.notes} onChange={e=>setShadowForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Focused on escalation handling" style={IS}/>
                </div>

                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={saveShadow} disabled={!canSave} style={{flex:1,backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",padding:"9px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:canSave?1:0.4}}>{shadowEdit?"Update Session":"Add Session"}</button>
                  {shadowEdit&&<button onClick={()=>{setShadowForm({shadowedId:"",date:"",completed:false,notes:"",taskIds:[]});setShadowEdit(null);}} style={{padding:"9px 14px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear</button>}
                </div>
              </div>
              <button onClick={()=>{setShadowModal(null);setShadowEdit(null);}} style={{marginTop:"14px",width:"100%",padding:"9px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ═══ CALENDAR EVENT MODAL ═══ */}
      {calEventModal&&(()=>{
        const isNew   = calEventModal==="add";
        const ev      = isNew ? null : calEvents.find(e=>e.id===calEventModal);
        const TYPE_C  = { training:"#0ea5e9", shadowing:"#22d3ee", other:"#a78bfa" };
        const canSave = calForm.title?.trim() && calForm.date;
        // All participants: agentIds + trainerId (deduplicated)
        const allParticipants = [...new Set([...(calForm.agentIds||[]), calForm.trainerId].filter(Boolean))];
        const participantEmails = allParticipants.map(id=>findPerson(id)?.email).filter(Boolean);

        // Grouped task picker
        const tasksByMod = [...modules].sort((a,b)=>(a.order||0)-(b.order||0)).map(mod=>({
          mod, tasks: allTasks.filter(t=>t.moduleId===mod.id)
        })).filter(g=>g.tasks.length>0);

        return(
          <div onClick={()=>setCalEventModal(null)} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:"1px solid #1e2d4d",borderRadius:"12px",width:"620px",maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>

              {/* Modal header */}
              <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #1a2b42",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                <div>
                  <h3 style={{fontWeight:700,fontSize:"16px",marginBottom:"2px"}}>{isNew?"Schedule New Session":"Edit Session"}</h3>
                  {!isNew&&ev?.gcalCreated&&<span style={{fontSize:"10px",color:"#4ade80",display:"flex",alignItems:"center",gap:"4px"}}>● Added to Google Calendar</span>}
                </div>
                {/* Session type selector */}
                <div style={{display:"flex",gap:"4px"}}>
                  {Object.entries({training:"Training",shadowing:"Shadowing",other:"Other"}).map(([k,l])=>(
                    <button key={k} onClick={()=>setCalForm(f=>({...f,type:k}))} style={{padding:"5px 12px",borderRadius:"6px",border:`1px solid ${calForm.type===k?(TYPE_C[k]||"#64748b"):"#1e2d4d"}`,backgroundColor:calForm.type===k?(TYPE_C[k]||"#64748b")+"22":"transparent",color:calForm.type===k?(TYPE_C[k]||"#e2e8f0"):"#64748b",fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{padding:"20px 24px"}}>
                {/* Title */}
                <div style={{marginBottom:"14px"}}>
                  <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Session Title *</label>
                  <input value={calForm.title||""} onChange={e=>{setCalForm(f=>({...f,title:e.target.value}));setShowFormErr(false);}} placeholder="e.g. Live Chat Handling — Group Session" style={{...IS,...(showFormErr&&!calForm.title?.trim()?{borderColor:"#ef444488"}:{})}}/>
                  {showFormErr&&!calForm.title?.trim()&&<div className="ferr-msg">Title is required</div>}
                </div>

                {/* Date + times */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Date *</label>
                    <input type="date" value={calForm.date||""} onChange={e=>{setCalForm(f=>({...f,date:e.target.value}));setShowFormErr(false);}} style={{...IS,...(showFormErr&&!calForm.date?{borderColor:"#ef444488"}:{})}}/>
                    {showFormErr&&!calForm.date&&<div className="ferr-msg">Date is required</div>}
                  </div>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Start Time</label>
                    <input type="time" value={calForm.startTime||"09:00"} onChange={e=>setCalForm(f=>({...f,startTime:e.target.value}))} style={IS}/>
                  </div>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>End Time</label>
                    <input type="time" value={calForm.endTime||"10:00"} onChange={e=>setCalForm(f=>({...f,endTime:e.target.value}))} style={IS}/>
                  </div>
                </div>

                {/* Agents being trained (multi) */}
                <div style={{marginBottom:"14px"}}>
                  <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Agents Being Trained</label>
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden",maxHeight:"140px",overflowY:"auto"}}>
                    {agents.map((ag,i)=>{
                      const checked=(calForm.agentIds||[]).includes(ag.id);
                      const role=getRoleInfo(ag.role);
                      return(
                        <label key={ag.id} onClick={()=>setCalForm(f=>({...f,agentIds:checked?f.agentIds.filter(x=>x!==ag.id):[...(f.agentIds||[]),ag.id]}))} style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 12px",cursor:"pointer",borderBottom:i<agents.length-1?"1px solid #0f1523":"none",backgroundColor:checked?"#0ea5e916":"transparent"}}>
                          <div style={{width:"13px",height:"13px",flexShrink:0,borderRadius:"3px",border:`1.5px solid ${checked?"#0ea5e9":"#1e2d4d"}`,backgroundColor:checked?"#0ea5e933":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {checked&&<span style={{fontSize:"8px",color:"#0ea5e9",fontWeight:700}}>✓</span>}
                          </div>
                          <span style={{fontSize:"11px",color:checked?"#e2e8f0":"#64748b",flex:1}}>{ag.name}</span>
                          <Badge role={role}/>
                        </label>
                      );
                    })}
                  </div>
                  {(calForm.agentIds||[]).length>0&&<div style={{fontSize:"10px",color:"#0ea5e9",marginTop:"4px"}}>{calForm.agentIds.length} agent{calForm.agentIds.length>1?"s":""} selected</div>}
                </div>

                {/* Trainer / shadow agent */}
                <div style={{marginBottom:"14px"}}>
                  <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{calForm.type==="shadowing"?"Shadowing Agent (Experienced)":"Trainer / Facilitator"}</label>
                  <select value={calForm.trainerId||""} onChange={e=>setCalForm(f=>({...f,trainerId:e.target.value}))} style={IS}>
                    <option value="">— Select trainer —</option>
                    {staff.length>0&&<optgroup label="── Admin & Management Staff">
                      {staff.map(s=><option key={s.id} value={s.id}>⭐ {s.name} ({s.title})</option>)}
                    </optgroup>}
                    {agents.length>0&&<optgroup label="── Matrix Agents">
                      {agents.map(a=>{const r=getRoleInfo(a.role);return <option key={a.id} value={a.id}>{a.name} ({r?.label})</option>;})}
                    </optgroup>}
                  </select>
                </div>

                {/* Tasks covered */}
                <div style={{marginBottom:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                    <label style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>Tasks Covered <span style={{color:"#334155",textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                    {(calForm.taskIds||[]).length>0&&<button onClick={()=>setCalForm(f=>({...f,taskIds:[]}))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"10px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear all</button>}
                  </div>
                  <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden",maxHeight:"180px",overflowY:"auto"}}>
                    {tasksByMod.map((group,gi)=>(
                      <div key={group.mod.id}>
                        <div style={{padding:"5px 10px",backgroundColor:group.mod.color+"0d",borderBottom:"1px solid #111827",borderTop:gi>0?"1px solid #111827":"none",display:"flex",alignItems:"center",gap:"6px",position:"sticky",top:0,zIndex:1}}>
                          <div style={{width:"6px",height:"6px",borderRadius:"2px",backgroundColor:group.mod.color}}/>
                          <span style={{fontSize:"10px",fontWeight:700,color:group.mod.color}}>{group.mod.label}</span>
                          <button onClick={()=>{const ids=group.tasks.map(t=>t.id);const allSel=ids.every(id=>(calForm.taskIds||[]).includes(id));setCalForm(f=>({...f,taskIds:allSel?f.taskIds.filter(id=>!ids.includes(id)):[...new Set([...(f.taskIds||[]),...ids])]}));}} style={{marginLeft:"auto",background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:"9px",fontFamily:"'IBM Plex Sans',sans-serif"}}>{group.tasks.every(t=>(calForm.taskIds||[]).includes(t.id))?"deselect all":"select all"}</button>
                        </div>
                        {group.tasks.map((task,ti)=>{
                          const checked=(calForm.taskIds||[]).includes(task.id);
                          return(
                            <label key={task.id} onClick={()=>setCalForm(f=>({...f,taskIds:checked?f.taskIds.filter(x=>x!==task.id):[...(f.taskIds||[]),task.id]}))} style={{display:"flex",alignItems:"center",gap:"9px",padding:"6px 10px",cursor:"pointer",borderBottom:ti<group.tasks.length-1?"1px solid #0f1523":"none",backgroundColor:checked?group.mod.color+"11":"transparent"}}>
                              <div style={{width:"13px",height:"13px",flexShrink:0,borderRadius:"3px",border:`1.5px solid ${checked?group.mod.color:"#1e2d4d"}`,backgroundColor:checked?group.mod.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {checked&&<span style={{fontSize:"8px",color:group.mod.color,fontWeight:700}}>✓</span>}
                              </div>
                              <span style={{fontSize:"11px",color:checked?"#e2e8f0":"#64748b"}}>{task.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {(calForm.taskIds||[]).length>0&&<div style={{fontSize:"10px",color:"#38bdf8",marginTop:"4px"}}>{calForm.taskIds.length} task{calForm.taskIds.length>1?"s":""} selected</div>}
                </div>

                {/* Location + notes */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Location / Meeting Link</label>
                    <input value={calForm.location||""} onChange={e=>setCalForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Room A or https://zoom.us/..." style={IS}/>
                  </div>
                  <div>
                    <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Notes / Description</label>
                    <input value={calForm.notes||""} onChange={e=>setCalForm(f=>({...f,notes:e.target.value}))} placeholder="Any prep needed, agenda, etc." style={IS}/>
                  </div>
                </div>

                {/* Invitees summary */}
                {participantEmails.length>0&&(
                  <div style={{backgroundColor:"#080d1a",borderRadius:"8px",padding:"10px 14px",border:"1px solid #1e2d4d",marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"6px",fontWeight:600}}>Google Calendar Invites Will Be Sent To</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                      {allParticipants.map(id=>{
                        const p=findPerson(id);
                        const isStaff=!!staff.find(s=>s.id===id);
                        const r=isStaff?null:getRoleInfo(p?.role);
                        return p?(<div key={id} style={{display:"flex",alignItems:"center",gap:"5px",backgroundColor:"#0d1527",border:`1px solid ${isStaff?ADMIN_COLOR+"44":"#1e2d4d"}`,borderRadius:"5px",padding:"3px 8px"}}>
                          {isStaff&&<span style={{fontSize:"9px",color:ADMIN_COLOR}}>⭐</span>}
                          <span style={{fontSize:"10px",color:"#94a3b8"}}>{p.name}</span>
                          <span style={{fontSize:"9px",fontFamily:"'IBM Plex Mono',monospace",color:"#334155"}}>{p.email}</span>
                          {r&&<Badge role={r}/>}
                          {isStaff&&<span style={{fontSize:"9px",padding:"1px 5px",borderRadius:"3px",backgroundColor:ADMIN_COLOR+"18",color:ADMIN_COLOR}}>{p.title}</span>}
                        </div>):null;
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  <button onClick={()=>setCalEventModal(null)} style={{padding:"9px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
                  <button onClick={saveCalEvent} disabled={!canSave} style={{padding:"9px 20px",backgroundColor:"#0ea5e9",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:canSave?1:0.4,flex:1}}>{isNew?"Save Session":"Update Session"}</button>
                  {!isNew&&<button onClick={()=>setCalDelId(calEventModal)} style={{padding:"9px 14px",backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"6px",color:"#ef4444",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Delete</button>}
                  {/* Google Calendar button */}
                  <button onClick={()=>{const sid=saveCalEvent();if(sid)setTimeout(()=>openGcal({...calForm,id:sid}),80);}} disabled={!canSave} title="Save and open in Google Calendar with all invites pre-filled" style={{padding:"9px 14px",backgroundColor:"#164e1f",border:"1px solid #4ade8044",borderRadius:"6px",color:"#4ade80",cursor:"pointer",fontSize:"11px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:canSave?1:0.4,display:"flex",alignItems:"center",gap:"5px"}}>
                    <span>📆</span> Add to Google Calendar
                  </button>
                </div>

                {!isNew&&ev?.gcalCreated&&(
                  <div style={{marginTop:"10px",fontSize:"10px",color:"#475569",textAlign:"center"}}>
                    ● This session was previously added to Google Calendar · clicking again will create a new event
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Calendar delete confirm */}
      {calDelId&&<ConfirmModal title="Delete Session?" body={<>Permanently remove <strong style={{color:"#e2e8f0"}}>{calEvents.find(e=>e.id===calDelId)?.title}</strong> from the calendar?</>} confirmLabel="Yes, Delete" onConfirm={()=>deleteCalEvent(calDelId)} onCancel={()=>setCalDelId(null)}/>}

      {/* ═══ STAFF MODAL ═══ */}
      {staffModal&&(()=>{
        const isNew=staffModal==="add";
        const canSave=staffForm.name?.trim()&&staffForm.email?.trim()&&staffForm.title;
        return(
          <div onClick={()=>setStaffModal(null)} style={{position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{backgroundColor:"#0d1527",border:`1px solid ${ADMIN_COLOR}44`,borderRadius:"12px",padding:"24px",width:"520px",maxWidth:"100%",maxHeight:"88vh",overflowY:"auto"}}>
              <div style={{marginBottom:"18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                  <div style={{width:"22px",height:"22px",borderRadius:"5px",backgroundColor:ADMIN_COLOR+"22",border:`1px solid ${ADMIN_COLOR}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>🏷</div>
                  <h3 style={{fontWeight:700,fontSize:"16px"}}>{isNew?"Add Staff Member":"Edit Staff Member"}</h3>
                </div>
                <p style={{color:"#64748b",fontSize:"12px"}}>Admin & management staff — not tracked in the Skills Matrix</p>
              </div>

              <div style={{marginBottom:"13px"}}>
                <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Name *</label>
                <input value={staffForm.name||""} onChange={e=>{setStaffForm(f=>({...f,name:e.target.value}));setShowFormErr(false);}} placeholder="e.g. Victoria Nash" style={{...IS,...(showFormErr&&!staffForm.name?.trim()?{borderColor:"#ef444488"}:{})}}/>
                {showFormErr&&!staffForm.name?.trim()&&<div className="ferr-msg">Name is required</div>}
              </div>
              <div style={{marginBottom:"13px"}}>
                <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Email *</label>
                <input type="email" value={staffForm.email||""} onChange={e=>{setStaffForm(f=>({...f,email:e.target.value}));setShowFormErr(false);}} placeholder="e.g. v.nash@company.com" style={{...IS,...(showFormErr&&!staffForm.email?.trim()?{borderColor:"#ef444488"}:{})}}/>
                {showFormErr&&!staffForm.email?.trim()&&<div className="ferr-msg">Email is required</div>}
              </div>
              <div style={{marginBottom:"16px"}}>
                <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Role / Title *</label>
                <select value={staffForm.title||""} onChange={e=>setStaffForm(f=>({...f,title:e.target.value}))} style={IS}>
                  {ADMIN_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Direct reports multi-select */}
              <div style={{marginBottom:"18px"}}>
                <label style={{fontSize:"10px",color:"#475569",display:"block",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Direct Reports <span style={{color:"#334155",textTransform:"none",letterSpacing:0}}>(optional — select agents they manage)</span></label>
                <div style={{border:"1px solid #1e2d4d",borderRadius:"8px",overflow:"hidden",maxHeight:"200px",overflowY:"auto"}}>
                  {agents.map((ag,i)=>{
                    const checked=(staffForm.directReports||[]).includes(ag.id);
                    const role=getRoleInfo(ag.role);
                    return(
                      <label key={ag.id} onClick={()=>setStaffForm(f=>({...f,directReports:checked?f.directReports.filter(x=>x!==ag.id):[...(f.directReports||[]),ag.id]}))} style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 12px",cursor:"pointer",borderBottom:i<agents.length-1?"1px solid #0f1523":"none",backgroundColor:checked?ADMIN_COLOR+"0d":"transparent"}}>
                        <div style={{width:"13px",height:"13px",flexShrink:0,borderRadius:"3px",border:`1.5px solid ${checked?ADMIN_COLOR:"#1e2d4d"}`,backgroundColor:checked?ADMIN_COLOR+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {checked&&<span style={{fontSize:"8px",color:ADMIN_COLOR,fontWeight:700}}>✓</span>}
                        </div>
                        <span style={{fontSize:"11px",color:checked?"#e2e8f0":"#64748b",flex:1}}>{ag.name}</span>
                        <Badge role={role}/>
                      </label>
                    );
                  })}
                </div>
                {(staffForm.directReports||[]).length>0&&<div style={{fontSize:"10px",color:ADMIN_COLOR,marginTop:"4px"}}>{staffForm.directReports.length} agent{staffForm.directReports.length>1?"s":""} selected</div>}
              </div>

              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
                <button onClick={()=>setStaffModal(null)} style={{padding:"8px 16px",backgroundColor:"transparent",border:"1px solid #1e2d4d",borderRadius:"6px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Cancel</button>
                {!isNew&&<button onClick={()=>{setStaffDel(staffModal);setStaffModal(null);}} style={{padding:"8px 14px",backgroundColor:"transparent",border:"1px solid #3d1515",borderRadius:"6px",color:"#ef4444",cursor:"pointer",fontSize:"12px",fontFamily:"'IBM Plex Sans',sans-serif"}}>Remove</button>}
                <button onClick={saveStaff} disabled={!canSave} style={{padding:"8px 22px",backgroundColor:ADMIN_COLOR,border:"none",borderRadius:"6px",color:"#000",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"'IBM Plex Sans',sans-serif",opacity:canSave?1:0.4}}>{isNew?"Add Staff Member":"Save Changes"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ CONFIRM MODALS ═══ */}
      {agentDel&&<ConfirmModal title="Remove Agent?" body={<>Permanently deletes all training records and monthly metrics for <strong style={{color:"#e2e8f0"}}>{agents.find(a=>a.id===agentDel)?.name}</strong>. This cannot be undone.</>} confirmLabel="Yes, Remove Agent" onConfirm={deleteAgent} onCancel={()=>setAgentDel(null)}/>}
      {staffDel&&<ConfirmModal title="Remove Staff Member?" body={<>Remove <strong style={{color:"#e2e8f0"}}>{staff.find(s=>s.id===staffDel)?.name}</strong> from the admin staff roster?</>} confirmLabel="Yes, Remove" onConfirm={deleteStaff} onCancel={()=>setStaffDel(null)}/>}
      {modDel&&<ConfirmModal title="Delete Module?" body={<>Deletes module <strong style={{color:"#e2e8f0"}}>{modules.find(m=>m.id===modDel)?.label}</strong> and all <strong style={{color:"#f87171"}}>{tasks.filter(t=>t.moduleId===modDel).length} tasks</strong> inside it.</>} confirmLabel="Yes, Delete Module" onConfirm={deleteModule} onCancel={()=>setModDel(null)}/>}
      {taskDel&&<ConfirmModal title="Delete Task?" body={<>Deletes <strong style={{color:"#e2e8f0"}}>{tasks.find(t=>t.id===taskDel)?.label}</strong> and removes all training records for this task across all agents.</>} confirmLabel="Yes, Delete Task" onConfirm={deleteTask} onCancel={()=>setTaskDel(null)}/>}
      {clearLogConfirm&&<ConfirmModal title="Clear Activity Log?" body="All log entries will be permanently deleted. This cannot be undone." confirmLabel="Yes, Clear Log" onConfirm={()=>{setAuditLog([]);setClearLogConfirm(false);}} onCancel={()=>setClearLogConfirm(false)}/>}
      {resetConfirm&&<ConfirmModal title="Reset All Data?" body={<>This will <strong style={{color:"#f87171"}}>permanently delete all agents, staff, training records, monthly metrics, shadowing sessions, and calendar events</strong>. Module and task structure will be kept. This cannot be undone.</>} confirmLabel="Yes, Reset Everything" onConfirm={resetAllData} onCancel={()=>setResetConfirm(false)}/>}
    </div>
  );
}
