const board = document.getElementById("chessboard");
const moveHistoryList = document.getElementById("move-history");

const whiteTimeEl = document.getElementById("white-time");
const blackTimeEl = document.getElementById("black-time");

const newGameBtn = document.getElementById("new-game");
const undoBtn = document.getElementById("undo");
const hintBtn = document.getElementById("hint");
const flipBtn = document.getElementById("flip");
const botBtn = document.getElementById("play-bot");
const pvpBtn = document.getElementById("play-pvp");

let boardState = [];
let selected = null;
let currentPlayer = "white";
let gameMode = "pvp"; // or "bot"
let flipped = false;
let history = [];
let timer;
let whiteSeconds = 600;
let blackSeconds = 600;

const PIECES = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const initialBoard = [
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"]
];

function createBoard() {
  board.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    boardState[row] = [];
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.classList.add((row + col) % 2 === 0 ? "white" : "black");
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = initialBoard[row][col];
      boardState[row][col] = piece;
      if (piece) square.textContent = PIECES[piece];

      square.addEventListener("click", handleClick);
      board.appendChild(square);
    }
  }
  resetTimer();
  startTimer();
  history = [];
  updateHistory();
}

function handleClick(e) {
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  const piece = boardState[row][col];

  if (selected) {
    movePiece(selected, { row, col });
    selected = null;
    clearHighlights();
    return;
  }

  if (piece && piece[0] === currentPlayer[0]) {
    selected = { row, col };
    highlightMoves(row, col);
  }
}

function movePiece(from, to) {
  const piece = boardState[from.row][from.col];
  const captured = boardState[to.row][to.col];

  if (piece[0] !== currentPlayer[0]) return;

  history.push({ from, to, piece, captured });
  boardState[to.row][to.col] = piece;
  boardState[from.row][from.col] = "";

  renderBoard();
  switchPlayer();

  updateHistory();

  if (gameMode === "bot" && currentPlayer === "black") {
    setTimeout(botMove, 800);
  }
}

function renderBoard() {
  [...document.querySelectorAll(".square")].forEach(square => {
    const r = +square.dataset.row;
    const c = +square.dataset.col;
    const piece = boardState[r][c];
    square.textContent = piece ? PIECES[piece] : "";
  });
}

function highlightMoves(row, col) {
  clearHighlights();
  const moves = getPseudoMoves(row, col);
  moves.forEach(({ row, col }) => {
    const square = getSquare(row, col);
    if (square) square.classList.add("valid-move");
  });
  getSquare(row, col).classList.add("selected");
}

function getPseudoMoves(row, col) {
  const piece = boardState[row][col];
  const type = piece[1];
  const color = piece[0];
  const moves = [];

  const directions = {
    N: [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]],
    B: [[-1,-1],[1,1],[1,-1],[-1,1]],
    R: [[-1,0],[1,0],[0,-1],[0,1]],
    Q: [[-1,-1],[1,1],[1,-1],[-1,1],[-1,0],[1,0],[0,-1],[0,1]],
    K: [[-1,-1],[1,1],[1,-1],[-1,1],[-1,0],[1,0],[0,-1],[0,1]]
  };

  if (type === "N") {
    directions.N.forEach(([dr, dc]) => {
      const [r, c] = [row + dr, col + dc];
      if (valid(r, c) && (!boardState[r][c] || boardState[r][c][0] !== color)) {
        moves.push({ row: r, col: c });
      }
    });
  } else if (type === "B" || type === "R" || type === "Q") {
    directions[type].forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (valid(r, c)) {
        if (!boardState[r][c]) {
          moves.push({ row: r, col: c });
        } else {
          if (boardState[r][c][0] !== color) moves.push({ row: r, col: c });
          break;
        }
        r += dr;
        c += dc;
      }
    });
  } else if (type === "K") {
    directions.K.forEach(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      if (valid(r, c) && (!boardState[r][c] || boardState[r][c][0] !== color)) {
        moves.push({ row: r, col: c });
      }
    });
  } else if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    if (valid(row + dir, col) && !boardState[row + dir][col]) {
      moves.push({ row: row + dir, col });
    }
    if ((color === "w" && row === 6) || (color === "b" && row === 1)) {
      if (!boardState[row + dir][col] && !boardState[row + 2 * dir][col]) {
        moves.push({ row: row + 2 * dir, col });
      }
    }
    [-1, 1].forEach(dc => {
      const r = row + dir, c = col + dc;
      if (valid(r, c) && boardState[r][c] && boardState[r][c][0] !== color) {
        moves.push({ row: r, col: c });
      }
    });
  }

  return moves;
}

function valid(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getSquare(row, col) {
  return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function clearHighlights() {
  document.querySelectorAll(".square").forEach(sq =>
    sq.classList.remove("valid-move", "selected")
  );
}

function switchPlayer() {
  currentPlayer = currentPlayer === "white" ? "black" : "white";
}

function botMove() {
  let options = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r][c];
      if (piece && piece[0] === "b") {
        const moves = getPseudoMoves(r, c);
        moves.forEach(m => options.push({ from: { row: r, col: c }, to: m }));
      }
    }
  }
  if (options.length === 0) return;
  const move = options[Math.floor(Math.random() * options.length)];
  movePiece(move.from, move.to);
}

function undoMove() {
  const last = history.pop();
  if (!last) return;

  boardState[last.from.row][last.from.col] = last.piece;
  boardState[last.to.row][last.to.col] = last.captured;

  currentPlayer = last.piece[0] === "w" ? "white" : "black";

  renderBoard();
  updateHistory();
}

function showHint() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r][c];
      if (piece && piece[0] === currentPlayer[0]) {
        const moves = getPseudoMoves(r, c);
        if (moves.length > 0) {
          highlightMoves(r, c);
          return;
        }
      }
    }
  }
}

function updateHistory() {
  moveHistoryList.innerHTML = "";
  history.forEach((h, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${getSquareName(h.from)} → ${getSquareName(h.to)}`;
    moveHistoryList.appendChild(li);
  });
}

function getSquareName(pos) {
  const file = "abcdefgh"[pos.col];
  const rank = 8 - pos.row;
  return `${file}${rank}`;
}

function resetTimer() {
  whiteSeconds = 600;
  blackSeconds = 600;
  updateTimeDisplay();
}

function updateTimeDisplay() {
  whiteTimeEl.textContent = formatTime(whiteSeconds);
  blackTimeEl.textContent = formatTime(blackSeconds);
  whiteTimeEl.classList.toggle("low", whiteSeconds <= 30 && currentPlayer === "white");
  blackTimeEl.classList.toggle("low", blackSeconds <= 30 && currentPlayer === "black");
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (currentPlayer === "white") whiteSeconds--;
    else blackSeconds--;

    if (whiteSeconds <= 0 || blackSeconds <= 0) {
      clearInterval(timer);
      alert(`${currentPlayer === "white" ? "Black" : "White"} wins on time!`);
    }

    updateTimeDisplay();
  }, 1000);
}

// Event Listeners
newGameBtn.addEventListener("click", createBoard);
undoBtn.addEventListener("click", undoMove);
hintBtn.addEventListener("click", showHint);
flipBtn.addEventListener("click", () => board.classList.toggle("flipped"));
botBtn.addEventListener("click", () => {
  gameMode = "bot";
  createBoard();
});
pvpBtn.addEventListener("click", () => {
  gameMode = "pvp";
  createBoard();
});

// Initialize game
createBoard();