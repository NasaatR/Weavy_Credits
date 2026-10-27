(() => {
  "use strict";

  const FLAG = "__WEAVY_PROJECT_CREDIT_ANALYZER_V8_HOOKED__";
  if (window[FLAG]) return;
  try {
    Object.defineProperty(window, FLAG, { value: true, configurable: false, enumerable: false, writable: false });
  } catch {
    window[FLAG] = true;
  }

  const CHANNEL = "weavy-project-credit-analyzer-v9";
  const MAX_TEXT_LENGTH = 64_000_000;
  const MAX_BUFFERED_PAYLOADS = 800;
  const MAX_SANITIZE_DEPTH = 28;
  const MAX_ARRAY_ITEMS = 10_000;
  const MAX_PRIORITY_ARRAY_ITEMS = 50_000;
  const MAX_OBJECT_KEYS = 5_000;
  const MAX_REPLAY_REQUESTS = 500;
  const MAX_BATCH_REQUESTS = 5_000;
  const BATCH_CONCURRENCY = 6;
  const FETCH_TIMEOUT_MS = 30_000;
  const FETCH_RETRIES = 3;
  const PRIORITY_ARRAY_KEY_RE = /(?:nodes?|generations?|generationhistory|reciperuns?|noderuns?|runs?|results?|outputs?|batches?|history)/i;

  const replayBuffer = [];
  const requestTemplates = new Map();
  const knownBatchIds = new Set();
  const capturedUrls = new Set();
  let sequence = 0;
  let activeScanPromise = null;
  let bridgeTruncations = 0;
  let oversizedResponsesSkipped = 0;

  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  const NativeRequest = window.Request;
  const NativeHeaders = window.Headers;
  const SENSITIVE_KEY_RE = /(?:authorization|cookie|token|secret|password|session|credential|api.?key|prompt|negative.?prompt|system.?message|base64)/i;
  const MUTATING_PATH_RE = /(?:\/save(?:$|[/?#])|\/generate(?:$|[/?#])|\/execute(?:$|[/?#])|\/delete(?:$|[/?#])|\/remove(?:$|[/?#])|\/create(?:$|[/?#])|\/update(?:$|[/?#])|\/run(?:$|[/?#])|\/cancel(?:$|[/?#]))/i;
  const WEAVY_API_RE = /https:\/\/(?:api\.)?weavy\.ai\//i;

  function nextTraceId(prefix = "req") {
    sequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
  }

  function safeUrl(value) {
    try {
      if (typeof value === "string") return new URL(value, location.href).href;
      if (value && typeof value.url === "string") return new URL(value.url, location.href).href;
    } catch {
      // Ignore malformed URLs.
    }
    return String(value || "");
  }

  function sanitizeUrl(value) {
    try {
      const url = new URL(value, location.href);
      for (const key of [...url.searchParams.keys()]) {
        if (/token|secret|key|auth|signature|session|credential/i.test(key)) {
          url.searchParams.set(key, "[REDACTED]");
        }
      }
      url.hash = "";
      return url.href;
    } catch {
      return String(value || "").slice(0, 1_000);
    }
  }

  function shouldCaptureUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, location.href);
      return parsed.hostname === "api.weavy.ai" || parsed.hostname === "app.weavy.ai" || parsed.hostname.endsWith(".weavy.ai") || parsed.hostname === "weave.figma.com";
    } catch {
      return WEAVY_API_RE.test(url);
    }
  }

  function looksLikeJsonText(text) {
    const trimmed = String(text || "").trimStart();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  }

  function sanitizeForBridge(value, keyHint = "", depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (SENSITIVE_KEY_RE.test(keyHint)) return "[REDACTED]";
      if (/^data:/i.test(value)) return "[DATA_URL]";
      if (value.length > 24_000) { bridgeTruncations += 1; return `${value.slice(0, 24_000)}…`; }
      return value;
    }
    if (depth >= MAX_SANITIZE_DEPTH) { bridgeTruncations += 1; return "[MAX_DEPTH]"; }
    if (typeof value !== "object") return String(value);
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);

    if (Array.isArray(value)) {
      const limit = PRIORITY_ARRAY_KEY_RE.test(String(keyHint || "")) ? MAX_PRIORITY_ARRAY_ITEMS : MAX_ARRAY_ITEMS;
      const output = value.slice(0, limit).map((item) => sanitizeForBridge(item, keyHint, depth + 1, seen));
      if (value.length > limit) { bridgeTruncations += 1; output.push(`[TRUNCATED:${value.length - limit}]`); }
      return output;
    }

    const output = {};
    const entries = Object.entries(value);
    for (const [key, child] of entries.slice(0, MAX_OBJECT_KEYS)) {
      if (SENSITIVE_KEY_RE.test(key) && (typeof child === "string" || typeof child === "number")) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = sanitizeForBridge(child, key, depth + 1, seen);
      }
    }
    if (entries.length > MAX_OBJECT_KEYS) { bridgeTruncations += 1; output.__truncatedKeys = entries.length - MAX_OBJECT_KEYS; }
    return output;
  }

  function collectBatchIds(value, depth = 0, seen = new WeakSet()) {
    if (value == null || depth > 28) return;
    if (typeof value === "string") {
      const urlMatches = value.matchAll(/\/batches\/([A-Za-z0-9_-]{8,160})(?:\/|$|[?#])/g);
      for (const match of urlMatches) knownBatchIds.add(match[1]);
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 100_000)) collectBatchIds(item, depth + 1, seen);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalized === "batchid" && (typeof child === "string" || typeof child === "number")) {
        const id = String(child).trim();
        if (/^[A-Za-z0-9_-]{8,180}$/.test(id)) knownBatchIds.add(id);
      }
      collectBatchIds(child, depth + 1, seen);
    }
  }


  function payloadBufferPriority(payload) {
    const url = String(payload?.url || "");
    if (/node-definitions\/public|pricing|model-catalog/i.test(url)) return 3;
    if (/\/batches\/recipes\/[^/]+\/batches\/[^/]+\/status/i.test(url)) return 3;
    if (/\/api\/v1\/recipes\//i.test(url)) return 3;
    const data = payload?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if (Array.isArray(data.nodes) || Array.isArray(data.recipeRuns) || Array.isArray(data.nodeRuns) || Array.isArray(data.generations)) return 3;
    }
    return /api\.weavy\.ai/i.test(url) ? 2 : 1;
  }

  function postEnvelope(type, payload) {
    window.postMessage({ channel: CHANNEL, type, payload }, "*");
  }

  function postPayload(payload, shouldBuffer = true) {
    if (!shouldCaptureUrl(payload.url || "")) return;
    const envelope = {
      channel: CHANNEL,
      type: "payload",
      bufferPriority: payloadBufferPriority(payload),
      payload: {
        ...payload,
        url: sanitizeUrl(payload.url || ""),
        pageUrl: location.href,
        capturedAt: new Date().toISOString()
      }
    };

    capturedUrls.add(envelope.payload.url);
    collectBatchIds(payload.data);

    if (shouldBuffer) {
      replayBuffer.push(envelope);
      if (replayBuffer.length > MAX_BUFFERED_PAYLOADS) {
        let removeIndex = 0;
        let lowestPriority = Number.POSITIVE_INFINITY;
        for (let index = 0; index < replayBuffer.length; index += 1) {
          const priority = Number(replayBuffer[index]?.bufferPriority || 0);
          if (priority < lowestPriority) { lowestPriority = priority; removeIndex = index; }
          if (priority <= 1) break;
        }
        replayBuffer.splice(removeIndex, 1);
      }
    }
    window.postMessage(envelope, "*");
  }

  function postProgress(scanId, stage, details = {}) {
    postEnvelope("scan-progress", {
      scanId,
      stage,
      ...details,
      knownBatchIds: knownBatchIds.size,
      bufferedPayloads: replayBuffer.length,
      observedRequests: requestTemplates.size,
      at: new Date().toISOString()
    });
  }

  function parseBodyValue(body) {
    try {
      if (body == null) return null;
      if (typeof body === "string") {
        if (!looksLikeJsonText(body)) return null;
        return JSON.parse(body);
      }
      if (body instanceof URLSearchParams) {
        const result = {};
        for (const [key, value] of body.entries()) result[key] = value;
        return result;
      }
      if (typeof FormData !== "undefined" && body instanceof FormData) {
        const result = {};
        for (const [key, value] of body.entries()) {
          result[key] = typeof value === "string" ? value : `[File:${value?.name || "unknown"}]`;
        }
        return result;
      }
      if (body && typeof body === "object" && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) return body;
    } catch {
      // Ignore unsupported request bodies.
    }
    return null;
  }

  async function parseRequestBody(input, init, method) {
    if (/^(?:GET|HEAD)$/i.test(method)) return null;
    const direct = parseBodyValue(init?.body);
    if (direct != null) return direct;

    try {
      if (typeof Request !== "undefined" && input instanceof Request) {
        const clone = input.clone();
        const contentType = (clone.headers.get("content-type") || "").toLowerCase();
        if (contentType && !contentType.includes("json") && !contentType.includes("graphql")) return null;
        const text = await clone.text();
        if (!text || !looksLikeJsonText(text)) return null;
        if (text.length > MAX_TEXT_LENGTH) { oversizedResponsesSkipped += 1; return null; }
        return JSON.parse(text);
      }
    } catch {
      // Request bodies can be locked; response interception still works.
    }
    return null;
  }

  function headersToObject(headersLike) {
    const output = {};
    try {
      const headers = new NativeHeaders(headersLike || undefined);
      for (const [key, value] of headers.entries()) output[key] = value;
    } catch {
      // Ignore malformed headers.
    }
    return output;
  }

  function mergeHeaders(inputHeaders, initHeaders) {
    const output = headersToObject(inputHeaders);
    const extra = headersToObject(initHeaders);
    return { ...output, ...extra };
  }

  function makePrivateTemplate(meta) {
    const key = `${meta.method}:${meta.url}`;
    requestTemplates.set(key, {
      url: meta.url,
      method: meta.method,
      headers: { ...(meta.headers || {}) },
      credentials: meta.credentials || "include",
      bodyText: meta.bodyText || null,
      contentType: meta.contentType || "",
      lastSeenAt: Date.now()
    });
    if (requestTemplates.size > 1_200) {
      const oldest = [...requestTemplates.entries()].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt).slice(0, requestTemplates.size - 1_200);
      for (const [oldKey] of oldest) requestTemplates.delete(oldKey);
    }
  }

  function makeFetchMeta(input, init = {}) {
    const inputRequest = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const url = safeUrl(input);
    const method = String(init.method || inputRequest?.method || "GET").toUpperCase();
    const headers = mergeHeaders(inputRequest?.headers, init.headers);
    let bodyText = null;
    if (typeof init.body === "string" && init.body.length <= MAX_TEXT_LENGTH) bodyText = init.body;
    return {
      url,
      method,
      headers,
      credentials: init.credentials || inputRequest?.credentials || "include",
      bodyText,
      contentType: headers["content-type"] || headers["Content-Type"] || ""
    };
  }

  async function inspectResponse(response, requestMeta, transport, traceId, options = {}) {
    try {
      const contentType = (response.headers?.get?.("content-type") || "").toLowerCase();
      const contentLength = Number(response.headers?.get?.("content-length") || 0);
      if (contentLength > MAX_TEXT_LENGTH) { oversizedResponsesSkipped += 1; return null; }
      if (contentType && !contentType.includes("json") && !contentType.includes("graphql") && !contentType.includes("text/plain")) return null;

      const text = await response.text();
      if (!text || !looksLikeJsonText(text)) return null;
      if (text.length > MAX_TEXT_LENGTH) { oversizedResponsesSkipped += 1; return null; }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return null;
      }

      postPayload({
        phase: "response",
        transport,
        traceId,
        url: requestMeta.url,
        method: requestMeta.method,
        status: response.status,
        source: options.source || "network",
        data: sanitizeForBridge(data)
      }, options.buffer !== false);
      collectBatchIds(data);
      return data;
    } catch {
      return null;
    }
  }

  if (nativeFetch) {
    window.fetch = function patchedFetch(input, init) {
      const requestMeta = makeFetchMeta(input, init || {});
      const shouldHook = shouldCaptureUrl(requestMeta.url);

      // Never interfere with telemetry, analytics, CDN or unrelated requests.
      // We only observe Weavy API traffic.
      if (!shouldHook) {
        return nativeFetch.apply(window, arguments);
      }

      const traceId = nextTraceId("fetch");
      makePrivateTemplate(requestMeta);
      const bodyPromise = parseRequestBody(input, init, requestMeta.method);
      let responsePromise;
      try {
        responsePromise = nativeFetch.apply(window, arguments);
      } catch (error) {
        // Chrome may reject intercepted fetches after tab freeze/unfreeze.
        // Fall back to untouched native fetch to avoid breaking Weavy.
        return nativeFetch.apply(window, arguments);
      }

      bodyPromise.then((data) => {
        if (data == null || !shouldCaptureUrl(requestMeta.url)) return;
        collectBatchIds(data);
        postPayload({
          phase: "request",
          transport: "fetch",
          traceId,
          url: requestMeta.url,
          method: requestMeta.method,
          status: 0,
          source: "network",
          data: sanitizeForBridge(data)
        });
      }).catch(() => {});

      responsePromise.then((response) => {
        if (!shouldCaptureUrl(requestMeta.url)) return;
        try {
          inspectResponse(response.clone(), requestMeta, "fetch", traceId);
        } catch {
          // Ignore clone errors.
        }
      }).catch(() => {});

      return responsePromise;
    };
  }

  const XHR = window.XMLHttpRequest;
  if (XHR?.prototype) {
    const nativeOpen = XHR.prototype.open;
    const nativeSend = XHR.prototype.send;
    const nativeSetRequestHeader = XHR.prototype.setRequestHeader;

    XHR.prototype.open = function patchedOpen(method, url) {
      this.__wpcaRequestMeta = {
        method: String(method || "GET").toUpperCase(),
        url: safeUrl(url),
        traceId: nextTraceId("xhr"),
        headers: {},
        credentials: "include"
      };
      return nativeOpen.apply(this, arguments);
    };

    XHR.prototype.setRequestHeader = function patchedSetRequestHeader(name, value) {
      try {
        if (this.__wpcaRequestMeta) this.__wpcaRequestMeta.headers[String(name).toLowerCase()] = String(value);
      } catch {
        // Ignore header capture errors.
      }
      return nativeSetRequestHeader.apply(this, arguments);
    };

    XHR.prototype.send = function patchedSend(body) {
      const meta = this.__wpcaRequestMeta || { method: "GET", url: "", traceId: nextTraceId("xhr"), headers: {}, credentials: "include" };
      if (typeof body === "string" && body.length <= MAX_TEXT_LENGTH) meta.bodyText = body;
      meta.contentType = meta.headers?.["content-type"] || "";
      if (shouldCaptureUrl(meta.url)) makePrivateTemplate(meta);
      const parsedBody = parseBodyValue(body);
      if (parsedBody != null && shouldCaptureUrl(meta.url)) {
        collectBatchIds(parsedBody);
        postPayload({
          phase: "request",
          transport: "xhr",
          traceId: meta.traceId,
          url: meta.url,
          method: meta.method,
          status: 0,
          source: "network",
          data: sanitizeForBridge(parsedBody)
        });
      }

      if (!this.__wpcaListenerAdded) {
        this.__wpcaListenerAdded = true;
        this.addEventListener("loadend", () => {
          try {
            if (!shouldCaptureUrl(meta.url || this.responseURL)) return;
            const contentType = (this.getResponseHeader("content-type") || "").toLowerCase();
            if (contentType && !contentType.includes("json") && !contentType.includes("graphql") && !contentType.includes("text/plain")) return;

            let data = null;
            if (this.responseType === "json" && this.response && typeof this.response === "object") {
              data = this.response;
            } else if (!this.responseType || this.responseType === "text") {
              const text = String(this.responseText || "");
              if (!text || text.length > MAX_TEXT_LENGTH || !looksLikeJsonText(text)) return;
              try {
                data = JSON.parse(text);
              } catch {
                return;
              }
            }
            if (data == null) return;
            collectBatchIds(data);
            postPayload({
              phase: "response",
              transport: "xhr",
              traceId: meta.traceId,
              url: meta.url || safeUrl(this.responseURL),
              method: meta.method,
              status: this.status,
              source: "network",
              data: sanitizeForBridge(data)
            });
          } catch {
            // Ignore inaccessible XHR bodies.
          }
        });
      }
      return nativeSend.apply(this, arguments);
    };
  }

  const NativeWebSocket = window.WebSocket;
  if (typeof NativeWebSocket === "function") {
    try {
      window.WebSocket = new Proxy(NativeWebSocket, {
        construct(Target, args, NewTarget) {
          const socket = Reflect.construct(Target, args, NewTarget);
          const socketUrl = safeUrl(args[0]);
          socket.addEventListener("message", (event) => {
            try {
              if (!shouldCaptureUrl(socketUrl) || typeof event.data !== "string") return;
              if (event.data.length > MAX_TEXT_LENGTH || !looksLikeJsonText(event.data)) return;
              const data = JSON.parse(event.data);
              collectBatchIds(data);
              postPayload({
                phase: "event",
                transport: "websocket",
                traceId: null,
                url: socketUrl,
                method: "MESSAGE",
                status: 101,
                source: "network",
                data: sanitizeForBridge(data)
              });
            } catch {
              // Ignore non-JSON websocket frames.
            }
          });
          return socket;
        }
      });
    } catch {
      // fetch/XHR interception remains available.
    }
  }

  function publicTemplateSummary(template) {
    return {
      url: sanitizeUrl(template.url),
      method: template.method,
      hasAuthorization: Object.keys(template.headers || {}).some((key) => key.toLowerCase() === "authorization"),
      hasWorkspaceHeader: Object.keys(template.headers || {}).some((key) => /workspace|organization|team/i.test(key))
    };
  }

  function chooseAuthTemplate(projectId = "") {
    const score = (template) => {
      const headers = Object.keys(template.headers || {}).map((key) => key.toLowerCase());
      let value = 0;
      if (/api\.weavy\.ai/i.test(template.url || "")) value += 80;
      if (projectId && String(template.url || "").includes(projectId)) value += 70;
      if (headers.includes("authorization")) value += 160;
      if (headers.some((key) => /workspace|organization|team|tenant/.test(key))) value += 90;
      if (/\/batches\/|\/recipes\//i.test(template.url || "")) value += 40;
      if (/^(?:GET|HEAD)$/i.test(template.method || "GET")) value += 15;
      return value;
    };
    const candidates = [...requestTemplates.values()]
      .filter((template) => shouldCaptureUrl(template.url))
      .sort((a, b) => score(b) - score(a) || b.lastSeenAt - a.lastSeenAt);
    return candidates[0] || null;
  }

  function safeReplayTemplate(template) {
    if (!template || !nativeFetch) return false;
    if (MUTATING_PATH_RE.test(template.url)) return false;
    if (/^(?:GET|HEAD)$/i.test(template.method)) return true;
    if (template.method !== "POST") return false;
    if (!template.bodyText || !looksLikeJsonText(template.bodyText)) return false;
    try {
      const body = JSON.parse(template.bodyText);
      const query = typeof body?.query === "string" ? body.query.trim() : "";
      if (query && /^mutation\b/i.test(query)) return false;
      return Boolean(query && /^query\b/i.test(query));
    } catch {
      return false;
    }
  }

  function sanitizedReplayHeaders(headers) {
    const output = {};
    for (const [key, value] of Object.entries(headers || {})) {
      const normalized = key.toLowerCase();
      if (/^(?:host|origin|referer|content-length|cookie|connection|accept-encoding|user-agent)$/.test(normalized)) continue;
      if (normalized.startsWith("sec-")) continue;
      output[key] = value;
    }
    return output;
  }


  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchWithRetry(url, init = {}, retries = FETCH_RETRIES) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
      try {
        const response = await nativeFetch(url, { ...init, ...(controller ? { signal: controller.signal } : {}) });
        if (timer) clearTimeout(timer);
        const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        if (!retryable || attempt >= retries) return { response, attempts: attempt + 1 };
        try { await response.body?.cancel?.(); } catch {}
        const retryAfter = Number(response.headers?.get?.("retry-after"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(30_000, retryAfter * 1000)
          : Math.min(8_000, 550 * (2 ** attempt) + Math.floor(Math.random() * 250));
        await sleep(delayMs);
      } catch (error) {
        if (timer) clearTimeout(timer);
        lastError = error;
        if (attempt >= retries) throw error;
        await sleep(Math.min(8_000, 550 * (2 ** attempt) + Math.floor(Math.random() * 250)));
      }
    }
    throw lastError || new Error("Fetch failed");
  }

  async function replayTemplate(template, scanId, source = "active-replay") {
    if (!nativeFetch || !safeReplayTemplate(template)) return { ok: false, status: 0, reason: "not-safe" };
    try {
      const init = {
        method: template.method,
        credentials: template.credentials || "include",
        headers: sanitizedReplayHeaders(template.headers),
        cache: "no-store"
      };
      if (template.method === "POST" && template.bodyText) init.body = template.bodyText;
      const { response, attempts } = await fetchWithRetry(template.url, init);
      await inspectResponse(response.clone(), template, "active-fetch", nextTraceId("scan"), { source, buffer: true });
      return { ok: response.ok, status: response.status, attempts };
    } catch (error) {
      return { ok: false, status: 0, reason: String(error?.message || error) };
    }
  }

  function projectCandidateUrls(projectId) {
    if (!projectId) return [];
    const origin = "https://api.weavy.ai";
    const encoded = encodeURIComponent(projectId);
    return [
      `${origin}/api/v1/recipes/${encoded}`,
      `${origin}/api/v1/recipes/${encoded}/load`,
      `${origin}/api/v1/recipes/${encoded}/history`,
      `${origin}/api/v1/recipes/${encoded}/runs`,
      `${origin}/api/v1/recipes/${encoded}/batches`,
      `${origin}/api/v1/batches/recipes/${encoded}`,
      `${origin}/api/v1/batches/recipes/${encoded}/batches`,
      `${origin}/api/v1/batches/recipes/${encoded}/history`
    ];
  }

  async function fetchCandidate(url, authTemplate, scanId, source = "candidate") {
    if (!nativeFetch) return { ok: false, status: 0, reason: "fetch-unavailable" };
    const template = {
      url,
      method: "GET",
      credentials: authTemplate?.credentials || "include",
      headers: sanitizedReplayHeaders(authTemplate?.headers || {})
    };
    try {
      const { response, attempts } = await fetchWithRetry(url, {
        method: "GET",
        credentials: template.credentials,
        headers: template.headers,
        cache: "no-store"
      });
      if (response.ok) await inspectResponse(response.clone(), template, "active-fetch", nextTraceId("candidate"), { source, buffer: true });
      return { ok: response.ok, status: response.status, attempts };
    } catch (error) {
      return { ok: false, status: 0, reason: String(error?.message || error) };
    }
  }

  function objectLooksInteresting(value, projectId, depth = 0, seen = new WeakSet()) {
    if (value == null || depth > 8) return false;
    if (typeof value === "string") return Boolean(projectId && value.includes(projectId));
    if (typeof value !== "object" || seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 5_000).some((item) => objectLooksInteresting(item, projectId, depth + 1, seen));
    const keys = Object.keys(value);
    if (keys.some((key) => /^(?:generations?|batchId|recipeRuns?|nodeRuns?|nodes?)$/i.test(key))) return true;
    return Object.entries(value).slice(0, 5_000).some(([key, child]) => {
      if (/prompt|token|secret|base64/i.test(key)) return false;
      return objectLooksInteresting(child, projectId, depth + 1, seen);
    });
  }

  async function scanWebStorage(projectId, scanId) {
    let matches = 0;
    for (const [storageName, storage] of [["localStorage", window.localStorage], ["sessionStorage", window.sessionStorage]]) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          const raw = key != null ? storage.getItem(key) : null;
          if (!raw || raw.length > MAX_TEXT_LENGTH || !looksLikeJsonText(raw)) continue;
          let data;
          try { data = JSON.parse(raw); } catch { continue; }
          if (!objectLooksInteresting(data, projectId)) continue;
          collectBatchIds(data);
          postPayload({
            phase: "storage",
            transport: storageName,
            traceId: null,
            url: `${location.origin}/__${storageName}__/${encodeURIComponent(key || "unknown")}`,
            method: "READ",
            status: 200,
            source: "storage",
            data: sanitizeForBridge(data)
          }, true);
          matches += 1;
        }
      } catch {
        // Storage can be blocked.
      }
    }
    postProgress(scanId, "storage-web-complete", { storageMatches: matches });
    return matches;
  }

  function openDatabase(name) {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
        request.onupgradeneeded = () => {
          try { request.transaction?.abort(); } catch {}
          reject(new Error("Database did not exist"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async function scanIndexedDb(projectId, scanId) {
    if (!window.indexedDB || typeof indexedDB.databases !== "function") {
      postProgress(scanId, "storage-indexeddb-complete", { indexedDbMatches: 0, indexedDbUnavailable: true });
      return 0;
    }
    let matches = 0;
    let databases = [];
    try { databases = await indexedDB.databases(); } catch { databases = []; }

    for (const info of databases.slice(0, 20)) {
      if (!info?.name) continue;
      let db;
      try { db = await openDatabase(info.name); } catch { continue; }
      try {
        for (const storeName of [...db.objectStoreNames].slice(0, 50)) {
          await new Promise((resolve) => {
            let seen = 0;
            let tx;
            try { tx = db.transaction(storeName, "readonly"); } catch { resolve(); return; }
            const store = tx.objectStore(storeName);
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = (event) => {
              const cursor = event.target.result;
              if (!cursor || seen >= 6_000) { resolve(); return; }
              seen += 1;
              const value = cursor.value;
              if (objectLooksInteresting(value, projectId)) {
                collectBatchIds(value);
                postPayload({
                  phase: "storage",
                  transport: "indexeddb",
                  traceId: null,
                  url: `${location.origin}/__indexeddb__/${encodeURIComponent(info.name)}/${encodeURIComponent(storeName)}`,
                  method: "READ",
                  status: 200,
                  source: "storage",
                  data: sanitizeForBridge(value)
                }, true);
                matches += 1;
              }
              cursor.continue();
            };
            cursorRequest.onerror = () => resolve();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
          });
        }
      } finally {
        try { db.close(); } catch {}
      }
    }
    postProgress(scanId, "storage-indexeddb-complete", { indexedDbMatches: matches });
    return matches;
  }

  async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    async function run() {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, run));
    return results;
  }


  function findProjectIdInData(value, depth = 0, seen = new WeakSet()) {
    if (!value || typeof value !== "object" || depth > 9 || seen.has(value)) return "";
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 10_000)) {
        const found = findProjectIdInData(item, depth + 1, seen);
        if (found) return found;
      }
      return "";
    }
    for (const key of ["recipeId", "projectId", "flowId", "workflowId"]) {
      const candidate = value[key];
      if (typeof candidate === "string" && /^[A-Za-z0-9_-]{8,180}$/.test(candidate)) return candidate;
    }
    const id = typeof value.id === "string" ? value.id : "";
    const looksLikeRecipe = Array.isArray(value.nodes) || Array.isArray(value.edges) || /recipe|project|flow|workflow/i.test(String(value.type || value.kind || ""));
    if (id && looksLikeRecipe && /^[A-Za-z0-9_-]{8,180}$/.test(id)) return id;
    for (const [key, child] of Object.entries(value).slice(0, 5_000)) {
      if (/prompt|token|secret|base64|imageData/i.test(key)) continue;
      const found = findProjectIdInData(child, depth + 1, seen);
      if (found) return found;
    }
    return "";
  }

  function inferProjectId(explicitProjectId) {
    const explicit = String(explicitProjectId || "").trim();
    if (explicit) return explicit;
    const routeMatch = location.pathname.match(/\/(?:flow|project|workflow|canvas)\/([^/?#]+)/i);
    if (routeMatch?.[1]) return routeMatch[1];
    const urls = [
      ...[...requestTemplates.values()].map((template) => template.url),
      ...capturedUrls,
      ...replayBuffer.map((envelope) => envelope?.payload?.url || "")
    ];
    for (const value of urls) {
      const text = String(value || "");
      const recipeMatch = text.match(/\/api\/v1\/recipes\/([^/?#]+)/i);
      if (recipeMatch?.[1] && !/^(?:public|templates?)$/i.test(recipeMatch[1])) return decodeURIComponent(recipeMatch[1]);
      const batchMatch = text.match(/\/batches\/recipes\/([^/?#]+)/i);
      if (batchMatch?.[1]) return decodeURIComponent(batchMatch[1]);
    }
    for (const envelope of [...replayBuffer].reverse()) {
      const found = findProjectIdInData(envelope?.payload?.data);
      if (found) return found;
    }
    return "";
  }

  function rebuildKnownBatchIds(projectId) {
    knownBatchIds.clear();
    for (const envelope of replayBuffer) {
      const payload = envelope?.payload;
      if (!payload) continue;
      const url = String(payload.url || "");
      const pageUrl = String(payload.pageUrl || "");
      const globalPayload = /node-definitions|models|catalog|pricing|subflow-templates/i.test(url);
      if (projectId && !globalPayload && url.includes("/recipes/") && !url.includes(projectId) && !pageUrl.includes(projectId)) continue;
      collectBatchIds(payload.data);
    }
  }

  async function activeScan(projectId, scanId) {
    projectId = inferProjectId(projectId);
    if (!projectId) throw new Error("Не удалось определить ID проекта. Перезагрузите страницу проекта и повторите анализ.");
    rebuildKnownBatchIds(projectId);
    const startedAt = Date.now();
    postProgress(scanId, "starting", { projectId });

    for (const envelope of replayBuffer) window.postMessage({ ...envelope, replayed: true }, "*");
    postProgress(scanId, "buffer-replayed", { replayedPayloads: replayBuffer.length });

    await scanWebStorage(projectId, scanId);
    await scanIndexedDb(projectId, scanId);

    const templates = [...requestTemplates.values()]
      .filter((template) => safeReplayTemplate(template))
      .filter((template) => {
        if (!projectId) return true;
        return template.url.includes(projectId) || /node-definitions|models|pricing|subflow-templates/i.test(template.url);
      })
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, MAX_REPLAY_REQUESTS);

    let replayedOk = 0;
    await mapLimit(templates, 6, async (template, index) => {
      const result = await replayTemplate(template, scanId, "active-replay");
      if (result.ok) replayedOk += 1;
      if ((index + 1) % 10 === 0 || index + 1 === templates.length) {
        postProgress(scanId, "replaying-api", { replayedRequests: index + 1, replayedOk, replayTotal: templates.length });
      }
      return result;
    });

    const authTemplate = chooseAuthTemplate(projectId);
    const alreadySeen = new Set([...requestTemplates.values()].map((template) => template.url));
    const candidates = projectCandidateUrls(projectId).filter((url) => !alreadySeen.has(url));
    let candidateOk = 0;
    const candidateStatuses = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const result = await fetchCandidate(candidates[index], authTemplate, scanId, "candidate");
      candidateStatuses.push({ url: candidates[index], status: result.status, ok: result.ok, attempts: result.attempts || 1, reason: result.reason || null });
      if (result.ok) candidateOk += 1;
      postProgress(scanId, "probing-project-api", { candidateDone: index + 1, candidateTotal: candidates.length, candidateOk });
    }

    const requestedBatchIds = new Set();
    let batchOk = 0;
    let batchDone = 0;
    let batchNotFound = 0;
    let batchRequestAttempts = 0;
    const batchErrors = [];
    const batchStatusCounts = {};

    // A status response can expose additional batch IDs. Process the history as
    // a growing queue so nested/linked batches are not missed after the initial
    // project graph has been parsed.
    while (requestedBatchIds.size < MAX_BATCH_REQUESTS) {
      const remainingCapacity = MAX_BATCH_REQUESTS - requestedBatchIds.size;
      const pendingBatchIds = [...knownBatchIds]
        .filter((batchId) => !requestedBatchIds.has(batchId))
        .slice(0, remainingCapacity);
      if (!pendingBatchIds.length) break;
      for (const batchId of pendingBatchIds) requestedBatchIds.add(batchId);

      await mapLimit(pendingBatchIds, BATCH_CONCURRENCY, async (batchId) => {
        const url = `https://api.weavy.ai/api/v1/batches/recipes/${encodeURIComponent(projectId)}/batches/${encodeURIComponent(batchId)}/status`;
        const result = await fetchCandidate(url, authTemplate, scanId, "batch-history");
        batchDone += 1;
        batchRequestAttempts += Number(result.attempts || 1);
        const statusKey = String(result.status || 0);
        batchStatusCounts[statusKey] = Number(batchStatusCounts[statusKey] || 0) + 1;
        if (result.ok) batchOk += 1;
        else if (result.status === 404) batchNotFound += 1;
        else batchErrors.push({ batchId, status: result.status || 0, attempts: result.attempts || 1, reason: result.reason || null });
        if (batchDone % 10 === 0 || batchDone === requestedBatchIds.size) {
          postProgress(scanId, "fetching-batches", {
            batchDone,
            batchTotal: Math.min(MAX_BATCH_REQUESTS, Math.max(requestedBatchIds.size, knownBatchIds.size)),
            batchOk,
            batchLimited: knownBatchIds.size > MAX_BATCH_REQUESTS
          });
        }
        return result;
      });
    }

    const result = {
      scanId,
      projectId,
      elapsedMs: Date.now() - startedAt,
      replayedPayloads: replayBuffer.length,
      observedRequests: requestTemplates.size,
      replayedRequests: templates.length,
      replayedOk,
      candidateStatuses,
      candidateOk,
      knownBatchIds: knownBatchIds.size,
      requestedBatches: requestedBatchIds.size,
      batchOk,
      batchNotFound,
      batchRequestAttempts,
      batchStatusCounts,
      batchLimited: knownBatchIds.size > MAX_BATCH_REQUESTS,
      batchErrors: batchErrors.slice(0, 100),
      bridgeTruncations,
      oversizedResponsesSkipped,
      limits: { maxTextLength: MAX_TEXT_LENGTH, maxPriorityArrayItems: MAX_PRIORITY_ARRAY_ITEMS, maxBatchRequests: MAX_BATCH_REQUESTS },
      capturedUrls: [...capturedUrls].slice(0, 500),
      authTemplate: authTemplate ? publicTemplateSummary(authTemplate) : null,
      completedAt: new Date().toISOString()
    };
    postEnvelope("scan-complete", result);
    return result;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.channel !== CHANNEL || message.type !== "command") return;

    if (message.command === "ping") {
      postEnvelope("hook-ready", {
        bufferedPayloads: replayBuffer.length,
        observedRequests: requestTemplates.size,
        knownBatchIds: knownBatchIds.size,
        at: new Date().toISOString()
      });
      return;
    }
    if (message.command === "replay") {
      for (const envelope of replayBuffer) window.postMessage({ ...envelope, replayed: true }, "*");
      return;
    }
    if (message.command === "clear-buffer") {
      replayBuffer.length = 0;
      knownBatchIds.clear();
      capturedUrls.clear();
      return;
    }
    if (message.command === "active-scan") {
      const projectId = String(message.projectId || "").trim();
      const scanId = String(message.scanId || nextTraceId("scan"));
      if (activeScanPromise) {
        postProgress(scanId, "already-running", { projectId });
        return;
      }
      activeScanPromise = activeScan(projectId, scanId)
        .catch((error) => {
          postEnvelope("scan-error", {
            scanId,
            projectId,
            message: String(error?.message || error),
            at: new Date().toISOString()
          });
        })
        .finally(() => { activeScanPromise = null; });
    }
  });

  postEnvelope("hook-ready", {
    bufferedPayloads: replayBuffer.length,
    observedRequests: requestTemplates.size,
    knownBatchIds: knownBatchIds.size,
    at: new Date().toISOString()
  });
})();
