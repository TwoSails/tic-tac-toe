import { Game, Cell } from "tic-tac-toe"
import { memory } from "tic-tac-toe/tic_tac_toe_bg.wasm";

const CELL_SIZE = 200;
const OFFSET_X = 0;
const OFFSET_Y = 0;
const MARKER_OFFSET = 20;


const GRID_COLOUR = "#F6BE9A";
const MARKER_COLOUR = "#FAF4D3";
const ALT_MARKER_COLOUR = "#fad2d2";
const MARKER_LINE_THICKNESS = 4;
const WINNER_MARKER = "#D1AC00";

const game = Game.new();
const width = game.width();
const height = game.height();

let vsAI = false;
let markerAI = Cell.X
let deltaCalc = 0;
let calc = [];

const canvas = document.getElementById('board');
canvas.width = CELL_SIZE * width + OFFSET_X * 2;
canvas.height = CELL_SIZE * height + OFFSET_Y * 2;

const ctx = canvas.getContext('2d');

let isPlaceable = true;
let currentPlayer = Cell.O

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOUR;
    ctx.lineWidth = 5

    for (let row = 0; row < width - 1; row++) {
        ctx.moveTo(OFFSET_X + CELL_SIZE * (row + 1), OFFSET_Y)
        ctx.lineTo(OFFSET_X + CELL_SIZE * (row + 1), CELL_SIZE * height)
        ctx.moveTo(OFFSET_X, OFFSET_Y + CELL_SIZE * (row + 1))
        ctx.lineTo(CELL_SIZE * width, OFFSET_Y + CELL_SIZE * (row + 1))
    }
    ctx.stroke()

}

const generateCoords = (row, col) => {
    let x1 = MARKER_OFFSET + CELL_SIZE * col;
    let y1 = MARKER_OFFSET + CELL_SIZE * row;
    let x2 = CELL_SIZE * (col + 1) - MARKER_OFFSET;
    let y2 = CELL_SIZE * (row + 1) - MARKER_OFFSET;
    return [x1, y1, x2, y2];
}


const placeO = (row, col, winner) => {
    const coords = generateCoords(row, col);
    ctx.beginPath();
    if (winner) {
        ctx.strokeStyle = WINNER_MARKER
    } else {
        ctx.strokeStyle = MARKER_COLOUR;
    }
    ctx.lineWidth = MARKER_LINE_THICKNESS;
    ctx.arc(coords[0] + (CELL_SIZE / 2) - MARKER_OFFSET, coords[1] + (CELL_SIZE / 2) - MARKER_OFFSET, CELL_SIZE / 2 - MARKER_OFFSET, 0, 2*Math.PI);
    ctx.stroke()
}


const placeX = (row, col, winner =false) => {
    const coords = generateCoords(row, col)
    ctx.beginPath();
    if (winner) {
        ctx.strokeStyle = WINNER_MARKER
    } else {
        ctx.strokeStyle = ALT_MARKER_COLOUR;
    }
    ctx.lineWidth = MARKER_LINE_THICKNESS;
    ctx.moveTo(coords[0], coords[1]);
    ctx.lineTo(coords[2], coords[3]);
    ctx.moveTo(coords[2], coords[1]);
    ctx.lineTo(coords[0], coords[3]);
    ctx.stroke()
}

const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

const getIndex = (row, col) => {
    return row * width + col
}

const getRowCol = (idx) => {
    let row = Math.floor(idx / 3)
    let col = Math.floor(idx % 3)
    return [row, col]
}

const drawGame = () => {
    const cellsPtr = game.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, height * width);

    const winnerO = game.find_winner(Cell.O);
    const winnerX = game.find_winner(Cell.X);
    let winningLineX = []
    let winningLineO = []

    const winnerXData = new Uint32Array(memory.buffer, winnerX.ptr, 3);
    if (winnerXData[1] !== 4) {
        winningLineX = new Uint32Array(memory.buffer, winnerXData[1], 3)
        isPlaceable = false;
    }

    const winnerOData = new Uint32Array(memory.buffer, winnerO.ptr, 3);
    if (winnerOData[1] !== 4) {
        winningLineO = new Uint32Array(memory.buffer, winnerOData[1], 3)
        isPlaceable = false;
    }

    clearCanvas();
    drawGrid();

    for (let row = 0; row < height; row++) {

        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);
            if (cells[idx] === Cell.O) {
                placeO(row, col, winningLineO.includes(idx));
            } else if (cells[idx] === Cell.X) {
                placeX(row, col, winningLineX.includes(idx));
            }
        }
    }
    if (!cells.includes(Cell.Empty) && isPlaceable){

        isPlaceable = false
        displayWinner(Cell.Empty)
    } else if (!isPlaceable) {
        if (!vsAI){
            switchPlayer()
            displayWinner(currentPlayer)
        } else {
            if (winningLineX.length === 3) {
                displayWinner(Cell.X)
            } else if (winningLineO.length === 3) {
                displayWinner(Cell.O)
            }
        }

    }
}

const displayCurrentPlayer = () => {
    const doc = document.getElementById("currentPlayer");
    if (currentPlayer === Cell.X) {
        doc.innerHTML = `Current Player: <span id="player">X</span>`;
    } else {
        doc.innerHTML = `Current Player: <span id="player">O</span>`;
    }
}


const displayWinner = (winner) => {
    document.getElementById("board").classList.remove('no-winner');

    document.getElementById('winnerMessage').style.display = "block";
    const message = document.getElementById("winnerAnnouncement");
    if (winner === Cell.Empty) {
        message.textContent = "Tie!"
    } else if (winner === Cell.O) {
        message.textContent = "Player O won"
    } else if (winner === Cell.X) {
        message.textContent = "Player X Won"
    }
    document.getElementById("resetButton").onclick = resetGame;
}

const displayStats = () => {
    let min = Infinity;
    let max = -Infinity;

    for (let i=0; i< calc.length; i++) {
        min = Math.min(calc[i], min)
        max = Math.max(calc[i], max)
    }

    const detailsDoc = document.getElementById('details');
    detailsDoc.innerHTML = `vsAI: ${vsAI} <br> Last move calculation: ${deltaCalc}ms <br> Longest Calculation: ${max}ms <br> Shortest Calculation: ${min}ms`
}


const resetGame = () => {
    document.getElementById("board").classList.add('no-winner');
    document.getElementById("winnerMessage").style.display = "none";
    clearCanvas();
    drawGrid();
    game.reset();
    isPlaceable = true;
}

drawGrid()
displayCurrentPlayer()

const switchPlayer = () => {
    if (currentPlayer === Cell.X) {
        currentPlayer = Cell.O
    } else {
        currentPlayer = Cell.X
    }
}

// Canvas Event Handling
canvas.addEventListener("click", event => {
    if (!isPlaceable) {
        return;
    }

    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.floor(canvasTop / (CELL_SIZE + 1));
    const col = Math.floor(canvasLeft / (CELL_SIZE + 1));
    const response = game.mark_player(row, col, currentPlayer);
    if (response && vsAI) {
        const startCalc = performance.now();
        const index = getRowCol(game.find_best_move(markerAI));
        const endCalc = performance.now();
        deltaCalc = (endCalc - startCalc).toFixed(2);
        calc.push(deltaCalc)
        if (calc.length > 100) {
            calc.shift();
        }
        game.mark_player(index[0], index[1], markerAI)
    }
    if (response && !vsAI) {
        switchPlayer()
    }

    drawGame();
    displayCurrentPlayer();
    displayStats();
})

const aiSetting = document.getElementById('ai-setting');
aiSetting.addEventListener('change', _ => {
    const output = document.getElementById('ai-setting-output');
    vsAI = aiSetting.checked;
    output.textContent = `${vsAI}`
    resetGame();
})

