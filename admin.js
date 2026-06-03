const totalVisits = document.querySelector("#totalVisits");
const uniqueVisitors = document.querySelector("#uniqueVisitors");
const todayVisits = document.querySelector("#todayVisits");
const mobileRatio = document.querySelector("#mobileRatio");
const visitRows = document.querySelector("#visitRows");
const currentEnv = document.querySelector("#currentEnv");
const dataSourceNote = document.querySelector("#dataSourceNote");
const ADMIN_PASSWORD = "20260603";
let currentRows = [];

function requireAdminAuth() {
  if (sessionStorage.getItem("medisAdminAuthed") === "true") return true;

  const password = prompt("관리자 비밀번호를 입력하세요.");
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("medisAdminAuthed", "true");
    return true;
  }

  document.body.innerHTML = `
    <main class="admin-lock">
      <section>
        <span class="brand-mark">M</span>
        <h1>관리자 인증이 필요합니다</h1>
        <p>비밀번호가 일치하지 않아 관리자 페이지를 표시할 수 없습니다.</p>
        <a class="btn btn-primary" href="index.html">랜딩페이지로 이동</a>
      </section>
    </main>
  `;
  return false;
}

if (!requireAdminAuth()) {
  throw new Error("Admin authentication required");
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderBars(targetId, stats) {
  const target = document.querySelector(`#${targetId}`);
  const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((entry) => entry[1]), 1);

  target.innerHTML = entries.length
    ? entries
        .map(([label, count]) => {
          const width = Math.max((count / max) * 100, 8);
          return `
            <div class="bar-row">
              <div class="bar-meta">
                <span>${label}</span>
                <strong>${count}</strong>
              </div>
              <div class="bar-track"><i style="width: ${width}%"></i></div>
            </div>
          `;
        })
        .join("")
    : `<p class="empty-text">아직 데이터가 없습니다.</p>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderTable(rows) {
  visitRows.innerHTML = rows
    .slice()
    .reverse()
    .slice(0, 80)
    .map((row) => `
      <tr>
        <td>${formatDate(row.visitedAt)}</td>
        <td><span class="pill">${row.type}</span></td>
        <td>${row.region}</td>
        <td>${row.device}</td>
        <td>${row.browser}</td>
        <td>${row.os}</td>
        <td>${row.viewport}</td>
        <td>${row.referrer === "direct" ? "직접접속" : row.referrer}</td>
      </tr>
    `)
    .join("");
}

function renderCurrentEnv(rows) {
  const latest = rows[rows.length - 1];
  if (!latest) {
    currentEnv.innerHTML = `<dt>상태</dt><dd>랜딩페이지에 한 번 접속하면 데이터가 생성됩니다.</dd>`;
    return;
  }

  const items = {
    "지역 추정": latest.region,
    "시간대": latest.timezone,
    "언어": latest.language,
    "기기": latest.device,
    "브라우저": latest.browser,
    "운영체제": latest.os,
    "플랫폼": latest.platform,
    "화면": latest.screen,
    "뷰포트": latest.viewport,
    "CPU 코어": latest.cpuCores || "Unknown",
    "메모리": latest.memoryGb ? `${latest.memoryGb}GB` : "Unknown",
    "네트워크": latest.connection || "Unknown",
  };

  currentEnv.innerHTML = Object.entries(items)
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join("");
}

function downloadRowsCsv(rows) {
  const columns = [
    "visitedAt", "type", "detail", "region", "timezone", "device", "browser",
    "os", "language", "viewport", "screen", "referrer", "path", "visitorId",
    "sessionId", "cpuCores", "memoryGb", "connection", "userAgent"
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.join(","), ...rows.map((row) => columns.map((col) => escape(row[col])).join(","))].join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `medis-park-all-visits-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadRows() {
  const localRows = window.MedisAnalytics.getVisits();

  if (!window.MedisAnalytics.hasRemote()) {
    dataSourceNote.textContent =
      "현재는 이 브라우저에 저장된 데이터만 표시합니다. config.js에 원격 저장소 URL을 넣으면 모든 방문자 통계가 표시됩니다.";
    return localRows;
  }

  try {
    const remoteRows = await window.MedisAnalytics.getRemoteVisits();
    dataSourceNote.textContent =
      "중앙 저장소에서 모든 방문자 접속 통계를 불러왔습니다. 지역은 브라우저 시간대와 언어 기반 추정값입니다.";
    return remoteRows.length ? remoteRows : localRows;
  } catch (error) {
    dataSourceNote.textContent =
      "중앙 저장소 연결에 실패해 현재 브라우저 데이터만 표시합니다. 저장소 URL과 배포 권한을 확인하세요.";
    return localRows;
  }
}

async function render() {
  const rows = await loadRows();
  currentRows = rows;
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Set(rows.map((row) => row.visitorId));
  const mobile = rows.filter((row) => row.device === "Mobile").length;

  totalVisits.textContent = rows.length.toLocaleString("ko-KR");
  uniqueVisitors.textContent = unique.size.toLocaleString("ko-KR");
  todayVisits.textContent = rows.filter((row) => row.visitedAt.slice(0, 10) === today).length.toLocaleString("ko-KR");
  mobileRatio.textContent = rows.length ? `${Math.round((mobile / rows.length) * 100)}%` : "0%";

  renderBars("regionStats", countBy(rows, "region"));
  renderBars("deviceStats", countBy(rows, "device"));
  renderBars("browserStats", countBy(rows, "browser"));
  renderBars("eventStats", countBy(rows, "type"));
  renderTable(rows);
  renderCurrentEnv(rows);
}

document.querySelector("#refreshBtn").addEventListener("click", render);
document.querySelector("#exportBtn").addEventListener("click", () => downloadRowsCsv(currentRows));
document.querySelector("#clearBtn").addEventListener("click", () => {
  if (confirm("현재 브라우저에 저장된 통계 데이터를 삭제할까요?")) {
    window.MedisAnalytics.clearVisits();
    render();
  }
});

render();
