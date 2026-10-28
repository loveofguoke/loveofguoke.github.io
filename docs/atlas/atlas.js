(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const link = (url, text, cls) => { const el = node('a', cls, text); el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; return el; };
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem('fieldnotes-saved') || '[]')); } catch { saved = new Set(); }
  let data, topic = '', onlySaved = false, visibleFeeds = 8;
  const params = new URLSearchParams(location.search);
  $('search').value = params.get('q') || '';
  function render() {
    const query = $('search').value.toLocaleLowerCase().trim();
    const kind = $('kind').value;
    let sources = data.sources.filter(s => (!topic || s.topics.includes(topic)) && (!kind || s.kind === kind) && (!onlySaved || saved.has(s.id)) && (!query || [s.name,s.reason,...s.topics,s.kind,s.url,s.entry.title].join(' ').toLocaleLowerCase().includes(query)));
    if ($('sort').value === 'name') sources = [...sources].sort((a,b) => a.name.localeCompare(b.name));
    $('source-grid').replaceChildren(...sources.map(s => {
      const card = node('article','source-card');
      const top = node('div','card-top'); top.append(node('span','card-kind',`${s.kind} · ${s.language}`));
      const save = node('button','save',saved.has(s.id) ? '★' : '☆'); save.type = 'button'; save.setAttribute('aria-label',`收藏 ${s.name}`); save.setAttribute('aria-pressed',String(saved.has(s.id)));
      save.addEventListener('click',()=>{saved.has(s.id)?saved.delete(s.id):saved.add(s.id);try {localStorage.setItem('fieldnotes-saved',JSON.stringify([...saved]));}catch{$('notice').textContent='浏览器未允许持久保存，收藏仅在本次页面有效';$('notice').classList.add('show');}render();});top.append(save);
      const heading = node('h3');heading.append(link(s.url,s.name));
      const tags = node('div','tags'); s.topics.forEach(t=>tags.append(node('span','',t)));
      const bottom = node('div','card-bottom'); const entry = link(s.entry.url,s.entry.title,'entry-link'); entry.title=s.entry.title; bottom.append(entry);
      const status=data.feed_status[s.id]?.status;
      if(s.feed){const rss=link(s.feed,status==='ok'?'RSS ↗':'订阅 ↗','feed-indicator');rss.title=status==='error'?'最近采集失败；可访问原站查看':'打开原站订阅源';bottom.append(rss);}
      card.append(top,heading,node('div','domain',new URL(s.url).hostname),node('p','reason',s.reason),tags,bottom);return card;
    }));
    $('empty').hidden=!!sources.length;$('result-count').textContent=`${sources.length} / ${data.sources.length} 个来源`;
    const next=new URL(location.href);if(query)next.searchParams.set('q',$('search').value);else next.searchParams.delete('q');history.replaceState(null,'',next);
    document.querySelectorAll('#topics button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===topic)));
  }
  function renderFeeds(){
    const filtered=data.entries.filter(e=>!topic||data.sources.find(s=>s.id===e.source_id)?.topics.includes(topic));
    $('feed-list').replaceChildren(...filtered.slice(0,visibleFeeds).map(e=>{const row=node('article','feed-row');const time=node('time','',e.published_at?e.published_at.slice(0,10):'日期未提供');if(e.published_at)time.dateTime=e.published_at;row.append(time,link(e.url,e.title),node('span','',data.sources.find(s=>s.id===e.source_id)?.name||e.source_id));return row;}));
    if(!filtered.length)$('feed-list').append(node('p','muted','暂时没有该方向的订阅候选。可先从上面的推荐入口阅读。'));
    $('more-feed').hidden=filtered.length<=visibleFeeds;
  }
  fetch('catalog.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(value=>{
    data=value;$('source-count').textContent=data.sources.length;const topics=[...new Set(data.sources.flatMap(s=>s.topics))];$('topic-count').textContent=topics.length;$('review-date').textContent=`目录复核 ${data.reviewed_at}`;
    $('collection-date').textContent=data.collected_at?`最近采集 ${data.collected_at.slice(0,10)} · 自动更新`:'尚未运行订阅采集';
    ['',...topics].forEach(t=>{const b=node('button','',t||'全部方向');b.dataset.topic=t;b.type='button';b.addEventListener('click',()=>{topic=t;visibleFeeds=8;render();renderFeeds();});$('topics').append(b);});
    [...new Set(data.sources.map(s=>s.kind))].forEach(k=>{const o=node('option','',k);o.value=k;$('kind').append(o);});
    $('search').addEventListener('input',render);$('kind').addEventListener('change',render);$('sort').addEventListener('change',render);$('saved-only').addEventListener('click',()=>{onlySaved=!onlySaved;$('saved-only').setAttribute('aria-pressed',String(onlySaved));render();});
    $('more-feed').addEventListener('click',()=>{visibleFeeds+=8;renderFeeds();});render();renderFeeds();
  }).catch(()=>{$('result-count').textContent='目录加载失败，请刷新重试';$('source-grid').append(link('catalog.json','直接查看来源数据 ↗'));});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
})();
