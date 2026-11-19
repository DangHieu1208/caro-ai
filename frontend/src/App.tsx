import {useEffect,useState} from 'react'
import {Activity, Bot, BrainCircuit, Circle, Grid3X3, Pause, Play, RotateCcw, Settings2, UserRound, X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {cn} from '@/lib/utils'
import {getAgents,getMove,names,type Algorithm,type AgentStatus,type Config,type Metrics} from '@/lib/api'
import {initialGame,play,symbol,winningLine,type Move,type Player} from '@/lib/game'

type Mode='human'|'ai'
type Log={player:Player;move:Move;algorithm:string;metrics?:Metrics}
const inputStyle='h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-50'
const defaults:Config={depth:2,candidate_limit:10,pruning:true,iterations:300,c:1.4,rollout:'random'}
const number=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('vi-VN',{maximumFractionDigits:2})
function App(){
  const [agents,setAgents]=useState<AgentStatus[]>([])
  const [connection,setConnection]=useState<'loading'|'online'|'offline'>('loading')
  const [mode,setMode]=useState<Mode>('human')
  const [human,setHuman]=useState<Player>(1)
  const [xAgent,setXAgent]=useState<Algorithm>('random')
  const [oAgent,setOAgent]=useState<Algorithm>('random')
  const [config,setConfig]=useState<Config>(defaults)
  const [game,setGame]=useState(initialGame)
  const [started,setStarted]=useState(false)
  const [paused,setPaused]=useState(false)
  const [logs,setLogs]=useState<Log[]>([])
  const [error,setError]=useState('')
  const [delay,setDelay]=useState(350)
  const refresh=()=>{setConnection('loading');getAgents().then(a=>{setAgents(a);setConnection('online')}).catch(()=>{setAgents([]);setConnection('offline')})}
  useEffect(()=>{refresh()},[])
  const isHuman=(p:Player)=>mode==='human'&&p===human
  const agentFor=(p:Player)=>p===1?xAgent:oAgent
  const pending=([1,2] as Player[]).filter(p=>!isHuman(p)&&!agents.some(a=>a.id===agentFor(p)&&a.ready))
  const aiTurn=started&&game.winner===null&&!isHuman(game.to_move)
  const locked=started
  const activeAlgorithms=([1,2] as Player[]).filter(p=>!isHuman(p)).map(agentFor)
  const latest=logs.at(-1)
  const lastAI=[...logs].reverse().find(l=>l.metrics)
  const aiLogs=logs.filter(l=>l.metrics)
  const avg=aiLogs.length?aiLogs.reduce((sum,l)=>sum+l.metrics!.elapsed_ms,0)/aiLogs.length:null
  const line=game.winner !== null && game.winner !== 0 && latest ? winningLine(game.board,...latest.move):[]
  useEffect(()=>{
    if(!aiTurn||paused||error)return
    const controller=new AbortController()
    const timer=window.setTimeout(async()=>{
      try{
        const algorithm=game.to_move===1?xAgent:oAgent
        const next=await getMove(game,algorithm,config,controller.signal)
        if(controller.signal.aborted)return
        setLogs(old=>[...old,{player:game.to_move,move:next.move,algorithm:names[algorithm],metrics:next.metrics}])
        setGame({board:next.board,to_move:next.to_move,winner:next.winner})
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không thể lấy nước đi')}
    },delay)
    return()=>{clearTimeout(timer);controller.abort()}
  },[aiTurn,paused,error,game,xAgent,oAgent,config,delay])
  function reset(){setStarted(false);setPaused(false);setGame(initialGame());setLogs([]);setError('')}
  function humanMove(move:Move){
    if(!started||paused||!isHuman(game.to_move)||game.winner!==null||game.board[move[0]][move[1]]!==0)return
    const next=play(game,move);setLogs(old=>[...old,{player:game.to_move,move,algorithm:'Người chơi'}]);setGame(next)
  }
  function setNum(key:'depth'|'candidate_limit'|'iterations'|'c',value:number){setConfig(old=>({...old,[key]:value}))}
  const algorithmSelect=(p:Player)=><label className="block text-sm font-medium space-y-2"><span>Quân {symbol(p)} · {isHuman(p)?'Người chơi':'Thuật toán'}</span>{isHuman(p)?<div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-muted-foreground"><UserRound size={15}/> Người chơi</div>:<select className={inputStyle} disabled={locked} value={agentFor(p)} onChange={e=>p===1?setXAgent(e.target.value as Algorithm):setOAgent(e.target.value as Algorithm)}>{Object.entries(names).map(([id,name])=><option key={id} value={id}>{name}{agents.some(a=>a.id===id&&a.ready)?'':' (chưa tích hợp)'}</option>)}</select>}</label>
  return <div className="min-h-screen">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><Grid3X3 size={21}/></div><div><h1 className="text-lg font-bold tracking-tight">Caro AI Lab</h1><p className="text-xs text-muted-foreground">Không gian thử nghiệm thuật toán đối kháng</p></div></div><div className="flex items-center gap-2"><Badge className="hidden sm:inline-flex">9 × 9</Badge><button className="flex items-center gap-2 text-xs font-medium text-muted-foreground" onClick={refresh} title="Kiểm tra kết nối lại"><span className={cn('h-2 w-2 rounded-full',connection==='online'?'bg-emerald-500':connection==='offline'?'bg-red-500':'bg-amber-400')}/>{connection==='online'?'Backend online':connection==='offline'?'Kết nối lại':'Đang kết nối'}</button></div></div></header>
    <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Playground</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Đấu trường Caro</h2><p className="mt-1 text-sm text-muted-foreground">Chọn chế độ, cấu hình AI và theo dõi quyết định theo thời gian thực.</p></div>
    <div className="grid items-start gap-5 xl:grid-cols-[285px_minmax(420px,1fr)_300px] lg:grid-cols-[270px_minmax(0,1fr)]">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 size={18}/> Cấu hình trận đấu</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">{(['human','ai'] as Mode[]).map(m=><button key={m} disabled={locked} onClick={()=>setMode(m)} className={cn('rounded-md px-2 py-2 text-xs font-medium disabled:opacity-60',mode===m?'bg-white shadow-sm':'text-muted-foreground')}>{m==='human'?'Người vs Máy':'Máy vs Máy'}</button>)}</div>
      {mode==='human'&&<label className="block text-sm font-medium space-y-2"><span>Bạn chơi quân</span><select className={inputStyle} disabled={locked} value={human} onChange={e=>setHuman(Number(e.target.value) as Player)}><option value={1}>X · đi trước</option><option value={2}>O · đi sau</option></select></label>}
      {algorithmSelect(1)}{algorithmSelect(2)}
      {activeAlgorithms.includes('minimax')&&<div className="space-y-3 border-t pt-4"><p className="text-sm font-semibold">MiniMax</p><label className="block text-xs font-medium">Độ sâu<select className={inputStyle+' mt-1'} disabled={locked} value={config.depth} onChange={e=>setNum('depth',Number(e.target.value))}>{[2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><label className="block text-xs font-medium">Giới hạn ứng viên<select className={inputStyle+' mt-1'} disabled={locked} value={config.candidate_limit} onChange={e=>setNum('candidate_limit',Number(e.target.value))}>{[5,10,15,20,0].map(n=><option key={n} value={n}>{n||'Không giới hạn'}</option>)}</select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={config.pruning} disabled={locked} onChange={e=>setConfig(s=>({...s,pruning:e.target.checked}))}/> Alpha-Beta pruning</label></div>}
      {activeAlgorithms.includes('mcts')&&<div className="space-y-3 border-t pt-4"><p className="text-sm font-semibold">MCTS</p><label className="block text-xs font-medium">Iterations<select className={inputStyle+' mt-1'} disabled={locked} value={config.iterations} onChange={e=>setNum('iterations',Number(e.target.value))}>{[100,300,500,1000,3000].map(n=><option key={n}>{n}</option>)}</select></label><label className="block text-xs font-medium">Hệ số UCT (c)<select className={inputStyle+' mt-1'} disabled={locked} value={config.c} onChange={e=>setNum('c',Number(e.target.value))}>{[.5,1,1.4,2].map(n=><option key={n}>{n}</option>)}</select></label></div>}
      <label className="block text-xs font-medium">Khoảng nghỉ trước lượt máy<select className={inputStyle+' mt-1'} value={delay} onChange={e=>setDelay(Number(e.target.value))}><option value={0}>Không nghỉ</option><option value={350}>350 ms</option><option value={800}>800 ms</option></select></label>
      {!locked&&pending.length>0&&<p className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Thuật toán đã chọn chưa được bật trong backend. Hãy chọn Random để thử giao diện.</p>}
      <Button className="w-full" disabled={locked||connection!=='online'||pending.length>0} onClick={()=>{setError('');setStarted(true)}}><Play size={15}/> Bắt đầu trận</Button>
      <Button variant="outline" className="w-full" onClick={reset}><RotateCcw size={15}/> Trận mới</Button>
    </CardContent></Card>
    <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Ván đấu</CardTitle><p className="mt-1 text-xs text-muted-foreground">5 quân liên tiếp để chiến thắng</p></div><Badge className={cn(game.winner!==null?'bg-emerald-50 text-emerald-800':'bg-slate-50')}>{game.winner===0?'Hòa':game.winner?`${symbol(game.winner)} thắng`:!started?'Chờ bắt đầu':paused?'Tạm dừng':`Lượt ${symbol(game.to_move)}`}</Badge></CardHeader>
    <CardContent><div className="mb-4 grid grid-cols-2 gap-3">{([1,2] as Player[]).map(p=><div key={p} className={cn('flex items-center gap-3 rounded-lg border p-3',started&&game.winner===null&&game.to_move===p?'border-slate-400 bg-slate-50':'')}><div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg',p===1?'bg-blue-50 text-blue-700':'bg-rose-50 text-rose-600')}>{p===1?<X size={22} strokeWidth={2.8}/>:<Circle size={20} strokeWidth={2.8}/>}</div><div className="min-w-0"><p className="text-xs text-muted-foreground">Quân {symbol(p)}</p><p className="truncate text-sm font-semibold" title={isHuman(p)?'Người chơi':names[agentFor(p)]}>{isHuman(p)?'Người chơi':names[agentFor(p)]}</p></div></div>)}</div>
    <div className="mx-auto w-full max-w-[560px]"><div className="grid grid-cols-[22px_repeat(9,minmax(0,1fr))] items-center text-center text-[10px] text-muted-foreground"><div/>{Array.from({length:9},(_,c)=><div key={c} className="pb-2">{c}</div>)}{game.board.map((row,r)=><div className="contents" key={r}><div className="pr-1">{r}</div>{row.map((cell,c)=>{const win=line.some(([rr,cc])=>rr===r&&cc===c);const last=latest?.move[0]===r&&latest?.move[1]===c;return <button key={c} aria-label={`Hàng ${r}, cột ${c}: ${cell?symbol(cell):'trống'}`} disabled={!started||paused||aiTurn||game.winner!==null||cell!==0} onClick={()=>humanMove([r,c])} className={cn('relative grid aspect-square place-items-center border-b border-r border-slate-200 bg-white transition-colors enabled:hover:bg-slate-100',r===0&&'border-t',c===0&&'border-l',last&&'bg-blue-50',win&&'!bg-emerald-100')}>{cell===1?<X className="h-3/5 w-3/5 text-blue-700" strokeWidth={2.6}/>:cell===2?<Circle className="h-[52%] w-[52%] text-rose-600" strokeWidth={2.6}/>:<span className="h-1 w-1 rounded-full bg-slate-200"/>}{last&&<span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-500"/>}</button>})}</div>)}</div></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground">{aiTurn&&!paused&&!error?<><Bot className="animate-pulse" size={18}/> AI đang suy luận...</>:game.winner!==null?'Ván đấu đã kết thúc':!started?'Cấu hình và bắt đầu trận đấu':paused?'Trận đấu đang tạm dừng':'Đến lượt người chơi'}</div>{started&&game.winner===null&&<Button size="sm" variant="outline" onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'Tiếp tục':'Tạm dừng'}</Button>}</div>
    {error&&<div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <button className="ml-2 underline" onClick={()=>setError('')}>Thử lại</button></div>}
    </CardContent></Card>
    <div className="space-y-5 lg:col-span-2 xl:col-span-1"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18}/> Thống kê trực tiếp</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-2">{[['Số nước',logs.length],['Thời gian TB',avg==null?'—':`${number(avg)} ms`],['Thời gian gần nhất',lastAI?`${number(lastAI.metrics?.elapsed_ms)} ms`:'—'],['Số nút',number(lastAI?.metrics?.nodes)],['Số lần cắt',number(lastAI?.metrics?.cutoffs)],['Iterations',number(lastAI?.metrics?.iterations)]].map(([label,value])=><div key={label} className="rounded-md border p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Thống kê đo từ backend; — nếu thuật toán không cung cấp.</p></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit size={18}/> Nhật ký nước đi</CardTitle></CardHeader><CardContent>{!logs.length?<div className="rounded-md border border-dashed px-3 py-10 text-center text-xs text-muted-foreground">Nước đi sẽ xuất hiện tại đây.</div>:<div className="max-h-[420px] overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-white text-muted-foreground"><tr><th className="pb-2">#</th><th className="pb-2">Quân</th><th className="pb-2">Ô (r, c)</th><th className="pb-2 text-right">ms</th></tr></thead><tbody>{logs.map((l,i)=><tr className="border-t" key={i}><td className="py-2 text-muted-foreground">{i+1}</td><td className={cn('font-bold',l.player===1?'text-blue-700':'text-rose-600')} title={l.algorithm}>{symbol(l.player)}</td><td>({l.move.join(', ')})</td><td className="text-right tabular-nums">{number(l.metrics?.elapsed_ms)}</td></tr>)}</tbody></table></div>}</CardContent></Card></div>
    </div></main></div>
}
export default App
