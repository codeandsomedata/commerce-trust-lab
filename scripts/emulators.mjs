import {existsSync,readdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const env={...process.env};
const folder=path.resolve('.tools/jdk');
if(!env.JAVA_HOME&&existsSync(folder)) {
  for(const name of readdirSync(folder)) {
    const candidate=path.join(folder,name,'Contents/Home');
    if(existsSync(path.join(candidate,'bin/java'))){env.JAVA_HOME=candidate;env.PATH=path.join(candidate,'bin')+path.delimiter+env.PATH;break;}
  }
}
env.FIREBASE_EMULATORS_PATH=env.FIREBASE_EMULATORS_PATH||path.resolve('.tools/firebase-emulators');
const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:start','--project','demo-commerce-trust','--only','firestore,functions,hosting'],{stdio:'inherit',env});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
