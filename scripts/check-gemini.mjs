import {existsSync,readFileSync} from 'node:fs';
import {agentRun} from '../functions/src/service.mjs';
import {MemoryStore} from '../functions/src/store.mjs';

if(existsSync('.env.local')) for(const line of readFileSync('.env.local','utf8').split('\n')) {
  const match=line.match(/^(GEMINI_API_KEY|GEMINI_MODEL)=(.*)$/);
  if(match&&match[2].trim()) process.env[match[1]]=match[2].trim().replace(/^(["'])(.*)\1$/,'$2');
}
if(!process.env.GEMINI_API_KEY||!process.env.GEMINI_MODEL) {
  console.error('Gemini is not configured. Fill GEMINI_API_KEY and GEMINI_MODEL in .env.local; credentials will not be printed.');process.exitCode=1;
} else {
  try {
    const result=await agentRun(new MemoryStore(),{message:'Get me Kite Hill yogurt under $6 in Mountain View',mode:'gemini'});
    console.log(JSON.stringify({connected:true,mode:result.mode,status:result.status,offer_id:result.recommendation?.offer_id,trace_steps:result.trace.length},null,2));
  } catch(error){console.error(error.status?error.message:'Gemini connection failed. Check endpoint access, model availability and network.');process.exitCode=1;}
}
