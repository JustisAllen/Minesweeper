/**
 * @fileoverview An implementation of Minesweeper,
 * a single-player puzzle video game.
 */

/** A Minesweeper game. */
class Minesweeper {
  
  /**
   * Creates a Minesweeper game with the given width, height,
   * and number of mines.
   * @param {number} width A positive integer.
   * @param {number} height A positive integer.
   * @param {number} numMines A positive integer,
   *     where numMines < width * height.
   */
  constructor(width, height, numMines) {
    const numBoardCells = width * height;
    
    // Avoid infinite loop in initMines_
    if (numMines >= numBoardCells) {
      throw new RangeError(
          'Expected numMines < width * height. ' +
          `Got width: ${width}, height: ${height}, numMines: ${numMines}.`);
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
  
  /** @return {boolean} Whether the game has ended. */
  isDone() {
    return Object.isFrozen(this);
  }
  
  /** @return {boolean} Whether the game is won. */
  isWin() {
    return this.numCoveredSafeCells_ === 0;
  }
  
  /**
   * Toggles the covered state of the covered cell at the given coordinates:
   * - COVERED_DEFAULT -> COVERED_FLAGGED
   * - COVERED_FLAGGED -> COVERED_QUESTION_MARKED
   * - COVERED_QUESTION_MARKED -> COVERED_DEFAULT
   * @param {number} x A non-negative integer, where 0 <= x < width.
   * @param {number} y A non-negative integer, where 0 <= y < height.
   */
  toggleCoveredState(x, y) {    
    switch (this.board_[x][y].getState()) {
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
    }
  }

  /**
   * Uncovers the default covered cell at the given coordinates,
   * ending the game if it has a mine (loss) or
   * the last safe cell is uncovered (win).
   * Also uncovers adjacent cells if neither these cells nor this cell have mines.
   * The first uncover event sets the mines on the board,
   * ensuring that no mine is set at the first uncovered cell.
   * @param {number} x A non-negative integer, where 0 <= x < width.
   * @param {number} y A non-negative integer, where 0 <= y < height.
   */
  uncover(x, y) {
    if (this.board_[x][y].getState() !== CellState.COVERED_DEFAULT) return;
    
    if (this.initMines_) {
      this.initMines_(x, y);
      this.initMines_ = null;
    }
    
    const hasMine = this.hasMine_(x, y);
    if (!hasMine) {
      this.uncoverNumber_(x, y);
    }
    
    if (hasMine || this.numCoveredSafeCells_ === 0) {
      this.endGame_(x, y);
    }
  }
  
  /**
   * Randomly sets mines on the board anywhere except at the given coordinates.
   * @param {number} notX A non-negative integer, where 0 <= notX < width.
   * @param {number} notY A non-negative integer, where 0 <= notY < height.
   */
  initMines_(notX, notY) {
    const numMines = this.getNumMines();
    const width = this.getWidth();
    const height = this.getHeight();
    while (this.mines_.size < numMines) {
      const randomX = Math.floor(Math.random() * width);
      const randomY = Math.floor(Math.random() * height);
      if (randomX === notX && randomY === notY) continue;
      
      const cellId = this.board_[randomX][randomY].getId();
      // Since Set, only adds and updates size if not already added
      this.mines_.add(cellId);
    }
  }
  
  /**
   * @param {number} x A non-negative integer, where 0 <= x < width.
   * @param {number} y A non-negative integer, where 0 <= y < height.
   * @return {boolean} Whether the cell at the given coordinates has a mine.
   */
  hasMine_(x, y) {
    const cellId = this.board_[x][y].getId();
    return this.mines_.has(cellId);
  }
  
  /**
   * Uncovers the covered, numbered cell at the given coordinates.
   * Also uncovers adjacent cells if this cell is not adjacent to any mines.
   * @param {number} x A non-negative integer, where 0 <= x < width.
   * @param {number} y A non-negative integer, where 0 <= y < height.
   */
  uncoverNumber_(x, y) {
    if (this.board_[x][y].getState() !== CellState.COVERED_DEFAULT) return;
    
    this.board_[x][y].state_ = CellState.UNCOVERED_NUMBER;
    this.numCoveredSafeCells_--;
    
    this.board_[x][y].numAdjacentMines_ = 0;
    const adjacentCellCoordinates = this.getAdjacentCellCoordinates_(x, y);
    adjacentCellCoordinates.forEach(
        (xy) => {
          if (this.hasMine_(...xy)) this.board_[x][y].numAdjacentMines_++);
        });
    if (this.board_[x][y].numAdjacentMines_ > 0) return;
    
    adjacentCellCoordinates.forEach((xy) => void this.uncoverNumber_(...xy));
  }
  
  /**
   * @param {number} x A non-negative integer, where 0 <= x < width.
   * @param {number} y A non-negative integer, where 0 <= y < height.
   * @return {!Array<!Array<number>>} The cell coordinates adjacent to the given ones.
   */
  getAdjacentCellCoordinates_(x, y) {
    const width = this.getWidth();
    const height = this.getHeight();
    let adjacentCellCoordinates = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        const adjacentX = x + i;
        if (adjacentX < 0 || adjacentX >= width) continue;
        
        const adjacentY = y + j;
        if (adjacentY < 0 || adjacentY >= height) continue;
        
        adjacentCellCoordinates.push([adjacentX, adjacentY]);
      }
    }
    return adjacentCellCoordinates;
  }
  
  /**
   * Ends the game, identifying all mines and incorrecty flagged cells.
   * Freezes the state of the game.
   * @param {number} lastX The X coordinate of the last uncovered cell.
   *     A non-negative integer, where 0 <= lastX < width.
   * @param {number} lastY The Y coordinate of the last uncovered cell.
   *     A non-negative integer, where 0 <= lastY < height.
   */
  endGame_(lastX, lastY) {
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
  
    if (this.numCoveredSafeCells_ > 0) {
      this.board_[lastX][lastY].state_ = this.UNCOVERED_EXPLODED_MINE;
    }
    
    // Prevent further changes to this game.
    Object.freeze(this);
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
