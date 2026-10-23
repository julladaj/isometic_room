import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OBJECTS } from '../src/content.js';
const file=fs.readFileSync(new URL('../public/models/studio.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12);
const gltf=JSON.parse(file.subarray(20,20+jsonLength));
const binStart=20+jsonLength+8;
const bin=file.subarray(binStart);

test('the shipped room is an embedded, compressed GLB with every interactive group', () => {
  assert.equal(file.toString('ascii',0,4),'glTF');
  assert.equal(file.readUInt32LE(4),2);
  assert.equal(file.readUInt32LE(8),file.length);
  assert.ok(file.length<8*1024*1024,'room should stay under 8 MB');
  assert.ok(gltf.extensionsRequired.includes('EXT_meshopt_compression'));
  assert.ok(gltf.buffers.every(buffer=>!buffer.uri));
  assert.ok(gltf.images.every(image=>Number.isInteger(image.bufferView)));
  const ids=gltf.nodes.map(node=>node.extras?.interaction).filter(Boolean);
  for(const id of Object.keys(OBJECTS))assert.ok(ids.includes(id),`missing interaction ${id}`);
  assert.ok(gltf.meshes.length<100,'static geometry should remain batched');
});
test('door and chair pivots preserve the source scene contact and animation axes', () => {
  const chair=gltf.nodes.find(node=>node.extras?.interaction==='chair');
  const door=gltf.nodes.find(node=>node.extras?.interaction==='door');
  assert.ok(Math.abs(chair.translation[1]-.06)<.00001);
  assert.ok(Math.abs(door.translation[0]+1.894)<.00001);
  assert.ok(Math.abs(door.translation[2]-1.72)<.00001);
  assert.ok(gltf.nodes.some(node=>node.name.startsWith('wall_door_header')));
  assert.ok(!gltf.nodes.some(node=>node.name==='Left wall'));
});
test('every meshopt buffer can actually be decoded by the browser decoder', async () => {
  await MeshoptDecoder.ready;
  let decoded=0;
  for(const view of gltf.bufferViews){
    const ext=view.extensions?.EXT_meshopt_compression;if(!ext)continue;
    const target=new Uint8Array(ext.count*ext.byteStride);
    const source=bin.subarray(ext.byteOffset||0,(ext.byteOffset||0)+ext.byteLength);
    MeshoptDecoder.decodeGltfBuffer(target,ext.count,ext.byteStride,source,ext.mode,ext.filter);
    assert.equal(target.length,view.byteLength);decoded++;
  }
  assert.ok(decoded>10);
});
