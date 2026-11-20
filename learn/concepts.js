document.addEventListener('DOMContentLoaded',async()=>{
  'use strict';
  const $=id=>document.getElementById(id), {node,link,toast,download}=UI, store=LearningStore;
  let data;try{const r=await fetch('concepts.json');if(!r.ok)throw Error(r.status);data=await r.json();}catch{$('concept-title').textContent='加载失败，请刷新重试';return;}
  const c=data.concepts.find(x=>x.id===new URLSearchParams(location.search).get('concept'))||data.concepts[0];
  const key=`concept-${c.id}`, saved=store.state.notes[key], selected=new Set();let axis='all';
  $('concept-title').textContent=c.title;$('concept-subtitle').textContent=c.subtitle;$('concept-reviewed').textContent=`资料复核 ${data.reviewed_at}`;
  let savedDesk={};try{savedDesk=JSON.parse(saved||'{}');}catch{savedDesk={notes:saved||''};}
  $('desk-question').value=savedDesk.question||'';$('desk-notes').value=savedDesk.notes||'';(savedDesk.selected||[]).filter(id=>c.resources.some(r=>r.id===id)).forEach(id=>selected.add(id));
  const ext=(url,text,cls)=>{const a=link(store.normalize(url),text,cls);a.target='_blank';a.rel='noopener noreferrer';return a;};
  const picked=()=>c.resources.filter(r=>selected.has(r.id));
  const createTopic=node('button','','建立专题继续学习 →');createTopic.id='start-concept-topic';$('queue-discussion').parentElement.append(createTopic);
  const reader=node('dialog','paper-reader'),close=node('button','dialog-close','关闭阅读'),original=node('a','backlink','在原站打开 PDF ↗'),frame=node('iframe');frame.title='论文 PDF 阅读器';frame.referrerPolicy='no-referrer';original.target='_blank';original.rel='noopener noreferrer';reader.append(close,original,frame);document.body.append(reader);close.onclick=()=>{reader.close();frame.removeAttribute('src');};reader.addEventListener('close',()=>frame.removeAttribute('src'));
  function save(){const ok=store.note(key,JSON.stringify({question:$('desk-question').value,notes:$('desk-notes').value,selected:[...selected]}));$('desk-save-status').textContent=ok?'已保存到本机 · 随完整学习备份导出':'存储不可用，请立即导出笔记。';}
  function choose(id){selected.has(id)?selected.delete(id):selected.add(id);save();render();}
  function map(resources){
    const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 600 350');
    const make=(name,attrs)=>{const e=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e;};
    const positions=resources.map((r,i)=>{const angle=(i/resources.length)*Math.PI*2-Math.PI/2;return {r,x:300+Math.cos(angle)*218,y:175+Math.sin(angle)*128};});
    positions.forEach(({x,y})=>svg.append(make('line',{x1:300,y1:175,x2:x,y2:y})));
    const center=make('g',{class:'center'});center.append(make('circle',{cx:300,cy:175,r:49}));const ct=make('text',{x:300,y:180,'text-anchor':'middle'});ct.textContent=c.title;center.append(ct);svg.append(center);
    positions.forEach(({r,x,y})=>{const g=make('g',{role:'button',tabindex:0,'aria-label':`选择资料 ${r.title}`,'aria-pressed':selected.has(r.id)});g.append(make('circle',{cx:x,cy:y,r:34}));const text=make('text',{x,y:y+4,'text-anchor':'middle'});text.textContent=({paged:'分页',kivi:'量化',mqa:'MQA',mla:'MLA',h2o:'驱逐',vllm:'vLLM','hf-cache':'教程'})[r.id]||r.kind;g.append(text);g.onclick=()=>choose(r.id);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.id);}};svg.append(g);});$('relation-map').replaceChildren(svg);
  }
  function render(){
    const q=$('concept-search').value.trim().toLowerCase();
    const resources=c.resources.filter(r=>(axis==='all'||r.axes.includes(axis))&&(!q||[c.title,c.subtitle,r.title,r.note,r.kind,r.relation].join(' ').toLowerCase().includes(q)));
    map(resources);$('resource-results').replaceChildren(...resources.map(r=>{const card=node('article','evidence-card'),top=node('div','evidence-top'),title=node('h3');title.append(ext(r.url,r.title+' ↗'));const button=node('button','',selected.has(r.id)?'✓ 已选':'＋ 放到讨论台');button.setAttribute('aria-pressed',String(selected.has(r.id)));button.onclick=()=>choose(r.id);top.append(title,button);card.append(node('div','meta',`${r.kind} / ${r.date_label} / ${r.status}`),top,node('p','',r.relation),node('p','',r.note));if(r.url.startsWith('https://arxiv.org/abs/')){const pdf=node('button','','在台内打开论文 PDF');pdf.onclick=()=>{const url=r.url.replace('/abs/','/pdf/');frame.src=url;original.href=url;reader.showModal();};card.append(pdf);}return card;}));
    if(!resources.length)$('resource-results').append(node('p','empty','没有匹配资料。试试别的关键词或优化方向。'));
    $('selected-count').textContent=selected.size;$('selected-resources').replaceChildren(...picked().map(r=>{const row=node('div','selected-resource'),remove=node('button','','×');remove.setAttribute('aria-label',`移出讨论 ${r.title}`);remove.onclick=()=>choose(r.id);row.append(remove,node('span','',r.title));return row;}));
    if(!selected.size)$('selected-resources').append(node('p','small','点选图上的节点，或把下面的资料放到讨论台。'));
    $('copy-discussion').disabled=!selected.size;$('queue-discussion').disabled=!selected.size;createTopic.disabled=!selected.size;
    document.querySelectorAll('[data-axis]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.axis===axis)));
  }
  c.axes.forEach(a=>{const b=node('button','',a.title);b.dataset.axis=a.id;b.onclick=()=>{axis=a.id;render();};$('concept-axes').append(b);});
  c.foundations.forEach(p=>$('foundations').append(node('p','',p)));
  c.resources.filter(r=>r.year).sort((a,b)=>a.date_label.localeCompare(b.date_label)).forEach(r=>{const item=node('article'),h=node('h3');h.append(ext(r.url,r.title));item.append(node('time','',r.date_label),h,node('p','',r.relation));$('timeline').append(item);});
  c.combinations.forEach(item=>{const tr=node('tr');['scenario','combination','metric','condition'].forEach(k=>tr.append(node('td','',item[k])));$('combination-table').append(tr);});
  const context=()=>`学习概念：${c.title}（资料复核 ${data.reviewed_at}）\n我的问题：${$('desk-question').value||'比较这些方法解决的层次、假设与代价。'}\n\n选中资料：\n${picked().map(r=>`- ${r.title} [${r.kind}]\n  ${r.url}\n  关联：${r.relation}`).join('\n')}\n\n我的综合笔记：\n${$('desk-notes').value||'尚未整理'}\n\n请沿概念来源、时间线、优化方向和可组合性解释。对技术结论给原始证据；区分论文结果、已合入实现与未验证组合。不要在缺少同条件评测时给出 SOTA 排名。`;
  $('concept-search').oninput=render;$('desk-question').oninput=save;$('desk-notes').oninput=save;
  $('copy-discussion').onclick=async()=>{try{await navigator.clipboard.writeText(context());toast('已复制问题与选中证据，可以开始讨论');}catch{toast('剪贴板不可用，请导出讨论笔记');}};
  $('queue-discussion').onclick=()=>{let added=0;picked().forEach(r=>{if(!store.add({url:r.url,title:r.title,reason:$('desk-question').value||`理解 ${c.title}：${r.relation}`,origin:`概念讨论台 / ${c.title}`}).duplicate)added++;});toast(`${added} 份资料已加入学习队列`);};
  createTopic.onclick=()=>{const t=store.createTopic(`${c.title}：${$('desk-question').value.trim().slice(0,65)||'多条优化路线的比较'}`,$('desk-question').value.trim()||c.intro);picked().forEach(r=>{const result=store.add({url:r.url,title:r.title,topic:t.id,reason:r.relation,origin:`概念讨论台 / ${c.title}`});if(result.duplicate&&!result.item.topic)store.patch(result.item.id,{topic:t.id});});store.note(t.id,$('desk-notes').value);location.href=`topic.html?id=${encodeURIComponent(t.id)}`;};
  $('export-discussion').onclick=()=>download(`${c.id}-discussion.md`,`# ${c.title} · 讨论笔记\n\n${context()}`,'text/markdown');render();
});
