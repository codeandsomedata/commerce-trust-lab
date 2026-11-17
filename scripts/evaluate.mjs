import {agentRun} from '../functions/src/service.mjs';
import {MemoryStore} from '../functions/src/store.mjs';
const cases=[
  ['Exact brand, budget, city','Get me Kite Hill yogurt under $6 in Mountain View','baseline','ready','orchard-vanilla'],
  ['Dietary and budget','Find vegan yogurt under $4 in Mountain View','baseline','ready','oat'],
  ['Flavor match','Find Kite Hill plain yogurt under $6 in Mountain View','baseline','ready','plain'],
  ['Package size match','Find Kite Hill vanilla yogurt 32 oz under $10 in Mountain View','baseline','ready','large-tub'],
  ['City match','Find Kite Hill yogurt under $6 in Palo Alto','baseline','ready','wrong-city'],
  ['Budget cannot be met','Find Kite Hill yogurt under $3 in Mountain View','baseline','abstained',null],
  ['Stale evidence','Get me Kite Hill yogurt under $6 in Mountain View','stale','abstained',null],
  ['Merchant exclusions','Get me Kite Hill yogurt under $6 in Mountain View','restricted','abstained',null],
  ['Unavailable stock','Get me Kite Hill yogurt under $6 in Mountain View','out_of_stock','abstained',null],
  ['Unknown brand','Find Chobani yogurt under $6 in Mountain View','baseline','clarify',null],
  ['Unknown attributes','Find organic yogurt under $6 in Mountain View','baseline','clarify',null],
  ['Unsupported quantity','Find four cups of yogurt under $6 in Mountain View','baseline','clarify',null],
];
const results=[];
for(const [name,message,scenario,status,id]of cases){const result=await agentRun(new MemoryStore(),{message,scenario,mode:'demo'});results.push({name,passed:result.status===status&&(result.recommendation?.offer_id??null)===id,status:result.status,offer_id:result.recommendation?.offer_id??null});}
const passed=results.filter(r=>r.passed).length;
console.log(JSON.stringify({scope:'Original synthetic fixtures; deterministic workflow; no live-model or production accuracy claim',passed,total:results.length,cases:results},null,2));
process.exitCode=passed===results.length?0:1;
