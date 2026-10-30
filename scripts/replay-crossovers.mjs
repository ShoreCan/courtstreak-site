import {readFile} from 'node:fs/promises';
import {replayCrossovers} from '../src/lib/ai/crossoverReplay.mjs';
if(!process.argv[2])throw new Error('Usage: node scripts/replay-crossovers.mjs <test-details.json>');
const evidence=JSON.parse(await readFile(process.argv[2],'utf8'));
console.log(JSON.stringify({liveCount:evidence.displayedCount,...replayCrossovers(evidence)},null,2));
