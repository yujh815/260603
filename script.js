const typeCards = document.querySelectorAll(".type-card");
const typeSelect = document.querySelector("#typeSelect");
const leadForm = document.querySelector("#leadForm");
const formNote = document.querySelector("#formNote");

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
