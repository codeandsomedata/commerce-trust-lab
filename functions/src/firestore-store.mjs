import {getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {ApiError} from './catalog.mjs';
import {scenarioOffers} from './fixtures.mjs';
import {validateDraft} from './store.mjs';

export class FirestoreStore {
  storage='firestore';
  constructor(db) {
    if(!db) {if(!getApps().length) initializeApp({projectId:process.env.GCLOUD_PROJECT||'demo-commerce-trust'}); db=getFirestore();}
    this.db=db;
  }
  async catalog(scenario) {
    const docs=await this.db.collection('products').where('category','==','yogurt').get();
    const products=docs.docs.map(d=>({...d.data(),id:d.id}));
    const snapshots=await Promise.all(docs.docs.map(d=>d.ref.collection('offers').get()));
    const offers=snapshots.flatMap((s,i)=>s.docs.map(d=>({...d.data(),id:d.id,product_id:products[i].id})));
    return {products,offers:scenarioOffers(offers,scenario)};
  }
  async propose(data) {
    const id=randomUUID();
    await this.db.collection('cartProposals').doc(id).create({...data,id,expires_at:Date.now()+600000});
    return id;
  }
  async draft(token,idempotencyKey) {
    const proposalRef=this.db.collection('cartProposals').doc(token),cartRef=this.db.collection('draftCarts').doc(token);
    return this.db.runTransaction(async tx=>{
      const [proposalSnap,cartSnap]=await Promise.all([tx.get(proposalRef),tx.get(cartRef)]);
      if(!proposalSnap.exists) throw new ApiError(404,'Unknown cart proposal.');
      const proposal=proposalSnap.data();
      if(proposal.used_key&&proposal.used_key!==idempotencyKey) throw new ApiError(409,'Proposal already used. Retry with the original idempotency key.');
      if(cartSnap.exists) return cartSnap.data();
      const productRef=this.db.collection('products').doc(proposal.product_id);
      const [productSnap,offerSnap]=await Promise.all([tx.get(productRef),tx.get(productRef.collection('offers').doc(proposal.offer_id))]);
      const product=productSnap.exists?{...productSnap.data(),id:productSnap.id}:null;
      const offer=offerSnap.exists?{...offerSnap.data(),id:offerSnap.id,product_id:proposal.product_id}:null;
      const cart=validateDraft(proposal,offer,product);
      tx.create(cartRef,cart);tx.update(proposalRef,{used_key:idempotencyKey});
      return cart;
    });
  }
}
