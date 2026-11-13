const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const script = readFileSync('docs/assets/learning-store.js', 'utf8');
function create(persisted = null) {
  const values = new Map(persisted ? [['guoke-learning-v1', JSON.stringify(persisted)]] : []);
  const window = {dispatchEvent() {}, addEventListener() {}};
  const context = {window, URL, crypto: webcrypto, CustomEvent: class {},
    localStorage: {getItem: key => values.get(key), setItem: (key,value) => values.set(key,value)}};
  vm.runInNewContext(script, context);
  return {store: window.LearningStore, values};
}
test('queue deduplicates tracking variants without losing the reason or topic', () => {
  const {store} = create();
  const first = store.add({url:'https://example.com/read?utm_source=feed',title:'Read',topic:'moonep',reason:'Understand buffers'});
  const duplicate = store.add({url:'https://example.com/read#section',title:'Again'});
  assert.equal(duplicate.duplicate,true);
  assert.equal(first.item.id,duplicate.item.id);
  assert.equal(store.state.queue.length,1);
  assert.equal(store.state.queue[0].reason,'Understand buffers');
});
test('reload and export/import retain topic progress, notes and sessions', () => {
  const {store} = create();
  const topic = store.createTopic('Cache','Memory');
  store.mark(topic.id,'read',true);
  store.note(topic.id,'My own derivation');
  store.session(topic.id,'Why cache?','Avoid repeated projection','https://example.com');
  const backup = JSON.parse(JSON.stringify(store.state));
  const reloaded = create(backup).store;
  assert.equal(reloaded.state.notes[topic.id],'My own derivation');
  const second = create().store;
  second.merge(backup);
  assert.equal(second.state.progress[topic.id].read,true);
  assert.equal(second.state.sessions.length,1);
  second.note(topic.id,'Newer local work');
  second.merge(backup);
  assert.equal(second.state.notes[topic.id],'Newer local work');
  assert.equal(second.state.sessions.length,1);
});
test('invalid imports are rejected before adding any rows', () => {
  const {store} = create();
  const backup = {version:1,queue:[{id:'1',title:'bad',url:'javascript:alert(1)',status:'queued',topic:'',reason:'',origin:'import',createdAt:'2026-10-28'}],topics:[],sessions:[]};
  assert.throws(()=>store.merge(backup));
  assert.equal(store.state.queue.length,0);
});
test('prototype-like keys cannot enter imported progress or notes', () => {
  const {store} = create();
  store.merge(JSON.parse('{"version":1,"queue":[],"topics":[],"sessions":[],"notes":{"__proto__":"x"},"progress":{"__proto__":{"polluted":true}}}'));
  assert.equal(Object.prototype.hasOwnProperty.call(store.state.notes,'__proto__'),false);
  assert.equal({}.polluted,undefined);
});

test('agent roundtrip retains pages and explicitly adopts changed progress with a backup', () => {
  const {store,values}=create();
  const topic=store.createTopic('Cache','Learn');
  store.mark(topic.id,'read',false);
  const page=store.writePage({title:'First',body:'Local',topic:topic.id,references:''});
  const incoming=JSON.parse(JSON.stringify(store.state));
  incoming.pages[0].body='From agent';incoming.progress[topic.id].read=true;
  const report=store.mergeAgent(incoming);
  assert.equal(report.conflicts.length,2);
  assert.equal(store.state.pages[0].body,'Local');
  assert.equal(store.state.progress[topic.id].read,false);
  store.mergeAgent(incoming,true);
  assert.equal(store.state.pages[0].body,'From agent');
  assert.equal(store.state.progress[topic.id].read,true);
  const before=JSON.parse(values.get('guoke-learning-v1-before-agent'));
  assert.equal(before.pages[0].body,'Local');
  assert.equal(before.progress[topic.id].read,false);
  store.mergeAgent(incoming,true);
  assert.equal(store.state.pages.length,1);
});

test('agent import cannot mutate constructor properties', () => {
  const {store}=create();
  store.mergeAgent(JSON.parse('{"version":1,"queue":[],"topics":[],"pages":[],"sessions":[],"notes":{},"progress":{"constructor":{"polluted":true}}}'),true);
  assert.equal({}.polluted,undefined);
  assert.equal(Object.hasOwn(store.state.progress,'constructor'),false);
});
