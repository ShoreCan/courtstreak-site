// The exported ball model ranks anchors by their best class, then ranks all
// classes of the retained anchors. Preserve both rankings and their tie order.
export const BALL_HEAD_ANCHORS = 5376;
const ROW_SIZE = 84;
const CLASS_COUNT = 80;
const SPORT_BALL_CLASS = 32;
const RANK_LIMIT = 300;
export const BALL_SINGLE_READBACK_REVISION = 'BALL READBACK 01';

export function rankBallHead(data, minimumScore, anchorCount = BALL_HEAD_ANCHORS) {
 if (data.length !== anchorCount * ROW_SIZE) throw new Error('Unexpected ball model output size.');
 const scores = new Float32Array(anchorCount);
 const anchors = Array.from({length: anchorCount}, (_, i) => {
  const start = i * ROW_SIZE + 4;
  let max = 0;
  for (let j = 0; j < CLASS_COUNT; j++) max = Math.max(max, data[start + j]);
  scores[i] = max;
  return i;
 });
 anchors.sort((a, b) => scores[b] - scores[a] || a - b);
 anchors.length = Math.min(anchors.length, RANK_LIMIT);
 const ranked = [];
 for (let order = 0; order < anchors.length; order++) {
  const start = anchors[order] * ROW_SIZE + 4;
  for (let c = 0; c < CLASS_COUNT; c++) {
   const score = data[start + c];
   // Scores below the decoder threshold cannot outrank any retained detection.
   if (score >= minimumScore) ranked.push({score, c, order});
  }
 }
 ranked.sort((a, b) => b.score - a.score || a.order - b.order || a.c - b.c);
 const rows = new Float32Array(RANK_LIMIT * 6);
 let offset = 0;
 for (const {score, c, order} of ranked.slice(0, RANK_LIMIT)) {
  if (c !== SPORT_BALL_CLASS) continue;
  const box = anchors[order] * ROW_SIZE;
  rows.set([data[box], data[box + 1], data[box + 2], data[box + 3], score, c], offset);
  offset += 6;
 }
 return {data: rows, dims: [1, RANK_LIMIT, 6]};
}
