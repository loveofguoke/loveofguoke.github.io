(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const date=()=>new Date().toISOString().replace(/[:.]/g,'-');
 $('bridge-export').onclick=async()=>{try{
   const response=await fetch('topics.json');if(!response.ok)throw Error('专题目录读取失败，请重试');
   const catalog=await response.json();
   const payload=JSON.parse(JSON.stringify(LearningStore.state));
   payload.catalog=Array.isArray(catalog)?catalog:catalog.topics;
   UI.download(`guoke-learning-${date()}.json`,JSON.stringify(payload,null,2),'application/json');
   $('bridge-result').textContent=`已导出：${payload.topics.length} 个自主专题、${payload.catalog.length} 个目录专题、${(payload.pages||[]).length} 张笔记、${Object.keys(payload.progress).length} 个专题的进度。\n在本机 Agent 的“学习桥接”导入此文件。`;
 }catch(e){$('bridge-result').textContent=e.message;}};
 $('bridge-import').onclick=async()=>{try{
   const file=$('bridge-file').files[0];if(!file)throw Error('请先选择学习包');if(file.size>8000000)throw Error('学习包超过 8 MB');
   const raw=JSON.parse(await file.text());const incoming=$('prefer-incoming').checked;
   if(!confirm(`将导入 ${(raw.topics||[]).length} 个自主专题、${(raw.pages||[]).length} 张笔记。${incoming?'同名记录采用 Agent 版本，并保留本机备份。':'冲突保留本机版本。'}继续吗？`))return;
   if(incoming)UI.download(`guoke-before-agent-${date()}.json`,JSON.stringify(LearningStore.state,null,2),'application/json');
   const result=LearningStore.mergeAgent(raw,incoming);
   $('bridge-result').textContent=`新增 ${result.added} 条；发现 ${result.conflicts.length} 处已有内容差异，${incoming?'已采用 Agent 更改':'保留了本机版本'}。\n${result.conflicts.join('\n')}`;
 }catch(e){$('bridge-result').textContent=e.message;}};
})();
