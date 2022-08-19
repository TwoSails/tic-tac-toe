extern crate core;

mod utils;

use std::cmp::{max, min};
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct Winner {
    won: bool,
    line: Vec<i32>,
    player: Cell
}

#[wasm_bindgen]
impl Winner {
    pub fn new (won: bool, line: Vec<i32>, player: Cell) -> Winner {
        Winner {
            won,
            line,
            player
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Cell {
    Empty = 0,
    X = 3,
    O = 4
}

fn generate_blank_board(width: u8, height: u8) -> Vec<Cell> {
    (0..width * height)
        .map(|_| {
            Cell::Empty
        })
        .collect()
}

#[wasm_bindgen]
pub struct Game {
    height: u8,
    width: u8,
    cells: Vec<Cell>
}

impl Game {
    fn get_index(&self, row: u8, col: u8) -> usize {
        (row * self.width + col) as usize
    }

    fn move_count(&self) -> usize {
        let mut moves = 0;

        for cell in self.cells.iter().cloned() {
            if cell != Cell::Empty {
                moves += 1
            }
        }

        moves
    }

    fn get_succession(&self, line: Vec<Cell>, player: Cell) -> bool {
        if line == vec![player].repeat(3) {
            return true;
        }
        false
    }

    fn get_col(&self, col: usize) -> Vec<Cell> {
        let mut out_row: Vec<Cell> = vec![];
        for line in self.cells.as_slice().chunks(self.width as usize) {
            out_row.push(line[col])
        }
        out_row
    }

    fn get_diagonal(&self, negative: bool) -> Vec<Cell> {
        let mut out_row: Vec<Cell> = vec![];
        for i in 0..self.width {
            let mut idx;
            if negative {
                idx = self.get_index(i, i);
            } else {
                idx = self.get_index(i, (self.width - 1) - i);
            }
            out_row.push(self.cells[idx]);
        }
        out_row
    }
}

#[wasm_bindgen]
impl Game {
    pub fn new() -> Game {
        utils::set_panic_hook();
        let width: u8 = 3;
        let height: u8 = 3;

        let cells = generate_blank_board(width, height);

        Game {
            height,
            width,
            cells
        }
    }

    pub fn reset(&mut self) {
        self.cells = generate_blank_board(self.width, self.height);
    }

    pub fn height(&self) -> u8 {
        self.height
    }

    pub fn width(&self) -> u8 {
        self.width
    }

    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }

    pub fn mark_player(&mut self, row: u8, col: u8, player: Cell) -> bool {
        let idx = self.get_index(row, col);
        if self.cells[idx] == Cell::Empty {
            self.cells[idx] = player;
            true
        } else {
            false
        }
    }

    pub fn find_winner(&self, player: Cell) -> Winner {
        // Less than 5 moves has been played so no possible win state
        if self.move_count() < 5 {
            return Winner::new(false, vec![], player);
        }

        // Win through a row
        for (rowIdx, row) in self.cells.as_slice().chunks(self.width as usize).enumerate() {
            if self.get_succession(Vec::from(row), player.clone() as Cell) {
                let line: Vec<i32> = (0..self.width).map(|i| { self.get_index(rowIdx as u8, i) as i32 }).collect();
                return Winner::new(true, line, player);
            }
        }

        // Win through a column
        for (colIdx, col) in (0..self.width).map(|i| { self.get_col(i as usize) }).enumerate() {
            if self.get_succession(col, player.clone() as Cell) {
                let line: Vec<i32> = (0..self.height).map(|i| { self.get_index(i, colIdx as u8) as i32 }).collect();
                return Winner::new(true, line, player);
            }
        }

        // Win through diagonal
        for (grad, diagonal) in [self.get_diagonal(false), self.get_diagonal(true)].iter().cloned().enumerate() {
            if self.get_succession(diagonal, player.clone() as Cell) {
                let line: Vec<i32> = (0..self.width)
                    .map(|i| {
                        self.get_index(i,
                                       if grad == 0 { (self.width - 1) - i } else { i }) as i32
                    }).collect();
                return Winner::new(true, line, player);
            }
        }

        if self.move_count() == 9 {
            return Winner::new(true, vec![], Cell::Empty);
        }

        Winner::new(false, vec![], player)
    }


    pub fn find_best_move(&self, player: Cell) -> u8 {
        let mut board = self.cells.clone();
        let mut best_val = -1000;
        let mut best_move: u8 = 0;

        for (idx, cell) in board.clone().iter().cloned().enumerate() {
            if cell == Cell::Empty {
                board[idx] = player;
                let move_val = self.minimax(&mut board, 0, false, player);
                board[idx] = Cell::Empty;

                if move_val > best_val {
                    best_move = idx as u8;
                    best_val = move_val;
                }
            }
        }
        best_move
    }

}

// AI Moves Calculations
impl Game {
    fn moves_left_board(&self, board: &mut Vec<Cell>) -> i32 {
        let mut moves = 0;
        for cell in board.iter().cloned() {
            if cell != Cell::Empty { moves += 1 }
        }
        moves
    }

    fn is_moves_left(&self, board: &mut Vec<Cell>) -> bool {
        if self.moves_left_board(board) == 9 {
            false
        } else {
            true
        }
    }

    fn opposite_player(&self, player: Cell) -> Cell {
        match player {
            Cell::X => Cell::O,
            Cell::O => Cell::X,
            Cell::Empty => Cell::Empty
        }
    }

    fn evaluate(&self, board: &mut Vec<Cell>, player: Cell) -> i32 {
        // Win through a row
        let opponent = self.opposite_player(player);
        for row in board.as_slice().chunks(self.width as usize) {
            if self.get_succession(Vec::from(row), player) {
                return 1;
            } else if self.get_succession(Vec::from(row.clone()), opponent) {
                return -1
            }
        }

        // Win through a column
        for col in (0..self.width()).map(|col| {
            (0..self.height)
                .map(|row| {
                    board[self.get_index(row, col)]
                }).collect::<Vec<Cell>>()
        }) {
            if self.get_succession(col.clone(), player) {
                return 1;
            } else if self.get_succession(col.clone(), opponent) {
                return -1;
            }
        }



        let diagonal_positive = (0..self.width)
            .map(
                |i| { board[self.get_index(i, (self.width - 1) - i)] }
            )
            .collect();

        let diagonal_negative = (0..self.width)
            .map(
                |i| { board[self.get_index(i, i)] }
            )
            .collect::<Vec<Cell>>();

        // Win through diagonal
        for diagonal in [diagonal_positive, diagonal_negative].iter().cloned() {
            if self.get_succession(diagonal.clone(), player) {
                return 1;
            } else if self.get_succession(diagonal.clone(), opponent) {
                return -1
            }
        }

        0
    }

    fn minimax(&self, board: &mut Vec<Cell>, depth: i32, is_maximising_player: bool, player: Cell) -> i32 {
        let score = self.evaluate(board, player);
        let opponent = self.opposite_player(player);

        if score == 1 {
            return score
        }

        if score == -1 {
            return score
        }

        if !self.is_moves_left(board) {
            return 0
        }

        return if is_maximising_player {
            let mut best: i32 = -1000;

            for (idx, cell) in board.clone().iter().cloned().enumerate() {
                if cell == Cell::Empty {
                    board[idx] = player;
                    best = max(best,
                               self.minimax(board, depth + 1, !is_maximising_player, player));

                    board[idx] = Cell::Empty
                }
            }
            best
        } else {
            let mut best: i32 = 1000;

            for (idx, cell) in board.clone().iter().cloned().enumerate() {
                if cell == Cell::Empty {
                    board[idx] = opponent;
                    best = min(best,
                               self.minimax(board, depth + 1, !is_maximising_player, player));

                    board[idx] = Cell::Empty
                }
            }
            best
        }
    }
}