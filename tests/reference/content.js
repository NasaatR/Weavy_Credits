(() => {
  "use strict";

  const CHANNEL = "weavy-project-credit-analyzer-v9";
  const CATALOG = globalThis.WEAVE_CREDIT_CATALOG || { version: "unknown", entries: [] };
  const CORE = globalThis.WeavyProjectCreditAnalyzerCore;
  const STORAGE_PREFIX = "weavy-project-credit-analyzer:v8:";
  const UI_POSITION_KEY = `${STORAGE_PREFIX}ui-position`;
  const SAVE_DELAY = 700;
  const CREDITS_PER_USD = 120;

  if (!CORE) {
    console.warn("[Weavy Credit Analyzer] Core was not loaded.");
    return;
  }

  let descriptor = getProjectDescriptor();
  let analyzer = CORE.createAnalyzer(CATALOG, { projectId: descriptor.id });
  let ui = null;
  let saveTimer = null;
  let renderTimer = null;
  let routeTimer = null;
  let scanTimeout = null;
  let hookWatchdog = null;
  let hookReady = false;
  let scanning = false;
  let currentScanId = null;
  let lastScan = null;
  let progress = { percent: 0, title: "Готов к анализу", detail: "" };
  let payloadQueue = [];
  let processingQueue = false;
  let uiPosition = null;
  let dragState = null;
  let collapsedDragState = null;
  let suppressPillClickUntil = 0;
  let lastVisiblePriceSignature = "";
  let lastVisiblePriceCapturedAt = 0;
  let lastVisiblePriceCheckedAt = 0;

  function getProjectDescriptor() {
    const path = location.pathname || "/";
    const route = path.match(/\/(flow|project|workflow|canvas)\/([^/?#]+)/i);
    const folder = path.match(/\/folders\/([^/?#]+)/i);
    const id = route?.[2] || null;
    return {
      id,
      routeKind: route?.[1] || (folder ? "folders" : "other"),
      routeId: route?.[2] || folder?.[1] || null,
      path,
      key: `${location.origin}:${id ? `project:${id}` : `path:${path}`}`,
      url: location.href
    };
  }

  function applyProjectId(projectId) {
    const id = String(projectId || "").trim();
    if (!id || id === descriptor.id) return false;
    descriptor = {
      ...descriptor,
      id,
      key: `${location.origin}:project:${id}`
    };
    analyzer.setProjectId(id);
    scheduleRender();
    return true;
  }

  function inferProjectIdFromPayload(payload) {
    const url = String(payload?.url || "");
    const recipeMatch = url.match(/\/api\/v1\/recipes\/([^/?#]+)/i);
    if (recipeMatch?.[1] && !/^(?:public|templates?)$/i.test(recipeMatch[1])) return decodeURIComponent(recipeMatch[1]);
    const batchMatch = url.match(/\/batches\/recipes\/([^/?#]+)/i);
    if (batchMatch?.[1]) return decodeURIComponent(batchMatch[1]);
    const data = payload?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      for (const key of ["recipeId", "projectId", "flowId"]) {
        if (typeof data[key] === "string" && data[key]) return data[key];
      }
    }
    return null;
  }

  function storageKey() {
    return `${STORAGE_PREFIX}${encodeURIComponent(descriptor.key)}`;
  }

  function runtimeAlive() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function extensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "0.20.0";
    }
  }

  function safeStorageGet(key) {
    return new Promise((resolve) => {
      try {
        if (!runtimeAlive()) return resolve({});
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) resolve({});
          else resolve(result || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function safeStorageSet(value) {
    return new Promise((resolve) => {
      try {
        if (!runtimeAlive()) return resolve(false);
        chrome.storage.local.set(value, () => resolve(!chrome.runtime.lastError));
      } catch {
        resolve(false);
      }
    });
  }

  function safeStorageRemove(key) {
    return new Promise((resolve) => {
      try {
        if (!runtimeAlive()) return resolve(false);
        chrome.storage.local.remove(key, () => resolve(!chrome.runtime.lastError));
      } catch {
        resolve(false);
      }
    });
  }


  function clampUiPosition(left, top) {
    if (!ui?.root) return { left, top };
    const rect = ui.root.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - Math.min(rect.width || 160, window.innerWidth - margin * 2) - margin);
    const maxTop = Math.max(margin, window.innerHeight - Math.min(rect.height || 44, window.innerHeight - margin * 2) - margin);
    return {
      left: Math.min(maxLeft, Math.max(margin, Number(left) || margin)),
      top: Math.min(maxTop, Math.max(margin, Number(top) || margin))
    };
  }

  function applyUiPosition(position, persist = false) {
    if (!ui?.root || !position || !Number.isFinite(Number(position.left)) || !Number.isFinite(Number(position.top))) return;
    const clamped = clampUiPosition(position.left, position.top);
    uiPosition = clamped;
    ui.root.style.left = `${Math.round(clamped.left)}px`;
    ui.root.style.top = `${Math.round(clamped.top)}px`;
    ui.root.style.right = "auto";
    ui.root.style.bottom = "auto";
    if (persist) safeStorageSet({ [UI_POSITION_KEY]: clamped });
  }

  async function loadUiPosition() {
    const result = await safeStorageGet(UI_POSITION_KEY);
    const saved = result[UI_POSITION_KEY];
    if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
      uiPosition = { left: Number(saved.left), top: Number(saved.top) };
      applyUiPosition(uiPosition, false);
    }
  }

  async function resetUiPosition() {
    uiPosition = null;
    if (ui?.root) {
      ui.root.style.removeProperty("left");
      ui.root.style.removeProperty("top");
      ui.root.style.removeProperty("right");
      ui.root.style.removeProperty("bottom");
    }
    await safeStorageRemove(UI_POSITION_KEY);
  }

  function setupPanelDragging(handle) {
    if (!handle || !ui?.root) return;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      const rect = ui.root.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      handle.classList.add("dragging");
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });
    handle.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      applyUiPosition({ left: event.clientX - dragState.offsetX, top: event.clientY - dragState.offsetY }, false);
      event.preventDefault();
    });
    const finish = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      handle.classList.remove("dragging");
      dragState = null;
      if (uiPosition) safeStorageSet({ [UI_POSITION_KEY]: uiPosition });
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  function setupCollapsedDragging(handle) {
    if (!handle || !ui?.root) return;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = ui.root.getBoundingClientRect();
      collapsedDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false
      };
      try { handle.setPointerCapture(event.pointerId); } catch {}
    });
    handle.addEventListener("pointermove", (event) => {
      if (!collapsedDragState || collapsedDragState.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - collapsedDragState.startX, event.clientY - collapsedDragState.startY);
      if (!collapsedDragState.moved && distance < 5) return;
      collapsedDragState.moved = true;
      handle.classList.add("dragging");
      applyUiPosition({ left: event.clientX - collapsedDragState.offsetX, top: event.clientY - collapsedDragState.offsetY }, false);
      event.preventDefault();
    });
    const finish = (event) => {
      if (!collapsedDragState || collapsedDragState.pointerId !== event.pointerId) return;
      const moved = collapsedDragState.moved;
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      handle.classList.remove("dragging");
      collapsedDragState = null;
      if (moved) {
        suppressPillClickUntil = Date.now() + 350;
        if (uiPosition) safeStorageSet({ [UI_POSITION_KEY]: uiPosition });
        event.preventDefault();
      }
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  async function loadSavedState() {
    analyzer = CORE.createAnalyzer(CATALOG, { projectId: descriptor.id });
    lastScan = null;
    const key = storageKey();
    const result = await safeStorageGet(key);
    const saved = result[key];
    if (saved?.state?.schemaVersion === 9) {
      analyzer.importState(saved.state);
      if (saved?.lastScan) lastScan = saved.lastScan;
    } else if (saved) {
      // 0.18.0 could persist a project-wide poisoned model-ID map. Do not let
      // that state survive the resolver fix.
      await safeStorageRemove(key);
    }
    scheduleRender();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, SAVE_DELAY);
  }

  async function saveState() {
    clearTimeout(saveTimer);
    await safeStorageSet({
      [storageKey()]: {
        extensionVersion: extensionVersion(),
        projectId: descriptor.id,
        updatedAt: new Date().toISOString(),
        catalogVersion: CATALOG.version,
        state: analyzer.exportState(),
        lastScan
      }
    });
  }

  function postCommand(command, extra = {}) {
    window.postMessage({ channel: CHANNEL, type: "command", command, ...extra }, "*");
  }

  function parseVisibleNumber(value) {
    const text = String(value || "").trim().replace(/\s+/g, "");
    if (!text) return null;
    let normalized = text;
    if (/^\d{1,3}(?:,\d{3})+$/.test(text)) normalized = text.replace(/,/g, "");
    else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, "");
    else if (text.includes(",") && text.includes(".")) normalized = text.replace(/,/g, "");
    else normalized = text.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function captureVisibleWeavyPrice() {
    if (Date.now() - lastVisiblePriceCheckedAt < 1_800) return;
    lastVisiblePriceCheckedAt = Date.now();
    const bodyText = String(document.body?.textContent || "").slice(0, 500_000);
    if (!bodyText || !/(?:Total cost|Общая стоимость)/i.test(bodyText)) return;
    const priceMatch = bodyText.match(/(?:Total cost|Общая стоимость)[\s\S]{0,80}?([0-9][0-9\s.,]*)\s*(?:credits?|cr|кредит(?:а|ов)?)/i);
    const totalCredits = parseVisibleNumber(priceMatch?.[1]);
    if (totalCredits == null) return;

    const selected = [...document.querySelectorAll(
      ".react-flow__node.selected, [data-id][aria-selected='true'], [data-nodeid][aria-selected='true'], [data-id][class~='selected']"
    )].filter((element, index, all) => all.indexOf(element) === index);
    if (selected.length !== 1) return;
    const node = selected[0];
    const nodeId = node.getAttribute("data-id") || node.getAttribute("data-nodeid") || node.id || "";
    const lines = String(node.innerText || node.textContent || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const modelName = lines.find((line) =>
      line.length >= 3
      && line.length <= 140
      && !/^(?:run model|run selected|add |prompt|image|video|audio|mask|reference|output|input|\d{1,2}:\d{2})/i.test(line)
    ) || "";
    if (!nodeId && !modelName) return;

    const runsMatch = bodyText.match(/\bRuns\s*(?:[−–-]\s*)?(\d{1,4})(?=\s*\+)?/i);
    const resolutionMatch = bodyText.match(/(?:Resolution|Разрешение)\s*([1-8](?:\.\d+)?\s*[Kk]|(?:360|480|540|580|720|1080|1440|2160|3840)\s*[Pp]?|\d{3,5}\s*[x×]\s*\d{3,5})/i);
    const observation = {
      nodeId,
      modelName,
      totalCredits,
      runs: Number(runsMatch?.[1] || 1),
      params: resolutionMatch ? { "visible.resolution": resolutionMatch[1] } : {}
    };
    const signature = JSON.stringify(observation);
    if (signature === lastVisiblePriceSignature && Date.now() - lastVisiblePriceCapturedAt < 5_000) return;
    if (!analyzer.observeDisplayedPrice(observation)) return;
    lastVisiblePriceSignature = signature;
    lastVisiblePriceCapturedAt = Date.now();
    scheduleSave();
    scheduleRender();
  }

  function projectIdFromPageUrl(value) {
    try {
      const url = new URL(value, location.href);
      return url.pathname.match(/\/(?:flow|project|workflow|canvas)\/([^/?#]+)/i)?.[1] || null;
    } catch {
      return null;
    }
  }

  function payloadRelevant(payload) {
    if (!descriptor.id) return true;
    const pageProject = projectIdFromPageUrl(payload?.pageUrl || "");
    if (pageProject && pageProject !== descriptor.id) return false;
    const url = String(payload?.url || "");
    if (/node-definitions\/public|models|catalog|pricing|subflow-templates/i.test(url)) return true;
    const recipeMatch = url.match(/\/api\/v1\/recipes\/([^/?#]+)/i);
    if (recipeMatch?.[1] && decodeURIComponent(recipeMatch[1]) !== descriptor.id) return false;
    const batchMatch = url.match(/\/batches\/recipes\/([^/?#]+)/i);
    if (batchMatch?.[1] && decodeURIComponent(batchMatch[1]) !== descriptor.id) return false;
    return true;
  }

  function enqueuePayload(payload) {
    const inferred = inferProjectIdFromPayload(payload);
    if (!descriptor.id && inferred) applyProjectId(inferred);
    if (!payloadRelevant(payload)) return;
    payloadQueue.push(payload);
    if (processingQueue) return;
    processingQueue = true;

    const next = () => {
      const item = payloadQueue.shift();
      if (!item) {
        processingQueue = false;
        return;
      }
      try {
        const result = analyzer.processPayload(item);
        if (result.changed) scheduleSave();
        if (scanning) updateDynamicProgress();
        scheduleRender();
      } catch (error) {
        console.warn("[Weavy Credit Analyzer] Failed to process payload", error);
      }
      setTimeout(next, 0);
    };
    setTimeout(next, 0);
  }

  function formatNumber(value, digits = 2) {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(Number(value));
  }

  function formatCredits(min, max, unknown = 0) {
    if (min == null || max == null) return unknown ? "?" : "—";
    const base = Number(min) === Number(max)
      ? `${formatNumber(min)} cr`
      : `${formatNumber(min)}–${formatNumber(max)} cr`;
    return unknown ? `${base} + ?` : base;
  }

  function formatUsd(min, max, unknown = 0) {
    if (min == null || max == null) return unknown ? "$?" : "—";
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const minUsd = Number(min) / CREDITS_PER_USD;
    const maxUsd = Number(max) / CREDITS_PER_USD;
    const base = Math.abs(minUsd - maxUsd) < 0.000001
      ? formatter.format(minUsd)
      : `${formatter.format(minUsd)}–${formatter.format(maxUsd)}`;
    return unknown ? `${base} + ?` : base;
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return String(value);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getScanMeta(summary = analyzer.getSummary()) {
    return summary.scanMeta || lastScan?.hookStats || null;
  }

  function ensureUi() {
    if (ui || !document.documentElement) return;
    document.getElementById("weavy-project-credit-analyzer-v9")?.remove();
    const host = document.createElement("div");
    host.id = "weavy-project-credit-analyzer-v9";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        .root {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 2147483647;
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #171717;
          font-size: 13px;
          line-height: 1.35;
        }
        button { font-family: inherit; }
        .pill {
          height: 44px;
          min-width: 132px;
          padding: 0 16px;
          border: 1px solid rgba(0,0,0,.13);
          border-radius: 14px;
          background: #fff;
          color: #171717;
          box-shadow: 0 14px 38px rgba(0,0,0,.22);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          cursor: grab;
          touch-action: none;
          user-select: none;
          font-size: 13px;
          font-weight: 800;
        }
        .pill:hover { transform: translateY(-1px); }
        .pill.dragging { cursor: grabbing; transform: none; }
        .pill-grip { color: #999; font-size: 15px; line-height: 1; }
        .pill.hidden { display: none; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #111; }
        .dot.busy { animation: pulse 1.1s infinite; }
        @keyframes pulse { 50% { opacity: .3; transform: scale(.75); } }
        .panel {
          width: min(620px, calc(100vw - 24px));
          max-height: min(830px, calc(100vh - 24px));
          overflow: hidden;
          border: 1px solid rgba(0,0,0,.12);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,.28);
          display: none;
        }
        .panel.open { display: block; }
        .scroll { max-height: inherit; overflow-y: auto; overscroll-behavior: contain; }
        .head {
          position: sticky;
          top: 0;
          z-index: 3;
          padding: 17px 18px 14px;
          border-bottom: 1px solid #ececec;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(14px);
          display: flex;
          justify-content: space-between;
          gap: 14px;
          cursor: grab;
          touch-action: none;
          user-select: none;
        }
        .head.dragging { cursor: grabbing; }
        .head-main { min-width: 0; display: flex; align-items: flex-start; gap: 10px; }
        .drag-grip { color: #999; font-size: 20px; line-height: 1; padding-top: 1px; cursor: grab; }
        .head-actions { display: flex; align-items: center; gap: 7px; }
        .icon-btn { width: 34px; height: 34px; border: 0; border-radius: 11px; background: #f2f2f2; cursor: pointer; font-size: 16px; }
        .title { font-size: 18px; font-weight: 850; letter-spacing: -.02em; }
        .subtitle { margin-top: 3px; color: #777; font-size: 11px; max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .close { font-size: 19px; }
        .body { padding: 17px 18px 18px; }
        .summary-label { color: #787878; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .09em; }
        .total { margin-top: 4px; font-size: 34px; line-height: 1.05; font-weight: 900; letter-spacing: -.045em; }
        .total-usd { margin-top: 5px; color: #444; font-size: 17px; line-height: 1.15; font-weight: 800; letter-spacing: -.015em; }
        .total-note { margin-top: 8px; color: #666; font-size: 12px; }
        .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-top: 15px; }
        .card { min-width: 0; padding: 11px; border-radius: 13px; background: #f5f6f8; }
        .card-label { color: #777; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
        .card-value { margin-top: 4px; font-size: 15px; font-weight: 850; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .progress-box { margin-top: 14px; padding: 12px; border: 1px solid #e7e7e7; border-radius: 13px; background: #fbfbfb; }
        .progress-head { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; font-weight: 750; }
        .progress-detail { margin-top: 4px; color: #777; font-size: 10px; min-height: 14px; }
        .bar { height: 7px; margin-top: 9px; border-radius: 999px; background: #e9e9e9; overflow: hidden; }
        .bar > div { height: 100%; width: 0; background: #171717; border-radius: inherit; transition: width .22s ease; }
        .section { margin-top: 19px; }
        .section-title { margin-bottom: 9px; font-size: 13px; font-weight: 850; }
        .table-wrap { overflow: hidden; border: 1px solid #e9e9e9; border-radius: 13px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
        th { padding: 9px 10px; background: #fafafa; color: #777; text-align: left; font-weight: 750; border-bottom: 1px solid #e9e9e9; }
        td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        tr:last-child td { border-bottom: 0; }
        .model { width: 44%; font-weight: 750; word-break: break-word; }
        .model-meta { margin-top: 3px; color: #888; font-size: 9px; font-weight: 500; line-height: 1.25; }
        .num { text-align: right; white-space: nowrap; }
        .warn { color: #a85f00; font-weight: 750; }
        .empty { padding: 16px; color: #707070; font-size: 12px; }
        .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 15px; }
        .btn { min-height: 39px; padding: 9px 11px; border: 1px solid #dddddd; border-radius: 11px; background: #fff; color: #171717; cursor: pointer; font-size: 12px; font-weight: 750; }
        .btn:hover { background: #f7f7f7; }
        .btn.primary { grid-column: 1 / -1; background: #171717; color: #fff; border-color: #171717; font-size: 13px; }
        .btn:disabled { cursor: wait; opacity: .55; }
        .btn.danger { color: #b42318; }
        .foot { margin-top: 13px; color: #999; font-size: 10px; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #efefef; color: #555; font-weight: 750; }
        .warning { margin-top: 12px; padding: 10px 11px; border-radius: 11px; background: #fff6e8; color: #7a4a00; font-size: 11px; display: none; }
        .details { margin-top: 14px; border: 1px solid #e9e9e9; border-radius: 13px; overflow: hidden; }
        .details > summary { padding: 11px 12px; cursor: pointer; font-size: 12px; font-weight: 800; background: #fafafa; }
        .details-wrap { max-height: 280px; overflow-y: auto; }
        .detail-item { padding: 10px 12px; border-top: 1px solid #eeeeee; }
        .detail-head { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; font-weight: 800; }
        .detail-cost { white-space: nowrap; }
        .detail-meta { margin-top: 3px; color: #777; font-size: 9px; line-height: 1.35; overflow-wrap: anywhere; }
        @media (max-width: 680px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) { .cards { grid-template-columns: 1fr; } .panel { width: calc(100vw - 16px); } }
      </style>
      <div class="root">
        <button class="pill" type="button" title="Нажмите, чтобы открыть; перетащите, чтобы переместить"><span class="pill-grip" aria-hidden="true">⠿</span><span class="dot"></span><span class="pill-text">Кредиты</span></button>
        <section class="panel" aria-label="Weavy Project Credit Analyzer">
          <div class="scroll">
            <header class="head" title="Зажмите и перетащите панель">
              <div class="head-main"><span class="drag-grip" aria-hidden="true">⠿</span><div><div class="title">Кредиты проекта</div><div class="subtitle"></div></div></div>
              <div class="head-actions">
                <button class="icon-btn reset-position" type="button" aria-label="Вернуть панель в правый нижний угол" title="Сбросить положение">↺</button>
                <button class="icon-btn close" type="button" aria-label="Закрыть">×</button>
              </div>
            </header>
            <div class="body">
              <div class="summary-label">Расход по сохранённой истории</div>
              <div class="total">—</div>
              <div class="total-usd"></div>
              <div class="total-note"></div>
              <div class="cards">
                <div class="card"><div class="card-label">Генерации</div><div class="card-value generations">0</div></div>
                <div class="card"><div class="card-label">Batches проверены</div><div class="card-value batches">0 / 0</div></div>
                <div class="card"><div class="card-label">По параметрам</div><div class="card-value parameter-matched">0</div></div>
                <div class="card"><div class="card-label">Без цены</div><div class="card-value unresolved">0</div></div>
              </div>
              <div class="progress-box">
                <div class="progress-head"><span class="progress-title">Готов к анализу</span><span class="progress-percent">0%</span></div>
                <div class="progress-detail"></div>
                <div class="bar"><div></div></div>
              </div>
              <div class="warning"></div>
              <div class="section"><div class="section-title">Модели в проекте</div><div class="table-wrap"></div></div>
              <details class="details"><summary>Проверить настройки отдельных запусков</summary><div class="details-wrap"></div></details>
              <div class="actions">
                <button class="btn primary analyze" type="button">Полный анализ проекта</button>
                <button class="btn csv" type="button">Экспорт CSV</button>
                <button class="btn diagnostic" type="button">Диагностика JSON</button>
                <button class="btn danger reset" type="button">Сбросить отчёт</button>
              </div>
              <div class="foot">Analyzer v<span class="version"></span> · каталог <span class="badge catalog"></span>. Открытая панель и свёрнутая кнопка перетаскиваются. USD рассчитан по курсу 120 cr = $1.</div>
            </div>
          </div>
        </section>
      </div>`;

    document.documentElement.appendChild(host);
    const root = shadow.querySelector(".root");
    const pill = shadow.querySelector(".pill");
    const panel = shadow.querySelector(".panel");
    const head = shadow.querySelector(".head");
    pill.addEventListener("click", (event) => {
      if (Date.now() < suppressPillClickUntil) { event.preventDefault(); return; }
      pill.classList.add("hidden");
      panel.classList.add("open");
      requestAnimationFrame(() => { if (uiPosition) applyUiPosition(uiPosition, false); });
    });
    shadow.querySelector(".close").addEventListener("click", () => { panel.classList.remove("open"); pill.classList.remove("hidden"); });
    shadow.querySelector(".reset-position").addEventListener("click", resetUiPosition);
    shadow.querySelector(".analyze").addEventListener("click", startAnalysis);
    shadow.querySelector(".csv").addEventListener("click", exportCsv);
    shadow.querySelector(".diagnostic").addEventListener("click", exportDiagnostics);
    shadow.querySelector(".reset").addEventListener("click", resetReport);
    shadow.querySelector(".version").textContent = extensionVersion();
    shadow.querySelector(".catalog").textContent = CATALOG.version || "unknown";

    ui = {
      host, shadow, root, panel, head, pill,
      pillText: shadow.querySelector(".pill-text"), dot: shadow.querySelector(".dot"),
      subtitle: shadow.querySelector(".subtitle"), total: shadow.querySelector(".total"), totalUsd: shadow.querySelector(".total-usd"), totalNote: shadow.querySelector(".total-note"),
      generations: shadow.querySelector(".generations"), batches: shadow.querySelector(".batches"), parameterMatched: shadow.querySelector(".parameter-matched"), unresolved: shadow.querySelector(".unresolved"),
      progressTitle: shadow.querySelector(".progress-title"), progressDetail: shadow.querySelector(".progress-detail"), progressPercent: shadow.querySelector(".progress-percent"), progressBar: shadow.querySelector(".bar > div"),
      warning: shadow.querySelector(".warning"), tableWrap: shadow.querySelector(".table-wrap"), detailsWrap: shadow.querySelector(".details-wrap"),
      analyze: shadow.querySelector(".analyze"), csv: shadow.querySelector(".csv"), diagnostic: shadow.querySelector(".diagnostic"), reset: shadow.querySelector(".reset")
    };
    setupPanelDragging(head);
    setupCollapsedDragging(pill);
    if (uiPosition) requestAnimationFrame(() => applyUiPosition(uiPosition, false));
    window.addEventListener("resize", () => { if (uiPosition) applyUiPosition(uiPosition, false); }, { passive: true });
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 60);
  }

  function render() {
    ensureUi();
    if (!ui) return;
    const summary = analyzer.getSummary();
    const scanMeta = getScanMeta(summary);
    const totalLabel = summary.generations ? formatCredits(summary.totalMin, summary.totalMax, summary.unknownGenerations) : "—";
    const foundBatches = Number(scanMeta?.knownBatchIds || scanMeta?.requestedBatches || summary.batches || 0);
    const fetchedBatches = Number(scanMeta?.batchOk || 0);

    ui.subtitle.textContent = descriptor.id ? `Проект ${descriptor.id}` : `${descriptor.path} · ID проекта определится при сканировании`;
    ui.total.textContent = totalLabel;
    ui.totalUsd.textContent = summary.generations ? `${formatUsd(summary.totalMin, summary.totalMax, summary.unknownGenerations)} · 120 cr = $1` : "";
    ui.pillText.textContent = summary.generations ? totalLabel : "Кредиты";
    ui.generations.textContent = formatNumber(summary.generations, 0);
    ui.batches.textContent = `${formatNumber(fetchedBatches > 0 ? fetchedBatches : foundBatches, 0)} / ${formatNumber(foundBatches, 0)}`;
    ui.parameterMatched.textContent = formatNumber(summary.parameterMatchedGroups || 0, 0);
    ui.unresolved.textContent = formatNumber(summary.unknownGenerations, 0);
    ui.dot.classList.toggle("busy", scanning);
    ui.analyze.disabled = scanning;
    ui.analyze.textContent = scanning ? "Идёт анализ…" : "Полный анализ проекта";
    ui.csv.disabled = !summary.generations;

    if (!summary.generations) {
      ui.totalNote.textContent = foundBatches
        ? `Найдено ${foundBatches} batch-записей, но завершённые генерации пока не разобраны.`
        : "Нажмите «Полный анализ проекта»: расширение прочитает data.generations[], восстановит batch ID и запросит статусы старых запусков.";
    } else {
      const exactParts = [];
      if (summary.actualCredits) exactParts.push(`фактически найдено ${formatNumber(summary.actualCredits)} cr`);
      if (summary.estimatedExactCredits) exactParts.push(`однозначно рассчитано ${formatNumber(summary.estimatedExactCredits)} cr`);
      if (summary.parameterMatchedGroups) exactParts.push(`по настройкам: ${formatNumber(summary.parameterMatchedGroups, 0)} batches`);
      if (summary.rangeMax > summary.rangeMin) exactParts.push(`диапазон ${formatNumber(summary.rangeMin)}–${formatNumber(summary.rangeMax)} cr`);
      const unknown = summary.unknownGenerations ? ` Без цены: ${summary.unknownGenerations}.` : "";
      ui.totalNote.textContent = `${exactParts.join(" · ") || "Стоимость рассчитана по модели и сохранённым параметрам."}.${unknown}`;
    }

    ui.progressTitle.textContent = progress.title;
    ui.progressDetail.textContent = progress.detail || (lastScan?.finishedAt ? `Последний анализ: ${formatDate(lastScan.finishedAt)}` : "");
    ui.progressPercent.textContent = `${Math.max(0, Math.min(100, Math.round(progress.percent)))}%`;
    ui.progressBar.style.width = `${Math.max(0, Math.min(100, progress.percent))}%`;

    const oldExtensionDetected = Boolean(
      document.getElementById("weave-credit-tracker-strict-v2")
      || document.getElementById("weave-credit-tracker-v1")
      || document.getElementById("weavy-project-credit-analyzer-v6")
      || document.getElementById("weavy-project-credit-analyzer-v5")
      || document.getElementById("weavy-project-credit-analyzer-v4")
    );
    if (oldExtensionDetected) {
      ui.warning.style.display = "block";
      ui.warning.textContent = "Обнаружена старая версия Credit Tracker. Отключите её в chrome://extensions, чтобы на странице не работали два расширения одновременно.";
    } else if (lastScan?.error) {
      ui.warning.style.display = "block";
      ui.warning.textContent = `Анализ завершился частично: ${lastScan.error}`;
    } else if (summary.unresolvedModelGenerations) {
      ui.warning.style.display = "block";
      ui.warning.textContent = `Для ${formatNumber(summary.unresolvedModelGenerations, 0)} генераций модель пока не определена. Служебные названия fal_imported и any_llm больше не выдаются за реальные модели; подробности сохранены в диагностике.`;
    } else if (scanMeta?.batchLimited) {
      ui.warning.style.display = "block";
      ui.warning.textContent = `В проекте найдено больше ${formatNumber(scanMeta?.limits?.maxBatchRequests || 5000, 0)} batches. Отчёт частичный; лимит и список ошибок сохранены в диагностике.`;
    } else if (scanMeta?.oversizedResponsesSkipped || scanMeta?.bridgeTruncations || summary.counters?.payloadsTruncated) {
      ui.warning.style.display = "block";
      ui.warning.textContent = `Проект очень большой. Обрезанных структур: ${formatNumber((scanMeta?.bridgeTruncations || 0) + (summary.counters?.payloadsTruncated || 0), 0)}, пропущенных слишком больших ответов: ${formatNumber(scanMeta?.oversizedResponsesSkipped || 0, 0)}. Выгрузите диагностику, если часть генераций отсутствует.`;
    } else if (scanMeta?.batchNotFound) {
      ui.warning.style.display = "block";
      ui.warning.textContent = `${formatNumber(scanMeta.batchNotFound, 0)} исторических batches больше не возвращаются сервером Weavy (404). Они сохранены в проекте как ссылки, но точные параметры или списания могут быть недоступны.`;
    } else if (scanMeta?.batchErrors?.length) {
      ui.warning.style.display = "block";
      const statuses = Object.entries(scanMeta.batchStatusCounts || {}).map(([status, count]) => `${status}: ${count}`).join(", ");
      ui.warning.textContent = `Не удалось прочитать ${scanMeta.batchErrors.length} исторических batches${statuses ? ` (${statuses})` : ""}. Модели и количество восстановлены по сохранённой истории проекта.`;
    } else {
      ui.warning.style.display = "none";
      ui.warning.textContent = "";
    }

    if (!summary.rows.length) {
      ui.tableWrap.innerHTML = `<div class="empty">Пока нет подтверждённых генераций. После установки версии 0.8.0 полностью перезагрузите страницу проекта и нажмите «Полный анализ проекта».</div>`;
    } else {
      const rows = summary.rows.map((row) => {
        const cost = formatCredits(row.min, row.max, row.unknown);
        return `<tr>
          <td class="model">${escapeHtml(row.model)}${row.parameterMatched ? `<div class="model-meta">по настройкам: ${formatNumber(row.parameterMatched, 0)} batches</div>` : ""}</td>
          <td class="num">${formatNumber(row.generations, 0)}</td>
          <td class="num">${formatNumber(row.groups, 0)}</td>
          <td class="num ${row.unknown ? "warn" : ""}">${escapeHtml(cost)}</td>
        </tr>`;
      }).join("");
      ui.tableWrap.innerHTML = `<table>
        <thead><tr><th class="model">Модель</th><th class="num">Генерации</th><th class="num">Batches</th><th class="num">Кредиты</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const detailRows = analyzer.getReportRows().slice(-40).reverse();
    if (!detailRows.length) {
      ui.detailsWrap.innerHTML = `<div class="empty">Детали появятся после анализа.</div>`;
    } else {
      ui.detailsWrap.innerHTML = detailRows.map((row) => {
        const sourceLabels = {
          actual: "фактическое списание",
          "live-model-parameter-match": "точно по живому правилу Weavy",
          "live-model-formula": "по формуле Weavy",
          "catalog-parameter-match": "точно по параметрам каталога",
          "catalog-fixed": "фиксированная цена каталога",
          "catalog-range": "диапазон каталога",
          "catalog-parameters-missing": "диапазон: параметр запуска не найден",
          "catalog-ambiguous": "диапазон: несколько параметров совпали",
          "live-model-metadata-range": "диапазон живых цен"
        };
        const source = String(row.costSource || "").split(" | ")[0];
        return `<div class="detail-item">
          <div class="detail-head"><span>${escapeHtml(row.model)}</span><span class="detail-cost">${escapeHtml(formatCredits(row.creditsMin, row.creditsMax, row.unknownGenerations))}</span></div>
          <div class="detail-meta" title="${escapeHtml(row.costReason || "")}">${escapeHtml(row.parameters || "настройки не сохранились")} · ${escapeHtml(sourceLabels[source] || source || row.costKind)}</div>
        </div>`;
      }).join("");
    }
  }

  function setProgress(percent, title, detail = "") {
    progress = { percent, title, detail };
    scheduleRender();
  }

  function updateDynamicProgress() {
    if (!scanning) return;
    const summary = analyzer.getSummary();
    setProgress(Math.max(progress.percent, 15), progress.title, `${progress.detail || "Обрабатываю данные"} · генераций найдено: ${summary.generations}`);
  }

  async function startAnalysis() {
    if (scanning) return;
    const routeDescriptor = getProjectDescriptor();
    if (routeDescriptor.id) descriptor = routeDescriptor;
    analyzer = CORE.createAnalyzer(CATALOG, { projectId: descriptor.id });
    payloadQueue = [];
    scanning = true;
    currentScanId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    lastScan = { scanId: currentScanId, startedAt: new Date().toISOString(), finishedAt: null, error: null, hookStats: null };
    setProgress(3, "Запускаю полный анализ", "Читаю сетевые ответы, локальный кэш и историю batches");
    clearTimeout(scanTimeout);
    clearTimeout(hookWatchdog);
    scanTimeout = setTimeout(() => {
      if (!scanning) return;
      finishAnalysis("Превышено время ожидания Weavy. Частичный отчёт сохранён.");
    }, 30 * 60 * 1000);
    postCommand("ping");
    postCommand("active-scan", { projectId: descriptor.id || "", scanId: currentScanId });
    hookWatchdog = setTimeout(() => {
      if (!scanning || hookReady || progress.percent > 3) return;
      finishAnalysis("Скрипт анализа не подключился к вкладке. Полностью перезагрузите проект через Ctrl+F5 после обновления расширения.");
    }, 4500);
    scheduleRender();
  }

  function handleScanProgress(meta) {
    hookReady = true;
    clearTimeout(hookWatchdog);
    if (!scanning || (meta.scanId && currentScanId && meta.scanId !== currentScanId)) return;
    if (meta.projectId) applyProjectId(meta.projectId);
    const stage = meta.stage;
    if (stage === "starting") setProgress(5, "Запускаю анализ", `Проект ${meta.projectId || descriptor.id || "…"}`);
    else if (stage === "buffer-replayed") setProgress(12, "Читаю загруженные ответы", `Ответов в буфере: ${meta.replayedPayloads || meta.bufferedPayloads || 0}`);
    else if (stage === "storage-web-complete") setProgress(20, "Проверяю браузерный кэш", `localStorage / sessionStorage: найдено ${meta.storageMatches || 0}`);
    else if (stage === "storage-indexeddb-complete") setProgress(32, "Проверяю IndexedDB", `Найдено записей: ${meta.indexedDbMatches || 0} · batch ID: ${meta.knownBatchIds || 0}`);
    else if (stage === "replaying-api") {
      const fraction = meta.replayTotal ? meta.replayedRequests / meta.replayTotal : 0;
      setProgress(34 + fraction * 22, "Повторно читаю API проекта", `${meta.replayedRequests || 0} из ${meta.replayTotal || 0} · успешно: ${meta.replayedOk || 0}`);
    } else if (stage === "probing-project-api") {
      const fraction = meta.candidateTotal ? meta.candidateDone / meta.candidateTotal : 0;
      setProgress(57 + fraction * 9, "Ищу endpoint истории", `${meta.candidateDone || 0} из ${meta.candidateTotal || 0} · найдено: ${meta.candidateOk || 0}`);
    } else if (stage === "fetching-batches") {
      const fraction = meta.batchTotal ? meta.batchDone / meta.batchTotal : 0;
      setProgress(67 + fraction * 31, "Загружаю старые генерации", `${meta.batchDone || 0} из ${meta.batchTotal || 0} batches · успешно: ${meta.batchOk || 0}`);
    } else if (stage === "already-running") {
      setProgress(progress.percent, "Анализ уже выполняется", "Дождитесь завершения текущего сканирования");
    }
  }

  async function waitForQueue(maxMs = 180_000) {
    const started = Date.now();
    while ((processingQueue || payloadQueue.length) && Date.now() - started < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return !(processingQueue || payloadQueue.length);
  }


  function collectRenderedMedia(root = document, output = [], visited = new WeakSet()) {
    if (!root || visited.has(root) || output.length >= 10_000) return output;
    visited.add(root);
    try {
      for (const element of root.querySelectorAll?.("img, video") || []) {
        output.push(element);
        if (output.length >= 10_000) break;
      }
      for (const element of root.querySelectorAll?.("*") || []) {
        if (output.length >= 10_000) break;
        if (element.shadowRoot) collectRenderedMedia(element.shadowRoot, output, visited);
      }
    } catch {
      // Some roots can be inaccessible; normal document scanning still works.
    }
    return output;
  }

  async function enrichRenderedMediaDimensions() {
    let enriched = 0;
    const seen = new Set();
    for (let pass = 0; pass < 2; pass += 1) {
      if (pass) await new Promise((resolve) => setTimeout(resolve, 500));
      for (const element of collectRenderedMedia()) {
        if (element instanceof HTMLImageElement) {
          const src = element.currentSrc || element.src;
          const width = element.naturalWidth;
          const height = element.naturalHeight;
          const signature = `img|${src}|${width}x${height}`;
          if (!src || !width || !height || seen.has(signature)) continue;
          seen.add(signature);
          enriched += analyzer.enrichOutputDimensions(src, width, height, "rendered-image");
        } else if (element instanceof HTMLVideoElement) {
          const sources = [element.currentSrc || element.src, element.poster].filter(Boolean);
          const width = element.videoWidth;
          const height = element.videoHeight;
          if (!width || !height) continue;
          for (const src of sources) {
            const signature = `video|${src}|${width}x${height}`;
            if (seen.has(signature)) continue;
            seen.add(signature);
            enriched += analyzer.enrichOutputDimensions(src, width, height, "rendered-video");
          }
        }
      }
    }
    return enriched;
  }

  async function handleScanComplete(meta) {
    if (!scanning || (meta.scanId && currentScanId && meta.scanId !== currentScanId)) return;
    if (meta.projectId) applyProjectId(meta.projectId);
    analyzer.setScanMeta(meta);
    if (lastScan) lastScan.hookStats = meta;
    setProgress(99, "Формирую отчёт", `Получено ${meta.batchOk || 0} batch-ответов из ${meta.knownBatchIds || 0}`);
    const queueDrained = await waitForQueue();
    setProgress(99.5, "Проверяю размеры готовых файлов", "Считываю naturalWidth / naturalHeight и videoWidth / videoHeight у загруженных результатов");
    const renderedMediaDimensions = await enrichRenderedMediaDimensions();
    meta.renderedMediaDimensions = renderedMediaDimensions;
    analyzer.setScanMeta(meta);
    if (lastScan) lastScan.hookStats = meta;
    await finishAnalysis(queueDrained ? null : "Большой проект обработан не полностью: очередь данных не успела завершиться. Диагностика сохранена.");
  }

  async function finishAnalysis(error) {
    if (!scanning) return;
    scanning = false;
    clearTimeout(scanTimeout);
    clearTimeout(hookWatchdog);
    const summary = analyzer.getSummary();
    lastScan = {
      ...(lastScan || {}),
      finishedAt: new Date().toISOString(),
      error: error || null,
      summary: {
        generations: summary.generations,
        batches: summary.batches,
        unknownGenerations: summary.unknownGenerations,
        totalMin: summary.totalMin,
        totalMax: summary.totalMax
      }
    };
    setProgress(error ? 96 : 100, error ? "Анализ завершён частично" : "Анализ завершён", error || `Найдено генераций: ${summary.generations} · моделей: ${summary.models}`);
    await saveState();
    scheduleRender();
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.documentElement.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportCsv() {
    const rows = analyzer.getReportRows();
    if (!rows.length) return;
    const headers = [
      "Дата", "Batch ID", "Run ID", "Node ID", "Модель", "Внутреннее имя", "Статус",
      "Генерации", "Кредиты min", "Кредиты max", "USD min (120 cr/$)", "USD max (120 cr/$)", "Тип цены", "Источник цены", "Настройки", "Причина расчёта", "Без цены", "Источники данных", "Подтверждения"
    ];
    const lines = [headers.map(csvEscape).join(";")];
    for (const row of rows) {
      lines.push([
        row.timestamp, row.batchId, row.runId, row.nodeId, row.model, row.modelRaw, row.status,
        row.generations, row.creditsMin, row.creditsMax,
        row.creditsMin == null ? "" : (Number(row.creditsMin) / CREDITS_PER_USD).toFixed(2),
        row.creditsMax == null ? "" : (Number(row.creditsMax) / CREDITS_PER_USD).toFixed(2),
        row.costKind, row.costSource, row.parameters, row.costReason, row.unknownGenerations,
        row.sourceKinds.join(" | "), row.evidence.join(" | ")
      ].map(csvEscape).join(";"));
    }
    downloadBlob(`weavy-project-credits-${descriptor.id || "project"}.csv`, `\uFEFF${lines.join("\r\n")}`, "text/csv;charset=utf-8");
  }

  function exportDiagnostics() {
    const diagnostics = {
      extensionVersion: extensionVersion(),
      page: descriptor,
      lastScan,
      analyzer: analyzer.exportDiagnostics()
    };
    downloadBlob(`weavy-project-credit-diagnostics-${descriptor.id || "project"}.json`, JSON.stringify(diagnostics, null, 2), "application/json;charset=utf-8");
  }

  async function resetReport() {
    scanning = false;
    clearTimeout(scanTimeout);
    clearTimeout(hookWatchdog);
    analyzer = CORE.createAnalyzer(CATALOG, { projectId: descriptor.id });
    lastScan = null;
    progress = { percent: 0, title: "Отчёт сброшен", detail: "Нажмите «Полный анализ проекта», чтобы собрать его заново." };
    await safeStorageRemove(storageKey());
    scheduleRender();
  }

  async function handleRouteChange() {
    const next = getProjectDescriptor();
    if (next.path === descriptor.path) return;
    if (scanning) {
      scanning = false;
      clearTimeout(scanTimeout);
      clearTimeout(hookWatchdog);
    }
    await saveState();
    descriptor = next;
    lastVisiblePriceSignature = "";
    lastVisiblePriceCapturedAt = 0;
    lastVisiblePriceCheckedAt = 0;
    progress = { percent: 0, title: "Открыта другая страница", detail: "" };
    await loadSavedState();
    postCommand("replay");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.channel !== CHANNEL) return;
    if (message.type === "hook-ready") {
      hookReady = true;
      clearTimeout(hookWatchdog);
      return;
    }
    if (message.type === "payload" && message.payload) enqueuePayload(message.payload);
    else if (message.type === "scan-progress" && message.payload) handleScanProgress(message.payload);
    else if (message.type === "scan-complete" && message.payload) handleScanComplete(message.payload);
    else if (message.type === "scan-error" && message.payload) {
      if (message.payload.projectId) applyProjectId(message.payload.projectId);
      finishAnalysis(String(message.payload.message || "Неизвестная ошибка сканирования"));
    }
  });

  async function boot() {
    ensureUi();
    await loadUiPosition();
    await loadSavedState();
    postCommand("ping");
    postCommand("replay");
    clearInterval(routeTimer);
    routeTimer = setInterval(() => {
      if (!runtimeAlive()) {
        clearInterval(routeTimer);
        clearTimeout(scanTimeout);
        clearTimeout(hookWatchdog);
        ui?.host?.remove();
        return;
      }
      handleRouteChange();
      captureVisibleWeavyPrice();
    }, 900);
    scheduleRender();
  }

  if (document.documentElement) boot();
  else new MutationObserver((_, observer) => {
    if (!document.documentElement) return;
    observer.disconnect();
    boot();
  }).observe(document, { childList: true, subtree: true });
})();
