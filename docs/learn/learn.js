document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const $=id=>document.getElementById(id), {node,link,toast,download}=UI, store=LearningStore;
  const statusNames={queued:'待学习',reading:'进行中',done:'已完成',archived:'已归档'};
  let seed;
  try {const r=await fetch('topics.json');if(!r.ok)throw Error(r.status);seed=await r.json();}
  catch {document.querySelector('main').append(node('p','empty','专题加载失败，请刷新重试。'));return;}
  const allTopics=()=>[...seed.topics,...store.state.topics];
  const options=(select,selected='')=>{select.replaceChildren();for(const item of [{id:'',title:'暂不归类'},...allTopics()]){const opt=node('option','',item.title);opt.value=item.id;select.append(opt);}select.value=selected;};
  const safeExternal=(url,text,cls)=>{const a=link(store.normalize(url),text,cls);a.target='_blank';a.rel='noopener noreferrer';return a;};
  if($('topics-grid')){
    const render=()=>{$('topics-grid').replaceChildren(...allTopics().map(t=>{const c=node('article','card');c.append(node('span','eyebrow',t.category),node('h3','',t.title),node('p','',t.description));const p=node('div','topic-progress'),done=t.chapters.filter(ch=>store.state.progress[t.id]?.[ch.id]).length;const bar=node('progress');bar.max=t.chapters.length;bar.value=done;p.append(bar,node('span','',`${done}/${t.chapters.length} 已回顾`));c.append(p,link(`topic.html?id=${encodeURIComponent(t.id)}`,'继续学习 →','card-foot'));return c;}));};
    render();window.addEventListener('learning-change',render);
    $('new-topic').onclick=()=>$('topic-dialog').showModal();$('topic-dialog').querySelector('[data-close]').onclick=()=>$('topic-dialog').close();
    $('topic-form').onsubmit=e=>{e.preventDefault();if(!$('topic-title').value.trim()||!$('topic-goal').value.trim())return;const t=store.createTopic($('topic-title').value.trim(),$('topic-goal').value.trim());location.href=`topic.html?id=${encodeURIComponent(t.id)}`;};
  }
  if($('queue-list')){
    let filter='queued';options($('resource-topic'));
    const params=new URLSearchParams(location.search);if(params.get('topic'))$('resource-topic').value=params.get('topic');
    if(params.has('url')){try{$('resource-url').value=store.normalize(params.get('url'));$('resource-title').value=params.get('title')||'';$('add-resource').open=true;}catch{toast('传入的资料链接无效');}}
    if(params.get('topic'))$('add-resource').open=true;
    function render(){
      const items=store.state.queue.filter(x=>filter==='all'||x.status===filter);$('queue-summary').textContent=`${items.length} 份资料 · ${filter==='all'?'全部状态':statusNames[filter]}`;
      $('queue-list').replaceChildren(...items.map(item=>{const row=node('article','queue-item'),body=node('div'),controls=node('div');const h=node('h3');h.append(safeExternal(item.url,item.title+' ↗'));body.append(node('div','meta',`${item.origin} · ${item.createdAt.slice(0,10)}`),h,node('p','reason',item.reason||'还没写下想读的理由。'));
        const topicSelect=node('select');topicSelect.setAttribute('aria-label',`资料专题：${item.title}`);options(topicSelect,item.topic);topicSelect.onchange=()=>store.patch(item.id,{topic:topicSelect.value});
        const status=node('select');status.setAttribute('aria-label',`学习状态：${item.title}`);Object.entries(statusNames).forEach(([key,label])=>{const o=node('option','',label);o.value=key;status.append(o);});status.value=item.status;status.onchange=()=>store.patch(item.id,{status:status.value});controls.append(topicSelect,status);
        const edit=node('button','small','补充想读的理由');edit.onclick=()=>{const value=prompt('为什么想读这份资料？',item.reason);if(value!==null)store.patch(item.id,{reason:value});};controls.append(edit);
        controls.append(link(`journal.html?write=1&title=${encodeURIComponent(item.title)}&topic=${encodeURIComponent(item.topic)}&url=${encodeURIComponent(item.url)}&queue=${encodeURIComponent(item.id)}`,'整理成独立笔记 →','backlink'));
        if(item.topic)controls.append(link(`topic.html?id=${encodeURIComponent(item.topic)}`,'进入专题 →','backlink'));
        else {const create=node('button','small','从这份资料建立专题');create.onclick=()=>{const t=store.createTopic(item.title,item.reason||'围绕这份资料提出问题并整理理解。');store.patch(item.id,{topic:t.id,status:'reading'});location.href=`topic.html?id=${encodeURIComponent(t.id)}`;};controls.append(create);}
        row.append(body,controls);return row;}));
      if(!items.length){const empty=node('div','empty');empty.append(node('h3','','留一点空间，给下一个好问题。'),node('p','','从每日发现加入文章，或在上面粘贴一份资料。'),link('../atlas/','去探索 →','button'));$('queue-list').append(empty);}
      document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===filter)));
    }
    document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{filter=b.dataset.status;render();});
    $('queue-form').onsubmit=e=>{e.preventDefault();try{const result=store.add({url:$('resource-url').value,title:$('resource-title').value,topic:$('resource-topic').value,reason:$('resource-reason').value,origin:'直接链接'});toast(result.duplicate?'已在队列里，无需重复添加':store.persistent?'已加入学习队列':'已加入；浏览器存储不可用，请导出备份');filter=result.item.status;render();$('queue-form').reset();history.replaceState(null,'',location.pathname);}catch(error){toast(error.message);}};
    $('export-state').onclick=()=>download(`guoke-learning-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(store.state,null,2),'application/json');
    $('import-state').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>5_000_000)throw Error('请选择小于 5 MB 的备份');const added=store.merge(JSON.parse(await file.text()));toast(`已合并 ${added} 个新条目，本机已有笔记保留`);options($('resource-topic'));render();}catch(error){toast(error.message);}$('import-file').value='';};
    render();window.addEventListener('learning-change',render);
  }
  if($('study-map')){
    const id=new URLSearchParams(location.search).get('id')||'moonep', t=allTopics().find(x=>x.id===id);
    if(!t){$('topic-heading').textContent='没有找到这个专题';$('topic-description').textContent='个人专题保存在创建它的浏览器中。可以在队列页面导入之前的备份。';return;}
    document.title=`${t.title} · 果壳的宇宙`;$('topic-heading').textContent=t.title;$('topic-description').textContent=t.description;$('add-topic-resource').href=`queue.html?topic=${encodeURIComponent(id)}`;
    let selected=t.chapters.find(c=>!store.state.progress[id]?.[c.id])?.id||t.chapters[0].id;
    function diagram(){
      const box=node('div','diagram');box.append(node('h3','','一次地址规划的可视化'));const controls=node('div','controls'),select=node('select');select.setAttribute('aria-label','通信阶段');for(const [value,label] of [['source','1. token-major 输入'],['planned','2. 确定目标位置'],['written','3. 远端专家分组视图']]){const o=node('option','',label);o.value=value;select.append(o);}controls.append(select);const buffers=node('div','buffers');box.append(controls,buffers);
      const draw=()=>{buffers.replaceChildren();for(const [name,tokens] of [['Rank 0 · 本地 HBM',['t0 → E1','t1 → E0']],['Rank 1 · 目标 HBM',select.value==='written'?['E0: t1','E1: t0']:['E0: slot 0','E1: slot 1']]]){const b=node('div','buffer');b.append(node('span','',name));tokens.forEach(text=>{const row=node('div','token-row');row.append(node('span',`token ${name.startsWith('Rank 1')?'blue':''} ${select.value==='source'&&name.startsWith('Rank 1')?'off':''}`,text));b.append(row);});if(buffers.children.length)buffers.append(node('span','arrow',select.value==='source'?'…':'→'));buffers.append(b);}};select.onchange=draw;draw();box.append(node('p','','概念示意：展示 token → 目标专家槽位的映射；省略其他 token、top-k 副本与完整 planner。不是实际容量或性能仿真。'));return box;
    }
    function renderChapter(){
      const ch=t.chapters.find(c=>c.id===selected),index=t.chapters.indexOf(ch);$('chapter').replaceChildren(node('div','article-label',`${String(index+1).padStart(2,'0')} / ${String(t.chapters.length).padStart(2,'0')} · 工作笔记`),node('h2','',ch.title));
      ch.body.forEach(p=>$('chapter').append(node('p','',p)));if(ch.visual==='dispatch')$('chapter').append(diagram());
      const check=node('label','review-check'),input=node('input');input.type='checkbox';input.checked=!!store.state.progress[id]?.[ch.id];input.onchange=()=>{store.mark(id,ch.id,input.checked);renderMap();};check.append(input,node('span','','我已回顾这一节，能够用自己的话解释核心问题。'));$('chapter').append(check);
      const steps=node('div','chapter-next');if(index>0){const prev=node('button','','← 上一节');prev.onclick=()=>{selected=t.chapters[index-1].id;render();};steps.append(prev);}if(index<t.chapters.length-1){const next=node('button','','下一节 →');next.onclick=()=>{selected=t.chapters[index+1].id;render();};steps.append(next);}$('chapter').append(steps);
    }
    function renderMap(){const map=$('study-map');map.replaceChildren(node('span','eyebrow','LEARNING MAP'));t.chapters.forEach((ch,i)=>{const b=node('button','chapter-button',`${store.state.progress[id]?.[ch.id]?'✓':String(i+1).padStart(2,'0')}  ${ch.title}`);b.setAttribute('aria-current',String(ch.id===selected));b.onclick=()=>{selected=ch.id;render();};map.append(b);});const p=node('div','map-progress'),done=t.chapters.filter(c=>store.state.progress[id]?.[c.id]).length;const bar=node('progress');bar.max=t.chapters.length;bar.value=done;p.append(bar,node('p','',`${done}/${t.chapters.length} 已回顾 · 我的进度`));map.append(p);}
    function resources(){const aside=$('study-resources');aside.replaceChildren(node('span','eyebrow','LINKED MATERIALS'));for(const resource of t.resources){const a=safeExternal(resource.url,resource.title+' ↗','resource');a.append(node('small','',resource.kind),node('small','',resource.note));aside.append(a);}const queued=store.state.queue.filter(x=>x.topic===id);if(queued.length)aside.append(node('h3','','从队列关联'));queued.forEach(x=>aside.append(safeExternal(x.url,x.title+' ↗','resource')));aside.append(node('h3','','下一次追问'));const ul=node('ul','questions');t.questions.forEach(q=>ul.append(node('li','',q)));aside.append(ul,link('concepts.html?concept=kv-cache','概念讨论台 ↗','resource'));}
    function sessions(){const list=$('session-list');list.replaceChildren();for(const s of [...store.state.sessions.filter(x=>x.topic===id),...t.sessions]){const entry=node('details','session'),summary=node('summary','',s.title||s.question);entry.append(node('time','',s.date||s.createdAt?.slice(0,10)||''),summary,node('small','',s.kind||'个人学习记录'),node('div','role','QUESTION'),node('p','',s.question),node('div','role','REFLECTION'),node('p','',s.answer));if(s.evidence)entry.append(node('div','role','EVIDENCE / NEXT'),node('p','',s.evidence));list.append(entry);}if(!list.children.length)list.append(node('p','muted','第一条学习记录，从你的第一个问题开始。'));}
    function render(){renderMap();renderChapter();resources();sessions();}render();
    $('personal-note').value=store.state.notes[id]||'';$('personal-note').oninput=()=>{$('save-status').textContent=store.note(id,$('personal-note').value)?'已保存到本机 · 可导出 Markdown 或 JSON 备份':'当前无法写入浏览器存储，请立即导出备份。';};
    for(const tab of ['note','sessions'])$(`tab-${tab}`).onclick=()=>{for(const key of ['note','sessions']){$(`tab-${key}`).setAttribute('aria-selected',String(key===tab));$(`${key}-panel`).hidden=key!==tab;}};
    $('session-form').onsubmit=e=>{e.preventDefault();store.session(id,$('session-question').value,$('session-answer').value,$('session-evidence').value);$('session-form').reset();sessions();toast('学习过程已保存在本机');};
    const context=()=>`继续学习专题：${t.title}\n目标：${t.description}\n当前章节：${t.chapters.find(c=>c.id===selected).title}\n我的笔记：\n${$('personal-note').value||'暂无'}\n关联资料：\n${[...t.resources,...store.state.queue.filter(x=>x.topic===id)].map(r=>`${r.title}: ${r.url}`).join('\n')}\n请从我的疑问出发，逐步解释，并把结论与证据区分清楚。`;
    $('copy-context').onclick=async()=>{try{await navigator.clipboard.writeText(context());toast('已复制，可粘贴到 AI 对话继续学习');}catch{toast('剪贴板不可用，请使用 Markdown 导出');}};
    $('export-note').onclick=()=>{const content=`# ${t.title}\n\n${t.description}\n\n## 学习路线\n\n${t.chapters.map(c=>`- [${store.state.progress[id]?.[c.id]?'x':' '}] ${c.title}`).join('\n')}\n\n## 我的理解\n\n${$('personal-note').value}\n\n## 工作笔记\n\n${t.chapters.map(c=>`### ${c.title}\n\n${c.body.join('\n\n')}`).join('\n\n')}\n\n## 资料\n\n${[...t.resources,...store.state.queue.filter(x=>x.topic===id)].map(r=>`- ${r.title}: ${r.url}`).join('\n')}\n\n## 学习过程\n\n${[...t.sessions,...store.state.sessions.filter(x=>x.topic===id)].map(s=>`### ${s.title||s.question}\n\n问题：${s.question}\n\n理解：${s.answer}\n\n${s.evidence||''}`).join('\n\n')}`;download(`${id}-notes.md`,content,'text/markdown');};
  }
});
