import {BALL_HEAD_ANCHORS, BALL_HEAD_ROWS, BALL_HEAD_ROW_SIZE} from './ballHeadRanking.mjs';

const TILE_SIZE = 128;
export const BALL_HEAD_TILES = BALL_HEAD_ANCHORS / TILE_SIZE;
export const BALL_HEAD_TILE_BYTES = BALL_HEAD_ANCHORS * 8;
export const BALL_COMPACT_BYTES = BALL_HEAD_ROWS * BALL_HEAD_ROW_SIZE * 4;

export const BALL_COMPACT_PAIR_REVISION = 'BALL READBACK 03';

function ballHeadShader(paired) {
  const rowType = paired ? 'vec4<f32>' : 'f32';
  const rowWidth = paired ? BALL_HEAD_ROW_SIZE / 4 : BALL_HEAD_ROW_SIZE;
  return `
struct Anchor { score: f32, index: u32 }
const tileSize = ${TILE_SIZE}u;
const tiles = ${BALL_HEAD_TILES}u;
const rowSize = ${rowWidth}u;
const rowLimit = ${BALL_HEAD_ROWS}u;
@group(0) @binding(0) var<storage, read> head: array<${rowType}>;
@group(0) @binding(1) var<storage, read_write> sortedTiles: array<Anchor>;
@group(0) @binding(2) var<storage, read_write> compact: array<${rowType}>;
var<workgroup> tile: array<Anchor, ${TILE_SIZE}>;

fn precedes(a: Anchor, b: Anchor) -> bool {
  return a.score > b.score || (a.score == b.score && a.index < b.index);
}

${paired ? `
fn loadAnchor(index: u32) -> Anchor {
  let start = index * rowSize;
  var scores = vec4<f32>(0.0);
  for (var c = 1u; c < rowSize; c++) {
    scores = max(scores, head[start + c]);
  }
  return Anchor(max(max(scores.x, scores.y), max(scores.z, scores.w)), index);
}

// Each lane owns an exclusive pair at every stride. A single barrier between
// strides orders writes before the next stage reads the tile.
@compute @workgroup_size(${TILE_SIZE / 2})
fn sortTiles(@builtin(workgroup_id) group: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let base = group.x * tileSize;
  let otherLane = lane + tileSize / 2u;
  tile[lane] = loadAnchor(base + lane);
  tile[otherLane] = loadAnchor(base + otherLane);
  workgroupBarrier();

  for (var width = 2u; width <= tileSize; width *= 2u) {
    for (var stride = width / 2u; stride > 0u; stride /= 2u) {
      let lo = (lane / stride) * (stride * 2u) + lane % stride;
      let hi = lo + stride;
      let a = tile[lo];
      let b = tile[hi];
      let earlierFirst = (lo & width) == 0u;
      if (precedes(a, b) != earlierFirst) {
        tile[lo] = b;
        tile[hi] = a;
      }
      workgroupBarrier();
    }
  }
  sortedTiles[base + lane] = tile[lane];
  sortedTiles[base + otherLane] = tile[otherLane];
}
` : `
@compute @workgroup_size(${TILE_SIZE})
fn sortTiles(@builtin(global_invocation_id) global: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let start = global.x * rowSize;
  var score = 0.0;
  for (var c = 4u; c < rowSize; c++) {
    score = max(score, head[start + c]);
  }
  tile[lane] = Anchor(score, global.x);
  workgroupBarrier();

  // Sort each tile by descending score, breaking ties by original anchor index.
  for (var width = 2u; width <= tileSize; width *= 2u) {
    for (var stride = width / 2u; stride > 0u; stride /= 2u) {
      let own = tile[lane];
      let other = tile[lane ^ stride];
      let keepEarlier = ((lane & width) == 0u) == ((lane & stride) == 0u);
      var next = other;
      if (precedes(own, other) == keepEarlier) { next = own; }
      workgroupBarrier();
      tile[lane] = next;
      workgroupBarrier();
    }
  }
  sortedTiles[global.x] = tile[lane];
}
`}

@compute @workgroup_size(${TILE_SIZE})
fn copyTopRows(@builtin(global_invocation_id) global: vec3<u32>, @builtin(local_invocation_index) lane: u32) {
  let ownTile = global.x / tileSize;
  let entry = sortedTiles[global.x];
  var rank = lane;
  for (var group = 0u; group < tiles; group++) {
    if (group == ownTile) { continue; }
    let first = group * tileSize;
    if (!precedes(sortedTiles[first], entry)) { continue; }
    if (precedes(sortedTiles[first + tileSize - 1u], entry)) {
      rank += tileSize;
    } else {
      // Count the anchors in this tile that outrank the current entry.
      var low = 1u;
      var high = tileSize - 1u;
      while (low < high) {
        let mid = (low + high) / 2u;
        if (precedes(sortedTiles[first + mid], entry)) { low = mid + 1u; }
        else { high = mid; }
      }
      rank += low;
    }
    if (rank >= rowLimit) { return; }
  }
  for (var column = 0u; column < rowSize; column++) {
    compact[rank * rowSize + column] = head[entry.index * rowSize + column];
  }
}`;

}

export const BALL_HEAD_COMPACT_SHADER = ballHeadShader(false);
export const BALL_HEAD_PAIRED_COMPACT_SHADER = ballHeadShader(true);
