export type Player = 1 | 2
export type Cell = 0 | Player
export type Board = Cell[][]
export type Move = [number,number]
export type Winner = Player | 0 | null
export type Game = {board: Board; to_move: Player; winner: Winner}
export const initialGame=():Game=>({board:Array.from({length:9},()=>Array<Cell>(9).fill(0)),to_move:1,winner:null})
export const symbol=(p:Player)=>p===1?'X':'O'
export function winningLine(board:Board, row:number,col:number):Move[]{
  const p=board[row][col]
  if(!p) return []
  for(const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]){
    const line:Move[]=[[row,col]]
    for(const sign of [-1,1]){
      let r=row+dr*sign,c=col+dc*sign
      while(r>=0&&r<9&&c>=0&&c<9&&board[r][c]===p){line.push([r,c]);r+=dr*sign;c+=dc*sign}
    }
    if(line.length>=5) return line
  }
  return []
}
export function play(game:Game,move:Move):Game{
  const [r,c]=move
  if(game.winner!==null||game.board[r]?.[c]!==0) return game
  const board=game.board.map(row=>[...row]);board[r][c]=game.to_move
  const winner=winningLine(board,r,c).length?game.to_move:board.every(row=>row.every(Boolean))?0:null
  return {board,winner,to_move:game.to_move===1?2:1}
}
