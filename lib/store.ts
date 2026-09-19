'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Config, defaults, Turn, Choice, respond, outcome } from './engine';
export type Session = {id:string; config:Config; turns:Turn[]; started:number; ended?:number; draft?:string};
type Store = {config:Config; session:Session|null; history:Session[]; setConfig:(c:Config)=>void; setReplyDraft:(text:string)=>void; start:(c:Config)=>void; answer:(c:Choice)=>void; finish:()=>void; clearSession:()=>void};
export const useArena = create<Store>()(persist((set,get)=>({
 config:defaults.supplier,session:null,history:[],setConfig:config=>set({config}),
 setReplyDraft:text=>{const s=get().session;if(s&&!s.ended)set({session:{...s,draft:text.slice(0,800)}});},
 start:config=>set({session:{id:crypto.randomUUID(),config:{...config},turns:[],started:Date.now()}}),
 answer:c=>{const s=get().session;if(!s||s.ended||s.turns.length>=4)return; const trust=outcome(s.config,[...s.turns,{...c,reply:''}]).trust;set({session:{...s,draft:'',turns:[...s.turns,{...c,reply:respond(s.config,s.turns.length,c,trust)}]}});},
 finish:()=>{const s=get().session;if(!s||s.ended)return;const completed={...s,ended:Date.now()};set({session:completed,history:[completed,...get().history].slice(0,50)});},clearSession:()=>set({session:null})
}),{name:'arena-v1',version:1}));
