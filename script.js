const typeCards = document.querySelectorAll(".type-card");
const typeSelect = document.querySelector("#typeSelect");
const leadForm = document.querySelector("#leadForm");
const formNote = document.querySelector("#formNote");
const brandMark = document.querySelector(".site-header .brand-mark");
const ADMIN_PASSWORD = "20260603";
let adminTapCount = 0;
let adminTapTimer;

typeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const selectedType = card.dataset.type;

    typeCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    if (typeSelect) {
      typeSelect.value = selectedType;
    }

    document.querySelector("#visit").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

if (leadForm && formNote) {
  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formNote.textContent =
      "상담예약 신청이 접수되었습니다. 담당자가 잔여세대와 방문 가능 시간을 안내드립니다.";
    formNote.classList.add("submitted");
    leadForm.reset();
  });
}

if (brandMark) {
  brandMark.title = "MEDIS PARK";
  brandMark.addEventListener("click", (event) => {
    event.preventDefault();
    adminTapCount += 1;
    clearTimeout(adminTapTimer);

    if (adminTapCount >= 5) {
      adminTapCount = 0;
      const password = prompt("관리자 비밀번호를 입력하세요.");

      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem("medisAdminAuthed", "true");
        window.location.href = "admin.html";
      } else if (password !== null) {
        alert("비밀번호가 올바르지 않습니다.");
      }

      return;
    }

    adminTapTimer = setTimeout(() => {
      adminTapCount = 0;
    }, 1600);
  });
}
