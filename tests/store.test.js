import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, sanitize, remainingSeconds, toggleTimer, DURATIONS, STORAGE_KEY } from '../src/state/store.js';

function memoryStorage(value) {
  const values = new Map(value === undefined ? [] : [[STORAGE_KEY,value]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
}
test('corrupt or incompatible saved data cannot break the room', () => {
  const store = createStore(memoryStorage('{ broken'));
  assert.equal(store.get().theme,'day');
  const state = sanitize({ theme:'unexpected', lampOn:'false', notes:'x'.repeat(6000), rug:'red', readBooks:['three','three','unknown'], timer:{mode:'other'} });
  assert.equal(state.lampOn,true);
  assert.equal(state.notes.length,5000);
  assert.equal(state.rug,'lavender');
  assert.deepEqual(state.readBooks,['three']);
  assert.equal(state.timer.remaining,1500);
});
test('notes and settings survive opening the room again', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.set({notes:'ไอเดียใหม่ <script>plain text</script>',theme:'night',doorOpen:true,rug:'ocean'});
  const restored = createStore(storage).get();
  assert.equal(restored.notes,'ไอเดียใหม่ <script>plain text</script>');
  assert.equal(restored.theme,'night');
  assert.equal(restored.doorOpen,true);
  assert.equal(restored.rug,'ocean');
});
test('blocked storage still allows all changes during the session', () => {
  const store = createStore({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
  let changed = 0;
  store.subscribe(() => changed++);
  assert.doesNotThrow(() => store.set({lampOn:false,notes:'still works'}));
  assert.equal(store.persistent,false);
  assert.equal(store.get().notes,'still works');
  assert.equal(changed,1);
});
test('focus timer accounts for time spent in a background tab', () => {
  const start=1000000;
  const running=toggleTimer({mode:'focus',remaining:1500,deadline:null},start);
  assert.equal(remainingSeconds(running,start+120500),1380);
  assert.equal(remainingSeconds(running,start+1500001),0);
  const paused=toggleTimer(running,start+60000);
  assert.equal(paused.deadline,null);
  assert.equal(paused.remaining,1440);
  assert.equal(remainingSeconds(paused,start+600000),1440);
  const resumed=toggleTimer(paused,start+600000);
  assert.equal(remainingSeconds(resumed,start+601000),1439);
});
test('completed sessions can restart and break durations are independent', () => {
  const restarted=toggleTimer({mode:'focus',remaining:0,deadline:null},10000);
  assert.equal(remainingSeconds(restarted,10000),DURATIONS.focus);
  const breakTime=toggleTimer({mode:'break',remaining:300,deadline:null},10000);
  assert.equal(remainingSeconds(breakTime,10000),300);
  assert.equal(sanitize({timer:{mode:'break',remaining:99999,deadline:null}}).timer.remaining,300);
});
