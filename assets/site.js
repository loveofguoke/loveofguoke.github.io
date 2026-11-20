(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  window.SiteBase = base;
  const node = (tag, cls, text) => { const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el; };
  window.UI = {node, link(url,text,cls) {const a=node('a',cls,text);a.href=url;return a;},
    toast(text){let el=document.getElementById('toast');if(!el){el=node('div','toast');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);},
    download(name,text,type='text/plain') {const a=node('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}};
  const header=document.getElementById('site-header');
  if(header){
    header.className='site-header';const logo=UI.link(base.href,'果壳','wordmark');logo.append(node('span','','的宇宙'),node('i'));
    const nav=node('nav');nav.setAttribute('aria-label','主导航');
    for(const [id,label,path] of [['home','主页',''],['learn','学习','learn/'],['projects','项目','projects/'],['notes','随记','notes/']]){const a=UI.link(new URL(path,base),label);if(header.dataset.section===id)a.setAttribute('aria-current','page');nav.append(a);}
    nav.append(UI.link('https://github.com/loveofguoke','GitHub ↗'));header.append(logo,nav);
    if(header.dataset.section==='learn') {
      const subnav=document.querySelector('.subnav');
      if(subnav && !subnav.querySelector('a[href="agent.html"]'))subnav.append(UI.link(new URL('learn/agent.html',base),'Agent 桥接'));
    }
  }
  document.querySelectorAll('[data-learning-stats]').forEach(el=>{const update=()=>{const s=LearningStore.state;el.textContent=`${s.queue.filter(x=>x.status==='queued').length} 待阅读 · ${s.queue.filter(x=>x.status==='reading').length} 进行中`;};update();window.addEventListener('learning-change',update);});
})();
