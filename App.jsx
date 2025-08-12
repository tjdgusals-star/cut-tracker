import React, { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (d) => new Date(d).toISOString().slice(0,10)
const todayStr = fmt(new Date())
const startOfWeek = (dateStr) => {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  return fmt(new Date(d.setDate(diff)))
}
const defaultDay = {
  date: todayStr, weight:'', waist:'', calories:'', protein:'', carbs:'', fat:'', steps:'',
  workout:{ push:false, pull:false, legs:false, full:false, hiit:false, liss:false },
  notes:''
}
const useLocal = (key, init) => {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s? JSON.parse(s): init } catch { return init }
  })
  useEffect(()=>{ localStorage.setItem(key, JSON.stringify(val)) },[key,val])
  return [val,setVal]
}
const planByWeekday = {
  1:{workout:'상체 Push + HIIT 20분'},
  2:{workout:'하체 + LISS 40분'},
  3:{workout:'LISS 40분'},
  4:{workout:'상체 Pull + HIIT 20분'},
  5:{workout:'전신 + LISS 40분'},
  6:{workout:'LISS 40분'},
  0:{workout:'휴식/걷기'}
}

export default function App(){
  const [days, setDays] = useLocal('cut.days', [{...defaultDay}])
  const [goal, setGoal] = useLocal('cut.goal', { startWeight:75.1, targetWeight:70, startBodyFat:23.1, targetBodyFat:18, height:183 })
  const [activeDate, setActiveDate] = useLocal('cut.activeDate', todayStr)
  useEffect(()=>{ if(!days.find(d=>d.date===activeDate)){ setDays(prev=>[...prev,{...defaultDay,date:activeDate}]) }},[activeDate])
  const day = days.find(d=>d.date===activeDate) || {...defaultDay, date:activeDate}
  const saveDay = (patch)=>{
    setDays(prev=>{
      const idx = prev.findIndex(d=>d.date===activeDate)
      const next = [...prev]
      if(idx===-1) next.push({...day, ...patch})
      else next[idx] = {...prev[idx], ...patch}
      return next.sort((a,b)=>a.date.localeCompare(b.date))
    })
  }
  const weekly = useMemo(()=>{
    const start = startOfWeek(activeDate)
    const end = fmt(new Date(new Date(start).getTime()+6*86400000))
    const arr = days.filter(d=>d.date>=start && d.date<=end)
    const avg = (k)=>{ const ns = arr.map(x=>parseFloat(x[k])).filter(n=>!Number.isNaN(n)); return ns.length? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1): '-' }
    const sum = (k)=>{ const ns = arr.map(x=>parseFloat(x[k])).filter(n=>!Number.isNaN(n)); return ns.length? (ns.reduce((a,b)=>a+b,0)).toFixed(0): '-' }
    const workouts = arr.reduce((acc,x)=>{ Object.entries(x.workout||{}).forEach(([k,v])=>acc[k]+=v?1:0); return acc },{push:0,pull:0,legs:0,full:0,hiit:0,liss:0})
    return { start, avgWeight:avg('weight'), avgCalories:avg('calories'), proteinAvg:avg('protein'), stepsSum:sum('steps'), workouts }
  },[days,activeDate])
  const progressData = useMemo(()=> days.filter(d=>d.weight).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({date:d.date.slice(5), weight:Number(d.weight)})), [days])
  const clearAll = ()=>{ if(confirm('모든 기록을 삭제할까요?')){ localStorage.removeItem('cut.days'); setDays([{...defaultDay}]) } }
  const exportJson = ()=>{ const blob = new Blob([JSON.stringify({goal,days},null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`cut-tracker-${todayStr}.json`; a.click(); URL.revokeObjectURL(url) }
  const importJson = (e)=>{ const file = e.target.files?.[0]; if(!file) return; const r = new FileReader(); r.onload=()=>{ try{ const obj = JSON.parse(String(r.result)); if(obj.goal && obj.days){ localStorage.setItem('cut.goal', JSON.stringify(obj.goal)); setDays(obj.days) } } catch{ alert('가져오기 실패') } }; r.readAsText(file) }
  const d = new Date(activeDate); const wd = d.getDay();

  return (
    <div className="container">
      <div className="title">8주 감량 트래커</div>
      <div className="sub">183cm / 시작 {goal.startWeight}kg → 목표 {goal.targetWeight}kg, 체지방 {goal.targetBodyFat}%</div>

      <div className="card" style={{marginTop:8}}>
        <div className="grid grid-2">
          <label>날짜<input type="date" value={activeDate} onChange={e=>setActiveDate(e.target.value)} /></label>
          <label>체중(kg)<input inputMode="decimal" value={day.weight} onChange={e=>saveDay({weight:e.target.value})} placeholder="예: 74.6"/></label>
          <label>허리(cm)<input inputMode="decimal" value={day.waist} onChange={e=>saveDay({waist:e.target.value})} placeholder="예: 81"/></label>
          <label>칼로리<input inputMode="numeric" value={day.calories} onChange={e=>saveDay({calories:e.target.value})} placeholder="2000"/></label>
          <label>단백질(g)<input inputMode="numeric" value={day.protein} onChange={e=>saveDay({protein:e.target.value})} placeholder="160"/></label>
          <label>탄수화물(g)<input inputMode="numeric" value={day.carbs} onChange={e=>saveDay({carbs:e.target.value})} placeholder="180"/></label>
          <label>지방(g)<input inputMode="numeric" value={day.fat} onChange={e=>saveDay({fat:e.target.value})} placeholder="45"/></label>
          <label>걸음수<input inputMode="numeric" value={day.steps} onChange={e=>saveDay({steps:e.target.value})} placeholder="8000"/></label>
        </div>
        <div style={{marginTop:8}}>
          <div className="sub">오늘 운동 ({planByWeekday[wd]?.workout})</div>
          <div className="grid grid-3" style={{marginTop:6}}>
            {Object.keys(day.workout).map(k=> (
              <label key={k} className="row">
                <input type="checkbox" className="checkbox" checked={day.workout[k]} onChange={e=>saveDay({workout:{...day.workout,[k]:e.target.checked}})} />
                <span style={{textTransform:'uppercase'}}>{k}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{marginTop:8}}>
          <input type="text" value={day.notes} onChange={e=>saveDay({notes:e.target.value})} placeholder="메모: 컨디션/수면/유혹 등"/>
        </div>
        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <button className="btn" onClick={()=>saveDay({...day, date: activeDate})}>저장</button>
          <div className="row">
            <button className="btn sec" onClick={exportJson}>내보내기</button>
            <label className="btn sec" style={{cursor:'pointer'}}>
              가져오기<input type="file" accept="application/json" style={{display:'none'}} onChange={importJson}/>
            </label>
            <button className="btn danger" onClick={clearAll}>초기화</button>
          </div>
        </div>
      </div>

      <div className="tabs" style={{marginTop:10}}>
        {/* Simple custom tabs via state */}
      </div>

      <Tabs />

      <div className="footer" style={{marginTop:10}}>현민 전용 · 모바일 최적화 · 로컬 저장</div>
    </div>
  )
}

function Tabs(){
  const [tab, setTab] = useState('progress')
  const days = JSON.parse(localStorage.getItem('cut.days')||'[]')
  const goal = JSON.parse(localStorage.getItem('cut.goal')||'{}')
  const progressData = days.filter(d=>d.weight).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({date:d.date.slice(5), weight:Number(d.weight)}))

  const activeDate = JSON.parse(localStorage.getItem('cut.activeDate')||'"' + new Date().toISOString().slice(0,10) + '"')
  const fmt = (d) => new Date(d).toISOString().slice(0,10)
  const startOfWeek = (dateStr) => { const d = new Date(dateStr); const day = d.getDay(); const diff = d.getDate() - day + (day===0?-6:1); return fmt(new Date(d.setDate(diff))) }
  const start = startOfWeek(activeDate)
  const end = fmt(new Date(new Date(start).getTime()+6*86400000))
  const arr = days.filter(d=>d.date>=start && d.date<=end)
  const avg = (k)=>{ const ns = arr.map(x=>parseFloat(x[k])).filter(n=>!Number.isNaN(n)); return ns.length? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1): '-' }
  const sum = (k)=>{ const ns = arr.map(x=>parseFloat(x[k])).filter(n=>!Number.isNaN(n)); return ns.length? (ns.reduce((a,b)=>a+b,0)).toFixed(0): '-' }
  const workouts = arr.reduce((acc,x)=>{ Object.entries(x.workout||{}).forEach(([k,v])=>acc[k]+=v?1:0); return acc },{push:0,pull:0,legs:0,full:0,hiit:0,liss:0})

  return (
    <div style={{marginTop:8}}>
      <div className="tabs">
        <div className={`tab-btn ${tab==='progress'?'active':''}`} onClick={()=>setTab('progress')}>체중 추세</div>
        <div className={`tab-btn ${tab==='weekly'?'active':''}`} onClick={()=>setTab('weekly')}>주간 리포트</div>
        <div className={`tab-btn ${tab==='plan'?'active':''}`} onClick={()=>setTab('plan')}>가이드</div>
      </div>
      {tab==='progress' && (
        <div className="card" style={{marginTop:8}}>
          <div className="sub" style={{marginBottom:6}}>그래프는 입력된 체중만 표시됩니다.</div>
          <div style={{height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[Math.min((goal.targetWeight||70)-1, ...(progressData.map(d=>d.weight||goal.targetWeight||70))), Math.max((goal.startWeight||75)+1, ...(progressData.map(d=>d.weight||goal.startWeight||75)))]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" dot strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {tab==='weekly' && (
        <div className="card" style={{marginTop:8}}>
          <div className="grid">
            <div>주 시작: {start}</div>
            <div>평균 체중: <b>{avg('weight')}</b> kg / 평균 칼로리: <b>{avg('calories')}</b> kcal</div>
            <div>평균 단백질: <b>{avg('protein')}</b> g / 총 걸음수: <b>{sum('steps')}</b> 보</div>
            <div className="grid grid-3">
              {Object.entries(workouts).map(([k,v])=> (
                <div key={k} className="chip">{k.toUpperCase()} : <b>{v}</b></div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab==='plan' && (
        <div className="card" style={{marginTop:8}}>
          <div className="grid">
            <div className="title" style={{fontSize:16}}>일일 목표(예시)</div>
            <ul>
              <li>칼로리 2,000~2,100 kcal</li>
              <li>단백질 150~170 g / 탄수 160~200 g / 지방 40~50 g</li>
              <li>수분 2.5~3L, 수면 7시간+</li>
            </ul>
            <div className="title" style={{fontSize:16}}>요일별 운동 루틴</div>
            <ul>
              <li>월: 상체 Push + HIIT 20분</li>
              <li>화: 하체 + LISS 40분</li>
              <li>수: LISS 40분</li>
              <li>목: 상체 Pull + HIIT 20분</li>
              <li>금: 전신 + LISS 40분</li>
              <li>토: LISS 40분</li>
              <li>일: 휴식/걷기</li>
            </ul>
            <div className="sub">데이터는 브라우저 로컬에만 저장됩니다. JSON으로 백업/복구 가능.</div>
          </div>
        </div>
      )}
    </div>
  )
}
