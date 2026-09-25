'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Config, defaults, Turn, Choice, respond, outcome, SESSION_STAGE_COUNT } from './engine';
export type Session = {id:string; config:Config; turns:Turn[]; started:number; ended?:number; draft?:string; stageCount?:number};
export function sessionStageCount(session: Session) {
 return session.stageCount ?? (session.ended ? Math.max(4,session.turns.length) : SESSION_STAGE_COUNT);
}
type Store = {config:Config; session:Session|null; history:Session[]; setConfig:(c:Config)=>void; setReplyDraft:(text:string)=>void; start:(c:Config)=>void; answer:(c:Choice,reply?:string)=>void; finish:()=>void; clearSession:()=>void};
export const useArena = create<Store>()(persist((set,get)=>({
 config:defaults.supplier,session:null,history:[],setConfig:config=>set({config}),
 setReplyDraft:text=>{const s=get().session;if(s&&!s.ended)set({session:{...s,draft:text.slice(0,800)}});},
 start:config=>set({session:{id:crypto.randomUUID(),config:{...config},turns:[],started:Date.now(),stageCount:SESSION_STAGE_COUNT}}),
 answer:(c,reply)=>{const s=get().session;if(!s||s.ended||s.turns.length>=sessionStageCount(s))return; const stageCount=sessionStageCount(s);const trust=outcome(s.config,[...s.turns,{...c,reply:''}],stageCount).trust;const finalReply=reply?.trim().slice(0,1000)||respond(s.config,s.turns.length,c,trust);set({session:{...s,draft:'',stageCount,turns:[...s.turns,{...c,reply:finalReply}]}});},
 finish:()=>{const s=get().session;if(!s||s.ended)return;const completed={...s,stageCount:sessionStageCount(s),ended:Date.now()};set({session:completed,history:[completed,...get().history].slice(0,50)});},clearSession:()=>set({session:null})
}),{name:'arena-v1',version:1}));
