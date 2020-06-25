/**
 * @fileoverview An implementation of Minesweeper,
 * a single-player puzzle video game.
 */

/** A Minesweeper game. */
class Minesweeper {
  
  /**
   * Creates a Minesweeper game with the given width, height,
   * and number of mines.
   * @param {number} width
   * @param {number} height
   * @param {number} numMines
   */
  constructor(width, height, numMines) {
    
    /** @type {function(): number} */
    this.getWidth = () => width;
    /** @type {function(): number} */
    this.getHeight = () => height;
    /** @type {function(): number} */
    this.getNumMines = () => numMines;
    
    /** @private {number} */
    this.numCoveredSafeCells_ = width * height - numMines;
    /** @private {number} */
    this.numFlagsUsed_ = 0;
    
    /** @private {!Array<!Array<!Cell>>} */
    this.board_ = [];
    /** @type {function(): !Array<!Array<!Cell>>} */
    this.getBoard = () => this.board_;
    
    /** @private {!Set<string>} */
    this.mines_ = new Set();
    
    this.initBoard_();
    this.initMines_();
  }
  
  /** Initializes the game board. */
  initBoard_() {
    for (let x = 0; x < this.getWidth() ; x++) {
      let col = [];
      for (let y = 0; y < this.getHeight() ; y++) {
        col.push(Cell(x, y));
      }
      this.board_.push(col);
    }
  }

  /** Randomly sets mines on the board */
  initMines_() {
    while (this.mines_.size < this.numMines) {
      let randomX = Math.floor(Math.random() * this.getWidth());
      let randomY = Math.floor(Math.random() * this.getHeight());
      let cellId = this.board_[randomX][randomY].getId();
      
      // Since Set, only adds and updates size if not already added
      this.mines_.add(cellId);
    }
  }
  
  /**
   * @return {number} The difference between the number of flagged cells
   *     and the number of mines on the board.
   */
  flagsRemaining() {
    return this.getNumMines() - this.numFlagsUsed_;
  }

  /**
   * Uncovers the cell at the given coordinates, ending the game if
   * it is a mine (loss) or the last safe cell is uncovered (win).
   * @param {number} x
   * @param {number} y
   */
  uncover(x, y) {  
    let isMine = this.isMine_(x, y);
    if (!isMine) {
      this.uncoverNumber_(x, y);
    }
    
    if (isMine || this.numCoveredSafeCells_ === 0) {
      this.endGame_(x, y);
    }
  }
  
  /**
   * @param {number} x
   * @param {number} y
   * @return {boolean} Whether the cell at the given coordinates contains a mine.
   */
  isMine_(x, y) {
    let cellId = this.board_[x][y].getId();
    return this.mines_.has(cellId);
  }
  
  /**
   * Uncovers the numbered cell at the given coordinates and adjacent cells
   * if this cell is not adjacent to any mines.
   * @param {number} x
   * @param {number} y
   */
  uncoverNumber_(x, y) {
    if (this.board_[x][y].state_ !== CellState.COVERED_DEFAULT) return;
    
    this.board_[x][y].state_ = CellState.UNCOVERED_NUMBER;
    this.numCoveredSafeCells_--;
    this.visitAdjacentCells_(
        x, y, (ax, ay) => { if (this.isMine_(ax, ay)) this.board_[x][y].numAdjacentMines_++ });
    
    if (this.board_[x][y].numAdjacentMines_ !== 0) return;
    
    this.visitAdjacentCells_(x, y, (ax, ay) => void this.uncoverNumber_(ax, ay));
  }
  
  /**
   * Applies the given function to each cell adjacent to the given coordinates.
   * @param {number} x
   * @param {number} y
   * @param {function(number, number): undefined} f
   */
  visitAdjacentCells_(x, y, f) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        let adjacentX = x + i;
        if (adjacentX < 0 || adjacentX >= this.getWidth()) continue;
        
        let adjacentY = y + j;
        if (adjacentY < 0 || adjacentY >= this.getHeight()) continue;
        
        f(adjacentX, adjacentY);
      }
    }
  }
  
  /**
   * Ends the game, identifying all mines and incorrecty flagged cells.
   * @param {number} lastX The X coordinate of the last uncovered cell.
   * @param {number} lastY The Y coordinate of the last uncovered cell.
   */
  endGame_(lastX, lastY) {
    this.visitBoard(
        (x, y) => {
          let isMined = this.isMine_(x, y);
          let state = this.board_[x][y].getState();
          if (!isMined && state !== CellState.COVERED_FLAGGED) return;

          if (!isMined) {
            this.board_[x][y].state_ = CellState.UNCOVERED_INCORRECT_FLAG;
            return
          }

          if (state !== CellState.COVERED_FLAGGED) {
            this.board_[x][y].state_ = CellState.UNCOVERED_UNFLAGGED_MINE;
            return
          }

          this.board_[x][y].state_ = CellState.UNCOVERED_CORRECT_MINE;
        })
  
    if (this.numCoveredSafeCells_ > 0) {
      this.board_[lastX][lastY].state_ = this.UNCOVERED_EXPLODED_MINE;
    }
    
    // Prevent further changes to this game.
    Object.freeze(this);
  }
  
  /**
   * Applies the given function to each cell on the board.
   * TODO: Remove and inline if only used once above.
   * @param {function(number, number): undefined} f
   */
  visitBoard_(f) {
    for (let x = 0; x < this.getWidth() ; x++) {
      for (let y = 0; y < this.getHeight() ; y++) {
        f(x, y);
      }
    }
  }

  /**
   * Toggles the covered state of the covered cell at the given coordinates:
   * - COVERED_DEFAULT -> COVERED_FLAGGED
   * - COVERED_FLAGGED -> COVERED_QUESTION_MARKED
   * - COVERED_QUESTION_MARKED -> COVERED_DEFAULT
   * @param {number} x
   * @param {number} y
   */
  toggleCoveredState(x, y) {    
    switch (this.board_[x][y].state_) {
      case CellState.COVERED_DEFAULT:
        this.board_[x][y].state_ = CellState.COVERED_FLAGGED;
        this.numFlagsUsed_++;
        break;
      case CellState.COVERED_FLAGGED:
        this.board[x][y].state_ = CellState.COVERED_QUESTION_MARKED;
        this.numFlagsUsed_--;
        break;
      case CellState.COVERED_QUESTION_MARKED:
        this.board_[x][y].state_ = CellState.COVERED_DEFAULT;
        break;
    }
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
    
    /** @type {function(): number} */
    this.getX = () => x;
    /** @type {function(): number} */
    this.getY = () => y;
    
    /** @type {function(): string} */
    this.getId = () => x + ',' + y;
    
    /** @private {string} */
    this.state_ = CellState.COVERED_DEFAULT;
    /** @type {function(): string} */
    this.getState = () => this.state_;
    
    /**
     * The number of mines adjacent to this cell.
     * Only non-null if this cell's state is UNCOVERED_NUMBER.
     * @private {?number}
     */
    this.numAdjacentMines_ = null;
    /** @type {function(): number} */
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
