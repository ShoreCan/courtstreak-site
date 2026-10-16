import { LAUNCH_DRILLS } from './drillCatalog.js';
export const DRILL_INSTRUCTIONS=Object.fromEntries(LAUNCH_DRILLS.map(d=>[d.drill_key,d.steps.join(' ')+' '+d.repeat]));
