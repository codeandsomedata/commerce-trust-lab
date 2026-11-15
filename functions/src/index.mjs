import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {FirestoreStore} from './firestore-store.mjs';
import {dispatch} from './service.mjs';

const geminiKey=defineSecret('GEMINI_API_KEY');
const demoAccess=defineSecret('DEMO_ACCESS_TOKEN');
const secrets=process.env.FUNCTIONS_EMULATOR==='true'?[]:[demoAccess,...(process.env.ENABLE_GEMINI==='1'?[geminiKey]:[])];
const store=new FirestoreStore();
export const commerce=onRequest({region:'us-central1',timeoutSeconds:120,memory:'256MiB',maxInstances:2,secrets},async(req,res)=>{
  const origin=req.headers.origin||'';
  if(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)||origin===process.env.DEMO_ORIGIN) {
    res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');
    res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if(req.method==='OPTIONS') {res.status(204).end();return;}
  if(process.env.FUNCTIONS_EMULATOR!=='true'&&(!process.env.DEMO_ACCESS_TOKEN||req.headers.authorization!==`Bearer ${process.env.DEMO_ACCESS_TOKEN}`)) {res.status(401).json({error:'This private demo needs its configured access token.'});return;}
  res.set('Cache-Control','no-store');
  try {res.json(await dispatch(store,req.path,req.method,req.body));}
  catch(error) {res.status(error.status||502).json({error:error.status?error.message:'The dependency could not complete the request. No purchase or reservation occurred.'});}
});
