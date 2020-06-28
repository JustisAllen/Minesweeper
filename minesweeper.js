/**
 * @fileoverview An implementation of Minesweeper,
 * a single-player puzzle video game.
 */

/** A Minesweeper game. */
class Minesweeper {
  
  /**
   * Creates a Minesweeper game with the given parameters.
   * @param {number} width A positive integer.
   * @param {number} height A positive integer.
   * @param {number} numMines A positive integer,
   *     where numMines < width * height.
   */
  constructor(width, height, numMines) {
    const numBoardCells = width * height;
    if (numMines >= numBoardCells) {
      throw new RangeError(
          `Expected numMines < width * height. Got numMines: ${numMines}, ` +
          `(width * height): ${numBoardCells}, width: ${width}, ` +
          `height: ${height}.`);
    }
    
    /** @return {number} */
    this.getWidth = () => width;
    /** @return {number} */
    this.getHeight = () => height;
    /** @return {number} */
    this.getNumMines = () => numMines;
    
    /** @private {number} */
    this.numCoveredSafeCells_ = numBoardCells - numMines;
    /** @private {number} */
    this.numFlagsUsed_ = 0;
    
    /** @private {?number} */
    this.startSeconds_;
    /** @private {?number} */
    this.endSeconds_;
    
    /** @return {boolean} */
    this.isLoss = () => false;
    
    /** @private {!Array<!Array<!Cell>>} */
    this.board_ = [];
    /** @return {!Array<!Array<!Cell>>} */
    this.getBoard = () => this.board_;
    
    /** @private {!Set<string>} */
    this.mines_ = new Set();
    
    this.initBoard_();
  }

  /** Initializes the game board. */
  initBoard_() {
    const width = this.getWidth();
    const height = this.getHeight();
    for (let x = 0; x < width; x++) {
      let col = [];
      for (let y = 0; y < height; y++) {
        col.push(Cell(x, y));
      }
      this.board_.push(col);
    }
  }
  
  /**
   * @return {number} The difference between the number of mines on the board
   *     and the number of flagged cells.
   */
  getNumFlagsRemaining() {
    return this.getNumMines() - this.numFlagsUsed_;
  }
  
  /**
   * @return {?number} The number of seconds elapsed
   *     since the first valid uncover event.
   */
  getSecondsElapsed() {
    if (this.startSeconds_) {
      return (this.endSeconds_ || nowSeconds()) - this.startSeconds_;
    }
    return undefined;
  }
  
  /** @return {boolean} Whether the game has ended. */
  isDone() {
    return this.endSeconds_ !== undefined;
  }
  
  /**
   * Toggles the covered state of the covered cell at (x, y):
   * - COVERED_DEFAULT -> COVERED_FLAGGED
   * - COVERED_FLAGGED -> COVERED_QUESTION_MARKED
   * - COVERED_QUESTION_MARKED -> COVERED_DEFAULT
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   */
  toggleCoveredState(x, y) {
    const state = this.board_[x][y].getState();
    switch (state) {
      case CellState.COVERED_DEFAULT:
        this.board_[x][y].state_ = CellState.COVERED_FLAGGED;
        this.numFlagsUsed_++;
        break;
      case CellState.COVERED_FLAGGED:
        this.board_[x][y].state_ = CellState.COVERED_QUESTION_MARKED;
        this.numFlagsUsed_--;
        break;
      case CellState.COVERED_QUESTION_MARKED:
        this.board_[x][y].state_ = CellState.COVERED_DEFAULT;
        break;
      default:
        console.error(`Expected a covered state. Got ${state}.`);
        break;
    }
  }

  /**
   * Uncovers the default covered cell at (x, y),
   * ending the game if it has a mine (loss) or
   * the last safe cell is uncovered (win).
   * Also uncovers adjacent cells if neither these cells nor this cell have mines.
   * The first valid uncover event sets the mines on the board,
   * ensuring that no mine is set at the first uncovered cell.
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   */
  uncover(x, y) {    
    if (!this.isState_(x, y, CellState.COVERED_DEFAULT)) return;
    
    if (this.initMines_) {
      this.initMines_(x, y);
      this.initMines_ = null;
      this.startSeconds_ = nowSeconds();
    }
    
    this.uncoverDefaultCovered_(x, y);
    this.maybeEndGame_();
  }
  
  /**
   * Returns true if the state of the cell at (x, y) is the same as expectedState;
   * otherwise, logs an error and returns false.
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   * @param {string} expectedState
   * @return {boolean}
   */
  isState_(x, y, expectedState) {
    const gotState = this.board_[x][y].getState();
    const sameState = gotState === expectedState;
    if (!sameState) {
      console.error(`Expected the ${expectedState} state. Got ${gotState}.`);
    }
    return sameState;
  }
  
  /**
   * Randomly sets mines on the board anywhere except at (notX, notY).
   * @param {number} notX An integer, where 0 <= notX < width.
   * @param {number} notY An integer, where 0 <= notY < height.
   */
  initMines_(notX, notY) {
    const numMines = this.getNumMines();
    const board = this.board_.slice();
    board[notX].splice(notY, 1);
    for (let i = 0; i < numMines; i++) {
      const randomX = Math.floor(Math.random() * board.length);
      const randomY = Math.floor(Math.random() * board[randomX].length);
      const cellId = board[randomX][randomY].getId();
      this.mines_.add(cellId);
      if (board[randomX].length === 1) {
        board.splice(randomX, 1);
      } else {
        board[randomX].splice(randomY, 1);
      }
    }
  }
  
  /**
   * Uncovers the default covered cell at (x, y).
   * Also uncovers adjacent cells if neither these cells nor this cell have mines.
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   */
  uncoverDefaultCovered_(x, y) {
    if (!this.hasMine_(x, y)) {
      this.uncoverNumber_(x, y);
    } else {
      this.board_[x][y].state_ = CellState.UNCOVERED_EXPLODED_MINE;
      this.isLoss = () => true;
    }
  }
  
  /**
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   * @return {boolean} Whether the cell at (x, y) has a mine.
   */
  hasMine_(x, y) {
    const cellId = this.board_[x][y].getId();
    return this.mines_.has(cellId);
  }
  
  /**
   * Uncovers the covered, numbered cell at (x, y).
   * Also uncovers adjacent cells if this cell is not adjacent to any mines.
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   */
  uncoverNumber_(x, y) {
    this.board_[x][y].state_ = CellState.UNCOVERED_NUMBER;
    this.numCoveredSafeCells_--;
    
    const adjacentCells = this.getAdjacentCells_(x, y);
    this.board_[x][y].numAdjacentMines_ =
        countIf(
            (cell) => this.hasMine_(cell.getX(), cell.getY()), adjacentCells);  
    if (this.board_[x][y].numAdjacentMines_ > 0) return;
    
    for (const cell of adjacentCells) {
      if (cell.getState() === CellState.COVERED_DEFAULT) {
        this.uncoverNumber_(cell.getX(), cell.getY())
      }
    }
  }
  
  /**
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   * @return {!Array<!Cell>} The cells adjacent to (x, y).
   */
  getAdjacentCells_(x, y) {
    const width = this.getWidth();
    const height = this.getHeight();
    let adjacentCells = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        const adjacentX = x + i;
        if (adjacentX < 0 || adjacentX >= width) continue;
        
        const adjacentY = y + j;
        if (adjacentY < 0 || adjacentY >= height) continue;
        
        adjacentCells.push(this.board_[adjacentX][adjacentY]);
      }
    }
    return adjacentCells;
  }
  
  /**
   * Ends the game if a mine has exploded (loss)
   * or there are no more covered safe cells (win). If the game should end,
   * then reveals all mines and incorrecty flagged cells,
   * and freezes the state of the game.
   */
  maybeEndGame_() {
    if (!this.isLoss() && this.numCoveredSafeCells_ > 0) return;
    
    this.endSeconds_ = nowSeconds();
    const width = this.getWidth();
    const height = this.getHeight();
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const hasMine = this.hasMine_(x, y);
        const state = this.board_[x][y].getState();
        if (!hasMine && state !== CellState.COVERED_FLAGGED) continue;

        if (!hasMine) {
          this.board_[x][y].state_ = CellState.UNCOVERED_INCORRECT_FLAG;
          continue;
        }

        if (state !== CellState.COVERED_FLAGGED) {
          this.board_[x][y].state_ = CellState.UNCOVERED_UNFLAGGED_MINE;
          continue;
        }

        this.board_[x][y].state_ = CellState.UNCOVERED_CORRECT_MINE;
      }
    }
    
    // Prevent further changes to this game.
    Object.freeze(this);
  }
  
  /**
   * Uncovers the default covered cells adjacent to the cell at (x, y)
   * if the number of adjacent flagged cells equals
   * the number of adjacent mines. May uncover a mine and lose the game
   * if any of the flagged cells do not actually have a mine.
   * @param {number} x An integer, where 0 <= x < width.
   * @param {number} y An integer, where 0 <= y < height.
   */
  uncoverAdjacentCells(x, y) {
    if (!this.isState_(x, y, CellState.UNCOVERED_NUMBER)) return;
    
    const adjacentCells = this.getAdjacentCells_(x, y);
    const numAdjacentFlags =
        countIf(
            (cell) => cell.getState() === CellState.COVERED_FLAGGED,
            adjacentCells);
    const numAdjacentMines = this.board_[x][y].getNumAdjacentMines();
    if (numAdjacentFlags !== numAdjacentMines) {
      console.error(
          `Expected the number of adjacent flags (${numAdjacentFlags}) ` +
          `to equal the number of adjacent mines (${numAdjacentMines}).`);
      return;
    }
    
    for (const cell of adjacentCells) {
      if (cell.getState() === CellState.COVERED_DEFAULT) {
        this.uncoverDefaultCovered_(cell.getX(), cell.getY());
      }
    }
    this.maybeEndGame_();
  }
}

/** A cell on a Minesweeper game board. */
class Cell {
  
  /**
   * Creates a Minesweeper cell with the given coordinates.
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    
    /** @return {number} */
    this.getX = () => x;
    /** @return {number} */
    this.getY = () => y;
    
    /** @return {string} */
    this.getId = () => x + ',' + y;
    
    /** @private {string} */
    this.state_ = CellState.COVERED_DEFAULT;
    /** @return {string} */
    this.getState = () => this.state_;
    
    /**
     * The number of mines adjacent to this cell.
     * Only non-null if this cell's state is UNCOVERED_NUMBER.
     * @private {?number}
     */
    this.numAdjacentMines_ = null;
    /** @return {?number} */
    this.getNumAdjacentMines = () => this.numAdjacentMines_;
  }
}

/**
 * Possible states for each cell on the game board.
 * @enum {string}
 */
const CellState = {
  /** Default, covered state. */
  COVERED_DEFAULT: 'covered_default',
  /** Covered and flagged as mine. */
  COVERED_FLAGGED: 'covered_flagged',
  /** Covered and pencil-marked as "?". */
  COVERED_QUESTION_MARKED: 'covered_question_marked',

  /** Uncovered number (or blank). */
  UNCOVERED_NUMBER: 'uncovered_number',
  /** Uncovered, exploded mine (game loss). */
  UNCOVERED_EXPLODED_MINE: 'uncovered_exploded_mine',
  /** Uncovered, incorrectly flagged mine (game loss). */
  UNCOVERED_INCORRECT_FLAG: 'incorrect_flag',
  /** Uncovered, unflagged mine (game end). */
  UNCOVERED_UNFLAGGED_MINE: 'unflagged_mine',
  /** Uncovered, correctly flagged mine (game end). */
  UNCOVERED_CORRECT_MINE: 'correct_mine',
}

/** @return {number} The number of seconds elapsed since Unix epoch. */
function nowSeconds() {
  return Date.now() / 1000;
}

/**
 * @param {function(!Cell): boolean} f
 * @param {!Array<!Cell>} array
 * @return {number} The number of elements in array that satisfy f.
 */
function countIf(f, array) {  
  return array.filter(f).length;
}
