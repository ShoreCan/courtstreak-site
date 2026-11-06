import fs from 'node:fs';
import path from 'node:path';
// Development-only, same-origin result capture. No arbitrary filename/path.
export function diagnosticOutput(){return {name:'local-tracker-diagnostic-output',apply:'serve',configureServer(server){
 server.middlewares.use('/__tracker_repair_result',async(req,res,next)=>{
  if(req.method!=='POST')return next();
  let origin;try{origin=new URL(req.headers.origin??'');}catch{res.statusCode=403;res.end();return;}
  if(!['127.0.0.1','localhost'].includes(origin.hostname)||!req.headers['content-type']?.startsWith('application/json')){res.statusCode=403;res.end();return;}
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>3_000_000)throw new Error('Result too large');}
   const data=JSON.parse(text);if(data.schema!=='courtstreak-local-crop-check-v1'||!Array.isArray(data.rows))throw new Error('Unexpected diagnostic');
   const output=path.resolve(server.config.root,'../deliverables/tracking-repair-01/crop-browser-results.json');
   fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(data,null,2));
   res.setHeader('content-type','application/json');res.end('{"saved":true}');
  }catch{res.statusCode=400;res.end('{"saved":false}');}
 });
}};}
