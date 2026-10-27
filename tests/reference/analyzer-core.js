(function initWeavyProjectAnalyzer(root) {
  "use strict";

  const MODEL_VALUE_KEYS = new Set([
    "model", "modelname", "modelslug", "modelkey", "modelpath", "modelversion",
    "providermodel", "providermodelslug", "selectedmodel", "selectedmodelname",
    "aimodel", "generatormodel", "engine", "checkpoint", "endpoint", "endpointid",
    "service"
  ]);
  const MODEL_ID_KEYS = new Set(["modelid", "providermodelid", "aimodelid"]);
  const NODE_ID_KEYS = new Set(["nodeid", "blockid", "componentid", "graphnodeid", "operatorid", "toolnodeid"]);
  const EXECUTION_ID_KEYS = new Set([
    "generationid", "predictionid", "jobid", "executionid", "runid", "taskid",
    "operationid", "inferenceid", "renderid"
  ]);
  const STATUS_KEYS = new Set(["status", "state", "jobstatus", "generationstatus", "predictionstatus", "executionstatus"]);
  const TIME_KEYS = new Set([
    "createdat", "generatedat", "completedat", "finishedat", "updatedat", "timestamp",
    "createdtime", "completiontime", "startedat"
  ]);
  const CREDIT_KEYS = new Set([
    "creditcost", "creditscost", "costincredits", "priceincredits", "creditsused", "usedcredits",
    "chargedcredits", "creditscharged", "debitcredits", "generationcredits", "runcredits", "totalcredits",
    "billingcredits", "spentcredits", "creditsspent", "creditprice", "creditsprice", "creditamount",
    "creditsamount", "creditsconsumed", "consumedcredits", "credits", "credit"
  ]);

  const SUCCESS_RE = /^(?:success|successful|succeeded|complete|completed|done|finished|ready|fulfilled|processed)$/i;
  const PENDING_RE = /^(?:pending|queued|queue|running|processing|started|in[_ -]?progress|waiting)$/i;
  const FAILED_RE = /^(?:fail|failed|error|errored|cancelled|canceled|rejected|aborted)$/i;
  const OUTPUT_KEY_RE = /^(?:output|outputs|result|results|generatedmedia|generatedasset|media|asset|assets|file|files|outputurl|imageurl|videourl|audiourl)$/i;
  const OUTPUT_URL_KEY_RE = /^(?:url|uri|href|src|downloadurl|fileurl|imageurl|videourl|audiourl)$/i;
  const PARAM_KEY_RE = /(?:duration|seconds?|milliseconds?|length|resolution|width|height|size|quality|mode|tier|variant|version|speed|fps|frames?|aspect|ratio|format|count|batchsize|numoutputs?|numberofoutputs?|outputs?count|megapixels?|steps?|samples?|enableaudio|generateaudio|keepaudio|audio)/i;
  const SENSITIVE_KEY_RE = /(?:authorization|cookie|token|secret|password|session|credential|api.?key|prompt|negative.?prompt|base64)/i;
  const TEMPLATE_PATH_RE = /(?:templates?|node-definitions|subflowtemplates?|workspaceSubflowTemplates)/i;
  const NON_PROJECT_URL_RE = /(?:node-definitions|subflow-templates|workspace-subflow|\/models(?:\/|$|[?#])|model-catalog|catalog|pricing|public-models)/i;
  const GENERIC_MODEL_VALUES = new Set([
    "image", "video", "audio", "model", "generator", "node", "tool", "unknown", "default",
    "fal", "fal ai", "replicate", "imported", "imported model", "custom model", "generic model",
    "llm", "any model", "fal imported", "any llm"
  ]);
  const INTERNAL_MODEL_WRAPPER_COMPACT = new Set([
    "falimported", "anyllm", "importedmodel", "custommodel", "genericmodel",
    "modelwrapper", "llmwrapper", "falmodel", "replicatemodel"
  ]);
  const MAX_OBJECTS = 500_000;
  const MAX_DEPTH = 32;
  const MAX_PARAM_DEPTH = 9;
  const MAX_PARAM_ARRAY_ITEMS = 300;
  const MAX_DIAGNOSTICS = 1_500;
  const PRIORITY_KEY_RE = /^(?:nodes?|blocks?|components?|operators?|generations?|generationhistory|mediahistory|outputshistory|reciperuns?|noderuns?|runs?|results?|outputs?|data|kind|model|input|params|parameters|settings|options|config|metadata|pricing|prices?|credits?)$/i;

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }


  function isParamKey(value) {
    const key = normalizeKey(value);
    return key === "mp" || PARAM_KEY_RE.test(key);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9а-яё]+/gi, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function normalizeModelIdentity(value) {
    return normalizeText(value)
      .replace(/\b(?:fal ai|replicate|black forest labs|google|openai|bytedance|runway|luma|kling ai)\b/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function stableHash(input) {
    let hash = 2166136261;
    const text = String(input || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value);
    if (typeof value !== "string") return null;
    const match = value.trim().replace(",", ".").match(/^[-+]?(\d+(?:\.\d+)?)\s*(?:credits?|cr|кредит(?:а|ов)?)?$/i);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) ? Math.abs(number) : null;
  }

  function safeIsoDate(value) {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const text = String(value);
    if (/^\d{10,13}$/.test(text)) {
      const ms = text.length === 10 ? Number(text) * 1000 : Number(text);
      if (Number.isFinite(ms)) return new Date(ms).toISOString();
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }

  function sanitizeSourceUrl(value) {
    if (typeof value !== "string") return "";
    try {
      const url = new URL(value, "https://app.weavy.ai/");
      for (const key of [...url.searchParams.keys()]) {
        if (/token|secret|key|auth|signature/i.test(key)) url.searchParams.set(key, "[REDACTED]");
      }
      url.hash = "";
      return url.href.slice(0, 1_200);
    } catch {
      return value.slice(0, 1_200);
    }
  }

  function buildCatalogIndex(catalog) {
    const exact = new Map();
    const entries = Array.isArray(catalog?.entries) ? catalog.entries : [];
    for (const entry of entries) {
      for (const alias of [entry.name, ...(entry.aliases || [])]) {
        const normalized = normalizeModelIdentity(alias);
        if (normalized) exact.set(normalized, entry);
      }
    }
    return { exact, entries };
  }

  function isInternalModelWrapper(value) {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    const compact = normalized.replace(/\s+/g, "");
    if (GENERIC_MODEL_VALUES.has(normalized) || INTERNAL_MODEL_WRAPPER_COMPACT.has(compact)) return true;
    return /^(?:(?:fal|replicate|openrouter)\s*)?(?:imported|generic|custom|any)\s*(?:ai\s*)?(?:model|llm)?$/.test(normalized);
  }

  function plausibleUnknownModel(value) {
    if (typeof value !== "string") return false;
    const text = value.trim();
    if (text.length < 3 || text.length > 180) return false;
    const normalized = normalizeText(text);
    if (!normalized || isInternalModelWrapper(text)) return false;
    if (/^[0-9a-f]{16,}$/i.test(text.replace(/[-_]/g, ""))) return false;
    if (/^https?:\/\//i.test(text)) return false;
    return /[a-zа-яё]/i.test(text);
  }

  function modelCandidateScore(candidate, sourceKey = "") {
    if (!candidate) return Number.NEGATIVE_INFINITY;
    if (isInternalModelWrapper(candidate.raw) || isInternalModelWrapper(candidate.canonical)) return -10_000;
    let score = 0;
    if (candidate.entry) score += 1_000;
    const resolvedBy = String(candidate.resolvedBy || "");
    if (resolvedBy === "catalog-exact") score += 260;
    else if (resolvedBy === "catalog-slug") score += 230;
    else if (resolvedBy === "known-provider-slug") score += 220;
    else if (resolvedBy === "model-id-map") score += 190;
    else if (resolvedBy === "catalog-object") score += 170;
    else if (resolvedBy === "raw-model-field") score += 40;

    const rawSourceKey = String(sourceKey || candidate.sourceKey || "");
    const key = normalizeKey(rawSourceKey);
    if (/(?:modelversion|modelslug|modelkey|providermodel|selectedmodel|checkpoint|engine|endpoint|version|slug)/.test(key)) score += 100;
    else if (/(?:displayname|modelname|name|title)/.test(key)) score += 70;
    else if (/(?:service|provider)/.test(key)) score += 20;
    else if (key === "id" || key.endsWith("id")) score -= 10;

    // A model slug inside the model-specific part of a graph node is stronger
    // evidence than generic node metadata such as data.version. Weavy recipes
    // can keep an old/internal version value next to the currently selected
    // provider model, so treating both fields as equal collapses mixed projects
    // into whichever model happened to win the global alias map.
    if (/(?:^|\.)(?:data\.)?kind\.model(?:\.|$)/i.test(rawSourceKey)) score += 420;
    else if (/(?:^|\.)data\.model(?:\.|$)/i.test(rawSourceKey)) score += 380;
    else if (/(?:^|\.)(?:input|params|parameters|settings|config)\.(?:selected)?model(?:\.|$)/i.test(rawSourceKey)) score += 350;
    else if (/(?:^|\.)model(?:\.|$)/i.test(rawSourceKey)) score += 320;

    if (/^(?:data\.)?version$/i.test(rawSourceKey)) score -= 450;
    if (resolvedBy === "model-id-map" && !/(?:modelid|providermodelid|aimodelid|modelslug|modelkey|modelpath|providermodel|selectedmodel|endpointid)/.test(key)) {
      score -= 400;
    }

    const raw = String(candidate.raw || "");
    if (/[/:]/.test(raw)) score += 30;
    if (/nano[-_ /]?banana|gemini|gpt[-_ /]?image|seedance|kling|flux|recraft|imagen|runway|luma|veo|wan|hunyuan|topaz|magnific/i.test(raw)) score += 25;
    const identity = normalizeModelIdentity(`${candidate.raw || ""} ${candidate.canonical || ""}`);
    if (/\b(?:chatgpt images? 2(?: 0)?|gpt images? 2)\b/.test(identity)) score += 140;
    if (/\bgpt images? 1\b/.test(normalizeModelIdentity(candidate.canonical || "")) && /\bgpt images? 2\b/.test(normalizeModelIdentity(candidate.raw || ""))) score -= 1_200;
    return score;
  }

  function isGptImage2Evidence(value) {
    const text = normalizeModelIdentity(value);
    return /\b(?:chatgpt images? 2(?: 0)?|gpt images? 2)\b/.test(text);
  }

  function isGptImage1Evidence(value) {
    const text = normalizeModelIdentity(value);
    return /\b(?:chatgpt images? 1(?: 0| 5)?|gpt images? 1(?: 0| 5)?)\b/.test(text);
  }

  function hasEditEvidence(value) {
    return /\b(?:edit|editing|editor|image edit)\b/.test(normalizeText(value));
  }

  function chooseBestModel(candidates) {
    const scored = (candidates || [])
      .filter(Boolean)
      .map((candidate, index) => ({
        candidate,
        index,
        score: Number.isFinite(candidate.confidence)
          ? candidate.confidence
          : modelCandidateScore(candidate, candidate.sourceKey)
      }))
      .filter((item) => item.score > -1_000)
      .sort((a, b) => b.score - a.score || Number(Boolean(b.candidate.entry)) - Number(Boolean(a.candidate.entry)) || a.index - b.index);
    if (!scored.length) return null;

    // A confirmed GPT Image 2 candidate may suppress only an obsolete GPT Image
    // 1 candidate. It must not suppress Nano Banana, Kling, Seedance, or any
    // other unrelated model family.
    const gpt2 = scored.filter((item) => item.candidate.entry && isGptImage2Evidence(`${item.candidate.raw || ""} ${item.candidate.canonical || ""}`));
    const pool = gpt2.length
      ? scored.filter((item) => {
          const evidence = `${item.candidate.raw || ""} ${item.candidate.canonical || ""}`;
          return !isGptImage1Evidence(evidence) || isGptImage2Evidence(evidence);
        })
      : scored;
    const best = pool[0];
    return { ...best.candidate, confidence: best.score };
  }

  function unresolvedModelInfo(raw = "") {
    return {
      raw: raw || "",
      canonical: "Модель не определена",
      entry: null,
      resolvedBy: "unresolved",
      sourceKey: "",
      confidence: 0
    };
  }

  function looksLikeMediaFileLabel(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    return /\.(?:avif|bmp|gif|heic|jpe?g|png|svg|tiff?|webp|mp4|mov|mkv|webm|mp3|wav|m4a)(?:[?#].*)?$/i.test(text)
      || /^(?:https?:|blob:|data:)/i.test(text);
  }

  function isStableModelAliasField(key, value) {
    if (typeof value !== "string" && typeof value !== "number") return false;
    const normalized = normalizeKey(key);
    const text = String(value).trim();
    if (!text || text.length > 260 || isInternalModelWrapper(text)) return false;
    if (MODEL_ID_KEYS.has(normalized)) return text.length >= 6;
    if (normalized === "id") return text.length >= 6 && !/^\d+(?:\.\d+)*$/.test(text);
    if (/^(?:modelslug|modelkey|modelpath|providermodel|providermodelslug|endpoint|endpointid|engine|checkpoint|slug)$/.test(normalized)) {
      return /[/:_-]/.test(text)
        || /nano.?banana|gemini|gpt.?image|seedance|kling|flux|recraft|imagen|runway|luma|veo|wan|hunyuan|topaz|magnific/i.test(text);
    }
    return false;
  }


  function collectModelEvidence(value, depth = 0, seen = new WeakSet(), keyHint = "") {
    if (value == null || depth > 5) return [];
    if (typeof value === "string" || typeof value === "number") {
      const key = normalizeKey(keyHint);
      if (!keyHint || /(?:model|version|slug|endpoint|engine|provider|service|displayname|modelname|selectedmodel|title|label|name|type|tool)/.test(key)) {
        return [String(value).slice(0, 400)];
      }
      return [];
    }
    if (typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);
    if (Array.isArray(value)) {
      return value.slice(0, 20).flatMap((item) => collectModelEvidence(item, depth + 1, seen, keyHint));
    }
    const evidence = [];
    for (const [key, child] of Object.entries(value)) {
      const normalized = normalizeKey(key);
      if (/(?:schema|jsonschema|definitions?|properties|enum|oneof|anyof|allof|available|supported|choices|catalog)/.test(normalized)) continue;
      evidence.push(...collectModelEvidence(child, depth + 1, seen, key));
      if (evidence.length >= 300) break;
    }
    return evidence.slice(0, 300);
  }

  function refineGptImageFamily(modelInfo, contexts, catalogIndex) {
    // Strict GPT Image resolver:
    // Never upgrade a model only because a filename, neighboring node,
    // or unrelated context mentions GPT Image. This was the source of
    // projects where all generations became ChatGPT Images 2.0 Edit.
    if (!modelInfo) return modelInfo;

    const direct = normalizeText(
      `${modelInfo.raw || ""} ${modelInfo.canonical || ""} ${modelInfo.sourceKey || ""}`
    );

    const hasExplicitGpt2 = /\bgpt[- _]?image[- _]?2\b|openai gpt image 2|chatgpt images 2/.test(direct);
    if (!hasExplicitGpt2) return modelInfo;

    const edit = hasEditEvidence(direct);
    const wanted = edit ? "ChatGPT Images 2.0 Edit" : "ChatGPT Images 2.0";
    const entry = catalogIndex.exact.get(normalizeModelIdentity(wanted));
    if (!entry) return modelInfo;

    return {
      ...modelInfo,
      canonical: entry.name,
      entry,
      resolvedBy: modelInfo.resolvedBy || "explicit-gpt-image-2-id",
      confidence: Math.max(Number(modelInfo.confidence || 0), 100)
    };
  }

  function createModelResolver(catalogIndex, modelIdMap) {
    const entryByCanonical = (name) => catalogIndex.exact.get(normalizeModelIdentity(name)) || null;

    function knownProviderSlug(raw, options = {}) {
      const normalized = normalizeModelIdentity(raw);

      // normalizeModelIdentity removes slashes and dashes, therefore provider
      // endpoints must be matched in their normalized form (for example
      // "openai/gpt-image-2/edit" becomes "openai gpt image 2 edit").
      if (isGptImage2Evidence(normalized)) {
        const edit = hasEditEvidence(`${normalized} ${options.sourceKey || ""}`) || Boolean(options.editHint);
        const entry = entryByCanonical(edit ? "ChatGPT Images 2.0 Edit" : "ChatGPT Images 2.0");
        if (entry) return { raw, canonical: entry.name, entry, resolvedBy: "known-provider-slug" };
      }

      const rules = [
        [/\bnano banana 2\b|\bgemini 3 1 flash\b/, "Gemini 3.1 Flash (Nano Banana 2)"],
        [/\bnano banana pro\b|\bgemini 3 pro\b/, "Gemini 3 Pro"],
        [/\bgpt images? 1 5 edit\b/, "GPT Image 1.5 Edit"],
        [/\bgpt images? 1 edit\b/, "GPT Image 1 Edit"],
        [/\bgpt images? 1\b/, "GPT Image 1"],
        [/\bseedream v4 5 edit\b/, "Seedream V4.5 Edit"],
        [/\bflux 2 max\b/, "Flux 2 Max"],
        [/\bflux 2 pro\b/, "Flux 2 Pro"]
      ];
      for (const [pattern, canonical] of rules) {
        if (!pattern.test(normalized)) continue;
        const entry = entryByCanonical(canonical);
        if (entry) return { raw, canonical: entry.name, entry, resolvedBy: "known-provider-slug" };
      }
      return null;
    }


    function looksLikeImportedWrapperObject(raw) {
      const text = normalizeText(raw);
      return /\b(?:fal imported|fal_imported|imported model|custom model|external model|generic model)\b/.test(text) || text === "fal";
    }

    function resolvePrimitive(value, options = {}) {
      if (typeof value !== "string" && typeof value !== "number") return null;
      const raw = String(value).trim();
      if (!raw || raw.length > 260) return null;

      const normalized = normalizeModelIdentity(raw);
      if (!normalized || isInternalModelWrapper(raw)) return null;
      // Imported/custom wrappers must never be guessed as a nearby catalog model.
      // Only an explicit provider slug/version is allowed to resolve them.
      if (looksLikeImportedWrapperObject(raw) && !/[\/:_\-]/.test(raw)) {
        if (options.allowUnknown) {
          return { raw, canonical: "Imported model", entry: null, resolvedBy: "imported-unknown", sourceKey: options.sourceKey || "", confidence: 1 };
        }
        return null;
      }
      const exact = catalogIndex.exact.get(normalized);
      if (exact) {
        return chooseBestModel([{ raw, canonical: exact.name, entry: exact, resolvedBy: "catalog-exact", sourceKey: options.sourceKey || "" }]);
      }

      if (options.explicitModelField && !looksLikeImportedWrapperObject(raw)) {
        const matches = [];
        for (const [alias, entry] of catalogIndex.exact) {
          if (alias.length < 4) continue;
          const bounded = ` ${normalized} `;
          if (bounded.includes(` ${alias} `) || normalized.endsWith(` ${alias}`) || normalized.startsWith(`${alias} `)) matches.push(entry);
        }
        const unique = [...new Map(matches.map((entry) => [entry.name, entry])).values()];
        if (unique.length === 1) {
          return chooseBestModel([{ raw, canonical: unique[0].name, entry: unique[0], resolvedBy: "catalog-slug", sourceKey: options.sourceKey || "" }]);
        }
      }

      const provider = knownProviderSlug(raw, options);
      if (provider) return chooseBestModel([{ ...provider, sourceKey: options.sourceKey || "" }]);

      // Resolve semantic model names/slugs before consulting the internal ID map.
      // A stale or overly broad alias must never override an explicit model value.
      if (modelIdMap.has(raw)) {
        const mapped = modelIdMap.get(raw);
        const mappedResult = {
          ...mapped,
          raw: mapped.raw || raw,
          matchedValue: raw,
          resolvedBy: "model-id-map",
          sourceKey: options.sourceKey || mapped.sourceKey || ""
        };
        const chosen = refineGptImageFamily(chooseBestModel([mappedResult]), [raw], catalogIndex);
        if (chosen) return chosen;
      }

      if (options.allowUnknown && plausibleUnknownModel(raw)) {
        return chooseBestModel([{ raw, canonical: raw, entry: null, resolvedBy: "raw-model-field", sourceKey: options.sourceKey || "" }]);
      }
      return null;
    }

    function resolveValue(value, options = {}, depth = 0, seen = new WeakSet()) {
      if (typeof value === "string" || typeof value === "number") {
        return resolvePrimitive(value, options);
      }
      if (!value || typeof value !== "object" || depth > 4 || seen.has(value)) return null;
      seen.add(value);
      const candidates = [];
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 20)) {
          const resolved = resolveValue(item, options, depth + 1, seen);
          if (resolved) candidates.push(resolved);
        }
        return chooseBestModel(candidates);
      }

      const fieldOrder = [
        "modelVersion", "version", "modelSlug", "slug", "modelKey", "providerModel",
        "selectedModel", "engine", "checkpoint", "endpoint", "displayName", "modelName",
        "selectedModelName", "title", "name", "service", "key", "id"
      ];
      for (const key of fieldOrder) {
        if (value[key] == null) continue;
        const resolved = resolvePrimitive(value[key], {
          ...options,
          explicitModelField: true,
          sourceKey: options.sourceKey ? `${options.sourceKey}.${key}` : key
        });
        if (resolved) candidates.push(resolved);
      }
      for (const key of ["model", "providerModel", "selectedModel", "definition", "kind", "config"]) {
        const child = value[key];
        if (!child || typeof child !== "object") continue;
        const resolved = resolveValue(child, {
          ...options,
          explicitModelField: true,
          sourceKey: options.sourceKey ? `${options.sourceKey}.${key}` : key
        }, depth + 1, seen);
        if (resolved) candidates.push(resolved);
      }
      return chooseBestModel(candidates);
    }

    return { resolvePrimitive, resolveValue };
  }

  function classifyStatus(status) {
    const normalized = normalizeText(status).replace(/ /g, "_");
    if (!normalized) return "unknown";
    if (SUCCESS_RE.test(normalized)) return "success";
    if (PENDING_RE.test(normalized)) return "pending";
    if (FAILED_RE.test(normalized)) return "failed";
    return "unknown";
  }

  function extractStatus(obj) {
    for (const [key, value] of Object.entries(obj || {})) {
      if (!STATUS_KEYS.has(normalizeKey(key))) continue;
      if (typeof value === "string" || typeof value === "number") return String(value).trim();
    }
    return "";
  }

  function extractTimestamp(...objects) {
    for (const obj of objects) {
      if (!obj || typeof obj !== "object") continue;
      for (const [key, value] of Object.entries(obj)) {
        if (!TIME_KEYS.has(normalizeKey(key))) continue;
        const parsed = safeIsoDate(value);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  function extractNodeId(obj) {
    if (!obj || typeof obj !== "object") return null;
    for (const [key, value] of Object.entries(obj)) {
      if (!NODE_ID_KEYS.has(normalizeKey(key))) continue;
      if (typeof value === "string" || typeof value === "number") return String(value).trim();
    }
    return null;
  }

  function extractBatchId(obj, sourceUrl = "") {
    const candidates = [];
    const visit = (value, depth, seen) => {
      if (value == null || depth > 4) return;
      if (typeof value !== "object") return;
      if (seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 30)) visit(item, depth + 1, seen);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (normalizeKey(key) === "batchid" && (typeof child === "string" || typeof child === "number")) {
          const id = String(child).trim();
          if (id) candidates.push(id);
        }
        if (/^(?:input|output|result|data|metadata|generation)$/i.test(key)) visit(child, depth + 1, seen);
      }
    };
    visit(obj, 0, new WeakSet());
    if (candidates.length) return candidates[0];
    const match = String(sourceUrl || "").match(/\/batches\/([^/?#]+)\/status/i);
    return match?.[1] || null;
  }

  function extractExecutionIds(obj) {
    const ids = [];
    for (const [key, value] of Object.entries(obj || {})) {
      const normalized = normalizeKey(key);
      if (!EXECUTION_ID_KEYS.has(normalized)) continue;
      if (typeof value !== "string" && typeof value !== "number") continue;
      const id = String(value).trim();
      if (id && id.length <= 260) ids.push(`${normalized}:${id}`);
    }
    return [...new Set(ids)];
  }

  function extractExplicitCharge(obj) {
    if (!obj || typeof obj !== "object") return null;
    const containers = [{ value: obj, label: "root" }];
    for (const [key, value] of Object.entries(obj)) {
      const normalized = normalizeKey(key);
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      if (/(usage|billing|charge|cost|pricing|price|credits?)/.test(normalized)) containers.push({ value, label: key });
    }
    for (const container of containers) {
      const unit = normalizeText([
        container.value.unit, container.value.currency, container.value.measure,
        container.value.kind, container.value.type
      ].filter((item) => typeof item === "string").join(" "));
      const creditUnit = /credit|кредит|\bcr\b/i.test(unit);
      for (const [key, value] of Object.entries(container.value)) {
        const normalized = normalizeKey(key);
        if (CREDIT_KEYS.has(normalized)) {
          const parsed = parseNumber(value);
          if (parsed != null) return { value: parsed, key: `${container.label}.${key}` };
        }
        if (creditUnit && /^(?:amount|value|total|cost|price|used|spent|charged)$/.test(normalized)) {
          const parsed = parseNumber(value);
          if (parsed != null) return { value: parsed, key: `${container.label}.${key}` };
        }
      }
    }
    return null;
  }

  function extractLiveCreditRange(obj) {
    const values = new Set();
    const seen = new WeakSet();
    const visit = (value, keyHint, depth, parent) => {
      if (value == null || depth > 6) return;
      if (typeof value === "number" || typeof value === "string") {
        const normalized = normalizeKey(keyHint);
        if (CREDIT_KEYS.has(normalized) || /credits?/.test(normalized)) {
          const parsed = parseNumber(value);
          if (parsed != null && parsed <= 100_000) values.add(parsed);
        } else if (/^(?:amount|value|total|cost|price)$/.test(normalized)) {
          const unit = normalizeText(parent?.unit || parent?.currency || parent?.measure || "");
          if (/credit|кредит|\bcr\b/.test(unit)) {
            const parsed = parseNumber(value);
            if (parsed != null && parsed <= 100_000) values.add(parsed);
          }
        }
        return;
      }
      if (typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 200)) visit(item, keyHint, depth + 1, parent);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key)) continue;
        visit(child, key, depth + 1, value);
      }
    };
    visit(obj, "", 0, null);
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return null;
    return { min: sorted[0], max: sorted[sorted.length - 1], values: sorted.slice(0, 100) };
  }

  function extractOutputRefs(obj) {
    const refs = [];
    const seen = new WeakSet();
    const visit = (value, keyHint, depth, insideOutput) => {
      if (value == null || depth > 5 || refs.length >= 100) return;
      const isOutput = insideOutput || OUTPUT_KEY_RE.test(keyHint || "");
      if (typeof value === "string") {
        if ((isOutput || OUTPUT_URL_KEY_RE.test(keyHint || "")) && /^(?:https?:|blob:)/i.test(value) && !/^data:/i.test(value)) {
          try {
            const url = new URL(value);
            url.search = "";
            url.hash = "";
            refs.push(url.href.slice(0, 900));
          } catch {
            refs.push(value.slice(0, 900));
          }
        }
        return;
      }
      if (typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 100)) visit(item, keyHint, depth + 1, isOutput);
        return;
      }
      for (const [key, child] of Object.entries(value)) visit(child, key, depth + 1, isOutput);
    };
    visit(obj, "", 0, false);
    return [...new Set(refs)];
  }

  function collectParams(obj, inherited = {}) {
    const params = { ...inherited };
    const seen = new WeakSet();
    const visit = (value, prefix, depth) => {
      if (value == null || depth > MAX_PARAM_DEPTH) return;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        if (isParamKey(prefix)) params[prefix] = value;
        return;
      }
      if (typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        const limit = Math.min(value.length, MAX_PARAM_ARRAY_ITEMS);
        for (let index = 0; index < limit; index += 1) visit(value[index], `${prefix}[${index}]`, depth + 1);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key)) continue;
        visit(child, prefix ? `${prefix}.${key}` : key, depth + 1);
      }
    };
    for (const key of ["params", "parameters", "settings", "options", "config", "metadata", "input", "output", "result", "data"]) {
      const value = obj?.[key];
      if (value && typeof value === "object") visit(value, key, 0);
    }
    for (const [key, value] of Object.entries(obj || {})) {
      if (isParamKey(key)) visit(value, key, 0);
    }
    return params;
  }

  function normalizeResolutionToken(value) {
    const compact = normalizeText(value).replace(/\s+/g, "");
    if (!compact) return "";
    if (/^(?:hd|720p?)$/.test(compact)) return "720";
    if (/^(?:fhd|fullhd|1080p?)$/.test(compact)) return "1080";
    if (/^(?:qhd|1440p?)$/.test(compact)) return "1440";
    if (/^(?:uhd|4k|2160p?)$/.test(compact)) return compact === "2160" || compact === "2160p" ? "2160" : "4k";
    const k = compact.match(/^([1-8](?:\.\d+)?)k$/);
    if (k) return `${Number(k[1])}k`;
    const p = compact.match(/^(360|480|540|580|720|1080|1440|2160|3840)p?$/);
    if (p) return p[1];
    const dimension = compact.match(/^(\d{3,5})[x×](\d{3,5})$/);
    if (dimension) return `${Number(dimension[1])}x${Number(dimension[2])}`;
    return compact;
  }

  function inferImageResolutionTier(width, height) {
    const w = Math.round(Number(width));
    const h = Math.round(Number(height));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 64 || h < 64) return "";
    const longSide = Math.max(w, h);
    // Weavy's 1K/2K/4K image tiers scale with the generated image dimensions.
    // Wide outputs such as 3168x1344 are a 2K tier, while 6336x2688 are 4K.
    if (longSide >= 3500) return "4k";
    if (longSide >= 1750) return "2k";
    if (longSide >= 900) return "1k";
    return "";
  }

  function isSchemaParamPath(path) {
    return /(?:^|\.)(?:schema|jsonschema|definitions?|properties|enum|oneof|anyof|allof)(?:\.|\[|$)/i.test(String(path || ""));
  }


  function normalizeQualityValue(value) {
    const text = normalizeText(value);
    const found = ["low", "medium", "high"].filter((quality) => new RegExp(`\\b${quality}\\b`, "i").test(text));
    return found.length === 1 ? found[0] : "";
  }

  function qualityPathPriority(path) {
    const text = String(path || "").toLowerCase();
    if (isSchemaParamPath(text)) return -100;
    if (/(?:__nodecurrent|currentparams|defaults?|available|supported|choices|menu|definition|kind\.model)/i.test(text)) return -80;
    if (/(?:^|\.)(?:input|params|parameters|request|payload|settings)(?:\.|\[|$)/i.test(text)) return 120;
    if (/(?:^|\.)(?:output|result|metadata)(?:\.|\[|$)/i.test(text)) return 100;
    if (/(?:^|\.)quality$/i.test(text)) return 110;
    return 50;
  }

  function dimensionPathPriority(path) {
    const text = String(path || "").toLowerCase();
    if (isSchemaParamPath(text)) return -100;
    if (/(?:^|\.)(?:output|outputs|result|results|generatedmedia|generatedasset|generation|generations|asset|assets|media|enrichment)(?:\.|\[|$)/i.test(text)) return 100;
    if (/(?:reference|source|mask|control|prompt|inputimage|inputvideo|image[_ -]?\d+|video[_ -]?\d+)/i.test(text)) return 10;
    if (/(?:^|\.)input(?:\.|\[|$)/i.test(text) && !/(?:resolution|outputsize|quality|mode)/i.test(text)) return 15;
    return 50;
  }

  function addDimensionToCanonical(canonical, width, height, addTier = true) {
    const w = Math.round(Number(width));
    const h = Math.round(Number(height));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 64 || h < 64 || w > 50_000 || h > 50_000) return;
    canonical.widths.add(w);
    canonical.heights.add(h);
    canonical.dimensions.add(`${w}x${h}`);
    canonical.dimensions.add(`${h}x${w}`);
    canonical.resolutions.add(`${w}x${h}`);
    canonical.resolutions.add(`${h}x${w}`);
    canonical.megapixels.add(Number(((w * h) / 1_000_000).toFixed(3)));

    const shortSide = Math.min(w, h);
    const longSide = Math.max(w, h);
    const common = [360, 480, 540, 580, 720, 1080, 1440, 2160, 3840];
    for (const target of common) {
      if (Math.abs(shortSide - target) <= Math.max(8, target * 0.025) || Math.abs(longSide - target) <= Math.max(8, target * 0.025)) {
        canonical.resolutions.add(String(target));
      }
    }
    if (addTier) {
      const tier = inferImageResolutionTier(w, h);
      if (tier) canonical.resolutions.add(tier);
    }
  }

  function canonicalParams(params, modelRaw) {
    const canonical = {
      durations: new Set(),
      resolutions: new Set(),
      modes: new Set(),
      widths: new Set(),
      heights: new Set(),
      dimensions: new Set(),
      megapixels: new Set(),
      outputCounts: new Set(),
      audio: new Set(),
      qualities: new Set(),
      qualityAmbiguous: false,
      qualityEvidence: [],
      text: ""
    };
    const fragments = [];
    const dimensionParts = new Map();
    const dimensionCandidates = [];
    const explicitTierCandidates = [];
    const qualityCandidates = [];

    const addDuration = (value, keyText = "") => {
      let numeric = Number(String(value).replace(",", "."));
      if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 86_400_000) return;
      if (/millisecond|\bms\b/.test(keyText)) numeric /= 1000;
      canonical.durations.add(Number(numeric.toFixed(3)));
    };

    const addResolutionValue = (value, keyPath = "") => {
      if (isSchemaParamPath(keyPath)) return;
      const rawText = String(value ?? "");
      const normalized = normalizeResolutionToken(rawText);
      const priority = dimensionPathPriority(keyPath);
      if (/^(?:1k|2k|4k)$/.test(normalized)) explicitTierCandidates.push({ tier: normalized, priority });
      else if (/^(?:[3-8](?:\.\d+)?k|360|480|540|580|720|1080|1440|2160|3840)$/.test(normalized)) canonical.resolutions.add(normalized);
      for (const match of rawText.matchAll(/\b([1-8](?:\.\d+)?)\s*k\b/gi)) {
        const tier = `${Number(match[1])}k`;
        if (/^(?:1k|2k|4k)$/.test(tier)) explicitTierCandidates.push({ tier, priority });
        else canonical.resolutions.add(tier);
      }
      for (const match of rawText.matchAll(/\b(360|480|540|580|720|1080|1440|2160|3840)\s*p?\b/gi)) canonical.resolutions.add(match[1]);
      for (const match of rawText.matchAll(/\b(\d{3,5})\s*[x×]\s*(\d{3,5})\b/gi)) {
        dimensionCandidates.push({ width: Number(match[1]), height: Number(match[2]), priority, path: keyPath });
      }
      const normalizedText = normalizeText(rawText);
      if (/\bfull hd\b|\bfhd\b/.test(normalizedText)) canonical.resolutions.add("1080");
      if (/\buhd\b/.test(normalizedText)) { canonical.resolutions.add("2160"); explicitTierCandidates.push({ tier: "4k", priority }); }
      if (/\bhd\b/.test(normalizedText) && !/full hd|fhd|uhd/.test(normalizedText)) canonical.resolutions.add("720");
    };

    for (const [key, value] of Object.entries(params || {})) {
      if (isSchemaParamPath(key)) continue;
      const keyText = normalizeText(key);
      const valueText = normalizeText(value);
      fragments.push(`${keyText} ${valueText}`);
      const numeric = Number(String(value).replace(",", "."));

      if (/(duration|second|length|milliseconds?)/.test(keyText) && Number.isFinite(numeric)) addDuration(value, keyText);
      if (/(resolution|outputsize|imagesize|videosize|\bsize\b)/.test(keyText)) addResolutionValue(value, key);
      if (/quality/.test(keyText)) {
        const quality = normalizeQualityValue(value);
        const priority = qualityPathPriority(key);
        if (quality && priority >= 0) qualityCandidates.push({ quality, priority, path: key });
      }
      if (/(mode|tier|variant|speed|version|preset)/.test(keyText) && valueText) {
        canonical.modes.add(valueText);
        for (const token of valueText.split(" ")) if (token) canonical.modes.add(token);
      }
      if (/(count|batchsize|numoutput|numberofoutput|outputscount)/.test(normalizeKey(key)) && Number.isFinite(numeric) && numeric > 0 && numeric < 10_000) {
        canonical.outputCounts.add(Math.round(numeric));
      }
      if (/(enableaudio|generateaudio|keepaudio|audio)/.test(normalizeKey(key))) {
        if (typeof value === "boolean") canonical.audio.add(value ? "true" : "false");
        else if (/^(?:true|yes|on|enabled|1)$/i.test(String(value))) canonical.audio.add("true");
        else if (/^(?:false|no|off|disabled|0)$/i.test(String(value))) canonical.audio.add("false");
      }

      const widthMatch = key.match(/^(.*?)(?:\.|\[\d+\]\.)?width$/i);
      const heightMatch = key.match(/^(.*?)(?:\.|\[\d+\]\.)?height$/i);
      if (widthMatch && Number.isFinite(numeric)) {
        const prefix = key.replace(/width$/i, "");
        dimensionParts.set(prefix, { ...(dimensionParts.get(prefix) || {}), width: numeric, path: prefix, priority: dimensionPathPriority(prefix) });
      }
      if (heightMatch && Number.isFinite(numeric)) {
        const prefix = key.replace(/height$/i, "");
        dimensionParts.set(prefix, { ...(dimensionParts.get(prefix) || {}), height: numeric, path: prefix, priority: dimensionPathPriority(prefix) });
      }
    }

    for (const pair of dimensionParts.values()) {
      if (pair.width != null && pair.height != null && pair.priority >= 0) dimensionCandidates.push(pair);
    }

    const completedDimensions = dimensionCandidates.filter((pair) => Number.isFinite(pair.width) && Number.isFinite(pair.height) && pair.priority >= 0);
    if (completedDimensions.length) {
      const bestPriority = Math.max(...completedDimensions.map((pair) => pair.priority));
      for (const pair of completedDimensions.filter((candidate) => candidate.priority === bestPriority)) {
        addDimensionToCanonical(canonical, pair.width, pair.height, false);
      }
    }

    if (explicitTierCandidates.length) {
      const bestPriority = Math.max(...explicitTierCandidates.map((item) => item.priority));
      for (const item of explicitTierCandidates.filter((candidate) => candidate.priority === bestPriority)) canonical.resolutions.add(item.tier);
    } else if (completedDimensions.length) {
      const bestPriority = Math.max(...completedDimensions.map((pair) => pair.priority));
      for (const pair of completedDimensions.filter((candidate) => candidate.priority === bestPriority)) {
        const tier = inferImageResolutionTier(pair.width, pair.height);
        if (tier) canonical.resolutions.add(tier);
      }
    }

    if (qualityCandidates.length) {
      const bestPriority = Math.max(...qualityCandidates.map((item) => item.priority));
      const best = qualityCandidates.filter((item) => item.priority === bestPriority);
      const values = [...new Set(best.map((item) => item.quality))];
      for (const value of values) canonical.qualities.add(value);
      canonical.qualityAmbiguous = values.length !== 1;
      canonical.qualityEvidence = best.map((item) => `${item.path}=${item.quality}`);
    }

    const rawText = `${modelRaw || ""} ${fragments.join(" ")}`;
    canonical.text = normalizeText(rawText);
    for (const match of rawText.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/gi)) addDuration(match[1]);
    for (const match of rawText.matchAll(/\b(\d+(?:\.\d+)?)\s*ms\b/gi)) addDuration(match[1], "ms");
    for (const mode of ["fast", "standard", "pro", "lite", "turbo", "preview", "normal", "master", "balanced", "economy"]) {
      if (canonical.text.includes(mode)) canonical.modes.add(mode);
    }
    return canonical;
  }

  function resolutionRuleMatches(expected, canonical) {
    const raw = String(expected ?? "");
    const tokens = new Set([normalizeResolutionToken(raw)]);
    for (const match of raw.matchAll(/\b([1-8](?:\.\d+)?)\s*k\b/gi)) tokens.add(`${Number(match[1])}k`);
    for (const match of raw.matchAll(/\b(360|480|540|580|720|1080|1440|2160|3840)\s*p?\b/gi)) tokens.add(match[1]);
    for (const match of raw.matchAll(/\b(\d{3,5})\s*[x×]\s*(\d{3,5})\b/gi)) {
      tokens.add(`${Number(match[1])}x${Number(match[2])}`);
      tokens.add(`${Number(match[2])}x${Number(match[1])}`);
    }
    return [...tokens].filter(Boolean).some((token) => canonical.resolutions.has(token) || canonical.dimensions.has(token));
  }


  function conditionTextMatches(value, canonical) {
    const raw = String(value ?? "");
    const normalized = normalizeText(raw);
    if (!normalized) return true;
    let recognized = false;
    const resolutionTokens = [...raw.matchAll(/\b(?:[1-8](?:\.\d+)?\s*k|360p?|480p?|540p?|580p?|720p?|1080p?|1440p?|2160p?|3840p?|\d{3,5}\s*[x×]\s*\d{3,5})\b/gi)];
    if (resolutionTokens.length) {
      recognized = true;
      if (!resolutionTokens.some((match) => resolutionRuleMatches(match[0], canonical))) return false;
    }
    const durations = [...raw.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/gi)].map((match) => Number(match[1]));
    if (durations.length) {
      recognized = true;
      if (!durations.some((expected) => [...canonical.durations].some((actual) => Math.abs(actual - expected) <= 0.05))) return false;
    }
    const knownModes = ["fast", "standard", "pro", "lite", "turbo", "preview", "normal", "master", "quality", "low", "medium", "high", "balanced", "economy"];
    const modes = knownModes.filter((mode) => new RegExp(`\\b${mode}\\b`, "i").test(normalized));
    if (modes.length) {
      recognized = true;
      if (!modes.every((mode) => canonical.text.includes(mode) || canonical.modes.has(mode))) return false;
    }
    return recognized || canonical.text.includes(normalized);
  }

  function ruleMatches(rule, canonical) {
    const when = rule?.when || {};
    if (when.duration != null) {
      const expected = Number(when.duration);
      if (![...canonical.durations].some((value) => Math.abs(value - expected) <= 0.05)) return false;
    }
    if (when.resolution != null && !resolutionRuleMatches(when.resolution, canonical)) return false;
    if (when.width != null && !canonical.widths.has(Math.round(Number(when.width)))) return false;
    if (when.height != null && !canonical.heights.has(Math.round(Number(when.height)))) return false;
    if (when.megapixels != null) {
      const expected = Number(when.megapixels);
      if (![...canonical.megapixels].some((value) => Math.abs(value - expected) <= Math.max(0.05, expected * 0.08))) return false;
    }
    if (when.outputCount != null && !canonical.outputCounts.has(Math.round(Number(when.outputCount)))) return false;
    if (when.audio != null && !canonical.audio.has(Boolean(when.audio) ? "true" : "false")) return false;
    if (when.quality != null) {
      const expected = normalizeQualityValue(when.quality);
      if (!expected || canonical.qualities.size !== 1 || canonical.qualityAmbiguous || !canonical.qualities.has(expected)) return false;
    }
    for (const key of ["mode", "tier", "variant", "speed"]) {
      if (when[key] == null) continue;
      const expected = normalizeText(when[key]);
      if (!canonical.text.includes(expected) && !canonical.modes.has(expected)) return false;
    }
    if (when.text != null) {
      const values = Array.isArray(when.text) ? when.text : [when.text];
      if (!values.every((value) => conditionTextMatches(value, canonical))) return false;
    }
    return true;
  }

  function pricingSpecificity(rule) {
    const when = rule?.when || {};
    return Object.values(when).filter((value) => value != null && value !== "" && (!Array.isArray(value) || value.length)).length;
  }

  function conditionTextLooksUseful(value) {
    const text = normalizeText(value);
    return /(?:\b[1-8](?:\.\d+)?\s*k\b|\b(?:360|480|540|580|720|1080|1440|2160|3840)\s*p?\b|\b\d+(?:\.\d+)?\s*(?:s|sec|seconds?)\b|\b(?:fast|standard|pro|lite|turbo|preview|normal|master|quality|low|medium|high|balanced|economy|hd|fhd|uhd)\b|\b\d{3,5}\s*[x×]\s*\d{3,5}\b)/i.test(text);
  }

  function extractPricingConditions(obj, keyHint = "") {
    const when = {};
    const textParts = [];
    const addText = (value) => {
      if (value == null || !conditionTextLooksUseful(value)) return;
      textParts.push(String(value));
    };
    addText(keyHint);
    for (const [key, value] of Object.entries(obj || {})) {
      if (value == null || (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")) continue;
      const normalized = normalizeKey(key);
      if (CREDIT_KEYS.has(normalized) || /(?:credits?|price|cost).*(?:min|max|amount|value)?/.test(normalized)) continue;
      if (/(duration|seconds?|length)/.test(normalized)) when.duration = Number(value);
      else if (/(resolution|outputsize|imagesize|videosize)/.test(normalized)) when.resolution = String(value);
      else if (normalized === "width") when.width = Number(value);
      else if (normalized === "height") when.height = Number(value);
      else if (/(megapixel|^mp$)/.test(normalized)) when.megapixels = Number(value);
      else if (/(numoutputs?|numberofoutputs?|outputscount|batchsize|^count$)/.test(normalized)) when.outputCount = Number(value);
      else if (/(enableaudio|generateaudio|keepaudio|^audio$)/.test(normalized)) when.audio = typeof value === "boolean" ? value : /^(?:true|yes|on|enabled|1)$/i.test(String(value));
      else if (/mode|preset/.test(normalized)) when.mode = String(value);
      else if (/quality/.test(normalized)) when.quality = String(value);
      else if (/tier/.test(normalized)) when.tier = String(value);
      else if (/variant/.test(normalized)) when.variant = String(value);
      else if (/speed/.test(normalized)) when.speed = String(value);
      else if (/^(?:label|title|name|value|key|id)$/.test(normalized)) addText(value);
    }
    if (textParts.length) when.text = [...new Set(textParts)].join(" ");
    for (const [key, value] of Object.entries(when)) {
      if (typeof value === "number" && !Number.isFinite(value)) delete when[key];
    }
    return when;
  }

  function mergeLivePricingProfiles(...profiles) {
    const values = new Set();
    const ruleMap = new Map();
    const formulaMap = new Map();
    let sawProfile = false;
    let allowValueFallback = false;
    for (const profile of profiles.filter(Boolean)) {
      sawProfile = true;
      if (profile.allowValueFallback !== false) allowValueFallback = true;
      for (const value of profile.values || []) if (Number.isFinite(Number(value))) values.add(Number(value));
      if (Number.isFinite(profile.min)) values.add(Number(profile.min));
      if (Number.isFinite(profile.max)) values.add(Number(profile.max));
      for (const rule of profile.rules || []) {
        const credits = Number(rule.credits);
        if (!Number.isFinite(credits)) continue;
        const normalizedRule = { credits, when: { ...(rule.when || {}) }, source: rule.source || "live-model-metadata" };
        ruleMap.set(`${credits}|${JSON.stringify(normalizedRule.when)}`, normalizedRule);
      }
      for (const formula of profile.formulas || []) {
        const normalizedFormula = {
          base: Number(formula.base || 0),
          perSecond: formula.perSecond == null ? null : Number(formula.perSecond),
          perMegapixel: formula.perMegapixel == null ? null : Number(formula.perMegapixel),
          perOutput: formula.perOutput == null ? null : Number(formula.perOutput),
          secondsRounding: /^(?:ceil|floor|round)$/i.test(String(formula.secondsRounding || ""))
            ? String(formula.secondsRounding).toLowerCase()
            : null,
          secondsStep: formula.secondsStep == null ? null : Number(formula.secondsStep),
          minimumSeconds: formula.minimumSeconds == null ? null : Number(formula.minimumSeconds),
          when: { ...(formula.when || {}) },
          source: formula.source || "live-model-formula"
        };
        formulaMap.set(JSON.stringify(normalizedFormula), normalizedFormula);
      }
    }
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length && !ruleMap.size && !formulaMap.size) return null;
    for (const rule of ruleMap.values()) values.add(rule.credits);
    const allValues = [...values].sort((a, b) => a - b);
    return {
      min: allValues.length ? allValues[0] : null,
      max: allValues.length ? allValues[allValues.length - 1] : null,
      values: allValues.slice(0, 500),
      rules: [...ruleMap.values()].slice(0, 1_000),
      formulas: [...formulaMap.values()].slice(0, 100),
      allowValueFallback: sawProfile ? allowValueFallback : true
    };
  }

  function extractLivePricingProfile(obj) {
    if (!obj || typeof obj !== "object") return null;
    const values = new Set();
    const rules = [];
    const formulas = [];
    const seen = new WeakSet();
    let walked = 0;

    const addRule = (credits, when, source) => {
      const value = Number(credits);
      if (!Number.isFinite(value) || value < 0 || value > 100_000) return;
      values.add(value);
      rules.push({ credits: value, when: when || {}, source });
    };

    const visit = (value, keyHint, path, depth) => {
      if (!value || typeof value !== "object" || depth > 10 || seen.has(value) || walked > 25_000) return;
      seen.add(value);
      walked += 1;
      if (Array.isArray(value)) {
        for (let index = 0; index < Math.min(value.length, 2_000); index += 1) visit(value[index], keyHint, `${path}[${index}]`, depth + 1);
        return;
      }

      const normalizedHint = normalizeKey(keyHint);
      const pricingContext = /(?:credit|pricing|price|cost|billing)/.test(normalizedHint) || /(?:credit|pricing|price|cost|billing)/i.test(path);
      const directCredits = [];
      const formula = {
        base: 0,
        perSecond: null,
        perMegapixel: null,
        perOutput: null,
        secondsRounding: null,
        secondsStep: null,
        minimumSeconds: null,
        when: extractPricingConditions(value, keyHint),
        source: path
      };
      for (const [key, child] of Object.entries(value)) {
        const normalized = normalizeKey(key);
        if (typeof child === "number" || typeof child === "string") {
          const parsed = parseNumber(child);
          if (parsed != null && parsed <= 100_000) {
            if (CREDIT_KEYS.has(normalized) || /^(?:creditprice|priceincredits|costincredits|creditsperrun|creditspersample)$/.test(normalized)) {
              directCredits.push(parsed);
            } else if (pricingContext && /^(?:price|cost|amount|value|total|min|max|minimum|maximum|default|base)$/.test(normalized)) {
              values.add(parsed);
              if (!/^(?:min|max|minimum|maximum)$/.test(normalized)) directCredits.push(parsed);
            } else if (pricingContext && conditionTextLooksUseful(key)) {
              addRule(parsed, { text: key }, `${path}.${key}`);
            }
          }
          if (/^(?:creditspersecond|creditpersecond|pricepersecond|costpersecond)$/.test(normalized) && parsed != null) formula.perSecond = parsed;
          if (/^(?:creditspermegapixel|creditpermegapixel|pricepermegapixel|costpermegapixel|creditspermp)$/.test(normalized) && parsed != null) formula.perMegapixel = parsed;
          if (/^(?:creditsperoutput|creditperoutput|priceperoutput|costperoutput)$/.test(normalized) && parsed != null) formula.perOutput = parsed;
          if (/^(?:basecredits|basecredit|baseprice|basecost)$/.test(normalized) && parsed != null) formula.base = parsed;
          if (/^(?:secondsstep|billingseconds|billinginterval|durationstep|secondsperunit)$/.test(normalized) && parsed != null) formula.secondsStep = parsed;
          if (/^(?:minimumseconds|minseconds|minimumduration|minduration)$/.test(normalized) && parsed != null) formula.minimumSeconds = parsed;
          if (/^(?:secondsrounding|durationrounding|rounding)$/.test(normalized) && /^(?:ceil|ceiling|floor|round)$/i.test(String(child))) {
            formula.secondsRounding = /^ceil/i.test(String(child)) ? "ceil" : String(child).toLowerCase();
          }
        }
      }

      const when = extractPricingConditions(value, keyHint);
      for (const credits of directCredits) addRule(credits, when, path);
      if (formula.perSecond != null || formula.perMegapixel != null || formula.perOutput != null) formulas.push(formula);

      for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key)) continue;
        visit(child, key, path === "$" ? `$.${key}` : `${path}.${key}`, depth + 1);
      }
    };

    visit(obj, "", "$", 0);
    return mergeLivePricingProfiles({ values: [...values], rules, formulas });
  }

  const MODEL_REGISTRY_CONTAINER_KEYS = new Set([
    "data", "items", "results", "models", "model", "pricing", "prices", "price",
    "credits", "catalog", "definitions", "nodes", "metadata", "config", "default",
    "options", "variants", "tiers", "resolutions", "durations"
  ]);

  function likelyModelRegistryKey(key, resolvedModel) {
    const raw = String(key || "").trim();
    const normalizedKey = normalizeKey(raw);
    if (!raw || raw.length < 3 || raw.length > 180 || MODEL_REGISTRY_CONTAINER_KEYS.has(normalizedKey)) return false;
    if (conditionTextLooksUseful(raw) || /^(?:min|max|minimum|maximum|base|standard|fast|pro|lite|high|medium|low)$/i.test(raw)) return false;
    if (resolvedModel?.entry) return true;
    return plausibleUnknownModel(raw) && (
      /[\/:_-]/.test(raw)
      || /[a-z][A-Z]/.test(raw)
      || /\s/.test(raw)
      || /\d/.test(raw)
    );
  }

  function extractRegistryPricingProfile(value) {
    if (typeof value === "number" || typeof value === "string") {
      const credits = parseNumber(value);
      if (credits == null || credits > 100_000) return null;
      return mergeLivePricingProfiles({
        values: [credits],
        rules: [{ credits, when: {}, source: "live-price-registry" }]
      });
    }
    if (!value || typeof value !== "object") return null;
    return extractLivePricingProfile(value)
      || extractLivePricingProfile({ pricing: value })
      || (() => {
        const legacy = extractLiveCreditRange(value);
        return legacy ? mergeLivePricingProfiles(legacy) : null;
      })();
  }

  function observedPricingConditions(params, modelRaw = "") {
    const canonical = canonicalParams(params || {}, modelRaw);
    const when = {};
    if (canonical.durations.size === 1) when.duration = [...canonical.durations][0];
    if (canonical.qualities.size === 1 && !canonical.qualityAmbiguous) when.quality = [...canonical.qualities][0];

    const numericResolutions = [...canonical.resolutions].filter((value) => /^(?:360|480|540|580|720|1080|1440|2160|3840)$/.test(value));
    const tierResolutions = [...canonical.resolutions].filter((value) => /^(?:1k|2k|4k)$/.test(value));
    if (numericResolutions.length === 1) when.resolution = numericResolutions[0];
    else if (tierResolutions.length === 1) when.resolution = tierResolutions[0];
    else if (canonical.dimensions.size === 1) when.resolution = [...canonical.dimensions][0];

    if (canonical.widths.size === 1 && canonical.heights.size === 1) {
      when.width = [...canonical.widths][0];
      when.height = [...canonical.heights][0];
    }
    if (canonical.outputCounts.size === 1) when.outputCount = [...canonical.outputCounts][0];
    if (canonical.audio.size === 1) when.audio = canonical.audio.has("true");
    return when;
  }

  function evaluatePricingFormulas(formulas, canonical) {
    return (formulas || [])
      .filter((formula) => ruleMatches({ when: formula.when || {} }, canonical))
      .map((formula) => {
        let value = Number(formula.base || 0);
        if (formula.perSecond != null) {
          if (canonical.durations.size !== 1) return null;
          let seconds = [...canonical.durations][0];
          const step = Number(formula.secondsStep);
          if (Number.isFinite(step) && step > 0) seconds = Math.ceil(seconds / step) * step;
          else if (formula.secondsRounding === "ceil") seconds = Math.ceil(seconds);
          else if (formula.secondsRounding === "floor") seconds = Math.floor(seconds);
          else if (formula.secondsRounding === "round") seconds = Math.round(seconds);
          const minimum = Number(formula.minimumSeconds);
          if (Number.isFinite(minimum) && minimum > 0) seconds = Math.max(seconds, minimum);
          value += Number(formula.perSecond) * seconds;
        }
        if (formula.perMegapixel != null) {
          if (!canonical.megapixels.size) return null;
          value += Number(formula.perMegapixel) * Math.max(...canonical.megapixels);
        }
        if (formula.perOutput != null) {
          const count = canonical.outputCounts.size === 1 ? [...canonical.outputCounts][0] : 1;
          value += Number(formula.perOutput) * count;
        }
        return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
      })
      .filter((value) => value != null);
  }

  function estimateFromLivePricing(profile, canonical) {
    if (!profile) return null;
    const formulaMatches = evaluatePricingFormulas(profile.formulas, canonical);
    if (formulaMatches.length) {
      const unique = [...new Set(formulaMatches)].sort((a, b) => a - b);
      return {
        min: unique[0], max: unique[unique.length - 1],
        kind: unique.length === 1 ? "estimate-exact" : "estimate-range",
        source: "live-model-formula",
        reason: unique.length === 1 ? "Цена рассчитана по формуле из загруженных метаданных модели Weavy." : "Несколько формул Weavy дали разные значения."
      };
    }

    const matchingRules = (profile.rules || [])
      .filter((rule) => pricingSpecificity(rule) > 0 && ruleMatches(rule, canonical));
    if (matchingRules.length) {
      const bestSpecificity = Math.max(...matchingRules.map(pricingSpecificity));
      const credits = [...new Set(matchingRules.filter((rule) => pricingSpecificity(rule) === bestSpecificity).map((rule) => Number(rule.credits)))].sort((a, b) => a - b);
      if (credits.length) {
        return {
          min: credits[0], max: credits[credits.length - 1],
          kind: credits.length === 1 ? "estimate-exact" : "estimate-range",
          source: "live-model-parameter-match",
          reason: credits.length === 1
            ? "Настройки запуска совпали с ценовым правилом, загруженным самой страницей Weavy."
            : "Несколько живых ценовых правил совпали с сохранёнными настройками."
        };
      }
    }

    if (profile.allowValueFallback !== false && Array.isArray(profile.values) && profile.values.length === 1) {
      return { min: profile.values[0], max: profile.values[0], kind: "estimate-exact", source: "live-model-metadata", reason: "Единственная цена найдена в загруженных метаданных модели Weavy." };
    }
    return null;
  }

  function estimateFromCatalog(modelInfo, canonical, catalog) {
    const entry = modelInfo?.entry || null;
    if (!entry) return { min: null, max: null, kind: "unknown", source: "unresolved", reason: "Модель отсутствует в локальном каталоге цен, а фактическое списание не найдено." };
    if (entry.kind === "dynamic") {
      const matches = entry.options.filter((rule) => ruleMatches(rule, canonical));
      if (matches.length) {
        const credits = [...new Set(matches.map((rule) => Number(rule.credits)))].sort((a, b) => a - b);
        if (credits.length === 1) {
          return { min: credits[0], max: credits[0], kind: "estimate-exact", source: "catalog-parameter-match", reason: `${entry.parameterLabel || "Параметры запуска"} совпали с однозначным правилом каталога ${catalog.version}.` };
        }
        return { min: credits[0], max: credits[credits.length - 1], kind: "estimate-range", source: "catalog-ambiguous", reason: "Несколько ценовых вариантов каталога совпали с сохранёнными настройками." };
      }
      return {
        min: entry.min,
        max: entry.max,
        kind: "estimate-range",
        source: "catalog-parameters-missing",
        reason: entry.missingParameterReason || "Исторические параметры не найдены или не распознаны; показан полный диапазон модели."
      };
    }
    if (entry.kind === "formula") {
      const values = [...new Set(evaluatePricingFormulas(entry.formulas, canonical))].sort((a, b) => a - b);
      if (values.length) {
        return {
          min: values[0],
          max: values[values.length - 1],
          kind: values.length === 1 ? "estimate-exact" : "estimate-range",
          source: values.length === 1 ? "catalog-formula" : "catalog-formula-ambiguous",
          reason: values.length === 1
            ? `${entry.parameterLabel || "Параметры запуска"} совпали с формулой каталога ${catalog.version}.`
            : "Несколько формул каталога совпали с сохранёнными параметрами."
        };
      }
      return {
        min: null,
        max: null,
        kind: "unknown",
        source: "catalog-formula-parameters-missing",
        reason: entry.missingParameterReason || "Для формулы цены не хватает сохранённых параметров запуска."
      };
    }
    if (entry.kind === "fixed") {
      return { min: entry.min, max: entry.max, kind: "estimate-exact", source: "catalog-fixed", reason: `Фиксированная цена из каталога ${catalog.version}.` };
    }
    if (entry.kind === "range") {
      return { min: entry.min, max: entry.max, kind: "estimate-range", source: "catalog-range", reason: `Публично указан только диапазон цены (${catalog.version}); расширение не угадывает точное значение без ценового правила Weavy.` };
    }
    return { min: null, max: null, kind: "unknown", source: "unresolved", reason: "Неизвестное ценовое правило." };
  }

  function coerceGptImage2ForPricing(modelInfo, params, catalog) {
    const paramEvidence = Object.entries(params || {})
      .filter(([key]) => /(?:model|version|slug|endpoint|engine|provider|service|title|name|type)/i.test(key))
      .map(([key, value]) => `${key} ${value}`)
      .join(" ");
    const evidence = `${modelInfo?.raw || ""} ${modelInfo?.canonical || ""} ${paramEvidence}`;
    if (!isGptImage2Evidence(evidence)) return modelInfo;

    const hasImageInput = Object.keys(params || {}).some((key) => /(?:^|\.)(?:input|params|parameters).*image/i.test(key));
    const edit = hasEditEvidence(evidence) || modelInfo?.entry?.category === "image-edit" || hasImageInput;
    const wanted = edit ? "ChatGPT Images 2.0 Edit" : "ChatGPT Images 2.0";
    const entry = (catalog?.entries || []).find((item) => item.name === wanted);
    if (!entry) return modelInfo;
    return { ...(modelInfo || {}), canonical: entry.name, entry, resolvedBy: "gpt-image-2-pricing-guard" };
  }

  function estimateUnitCredits(modelInfo, params, catalog, livePricing) {
    const resolvedModelInfo = coerceGptImage2ForPricing(modelInfo, params, catalog);
    const canonical = canonicalParams(params, resolvedModelInfo?.raw);
    const liveMatched = estimateFromLivePricing(livePricing, canonical);
    const catalogMatched = estimateFromCatalog(resolvedModelInfo, canonical, catalog);

    // User-calibrated model rules are authoritative estimates. Actual debits are
    // handled before this function, so this branch never overrides a real charge.
    // It also prevents weak/stale live metadata from turning an unknown Quality
    // into one arbitrary price instead of the honest catalog range.
    if (resolvedModelInfo?.entry?.preferCatalogPricing) return catalogMatched;

    // An exact rule loaded from the current Weavy page is the strongest estimate.
    if (liveMatched?.kind === "estimate-exact") return liveMatched;

    // Public/live metadata sometimes contains several prices with the same weak
    // condition (for example all marked "pro") even though the historical output
    // resolution is known. In that case an exact resolution/fixed catalog rule is
    // more useful than returning the entire live range.
    if (catalogMatched?.kind === "estimate-exact") {
      if (liveMatched?.kind === "estimate-range") {
        return {
          ...catalogMatched,
          reason: `${catalogMatched.reason} Живые метаданные Weavy содержали несколько совместимых цен, поэтому диапазон был уточнён по сохранённым параметрам запуска.`
        };
      }
      return catalogMatched;
    }

    if (liveMatched) return liveMatched;

    if (livePricing && livePricing.allowValueFallback !== false && Number.isFinite(livePricing.min) && Number.isFinite(livePricing.max)) {
      return {
        min: livePricing.min,
        max: livePricing.max,
        kind: livePricing.min === livePricing.max ? "estimate-exact" : "estimate-range",
        source: "live-model-metadata-range",
        reason: livePricing.min === livePricing.max
          ? "Цена найдена в загруженных метаданных модели Weavy."
          : "Настроечное правило не удалось однозначно сопоставить; показан диапазон живых цен Weavy."
      };
    }

    return catalogMatched;
  }

  function summarizeCanonicalParams(params, modelRaw = "") {
    const canonical = canonicalParams(params, modelRaw);
    const parts = [];
    if (canonical.dimensions.size) parts.push(`размер ${[...canonical.dimensions][0]}`);
    const pricingTiers = [...canonical.resolutions].filter((value) => /^(?:1k|2k|4k)$/.test(value));
    if (pricingTiers.length) parts.push(`профиль ${pricingTiers.map((value) => value.toUpperCase()).join("/")}`);
    else if (!canonical.dimensions.size && canonical.resolutions.size) parts.push(`разрешение ${[...canonical.resolutions].slice(0, 3).join("/")}`);
    if (canonical.durations.size) parts.push(`${[...canonical.durations].slice(0, 3).join("/")} с`);
    const qualityValues = [...canonical.qualities];
    if (qualityValues.length === 1 && !canonical.qualityAmbiguous) {
      parts.push(`Quality ${qualityValues[0][0].toUpperCase() + qualityValues[0].slice(1)}`);
    } else if (qualityValues.length > 1 || canonical.qualityAmbiguous) {
      parts.push(`Quality неоднозначен${qualityValues.length ? `: ${qualityValues.map((value) => value[0].toUpperCase() + value.slice(1)).join("/")}` : ""}`);
    }
    const usefulModes = [...canonical.modes]
      .filter((mode) => mode.length <= 30 && mode !== "quality" && !qualityValues.includes(mode))
      .slice(0, 3);
    if (usefulModes.length) parts.push(usefulModes.join("/"));
    if (canonical.audio.size === 1) parts.push(canonical.audio.has("true") ? "с аудио" : "без аудио");
    if (canonical.outputCounts.size === 1) parts.push(`${[...canonical.outputCounts][0]} результата`);
    return parts.join(" · ");
  }

  function collectObjects(rootValue) {
    const objects = [];
    const seen = new WeakSet();
    const priorityQueue = [];
    const normalQueue = [];
    let priorityCursor = 0;
    let normalCursor = 0;
    let walked = 0;

    const enqueue = (value, path, parent, parentKey, depth, priority = false) => {
      if (value == null || depth > MAX_DEPTH) return;
      const item = { value, path, parent, parentKey, depth };
      (priority ? priorityQueue : normalQueue).push(item);
    };
    enqueue(rootValue, "$", null, "", 0, true);

    while (walked < MAX_OBJECTS && (priorityCursor < priorityQueue.length || normalCursor < normalQueue.length)) {
      const item = priorityCursor < priorityQueue.length ? priorityQueue[priorityCursor++] : normalQueue[normalCursor++];
      const { value, path, parent, parentKey, depth } = item;
      if (Array.isArray(value)) {
        const priority = PRIORITY_KEY_RE.test(String(parentKey || ""));
        for (let index = 0; index < value.length; index += 1) enqueue(value[index], `${path}[${index}]`, value, String(index), depth + 1, priority);
        continue;
      }
      if (typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      walked += 1;
      objects.push({ obj: value, path, parent, parentKey, depth });
      for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key)) continue;
        const nextPath = path === "$" ? `$.${key}` : `${path}.${key}`;
        enqueue(child, nextPath, value, key, depth + 1, PRIORITY_KEY_RE.test(key));
      }
    }
    objects.truncated = priorityCursor < priorityQueue.length || normalCursor < normalQueue.length;
    objects.walked = walked;
    objects.queued = (priorityQueue.length - priorityCursor) + (normalQueue.length - normalCursor);
    return objects;
  }

  function pathLooksLikeNode(path, obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    if (TEMPLATE_PATH_RE.test(path)) return false;
    if (/(?:^|\.)(?:nodes?|blocks?|components?|operators?)\[\d+\]$/i.test(path)) return true;
    return Boolean(obj.id != null && obj.data && typeof obj.data === "object" && (obj.type || obj.position));
  }

  function payloadBelongsToProject(meta, projectId, data) {
    if (!projectId) return true;
    if (String(meta.url || "").includes(projectId)) return true;
    if (String(meta.pageUrl || "").includes(projectId)) return true;
    const seen = new WeakSet();
    const containsProjectId = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 8 || seen.has(value)) return false;
      seen.add(value);
      if (Array.isArray(value)) return value.slice(0, 2_000).some((item) => containsProjectId(item, depth + 1));
      for (const key of ["id", "recipeId", "projectId", "flowId", "workflowId"]) {
        if (String(value[key] || "") === projectId) return true;
      }
      return Object.entries(value).slice(0, 2_000).some(([key, child]) => {
        if (/prompt|token|secret|base64|imageData/i.test(key)) return false;
        return containsProjectId(child, depth + 1);
      });
    };
    return containsProjectId(data);
  }

  function arrayAt(obj, paths) {
    for (const path of paths) {
      let value = obj;
      for (const segment of path.split(".")) value = value?.[segment];
      if (Array.isArray(value)) return value;
    }
    return null;
  }

  function primitiveAt(obj, keys) {
    for (const key of keys) {
      const value = obj?.[key];
      if (typeof value === "string" || typeof value === "number") return value;
    }
    return null;
  }

  class ProjectAnalyzer {
    constructor(catalog, options = {}) {
      this.catalog = catalog || { version: "unknown", entries: [] };
      this.projectId = options.projectId || null;
      this.catalogIndex = buildCatalogIndex(this.catalog);
      this.modelIdMap = new Map();
      this.ambiguousModelIds = new Set();
      this.modelLivePrices = new Map();
      this.nodeMap = new Map();
      this.records = new Map();
      this.aliasIndex = new Map();
      this.diagnostics = [];
      this.scanMeta = null;
      this.counters = {
        payloads: 0,
        projectPayloads: 0,
        requestPayloads: 0,
        responsePayloads: 0,
        storagePayloads: 0,
        objectsWalked: 0,
        payloadsTruncated: 0,
        queuedObjectsSkipped: 0,
        dimensionEnrichments: 0,
        nodeMappings: 0,
        modelMappings: 0,
        ambiguousModelMappings: 0,
        historyItems: 0,
        executionItems: 0,
        duplicatesMerged: 0,
        ignoredPending: 0,
        ignoredFailed: 0,
        templatesIgnored: 0
      };
      this.modelResolver = createModelResolver(this.catalogIndex, this.modelIdMap);
    }

    setProjectId(projectId) {
      this.projectId = projectId || null;
    }

    resolveDirectModel(obj, allowUnknown = true) {
      if (!obj || typeof obj !== "object") return null;
      const candidates = [];
      for (const [key, value] of Object.entries(obj)) {
        const normalized = normalizeKey(key);
        if (MODEL_ID_KEYS.has(normalized) && (typeof value === "string" || typeof value === "number")) {
          const mapped = this.modelIdMap.get(String(value));
          if (mapped) candidates.push({ ...mapped, raw: mapped.raw || String(value), matchedValue: String(value), resolvedBy: "model-id-map", sourceKey: key });
        }
        if (!MODEL_VALUE_KEYS.has(normalized)) continue;
        const resolved = this.modelResolver.resolveValue(value, {
          explicitModelField: true,
          allowUnknown,
          sourceKey: key
        });
        if (resolved) candidates.push({ ...resolved, sourceKey: resolved.sourceKey || key });
      }
      return chooseBestModel(candidates);
    }

    resolveModelFromContainer(obj, allowUnknown = true) {
      if (!obj || typeof obj !== "object") return null;
      const candidates = [];
      const visited = new Set();
      const addContainer = (value, path, resolveWhole = false) => {
        if (!value || typeof value !== "object" || visited.has(value)) return;
        visited.add(value);
        const direct = this.resolveDirectModel(value, allowUnknown);
        if (direct) {
          const sourceKey = path && direct.sourceKey ? `${path}.${direct.sourceKey}` : (direct.sourceKey || path);
          const prefixed = { ...direct, sourceKey };
          prefixed.confidence = modelCandidateScore(prefixed, sourceKey);
          candidates.push(prefixed);
        }
        if (resolveWhole) {
          const whole = this.modelResolver.resolveValue(value, { explicitModelField: true, allowUnknown, sourceKey: path });
          if (whole) candidates.push(whole);
        }
      };

      addContainer(obj, "", false);
      const containers = [
        ["data", obj.data, false],
        ["kind", obj.kind, false],
        ["data.kind", obj?.data?.kind, false],
        ["data.kind.model", obj?.data?.kind?.model, true],
        ["data.model", obj?.data?.model, true],
        ["data.params", obj?.data?.params, false],
        ["data.parameters", obj?.data?.parameters, false],
        ["data.input", obj?.data?.input, false],
        ["data.settings", obj?.data?.settings, false],
        ["data.config", obj?.data?.config, false],
        ["config", obj.config, false],
        ["settings", obj.settings, false],
        ["properties", obj.properties, false],
        ["metadata", obj.metadata, false],
        ["menu", obj.menu, false],
        ["input", obj.input, false],
        ["params", obj.params, false],
        ["parameters", obj.parameters, false],
        ["model", obj.model, true]
      ];
      for (const [path, value, resolveWhole] of containers) addContainer(value, path, resolveWhole);

      // Labels are weak evidence and are accepted only when they match the catalogue.
      for (const [path, container] of [["", obj], ["data", obj.data], ["kind", obj.kind], ["data.kind", obj?.data?.kind]]) {
        if (!container || typeof container !== "object") continue;
        for (const labelKey of ["displayName", "modelName", "label", "title", "name", "type", "nodeType", "toolName"]) {
          if (looksLikeMediaFileLabel(container[labelKey])) continue;
          const resolved = this.modelResolver.resolvePrimitive(container[labelKey], {
            explicitModelField: true,
            allowUnknown: false,
            sourceKey: path ? `${path}.${labelKey}` : labelKey
          });
          if (resolved) candidates.push(resolved);
        }
      }
      return refineGptImageFamily(chooseBestModel(candidates), [obj], this.catalogIndex);
    }

    diagnostic(reason, item, meta, details = {}) {
      if (this.diagnostics.length >= MAX_DIAGNOSTICS) return;
      this.diagnostics.push({
        reason,
        url: sanitizeSourceUrl(meta.url || ""),
        phase: meta.phase || "response",
        source: meta.source || "network",
        path: item?.path || "$",
        keys: Object.keys(item?.obj || {}).slice(0, 100),
        ...details,
        at: meta.capturedAt || new Date().toISOString()
      });
    }

    registerModelAlias(id, incoming, sourceKey) {
      if (!id || this.ambiguousModelIds.has(id)) return false;
      const existing = this.modelIdMap.get(id);
      if (existing && normalizeModelIdentity(existing.canonical) !== normalizeModelIdentity(incoming.canonical)) {
        this.modelIdMap.delete(id);
        this.ambiguousModelIds.add(id);
        this.counters.ambiguousModelMappings += 1;
        return true;
      }
      if (!existing || modelCandidateScore(incoming, sourceKey) > modelCandidateScore(existing, existing.sourceKey)) {
        this.modelIdMap.set(id, incoming);
        this.counters.modelMappings += 1;
        return true;
      }
      return false;
    }

    registerMappings(items, meta, projectPayload) {
      const catalogLike = /node-definitions|models|catalog|pricing|subflow-templates/i.test(meta.url || "");
      let modelMapChanged = false;
      const pricingModelsChanged = new Set();
      const registerModelPricing = (model, pricing) => {
        if (!model?.canonical || !pricing) return;
        this.modelLivePrices.set(
          model.canonical,
          mergeLivePricingProfiles(this.modelLivePrices.get(model.canonical), pricing)
        );
        pricingModelsChanged.add(normalizeModelIdentity(model.canonical));
      };

      // First pass: build the internal-id/slug map from catalogue-like payloads.
      if (catalogLike) {
        // Weavy also returns dictionaries keyed by provider slug, for example
        // { "beeble_switchx": { "1080p": 360 } }. Those entries have no model
        // field inside the value, so the registry key itself is the identity.
        for (const { obj } of items) {
          for (const [key, value] of Object.entries(obj || {})) {
            const keyModel = this.modelResolver.resolvePrimitive(key, {
              explicitModelField: true,
              allowUnknown: true,
              sourceKey: "price-registry-key"
            });
            if (!likelyModelRegistryKey(key, keyModel)) continue;
            const valueModel = value && typeof value === "object"
              ? this.resolveModelFromContainer(value, true)
              : null;
            const model = chooseBestModel([valueModel, keyModel]);
            const livePricing = extractRegistryPricingProfile(value);
            if (!model || !livePricing) continue;
            registerModelPricing(model, livePricing);
            if (this.registerModelAlias(String(key), {
              canonical: model.canonical,
              entry: model.entry,
              raw: model.raw || String(key),
              resolvedBy: "price-registry-key",
              sourceKey: "price-registry-key",
              confidence: modelCandidateScore(model, "modelSlug")
            }, "modelSlug")) modelMapChanged = true;
          }
        }

        for (const item of items) {
          const { obj, path } = item;
          let model = this.resolveModelFromContainer(obj, true);
          if (!model) continue;
          for (const displayKey of ["displayName", "modelName", "title", "name"]) {
            const displayModel = this.modelResolver.resolvePrimitive(obj?.[displayKey], {
              explicitModelField: true,
              allowUnknown: true,
              sourceKey: displayKey
            });
            model = chooseBestModel([model, displayModel]);
          }
          if (!model) continue;

          for (const [key, value] of Object.entries(obj)) {
            if (!isStableModelAliasField(key, value)) continue;
            const id = String(value).trim();
            const incoming = {
              canonical: model.canonical,
              entry: model.entry,
              raw: model.raw,
              resolvedBy: "catalog-object",
              sourceKey: key,
              confidence: modelCandidateScore(model, key)
            };
            if (this.registerModelAlias(id, incoming, key)) modelMapChanged = true;
          }

          const livePricing = extractLivePricingProfile(obj) || (() => {
            const legacy = extractLiveCreditRange(obj);
            return legacy ? mergeLivePricingProfiles(legacy) : null;
          })();
          registerModelPricing(model, livePricing);
        }
      }

      if (modelMapChanged) this.modelResolver = createModelResolver(this.catalogIndex, this.modelIdMap);

      // Second pass: map only actual graph nodes, preferring precise provider slugs
      // over internal wrappers such as fal_imported and any_llm.
      for (const item of items) {
        const { obj, path } = item;
        const model = this.resolveModelFromContainer(obj, true);
        if (!model) continue;

        if (!catalogLike && /models?/i.test(path)) {
          for (const [key, value] of Object.entries(obj)) {
            if (!isStableModelAliasField(key, value)) continue;
            const id = String(value).trim();
            const incoming = { canonical: model.canonical, entry: model.entry, raw: model.raw, resolvedBy: "catalog-object", sourceKey: key, confidence: model.confidence };
            if (this.registerModelAlias(id, incoming, key)) modelMapChanged = true;
          }
        }

        if (!projectPayload || !pathLooksLikeNode(path, obj)) continue;
        const nodeId = obj.id != null ? String(obj.id) : extractNodeId(obj);
        if (!nodeId) continue;
        const current = this.nodeMap.get(nodeId);
        const incomingConfidence = Number.isFinite(model.confidence) ? model.confidence : modelCandidateScore(model, model.sourceKey);
        const currentConfidence = Number(current?.modelConfidence || 0);
        const replaceIdentity = !current || incomingConfidence > currentConfidence;
        const chosenModel = replaceIdentity ? model : {
          canonical: current.model,
          raw: current.modelRaw,
          entry: current.modelEntry,
          resolvedBy: current.modelResolvedBy,
          sourceKey: current.modelSourceKey,
          confidence: currentConfidence
        };
        const modelContainer = obj?.data?.kind?.model || obj?.data?.model || obj;
        const livePricing = extractLivePricingProfile(modelContainer) || (() => {
          const legacy = extractLiveCreditRange(modelContainer);
          return legacy ? mergeLivePricingProfiles(legacy) : null;
        })();
        const mergedPricing = mergeLivePricingProfiles(
          current?.livePricing || current?.liveRange,
          this.modelLivePrices.get(chosenModel.canonical),
          livePricing
        );
        const next = {
          ...(current || {}),
          nodeId,
          model: chosenModel.canonical,
          modelRaw: chosenModel.raw,
          modelEntry: chosenModel.entry,
          modelResolvedBy: chosenModel.resolvedBy,
          modelSourceKey: chosenModel.sourceKey || "",
          modelConfidence: Number(chosenModel.confidence || incomingConfidence || 0),
          currentParams: { ...(current?.currentParams || {}), ...collectParams(obj) },
          livePricing: mergedPricing,
          liveRange: mergedPricing,
          sourcePath: replaceIdentity ? path : (current?.sourcePath || path),
          sourceUrl: replaceIdentity ? sanitizeSourceUrl(meta.url || "") : (current?.sourceUrl || sanitizeSourceUrl(meta.url || "")),
          updatedAt: meta.capturedAt || new Date().toISOString()
        };
        this.nodeMap.set(nodeId, next);
        this.counters.nodeMappings += 1;
        if (replaceIdentity) this.reconcileRecordsForNode(nodeId, next);
      }
      if (modelMapChanged) this.modelResolver = createModelResolver(this.catalogIndex, this.modelIdMap);
      if (pricingModelsChanged.size) {
        for (const [nodeId, nodeInfo] of this.nodeMap) {
          if (!pricingModelsChanged.has(normalizeModelIdentity(nodeInfo.model))) continue;
          const mergedPricing = mergeLivePricingProfiles(
            nodeInfo.livePricing || nodeInfo.liveRange,
            this.modelLivePrices.get(nodeInfo.model)
          );
          this.nodeMap.set(nodeId, { ...nodeInfo, livePricing: mergedPricing, liveRange: mergedPricing });
        }
        this.repriceRecordsForModels(pricingModelsChanged);
      }
    }

    reconcileRecordsForNode(nodeId, nodeInfo) {
      const incomingConfidence = Number(nodeInfo?.modelConfidence || 0);
      if (!nodeId || !incomingConfidence) return;
      for (const record of this.records.values()) {
        if (record.nodeId !== nodeId) continue;
        const recordConfidence = Number(record.modelConfidence || modelCandidateScore({ raw: record.modelRaw, canonical: record.model, entry: null, resolvedBy: record.modelSource }, record.modelSource));
        if (recordConfidence >= incomingConfidence) continue;
        record.model = nodeInfo.model;
        record.modelRaw = nodeInfo.modelRaw;
        record.modelSource = "node-map-updated";
        record.modelConfidence = incomingConfidence;
        if (record.costKind !== "actual") {
          const modelInfo = { canonical: nodeInfo.model, raw: nodeInfo.modelRaw, entry: nodeInfo.modelEntry, confidence: incomingConfidence };
          Object.assign(record, this.makeCost(modelInfo, record.params || {}, Number(record.units || 1), nodeInfo.livePricing || nodeInfo.liveRange, null, false));
        }
      }
    }

    repriceRecordsForModels(modelIdentities) {
      const wanted = modelIdentities instanceof Set ? modelIdentities : new Set(modelIdentities || []);
      for (const record of this.records.values()) {
        if (record.costKind === "actual" || !wanted.has(normalizeModelIdentity(record.model))) continue;
        const nodeInfo = record.nodeId ? this.nodeMap.get(record.nodeId) : null;
        const entry = this.catalogIndex.exact.get(normalizeModelIdentity(record.model))
          || this.catalogIndex.exact.get(normalizeModelIdentity(record.modelRaw))
          || nodeInfo?.modelEntry
          || null;
        const modelInfo = {
          canonical: record.model,
          raw: record.modelRaw,
          entry,
          confidence: Number(record.modelConfidence || 0)
        };
        const livePricing = mergeLivePricingProfiles(
          nodeInfo?.livePricing || nodeInfo?.liveRange,
          this.modelLivePrices.get(record.model)
        );
        Object.assign(record, this.makeCost(
          modelInfo,
          record.params || {},
          Number(record.units || 1),
          livePricing,
          null,
          false
        ));
      }
    }

    observeDisplayedPrice(observation = {}) {
      const totalCredits = Number(observation.totalCredits);
      const runs = Math.max(1, Math.round(Number(observation.runs || 1)));
      if (!Number.isFinite(totalCredits) || totalCredits < 0 || totalCredits > 100_000_000) return false;
      let nodeId = observation.nodeId == null ? null : String(observation.nodeId);
      let nodeInfo = nodeId ? this.nodeMap.get(nodeId) : null;
      const namedModel = this.modelResolver.resolvePrimitive(observation.modelName, {
        explicitModelField: true,
        allowUnknown: true,
        sourceKey: "visible-node-title"
      });
      if (!nodeInfo && namedModel) {
        const wanted = new Set([
          normalizeModelIdentity(namedModel.canonical),
          normalizeModelIdentity(namedModel.raw),
          normalizeModelIdentity(observation.modelName)
        ].filter(Boolean));
        const matches = [...this.nodeMap.entries()].filter(([, candidate]) =>
          wanted.has(normalizeModelIdentity(candidate.model))
          || wanted.has(normalizeModelIdentity(candidate.modelRaw))
        );
        if (matches.length === 1) [nodeId, nodeInfo] = matches[0];
      }
      // A visible total is a price for the currently selected settings, not
      // proof that every historical run of the same model used those settings.
      // Apply it only when the selected node can supply saved parameters.
      if (!nodeInfo) return false;
      const mappedModel = nodeInfo ? {
        canonical: nodeInfo.model,
        raw: nodeInfo.modelRaw,
        entry: nodeInfo.modelEntry,
        resolvedBy: "node-map",
        sourceKey: nodeInfo.modelSourceKey || "node-map",
        confidence: Number(nodeInfo.modelConfidence || 0)
      } : null;
      const model = chooseBestModel([mappedModel, namedModel]);
      if (!model || model.canonical === "Модель не определена") return false;

      const params = { ...(nodeInfo?.currentParams || {}), ...(observation.params || {}) };
      const when = observedPricingConditions(params, model.raw);
      if (!Object.keys(when).length) return false;
      const unitCredits = Number((totalCredits / runs).toFixed(6));
      const observed = mergeLivePricingProfiles({
        values: [unitCredits],
        rules: [{ credits: unitCredits, when, source: "weavy-visible-total-cost" }],
        allowValueFallback: false
      });
      this.modelLivePrices.set(
        model.canonical,
        mergeLivePricingProfiles(this.modelLivePrices.get(model.canonical), observed)
      );

      if (nodeId && nodeInfo) {
        const nodePricing = mergeLivePricingProfiles(nodeInfo.livePricing || nodeInfo.liveRange, observed);
        this.nodeMap.set(nodeId, { ...nodeInfo, livePricing: nodePricing, liveRange: nodePricing });
      }
      this.repriceRecordsForModels(new Set([normalizeModelIdentity(model.canonical)]));
      return true;
    }

    recordAliases(record) {
      const aliases = new Set(record.aliases || []);
      if (record.key) aliases.add(`key:${record.key}`);
      for (const id of record.executionIds || []) aliases.add(id);

      // Output URLs identify individual generated items. A batch-level record may
      // contain every output URL from the batch, so indexing those URLs on the
      // batch record would incorrectly merge the batch charge into the first item.
      if (record.scope === "item" && record.outputRefs?.length) {
        for (const ref of record.outputRefs) aliases.add(`output:${ref}`);
      }
      return [...aliases].filter(Boolean);
    }

    recordIndexAliases(record) {
      // A run ID can legitimately be present both on a batch debit and on its
      // first output item. Keep the two scopes in separate alias namespaces so
      // the exact batch charge remains a batch record and can override estimates
      // for the entire group without inflating the generation count.
      const scope = record.scope === "item" ? "item" : "batch";
      return this.recordAliases(record).map((alias) => `${scope}:${alias}`);
    }

    sourcePriority(record) {
      const map = {
        "usage-log": 100,
        "batch-status": 80,
        "node-history": 60,
        "result-history": 50,
        "execution": 40,
        "storage": 30
      };
      return map[record.sourceKind] || 10;
    }

    modelEvidencePriority(record) {
      const source = String(record?.modelSource || "");
      if (/generation-record/i.test(source)) return 100;
      if (/result-record/i.test(source)) return 95;
      if (/batch-status|usage-log/i.test(source)) return 90;
      if (/node-map-updated/i.test(source)) return 75;
      if (/node-map/i.test(source)) return 60;
      if (/model-id-map|known-provider-slug|catalog-exact/i.test(source)) return 50;
      return 10;
    }

    mergeRecord(existing, incoming) {
      const existingPriority = this.sourcePriority(existing);
      const incomingPriority = this.sourcePriority(incoming);
      existing.aliases = [...new Set([...(existing.aliases || []), ...(incoming.aliases || [])])];
      existing.executionIds = [...new Set([...(existing.executionIds || []), ...(incoming.executionIds || [])])];
      existing.outputRefs = [...new Set([...(existing.outputRefs || []), ...(incoming.outputRefs || [])])].slice(0, 100);
      existing.params = { ...(existing.params || {}), ...(incoming.params || {}) };
      existing.units = Math.max(Number(existing.units || 1), Number(incoming.units || 1));
      existing.lastSeenAt = new Date().toISOString();
      existing.evidence = [...new Set([...(existing.evidence || []), ...(incoming.evidence || [])])];

      const existingModelConfidence = Number(existing.modelConfidence || 0);
      const incomingModelConfidence = Number(incoming.modelConfidence || 0);
      const sameModel = normalizeModelIdentity(existing.model) === normalizeModelIdentity(incoming.model);
      const incomingHasBetterModel = incomingModelConfidence > existingModelConfidence
        || (incomingModelConfidence === existingModelConfidence
          && this.modelEvidencePriority(incoming) > this.modelEvidencePriority(existing));
      const incomingModelAccepted = incomingHasBetterModel
        || (sameModel && incomingModelConfidence === existingModelConfidence && incomingPriority >= existingPriority);
      if (incomingModelAccepted) {
        existing.model = incoming.model || existing.model;
        existing.modelRaw = incoming.modelRaw || existing.modelRaw;
        existing.modelSource = incoming.modelSource || existing.modelSource;
        existing.modelConfidence = Math.max(existingModelConfidence, incomingModelConfidence);
      }

      if (incomingPriority >= existingPriority) {
        existing.status = incoming.status || existing.status;
        existing.timestamp = incoming.timestamp || existing.timestamp;
        existing.sourceKind = incoming.sourceKind || existing.sourceKind;
        existing.sourceUrl = incoming.sourceUrl || existing.sourceUrl;
        existing.sourcePath = incoming.sourcePath || existing.sourcePath;
        if (!existing.nodeId || existing.nodeId === incoming.nodeId || incomingModelAccepted) {
          existing.nodeId = incoming.nodeId || existing.nodeId;
        }
        existing.batchId = incoming.batchId || existing.batchId;
        existing.runId = incoming.runId || existing.runId;
      }

      const incomingActual = incoming.costKind === "actual";
      const existingActual = existing.costKind === "actual";
      if (incomingActual || (!existingActual && (incomingHasBetterModel || (sameModel && incomingPriority >= existingPriority)))) {
        existing.costMin = incoming.costMin;
        existing.costMax = incoming.costMax;
        existing.costKind = incoming.costKind;
        existing.costSource = incoming.costSource;
        existing.costReason = incoming.costReason;
        existing.unitCostMin = incoming.unitCostMin;
        existing.unitCostMax = incoming.unitCostMax;
      }
      return existing;
    }

    upsertRecord(record) {
      const aliases = this.recordAliases(record);
      const indexAliases = this.recordIndexAliases(record);
      let key = record.key || null;
      for (const alias of indexAliases) {
        if (this.aliasIndex.has(alias)) {
          key = this.aliasIndex.get(alias);
          break;
        }
      }
      if (key && this.records.has(key)) {
        const merged = this.mergeRecord(this.records.get(key), record);
        this.records.set(key, merged);
        for (const alias of this.recordIndexAliases(merged)) this.aliasIndex.set(alias, key);
        this.counters.duplicatesMerged += 1;
        return merged;
      }
      const base = key || stableHash(aliases.join("|") || `${record.model}|${record.timestamp}|${this.records.size}`);
      key = base;
      let suffix = 1;
      while (this.records.has(key)) key = `${base}-${suffix++}`;
      record.key = key;
      record.aliases = aliases;
      this.records.set(key, record);
      for (const alias of this.recordIndexAliases(record)) this.aliasIndex.set(alias, key);
      return record;
    }

    makeCost(modelInfo, params, units, livePricing, explicitCharge, refunded) {
      if (refunded) {
        return { costMin: 0, costMax: 0, unitCostMin: 0, unitCostMax: 0, costKind: "actual", costSource: "refunded", costReason: "Запуск помечен как возвращённый (refunded)." };
      }
      if (explicitCharge) {
        return {
          costMin: explicitCharge.value,
          costMax: explicitCharge.value,
          unitCostMin: units ? explicitCharge.value / units : explicitCharge.value,
          unitCostMax: units ? explicitCharge.value / units : explicitCharge.value,
          costKind: "actual",
          costSource: explicitCharge.key,
          costReason: "Фактическое списание найдено в данных Weavy."
        };
      }
      const estimate = estimateUnitCredits(modelInfo, params, this.catalog, livePricing || this.modelLivePrices.get(modelInfo?.canonical));
      if (estimate.min == null || estimate.max == null) {
        return { costMin: null, costMax: null, unitCostMin: null, unitCostMax: null, costKind: "unknown", costSource: estimate.source, costReason: estimate.reason };
      }
      return {
        costMin: estimate.min * units,
        costMax: estimate.max * units,
        unitCostMin: estimate.min,
        unitCostMax: estimate.max,
        costKind: estimate.kind,
        costSource: estimate.source,
        costReason: estimate.reason
      };
    }

    buildHistoryRecord(nodeItem, generation, resultItem, index, meta) {
      const node = nodeItem.obj;
      const nodeId = node.id != null ? String(node.id) : extractNodeId(node);
      const nodeInfo = nodeId ? this.nodeMap.get(nodeId) : null;
      const generationObj = generation && typeof generation === "object" ? generation : { value: generation };
      const resultObj = resultItem && typeof resultItem === "object" ? resultItem : (resultItem != null ? { value: resultItem } : {});

      const nodeModel = nodeInfo ? {
        canonical: nodeInfo.model,
        raw: nodeInfo.modelRaw,
        entry: nodeInfo.modelEntry,
        resolvedBy: "node-map",
        sourceKey: nodeInfo.modelSourceKey || "node-map",
        confidence: Number(nodeInfo.modelConfidence || 0)
      } : this.resolveModelFromContainer(node, true);
      const generationModel = this.resolveModelFromContainer(generationObj, true);
      const resultModel = this.resolveModelFromContainer(resultObj, true);
      let modelInfo = chooseBestModel([generationModel, resultModel, nodeModel]) || unresolvedModelInfo();
      modelInfo = refineGptImageFamily(modelInfo, [node, generationObj, resultObj], this.catalogIndex);

      const batchId = extractBatchId(generationObj, meta.url) || extractBatchId(resultObj, meta.url);
      const generationId = primitiveAt(generationObj, ["generationId", "id", "runId", "predictionId", "jobId"]);
      const orderValue = primitiveAt(generationObj, ["order", "index", "inputIndex"]);
      const secondaryValue = primitiveAt(generationObj, ["secondaryOrder", "secondaryIndex"]);
      const ordinal = orderValue != null ? String(orderValue) : String(index);
      const secondary = secondaryValue != null ? String(secondaryValue) : "";
      const outputRefs = [...new Set([...extractOutputRefs(generationObj), ...extractOutputRefs(resultObj)])];
      const status = extractStatus(generationObj) || extractStatus(resultObj) || "STORED";
      const statusClass = classifyStatus(status);
      const refunded = Boolean(generationObj.refundedAt || resultObj.refundedAt);
      if (statusClass === "pending") { this.counters.ignoredPending += 1; return null; }
      if (statusClass === "failed" && !refunded && !extractExplicitCharge(generationObj)) { this.counters.ignoredFailed += 1; return null; }
      if (!batchId && generationId == null && !outputRefs.length) return null;

      const params = { ...collectParams(generationObj), ...collectParams(resultObj) };
      const explicitCharge = extractExplicitCharge(generationObj) || extractExplicitCharge(resultObj);
      const nodePricing = nodeInfo && nodeInfo.model === modelInfo.canonical ? (nodeInfo.livePricing || nodeInfo.liveRange) : null;
      const cost = this.makeCost(modelInfo, params, 1, nodePricing || this.modelLivePrices.get(modelInfo.canonical) || null, explicitCharge, refunded);
      const keyIdentity = `${nodeId || "node"}|${batchId || generationId || outputRefs[0] || "history"}|${ordinal}|${secondary}`;
      const aliases = [`history:${keyIdentity}`];
      if (batchId) aliases.push(`batch-item:${nodeId || "node"}:${batchId}:${ordinal}:${secondary}`);
      if (generationId != null) aliases.push(`generationid:${generationId}`);
      for (const ref of outputRefs) aliases.push(`output:${ref}`);

      return {
        key: stableHash(keyIdentity),
        aliases,
        scope: "item",
        units: 1,
        nodeId: nodeId || null,
        batchId: batchId || null,
        runId: generationObj.runId || null,
        executionIds: generationId != null ? [`generationid:${generationId}`] : [],
        model: modelInfo.canonical,
        modelRaw: modelInfo.raw,
        modelSource: generationModel === modelInfo ? "generation-record" : resultModel === modelInfo ? "result-record" : nodeInfo ? "node-map" : modelInfo.resolvedBy,
        modelConfidence: Number(modelInfo.confidence || 0),
        status,
        timestamp: extractTimestamp(generationObj, resultObj, node?.data, node) || meta.capturedAt || new Date().toISOString(),
        params,
        outputRefs,
        ...cost,
        sourceKind: "node-history",
        sourceUrl: sanitizeSourceUrl(meta.url || ""),
        sourcePath: `${nodeItem.path}.data.generations[${index}]`,
        evidence: ["stored-project-generation"],
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };
    }

    extractNodeHistory(items, meta, projectPayload) {
      if (!projectPayload) return 0;
      let added = 0;
      for (const item of items) {
        if (!pathLooksLikeNode(item.path, item.obj)) continue;
        const node = item.obj;
        const nodeId = node.id != null ? String(node.id) : extractNodeId(node);
        const nodeInfo = nodeId ? this.nodeMap.get(nodeId) : null;

        const generations = arrayAt(node, [
          "data.generations", "generations", "data.generationHistory", "data.history.generations",
          "data.mediaHistory", "data.outputsHistory"
        ]);
        const results = arrayAt(node, ["data.result", "data.results", "data.output", "data.outputs", "result", "results"]);

        if (generations?.length) {
          for (let index = 0; index < generations.length; index += 1) {
            const record = this.buildHistoryRecord(item, generations[index], results?.[index], index, meta);
            if (!record) continue;
            this.upsertRecord(record);
            added += 1;
          }
          continue;
        }

        if (results?.length) {
          const historicalResults = results.some((result) => {
            if (!result || typeof result !== "object") return false;
            return Boolean(extractBatchId(result, meta.url) || primitiveAt(result, ["generationId", "runId", "predictionId", "jobId"]));
          });
          if (!historicalResults) continue;
          for (let index = 0; index < results.length; index += 1) {
            const record = this.buildHistoryRecord(item, results[index], results[index], index, meta);
            if (!record) continue;
            record.sourceKind = "result-history";
            record.evidence = ["stored-project-result"];
            this.upsertRecord(record);
            added += 1;
          }
        }
      }
      this.counters.historyItems += added;
      return added;
    }

    resolveExecutionModel(obj) {
      const direct = this.resolveModelFromContainer(obj, true);
      const nodeId = extractNodeId(obj);
      const node = nodeId ? this.nodeMap.get(nodeId) : null;
      const nodeModel = node ? {
        canonical: node.model,
        raw: node.modelRaw,
        entry: node.modelEntry,
        resolvedBy: "node-map",
        source: "node-map",
        sourceKey: node.modelSourceKey || "node-map",
        confidence: Number(node.modelConfidence || 0),
        node
      } : null;
      let chosen = chooseBestModel([
        direct ? { ...direct, source: "record" } : null,
        nodeModel
      ]);
      if (!chosen) return null;
      chosen = refineGptImageFamily(chosen, [obj, node || null], this.catalogIndex);
      if (node && chosen.canonical === node.model) chosen.node = node;
      return chosen;
    }

    buildExecutionRecords(item, meta) {
      const obj = item.obj;
      const executionIds = extractExecutionIds(obj);
      if (!executionIds.length) return [];
      const status = extractStatus(obj);
      const statusClass = classifyStatus(status);
      const explicitCharge = extractExplicitCharge(obj);
      const refunded = Boolean(obj.refundedAt);
      if (statusClass === "pending") { this.counters.ignoredPending += 1; return []; }
      if (statusClass === "failed" && !refunded && !explicitCharge) { this.counters.ignoredFailed += 1; return []; }

      const modelInfo = this.resolveExecutionModel(obj);
      if (!modelInfo) {
        this.diagnostic("execution-model-not-resolved", item, meta, { executionIds });
        return [];
      }
      const nodeId = extractNodeId(obj) || modelInfo.node?.nodeId || null;
      const batchId = extractBatchId(obj, meta.url);
      const runIdEntry = executionIds.find((id) => id.startsWith("runid:"));
      const runId = runIdEntry ? runIdEntry.slice("runid:".length) : null;
      const outputRefs = extractOutputRefs(obj);
      const resultArray = arrayAt(obj, ["result", "results", "output", "outputs", "data.result", "data.results", "data.output", "data.outputs"]);
      const params = collectParams(obj);
      const livePricing = modelInfo.node?.livePricing || modelInfo.node?.liveRange || this.modelLivePrices.get(modelInfo.canonical) || null;
      const sourceKind = /\/batches\/[^/]+\/status/i.test(meta.url || "") || meta.source === "batch-history" ? "batch-status" : "execution";
      const timestamp = extractTimestamp(obj) || meta.capturedAt || new Date().toISOString();

      if (explicitCharge || refunded) {
        const units = Math.max(1, Array.isArray(resultArray) ? resultArray.length : 1);
        const cost = this.makeCost(modelInfo, params, units, livePricing, explicitCharge, refunded);
        const identity = `batch:${nodeId || "node"}:${batchId || runId || executionIds[0]}`;
        return [{
          key: stableHash(identity),
          aliases: [identity, ...executionIds, ...(batchId ? [`batch:${nodeId || "node"}:${batchId}`] : [])],
          scope: "batch",
          units,
          nodeId,
          batchId,
          runId,
          executionIds,
          model: modelInfo.canonical,
          modelRaw: modelInfo.raw,
          modelSource: modelInfo.source || modelInfo.resolvedBy,
          modelConfidence: Number(modelInfo.confidence || 0),
          status: status || (refunded ? "REFUNDED" : "CHARGED"),
          timestamp,
          params,
          outputRefs,
          ...cost,
          sourceKind,
          sourceUrl: sanitizeSourceUrl(meta.url || ""),
          sourcePath: item.path,
          evidence: [refunded ? "refunded-run" : "explicit-credit-charge"],
          firstSeenAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        }];
      }

      if (Array.isArray(resultArray) && resultArray.length) {
        const records = [];
        for (let index = 0; index < resultArray.length; index += 1) {
          const result = resultArray[index];
          const resultObj = result && typeof result === "object" ? result : { value: result };
          const resultBatchId = extractBatchId(resultObj, meta.url) || batchId;
          const orderValue = primitiveAt(resultObj, ["order", "index", "inputIndex"]);
          const secondaryValue = primitiveAt(resultObj, ["secondaryOrder", "secondaryIndex"]);
          const ordinal = orderValue != null ? String(orderValue) : String(index);
          const secondary = secondaryValue != null ? String(secondaryValue) : "";
          const resultRefs = extractOutputRefs(resultObj);
          const resultParams = { ...params, ...collectParams(resultObj) };
          const cost = this.makeCost(modelInfo, resultParams, 1, livePricing, null, false);
          const identity = `batch-item:${nodeId || "node"}:${resultBatchId || runId || executionIds[0]}:${ordinal}:${secondary}`;
          records.push({
            key: stableHash(identity),
            aliases: [identity, ...resultRefs.map((ref) => `output:${ref}`)],
            scope: "item",
            units: 1,
            nodeId,
            batchId: resultBatchId,
            runId,
            executionIds: index === 0 ? executionIds : [],
            model: modelInfo.canonical,
            modelRaw: modelInfo.raw,
            modelSource: modelInfo.source || modelInfo.resolvedBy,
            modelConfidence: Number(modelInfo.confidence || 0),
            status: status || "COMPLETED",
            timestamp: extractTimestamp(resultObj, obj) || timestamp,
            params: resultParams,
            outputRefs: resultRefs,
            ...cost,
            sourceKind,
            sourceUrl: sanitizeSourceUrl(meta.url || ""),
            sourcePath: `${item.path}.result[${index}]`,
            evidence: ["completed-run-output"],
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
          });
        }
        return records;
      }

      if (statusClass !== "success" && !outputRefs.length) return [];
      const cost = this.makeCost(modelInfo, params, 1, livePricing, null, false);
      const identity = `run:${nodeId || "node"}:${batchId || runId || executionIds[0]}`;
      return [{
        key: stableHash(identity),
        aliases: [identity, ...executionIds, ...(batchId ? [`batch:${nodeId || "node"}:${batchId}`] : [])],
        scope: "batch",
        units: 1,
        nodeId,
        batchId,
        runId,
        executionIds,
        model: modelInfo.canonical,
        modelRaw: modelInfo.raw,
        modelSource: modelInfo.source || modelInfo.resolvedBy,
        modelConfidence: Number(modelInfo.confidence || 0),
        status: status || "COMPLETED",
        timestamp,
        params,
        outputRefs,
        ...cost,
        sourceKind,
        sourceUrl: sanitizeSourceUrl(meta.url || ""),
        sourcePath: item.path,
        evidence: [statusClass === "success" ? "completed-run" : "run-output"],
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      }];
    }

    extractExecutions(items, meta, projectPayload) {
      if (!projectPayload) return 0;
      let added = 0;
      for (const item of items) {
        if (TEMPLATE_PATH_RE.test(item.path) || NON_PROJECT_URL_RE.test(meta.url || "")) continue;
        const records = this.buildExecutionRecords(item, meta);
        for (const record of records) {
          this.upsertRecord(record);
          added += 1;
        }
      }
      this.counters.executionItems += added;
      return added;
    }

    processPayload(payload) {
      const meta = {
        url: payload?.url || "",
        pageUrl: payload?.pageUrl || "",
        phase: payload?.phase || "response",
        transport: payload?.transport || "",
        source: payload?.source || "network",
        capturedAt: payload?.capturedAt || new Date().toISOString()
      };
      this.counters.payloads += 1;
      if (meta.phase === "request") this.counters.requestPayloads += 1;
      else if (meta.phase === "storage") this.counters.storagePayloads += 1;
      else this.counters.responsePayloads += 1;

      const data = payload?.data;
      const projectPayload = payloadBelongsToProject(meta, this.projectId, data) && !NON_PROJECT_URL_RE.test(meta.url || "");
      if (projectPayload) this.counters.projectPayloads += 1;
      const items = collectObjects(data);
      this.counters.objectsWalked += items.length;
      if (items.truncated) {
        this.counters.payloadsTruncated += 1;
        this.counters.queuedObjectsSkipped += Number(items.queued || 0);
        this.diagnostic("payload-object-limit", null, meta, {
          objectsWalked: items.walked || items.length,
          queuedObjectsSkipped: items.queued || 0,
          maxObjects: MAX_OBJECTS
        });
      }
      this.registerMappings(items, meta, projectPayload);
      const history = this.extractNodeHistory(items, meta, projectPayload);
      let executions = this.extractExecutions(items, meta, projectPayload);

      // Some Weavy batch-status responses expose the actual debit only on the
      // batch/root object, while the model identity lives inside a single nodeRun.
      // In that unambiguous one-run case, copy the batch charge onto the run so
      // the exact debit replaces the catalog estimate instead of being lost.
      const rootCharge = extractExplicitCharge(data);
      if (projectPayload && rootCharge) {
        const candidates = items.filter((item) => {
          if (TEMPLATE_PATH_RE.test(item.path)) return false;
          if (!extractExecutionIds(item.obj).length) return false;
          const statusClass = classifyStatus(extractStatus(item.obj));
          if (statusClass === "pending") return false;
          return Boolean(this.resolveExecutionModel(item.obj));
        });
        if (candidates.length === 1 && !extractExplicitCharge(candidates[0].obj)) {
          const chargedItem = {
            ...candidates[0],
            obj: { ...candidates[0].obj, creditsUsed: rootCharge.value }
          };
          for (const record of this.buildExecutionRecords(chargedItem, meta)) {
            record.evidence = [...new Set([...(record.evidence || []), "batch-root-credit-charge"])];
            this.upsertRecord(record);
            executions += 1;
          }
        }
      }

      return { changed: history + executions > 0, history, executions, projectPayload };
    }


    enrichOutputDimensions(outputUrl, width, height, source = "rendered-media") {
      const w = Math.round(Number(width));
      const h = Math.round(Number(height));
      if (!outputUrl || !Number.isFinite(w) || !Number.isFinite(h) || w < 64 || h < 64) return 0;
      let normalizedRef = String(outputUrl);
      try {
        const url = new URL(normalizedRef, "https://app.weavy.ai/");
        url.search = "";
        url.hash = "";
        normalizedRef = url.href.slice(0, 900);
      } catch {
        normalizedRef = normalizedRef.slice(0, 900);
      }
      const recordKey = this.aliasIndex.get(`item:output:${normalizedRef}`);
      if (!recordKey || !this.records.has(recordKey)) return 0;
      const record = this.records.get(recordKey);
      const widthKey = `enrichment.${source}.width`;
      const heightKey = `enrichment.${source}.height`;
      if (Number(record.params?.[widthKey]) === w && Number(record.params?.[heightKey]) === h) return 0;
      record.params = {
        ...(record.params || {}),
        [widthKey]: w,
        [heightKey]: h
      };
      record.evidence = [...new Set([...(record.evidence || []), `${source}-dimensions`])];
      record.lastSeenAt = new Date().toISOString();
      this.records.set(recordKey, record);
      this.counters.dimensionEnrichments += 1;
      return 1;
    }

    setScanMeta(meta) {
      this.scanMeta = meta || null;
    }

    getGroups() {
      const groups = new Map();
      for (const record of this.records.values()) {
        const groupKey = record.batchId
          ? `${record.nodeId || "node"}|${record.batchId}`
          : record.runId
            ? `${record.nodeId || "node"}|run:${record.runId}`
            : `record:${record.key}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(record);
      }
      return groups;
    }

    modelInfoForRecord(record) {
      const node = record?.nodeId ? this.nodeMap.get(record.nodeId) : null;
      const recordEntry = this.catalogIndex.exact.get(normalizeModelIdentity(record?.model || ""))
        || this.catalogIndex.exact.get(normalizeModelIdentity(record?.modelRaw || ""))
        || null;
      const recordModel = record ? {
        canonical: record.model || record.modelRaw || "Модель не определена",
        raw: record.modelRaw || record.model || "",
        entry: recordEntry,
        confidence: Number(record.modelConfidence || 0),
        sourceKey: record.modelSource || "record"
      } : null;
      const nodeModel = node ? {
        canonical: node.model,
        raw: node.modelRaw,
        entry: node.modelEntry,
        confidence: Number(node.modelConfidence || 0),
        sourceKey: node.modelSourceKey || "node-map",
        node
      } : null;
      let chosen = chooseBestModel([recordModel, nodeModel]) || unresolvedModelInfo();
      chosen = refineGptImageFamily(chosen, [record || null, node || null], this.catalogIndex);
      if (node && chosen.canonical === node.model) chosen.node = node;
      return chosen;
    }

    livePricingForRecord(record) {
      const modelInfo = this.modelInfoForRecord(record);
      return modelInfo.node?.livePricing
        || modelInfo.node?.liveRange
        || this.modelLivePrices.get(modelInfo.canonical)
        || null;
    }

    summarizeGroup(records) {
      const items = records.filter((record) => record.scope === "item");
      const batchRecords = records.filter((record) => record.scope !== "item");
      const actualBatch = batchRecords
        .filter((record) => record.costKind === "actual")
        .sort((a, b) => this.sourcePriority(b) - this.sourcePriority(a))[0] || null;
      const bestBatch = [...batchRecords].sort((a, b) => this.sourcePriority(b) - this.sourcePriority(a))[0] || null;
      const bestItem = [...items].sort((a, b) => this.sourcePriority(b) - this.sourcePriority(a))[0] || null;
      const representative = actualBatch || bestItem || bestBatch || records[0];
      const units = items.length
        ? items.reduce((sum, record) => sum + Number(record.units || 1), 0)
        : Number(bestBatch?.units || representative?.units || 1);
      const orderedRecords = [...records].sort((a, b) => this.sourcePriority(a) - this.sourcePriority(b));
      const sharedParams = Object.assign({}, ...orderedRecords.map((record) => record.params || {}));
      const parameterSummary = summarizeCanonicalParams(sharedParams, representative?.modelRaw || representative?.model || "");

      if (actualBatch) {
        return {
          representative,
          units,
          min: Number(actualBatch.costMin || 0),
          max: Number(actualBatch.costMax || 0),
          kind: "actual",
          unknownUnits: 0,
          params: sharedParams,
          parameterSummary,
          costSources: [actualBatch.costSource || "actual"],
          costReasons: [actualBatch.costReason || "Фактическое списание найдено в данных Weavy."],
          records
        };
      }

      if (items.length) {
        let min = 0;
        let max = 0;
        let unknownUnits = 0;
        let hasRange = false;
        let hasEstimate = false;
        let hasActual = false;
        const costSources = new Set();
        const costReasons = new Set();

        for (const record of items) {
          const itemUnits = Number(record.units || 1);
          let cost;
          if (record.costKind === "actual") {
            cost = record;
          } else {
            const combinedParams = { ...sharedParams, ...(record.params || {}) };
            const modelInfo = this.modelInfoForRecord(record);
            cost = this.makeCost(modelInfo, combinedParams, itemUnits, this.livePricingForRecord(record), null, false);
          }
          if (cost.costMin == null || cost.costMax == null) {
            unknownUnits += itemUnits;
            costSources.add(cost.costSource || "unresolved");
            if (cost.costReason) costReasons.add(cost.costReason);
            continue;
          }
          min += Number(cost.costMin);
          max += Number(cost.costMax);
          if (cost.costKind === "actual") hasActual = true;
          else hasEstimate = true;
          if (Number(cost.costMin) !== Number(cost.costMax)) hasRange = true;
          costSources.add(cost.costSource || "unknown");
          if (cost.costReason) costReasons.add(cost.costReason);
        }
        return {
          representative,
          units,
          min,
          max,
          kind: hasActual && !hasEstimate && !hasRange ? "actual" : hasRange ? "estimate-range" : (unknownUnits === units ? "unknown" : "estimate-exact"),
          unknownUnits,
          params: sharedParams,
          parameterSummary,
          costSources: [...costSources],
          costReasons: [...costReasons],
          records
        };
      }

      if (bestBatch) {
        let cost = bestBatch;
        if (bestBatch.costKind !== "actual") {
          const modelInfo = this.modelInfoForRecord(bestBatch);
          cost = this.makeCost(modelInfo, sharedParams, units, this.livePricingForRecord(bestBatch), null, false);
        }
        if (cost.costMin != null && cost.costMax != null) {
          return {
            representative,
            units,
            min: Number(cost.costMin),
            max: Number(cost.costMax),
            kind: cost.costKind,
            unknownUnits: 0,
            params: sharedParams,
            parameterSummary,
            costSources: [cost.costSource || "unknown"],
            costReasons: [cost.costReason || ""].filter(Boolean),
            records
          };
        }
      }
      return {
        representative,
        units,
        min: 0,
        max: 0,
        kind: "unknown",
        unknownUnits: units,
        params: sharedParams,
        parameterSummary,
        costSources: [bestBatch?.costSource || representative?.costSource || "unresolved"],
        costReasons: [bestBatch?.costReason || representative?.costReason || "Цена не определена."],
        records
      };
    }

    getReportRows() {
      const rows = [];
      for (const [groupKey, records] of this.getGroups()) {
        const group = this.summarizeGroup(records);
        const representative = group.representative || records[0] || {};
        const timestamps = records.map((record) => record.timestamp).filter(Boolean).sort();
        rows.push({
          groupKey,
          nodeId: representative.nodeId || null,
          batchId: representative.batchId || null,
          runId: representative.runId || null,
          model: representative.model || "Неизвестная модель",
          modelRaw: representative.modelRaw || null,
          status: representative.status || null,
          timestamp: timestamps[0] || representative.timestamp || null,
          generations: group.units,
          creditsMin: group.min,
          creditsMax: group.max,
          costKind: group.kind,
          costSource: group.costSources.join(" | "),
          costReason: group.costReasons.join(" | "),
          parameters: group.parameterSummary,
          unknownGenerations: group.unknownUnits,
          sourceKinds: [...new Set(records.map((record) => record.sourceKind).filter(Boolean))],
          evidence: [...new Set(records.flatMap((record) => record.evidence || []))]
        });
      }
      return rows.sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")) || a.model.localeCompare(b.model));
    }

    getSummary() {
      let totalMin = 0;
      let totalMax = 0;
      let actualCredits = 0;
      let estimatedExactCredits = 0;
      let rangeMin = 0;
      let rangeMax = 0;
      let generations = 0;
      let unknownGenerations = 0;
      let unresolvedModelGenerations = 0;
      let actualGroups = 0;
      let estimatedGroups = 0;
      let rangeGroups = 0;
      let parameterMatchedGroups = 0;
      let livePricedGroups = 0;
      const byModel = new Map();
      const groups = this.getGroups();

      for (const records of groups.values()) {
        const group = this.summarizeGroup(records);
        const model = group.representative?.model || "Неизвестная модель";
        if (!byModel.has(model)) {
          byModel.set(model, { model, generations: 0, groups: 0, min: 0, max: 0, actual: 0, estimatedExact: 0, unknown: 0, parameterMatched: 0 });
        }
        const row = byModel.get(model);
        row.generations += group.units;
        row.groups += 1;
        generations += group.units;
        if ((group.representative?.modelConfidence || 0) <= 0 || model === "Модель не определена") unresolvedModelGenerations += group.units;
        row.min += group.min;
        row.max += group.max;
        totalMin += group.min;
        totalMax += group.max;
        row.unknown += group.unknownUnits;
        unknownGenerations += group.unknownUnits;
        const groupSources = group.costSources || [];
        if (groupSources.some((source) => /parameter|formula/.test(String(source)))) {
          parameterMatchedGroups += 1;
          row.parameterMatched += 1;
        }
        if (groupSources.some((source) => /^live-model/.test(String(source)))) livePricedGroups += 1;

        if (group.kind === "actual") {
          actualCredits += group.min;
          row.actual += group.min;
          actualGroups += 1;
        } else if (group.kind === "estimate-exact") {
          estimatedExactCredits += group.min;
          row.estimatedExact += group.min;
          estimatedGroups += 1;
        } else if (group.kind === "estimate-range") {
          rangeMin += group.min;
          rangeMax += group.max;
          rangeGroups += 1;
        }
      }

      const rows = [...byModel.values()].sort((a, b) => b.max - a.max || b.generations - a.generations || a.model.localeCompare(b.model));
      return {
        totalMin,
        totalMax,
        actualCredits,
        estimatedExactCredits,
        rangeMin,
        rangeMax,
        generations,
        batches: groups.size,
        unknownGenerations,
        unresolvedModelGenerations,
        actualGroups,
        estimatedGroups,
        rangeGroups,
        parameterMatchedGroups,
        livePricedGroups,
        models: rows.length,
        rows,
        counters: { ...this.counters },
        scanMeta: this.scanMeta
      };
    }

    exportState() {
      return {
        schemaVersion: 9,
        projectId: this.projectId,
        catalogVersion: this.catalog.version,
        records: [...this.records.values()],
        nodes: [...this.nodeMap.values()],
        modelLivePrices: [...this.modelLivePrices.entries()],
        modelIdMap: [...this.modelIdMap.entries()],
        ambiguousModelIds: [...this.ambiguousModelIds],
        counters: { ...this.counters },
        scanMeta: this.scanMeta,
        updatedAt: new Date().toISOString()
      };
    }

    importState(state) {
      this.records = new Map();
      this.aliasIndex = new Map();
      if (state?.schemaVersion !== 9 || !Array.isArray(state.records)) return;
      for (const record of state.records) {
        if (!record?.key || !record?.model) continue;
        this.records.set(record.key, record);
        for (const alias of this.recordIndexAliases(record)) this.aliasIndex.set(alias, record.key);
      }
      this.nodeMap = new Map((state.nodes || []).filter((node) => node?.nodeId).map((node) => [node.nodeId, node]));
      this.modelLivePrices = new Map((state.modelLivePrices || []).filter((entry) => Array.isArray(entry) && entry.length === 2));
      this.modelIdMap = new Map((state.modelIdMap || []).filter((entry) => Array.isArray(entry) && entry.length === 2));
      this.ambiguousModelIds = new Set((state.ambiguousModelIds || []).filter((value) => typeof value === "string"));
      this.modelResolver = createModelResolver(this.catalogIndex, this.modelIdMap);
      if (state.counters && typeof state.counters === "object") this.counters = { ...this.counters, ...state.counters };
      this.scanMeta = state.scanMeta || null;
    }

    exportDiagnostics() {
      return {
        schemaVersion: 9,
        projectId: this.projectId,
        catalogVersion: this.catalog.version,
        summary: this.getSummary(),
        counters: { ...this.counters },
        scanMeta: this.scanMeta,
        nodes: [...this.nodeMap.values()].map((node) => ({
          nodeId: node.nodeId,
          model: node.model,
          modelRaw: node.modelRaw,
          modelConfidence: node.modelConfidence || 0,
          modelResolvedBy: node.modelResolvedBy || null,
          modelSourceKey: node.modelSourceKey || null,
          livePricing: node.livePricing || node.liveRange,
          sourcePath: node.sourcePath,
          sourceUrl: node.sourceUrl
        })),
        modelLivePrices: [...this.modelLivePrices.entries()].map(([model, pricing]) => ({ model, ...pricing })),
        modelMapDiagnostics: {
          aliases: this.modelIdMap.size,
          ambiguousAliases: this.ambiguousModelIds.size
        },
        records: [...this.records.values()].map((record) => ({
          ...record,
          aliases: (record.aliases || []).map((alias) => String(alias).startsWith("output:") ? `output:[REDACTED:${stableHash(alias)}]` : alias),
          outputRefs: (record.outputRefs || []).map((ref) => `[REDACTED_OUTPUT:${stableHash(ref)}]`)
        })),
        diagnostics: this.diagnostics
      };
    }

    reset() {
      this.modelIdMap = new Map();
      this.ambiguousModelIds = new Set();
      this.modelLivePrices = new Map();
      this.nodeMap = new Map();
      this.records = new Map();
      this.aliasIndex = new Map();
      this.diagnostics = [];
      this.scanMeta = null;
      this.counters = {
        payloads: 0,
        projectPayloads: 0,
        requestPayloads: 0,
        responsePayloads: 0,
        storagePayloads: 0,
        objectsWalked: 0,
        payloadsTruncated: 0,
        queuedObjectsSkipped: 0,
        dimensionEnrichments: 0,
        nodeMappings: 0,
        modelMappings: 0,
        ambiguousModelMappings: 0,
        historyItems: 0,
        executionItems: 0,
        duplicatesMerged: 0,
        ignoredPending: 0,
        ignoredFailed: 0,
        templatesIgnored: 0
      };
      this.modelResolver = createModelResolver(this.catalogIndex, this.modelIdMap);
    }
  }

  const api = {
    ProjectAnalyzer,
    createAnalyzer: (catalog, options) => new ProjectAnalyzer(catalog, options),
    helpers: {
      normalizeKey,
      normalizeText,
      normalizeModelIdentity,
      extractBatchId,
      extractLiveCreditRange,
      extractLivePricingProfile,
      mergeLivePricingProfiles,
      canonicalParams,
      summarizeCanonicalParams,
      estimateUnitCredits,
      collectObjects
    }
  };

  root.WeavyProjectCreditAnalyzerCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
