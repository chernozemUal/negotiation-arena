'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowLeft, ArrowRight, AudioLines, Compass, LayoutGrid, MessageSquare, Settings2, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { tensionState } from '@/lib/engine';

export const transition = {duration: .38, ease: [.22, 1, .36, 1] as const};
export function Arrival({children,className=''}:{children:ReactNode;className?:string}) {
 const reduced=useReducedMotion();
 return <motion.div className={className} initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-4}} transition={transition}>{children}</motion.div>;
}
export function Atmosphere({value=20,quiet=false}:{value?:number;quiet?:boolean}) {
 const state=tensionState(value);
 return <div className={`atmosphere ${quiet?'quiet':''} ${state.level}`} aria-hidden="true"><motion.div className="ambient-glow" animate={{backgroundColor:state.color,opacity:value>=70?.2:.08,scale:value>=70?1.2:1}} transition={{duration:1.8}}/><div className="ambient-grid"/></div>;
}
export function TensionMeter({value,previous,compact=false}:{value:number;previous?:number;compact?:boolean}) {
 const state=tensionState(value); const delta=previous===undefined?0:value-previous;
 return <div className={`tension-meter ${compact?'compact':''} ${state.level}`} style={{'--tension':state.color} as React.CSSProperties}>
   <div className="tension-title"><span><Activity size={15}/> Напряжённость</span><strong><motion.span key={value} initial={{opacity:.3}} animate={{opacity:1}} transition={transition}>{value}</motion.span><small>/100</small></strong></div>
   <div className="tension-track" role="meter" aria-label="Напряжённость" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><motion.div animate={{width:value+'%',backgroundColor:state.color}} transition={{duration:.9,ease:[.22,1,.36,1]}}/></div>
   <div className="tension-caption" aria-live="polite"><span>{state.label}</span>{delta!==0&&<span>{delta>0?'+':''}{delta} за ход</span>}</div>
   {!compact&&<p>{state.hint}</p>}
 </div>;
}
const chapters = [
 {number:'01',label:'ЛЕГЕНДА АРЕНЫ',title:'За каждой позицией — человек.',description:'Встреча начнётся через минуту. У вас есть цель. У собеседника — свои интересы. Приказом здесь не победить: предстоит услышать друг друга и найти решение.',icon:Compass},
 {number:'02',label:'ВАША КАРТА',title:'Выберите свой сложный разговор.',description:'«Арена» открывает сценарии и текущую сессию. «Прогресс» сохраняет ваши результаты. В «Конструкторе» можно изменить сферу, сложность, роль и цели собеседника.',icon:LayoutGrid},
 {number:'03',label:'КАЖДЫЙ ХОД МЕНЯЕТ ДИАЛОГ',title:'Слушайте. Отвечайте. Наблюдайте.',description:'Выберите одну из трёх реплик или напишите свою и нажмите стрелку отправки. Шкала напряжённости реагирует на решения: давление накаляет разговор, конструктивные предложения помогают его успокоить.',icon:Activity},
 {number:'04',label:'ПРАКТИКА БЕЗ СТРАХА ОШИБКИ',title:'Не идеальный ответ. Ваш следующий шаг.',description:'После четырёх ходов «Посмотреть разбор» покажет сильные решения и точки роста. «Попробовать иначе» начнёт новую попытку. В «Настройках» — эффекты, повтор легенды и подключение своего API-ключа OpenAI.',icon:ShieldCheck}
];
export function Welcome({onComplete}:{onComplete:()=>void}) {
 const [step,setStep]=useState(0);const chapter=chapters[step];
 return <div className="welcome"><Atmosphere/><div className="welcome-top"><div className="brand"><AudioLines size={24}/> арена<span>.</span></div><button className="text-button" onClick={onComplete}>Пропустить знакомство <ArrowRight size={15}/></button></div>
 <div className="welcome-body"><div className="welcome-art" aria-hidden="true"><div className="welcome-orbit orbit-a"/><div className="welcome-orbit orbit-b"/><motion.div className="welcome-core" animate={{rotate:step*30}} transition={{duration:1.2,ease:[.22,1,.36,1]}}><AudioLines size={76} strokeWidth={1}/></motion.div><span className="floating-label fl-one"><MessageSquare size={14}/> Разные интересы</span><span className="floating-label fl-two"><Activity size={14}/> Общая цель</span></div>
 <div className="welcome-copy"><AnimatePresence mode="wait"><Arrival key={step} className="chapter"><span className="eyebrow">{chapter.number} / {chapter.label}</span><h1 ref={node=>{node?.focus()}} tabIndex={-1}>{chapter.title}</h1><p>{chapter.description}</p><div className="chapter-preview">{step===0?<><ShieldCheck size={19}/><span>Безопасная практика. Реальные навыки.</span></>:step===1?<><LayoutGrid size={18}/><span>Арена</span><TrendingUp size={18}/><span>Прогресс</span><Settings2 size={18}/><span>Конструктор</span></>:step===2?<TensionMeter value={62} compact/>:<><Settings2 size={19}/><span>Вы всегда можете начать заново.</span></>}</div></Arrival></AnimatePresence>
 <div className="welcome-controls"><button className="icon-button" aria-label="Предыдущая глава" disabled={step===0} onClick={()=>setStep(step-1)}><ArrowLeft size={18}/></button><div className="chapter-dots">{chapters.map((c,i)=><button key={c.number} aria-label={`Глава ${i+1}`} aria-current={i===step?'step':undefined} onClick={()=>setStep(i)} className={i===step?'active':''}/>)}</div><button className="button primary" onClick={()=>step===3?onComplete():setStep(step+1)}>{step===3?'Войти в арену':'Дальше'}<ArrowRight size={17}/></button></div>
 </div></div><div className="welcome-footer"><span>АРЕНА ПЕРЕГОВОРОВ</span><span>Можно ошибаться. Важно пробовать.</span></div></div>;
}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.querySelector<HTMLElement>('button')?.focus();function key(e:KeyboardEvent){if(e.key==='Escape')closeRef.current();if(e.key==='Tab'){const elements=dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]');if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()}},[]);
 return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={transition} onClick={onClose}><motion.section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="modal" initial={{opacity:0,y:14,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}} transition={transition} onClick={e=>e.stopPropagation()}><button className="close icon-button" onClick={onClose} aria-label="Закрыть"><X size={20}/></button>{children}</motion.section></motion.div>;
}
