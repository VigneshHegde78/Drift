const pill = document.createElement("div");

pill.id = "drift-pill";

pill.innerHTML = `
  <span class="drift-dot"></span>
  <span id="drift-time">00:00</span>
  <span class="drift-divider"></span>
  <span>0 swipes</span>
`;

document.body.appendChild(pill);

// TIMER LOGIC

let seconds = 0;

const timerElement = document.getElementById("drift-time");

function updateTimer() {
  seconds++;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

  timerElement.textContent = formattedTime;
}

setInterval(updateTimer, 1000);

// DRAGGABLE PILL

let isDragging = false;

let offsetX = 0;
let offsetY = 0;

pill.addEventListener("mousedown", function (event) {
  isDragging = true;

  const rect = pill.getBoundingClientRect();

  offsetX = event.clientX - rect.left;
  offsetY = event.clientY - rect.top;
});

document.addEventListener("mousemove", function (event) {
  if (!isDragging) return;

  pill.style.left = `${event.clientX - offsetX}px`;
  pill.style.top = `${event.clientY - offsetY}px`;

  pill.style.right = "auto";
  pill.style.bottom = "auto";
});

document.addEventListener("mouseup", function () {
  isDragging = false;
});
