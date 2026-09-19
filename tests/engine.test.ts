import {test} from 'node:test';
import assert from 'node:assert/strict';
import {choices,defaults,evaluateText,outcome,respond,threshold,tension,tensionState,Domain,Config,Turn} from '../lib/engine';
for(const domain of ['supplier','career'] as Domain[]) test(`${domain}: cooperative and hostile paths diverge`,()=>{const config=defaults[domain];const good=[0,1,2,3].map(i=>({...choices(domain,i)[0],reply:''}));assert.equal(outcome(config,good).won,true);const bad=[0,1,2,3].map(i=>({...choices(domain,i)[i===0?1:2],reply:''}));assert.equal(outcome(config,bad).won,false);assert.ok(outcome(config,good).trust>outcome(config,bad).trust);assert.equal(outcome(config,good.slice(0,3)).won,false);});
test('configuration affects success threshold and replies',()=>{assert.ok(threshold({...defaults.supplier,difficulty:'Эксперт'})>threshold({...defaults.supplier,difficulty:'Базовый'}));const c=choices('supplier',1)[0];const config={...defaults.supplier,goal:'Снизить риски',tone:'Жёсткий' as const};assert.match(respond(config,1,c,70),/Перейдём к делу/);assert.match(respond(config,1,c,70),/снизить риски/);assert.match(respond(config,1,c,10),/остановим/)});
test('free text checks the current stage, threats, and a neutral fallback',()=>{assert.equal(evaluateText('Предлагаю контракт на год и объём в обмен на рост цены 5%.','supplier',2).skill,'Аргументация');assert.equal(evaluateText('Вы обязаны принять наши условия, иначе мы уйдём.','supplier',0).points,2);assert.equal(evaluateText('Просто некоторый текст без конкретного приёма','career',3).points,9)});

const turn = (domain: Domain, stage: number, option: number): Turn => ({
 ...choices(domain, stage)[option], reply: ''
});

test('tone and difficulty both change the opening tension', () => {
 const tones: Config['tone'][] = ['Дружелюбный', 'Сдержанный', 'Жёсткий'];
 const difficulties: Config['difficulty'][] = ['Базовый', 'Продвинутый', 'Эксперт'];
 for (const difficulty of difficulties) {
  const values = tones.map(tone => tension({...defaults.supplier, tone, difficulty}, []));
  assert.ok(values[0] < values[1] && values[1] < values[2]);
 }
 for (const tone of tones) {
  const values = difficulties.map(difficulty => tension({...defaults.supplier, tone, difficulty}, []));
  assert.ok(values[0] < values[1] && values[1] < values[2]);
 }
});

for (const domain of ['supplier', 'career'] as Domain[]) {
 test(`${domain}: pressure raises tension and constructive replies lower it`, () => {
  const config = defaults[domain];
  for (let stage = 0; stage < 4; stage++) {
   const baseline = tension(config, []);
   const constructive = tension(config, [turn(domain, stage, 0)]);
   const pressure = tension(config, [turn(domain, stage, stage === 0 ? 1 : 2)]);
   assert.ok(constructive < baseline, `constructive stage ${stage}`);
   assert.ok(pressure > baseline, `pressure stage ${stage}`);
  }
 });
}

test('tension remains within 5–100 across every four-stage path', () => {
 for (const domain of ['supplier', 'career'] as Domain[]) {
  for (const tone of ['Дружелюбный', 'Сдержанный', 'Жёсткий'] as const) {
   for (const difficulty of ['Базовый', 'Продвинутый', 'Эксперт'] as const) {
    const config = {...defaults[domain], tone, difficulty};
    const visit = (turns: Turn[]) => {
     const value = tension(config, turns);
     assert.ok(value >= 5 && value <= 100, `${domain}, ${tone}, ${difficulty}: ${value}`);
     if (turns.length === 4) return;
     for (let option = 0; option < 3; option++) {
      visit([...turns, turn(domain, turns.length, option)]);
     }
    };
    visit([]);
   }
  }
 }
});

test('the tension limits allow an immediate response to the next choice', () => {
 const calm: Config = {...defaults.supplier, tone: 'Дружелюбный', difficulty: 'Базовый'};
 const contact = [turn('supplier', 0, 0), turn('supplier', 1, 0)];
 assert.equal(tension(calm, contact), 5);
 assert.ok(tension(calm, [...contact, turn('supplier', 2, 2)]) > 5);
 assert.equal(tension(calm, [...contact, turn('supplier', 2, 0)]), 5);

 const difficult: Config = {...defaults.supplier, tone: 'Жёсткий', difficulty: 'Эксперт'};
 const confrontation = [turn('supplier', 0, 1), turn('supplier', 1, 2)];
 assert.equal(tension(difficult, confrontation), 100);
 assert.ok(tension(difficult, [...confrontation, turn('supplier', 2, 0)]) < 100);
 assert.equal(tension(difficult, [...confrontation, turn('supplier', 2, 2)]), 100);
});

test('tension measures unresolved pressure separately from trust', () => {
 const config = defaults.supplier;
 const concession = [turn('supplier', 0, 2)];
 assert.ok(outcome(config, concession).trust > outcome(config, []).trust);
 assert.ok(tension(config, concession) > tension(config, []));

 const friendly: Config = {...config, tone: 'Дружелюбный'};
 const harsh: Config = {...config, tone: 'Жёсткий'};
 assert.equal(outcome(friendly, []).trust, outcome(harsh, []).trust);
 assert.ok(tension(friendly, []) < tension(harsh, []));
});

test('saved session turns fully restore tension without extra persisted state', () => {
 const config: Config = {...defaults.career, tone: 'Жёсткий', difficulty: 'Эксперт'};
 const turns = [turn('career', 0, 1), turn('career', 1, 0), turn('career', 2, 0)];
 const saved = JSON.stringify({id: 'restored-session', config, turns, started: 1000});
 const restored = JSON.parse(saved) as {config: Config; turns: Turn[]};
 assert.equal(tension(restored.config, restored.turns), tension(config, turns));
 const finalTurn = turn('career', 3, 0);
 assert.equal(
  tension(restored.config, [...restored.turns, finalTurn]),
  tension(config, [...turns, finalTurn])
 );
 assert.equal(JSON.stringify({id: 'restored-session', config, turns, started: 1000}), saved);
});

test('tension labels switch at the visible warning thresholds', () => {
 assert.equal(tensionState(5).level, 'low');
 assert.equal(tensionState(44).level, 'low');
 assert.equal(tensionState(45).level, 'medium');
 assert.equal(tensionState(69).level, 'medium');
 assert.equal(tensionState(70).level, 'high');
 assert.equal(tensionState(100).level, 'high');
});
