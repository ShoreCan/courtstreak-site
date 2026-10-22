import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeOutput} from '../src/lib/ai/iphoneDetector.mjs';
const identity={scale:1,px:0,py:0,x:0,y:0};
const compact=(rows,transform=identity)=>decodeOutput({data:Float32Array.from(rows.flat()),dims:[1,rows.length,6]},'ball',transform);
for(const score of [NaN,Infinity,-Infinity])test(`nonfinite compact ball confidence ${score} is rejected`,()=>assert.deepEqual(compact([[10,20,50,60,score,32]]),[]));
for(const row of [[10,20,50,60,.001,32],[10,20,50,60,.9,0],[10,20,10,60,.9,32],[50,20,10,60,.9,32],[10,NaN,50,60,.9,32],[10,20,Infinity,60,.9,32]])test(`invalid or non-ball compact result ${row} cannot become a ball`,()=>assert.deepEqual(compact([row]),[]));
test('model box coordinates map back into the actual camera crop',()=>{
 const [b]=compact([[40,50,80,90,.9,32]],{scale:2,px:10,py:20,x:100,y:200});assert.deepEqual(b.box,[115,215,135,235]);
});
test('overlapping duplicate model proposals are suppressed',()=>assert.equal(compact([[10,20,50,60,.9,32],[11,21,51,61,.8,32]]).length,1));
test('two separate balls remain separate proposals rather than being merged',()=>assert.equal(compact([[10,20,50,60,.9,32],[110,120,150,160,.8,32]]).length,2));
function raw({score=.9,other=.1,box=[30,40,40,40]}={}){
 const data=new Float32Array(84);data.set(box);data[36]=score;data[4]=other;return decodeOutput({data,dims:[1,84,1]},'ball',identity);
}
test('raw detector ball class maps to the same camera box',()=>assert.deepEqual(raw()[0].box,[10,20,50,60]));
test('a stronger non-ball class cannot be relabeled as a basketball',()=>assert.deepEqual(raw({score:.4,other:.9}),[]));
for(const score of [NaN,Infinity,-Infinity,.001])test(`raw ball confidence ${score} is rejected`,()=>assert.deepEqual(raw({score}),[]));
