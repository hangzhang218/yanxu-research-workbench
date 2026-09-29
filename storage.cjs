const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
function validate(data) {
  if (!data || data.schema !== 1 || !Array.isArray(data.projects) || !Array.isArray(data.rules) || data.rules.some(r=>typeof r!=='string') || !Number.isInteger(data.templateVersion) || data.templateVersion < 1) throw new Error('备份格式无效。');
  const ids = new Set();
  for (const p of data.projects) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.papers) || !Array.isArray(p.claims) || !Array.isArray(p.experiments) || !Array.isArray(p.versions) || !Array.isArray(p.candidates) || !Array.isArray(p.checks) || !p.problem || typeof p.problem !== 'object') throw new Error('项目记录格式无效。');
    ids.add(p.id);
    if(!Number.isInteger(p.stage)||p.stage<0||p.stage>2||!Array.isArray(p.rules)||p.rules.some(r=>typeof r!=='string')||!Number.isInteger(p.templateVersion)||p.templateVersion<1||p.checks.some(c=>typeof c!=='string'||! /^[012]-[0-5]$/.test(c)))throw new Error('项目阶段或流程模板格式无效。');
    for (const list of [p.papers,p.claims,p.experiments,p.versions,p.candidates]) {
      const entryIds = new Set();
      for (const item of list) { if (!item || typeof item.id !== 'string' || entryIds.has(item.id)) throw new Error('记录编号无效或重复。'); entryIds.add(item.id); }
    }
    for(const item of [...p.papers,...p.claims,...p.experiments,...p.versions])if(typeof item.title!=='string'||!item.title.trim())throw new Error('记录标题格式无效。');
    for(const item of p.versions)if(!item.snapshot||!Array.isArray(item.snapshot.papers)||!Array.isArray(item.snapshot.claims)||!Array.isArray(item.snapshot.experiments))throw new Error('版本快照格式无效。');
    for(const item of p.candidates)if(typeof item.text!=='string'||typeof item.adopted!=='boolean')throw new Error('检查规则格式无效。');
  }
  if (JSON.stringify(data).length > 30 * 1024 * 1024) throw new Error('记录超过 30 MB，请减少大型版本快照。');
  return data;
}
class Store {
  constructor(dir) { this.dir=dir; this.file=path.join(dir,'workspace.json'); fs.mkdirSync(path.join(dir,'attachments'),{recursive:true}); }
  read() {
    if (!fs.existsSync(this.file)) return {data:null, revision:0};
    try { const row=JSON.parse(fs.readFileSync(this.file,'utf8')); validate(row.data); if (!Number.isInteger(row.revision)) throw new Error(); return row; }
    catch { throw new Error('主记录无法读取。请保留文件，并从数据目录中的 workspace.json.bak 恢复或导入备份。'); }
  }
  save(data,revision) {
    validate(data); const prior=this.read();
    if (revision!==prior.revision) throw new Error('记录已更新。请先导出本页备份，再重新打开应用。');
    const row={data,revision:revision+1}; const tmp=path.join(this.dir,'workspace-'+randomUUID()+'.tmp');
    try {
      const fd=fs.openSync(tmp,'wx'); try { fs.writeFileSync(fd,JSON.stringify(row,null,2),'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      if (fs.existsSync(this.file)) fs.copyFileSync(this.file,this.file+'.bak');
      fs.renameSync(tmp,this.file); return row;
    } finally { if(fs.existsSync(tmp)) fs.unlinkSync(tmp); }
  }
  attach(source) { const name=randomUUID()+path.extname(source).toLowerCase(); const stat=fs.statSync(source); if(stat.size>100*1024*1024) throw new Error('单个附件请控制在 100 MB 内。'); fs.copyFileSync(source,path.join(this.dir,'attachments',name)); return {id:name,name:path.basename(source)}; }
  attachment(id) { if(typeof id!=='string'||id!==path.basename(id)||!/^[-a-z0-9]+\.[a-z0-9]+$/i.test(id)) throw new Error('附件编号无效。');if(!['.pdf','.txt','.md','.csv','.json','.png','.jpg','.jpeg','.svg','.log','.yaml','.yml','.drawio','.mmd','.puml','.pptx','.tex','.bib','.xlsx'].includes(path.extname(id).toLowerCase()))throw new Error('不支持打开这种附件类型。');const file=path.join(this.dir,'attachments',id); if(!fs.existsSync(file)) throw new Error('未找到附件。'); return file; }
  export(folder,data) {
    validate(data); const out=path.join(folder,'研序备份-'+new Date().toISOString().replace(/[:.]/g,'-')); fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'workspace.json'),JSON.stringify(data,null,2),'utf8'); const attachmentDir=path.join(out,'attachments');fs.mkdirSync(attachmentDir,{recursive:true});for(const name of fs.readdirSync(path.join(this.dir,'attachments')))fs.copyFileSync(path.join(this.dir,'attachments',name),path.join(attachmentDir,name));return out;
  }
  import(file) {
    const data=validate(JSON.parse(fs.readFileSync(file,'utf8'))); const adjacent=path.join(path.dirname(file),'attachments');
    if(fs.existsSync(adjacent)) for(const name of fs.readdirSync(adjacent)) {
      if(!/^[-a-z0-9]+\.[a-z0-9]+$/i.test(name)) continue;
      const source=path.join(adjacent,name),dest=path.join(this.dir,'attachments',name);
      if(fs.statSync(source).isFile()&&!fs.existsSync(dest))fs.copyFileSync(source,dest);
    }
    return data;
  }
  recover(data) {
    validate(data);let broken=false;try{this.read();}catch{broken=true;}
    if(!broken)throw new Error('当前记录可以正常读取，请使用普通导入。');
    fs.copyFileSync(this.file,this.file+'.corrupt-'+Date.now());
    const tmp=this.file+'.recovery.tmp';fs.writeFileSync(tmp,JSON.stringify({data,revision:0},null,2),'utf8');fs.renameSync(tmp,this.file);return this.read();
  }
}
module.exports={Store,validate};
