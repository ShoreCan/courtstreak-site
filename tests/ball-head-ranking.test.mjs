import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBallHead} from '../src/lib/ai/ballHeadRanking.mjs';

const set = (data, i, c, score) => { data[i * 84 + 4 + c] = score; };
const boxes = n => {
 const data = new Float32Array(n * 84);
 for (let i = 0; i < n; i++) data.set([i, 10, i + 5, 15], i * 84);
 return data;
};
const sportRows = output => Array.from({length: output.dims[1]}, (_, i) => output.data.slice(i * 6, i * 6 + 6))
 .filter(row => row[5] === 32);

test('the new readback preserves second-stage class ranking, including a ball that is not the top class', () => {
 const data = boxes(3);
 set(data, 0, 4, .9);
 set(data, 0, 32, .5);
 set(data, 1, 32, .5);
 set(data, 2, 32, .01);
 assert.deepEqual(sportRows(rankBallHead(data, .1, 3)).map(r => [r[0], r[4]]), [[0, .5], [1, .5]]);
});

test('both top-300 limits still apply before the sports-ball filter', () => {
 const data = boxes(301);
 for (let i = 0; i < 300; i++) set(data, i, 0, .9);
 set(data, 0, 32, .8);
 set(data, 300, 32, .85);
 assert.deepEqual(sportRows(rankBallHead(data, .1, 301)), []);
 set(data, 299, 0, .7);
 assert.deepEqual(sportRows(rankBallHead(data, .1, 301)).map(r => r[0]), [300]);
 set(data, 300, 32, .9);
 set(data, 299, 0, .9);
 assert.deepEqual(sportRows(rankBallHead(data, .1, 301)), []);
});
