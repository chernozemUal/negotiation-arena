'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronRight, Clock3, Compass, Eye, EyeOff, Flag, HelpCircle, KeyRound, LayoutGrid, Mic, MicOff, Moon, Play, RotateCcw, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Target, Trash2, TrendingUp, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { choices, Choice, Config, defaults, Domain, evaluateText, outcome, scenarios, SESSION_STAGE_COUNT, stages, tension, tensionState, threshold } from '@/lib/engine';
import { Session, sessionStageCount, useArena } from '@/lib/store';
import { AI_MODELS, clearAiConfig, DEFAULT_AI_MODEL, describeApiError, generateOpponentReply, loadAiConfig, saveAiConfig, testOpenAIConnection } from '@/lib/openai';
import { createRussianRecognition, playArenaSound, speakOpponent, speechRecognitionAvailable, SpeechRecognitionLike, stopOpponentVoice } from '@/lib/media';
import { Arrival, Atmosphere, Modal, TensionMeter, transition, Welcome } from '@/components/experience';

type View='practice'|'progress'|'admin'|'settings';
const navigation=[{id:'practice',icon:LayoutGrid,name:'Арена'},{id:'progress',icon:TrendingUp,name:'Прогресс'},{id:'admin',icon:SlidersHorizontal,name:'Конструктор'},{id:'settings',icon:Settings2,name:'Настройки'}] as const;

export default function Home(){
 const {config,session,history,setConfig,start,clearSession}=useArena();
 const [view,setView]=useState<View>('practice');
 const [ready,setReady]=useState(false);
 const [welcome,setWelcome]=useState(true);
 const [quiet,setQuiet]=useState(false);
 const [dark,setDark]=useState(false);
 const [sounds,setSounds]=useState(true);
 const [voice,setVoice]=useState(true);
 const [aiConnected,setAiConnected]=useState(false);
 const [brief,setBrief]=useState<Config|null>(null);
 const [review,setReview]=useState<Session|null>(null);
 useEffect(()=>{try{setWelcome(localStorage.getItem('arena-intro-v2')!=='done');setQuiet(localStorage.getItem('arena-quiet')==='true');setDark(localStorage.getItem('arena-theme')==='dark');setSounds(localStorage.getItem('arena-sounds')!=='false');setVoice(localStorage.getItem('arena-voice')!=='false');setAiConnected(Boolean(loadAiConfig()))}catch{}setReady(true)},[]);
 useEffect(()=>{const sync=()=>setAiConnected(Boolean(loadAiConfig()));window.addEventListener('arena-ai-config',sync);return()=>window.removeEventListener('arena-ai-config',sync)},[]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light'},[dark]);
 const completeWelcome=()=>{try{localStorage.setItem('arena-intro-v2','done')}catch{}setWelcome(false)};
 const toggleQuiet=()=>{setQuiet(value=>{try{localStorage.setItem('arena-quiet',String(!value))}catch{}return !value})};
 const toggleDark=()=>{setDark(value=>{try{localStorage.setItem('arena-theme',value?'light':'dark')}catch{}return !value})};
 const toggleSounds=()=>{setSounds(value=>{try{localStorage.setItem('arena-sounds',String(!value))}catch{}if(!value)playArenaSound('navigate',true);return !value})};
 const toggleVoice=()=>{setVoice(value=>{try{localStorage.setItem('arena-voice',String(!value))}catch{}if(value)stopOpponentVoice();return !value})};
 const active=ready?session:null;
 const past=ready?history:[];
 const pressure=active&&!active.ended&&view==='practice'?tension(active.config,active.turns):20;
 const total=past.reduce((sum,s)=>sum+outcome(s.config,s.turns,sessionStageCount(s)).score,0);
 function preview(domain:Domain){playArenaSound('navigate',sounds);setBrief(config.domain===domain?config:defaults[domain])}
 const screen=view==='practice'?(active?(active.ended?'result':'session'):'home'):view;
 return <MotionConfig transition={transition} reducedMotion={quiet?'always':'user'}><div className={`app-root ${quiet?'quiet':''} ${dark?'theme-dark':''}`}>
 <AnimatePresence mode="wait">
 {!ready?<motion.div className="loading" key="loading" exit={{opacity:0}}><AudioLines size={35}/></motion.div>:welcome?<Arrival key="welcome"><Welcome onComplete={completeWelcome}/></Arrival>:<Arrival key="application" className="app-frame">
 <Atmosphere value={pressure} quiet={quiet}/>
 <aside className="sidebar"><button className="brand" aria-label="Главное меню" onClick={()=>{playArenaSound('navigate',sounds);setView('practice')}}><span className="brand-mark"><AudioLines size={22}/></span><span>арена<span className="brand-dot">.</span></span></button><span className="sidebar-caption">ПРАКТИКА ДИАЛОГА</span><nav aria-label="Основная навигация">{navigation.map(item=><button key={item.id} aria-current={view===item.id?'page':undefined} onClick={()=>{playArenaSound('navigate',sounds);setView(item.id);setReview(null)}} className={`nav-item ${view===item.id?'selected':''}`}>{view===item.id&&<motion.span className="nav-highlight" layoutId="navigation" transition={{type:'spring',stiffness:320,damping:36}}/>}<item.icon size={20}/><span>{item.name}</span>{item.id==='practice'&&active&&!active.ended&&<i className="live-dot"/>}</button>)}</nav><div className="sidebar-bottom"><button className="legend-link" onClick={()=>setWelcome(true)}><HelpCircle size={19}/><span>Как устроена арена</span></button><div className="profile"><div className="avatar">ВЫ</div><div><strong>Ваш следующий уровень</strong><small>{total%200} / 200 XP · Уровень {1+Math.floor(total/200)}</small><div className="mini-track"><i style={{width:`${total%200/2}%`}}/></div></div></div></div></aside>
 <main className="main"><header className="topbar"><div className="breadcrumb">Пространство практики <ChevronRight size={14}/><span>{navigation.find(n=>n.id===view)?.name}</span></div><div className="topbar-status"><span className="live-dot"/>{aiConnected?'OpenAI подключён':'Сценарный режим'}<button className="icon-button" aria-label={dark?'Включить светлую тему':'Включить тёмную тему'} onClick={toggleDark}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-button" aria-label="Повторить знакомство" onClick={()=>setWelcome(true)}><HelpCircle size={18}/></button></div></header>
 <div className="screen-host"><AnimatePresence mode="wait"><Arrival key={screen+(review?.id||'')} className={`screen screen-${screen}`}>
 {view==='practice'&&!active&&<Dashboard history={past} total={total} onPreview={preview} onConfigure={()=>setView('admin')}/>}
 {view==='practice'&&active&&!active.ended&&<Negotiation key={active.id} session={active} quiet={quiet} sounds={sounds} voice={voice}/>}
 {view==='practice'&&active?.ended&&<Results session={active} sounds={sounds} onRetry={()=>start(active.config)} onClose={clearSession}/>}
 {view==='progress'&&(review?<Results session={review} sounds={sounds} onRetry={()=>setBrief(review.config)} onClose={()=>setReview(null)}/>:<Progress history={past} onSelect={setReview} onPractice={()=>setView('practice')}/>)}
 {view==='admin'&&<Constructor config={config} onSave={setConfig} onPreview={c=>{setConfig(c);setBrief(c)}}/>}
 {view==='settings'&&<Settings quiet={quiet} dark={dark} sounds={sounds} voice={voice} onQuiet={toggleQuiet} onDark={toggleDark} onSounds={toggleSounds} onVoice={toggleVoice} onWelcome={()=>setWelcome(true)}/>}
 </Arrival></AnimatePresence></div>
 </main>
 </Arrival>}
 </AnimatePresence>
 <AnimatePresence>{brief&&!welcome&&<Modal title="Брифинг перед переговорами" onClose={()=>setBrief(null)}><div className="eyebrow">ПЕРЕД НАЧАЛОМ / БРИФИНГ</div><h2>{brief.topic}</h2><p className="brief-text">{scenarios[brief.domain].brief}</p><div className="brief-person"><div className="avatar">{scenarios[brief.domain].initials}</div><div><strong>{scenarios[brief.domain].person}</strong><small>{brief.role} · {brief.tone} тон</small></div></div><label>Сложность<select value={brief.difficulty} onChange={e=>setBrief({...brief,difficulty:e.target.value as Config['difficulty']})}>{['Базовый','Продвинутый','Эксперт'].map(x=><option key={x}>{x}</option>)}</select></label><p className="note">Цель собеседника: {brief.goal}. Для успеха — {threshold(brief)} баллов, доверие от 40% и все {SESSION_STAGE_COUNT} этапов.</p>{active&&!active.ended&&<p className="notice">Новая практика заменит текущую незавершённую сессию.</p>}<button className="button primary full" onClick={()=>{playArenaSound('navigate',sounds);start(brief);setBrief(null);setView('practice');setReview(null)}}>Начать переговоры <ArrowRight size={17}/></button></Modal>}</AnimatePresence>
 </div></MotionConfig>;
}

function Dashboard({history,total,onPreview,onConfigure}:{history:Session[];total:number;onPreview:(d:Domain)=>void;onConfigure:()=>void}){
 return <div className="dashboard"><div className="heading"><div><span className="eyebrow">МЕСТО, ГДЕ РОЖДАЕТСЯ УВЕРЕННОСТЬ</span><h1>Любой разговор —<br/>новая возможность<span>.</span></h1><p>Не угадывайте правильный ответ. Найдите свой подход.</p></div><div className="dashboard-seal" aria-hidden="true"><AudioLines size={45} strokeWidth={1}/><span>ВЫ В АРЕНЕ</span></div></div>
 <div className="dashboard-stats"><span><Flag size={16}/><strong>{history.length}</strong> сессий</span><span><Zap size={16}/><strong>{total}</strong> опыта</span><span><Activity size={16}/> Ваши решения меняют диалог</span></div>
 <div className="section-label"><h2>С чего начнём?</h2><span>Два разговора. Много решений.</span></div>
 <div className="scenario-grid">{(['supplier','career'] as Domain[]).map((domain,i)=><motion.button whileHover={{y:-3}} whileTap={{scale:.995}} key={domain} className={`scenario-card ${domain}`} onClick={()=>onPreview(domain)}><div className="scenario-top"><span className="scenario-number">0{i+1}</span><span className="scenario-level">{defaults[domain].difficulty}</span></div><div className="scenario-symbol" aria-hidden="true">{i===0?<Target size={60} strokeWidth={.8}/>:<TrendingUp size={60} strokeWidth={.8}/>}</div><div className="scenario-copy"><span className="eyebrow">{scenarios[domain].label}</span><h3>{scenarios[domain].title}</h3><p>{scenarios[domain].description}</p></div><div className="scenario-bottom"><span><Clock3 size={14}/> 8–12 мин <i/> {SESSION_STAGE_COUNT} этапов</span><strong>Начать <ArrowUpRight size={20}/></strong></div></motion.button>)}</div>
 <button className="custom-banner" onClick={onConfigure}><span><SlidersHorizontal size={20}/><strong>Ваш контекст. Ваши условия.</strong><small>Настройте собеседника и сложность.</small></span><ArrowRight size={19}/></button>
 <div className="dashboard-footer"><ShieldCheck size={13}/><span>Здесь можно ошибаться. Для этого мы и тренируемся.</span><Link href="/presentation">О проекте <ArrowUpRight size={13}/></Link></div>
 </div>;
}

function Negotiation({session:s,quiet,sounds,voice}:{session:Session;quiet:boolean;sounds:boolean;voice:boolean}){
 const {answer,finish,setReplyDraft}=useArena();
 const text=s.draft||'';const setText=setReplyDraft;
 const [busy,setBusy]=useState(false);const busyRef=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const request=useRef<AbortController|null>(null);
 const recognition=useRef<SpeechRecognitionLike|null>(null);const draftBeforeVoice=useRef('');
 const [now,setNow]=useState(Date.now());const [showMission,setShowMission]=useState(false);
 const [aiReady,setAiReady]=useState(false);const [aiNotice,setAiNotice]=useState('');
 const [listening,setListening]=useState(false);const [voiceNotice,setVoiceNotice]=useState('');
 const [micReady,setMicReady]=useState(false);const log=useRef<HTMLDivElement>(null);const reduced=useReducedMotion();
 const stageTotal=sessionStageCount(s);const stage=s.turns.length;
 const pressure=tension(s.config,s.turns);const previous=stage?tension(s.config,s.turns.slice(0,-1)):undefined;
 const mood=tensionState(pressure);const result=outcome(s.config,s.turns,stageTotal);const observedTurns=useRef(stage);

 useEffect(()=>{
  setAiReady(Boolean(loadAiConfig()));setMicReady(speechRecognitionAvailable());
  const update=()=>setAiReady(Boolean(loadAiConfig()));window.addEventListener('arena-ai-config',update);
  const interval=setInterval(()=>setNow(Date.now()),1000);
  const openingTimer=voice?setTimeout(()=>speakOpponent(scenarios[s.config.domain].opening),260):null;
  return()=>{clearInterval(interval);if(timer.current)clearTimeout(timer.current);if(openingTimer)clearTimeout(openingTimer);request.current?.abort();recognition.current?.abort();stopOpponentVoice();window.removeEventListener('arena-ai-config',update)};
 },[]);
 useEffect(()=>{if(!voice)stopOpponentVoice()},[voice]);
 useEffect(()=>{const el=log.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:reduced||quiet?'instant':'smooth'})},[stage,reduced,quiet]);
 useEffect(()=>{
  if(stage<=observedTurns.current)return;
  const reply=s.turns[stage-1]?.reply;const rose=previous!==undefined&&pressure>previous;
  playArenaSound(rose&&pressure>=70?'warning':'response',sounds);
  if(voice&&reply)speakOpponent(reply);
  observedTurns.current=stage;
 },[stage,pressure,previous,s.turns,sounds,voice]);

 async function choose(c:Choice){
  if(busyRef.current||stage>=stageTotal)return;
  recognition.current?.abort();setListening(false);playArenaSound('send',sounds);
  busyRef.current=true;setBusy(true);setAiNotice('');setVoiceNotice('');setText('');
  const ai=loadAiConfig();
  if(!ai){answer(c);timer.current=setTimeout(()=>{busyRef.current=false;setBusy(false)},quiet||reduced?180:720);return}
  request.current=new AbortController();
  try{const reply=await generateOpponentReply({ai,config:s.config,turns:s.turns,choice:c,stage,signal:request.current.signal});answer(c,reply)}
  catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;answer(c);setAiNotice(`${describeApiError(error)} Использован сценарный ответ.`)}
  finally{request.current=null;busyRef.current=false;setBusy(false)}
 }
 function send(){if(text.trim().length>=5)void choose(evaluateText(text.trim(),s.config.domain,stage))}
 function toggleListening(){
  if(listening){recognition.current?.stop();return}
  draftBeforeVoice.current=text.trim();setVoiceNotice('');
  const instance=createRussianRecognition({
   onStart:()=>{setListening(true);playArenaSound('navigate',sounds)},
   onResult:transcript=>setText([draftBeforeVoice.current,transcript].filter(Boolean).join(' ').slice(0,800)),
   onError:message=>setVoiceNotice(message),
   onEnd:()=>{setListening(false);recognition.current=null},
  });
  if(!instance){setVoiceNotice('Голосовой ввод недоступен в этом браузере. Используйте актуальный Chrome или Edge.');return}
  recognition.current=instance;
  try{instance.start()}catch{setVoiceNotice('Микрофон уже используется. Попробуйте ещё раз.');setListening(false)}
 }
 const opponentName=scenarios[s.config.domain].person.split(' ')[0];
 return <div className={`negotiation tension-${mood.level}`} data-tension={pressure}>
  <div className="session-heading"><div><span className="eyebrow">ВСТРЕЧА В АРЕНЕ · {stage}/{stageTotal} ЭТАПОВ</span><h1>{s.config.topic}</h1></div><div className="session-controls"><span className="timer"><Clock3 size={15}/>{formatTime(now-s.started)}</span><button className="icon-button" aria-label="Показать задачу" onClick={()=>setShowMission(true)}><Target size={19}/></button></div></div>
  <div className="session-layout"><section className="conversation"><div className="opponent"><div className={`avatar mood-avatar ${mood.level}`}>{scenarios[s.config.domain].initials}<span/></div><div><strong>{scenarios[s.config.domain].person}</strong><small>{s.config.role} · {aiReady?'OpenAI':'Сценарный режим'} · {voice?'голос включён':'без автоозвучивания'}</small></div><span className={`mood-chip ${mood.level}`}>{mood.label}</span></div><div className="mobile-tension"><TensionMeter value={pressure} previous={previous} compact/></div>
   <div className="messages" ref={log} role="log" aria-label="История переговоров" aria-live="polite"><div className="dialog-intro"><span>Переговоры начались</span></div><div className="message theirs"><button className="speak-reply" aria-label="Озвучить первую реплику" onClick={()=>speakOpponent(scenarios[s.config.domain].opening)}><Volume2 size={15}/></button><small>{opponentName}</small><span>{scenarios[s.config.domain].opening}</span></div>{s.turns.map((turn,i)=><div key={i} className="exchange"><div className="stage-divider">{stages[i]}</div><motion.div className="message yours" initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} transition={transition}>{turn.text}</motion.div><motion.div className="message theirs" initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} transition={{...transition,delay:quiet||reduced?0:.16}}><button className="speak-reply" aria-label={`Озвучить ответ ${i+1}`} onClick={()=>speakOpponent(turn.reply)}><Volume2 size={15}/></button><small>{opponentName}</small><span>{turn.reply}</span></motion.div><div className="turn-feedback"><Sparkles size={13}/>{turn.skill} · +{turn.points} XP</div></div>)}</div>
   <div className="composer"><AnimatePresence mode="wait">{stage<stageTotal?<Arrival key={stage} className="response-block"><div className="composer-heading"><span>ВАШ ХОД</span><strong>{stages[stage]}</strong><span>{stage+1}/{stageTotal}</span></div><div className="options">{choices(s.config.domain,stage).map((c,i)=><button disabled={busy} key={c.text} onClick={()=>void choose(c)}><span className="option-number">{i+1}</span><span>{c.text}</span><ArrowUpRight size={16}/></button>)}</div><form className="input-row" onSubmit={e=>{e.preventDefault();send()}}><input aria-label="Ваша реплика" placeholder={listening?'Говорите — я записываю…':'Ответьте своими словами или голосом…'} value={text} maxLength={800} disabled={busy} onChange={e=>setText(e.target.value)}/><button type="button" className={`voice-button ${listening?'listening':''}`} aria-label={listening?'Остановить голосовой ввод':'Начать голосовой ввод'} aria-pressed={listening} disabled={busy||!micReady} title={micReady?'Голосовой ввод':'Доступно в Chrome и Edge'} onClick={toggleListening}>{listening?<MicOff size={18}/>:<Mic size={18}/>}<span className="voice-pulse"/></button><button className="send-button" aria-label="Отправить реплику" disabled={busy||text.trim().length<5}><Send size={18}/></button></form><div className={`input-note ${aiNotice||voiceNotice?'ai-fallback-notice':''}`}>{busy?(aiReady?'OpenAI формирует ответ…':'Собеседник обдумывает ваш ответ…'):(voiceNotice||aiNotice||(listening?'Слушаю… Нажмите микрофон ещё раз, чтобы остановить.':'Введите от 5 символов или нажмите микрофон · Enter — отправить'))}</div></Arrival>:<Arrival key="finish" className="finish-prompt"><div><Check size={19}/><span>Все {stageTotal} этапов пройдены. Посмотрим, что получилось?</span></div><button disabled={busy} className="button primary" onClick={finish}>Посмотреть разбор <ArrowRight size={17}/></button></Arrival>}</AnimatePresence></div>
  </section><aside className="session-sidebar"><TensionMeter value={pressure} previous={previous}/><div className="session-mission"><span className="eyebrow"><Target size={14}/> ВАША ЗАДАЧА</span><p>{scenarios[s.config.domain].brief}</p></div><div className="session-stage-list">{stages.slice(0,stageTotal).map((label,i)=><div key={label} className={i<=stage?'reached':''}><span>{stage>i?<Check size={13}/>:i+1}</span>{label}</div>)}</div><div className="trust-panel"><div><span>Доверие</span><strong>{result.trust}%</strong></div><div className="mini-track"><motion.i animate={{width:result.trust+'%'}} transition={{duration:.8}}/></div><small>Цель: {threshold(s.config)} баллов и доверие от 40%</small></div><button className="text-button leave-button" onClick={()=>{stopOpponentVoice();finish()}}>Завершить досрочно <ArrowUpRight size={15}/></button></aside></div>
  <button className="mobile-leave" onClick={()=>{stopOpponentVoice();finish()}}>Завершить и разобрать <ArrowUpRight size={13}/></button>
  <AnimatePresence>{showMission&&<Modal title="Ваша задача" onClose={()=>setShowMission(false)}><span className="eyebrow">ВАША ЗАДАЧА</span><h2>{s.config.topic}</h2><p className="brief-text">{scenarios[s.config.domain].brief}</p><TensionMeter value={pressure}/><p className="note">Для успеха: {threshold(s.config)} баллов, доверие не ниже 40% и все {stageTotal} этапов.</p><button className="button primary full" onClick={()=>setShowMission(false)}>Вернуться к разговору <ArrowRight size={17}/></button></Modal>}</AnimatePresence>
 </div>;
}

function Results({session:s,sounds,onRetry,onClose}:{session:Session;sounds:boolean;onRetry:()=>void;onClose:()=>void}){
 const [step,setStep]=useState(0);const stageTotal=sessionStageCount(s);const result=outcome(s.config,s.turns,stageTotal);const turn=s.turns[step];
 useEffect(()=>{playArenaSound(result.won?'success':'navigate',sounds)},[]);
 return <div className="results"><div className="heading compact-heading"><div><span className="eyebrow">РАЗБОР ПЕРЕГОВОРОВ</span><h1>{result.won?'Общий язык найден.':s.turns.length<stageTotal?'Практика остановлена.':'Каждая попытка делает вас сильнее.'}</h1><p>{result.won?'Вы приблизили обе стороны к общей цели.':'Разберём решения и найдём более сильный следующий ход.'}</p></div><Trophy className="result-trophy" size={40} strokeWidth={1}/></div><div className="result-metrics"><Metric value={`${result.score}/100`} label="Результат"/><Metric value={`${result.trust}%`} label="Доверие"/><Metric value={`${tension(s.config,s.turns)}%`} label="Напряжённость"/><Metric value={formatTime((s.ended||Date.now())-s.started)} label="Время"/></div>
 <section className="review-panel"><div className="review-tabs" aria-label="Этапы разбора">{s.turns.map((_,i)=><button key={i} aria-pressed={step===i} className={step===i?'active':''} onClick={()=>setStep(i)}><span>{i+1}</span><span>{stages[i]}</span></button>)}</div><div className="review-content scroll-region"><AnimatePresence mode="wait"><Arrival key={step}>{turn?<><div className="review-label"><span>ВАША РЕПЛИКА</span><strong>+{turn.points} XP</strong></div><blockquote>«{turn.text}»</blockquote><div className="feedback-box"><Sparkles size={19}/><p>{turn.feedback}</p></div>{turn.points<17?<div className="better"><span>ПОПРОБУЙТЕ ТАК</span><p>{choices(s.config.domain,step)[0].text}</p></div>:<div className="better"><span>СОХРАНИТЕ ЭТОТ ПРИЁМ</span><p>{turn.skill}: попробуйте применить его в другом сценарии или сформулировать своими словами.</p></div>}</>:<div className="empty-state"><Compass size={32}/><h2>Разговор ещё не начался</h2><p>Сделайте первый ход, чтобы получить обратную связь.</p></div>}</Arrival></AnimatePresence></div></section><div className="result-footer"><button className="button secondary" onClick={onClose}><ArrowLeft size={17}/> К списку</button><span>{s.config.difficulty} · {s.turns.length}/{stageTotal} этапов</span><button className="button primary" onClick={onRetry}><RotateCcw size={17}/> Попробовать иначе</button></div></div>;
}
function Metric({value,label}:{value:string;label:string}){return <div className="metric"><strong>{value}</strong><span>{label}</span></div>}
function Progress({history,onSelect,onPractice}:{history:Session[];onSelect:(s:Session)=>void;onPractice:()=>void}){
 return <div className="progress-screen"><div className="heading compact-heading"><div><span className="eyebrow">КАЖДАЯ ПОПЫТКА ИМЕЕТ ЗНАЧЕНИЕ</span><h1>Ваш путь переговорщика<span>.</span></h1><p>Вернитесь к любому разговору и посмотрите на него по-новому.</p></div></div><div className="result-metrics"><Metric value={String(history.length)} label="Сессий"/><Metric value={String(history.filter(s=>outcome(s.config,s.turns,sessionStageCount(s)).won).length)} label="Договорённостей"/><Metric value={String(history.reduce((a,s)=>a+outcome(s.config,s.turns,sessionStageCount(s)).score,0))} label="Очков опыта"/></div><div className="history-list scroll-region">{history.length?history.map(s=><button className="history-item" key={s.id} onClick={()=>onSelect(s)}><div className="history-icon">{outcome(s.config,s.turns,sessionStageCount(s)).won?<Check size={20}/>:<Flag size={20}/>}</div><div><strong>{s.config.topic}</strong><small>{new Date(s.started).toLocaleDateString('ru-RU')} · {s.config.difficulty} · {s.turns.length}/{sessionStageCount(s)} этапов</small></div><span>{outcome(s.config,s.turns,sessionStageCount(s)).score}<small>/100</small></span><ArrowUpRight size={19}/></button>):<div className="empty-state"><Compass size={40}/><h2>Первый разговор — начало пути</h2><p>Пройдите сценарий. Здесь появятся результаты и разбор.</p><button className="button primary" onClick={onPractice}>Выбрать разговор <ArrowRight size={17}/></button></div>}</div><p className="storage-note"><ShieldCheck size={14}/> Последние 50 сессий сохраняются в этом браузере.</p></div>;
}

function Constructor({config,onSave,onPreview}:{config:Config;onSave:(c:Config)=>void;onPreview:(c:Config)=>void}){
 const [draft,setDraft]=useState(config);const [saved,setSaved]=useState(false);
 function update<K extends keyof Config>(key:K,value:Config[K]){setDraft({...draft,[key]:value});setSaved(false)}
 const valid=draft.topic.trim()&&draft.role.trim()&&draft.goal.trim();
 return <div className="constructor"><div className="heading compact-heading"><div><span className="eyebrow">КОНСТРУКТОР КОНТЕКСТА</span><h1>Задайте условия разговора<span>.</span></h1><p>Каждая настройка — новый повод попробовать другую стратегию.</p></div></div><form className="constructor-form" onSubmit={e=>{e.preventDefault();if(valid){onSave(draft);setSaved(true)}}}><div className="form-body scroll-region"><div className="form-grid"><label>Сфера<select value={draft.domain} onChange={e=>{setDraft({...defaults[e.target.value as Domain],difficulty:draft.difficulty,tone:draft.tone});setSaved(false)}}><option value="supplier">Закупки и продажи</option><option value="career">Карьера и развитие</option></select></label><label>Тема переговоров<input required maxLength={100} value={draft.topic} onChange={e=>update('topic',e.target.value)}/></label><label>Сложность<select value={draft.difficulty} onChange={e=>update('difficulty',e.target.value as Config['difficulty'])}>{['Базовый','Продвинутый','Эксперт'].map(x=><option key={x}>{x}</option>)}</select></label><label>Тон собеседника<select value={draft.tone} onChange={e=>update('tone',e.target.value as Config['tone'])}>{['Дружелюбный','Сдержанный','Жёсткий'].map(x=><option key={x}>{x}</option>)}</select></label><label>Роль собеседника<input required maxLength={80} value={draft.role} onChange={e=>update('role',e.target.value)}/></label><label>Его цель<input required maxLength={180} value={draft.goal} onChange={e=>update('goal',e.target.value)}/></label></div><div className="context-preview"><div><span className="eyebrow">АТМОСФЕРА НА СТАРТЕ</span><TensionMeter value={tension(draft,[])} compact/></div><p>Тон и сложность задают начальное напряжение. Сфера выбирает сюжет, цель и тон меняют ответы. Тема и роль уточняют контекст.</p></div><p className="note">Конструктор использует два подготовленных сюжета. Произвольная тема не создаёт новый сценарий.</p></div><div className="form-footer"><button className="button secondary" disabled={!valid} type="submit"><Check size={16}/>{saved?'Сохранено':'Сохранить'}</button><span role="status">{saved?'Контекст готов к практике':''}</span><button className="button primary" disabled={!valid} type="button" onClick={()=>onPreview(draft)}>Протестировать <Play size={15}/></button></div></form></div>;
}

function Settings({quiet,dark,sounds,voice,onQuiet,onDark,onSounds,onVoice,onWelcome}:{quiet:boolean;dark:boolean;sounds:boolean;voice:boolean;onQuiet:()=>void;onDark:()=>void;onSounds:()=>void;onVoice:()=>void;onWelcome:()=>void}){
 const saved=loadAiConfig();
 const [apiKey,setApiKey]=useState(saved?.apiKey||'');const [model,setModel]=useState(saved?.model||DEFAULT_AI_MODEL);
 const [remember,setRemember]=useState(saved?.remember||false);const [visible,setVisible]=useState(false);
 const [status,setStatus]=useState<'idle'|'checking'|'connected'|'error'>(saved?'connected':'idle');
 const [message,setMessage]=useState(saved?'Ключ готов. Новые реплики собеседника создаёт OpenAI.':'');
 async function connect(){const key=apiKey.trim();if(key.length<20){setStatus('error');setMessage('Вставьте полный API-ключ OpenAI.');return}setStatus('checking');setMessage('Проверяем ключ и доступ к модели…');try{await testOpenAIConnection(key,model);saveAiConfig({apiKey:key,model,remember});setStatus('connected');setMessage(`Подключено: ${model}. Ключ ${remember?'сохранён на этом устройстве':'действует до закрытия вкладки'}.`)}catch(error){setStatus('error');setMessage(describeApiError(error))}}
 function disconnect(){clearAiConfig();setApiKey('');setStatus('idle');setMessage('Ключ удалён из браузера. Включён сценарный режим.')}
 return <div className="settings-screen"><div className="heading compact-heading"><div><span className="eyebrow">ВАШ КОМФОРТ — ВАШИ ПРАВИЛА</span><h1>Настройки арены<span>.</span></h1><p>Настройте внешний вид, движение и голос под свой ритм практики.</p></div></div><div className="settings-body scroll-region">
  <div className="settings-grid">
   <section className="setting-card"><span className="setting-icon">{dark?<Moon size={23}/>:<Sun size={23}/>}</span><div><h2>Тёмная тема</h2><p>Снижает яркость интерфейса и сохраняет контраст показателей.</p></div><button role="switch" aria-label="Тёмная тема" aria-checked={dark} onClick={onDark} className={`toggle ${dark?'on':''}`}><span/></button></section>
   <section className="setting-card"><span className="setting-icon"><Activity size={23}/></span><div><h2>Спокойный режим</h2><p>Убирает движение фона и пульсацию. Показатели остаются видимыми.</p></div><button role="switch" aria-label="Спокойный режим" aria-checked={quiet} onClick={onQuiet} className={`toggle ${quiet?'on':''}`}><span/></button></section>
   <section className="setting-card media-card"><span className="setting-icon">{sounds?<Volume2 size={23}/>:<VolumeX size={23}/>}</span><div><h2>Звук и голос</h2><p>Короткие сигналы отмечают ход и рост напряжения. Реплики соперника может читать системный русский голос.</p><div className="media-switches"><button role="switch" aria-label="Звуковые эффекты" aria-checked={sounds} onClick={onSounds} className={sounds?'active':''}>{sounds?<Volume2 size={16}/>:<VolumeX size={16}/>} Эффекты <span>{sounds?'вкл.':'выкл.'}</span></button><button role="switch" aria-label="Автоозвучивание соперника" aria-checked={voice} onClick={onVoice} className={voice?'active':''}>{voice?<AudioLines size={16}/>:<VolumeX size={16}/>} Озвучивание <span>{voice?'вкл.':'выкл.'}</span></button></div></div></section>
   <section className="setting-card"><span className="setting-icon"><Compass size={23}/></span><div><h2>Легенда и знакомство</h2><p>История арены и короткая экскурсия по навигации, репликам и показателям.</p></div><button className="button secondary" onClick={onWelcome}>Посмотреть <ArrowUpRight size={17}/></button></section>
  </div>
  <section className="setting-card api-card"><span className="setting-icon"><KeyRound size={23}/></span><div><div className="api-title"><h2>Нейросеть · OpenAI</h2><span className={`status-tag ${status}`}>{status==='connected'?'Подключена':status==='checking'?'Проверка…':status==='error'?'Ошибка':'Не подключена'}</span></div><p>Вставьте свой ключ: браузер отправляет его напрямую в OpenAI. Без ключа или при ошибке арена использует сценарные ответы.</p><div className="api-form"><label>API-ключ<div className="key-input-wrap"><input aria-label="API-ключ OpenAI" type={visible?'text':'password'} value={apiKey} onChange={e=>{setApiKey(e.target.value);setStatus('idle');setMessage('')}} placeholder="sk-…" autoComplete="off" spellCheck={false}/><button type="button" className="key-icon" aria-label={visible?'Скрыть API-ключ':'Показать API-ключ'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>{saved&&<button type="button" className="key-icon remove" aria-label="Удалить API-ключ" onClick={disconnect}><Trash2 size={17}/></button>}</div></label><label>Модель<select aria-label="Модель OpenAI" value={model} onChange={e=>{setModel(e.target.value);setStatus('idle');setMessage('')}}>{AI_MODELS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="remember-key"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Запомнить ключ на этом устройстве</span></label><div className="api-actions"><button type="button" className="button primary" disabled={status==='checking'||apiKey.trim().length<20} onClick={connect}>{status==='checking'?'Проверяем…':'Проверить и подключить'} <ArrowRight size={17}/></button><a className="button secondary" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">Получить API-ключ <ArrowUpRight size={17}/></a><a className="text-button" href="https://developers.openai.com/api/docs/quickstart" target="_blank" rel="noopener noreferrer">Инструкция OpenAI <ArrowUpRight size={15}/></a></div>{message&&<p className={`api-message ${status}`} role="status">{message}</p>}<p className="api-warning"><ShieldCheck size={15}/> По умолчанию ключ хранится только до закрытия вкладки. Постоянное сохранение в localStorage менее безопасно и включается отдельно.</p></div></div></section>
  <div className="settings-footnote"><ShieldCheck size={16}/><p>Прогресс и настройки хранятся в этом браузере. Микрофон включается только после нажатия; Chrome может отправлять аудио своему онлайн-сервису распознавания. Запросы к OpenAI могут тарифицироваться в аккаунте владельца ключа.</p></div>
 </div></div>;
}
function formatTime(ms:number){const seconds=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
