(function () {
  const STORAGE_KEY = "medisParkVisits";
  const VISITOR_KEY = "medisParkVisitorId";
  const SESSION_KEY = "medisParkSessionId";
  const MAX_VISITS = 500;

  function getRemoteUrl() {
    return (window.MEDIS_REMOTE_ANALYTICS_URL || "").trim();
  }

  function randomId(prefix) {
    const seed = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${seed}`;
  }

  function getStoredId(key, prefix, storage) {
    let value = storage.getItem(key);
    if (!value) {
      value = randomId(prefix);
      storage.setItem(key, value);
    }
    return value;
  }

  function parseBrowser(ua) {
    if (/Edg\//.test(ua)) return "Edge";
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/OPR\//.test(ua)) return "Opera";
    return "Unknown";
  }

  function parseOs(ua, platform) {
    if (/Windows/i.test(platform) || /Windows/i.test(ua)) return "Windows";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Mac/i.test(platform) || /Mac OS/i.test(ua)) return "macOS";
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";
    return "Unknown";
  }

  function parseDevice(ua) {
    if (/iPad|Tablet|PlayBook/i.test(ua)) return "Tablet";
    if (/Mobile|Android|iPhone|iPod/i.test(ua)) return "Mobile";
    return "Desktop";
  }

  function inferRegion(timezone, language) {
    const regions = {
      "Asia/Seoul": "대한민국",
      "Asia/Tokyo": "일본",
      "Asia/Shanghai": "중국",
      "Asia/Hong_Kong": "홍콩",
      "Asia/Taipei": "대만",
      "America/New_York": "미국 동부",
      "America/Chicago": "미국 중부",
      "America/Denver": "미국 산악",
      "America/Los_Angeles": "미국 서부",
      "Europe/London": "영국",
      "Europe/Paris": "프랑스/중부유럽",
    };

    if (regions[timezone]) return regions[timezone];
    if (/^ko/i.test(language)) return "대한민국 추정";
    if (/^ja/i.test(language)) return "일본 추정";
    if (/^zh/i.test(language)) return "중화권 추정";
    if (/^en-US/i.test(language)) return "미국 추정";
    return timezone || "Unknown";
  }

  function getVisits() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveVisits(visits) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits.slice(-MAX_VISITS)));
  }

  function sendRemote(visit) {
    const endpoint = getRemoteUrl();
    if (!endpoint) return;

    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(visit));

    fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      body,
    }).catch(() => {});
  }

  function getRemoteVisits() {
    const endpoint = getRemoteUrl();
    if (!endpoint) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const callbackName = `medisAnalyticsJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const separator = endpoint.includes("?") ? "&" : "?";
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (data) => {
        cleanup();
        resolve(Array.isArray(data) ? data : data.visits || []);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("원격 통계 데이터를 불러오지 못했습니다."));
      };

      script.src = `${endpoint}${separator}mode=list&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  function addRecord(type, detail) {
    const nav = navigator;
    const ua = nav.userAgent || "";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const language = nav.language || "";
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    const visit = {
      id: randomId(type),
      type,
      detail: detail || "",
      visitedAt: new Date().toISOString(),
      visitorId: getStoredId(VISITOR_KEY, "visitor", localStorage),
      sessionId: getStoredId(SESSION_KEY, "session", sessionStorage),
      path: location.pathname,
      title: document.title,
      referrer: document.referrer || "direct",
      query: location.search || "",
      hash: location.hash || "",
      region: inferRegion(timezone, language),
      timezone,
      language,
      languages: Array.from(nav.languages || [language]).join(", "),
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      os: parseOs(ua, nav.platform || ""),
      platform: nav.platform || "",
      userAgent: ua,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${window.screen.width}x${window.screen.height}`,
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth || "",
      cpuCores: nav.hardwareConcurrency || "",
      memoryGb: nav.deviceMemory || "",
      touch: "ontouchstart" in window || nav.maxTouchPoints > 0,
      online: nav.onLine,
      connection: connection.effectiveType || "",
      downlink: connection.downlink || "",
      rtt: connection.rtt || "",
    };

    const visits = getVisits();
    visits.push(visit);
    saveVisits(visits);
    sendRemote(visit);
    return visit;
  }

  function toCsv(rows) {
    const columns = [
      "visitedAt", "type", "detail", "region", "timezone", "device", "browser",
      "os", "language", "viewport", "screen", "referrer", "path", "visitorId",
      "sessionId", "cpuCores", "memoryGb", "connection", "userAgent"
    ];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    return [columns.join(","), ...rows.map((row) => columns.map((col) => escape(row[col])).join(","))].join("\n");
  }

  function downloadCsv() {
    const csv = toCsv(getVisits());
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medis-park-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearVisits() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.MedisAnalytics = {
    getVisits,
    addRecord,
    getRemoteVisits,
    hasRemote: () => Boolean(getRemoteUrl()),
    downloadCsv,
    clearVisits,
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.admin === "true") return;

    addRecord("pageview");

    document.querySelectorAll("a[href^='tel:']").forEach((link) => {
      link.addEventListener("click", () => addRecord("call_click", link.textContent.trim()));
    });

    document.querySelectorAll("a[href^='#visit'], .type-card").forEach((element) => {
      element.addEventListener("click", () => addRecord("cta_click", element.textContent.trim().replace(/\s+/g, " ")));
    });

    const form = document.querySelector("#leadForm");
    if (form) {
      form.addEventListener("submit", () => addRecord("form_submit", "상담예약"));
    }
  });
})();
