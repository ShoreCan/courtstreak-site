import {BALL_HEAD_ANCHORS, BALL_HEAD_ROWS, BALL_HEAD_ROW_SIZE} from './ballHeadRanking.mjs';

const TILE_SIZE = 128;
export const BALL_HEAD_TILES = BALL_HEAD_ANCHORS / TILE_SIZE;
export const BALL_HEAD_TILE_BYTES = BALL_HEAD_ANCHORS * 8;
export const BALL_COMPACT_BYTES = BALL_HEAD_ROWS * BALL_HEAD_ROW_SIZE * 4;

export const BALL_HEAD_COMPACT_SHADER = `
struct Anchor { score: f32, index: u32 }
const tileSize = ${TILE_SIZE}u;
const tiles = ${BALL_HEAD_TILES}u;
const rowSize = ${BALL_HEAD_ROW_SIZE}u;
const rowLimit = ${BALL_HEAD_ROWS}u;
@group(0) @binding(0) var<storage, read> head: array<f32>;
@group(0) @binding(1) var<storage, read_write> sortedTiles: array<Anchor>;
@group(0) @binding(2) var<storage, read_write> compact: array<f32>;
var<workgroup> tile: array<Anchor, ${TILE_SIZE}>;

fn precedes(a: Anchor, b: Anchor) -> bool {
  return a.score > b.score || (a.score == b.score && a.index < b.index);
}

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
