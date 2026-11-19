import type {Game, Move} from './game'
export type Algorithm='random'|'minimax'|'mcts'
export type Config={depth:number;candidate_limit:number;pruning:boolean;iterations:number;c:number;rollout:'random'|'heuristic'}
export type Metrics={elapsed_ms:number;nodes:number|null;cutoffs:number|null;iterations:number|null;depth:number|null;value:number|null}
export type AgentStatus={id:Algorithm;ready:boolean}
export type MoveResponse=Game&{move:Move;metrics:Metrics}
export const names:Record<Algorithm,string>={random:'Random',minimax:'MiniMax + Alpha-Beta',mcts:'MCTS + UCT'}
export async function getAgents():Promise<AgentStatus[]>{const res=await fetch('/api/agents');if(!res.ok)throw new Error('Không kết nối được backend');return res.json()}
export async function getMove(game:Game,algorithm:Algorithm,config:Config,signal:AbortSignal):Promise<MoveResponse>{
  const res=await fetch('/api/move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({board:game.board,player:game.to_move,algorithm,config}),signal})
  if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(typeof body.detail==='string'?body.detail:`API lỗi ${res.status}`)}
  return res.json()
}
