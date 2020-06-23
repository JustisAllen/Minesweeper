/** Minsweeper API */

class Minesweeper {
  
  constructor(width, height, numMines) {
    this.width = width;
    this.height = height;
    this.numMines = numMines;
    
    this.board = [];
    this.inProgress = true;
    
    this.initBoard();
    this.initMines();
  }
  
  /** Possible states for each cell on the game board. */
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
    UNCOVERED_INCORRECT_MINE: 'incorrect_mine',
    /** Uncovered, unflagged mine (game end). */
    UNCOVERED_UNFLAGGED_MINE: 'unflagged_mine',
    /** Uncovered, correctly flagged mine (game end). */
    UNCOVERED_CORRECT_MINE: 'correct_mine',
  }
  
  /** Initializes the game board */
  initBoard() {
    for (let x = 0; x < this.width ; x++) {
      let col = [];
      for (let y = 0; y < this.height ; y++) {
        col.push({
          x: x,
          y: y,
          mined: false,
          state: CellState.COVERED_UNMARKED
        });
      }
      this.board.push(col);
    }
  }

  /**
   * Sets mines on the board in random cells and sets each cell's number
   * of adjacent mines.
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
    for (let x = 0; x < this.width ; x++) {
      for (let y = 0; y < this.height ; y++) {
        this.board[x][y].numAdjacentMines = this.countAdjacentMines(x, y);
      }
    }
  }
  
  /** Counts how many mines are adjacent to the given cell coordinates. */
  countAdjacentMines(x, y) {
    if (this.board[x][y].mined) return;
    
    let numMines = 0;
    this.visitAdjacentCells(x, y, (ax, ay) => if (this.board[ax][ay].mined) numMines++);
    return numMines;
  }

  /** Applies a function to each cell adjacent to the one at the given coordinates. */
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
   * Toggles the covered state of the covered cell at the given coordinates:
   * - COVERED_DEFAULT -> COVERED_FLAGGED
   * - COVERED_FLAGGED -> COVERED_QUESTION_MARKED
   * - COVERED_QUESTION_MARKED -> COVERED_DEFAULT
   */
  toggleCoveredState(x, y) {
    if (!this.inProgress) return;
    
    switch (this.board[x][y].state) {
      case CellState.COVERED_DEFAULT:
        this.board[x][y].state = CellState.COVERED_FLAGGED;
        break;
      case CellState.COVERED_FLAGGED:
        this.board[x][y].state = CellState.COVERED_QUESTION_MARKED;
        break;
      case CellState.COVERED_QUESTION_MARKED:
        this.board[x][y].state = CellState.COVERED_DEFAULT;
        break;
    }
  }

  /**
   * Uncover the numbered cell at the given coordinates and adjacent cells
   * if this cell is not adjacent to any mines.
   */
  uncoverNumber(x, y) {
    if (this.board[x][y].state === CellState.UNCOVERED_NUMBER) return;
    
    this.board[x][y].state = CellState.UNCOVERED_NUMBER;
    if (this.board[x][y].numAdjacentMines !== 0) return;
    
    this.visitAdjacentMines(x, y, (ax, ay) => this.uncoverNumber(ax, ay));
  }
}
