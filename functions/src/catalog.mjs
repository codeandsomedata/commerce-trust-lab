import {SNAPSHOT} from './fixtures.mjs';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const norm = v => String(v ?? '').trim().toLowerCase();
export function extractDemoIntent(message) {
  const q = norm(message);
  const budget = q.match(/(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
  const location = q.includes('mountain view') ? 'Mountain View' : q.includes('palo alto') ? 'Palo Alto' : null;
  const brand = q.includes('kite hill') ? 'Kite Hill' : q.includes('oat meadow') ? 'Oat Meadow' : null;
  const flavor = q.includes('vanilla') ? 'vanilla' : q.includes('plain') ? 'plain' : null;
  const size = q.match(/\b(\d+(?:\.\d+)?)\s*(?:oz|ounce)/);
  const words=q.replace(/\d+(?:\.\d+)?/g,' ').replace(/[^a-z_]+/g,' ').trim().split(/\s+/);
  const vocabulary=new Set('get me find show buy prepare a an one the please i want would like need can you for pickup pick up kite hill oat meadow yogurt yogurts under below less than up to max maximum in at mountain view palo alto vegan dairy free vanilla plain oz ounce ounces stock with cheapest available some'.split(' '));
  const residualNumbers=q.replace(budget?.[0]||'__absent__','').replace(size?.[0]||'__absent__','');
  if(/\d/.test(residualNumbers) || words.some(w=>!vocabulary.has(w)) || (q.includes('mountain view')&&q.includes('palo alto')) || (q.includes('kite hill')&&q.includes('oat meadow')) || (q.includes('vanilla')&&q.includes('plain'))) {
    return {clarification:'I need a single supported yogurt request. Specify Kite Hill or Oat Meadow (or vegan yogurt), a USD budget, and one supported pickup city. Extra brands, attributes or combined constraints need more catalog coverage.'};
  }
  if (!q.includes('yogurt') || !location || !budget) {
    return {clarification:'Please specify yogurt, a USD limit, and Mountain View or Palo Alto. Try “Get me Kite Hill yogurt under $6 in Mountain View.”'};
  }
  if (/(?:€|£|\beur\b|\bgbp\b|\bnot\b|\bexcept\b|\bexcluding\b|\bdelivery\b|\btomorrow\b|\borganic\b|\bsugar\b|\bprotein\b|\bcalories\b|\bstrawberry\b|\bblueberry\b|\bchocolate\b|\bgluten\b|\ballergy\b|\bnut.free\b|\btwo\b|\bthree\b|\b2 cups\b|\b3 cups\b)/.test(q)) {
    return {clarification:'This prototype supports one pickup item, brand, vanilla/plain flavor, size, vegan/dairy-free tags, city and USD budget. I cannot verify the extra constraint; please restate it within that scope.'};
  }
  return {category:'yogurt', brand, flavor, size_oz:size ? Number(size[1]) : null,
    max_price:Number(budget[1]), location, must_be_in_stock:true,
    dietary_tags:[...(q.includes('vegan') ? ['vegan'] : []), ...(/dairy[- ]free/.test(q) ? ['dairy_free'] : [])]};
}

export const SEARCH_SCHEMA = {
  type:'object', properties:{
    category:{type:'string',enum:['yogurt']}, brand:{type:'string',description:'Kite Hill or Oat Meadow; empty if unspecified'},
    flavor:{type:'string',description:'vanilla or plain; empty if unspecified'}, size_oz:{type:'number',description:'0 if unspecified'},
    max_price:{type:'number'}, location:{type:'string',enum:['Mountain View','Palo Alto']},
    must_be_in_stock:{type:'boolean'}, dietary_tags:{type:'array',items:{type:'string',enum:['vegan','dairy_free']}}
  }, required:['category','max_price','location','must_be_in_stock','dietary_tags']
};
export function validateIntent(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new ApiError(400,'Invalid search arguments.');
  const allowed = new Set(Object.keys(SEARCH_SCHEMA.properties));
  if (Object.keys(args).some(k=>!allowed.has(k))) throw new ApiError(400,'Unsupported search constraint.');
  if (args.category !== 'yogurt' || !['Mountain View','Palo Alto'].includes(args.location) || !Number.isFinite(args.max_price) || args.max_price<=0 || args.max_price>1000 || args.must_be_in_stock!==true) throw new ApiError(400,'Search requires yogurt, a supported city, a positive USD budget, and in-stock inventory.');
  if (!Array.isArray(args.dietary_tags) || args.dietary_tags.some(t=>!['vegan','dairy_free'].includes(t))) throw new ApiError(400,'Unsupported dietary constraint.');
  if (args.brand && !['Kite Hill','Oat Meadow'].includes(args.brand)) throw new ApiError(400,'Brand is not covered by this catalog.');
  if (args.flavor && !['vanilla','plain'].includes(args.flavor)) throw new ApiError(400,'Flavor is not covered by this catalog.');
  if (args.size_oz != null && (!Number.isFinite(args.size_oz) || args.size_oz < 0)) throw new ApiError(400,'Invalid size.');
  return {...args,brand:args.brand||null,flavor:args.flavor||null,size_oz:args.size_oz||null,dietary_tags:[...new Set(args.dietary_tags)].sort()};
}

export function exposureReasons(offer, intent, {now=Date.parse(SNAPSHOT),maxAgeHours=6,forCart=false}={}) {
  const reasons = [];
  if (offer.merchant_controls?.allow_ai_display!==true) reasons.push('merchant_excluded');
  if (forCart && offer.merchant_controls?.allow_cart!==true) reasons.push('cart_not_permitted');
  const time = Date.parse(offer.observed_at);
  if (!Number.isFinite(time) || time>now || now-time>maxAgeHours*3600000) reasons.push('stale_or_invalid_timestamp');
  if (offer.availability_status!=='in_stock') reasons.push('stock_unverified');
  if (offer.fulfillment!=='pickup') reasons.push('pickup_unavailable');
  if (norm(offer.location)!==norm(intent.location)) reasons.push('wrong_location');
  if (offer.currency!=='USD' || !Number.isFinite(offer.price) || offer.price<0) reasons.push('invalid_price_or_currency');
  if (offer.price>intent.max_price) reasons.push('over_budget');
  if (!offer.attribution) reasons.push('missing_attribution');
  return reasons;
}
export function publicOffer(offer, product) {
  return {offer_id:offer.id,product_id:product.id,product_name:product.name,brand:product.brand,
    flavor:product.flavor,size_oz:product.size_oz,dietary_tags:product.dietary_tags,
    merchant:offer.merchant,price:offer.price,currency:offer.currency,location:offer.location,
    availability_status:offer.availability_status,observed_at:offer.observed_at,
    attribution:offer.attribution,source_url:offer.source_url,fulfillment:offer.fulfillment,
    merchant_controls:{allow_ai_display:offer.merchant_controls.allow_ai_display===true,allow_cart:offer.merchant_controls.allow_cart===true}};
}
export function matchesProduct(product,intent) {
  return product.category===intent.category && (!intent.brand||product.brand===intent.brand)
    && (!intent.flavor||product.flavor===intent.flavor) && (!intent.size_oz||product.size_oz===intent.size_oz)
    && Array.isArray(product.dietary_tags) && intent.dietary_tags.every(t=>product.dietary_tags.includes(t));
}
export async function searchCatalog(store,args,scenario='baseline') {
  const intent = validateIntent(args);
  const {products,offers} = await store.catalog(scenario);
  const matching = products.filter(p=>matchesProduct(p,intent));
  const candidates = offers.filter(o=>matching.some(p=>p.id===o.product_id));
  const eligible = [], rejectionCounts = {};
  for(const offer of candidates) {
    const reasons=exposureReasons(offer,intent);
    // Restricted rows are never included in tool results, including debug output.
    for(const reason of reasons) rejectionCounts[reason]=(rejectionCounts[reason]||0)+1;
    if(!reasons.length) eligible.push(publicOffer(offer,matching.find(p=>p.id===offer.product_id)));
  }
  eligible.sort((a,b)=>a.price-b.price||a.offer_id.localeCompare(b.offer_id));
  return {api_version:'1.0',constraints:intent,catalog_clock:SNAPSHOT,price_scope:'One pickup item before tax; no delivery or inventory guarantee',offers:eligible,
    metrics:{candidate_offers:candidates.length,eligible_offers:eligible.length,rejected_offers:candidates.length-eligible.length},
    rejection_counts:rejectionCounts};
}
