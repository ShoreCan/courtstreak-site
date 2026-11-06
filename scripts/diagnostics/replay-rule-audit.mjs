import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {replaySavedCounter} from '../../src/lib/ai/savedCounterReplay.mjs';
export {replaySavedCounter};
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input)),result=replaySavedCounter(data);
 const {state,...report}=result;
 if(output)fs.writeFileSync(output,JSON.stringify(report));
 console.log(JSON.stringify({input,count:result.count,recorded:result.recordedCount,timeline:result.countTimelineMatches,records:result.acceptedRecordsMatch,mismatches:result.timelineMismatches.slice(0,3)}));
 if(!result.countTimelineMatches||!result.acceptedRecordsMatch)process.exitCode=1;
}
