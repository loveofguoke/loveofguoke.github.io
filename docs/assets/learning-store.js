/* Shared browser-local learning state. Public seed content is kept separately. */
(() => {
  'use strict';
  const KEY = 'guoke-learning-v1';
  const normalize = value => {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw Error('请使用 HTTP 或 HTTPS 链接');
    url.hash = '';
    [...url.searchParams.keys()].filter(k => k.startsWith('utm_')).forEach(k => url.searchParams.delete(k));
    return url.href.replace(/\/$/, '');
  };
  let state;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = raw?.version === 1 ? raw : null;
  } catch { state = null; }
  if (!state) state = {version: 1, queue: [], topics: [], progress: {}, notes: {}, sessions: []};
  state.pages ||= [];
  let persistent = true;
  const uid = () => crypto.randomUUID();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; }
    catch { persistent = false; }
    window.dispatchEvent(new CustomEvent('learning-change'));
    return persistent;
  }
  const api = {
    get state() { return state; },
    get persistent() { return persistent; },
    normalize,
    uid,
    save,
    add({url, title, topic = '', reason = '', origin = '手动添加'}) {
      url = normalize(url);
      const found = state.queue.find(item => item.url === url);
      if (found) return {item: found, duplicate: true};
      const item = {id: uid(), url, title: String(title || new URL(url).hostname).slice(0, 300), topic,
        reason: String(reason).slice(0, 3000), origin, status: 'queued', createdAt: new Date().toISOString()};
      state.queue.unshift(item); save(); return {item, duplicate: false};
    },
    patch(id, patch) {
      const item = state.queue.find(entry => entry.id === id);
      if (!item) return;
      for (const key of ['status', 'topic', 'reason']) if (key in patch) item[key] = String(patch[key]);
      item.updatedAt = new Date().toISOString(); save();
    },
    mark(topic, chapter, checked) {
      state.progress[topic] ||= {};
      state.progress[topic][chapter] = checked;
      save();
    },
    note(topic, text) { state.notes[topic] = String(text); return save(); },
    writePage({id, title, body, topic='', references=''}) {
      let page=state.pages.find(p=>p.id===id);
      if(!page){page={id:`note-${uid()}`,createdAt:new Date().toISOString()};state.pages.unshift(page);}
      Object.assign(page,{title:String(title),body:String(body),topic:String(topic),references:String(references),updatedAt:new Date().toISOString()});save();return page;
    },
    session(topic, question, answer, evidence) {
      state.sessions.unshift({id: uid(), topic, question, answer, evidence, createdAt: new Date().toISOString()});save();
    },
    createTopic(title, goal) {
      const item = {id: `personal-${uid()}`, title, description: goal, category: '自主专题',
        chapters: [{id:'read',title:'阅读原始资料',body:['先明确问题，再带着问题读原文。']},
          {id:'understand',title:'整理自己的理解',body:['写出推导、关键证据和仍不确定的地方。']},
          {id:'verify',title:'回顾与验证',body:['尝试独立解释或运行一个最小实验，并记录结果。']}], resources: [], questions: [], sessions: []};
      state.topics.push(item);save();return item;
    },
    mergeAgent(raw, preferIncoming = false) {
      // Preserve a local recovery copy before any explicit incoming-version adoption.
      if (preferIncoming) localStorage.setItem(KEY + '-before-agent', JSON.stringify(state));
      const conflicts = [];
      for (const key of ['queue','topics','pages','sessions']) for (const item of raw[key] || []) {
        const old = (state[key] || []).find(x => x.id === item.id);
        if (old && JSON.stringify(old) !== JSON.stringify(item)) conflicts.push(`${key}/${item.id}`);
      }
      for (const key of ['notes','progress']) for (const [id,value] of Object.entries(raw[key] || {})) {
        if (Object.hasOwn(state[key],id) && JSON.stringify(state[key][id]) !== JSON.stringify(value)) conflicts.push(`${key}/${id}`);
      }
      const added = api.merge(raw);
      if (preferIncoming) {
        for (const key of ['queue','pages','sessions']) for (const item of raw[key] || []) {
          const at = state[key].findIndex(x => x.id === item.id);
          if (at >= 0) state[key][at] = JSON.parse(JSON.stringify(item));
          if (key === 'queue' && at >= 0) state[key][at].url = normalize(item.url);
        }
        for (const item of raw.topics || []) {
          const old = state.topics.find(x => x.id === item.id);
          if(old) Object.assign(old,{title:item.title,description:item.description,chapters:JSON.parse(JSON.stringify(item.chapters))});
        }
        for (const [id,value] of Object.entries(raw.notes || {})) if (/^[a-z0-9-]+$/.test(id) && !['constructor','prototype'].includes(id) && typeof value === 'string') state.notes[id] = value;
        for (const [id,value] of Object.entries(raw.progress || {})) if (/^[a-z0-9-]+$/.test(id) && !['constructor','prototype'].includes(id) && value && typeof value === 'object') {
          state.progress[id] ||= {};
          for(const [chapter,checked] of Object.entries(value)) if (/^[a-z0-9-]+$/.test(chapter) && !['constructor','prototype'].includes(chapter) && typeof checked === 'boolean') state.progress[id][chapter]=checked;
        }
        save();
      }
      return {added, conflicts, adopted: preferIncoming};
    },
    merge(raw) {
      if (!raw || raw.version !== 1 || !Array.isArray(raw.queue) || !Array.isArray(raw.topics) || !Array.isArray(raw.sessions)) throw Error('这不是有效的学习备份');
      if (raw.queue.length > 3000 || raw.topics.length > 500 || raw.sessions.length > 5000) throw Error('备份内容过大');
      const incoming = JSON.parse(JSON.stringify(raw));
      for (const item of incoming.queue) {
        if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.createdAt !== 'string' || typeof item.origin !== 'string' || typeof item.topic !== 'string' || typeof item.reason !== 'string' || !['queued','reading','done','archived'].includes(item.status)) throw Error('队列字段无效');
        item.url = normalize(item.url);
      }
      for (const item of incoming.topics) {
        if (typeof item.id !== 'string' || !/^personal-[a-z0-9-]+$/.test(item.id) || typeof item.title !== 'string' || typeof item.description !== 'string' || !Array.isArray(item.chapters) || !item.chapters.length) throw Error('专题字段无效');
        for (const chapter of item.chapters) if (typeof chapter.id !== 'string' || typeof chapter.title !== 'string' || !Array.isArray(chapter.body) || !chapter.body.every(x=>typeof x==='string')) throw Error('章节字段无效');
        item.resources = []; item.questions = []; item.sessions = [];
      }
      for (const item of incoming.sessions) if (typeof item.id !== 'string' || typeof item.topic !== 'string' || typeof item.question !== 'string' || typeof item.answer !== 'string') throw Error('会话字段无效');
      for (const item of incoming.pages || []) if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.body !== 'string' || typeof item.createdAt !== 'string' || typeof item.topic !== 'string' || typeof item.references !== 'string') throw Error('笔记字段无效');
      let added = 0;
      for (const item of incoming.queue) if (!state.queue.some(old => old.url === item.url)) {state.queue.push(item);added++;}
      for (const key of ['topics','sessions','pages']) for (const item of incoming[key]||[]) if (!state[key].some(old=>old.id===item.id)) {state[key].push(item);added++;}
      for (const [id, value] of Object.entries(incoming.notes || {})) if (/^[a-z0-9-]+$/.test(id) && !['constructor','prototype'].includes(id) && typeof value === 'string' && !(id in state.notes)) state.notes[id] = value;
      for (const [id, value] of Object.entries(incoming.progress || {})) {
        if (!/^[a-z0-9-]+$/.test(id) || ['constructor','prototype'].includes(id) || !value || typeof value !== 'object') continue;
        state.progress[id] ||= {};
        for (const [chapter, checked] of Object.entries(value)) if (/^[a-z0-9-]+$/.test(chapter) && !['constructor','prototype'].includes(chapter) && typeof checked === 'boolean' && !(chapter in state.progress[id])) state.progress[id][chapter] = checked;
      }
      save();return added;
    }
  };
  window.LearningStore = api;
  window.addEventListener('storage', event => {
    if (event.key !== KEY || !event.newValue) return;
    try { const next = JSON.parse(event.newValue); if (next.version===1) {state=next;window.dispatchEvent(new CustomEvent('learning-change'));} } catch { /* Keep current state. */ }
  });
})();
