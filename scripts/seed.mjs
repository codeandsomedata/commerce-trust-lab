import {FirestoreStore} from '../functions/src/firestore-store.mjs';
import {PRODUCTS,OFFERS} from '../functions/src/fixtures.mjs';

if(!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Seeding is restricted to the local Firestore emulator. Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.');
const store=new FirestoreStore(),batch=store.db.batch();
for(const product of PRODUCTS) {
  const {id,...data}=product;batch.set(store.db.collection('products').doc(id),data);
}
for(const offer of OFFERS) {
  const {id,product_id,...data}=offer;batch.set(store.db.collection('products').doc(product_id).collection('offers').doc(id),data);
}
await batch.commit();
console.log(`Seeded ${PRODUCTS.length} canonical products and ${OFFERS.length} synthetic offers in the emulator.`);
