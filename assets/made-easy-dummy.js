(() => {
  const TELEGRAM_URL = "https://t.me/bijzli";
  const THEME_KEY = "bijzli-provider-theme";
  const ROOT = document.documentElement;
  const BODY = document.body;
  const qs = (s, n = document) => n.querySelector(s);
  const qsa = (s, n = document) => Array.from(n.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = byId(id);
    if (el) el.textContent = value;
  };

  if (!BODY || qs(".gate-header")) return;

  const cards = qsa(".qcard[data-qnum]");
  if (!cards.length) return;

  injectStyles();
  ROOT.setAttribute("data-bijzli-gate", "true");

  const title = clean(qs("#pageHeader h1")?.textContent || document.title || "BIJZLI EASY Test");
  const meta = clean(qs("#pageHeader .meta")?.textContent || "");
  const duration = parseInt(byId("timerWrap")?.getAttribute("data-duration") || "0", 10) || 0;
  const qnums = cards.map(getQnum).filter(Number.isFinite).sort((a, b) => a - b);
  const byQ = new Map(cards.map((card) => [getQnum(card), card]));
  const subject = subjectLabel(title, meta);
  const examTitle = examLabel(title, meta);
  const totalMarks = round2(cards.reduce((sum, card) => sum + num(card.getAttribute("data-right")), 0));
  const sections = buildSections(title, meta, subject, qnums);
  const sectionByQ = new Map();
  sections.forEach((section) => section.qnums.forEach((qnum) => sectionByQ.set(qnum, section.id)));

  const state = {
    cards,
    byQ,
    qnums,
    current: qnums[0],
    submitted: false,
    duration,
    remain: duration,
    timer: null,
    statuses: new Map(),
    results: new Map(),
    sections,
    sectionByQ,
    subject,
    examTitle,
    subtitle: subtitleLabel(title, subject, qnums.length, totalMarks, duration),
    totalMarks,
    toastTimer: null,
  };

  qnums.forEach((qnum) => state.statuses.set(qnum, "not-visited"));
  state.statuses.set(state.current, "not-answered");

  prepareCards(state);
  buildUI(state);
  applyTheme(state, loadTheme());
  render(state);
  startTimer(state);
  syncSticky();
  window.dispatchEvent(new Event("bijzli:exam-layout-ready"));

  window.addEventListener("resize", syncSticky);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  window.submitAndCheck = () => submit(state);
  window.resetAll = () => resetAll(state);
  window.openAllSolutions = () => qsa("details.solution").forEach((detail) => (detail.open = true));
  window.closeAllSolutions = () => qsa("details.solution").forEach((detail) => (detail.open = false));
  window.switchSection = (id) => switchSection(state, id);
  window.gotoQ = (qnum) => goto(state, qnum);
  window.closeSubmitModal = closeModal;

  function injectStyles() {
    if (byId("bijzliProviderDummyStyle")) return;
    const style = document.createElement("style");
    style.id = "bijzliProviderDummyStyle";
    style.textContent = `
html[data-bijzli-gate="true"] body[data-theme="bright"]{--b:#0056a0;--b2:#003d75;--g:#2e7d32;--r:#c62828;--o:#e65100;--p:#6a1b9a;--head:linear-gradient(135deg,#003d75 0%,#0056a0 50%,#1565c0 100%);--sub:#f5f7fa;--bg:#eff3f8;--card:#fff;--chip:#f7f9fc;--hover:#eef5ff;--border:#d0d7de;--text:#1a1a2e;--muted:#5a6578;--shadow:rgba(15,23,42,.12);--ring:rgba(0,86,160,.24)}
html[data-bijzli-gate="true"] body[data-theme="dark"]{--b:#78b5ff;--b2:#8dc3ff;--g:#57d9a3;--r:#ff7a88;--o:#ffb347;--p:#c08cff;--head:linear-gradient(135deg,#071526 0%,#12345a 52%,#1a5fa0 100%);--sub:#102034;--bg:#09121d;--card:#101b2b;--chip:#132238;--hover:#16304d;--border:#29405d;--text:#edf4ff;--muted:#a8bdd8;--shadow:rgba(2,8,23,.42);--ring:rgba(120,181,255,.26)}
html[data-bijzli-gate="true"] body[data-theme="green"]{--b:#20895d;--b2:#126040;--g:#2e7d32;--r:#c62828;--o:#d97706;--p:#7c5ac2;--head:linear-gradient(135deg,#0f3323 0%,#1f6a47 52%,#39a66f 100%);--sub:#edf6f0;--bg:#edf5ef;--card:#fff;--chip:#f2f8f4;--hover:#e6f4ea;--border:#bfd4c5;--text:#173424;--muted:#4d6a5b;--shadow:rgba(22,54,37,.12);--ring:rgba(32,137,93,.22)}
html[data-bijzli-gate="true"] body{margin:0;min-height:100vh;overflow-x:hidden;background:radial-gradient(circle at top right,rgba(255,255,255,.34),transparent 24%),linear-gradient(180deg,var(--sub) 0%,var(--bg) 22%,var(--bg) 100%);color:var(--text);font-family:"Noto Sans","Segoe UI",Arial,sans-serif}
html[data-bijzli-gate="true"] body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(120,140,170,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(120,140,170,.08) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.26),transparent 78%);pointer-events:none;z-index:0}
html[data-bijzli-gate="true"] .wrap{position:relative;z-index:1;max-width:1480px;padding:0 16px 32px}
html[data-bijzli-gate="true"] #pageHeader,html[data-bijzli-gate="true"] #noticeBar,html[data-bijzli-gate="true"] #summary,html[data-bijzli-gate="true"] .adminFloat,html[data-bijzli-gate="true"] .toast{display:none!important}
html[data-bijzli-gate="true"] .gate-header{position:sticky;top:0;z-index:1200;background:var(--head);color:#fff;padding:10px 16px 12px;box-shadow:0 12px 32px rgba(0,0,0,.18);border-bottom:1px solid rgba(255,255,255,.16)}
html[data-bijzli-gate="true"] .gate-header-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
html[data-bijzli-gate="true"] .gate-brand-link{display:inline-flex;align-items:center;gap:12px;color:inherit;text-decoration:none;transition:transform .18s ease,opacity .18s ease,filter .18s ease}
html[data-bijzli-gate="true"] .gate-brand-link:hover{transform:translateY(-1px);opacity:.98;filter:drop-shadow(0 0 14px rgba(255,255,255,.18))}
html[data-bijzli-gate="true"] .gate-brand-link:hover .gate-logo-title{color:#ffcbc6}
html[data-bijzli-gate="true"] .gate-logo-badge{display:inline-flex;align-items:center;justify-content:center;min-width:52px;height:40px;padding:0 12px;border-radius:8px;background:#fff;color:var(--b2);font-size:22px;font-weight:900;box-shadow:0 4px 16px rgba(0,0,0,.18)}
html[data-bijzli-gate="true"] .gate-logo-text{display:grid;gap:3px;line-height:1.1}
html[data-bijzli-gate="true"] .gate-logo-title{font-size:13px;font-weight:800;letter-spacing:.04em;transition:color .18s ease}
html[data-bijzli-gate="true"] .gate-logo-sub{font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.84}
html[data-bijzli-gate="true"] .gate-header-center{flex:1 1 420px;text-align:center;min-width:0}
html[data-bijzli-gate="true"] .gate-exam-title{font-size:16px;font-weight:800;line-height:1.3}
html[data-bijzli-gate="true"] .gate-exam-subtitle{margin-top:4px;font-size:12px;line-height:1.45;opacity:.86}
html[data-bijzli-gate="true"] .gate-header-right{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;min-width:0}
html[data-bijzli-gate="true"] .gate-theme-switch{display:inline-flex;gap:4px;padding:4px;border-radius:8px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18)}
html[data-bijzli-gate="true"] .gate-theme-btn,html[data-bijzli-gate="true"] .gate-section-tab,html[data-bijzli-gate="true"] .gate-header-btn,html[data-bijzli-gate="true"] .gate-nav-btn,html[data-bijzli-gate="true"] .gate-palette-btn,html[data-bijzli-gate="true"] .sm-fbtn{border-radius:8px}
html[data-bijzli-gate="true"] .gate-theme-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid transparent;background:transparent;color:#fff;padding:8px 10px;font-size:12px;font-weight:800;cursor:pointer;transition:background .18s ease,color .18s ease,transform .18s ease}
html[data-bijzli-gate="true"] .gate-theme-btn:hover,html[data-bijzli-gate="true"] .gate-section-tab:hover,html[data-bijzli-gate="true"] .gate-header-btn:hover,html[data-bijzli-gate="true"] .gate-nav-btn:hover,html[data-bijzli-gate="true"] .gate-palette-btn:hover,html[data-bijzli-gate="true"] .sm-fbtn:hover{transform:translateY(-1px)}
html[data-bijzli-gate="true"] .gate-theme-btn[aria-pressed="true"]{background:#fff;color:var(--b2)}
html[data-bijzli-gate="true"] .gate-theme-dot{width:10px;height:10px;border-radius:999px;display:inline-block}
html[data-bijzli-gate="true"] .gate-theme-dot.bright{background:linear-gradient(135deg,#fff 0%,#e7eef9 100%);border:1px solid rgba(0,0,0,.12)}
html[data-bijzli-gate="true"] .gate-theme-dot.dark{background:linear-gradient(135deg,#0a1626 0%,#406a9b 100%)}
html[data-bijzli-gate="true"] .gate-theme-dot.green{background:linear-gradient(135deg,#0f3323 0%,#39a66f 100%)}
html[data-bijzli-gate="true"] .gate-timer-box{min-width:124px;display:grid;gap:2px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.14)}
html[data-bijzli-gate="true"] .gate-timer-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.82}
html[data-bijzli-gate="true"] .gate-timer-time{font-size:20px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1}
html[data-bijzli-gate="true"] .gate-timer-box.warn .gate-timer-time{color:#ffd166}
html[data-bijzli-gate="true"] .gate-timer-box.bad .gate-timer-time{color:#ff9b9b}
html[data-bijzli-gate="true"] .gate-header-btn,html[data-bijzli-gate="true"] .gate-nav-btn,html[data-bijzli-gate="true"] .sm-fbtn{border:1px solid var(--border);background:var(--card);color:var(--text);padding:10px 14px;font-size:13px;font-weight:800;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}
html[data-bijzli-gate="true"] .gate-header-btn.danger,html[data-bijzli-gate="true"] .gate-nav-btn.primary,html[data-bijzli-gate="true"] .sm-fbtn.cls{background:linear-gradient(135deg,rgba(230,81,0,.98) 0%,rgba(198,40,40,.96) 100%);color:#fff;border-color:rgba(255,255,255,.16)}
html[data-bijzli-gate="true"] .gate-nav-btn.secondary,html[data-bijzli-gate="true"] .sm-fbtn.rev{background:var(--chip)}
html[data-bijzli-gate="true"] .gate-header-btn:disabled,html[data-bijzli-gate="true"] .gate-nav-btn:disabled,html[data-bijzli-gate="true"] .sm-fbtn:disabled{cursor:default;opacity:.68;transform:none}
html[data-bijzli-gate="true"] .gate-section-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
html[data-bijzli-gate="true"] .gate-section-tab{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.14);color:#fff;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer;transition:transform .18s ease,background .18s ease,color .18s ease}
html[data-bijzli-gate="true"] .gate-section-tab.active{background:#fff;color:var(--b2)}
html[data-bijzli-gate="true"] .gate-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start;margin-top:14px}
html[data-bijzli-gate="true"] .gate-sidebar{display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;position:sticky;top:calc(var(--bijzli-header,120px) + 12px);align-self:start;max-height:calc(100vh - var(--bijzli-header,120px) - 24px)}
html[data-bijzli-gate="true"] .gate-question-area{min-width:0}
html[data-bijzli-gate="true"] .gate-q-info,html[data-bijzli-gate="true"] .gate-side-card,html[data-bijzli-gate="true"] .qcard,html[data-bijzli-gate="true"] .sm-modal,html[data-bijzli-gate="true"] .gate-nav-bar{border:1px solid var(--border);background:var(--card);box-shadow:0 12px 30px var(--shadow)}
html[data-bijzli-gate="true"] .gate-q-info{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px;border-radius:8px;margin-bottom:14px}
html[data-bijzli-gate="true"] .gate-info-chip,html[data-bijzli-gate="true"] .gate-side-kpi,html[data-bijzli-gate="true"] .sm-kpi,html[data-bijzli-gate="true"] .sm-mb{border:1px solid var(--border);background:var(--chip);border-radius:8px;padding:10px 12px}
html[data-bijzli-gate="true"] .gate-info-chip span,html[data-bijzli-gate="true"] .gate-side-kpi span,html[data-bijzli-gate="true"] .sm-kpi-lbl,html[data-bijzli-gate="true"] .sm-mb-t{display:block;color:var(--muted);font-size:11px;line-height:1.3;text-transform:uppercase;letter-spacing:.07em}
html[data-bijzli-gate="true"] .gate-info-chip strong,html[data-bijzli-gate="true"] .gate-side-kpi strong,html[data-bijzli-gate="true"] .sm-kpi-val,html[data-bijzli-gate="true"] .sm-mb-n{display:block;margin-top:6px;font-size:17px;font-weight:900;color:var(--text)}
html[data-bijzli-gate="true"] .qcard{display:none;position:relative;border-radius:8px;padding:18px!important;margin:0 0 16px!important;scroll-margin-top:calc(var(--bijzli-header,120px) + 18px)}
html[data-bijzli-gate="true"] .qcard.is-active,html[data-bijzli-gate="true"][data-bijzli-submitted="true"] .qcard{display:block}
html[data-bijzli-gate="true"] body.test-submitted .gate-nav-bar{display:none}
html[data-bijzli-gate="true"] .qhead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
html[data-bijzli-gate="true"] .qid{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--text);font-size:18px;font-weight:900}
html[data-bijzli-gate="true"] .tags{margin-top:6px;color:var(--muted)!important;font-size:12px;line-height:1.45}
html[data-bijzli-gate="true"] .bijzli-qmeta{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px}
html[data-bijzli-gate="true"] .badge,html[data-bijzli-gate="true"] .bijzli-chip{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);background:var(--chip);color:var(--muted);border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;line-height:1.2}
html[data-bijzli-gate="true"] .badge.qtype,html[data-bijzli-gate="true"] .bijzli-chip.kind{border-color:var(--ring);background:rgba(0,86,160,.08);color:var(--b2)}
html[data-bijzli-gate="true"] .badge.good,html[data-bijzli-gate="true"] .gate-palette-btn.result-correct,html[data-bijzli-gate="true"] .sm-kpi.cor{border-color:rgba(46,125,50,.36);background:rgba(46,125,50,.12);color:var(--g)}
html[data-bijzli-gate="true"] .badge.bad,html[data-bijzli-gate="true"] .gate-palette-btn.result-wrong,html[data-bijzli-gate="true"] .sm-kpi.wrg{border-color:rgba(198,40,40,.34);background:rgba(198,40,40,.12);color:var(--r)}
html[data-bijzli-gate="true"] .badge.warn,html[data-bijzli-gate="true"] .gate-palette-btn.result-skipped,html[data-bijzli-gate="true"] .sm-kpi.skp{border-color:rgba(230,81,0,.34);background:rgba(230,81,0,.12);color:var(--o)}
html[data-bijzli-gate="true"] .badge.unk,html[data-bijzli-gate="true"] .gate-palette-btn.result-unknown{border-color:rgba(106,27,154,.32);background:rgba(106,27,154,.12);color:var(--p)}
html[data-bijzli-gate="true"] .qtext{margin-top:14px;color:var(--text);font-size:15px;line-height:1.65}
html[data-bijzli-gate="true"] .qtext img,html[data-bijzli-gate="true"] .opts img,html[data-bijzli-gate="true"] details.solution img{max-width:100%;height:auto}
html[data-bijzli-gate="true"] .opts{margin-top:16px;display:grid;gap:10px}
html[data-bijzli-gate="true"] label.opt{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--chip);transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}
html[data-bijzli-gate="true"] label.opt:hover{border-color:var(--ring);background:var(--hover);box-shadow:0 10px 22px rgba(0,0,0,.08)}
html[data-bijzli-gate="true"] label.opt>div{min-width:0}
html[data-bijzli-gate="true"] label.opt.correct{border-color:rgba(46,125,50,.36);background:rgba(46,125,50,.12)}
html[data-bijzli-gate="true"] label.opt.wrong{border-color:rgba(198,40,40,.34);background:rgba(198,40,40,.11)}
html[data-bijzli-gate="true"] label.opt.skipped{border-color:rgba(230,81,0,.34);background:rgba(230,81,0,.11)}
html[data-bijzli-gate="true"] input[type="radio"],html[data-bijzli-gate="true"] input[type="checkbox"]{margin-top:3px;accent-color:var(--b)}
html[data-bijzli-gate="true"] .nat{margin-top:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
html[data-bijzli-gate="true"] .natInput{width:min(320px,100%);padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;outline:none;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
html[data-bijzli-gate="true"] .natInput:focus{border-color:var(--ring);box-shadow:0 0 0 3px rgba(26,115,200,.12)}
html[data-bijzli-gate="true"] .natInput.correct{border-color:rgba(46,125,50,.36);background:rgba(46,125,50,.12)}
html[data-bijzli-gate="true"] .natInput.wrong{border-color:rgba(198,40,40,.34);background:rgba(198,40,40,.11)}
html[data-bijzli-gate="true"] .natInput.skipped{border-color:rgba(230,81,0,.34);background:rgba(230,81,0,.11)}
html[data-bijzli-gate="true"] .natHint{color:var(--muted);font-size:12px}
html[data-bijzli-gate="true"] .answerline{display:none!important;margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--chip);color:var(--muted);font-size:13px}
html[data-bijzli-gate="true"][data-bijzli-submitted="true"] .answerline{display:block!important}
html[data-bijzli-gate="true"] .answerline b{color:var(--text)}
html[data-bijzli-gate="true"] details.solution{margin-top:12px;border:1px dashed var(--border);border-radius:8px;padding:10px 12px;background:var(--chip)}
html[data-bijzli-gate="true"] details.solution summary{cursor:pointer;color:var(--b2);font-weight:800}
html[data-bijzli-gate="true"] .gate-side-card{border-radius:8px;padding:14px}
html[data-bijzli-gate="true"] .gate-side-title{font-size:13px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
html[data-bijzli-gate="true"] .gate-side-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
html[data-bijzli-gate="true"] .gate-side-palette{display:flex;flex-direction:column;min-height:0;overflow:hidden}
html[data-bijzli-gate="true"] .gate-palette-scroll{display:flex;flex:1 1 auto;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;padding-right:4px;margin-top:12px}
html[data-bijzli-gate="true"] .gate-palette-scroll::-webkit-scrollbar{width:8px}
html[data-bijzli-gate="true"] .gate-palette-scroll::-webkit-scrollbar-thumb{background:rgba(127,127,127,.35);border-radius:999px}
html[data-bijzli-gate="true"] .gate-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px}
html[data-bijzli-gate="true"] .gate-legend-row{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11px;line-height:1.3;min-width:0}
html[data-bijzli-gate="true"] .gate-legend-dot{width:14px;height:14px;border-radius:999px;border:1px solid transparent;flex:none}
html[data-bijzli-gate="true"] .gate-legend-dot.not-visited,html[data-bijzli-gate="true"] .gate-palette-btn.not-visited{background:#9e9e9e;border-color:rgba(0,0,0,.12);color:#fff}
html[data-bijzli-gate="true"] .gate-legend-dot.not-answered,html[data-bijzli-gate="true"] .gate-palette-btn.not-answered{background:#f44336;border-color:rgba(244,67,54,.3);color:#fff}
html[data-bijzli-gate="true"] .gate-legend-dot.answered,html[data-bijzli-gate="true"] .gate-palette-btn.answered{background:#4caf50;border-color:rgba(76,175,80,.3);color:#fff}
html[data-bijzli-gate="true"] .gate-legend-dot.marked,html[data-bijzli-gate="true"] .gate-palette-btn.marked{background:#9c27b0;border-color:rgba(156,39,176,.3);color:#fff}
html[data-bijzli-gate="true"] .gate-legend-dot.answered-marked,html[data-bijzli-gate="true"] .gate-palette-btn.answered-marked{background:#ff9800;border-color:rgba(255,152,0,.3);color:#fff}
html[data-bijzli-gate="true"] .gate-palette{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
html[data-bijzli-gate="true"] .gate-palette-btn{height:34px;border:1px solid var(--border);background:var(--chip);color:var(--text);font-size:12px;font-weight:900;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}
html[data-bijzli-gate="true"] .gate-palette-btn.is-current{box-shadow:inset 0 0 0 2px var(--b2)}
html[data-bijzli-gate="true"] .gate-nav-bar{position:sticky;bottom:12px;z-index:1100;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:10px;border-radius:8px;margin-top:16px;background:color-mix(in srgb,var(--card) 86%,transparent);backdrop-filter:blur(10px)}
html[data-bijzli-gate="true"] .gate-toast{position:fixed;right:16px;bottom:16px;z-index:1600;max-width:min(300px,calc(100vw - 32px));padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:color-mix(in srgb,var(--card) 90%,transparent);color:var(--text);font-size:12px;font-weight:800;box-shadow:0 12px 26px var(--shadow);opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .18s ease,transform .18s ease}
html[data-bijzli-gate="true"] .gate-toast.show{opacity:1;transform:translateY(0)}
html[data-bijzli-gate="true"] .sm-backdrop{position:fixed;inset:0;z-index:1500;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,10,20,.62);backdrop-filter:blur(6px)}
html[data-bijzli-gate="true"] .sm-backdrop.show{display:flex}
html[data-bijzli-gate="true"] .sm-modal{width:min(940px,100%);max-height:calc(100vh - 36px);overflow:auto;border-radius:8px;color:var(--text)}
html[data-bijzli-gate="true"] .sm-head{padding:18px 20px 12px;border-bottom:1px solid var(--border);background:var(--sub)}
html[data-bijzli-gate="true"] .sm-head-title{font-size:20px;font-weight:900}
html[data-bijzli-gate="true"] .sm-head-sub{margin-top:4px;color:var(--muted);font-size:13px;line-height:1.4}
html[data-bijzli-gate="true"] .sm-body{display:grid;gap:16px;padding:18px 20px}
html[data-bijzli-gate="true"] .sm-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:18px;border-radius:8px;background:linear-gradient(135deg,rgba(0,86,160,.14) 0%,rgba(26,115,200,.08) 100%);border:1px solid var(--ring)}
html[data-bijzli-gate="true"] .sm-hero-score{font-size:42px;font-weight:900;line-height:1}
html[data-bijzli-gate="true"] .sm-hero-out,html[data-bijzli-gate="true"] .sm-hero-pct{color:var(--muted);font-size:18px;font-weight:800}
html[data-bijzli-gate="true"] .sm-stats,html[data-bijzli-gate="true"] .sm-mbox{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
html[data-bijzli-gate="true"] .sm-mbox{grid-template-columns:repeat(2,minmax(0,1fr))}
html[data-bijzli-gate="true"] .sm-tbl{width:100%;border-collapse:collapse;font-size:13px}
html[data-bijzli-gate="true"] .sm-tbl th,html[data-bijzli-gate="true"] .sm-tbl td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border)}
html[data-bijzli-gate="true"] .sm-tbl th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em}
html[data-bijzli-gate="true"] .sm-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px 18px}
@media (max-width:1120px){html[data-bijzli-gate="true"] .gate-layout{grid-template-columns:1fr}html[data-bijzli-gate="true"] .gate-sidebar{position:static;max-height:none}html[data-bijzli-gate="true"] .gate-side-palette{max-height:none}html[data-bijzli-gate="true"] .gate-palette-scroll{overflow:visible;max-height:none}html[data-bijzli-gate="true"] .gate-palette{grid-template-columns:repeat(8,minmax(0,1fr))}}
@media (max-width:860px){html[data-bijzli-gate="true"] .gate-header{padding:10px 12px 12px}html[data-bijzli-gate="true"] .gate-header-top{align-items:stretch}html[data-bijzli-gate="true"] .gate-header-center{order:3;flex-basis:100%;text-align:left}html[data-bijzli-gate="true"] .gate-header-right{width:100%;justify-content:space-between}html[data-bijzli-gate="true"] .gate-q-info{grid-template-columns:repeat(2,minmax(0,1fr))}html[data-bijzli-gate="true"] .sm-stats,html[data-bijzli-gate="true"] .sm-mbox{grid-template-columns:1fr}html[data-bijzli-gate="true"] .sm-hero{align-items:flex-start;flex-direction:column}}
@media (max-width:640px){html[data-bijzli-gate="true"] .wrap{padding:0 12px 24px}html[data-bijzli-gate="true"] .gate-theme-switch{width:100%}html[data-bijzli-gate="true"] .gate-theme-btn{flex:1 1 0;justify-content:center}html[data-bijzli-gate="true"] .gate-header-btn{width:100%}html[data-bijzli-gate="true"] .gate-section-nav{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px}html[data-bijzli-gate="true"] .qcard{padding:14px!important}html[data-bijzli-gate="true"] .qid{font-size:16px}html[data-bijzli-gate="true"] .gate-legend{grid-template-columns:1fr 1fr}html[data-bijzli-gate="true"] .gate-palette{grid-template-columns:repeat(5,minmax(0,1fr))}html[data-bijzli-gate="true"] .gate-nav-bar{grid-template-columns:repeat(2,minmax(0,1fr));bottom:8px}html[data-bijzli-gate="true"] .sm-head,html[data-bijzli-gate="true"] .sm-body,html[data-bijzli-gate="true"] .sm-foot{padding-left:14px;padding-right:14px}html[data-bijzli-gate="true"] .sm-tbl{font-size:12px}}
`;
    document.head.appendChild(style);
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/[â€¢•]/g, "|").replace(/\s+\|\s+/g, " | ").trim();
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function num(value) {
    return parseFloat(value || "0") || 0;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function fmtMarks(value) {
    const v = round2(value);
    return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  }

  function fmtClock(total) {
    const safe = Math.max(0, Math.floor(total));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return h > 0
      ? [h, m, s].map((part, index) => (index ? String(part).padStart(2, "0") : String(part))).join(":")
      : `${m}:${String(s).padStart(2, "0")}`;
  }

  function fmtDuration(total) {
    if (!total) return "";
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h && m) return `${h} Hour${h === 1 ? "" : "s"} ${m} Min`;
    if (h) return `${h} Hour${h === 1 ? "" : "s"}`;
    return `${m} Min`;
  }

  function qtype(value) {
    const raw = String(value || "MCQ").trim().toUpperCase();
    if (raw === "MSQ") return "MSQ";
    if (raw === "NAT" || raw === "NUM" || raw === "NUMERICAL") return "NAT";
    return "MCQ";
  }

  function getQnum(card) {
    return parseInt(card.getAttribute("data-qnum") || "", 10);
  }

  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "bright" || stored === "dark" || stored === "green") return stored;
      const legacy = String(BODY.dataset.theme || ROOT.dataset.theme || "").toLowerCase();
      if (legacy === "light" || legacy === "bright") return "bright";
      if (legacy === "dark") return "dark";
      if (legacy === "green") return "green";
    } catch (error) {
      return "bright";
    }
    return "bright";
  }

  function applyTheme(state, theme) {
    const value = theme === "dark" || theme === "green" ? theme : "bright";
    BODY.dataset.theme = value;
    ROOT.dataset.theme = value === "bright" ? "light" : value;
    try {
      localStorage.setItem(THEME_KEY, value);
      localStorage.setItem("theme", ROOT.dataset.theme);
    } catch (error) {
      void error;
    }
    qsa(".gate-theme-btn").forEach((button) => {
      button.setAttribute("aria-pressed", button.getAttribute("data-theme") === value ? "true" : "false");
    });
  }

  function subjectLabel(titleText, metaText) {
    const source = `${titleText} ${metaText}`.toLowerCase();
    const labels = [
      ["computer science engineering", "Computer Science & Information Technology"],
      ["computer science & information technology", "Computer Science & Information Technology"],
      ["mechanical engineering", "Mechanical Engineering"],
      ["civil engineering", "Civil Engineering"],
      ["electrical engineering", "Electrical Engineering"],
      ["electronics and communication engineering", "Electronics & Communication Engineering"],
      ["electronics & communication engineering", "Electronics & Communication Engineering"],
      ["data science and artificial intelligence", "Data Science & Artificial Intelligence"],
      ["data science and ai", "Data Science & Artificial Intelligence"],
      ["general studies", "General Studies & Engineering Aptitude"],
      ["general aptitude", "General Aptitude"],
    ];
    for (const [key, label] of labels) if (source.includes(key)) return label;
    if (/\bcs\b/i.test(titleText)) return "Computer Science & Information Technology";
    if (/\bme\b/i.test(titleText)) return "Mechanical Engineering";
    if (/\bce\b/i.test(titleText)) return "Civil Engineering";
    if (/\bee\b/i.test(titleText)) return "Electrical Engineering";
    if (/\bec\b/i.test(titleText)) return "Electronics & Communication Engineering";
    if (/\bda\b/i.test(titleText)) return "Data Science & Artificial Intelligence";
    return "";
  }

  function examLabel(titleText, metaText) {
    const source = `${titleText} ${metaText}`.toLowerCase();
    if (source.includes("ese") || source.includes("engineering services")) return "ESE | Engineering Services Examination";
    if (source.includes("gate") || source.includes("graduate aptitude")) return "GATE | Graduate Aptitude Test in Engineering";
    return "BIJZLI EASY | Test Series";
  }

  function subtitleLabel(titleText, subjectText, total, marks, testDuration) {
    const base = titleText
      .replace(/\b(GATE|ESE)\s*20\d{2}\b/gi, "")
      .replace(/\b(CS|CE|EE|EC|ME|DA)\b$/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const bits = [];
    if (/full syllabus/i.test(base)) {
      const stripped = base.replace(/full syllabus/gi, "").trim();
      if (stripped) bits.push(stripped);
      bits.push("Full Syllabus");
    } else if (/part syllabus/i.test(base)) {
      const stripped = base.replace(/part syllabus/gi, "").trim();
      if (stripped) bits.push(stripped);
      bits.push("Part Syllabus");
    } else if (base) {
      bits.push(base);
    }
    if (subjectText && !bits.some((bit) => bit.toLowerCase() === subjectText.toLowerCase())) bits.push(subjectText);
    bits.push(`${total} Questions`);
    bits.push(`${fmtMarks(marks)} Marks`);
    if (testDuration) bits.push(fmtDuration(testDuration));
    return bits.filter(Boolean).join(" | ");
  }

  function shortSubject(value) {
    if (!value) return "Core Subject";
    if (value.includes("&")) return value.split("&")[0].trim();
    const words = value.split(/\s+/);
    return words.length > 2 ? words.slice(0, 2).join(" ") : value;
  }

  function buildSections(titleText, metaText, subjectText, allQnums) {
    const source = `${titleText} ${metaText}`.toLowerCase();
    const looksFull = allQnums.length >= 30 && (source.includes("gate") || source.includes("graduate aptitude")) && /(full syllabus|advance level|basic level|mock|demo)/i.test(source);
    if (looksFull && allQnums.length > 10) {
      return [
        { id: "ga", label: `General Aptitude (Q.${allQnums[0]}-${allQnums[9]})`, short: "General Aptitude", qnums: allQnums.slice(0, 10) },
        { id: "core", label: `${shortSubject(subjectText)} (Q.${allQnums[10]}-${allQnums[allQnums.length - 1]})`, short: shortSubject(subjectText), qnums: allQnums.slice(10) },
      ];
    }
    return [{ id: "all", label: `Question Set (Q.${allQnums[0]}-${allQnums[allQnums.length - 1]})`, short: subjectText || "Question Set", qnums: allQnums.slice() }];
  }

  function prepareCards(current) {
    current.cards.forEach((card) => {
      const qnum = getQnum(card);
      card.dataset.bijzliQnum = String(qnum);
      if (!card.id) card.id = `q${qnum}`;
      card.dataset.bijzliQtype = qtype(card.getAttribute("data-qtype"));
      if (qs(".qhead", card) && !qs(".bijzli-qmeta", card)) {
        const metaBox = document.createElement("div");
        metaBox.className = "bijzli-qmeta";
        metaBox.innerHTML = `<span class="bijzli-chip kind">${esc(qtype(card.getAttribute("data-qtype")))}</span><span class="bijzli-chip">${esc(markLine(card))}</span>`;
        qs(".qhead", card).appendChild(metaBox);
      }
      qsa("input", card).forEach((input) => {
        input.addEventListener("change", () => {
          if (current.submitted) return;
          syncStatus(current, card);
          render(current);
        });
        if (input.matches("[data-nat-input]")) {
          input.addEventListener("input", () => {
            if (current.submitted) return;
            syncStatus(current, card);
            render(current);
          });
          input.setAttribute("placeholder", input.getAttribute("placeholder") || "Enter answer");
          input.setAttribute("inputmode", "decimal");
        }
      });
    });
  }

  function buildUI(current) {
    const wrap = qs(".wrap") || BODY;
    const shell = qs(".shell", wrap) || wrap;
    const main = qs(".main", shell) || shell;
    let side = qs(".side", shell);
    if (!side) {
      side = document.createElement("aside");
      shell.appendChild(side);
    }
    shell.classList.add("gate-layout");
    main.classList.add("gate-question-area");
    side.classList.add("gate-sidebar");

    const header = document.createElement("header");
    header.className = "gate-header";
    header.id = "bijzliGateHeader";
    header.innerHTML = `
      <div class="gate-header-top">
        <div class="gate-logo-area">
          <a class="gate-brand-link" href="${esc(TELEGRAM_URL)}" target="_blank" rel="noopener" title="Open BIJZLI EASY on Telegram">
            <div class="gate-logo-badge">BE</div>
            <div class="gate-logo-text">
              <span class="gate-logo-title">BIJZLI EASY</span>
              <span class="gate-logo-sub">FREELY GIVEN</span>
            </div>
          </a>
        </div>
        <div class="gate-header-center">
          <div class="gate-exam-title">${esc(current.examTitle)}</div>
          <div class="gate-exam-subtitle">${esc(current.subtitle)}</div>
        </div>
        <div class="gate-header-right">
          <div class="gate-theme-switch" role="group" aria-label="Theme selector">
            <button class="gate-theme-btn" type="button" data-theme="bright" aria-pressed="false"><span class="gate-theme-dot bright"></span><span>Bright</span></button>
            <button class="gate-theme-btn" type="button" data-theme="dark" aria-pressed="false"><span class="gate-theme-dot dark"></span><span>Dark</span></button>
            <button class="gate-theme-btn" type="button" data-theme="green" aria-pressed="false"><span class="gate-theme-dot green"></span><span>Green</span></button>
          </div>
          <div class="gate-timer-box" id="gateTimerBox">
            <div class="gate-timer-label">Time Left</div>
            <span class="gate-timer-time" id="gateTimerTime">--:--</span>
          </div>
          <button class="gate-header-btn danger" type="button" id="gateSubmitBtn">Submit Test</button>
        </div>
      </div>
      <div class="gate-section-nav" id="gateSectionNav"></div>
    `;
    BODY.insertBefore(header, wrap);

    const info = document.createElement("section");
    info.className = "gate-q-info";
    info.innerHTML = `
      <div class="gate-info-chip"><span>Section</span><strong id="gateInfoSection">Question Set</strong></div>
      <div class="gate-info-chip"><span>Question</span><strong id="gateInfoQuestion">Q.1</strong></div>
      <div class="gate-info-chip"><span>Type</span><strong id="gateInfoType">MCQ</strong></div>
      <div class="gate-info-chip"><span>Status</span><strong id="gateInfoStatus">Not Answered</strong></div>
    `;
    const questions = byId("questions") || main;
    main.insertBefore(info, questions);

    const nav = document.createElement("nav");
    nav.className = "gate-nav-bar";
    nav.innerHTML = `
      <button class="gate-nav-btn secondary" type="button" id="gatePrevBtn">Previous</button>
      <button class="gate-nav-btn secondary" type="button" id="gateClearBtn">Clear Response</button>
      <button class="gate-nav-btn secondary" type="button" id="gateMarkBtn">Mark for Review</button>
      <button class="gate-nav-btn primary" type="button" id="gateNextBtn">Save &amp; Next</button>
    `;
    main.appendChild(nav);

    side.innerHTML = `
      <div class="gate-side-card">
        <div class="gate-side-title">Test Progress</div>
        <div class="gate-side-kpis">
          <div class="gate-side-kpi"><span>Answered</span><strong id="gateCountAnswered">0</strong></div>
          <div class="gate-side-kpi"><span>Review</span><strong id="gateCountMarked">0</strong></div>
          <div class="gate-side-kpi"><span>Pending</span><strong id="gateCountPending">0</strong></div>
          <div class="gate-side-kpi"><span>Total</span><strong id="gateCountTotal">${esc(String(current.qnums.length))}</strong></div>
        </div>
      </div>
      <div class="gate-side-card gate-side-palette">
        <div class="gate-side-title" id="gatePaletteTitle">${esc(current.sections[0]?.short || "Questions")}</div>
        <div class="gate-palette-scroll">
          <div class="gate-legend">
            <div class="gate-legend-row"><span class="gate-legend-dot not-visited"></span><span>Not Visited</span></div>
            <div class="gate-legend-row"><span class="gate-legend-dot not-answered"></span><span>Not Answered</span></div>
            <div class="gate-legend-row"><span class="gate-legend-dot answered"></span><span>Answered</span></div>
            <div class="gate-legend-row"><span class="gate-legend-dot marked"></span><span>Marked</span></div>
            <div class="gate-legend-row"><span class="gate-legend-dot answered-marked"></span><span>Answered + Marked</span></div>
          </div>
          <div class="gate-palette" id="gatePalette"></div>
        </div>
      </div>
    `;

    const toast = document.createElement("div");
    toast.className = "gate-toast";
    toast.id = "gateToast";
    BODY.appendChild(toast);

    const modal = document.createElement("div");
    modal.className = "sm-backdrop";
    modal.id = "smBackdrop";
    modal.innerHTML = `
      <div class="sm-modal" id="smModal">
        <div class="sm-head">
          <div class="sm-head-title">Test Submitted</div>
          <div class="sm-head-sub">${esc(current.subtitle)}</div>
        </div>
        <div class="sm-body">
          <div class="sm-hero">
            <div><span class="sm-hero-score" id="sm_marks">0</span><span class="sm-hero-out"> / ${esc(fmtMarks(current.totalMarks))}</span></div>
            <div class="sm-hero-pct" id="sm_pct">0%</div>
          </div>
          <div class="sm-stats">
            <div class="sm-kpi cor"><div class="sm-kpi-val" id="sm_cor">0</div><div class="sm-kpi-lbl">Correct</div></div>
            <div class="sm-kpi wrg"><div class="sm-kpi-val" id="sm_wrg">0</div><div class="sm-kpi-lbl">Wrong</div></div>
            <div class="sm-kpi skp"><div class="sm-kpi-val" id="sm_skp">0</div><div class="sm-kpi-lbl">Skipped</div></div>
          </div>
          <div class="sm-mbox">
            <div class="sm-mb"><div class="sm-mb-n" id="sm_gain">+0</div><div class="sm-mb-t">Marks Gained</div></div>
            <div class="sm-mb"><div class="sm-mb-n" id="sm_loss">-0</div><div class="sm-mb-t">Marks Deducted</div></div>
          </div>
          <table class="sm-tbl">
            <thead><tr><th>Section</th><th>Qs</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Score</th></tr></thead>
            <tbody id="sm_rows"></tbody>
          </table>
        </div>
        <div class="sm-foot">
          <button class="sm-fbtn rev" type="button" id="smReviewBtn">Review Answers</button>
          <button class="sm-fbtn cls" type="button" id="smDoneBtn">Done</button>
        </div>
      </div>
    `;
    BODY.appendChild(modal);

    const sectionNav = byId("gateSectionNav");
    current.sections.forEach((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gate-section-tab";
      button.dataset.sectionId = section.id;
      button.textContent = section.label;
      button.addEventListener("click", () => switchSection(current, section.id));
      sectionNav.appendChild(button);
    });

    const palette = byId("gatePalette");
    current.qnums.forEach((qnum) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gate-palette-btn";
      button.dataset.qnum = String(qnum);
      button.dataset.sectionId = current.sectionByQ.get(qnum) || "";
      button.textContent = String(qnum);
      button.addEventListener("click", () => goto(current, qnum));
      palette.appendChild(button);
    });

    qsa(".gate-theme-btn").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(current, button.dataset.theme || "bright");
        showToast(current, `Theme set to ${button.dataset.theme || "bright"}`);
      });
    });
    byId("gateSubmitBtn")?.addEventListener("click", () => submit(current));
    byId("gatePrevBtn")?.addEventListener("click", () => prev(current));
    byId("gateNextBtn")?.addEventListener("click", () => next(current));
    byId("gateClearBtn")?.addEventListener("click", () => clearAnswer(current));
    byId("gateMarkBtn")?.addEventListener("click", () => markReview(current));
    byId("smReviewBtn")?.addEventListener("click", closeModal);
    byId("smDoneBtn")?.addEventListener("click", closeModal);
    byId("smBackdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "smBackdrop") closeModal();
    });
  }

  function currentCard(current) {
    return current.byQ.get(current.current) || null;
  }

  function markLine(card) {
    return `+${fmtMarks(num(card.getAttribute("data-right")))} / -${fmtMarks(num(card.getAttribute("data-wrong")))}`;
  }

  function answered(card) {
    if (!card) return false;
    const type = qtype(card.getAttribute("data-qtype"));
    if (type === "NAT") return !!clean(qs("input[data-nat-input]", card)?.value || "");
    if (type === "MSQ") return !!qs('input[type="checkbox"]:checked', card);
    return !!qs('input[type="radio"]:checked', card);
  }

  function isMarked(status) {
    return status === "marked" || status === "answered-marked";
  }

  function statusText(status) {
    if (status === "not-answered") return "Not Answered";
    if (status === "answered") return "Answered";
    if (status === "marked") return "Marked for Review";
    if (status === "answered-marked") return "Answered + Marked";
    return "Not Visited";
  }

  function syncStatus(current, card) {
    if (!card || current.submitted) return;
    const qnum = getQnum(card);
    const prevStatus = current.statuses.get(qnum) || "not-visited";
    const mark = isMarked(prevStatus);
    current.statuses.set(qnum, answered(card) ? (mark ? "answered-marked" : "answered") : mark ? "marked" : "not-answered");
  }

  function goto(current, qnum) {
    if (!current.qnums.includes(qnum)) return;
    if (!current.submitted) syncStatus(current, currentCard(current));
    current.current = qnum;
    if (!current.submitted && (current.statuses.get(qnum) || "not-visited") === "not-visited") current.statuses.set(qnum, answered(current.byQ.get(qnum)) ? "answered" : "not-answered");
    render(current);
    const card = current.byQ.get(qnum);
    if (card) scrollToCard(card);
  }

  function switchSection(current, sectionId) {
    const section = current.sections.find((item) => item.id === sectionId);
    if (section?.qnums?.length) {
      const scrollBox = qs(".gate-palette-scroll");
      if (scrollBox) scrollBox.scrollTop = 0;
      goto(current, section.qnums[0]);
    }
  }

  function prev(current) {
    if (current.submitted) return;
    const index = current.qnums.indexOf(current.current);
    if (index > 0) goto(current, current.qnums[index - 1]);
  }

  function next(current) {
    if (current.submitted) return;
    syncStatus(current, currentCard(current));
    const index = current.qnums.indexOf(current.current);
    if (index >= current.qnums.length - 1) {
      render(current);
      showToast(current, "You are on the last question");
      return;
    }
    goto(current, current.qnums[index + 1]);
  }

  function clearAnswer(current) {
    if (current.submitted) return;
    const card = currentCard(current);
    if (!card) return;
    qsa('input[type="radio"],input[type="checkbox"]', card).forEach((input) => (input.checked = false));
    const nat = qs("input[data-nat-input]", card);
    if (nat) nat.value = "";
    current.statuses.set(current.current, isMarked(current.statuses.get(current.current) || "not-answered") ? "marked" : "not-answered");
    render(current);
    showToast(current, "Response cleared");
  }

  function markReview(current) {
    if (current.submitted) return;
    const card = currentCard(current);
    if (!card) return;
    current.statuses.set(current.current, answered(card) ? "answered-marked" : "marked");
    render(current);
    showToast(current, "Marked for review");
  }

  function render(current) {
    current.cards.forEach((card) => card.classList.toggle("is-active", current.submitted || getQnum(card) === current.current));
    const card = currentCard(current);
    const section = current.sections.find((item) => item.id === current.sectionByQ.get(current.current)) || current.sections[0];
    const visibleQnums = new Set(section?.qnums || current.qnums);
    setText("gateInfoSection", section?.short || "Question Set");
    setText("gateInfoQuestion", `Q.${current.current} of ${current.qnums.length}`);
    setText("gateInfoType", card ? `${qtype(card.getAttribute("data-qtype"))} | ${markLine(card)}` : "-");
    setText("gateInfoStatus", current.submitted ? "Submitted" : statusText(current.statuses.get(current.current) || "not-visited"));
    setText("gatePaletteTitle", section?.short || "Questions");
    const counts = { answered: 0, marked: 0, pending: 0 };
    current.qnums.forEach((qnum) => {
      const status = current.statuses.get(qnum) || "not-visited";
      if (status === "answered" || status === "answered-marked") counts.answered += 1;
      if (status === "marked" || status === "answered-marked") counts.marked += 1;
      if (status === "not-visited" || status === "not-answered") counts.pending += 1;
    });
    setText("gateCountAnswered", String(counts.answered));
    setText("gateCountMarked", String(counts.marked));
    setText("gateCountPending", String(counts.pending));
    qsa(".gate-section-tab").forEach((button) => button.classList.toggle("active", button.dataset.sectionId === (section?.id || "")));
    qsa(".gate-palette-btn").forEach((button) => {
      const qnum = parseInt(button.dataset.qnum || "", 10);
      button.hidden = !visibleQnums.has(qnum);
      button.className = "gate-palette-btn";
      button.classList.toggle("is-current", qnum === current.current);
      if (current.submitted) {
        const result = current.results.get(qnum);
        if (result) button.classList.add(result.cls);
      } else {
        button.classList.add(current.statuses.get(qnum) || "not-visited");
      }
    });
    const currentPaletteButton = qs(`.gate-palette-btn[data-qnum="${current.current}"]`);
    if (currentPaletteButton && !currentPaletteButton.hidden) {
      currentPaletteButton.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    renderTimer(current);
  }

  function renderTimer(current) {
    const box = byId("gateTimerBox");
    const time = byId("gateTimerTime");
    if (!box || !time) return;
    if (!current.duration) {
      box.style.display = "none";
      return;
    }
    time.textContent = fmtClock(current.remain);
    box.classList.toggle("warn", current.remain <= 300 && current.remain > 60);
    box.classList.toggle("bad", current.remain <= 60);
  }

  function startTimer(current) {
    if (!current.duration) return renderTimer(current);
    if (current.timer) clearInterval(current.timer);
    current.timer = window.setInterval(() => {
      if (current.submitted) {
        clearInterval(current.timer);
        current.timer = null;
        return;
      }
      current.remain = Math.max(0, current.remain - 1);
      renderTimer(current);
      if (current.remain <= 0) submit(current);
    }, 1000);
    renderTimer(current);
  }

  function stopTimer(current) {
    if (current.timer) {
      clearInterval(current.timer);
      current.timer = null;
    }
  }

  function submit(current) {
    if (current.submitted) return openModal();
    syncStatus(current, currentCard(current));
    current.submitted = true;
    ROOT.setAttribute("data-bijzli-submitted", "true");
    BODY.classList.add("test-submitted");
    stopTimer(current);
    const sum = { correct: 0, wrong: 0, skipped: 0, marks: 0, gain: 0, loss: 0 };
    current.results.clear();
    current.cards.forEach((card) => {
      const result = grade(card);
      current.results.set(getQnum(card), result);
      sum.correct += result.correct;
      sum.wrong += result.wrong;
      sum.skipped += result.skipped;
      sum.marks += result.marks;
      sum.gain += result.gain;
      sum.loss += result.loss;
      qsa("input", card).forEach((input) => (input.disabled = true));
      qsa("details.solution", card).forEach((detail) => (detail.open = true));
    });
    fillModal(current, sum);
    byId("gateSubmitBtn").disabled = true;
    byId("gateSubmitBtn").textContent = "Submitted";
    render(current);
    openModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function grade(card) {
    const type = qtype(card.getAttribute("data-qtype"));
    const right = num(card.getAttribute("data-right"));
    const wrong = num(card.getAttribute("data-wrong"));
    const keys = String(card.getAttribute("data-correct") || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
    const badge = qs("[data-badge]", card);
    const choice = qs("[data-choice]", card);
    const ans = qs("[data-answerline]", card);
    const nat = qs("input[data-nat-input]", card);
    qsa("label.opt", card).forEach((label) => label.classList.remove("correct", "wrong", "skipped"));
    if (nat) nat.classList.remove("correct", "wrong", "skipped");
    if (ans) ans.style.display = "block";
    if (type === "NAT") {
      const raw = clean(nat?.value || "");
      const low = parseFloat(card.getAttribute("data-nat-low") || "");
      const high = parseFloat(card.getAttribute("data-nat-high") || "");
      const hasKey = Number.isFinite(low) && Number.isFinite(high);
      if (!raw) {
        paint(badge, "warn", "Skipped");
        paint(choice, "warn", "Not attempted");
        if (nat && hasKey) nat.classList.add("skipped");
        return { correct: 0, wrong: 0, skipped: 1, marks: 0, gain: 0, loss: 0, cls: "result-skipped" };
      }
      paint(choice, "", `Entered: ${raw}`);
      if (!hasKey) return paintReturn(badge, "unk", "Key not available", { correct: 0, wrong: 0, skipped: 0, marks: 0, gain: 0, loss: 0, cls: "result-unknown" });
      const value = parseFloat(raw.replace(/,/g, ""));
      if (!Number.isFinite(value)) {
        if (nat) nat.classList.add("wrong");
        return paintReturn(badge, "bad", "Invalid number", { correct: 0, wrong: 1, skipped: 0, marks: -wrong, gain: 0, loss: wrong, cls: "result-wrong" });
      }
      const ok = value + 1e-9 >= low && value - 1e-9 <= high;
      if (nat) nat.classList.add(ok ? "correct" : "wrong");
      return paintReturn(badge, ok ? "good" : "bad", ok ? "Correct" : "Wrong", { correct: ok ? 1 : 0, wrong: ok ? 0 : 1, skipped: 0, marks: ok ? right : -wrong, gain: ok ? right : 0, loss: ok ? 0 : wrong, cls: ok ? "result-correct" : "result-wrong" });
    }
    if (type === "MSQ") {
      const picked = qsa('input[type="checkbox"]:checked', card).map((input) => String(input.value || "").toUpperCase());
      const unique = Array.from(new Set(picked));
      if (!unique.length) {
        paint(badge, "warn", "Skipped");
        paint(choice, "warn", "Not attempted");
        keys.forEach((key) => qs(`label.opt[data-opt="${key}"]`, card)?.classList.add("skipped"));
        return { correct: 0, wrong: 0, skipped: 1, marks: 0, gain: 0, loss: 0, cls: "result-skipped" };
      }
      paint(choice, "", `Selected: ${unique.join(", ")}`);
      if (!keys.length) return paintReturn(badge, "unk", "Key not available", { correct: 0, wrong: 0, skipped: 0, marks: 0, gain: 0, loss: 0, cls: "result-unknown" });
      const exact = unique.length === keys.length && keys.every((key) => unique.includes(key));
      keys.forEach((key) => qs(`label.opt[data-opt="${key}"]`, card)?.classList.add(unique.includes(key) ? "correct" : "skipped"));
      unique.forEach((key) => {
        if (!keys.includes(key)) qs(`label.opt[data-opt="${key}"]`, card)?.classList.add("wrong");
      });
      return paintReturn(badge, exact ? "good" : "bad", exact ? "Correct" : "Wrong", { correct: exact ? 1 : 0, wrong: exact ? 0 : 1, skipped: 0, marks: exact ? right : -wrong, gain: exact ? right : 0, loss: exact ? 0 : wrong, cls: exact ? "result-correct" : "result-wrong" });
    }
    const picked = qs('input[type="radio"]:checked', card)?.value?.toUpperCase() || "";
    const key = keys[0] || "";
    if (!picked) {
      paint(badge, "warn", "Skipped");
      paint(choice, "warn", "Not attempted");
      if (key) qs(`label.opt[data-opt="${key}"]`, card)?.classList.add("skipped");
      return { correct: 0, wrong: 0, skipped: 1, marks: 0, gain: 0, loss: 0, cls: "result-skipped" };
    }
    paint(choice, "", `Selected: ${picked}`);
    if (!key) return paintReturn(badge, "unk", "Key not available", { correct: 0, wrong: 0, skipped: 0, marks: 0, gain: 0, loss: 0, cls: "result-unknown" });
    qs(`label.opt[data-opt="${key}"]`, card)?.classList.add("correct");
    const ok = picked === key;
    if (!ok) qs(`label.opt[data-opt="${picked}"]`, card)?.classList.add("wrong");
    return paintReturn(badge, ok ? "good" : "bad", ok ? "Correct" : "Wrong", { correct: ok ? 1 : 0, wrong: ok ? 0 : 1, skipped: 0, marks: ok ? right : -wrong, gain: ok ? right : 0, loss: ok ? 0 : wrong, cls: ok ? "result-correct" : "result-wrong" });
  }

  function paint(el, kind, text) {
    if (!el) return;
    el.className = kind ? `badge ${kind}` : "badge";
    el.textContent = text;
    el.style.display = "inline-flex";
  }

  function paintReturn(el, kind, text, payload) {
    paint(el, kind, text);
    return payload;
  }

  function fillModal(current, sum) {
    const pct = current.totalMarks ? Math.max(0, round2((sum.marks / current.totalMarks) * 100)) : 0;
    setText("sm_marks", fmtMarks(sum.marks));
    setText("sm_pct", `${fmtMarks(pct)}%`);
    setText("sm_cor", String(sum.correct));
    setText("sm_wrg", String(sum.wrong));
    setText("sm_skp", String(sum.skipped));
    setText("sm_gain", `+${fmtMarks(sum.gain)}`);
    setText("sm_loss", `-${fmtMarks(sum.loss)}`);
    const tbody = byId("sm_rows");
    if (!tbody) return;
    tbody.innerHTML = current.sections.map((section) => {
      const totals = { correct: 0, wrong: 0, skipped: 0, marks: 0 };
      section.qnums.forEach((qnum) => {
        const result = current.results.get(qnum);
        if (!result) return;
        totals.correct += result.correct;
        totals.wrong += result.wrong;
        totals.skipped += result.skipped;
        totals.marks += result.marks;
      });
      return `<tr><td>${esc(section.short)}</td><td>${esc(String(section.qnums.length))}</td><td>${esc(String(totals.correct))}</td><td>${esc(String(totals.wrong))}</td><td>${esc(String(totals.skipped))}</td><td>${esc(fmtMarks(totals.marks))}</td></tr>`;
    }).join("");
  }

  function resetAll(current) {
    stopTimer(current);
    current.submitted = false;
    current.remain = current.duration;
    current.results.clear();
    ROOT.removeAttribute("data-bijzli-submitted");
    BODY.classList.remove("test-submitted");
    qsa("details.solution").forEach((detail) => (detail.open = false));
    current.qnums.forEach((qnum) => current.statuses.set(qnum, "not-visited"));
    current.current = current.qnums[0];
    current.statuses.set(current.current, "not-answered");
    current.cards.forEach((card) => {
      qsa('input[type="radio"],input[type="checkbox"]', card).forEach((input) => {
        input.checked = false;
        input.disabled = false;
      });
      qsa("input[data-nat-input]", card).forEach((input) => {
        input.value = "";
        input.disabled = false;
        input.classList.remove("correct", "wrong", "skipped");
      });
      qsa("label.opt", card).forEach((label) => label.classList.remove("correct", "wrong", "skipped"));
      const badge = qs("[data-badge]", card);
      const choice = qs("[data-choice]", card);
      const ans = qs("[data-answerline]", card);
      if (badge) {
        badge.className = "badge warn";
        badge.textContent = "Not checked";
        badge.style.display = "none";
      }
      if (choice) {
        choice.className = "badge";
        choice.textContent = "Not attempted";
      }
      if (ans) ans.style.display = "";
    });
    if (byId("gateSubmitBtn")) {
      byId("gateSubmitBtn").disabled = false;
      byId("gateSubmitBtn").textContent = "Submit Test";
    }
    closeModal();
    render(current);
    startTimer(current);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(current, "Test reset");
  }

  function showToast(current, text) {
    const toast = byId("gateToast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    if (current.toastTimer) clearTimeout(current.toastTimer);
    current.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function openModal() {
    byId("smBackdrop")?.classList.add("show");
  }

  function closeModal() {
    byId("smBackdrop")?.classList.remove("show");
  }

  function scrollToCard(card) {
    const offset = parseInt(getComputedStyle(ROOT).getPropertyValue("--bijzli-header"), 10) || 120;
    const top = card.getBoundingClientRect().top + window.scrollY - offset - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function syncSticky() {
    ROOT.style.setProperty("--bijzli-header", `${Math.ceil(byId("bijzliGateHeader")?.getBoundingClientRect().height || 120)}px`);
  }
})();
