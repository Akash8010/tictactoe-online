// ===== PROFILE + MODE =====
const socket = io("https://YOUR-SERVER-URL"); // <-- Replace with your server address

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const boardSizeSelect = document.getElementById("boardSize");
const difficultySelect = document.getElementById("difficulty");
const gameArea = document.getElementById("gameArea");
const result = document.getElementById("result");
const resultText = document.getElementById("resultText");
const playAgainBtn = document.getElementById("playAgain");
const shareBtn = document.getElementById("shareScore");
const restartBtn = document.getElementById("restartBtn");

// Profile
const nameInput = document.getElementById("playerName");
const saveName = document.getElementById("saveName");
const currentName = document.getElementById("currentName");
const profileSection = document.getElementById("profileSection");
const levelSection = document.getElementById("levelSection");
const modeSection = document.getElementById("modeSection");
const uploadBtn = document.getElementById("uploadBtn");
const uploadPhoto = document.getElementById("uploadPhoto");
const profilePhoto = document.getElementById("profilePhoto");
const resultPhoto = document.getElementById("resultPhoto");
const resultName = document.getElementById("resultName");

// Online
const singleModeBtn = document.getElementById("singleMode");
const onlineModeBtn = document.getElementById("onlineMode");
const onlineSetup = document.getElementById("onlineSetup");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const roomInput = document.getElementById("roomInput");
const roomInfo = document.getElementById("roomInfo");

let playerName = localStorage.getItem("playerName") || null;
let playerImage = localStorage.getItem("playerImage") || "default-avatar.png";
let board = [];
let size = 3, difficulty = "medium";
let online = false, running = false;
let roomId = null, mySymbol = "X";

// Load saved profile
profilePhoto.src = playerImage;
resultPhoto.src = playerImage;
if (playerName) {
  currentName.textContent = `Player: ${playerName}`;
  currentName.classList.remove("hidden");
  modeSection.classList.remove("hidden");
}

// Photo upload
uploadBtn.onclick = () => uploadPhoto.click();
uploadPhoto.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profilePhoto.src = reader.result;
    localStorage.setItem("playerImage", reader.result);
    resultPhoto.src = reader.result;
  };
  reader.readAsDataURL(file);
};

// Save name
saveName.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Please enter your name!");
  playerName = name;
  localStorage.setItem("playerName", name);
  currentName.textContent = `Player: ${name}`;
  currentName.classList.remove("hidden");
  modeSection.classList.remove("hidden");
};

// Switch modes
singleModeBtn.onclick = () => {
  online = false;
  levelSection.classList.remove("hidden");
  onlineSetup.classList.add("hidden");
};
onlineModeBtn.onclick = () => {
  online = true;
  onlineSetup.classList.remove("hidden");
  levelSection.classList.add("hidden");
};

// ===== ONLINE SETUP =====
createRoomBtn.onclick = () => {
  const id = Math.random().toString(36).slice(2, 7);
  socket.emit("createRoom", id);
};
joinRoomBtn.onclick = () => {
  const id = roomInput.value.trim();
  if (id) socket.emit("joinRoom", id);
};

socket.on("roomCreated", (id) => {
  roomId = id;
  roomInfo.textContent = `Room created: ${id}. Share this ID with your friend.`;
  mySymbol = "X";
});
socket.on("startGame", () => {
  roomInfo.textContent = "Friend joined! Starting game...";
  setTimeout(startGame, 1000);
});
socket.on("opponentMove", ({ index, symbol }) => {
  board[index] = symbol;
  renderBoard();
  if (checkWin(symbol)) endGame("Your friend wins!");
  running = true;
});
socket.on("opponentLeft", () => {
  alert("Your friend left.");
  location.reload();
});
socket.on("errorMsg", (msg) => alert(msg));

// ===== GAME LOGIC =====
startBtn.onclick = startGame;
restartBtn.onclick = startGame;
playAgainBtn.onclick = startGame;

function startGame() {
  size = parseInt(boardSizeSelect.value);
  difficulty = difficultySelect.value;
  board = Array(size * size).fill("");
  running = true;
  result.classList.add("hidden");
  gameArea.classList.remove("hidden");

  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  board.forEach((_, i) => {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.addEventListener("click", () => handleMove(i));
    boardEl.appendChild(cell);
  });
  statusEl.textContent = "Your Turn (X)";
}

function handleMove(index) {
  if (!running || board[index]) return;

  if (online) {
    board[index] = mySymbol;
    renderBoard();
    socket.emit("makeMove", { roomId, index, symbol: mySymbol });
    if (checkWin(mySymbol)) return endGame("You win!");
    running = false;
    return;
  }

  board[index] = "X";
  renderBoard();
  if (checkWin("X")) return endGame(`${playerName} wins! 🏆`);
  if (board.every(c => c)) return endGame("Draw 🤝");

  statusEl.textContent = "Computer thinking...";
  running = false;
  setTimeout(() => {
    aiMove();
    if (checkWin("O")) return endGame("Computer wins 💻");
    running = true;
    statusEl.textContent = "Your Turn (X)";
  }, 400);
}

function aiMove() {
  const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
  let move;
  if (difficulty === "easy") move = empty[Math.floor(Math.random() * empty.length)];
  else move = mediumAI(empty);
  board[move] = "O";
  renderBoard();
}
function mediumAI(empty) {
  for (let i of empty) {
    board[i] = "O"; if (checkWin("O")) { board[i] = ""; return i; } board[i] = "";
  }
  for (let i of empty) {
    board[i] = "X"; if (checkWin("X")) { board[i] = ""; return i; } board[i] = "";
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

function renderBoard() { [...boardEl.children].forEach((c, i) => c.textContent = board[i]); }
function checkWin(sym) {
  const lines = [];
  for (let r = 0; r < size; r++) lines.push([...Array(size)].map((_, i) => r * size + i));
  for (let c = 0; c < size; c++) lines.push([...Array(size)].map((_, i) => i * size + c));
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => i * size + (size - 1 - i)));
  return lines.some(line => line.every(i => board[i] === sym));
}

function endGame(msg) {
  running = false;
  gameArea.classList.add("hidden");
  result.classList.remove("hidden");
  resultText.textContent = msg;
  resultName.textContent = playerName;
  resultPhoto.src = playerImage;
}

