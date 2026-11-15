import {randomUUID} from 'node:crypto';
import {ApiError,extractDemoIntent,searchCatalog,validateIntent} from './catalog.mjs';
import {CATALOG_VERSION,SCENARIOS,SNAPSHOT} from './fixtures.mjs';
import {configuredModes,extractWithModel,chooseWithModel,SYSTEM_PROMPT} from './models.mjs';

function traceEntry(title,kind,data,start=performance.now()) {
  return {id:randomUUID().slice(0,8),title,kind,data,duration_ms:Number((performance.now()-start).toFixed(2))};
}
export function health(store) {return {storage:store.storage,modes:configuredModes(),catalog_version:CATALOG_VERSION,synthetic:true,snapshot_at:SNAPSHOT};}

export async function agentRun(store,body) {
  const {message,scenario='baseline',mode='demo'}=body||{};
  if(typeof message!=='string'||!message.trim()||message.length>1500) throw new ApiError(400,'Enter a request between 1 and 1,500 characters.');
  if(!SCENARIOS.includes(scenario)||!['demo','gemini','ollama'].includes(mode)) throw new ApiError(400,'Unknown scenario or model mode.');
  const trace=[],run_id=randomUUID().slice(0,8),base={run_id,mode,storage:store.storage,catalog_version:CATALOG_VERSION};
  const start=performance.now();
  const extracted=extractDemoIntent(message);
  if(extracted.clarification) return {...base,status:'clarify',answer:extracted.clarification,recommendation:null,action:null,metrics:{candidate_offers:0,eligible_offers:0,rejected_offers:0},trace:[traceEntry('Clarify unsupported constraints','policy',{message:extracted.clarification})]};
  let intent=validateIntent(extracted);
  if(mode!=='demo') {
    const args=await extractWithModel(message,mode);
    const proposed=validateIntent(args);
    // User constraint integrity is checked independently of the probabilistic model.
    if(Object.keys(intent).some(k=>JSON.stringify(intent[k])!==JSON.stringify(proposed[k]))) throw new ApiError(422,'Model-extracted constraints differ from the request. No search or action executed; try Demo mode or restate the request.');
    intent=proposed;
  }
  trace.push(traceEntry(mode==='demo'?'Demo planner calls search_catalog':`${mode} calls search_catalog`,'tool_call',{name:'search_catalog',arguments:intent,planner:mode==='demo'?'Deterministic supported-intent parser; no LLM call':'Live model tool call'},start));
  const searchStart=performance.now();
  const evidence=await searchCatalog(store,intent,scenario);
  trace.push(traceEntry('Catalog API returns eligible evidence','tool_result',evidence,searchStart));
  trace.push(traceEntry('Exposure and readiness checks','policy',{freshness_limit_hours:6,stock_required:'in_stock',currency:'USD',rights:'Restricted records removed before any model context',rejection_counts:evidence.rejection_counts,scenario}));
  let best=evidence.offers[0]||null;
  if(mode!=='demo') {
    const {selection,prompt,contents}=await chooseWithModel(message,evidence,mode);
    if(selection?.offer_id!==(best?.offer_id||null)) throw new ApiError(422,'Model selected an offer outside the lowest eligible evidence. No proposal created.');
    trace.push(traceEntry('Final model prompt · evidence selection','prompt',{system:prompt,input:contents,validated_selection:selection}));
  } else trace.push(traceEntry('Answer composition · demo mode','prompt',{mode:'Deterministic renderer; this is not a prompt sent to an LLM',template:'{product_name} at {merchant}: ${price}, pickup in {location}; feed observed {observed_at}.',evidence_offer_id:best?.offer_id||null,live_model_system_prompt:SYSTEM_PROMPT}));
  let action=null;
  if(best?.merchant_controls.allow_cart===true) {
    const token=await store.propose({offer_id:best.offer_id,product_id:best.product_id,price:best.price,intent,scenario});
    action={type:'prepare_cart',label:'Prepare demo cart',token};
    trace.push(traceEntry('Propose prepare_cart · awaiting click','action',{tool:'prepare_cart',offer_id:best.offer_id,quantity:1,approval:'User clicks to create a draft',revalidation:'Price, stock, freshness and merchant controls checked again',idempotency:'One draft per proposal; retries reuse the same key'}));
  }
  const answer=best ? `I found ${best.product_name} for $${best.price.toFixed(2)} at ${best.merchant}, for pickup in ${best.location}. It is the lowest-priced eligible match in this demo catalog, before tax. The synthetic feed reported it in stock at ${best.observed_at}. ${action?'I can prepare a demo cart for your review.':'This merchant permits display only; a cart cannot be prepared.'}`
    : 'I cannot prepare a cart from the current evidence. No permitted, fresh, in-stock offer meets your request. I will not substitute an unavailable or unverified offer.';
  return {...base,status:best?'ready':'abstained',answer,recommendation:best,action,trace,metrics:evidence.metrics};
}

export async function prepareCart(store,body) {
  const {token,idempotency_key}=body||{};
  if(typeof token!=='string'||!/^[a-f0-9-]{36}$/.test(token)||typeof idempotency_key!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(idempotency_key)) throw new ApiError(400,'A proposal token and stable idempotency key are required.');
  const start=performance.now(),cart=await store.draft(token,idempotency_key);
  return {cart,trace:[traceEntry('prepare_cart returns a draft','action',{tool:'prepare_cart',cart_id:cart.id,status:cart.status,total:cart.total,transaction:'Revalidated offer and created draft atomically',idempotent:true,note:cart.note},start)]};
}

export async function dispatch(store,path,method,body) {
  if(path==='/api/health'&&method==='GET') return health(store);
  if(path==='/api/agent'&&method==='POST') return agentRun(store,body);
  if(path==='/api/cart'&&method==='POST') return prepareCart(store,body);
  if(path==='/api/v1/catalog/search'&&method==='POST') return searchCatalog(store,body,'baseline');
  throw new ApiError(404,'Endpoint not found.');
}
