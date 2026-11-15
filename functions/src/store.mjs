import {randomUUID} from 'node:crypto';
import {CATALOG_VERSION,PRODUCTS,OFFERS,scenarioOffers} from './fixtures.mjs';
import {ApiError,exposureReasons,publicOffer,matchesProduct} from './catalog.mjs';

// Shared across the memory and Firestore transaction adapters.
export function validateDraft(proposal,offer,product,now=Date.now()) {
  if(!proposal || proposal.expires_at<now) throw new ApiError(409,'This proposal expired. Run the search again.');
  if(!offer||!product) throw new ApiError(409,'Offer was removed. Run the search again.');
  const updated=scenarioOffers([offer],proposal.scenario)[0];
  if(exposureReasons(updated,proposal.intent,{forCart:true}).length || !matchesProduct(product,proposal.intent) || updated.price!==proposal.price || updated.product_id!==proposal.product_id) throw new ApiError(409,'Offer price, product attributes, availability or merchant permission changed. Run the search again.');
  return {id:'cart-'+proposal.id.slice(0,12),status:'draft',items:[{...publicOffer(updated,product),quantity:1}],
    total:updated.price,currency:'USD',created_at:new Date(now).toISOString(),catalog_version:CATALOG_VERSION,
    note:'Demo draft only. No payment, purchase, inventory hold or merchant reservation occurred.'};
}
export class MemoryStore {
  storage='local-memory';
  products=structuredClone(PRODUCTS); offers=structuredClone(OFFERS); proposals=new Map(); carts=new Map();
  async catalog(scenario) {return {products:structuredClone(this.products),offers:scenarioOffers(this.offers,scenario)};}
  async propose(data) {
    const id=randomUUID(); this.proposals.set(id,{...structuredClone(data),id,expires_at:Date.now()+10*60*1000}); return id;
  }
  async draft(token,idempotencyKey) {
    const proposal=this.proposals.get(token);
    if(!proposal) throw new ApiError(404,'Unknown cart proposal.');
    if(proposal.used_key && proposal.used_key!==idempotencyKey) throw new ApiError(409,'Proposal already used. Retry with the original idempotency key.');
    if(this.carts.has(token)) return structuredClone(this.carts.get(token));
    const offer=this.offers.find(o=>o.id===proposal.offer_id), product=this.products.find(p=>p.id===proposal.product_id);
    const cart=validateDraft(proposal,offer,product); proposal.used_key=idempotencyKey;
    this.carts.set(token,cart); return structuredClone(cart);
  }
}
