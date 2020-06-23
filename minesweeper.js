/** Minsweeper API */

function Minesweeper() {
  this.board = [];
  
  this.initBoard();
}

/** Initializes the board */
Minesweeper.prototype.initBoard = function() {
  for (let x = 0; x < 10 ; x++) {
    col = [];
    for (let y = 0; y < 10 ; y++) {
      col.push({
        x: x,
        y: y
      });
    }
    this.board.push(col);
  }
};
