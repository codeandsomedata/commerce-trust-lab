// Original synthetic offers. Brand names illustrate queries; no merchant affiliation.
export const CATALOG_VERSION = 'synthetic-grocery-v1';
export const SNAPSHOT = '2026-11-14T12:00:00.000Z';
export const PRODUCTS = [
  {id:'kite-vanilla-5oz', name:'Kite Hill Vanilla Yogurt · 5.3 oz', brand:'Kite Hill', category:'yogurt', flavor:'vanilla', size_oz:5.3, dietary_tags:['vegan','dairy_free']},
  {id:'kite-plain-5oz', name:'Kite Hill Plain Yogurt · 5.3 oz', brand:'Kite Hill', category:'yogurt', flavor:'plain', size_oz:5.3, dietary_tags:['vegan','dairy_free']},
  {id:'kite-vanilla-32oz', name:'Kite Hill Vanilla Yogurt · 32 oz', brand:'Kite Hill', category:'yogurt', flavor:'vanilla', size_oz:32, dietary_tags:['vegan','dairy_free']},
  {id:'oat-vanilla-5oz', name:'Oat Meadow Vanilla Yogurt · 5.3 oz', brand:'Oat Meadow', category:'yogurt', flavor:'vanilla', size_oz:5.3, dietary_tags:['vegan','dairy_free']},
];
function offer(id, product_id, merchant, price, age, extra={}) {
  return {id, product_id, merchant, price, currency:'USD', location:'Mountain View',
    availability_status:'in_stock', observed_at:new Date(Date.parse(SNAPSHOT)-age*3600000).toISOString(),
    merchant_controls:{allow_ai_display:true,allow_cart:true},
    attribution:merchant+' · synthetic feed', source_url:'https://example.com/synthetic-offers/'+id,
    fulfillment:'pickup', ...extra};
}
export const OFFERS = [
  offer('orchard-vanilla','kite-vanilla-5oz','Orchard Market (demo)',4.49,1),
  offer('harbor-vanilla','kite-vanilla-5oz','Harbor Grocery (demo)',4.99,2),
  offer('stale-promotion','kite-vanilla-5oz','Harbor Grocery (demo)',2.99,48),
  offer('restricted-offer','kite-vanilla-5oz','Juniper Foods (demo)',1.99,1,{merchant_controls:{allow_ai_display:false,allow_cart:false}}),
  offer('out-of-stock','kite-vanilla-5oz','Cedar Pantry (demo)',3.49,1,{availability_status:'out_of_stock'}),
  offer('wrong-city','kite-vanilla-5oz','Orchard Market (demo)',3.29,1,{location:'Palo Alto'}),
  offer('plain','kite-plain-5oz','Orchard Market (demo)',4.79,2),
  offer('large-tub','kite-vanilla-32oz','Harbor Grocery (demo)',8.99,1),
  offer('oat','oat-vanilla-5oz','Orchard Market (demo)',3.79,1),
  offer('unknown-stock','kite-vanilla-5oz','Willow Grocery (demo)',3.99,1,{availability_status:'unknown'}),
  offer('no-attribution','kite-vanilla-5oz','Willow Grocery (demo)',4.19,1,{attribution:''}),
];

export const SCENARIOS = ['baseline','stale','restricted','out_of_stock'];
export function scenarioOffers(offers, scenario) {
  return offers.map(original => {
    const o = structuredClone(original);
    if (scenario === 'stale') o.observed_at = '2026-11-11T12:00:00.000Z';
    if (scenario === 'restricted') o.merchant_controls.allow_ai_display = false;
    if (scenario === 'out_of_stock') o.availability_status = 'out_of_stock';
    return o;
  });
}
