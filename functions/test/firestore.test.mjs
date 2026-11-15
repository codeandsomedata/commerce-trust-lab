import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

test('Firestore transaction revalidates changes and deduplicates concurrent cart retries', {skip:!process.env.FIRESTORE_EMULATOR_HOST}, async()=>{
  const {FirestoreStore}=await import('../src/firestore-store.mjs');
  const {PRODUCTS,OFFERS}=await import('../src/fixtures.mjs');
  const store=new FirestoreStore();
  const product={...PRODUCTS[0],id:'qa-'+randomUUID()};
  const offer={...OFFERS[0],id:'qa-offer',product_id:product.id};
  const productRef=store.db.collection('products').doc(product.id);
  const offerRef=productRef.collection('offers').doc(offer.id);
  const tokens=[];
  try {
    await productRef.set(product);await offerRef.set(offer);
    const data={offer_id:offer.id,product_id:product.id,price:offer.price,scenario:'baseline',
      intent:{category:'yogurt',brand:'Kite Hill',flavor:'vanilla',size_oz:5.3,location:'Mountain View',max_price:6,must_be_in_stock:true,dietary_tags:['vegan']}};
    const blocked=await store.propose(data);tokens.push(blocked);
    await offerRef.update({price:offer.price+0.01});
    await assert.rejects(store.draft(blocked,'changed-price-key'),e=>e.status===409);
    assert.equal((await store.db.collection('draftCarts').doc(blocked).get()).exists,false);
    await offerRef.update({price:offer.price});
    const token=await store.propose(data);tokens.push(token);
    const results=await Promise.all(Array.from({length:4},()=>store.draft(token,'concurrent-retry-key')));
    assert.equal(new Set(results.map(r=>r.id)).size,1);
    assert.equal(results[0].status,'draft');
    assert.equal(results[0].items.length,1);
    await assert.rejects(store.draft(token,'different-retry-key'),e=>e.status===409);
  } finally {
    const batch=store.db.batch();
    for(const token of tokens){batch.delete(store.db.collection('cartProposals').doc(token));batch.delete(store.db.collection('draftCarts').doc(token));}
    batch.delete(offerRef);batch.delete(productRef);await batch.commit();
  }
});
