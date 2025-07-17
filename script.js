const boardElement = document.getElementById("chessboard");
const historyList = document.getElementById("move-history");

const whiteTimeEl = document.getElementById("white-time");
const blackTimeEl = document.getElementById("black-time");

const newGameBtn = document.getElementById("new-game");
const undoBtn = document.getElementById("undo");
const hintBtn = document.getElementById("hint");
const flipBtn = document.getElementById("flip");
const botBtn = document.getElementById("play-bot");
const pvpBtn = document.getElementById("play-pvp");

let game = new Chess();
let selectedSquare = null;
let flipped = false;
let gameMode = "pvp"; // 'pvp' or 'bot'
let moveHistory = [];
let timerInterval = null;
let whiteSeconds = 600;
let blackSeconds = 600;

const PIECES = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

function createBoard() {
  boardElement.innerHTML = "";
  const gameBoard = game.board();

  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];

  const displayRows = flipped ? rows : rows.slice().reverse();
  const displayCols = flipped ? cols.slice().reverse() : cols;

  for (let r of displayRows) {
    for (let c of displayCols) {
      const square = document.createElement("div");
      square.classList.add("square");
      const color = (r + c) % 2 === 0 ? "white" : "black";
      square.classList.add(color);
      square.dataset.row = r;
      square.dataset.col = c;

      const piece = gameBoard[r][c];
      if (piece) {
        const symbol = PIECES[piece.color === "w" ? piece.type.toUpperCase() : piece.type];
        square.textContent = symbol;
      }

      square.addEventListener("click", () => onSquareClick(r, c));
      boardElement.appendChild(square);
    }
  }
}

function onSquareClick(row, col) {
  const square = getSquareName(row, col);

  if (selectedSquare) {
    const move = game.move({ from: selectedSquare, to: square, promotion: "q" });

    if (move) {
      moveHistory.push(move);
      updateHistory();
      selectedSquare = null;
      clearHighlights();
      createBoard();
      updateTimer();
      checkGameOver();

      if (gameMode === "bot" && game.turn() === "b") {
        setTimeout(botMove, 500);
      }
    } else {
      selectedSquare = null;
      clearHighlights();
    }
  } else {
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      selectedSquare = square;
      highlightMoves(square);
    }
  }
}

function getSquareName(row, col) {
  const files = "abcdefgh";
  return files[col] + (8 - row);
}

function highlightMoves(square) {
  clearHighlights();
  const moves = game.moves({ square, verbose: true });
  moves.forEach(m => {
    const [r, c] = squareToCoords(m.to);
    const sq = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (sq) sq.classList.add("valid-move");
  });
  const [sr, sc] = squareToCoords(square);
  const selected = document.querySelector(`[data-row="${sr}"][data-col="${sc}"]`);
  if (selected) selected.classList.add("selected");
}

function squareToCoords(square) {
  const file = square[0].charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}

function clearHighlights() {
  document.querySelectorAll(".square").forEach(sq =>
    sq.classList.remove("selected", "valid-move")
  );
}

function botMove() {
  if (game.game_over()) return;

  const moves = game.moves({ verbose: true });
  const move = moves[Math.floor(Math.random() * moves.length)];
  if (move) {
    game.move(move.san);
    moveHistory.push(move);
    updateHistory();
    createBoard();
    updateTimer();
    checkGameOver();
  }
}

function updateHistory() {
  historyList.innerHTML = "";
  moveHistory.forEach((m, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${m.san}`;
    historyList.appendChild(li);
  });
}

function undoMove() {
  game.undo();
  if (gameMode === "bot") game.undo(); // undo bot too
  moveHistory.pop();
  moveHistory.pop();
  createBoard();
  updateHistory();
}

function showHint() {
  const moves = game.moves({ verbose: true });
  const move = moves.find(m => m.color === game.turn());
  if (move) {
    highlightMoves(move.from);
  }
}

function updateTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (game.turn() === "w") whiteSeconds--;
    else blackSeconds--;

    whiteTimeEl.textContent = formatTime(whiteSeconds);
    blackTimeEl.textContent = formatTime(blackSeconds);

    whiteTimeEl.classList.toggle("low", whiteSeconds <= 30 && game.turn() === "w");
    blackTimeEl.classList.toggle("low", blackSeconds <= 30 && game.turn() === "b");

    if (whiteSeconds <= 0 || blackSeconds <= 0) {
      clearInterval(timerInterval);
      alert(`${game.turn() === "w" ? "Black" : "White"} wins by timeout!`);
    }
  }, 1000);
}

function resetGame(mode = "pvp") {
  game = new Chess();
  selectedSquare = null;
  moveHistory = [];
  gameMode = mode;
  whiteSeconds = 600;
  blackSeconds = 600;
  whiteTimeEl.textContent = "10:00";
  blackTimeEl.textContent = "10:00";
  updateHistory();
  createBoard();
  updateTimer();
}

function checkGameOver() {
  if (game.in_checkmate()) {
    clearInterval(timerInterval);
    alert(`Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`);
  } else if (game.in_draw()) {
    clearInterval(timerInterval);
    alert("Draw!");
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Event Listeners
newGameBtn.addEventListener("click", () => resetGame(gameMode));
undoBtn.addEventListener("click", undoMove);
hintBtn.addEventListener("click", showHint);
flipBtn.addEventListener("click", () => {
  flipped = !flipped;
  createBoard();
});
botBtn.addEventListener("click", () => resetGame("bot"));
pvpBtn.addEventListener("click", () => resetGame("pvp"));

// Start the game
resetGame();
