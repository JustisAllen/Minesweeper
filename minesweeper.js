/**
 * @fileoverview An implementation of Minesweeper,
 * a single-player puzzle video game.
 */

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
    
    /** @const {number} */
    this.width = width;
    /** @const {number} */
    this.height = height;
    /** @const {number} */
    this.numMines = numMines;
    
    /** @type {number} */
    this.numCoveredSafeCells = width * height - numMines;
    /** @type {number} */
    this.numFlagsUsed = 0;
    
    /** @type {Array<Array>} */
    this.board = [];
    
    this.initBoard();
    this.initMines();
  }
  
  /** Initializes the game board. */
  initBoard() {
    for (let x = 0; x < this.width ; x++) {
      let col = [];
      for (let y = 0; y < this.height ; y++) {
        col.push({
            x: x,
            y: y,
            mined: false,
            state: CellState.COVERED_DEFAULT
        });
      }
      this.board.push(col);
    }
  }

  /**
   * Randomly sets mines on the board in random cells,
   * then sets each safe, non-mined cell's number of adjacent mines.
   */
  initMines() {
    
    // Set mines
    for (let numMinesRemaining = this.numMines; numMinesRemaining > 0; ) {
      let randomX = Math.floor(Math.random() * this.width);
      let randomY = Math.floor(Math.random() * this.height);
      if (this.board[randomX][randomY].mined) continue;
      
      this.board[randomX][randomY].mined = true;
      numMinesRemaining--;
    }
    
    // Set adjacent mines values
    this.visitBoard(
        (x, y) => {
          if (this.board[x][y].mined) return;
          this.board[x][y].numAdjacentMines = this.countAdjacentMines(x, y);
        });
  }

  /**
   * Applies the given function to each cell on the board.
   * @param {function(number, number): undefined} f
   */
  visitBoard(f) {
    for (let x = 0; x < this.width ; x++) {
      for (let y = 0; y < this.height ; y++) {
        f(x, y);
      }
    }
  }
  
  /**
   * Counts how many mines are adjacent to the given cell coordinates.
   * @param {number} x
   * @param {number} y
   * @return {number}
   */
  countAdjacentMines(x, y) {
    if (this.board[x][y].mined) return;
    
    let numMines = 0;
    this.visitAdjacentCells(
        x, y, (ax, ay) => { if (this.board[ax][ay].mined) numMines++ });
    return numMines;
  }

  /**
   * Applies the given function to each cell adjacent to the given coordinates.
   * @param {number} x
   * @param {number} y
   * @param {function(number, number): undefined} f
   */
  visitAdjacentCells(x, y, f) {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        let adjacentX = x + i;
        if (adjacentX < 0 || adjacentX >= this.width) continue;
        
        let adjacentY = y + j;
        if (adjacentY < 0 || adjacentY >= this.height) continue;
        
        f(adjacentX, adjacentY);
      }
    }
  }

  /**
   * Uncovers the cell at the given coordinates, ending the game if
   * it is mined (loss) or the last safe cell is uncovered (win).
   * @param {number} x
   * @param {number} y
   */
  uncover(x, y) {  
    let isMined = this.board[x][y].mined;
    if (!isMined) {
      this.uncoverNumber(x, y);
    }
    
    if (isMined || this.numCoveredSafeCells === 0) {
      this.endGame(x, y);
    }
  }
  
  /**
   * Ends the game, identifying all mines and incorrecty flagged cells.
   * @param {number} lastX The X coordinate of the last uncovered cell.
   * @param {number} lastY The Y coordinate of the last uncovered cell.
   */
  endGame(lastX, lastY) {
    this.visitBoard(
        (x, y) => {
          if (!this.board[x][y].mined
              && this.board[x][y].state !== CellState.COVERED_FLAGGED) return;

          if (!this.board[x][y].mined) {
            this.board[x][y].state = CellState.UNCOVERED_INCORRECT_FLAG;
            return
          }

          if (this.board[x][y].state !== CellState.COVERED_FLAGGED) {
            this.board[x][y].state = CellState.UNCOVERED_UNFLAGGED_MINE;
            return
          }

          this.board[x][y].state = CellState.UNCOVERED_CORRECT_MINE;
        })
  
    if (this.numCoveredSafeCells > 0) {
      this.board[lastX][lastY].state = this.UNCOVERED_EXPLODED_MINE;
    }
    
    // Prevent further changes to this game.
    Object.freeze(this);
  }

  /**
   * Uncovers the numbered cell at the given coordinates and adjacent cells
   * if this cell is not adjacent to any mines.
   * @param {number} x
   * @param {number} y
   */
  uncoverNumber(x, y) {
    if (this.board[x][y].state !== CellState.COVERED_DEFAULT) return;
    
    this.board[x][y].state = CellState.UNCOVERED_NUMBER;
    this.numCoveredSafeCells--;
    if (this.board[x][y].numAdjacentMines !== 0) return;
    
    this.visitAdjacentCells(x, y, (ax, ay) => this.uncoverNumber(ax, ay));
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
    switch (this.board[x][y].state) {
      case CellState.COVERED_DEFAULT:
        this.board[x][y].state = CellState.COVERED_FLAGGED;
        this.numFlagsUsed++;
        break;
      case CellState.COVERED_FLAGGED:
        this.board[x][y].state = CellState.COVERED_QUESTION_MARKED;
        this.numFlagsUsed--;
        break;
      case CellState.COVERED_QUESTION_MARKED:
        this.board[x][y].state = CellState.COVERED_DEFAULT;
        break;
    }
  }
  
  /**
   * @return {number} The difference between the number of flagged cells
   *     and the number of mines on the board.
   */
  flagsRemaining() {
    return this.numMines - this.numFlagsUsed;
  }
}
