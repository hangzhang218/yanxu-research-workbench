const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {Store}=require('./storage.cjs');
const {GitService}=require('./git-service.cjs');
if(process.env.RW_DATA_DIR)app.setPath('userData',path.resolve(process.env.RW_DATA_DIR));
if(!app.requestSingleInstanceLock()){app.quit();} else {
  let win,store,git;
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(()=>{
    store=new Store(app.getPath('userData'));
    const runtimeRoot=app.isPackaged?path.join(process.resourcesPath,'git'):path.join(__dirname,'git-runtime');
    git=new GitService(store,{git:path.join(runtimeRoot,'cmd','git.exe'),runtimeRoot});
    win=new BrowserWindow({width:1440,height:940,minWidth:800,minHeight:650,title:'研序 · 科研工作台',icon:path.join(__dirname,'ui','icon.png'),backgroundColor:'#f5f7fb',show:!process.argv.includes('--smoke-test'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.setMenuBarVisibility(false);
    const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{
      if(event.sender!==win.webContents)throw new Error('无效请求。');
      try{return {ok:true,value:await fn(...args)};}catch(err){return {ok:false,error:err.message};}
    });
    handle('read',()=>store.read());
    handle('save',(data,rev)=>store.save(data,rev));
    handle('attach',async(kind)=>{const picked=await dialog.showOpenDialog(win,{title:kind==='diagram'?'选择模型图':'选择论文或实验附件',properties:['openFile'],filters:kind==='diagram'?[{name:'模型图及源文件',extensions:['png','jpg','jpeg','svg','pdf','drawio','mmd','puml','pptx']}]:[{name:'科研附件',extensions:['pdf','txt','md','csv','json','png','jpg','svg','log','yaml','yml','tex','bib','xlsx']} ]});return picked.canceled?null:store.attach(picked.filePaths[0]);});
    handle('openAttachment',async(id)=>{const error=await shell.openPath(store.attachment(id));if(error)throw new Error(error);return true;});
    handle('openLink',async(url)=>{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error('只支持 http/https 链接。');await shell.openExternal(parsed.toString());return true;});
    handle('dataDir',async()=>{await shell.openPath(store.dir);return true;});
    handle('export',async(data)=>{const picked=await dialog.showOpenDialog(win,{title:'选择备份保存位置',properties:['openDirectory','createDirectory']});return picked.canceled?null:store.export(picked.filePaths[0],data);});
    handle('import',async()=>{const picked=await dialog.showOpenDialog(win,{title:'选择研序备份中的 workspace.json',properties:['openFile'],filters:[{name:'研序备份',extensions:['json']}]});return picked.canceled?null:store.import(picked.filePaths[0]);});
    handle('recover',data=>store.recover(data));
    handle('gitInspect',id=>git.inspect(id));
    handle('gitPickRepo',async()=>{const picked=await dialog.showOpenDialog(win,{title:'选择研究代码 / 论文的本地仓库根目录',properties:['openDirectory','createDirectory']});return picked.canceled?null:git.probe(picked.filePaths[0]);});
    handle('gitConfigure',(id,fields)=>git.configure(id,fields));
    handle('gitPrepare',(id,version)=>git.prepare(id,version));
    handle('gitCommit',(id,token,files)=>git.commit(id,token,files));
    handle('gitPush',(id,version)=>git.push(id,version));
    handle('gitOpenRepo',async id=>{const error=await shell.openPath(git.connection(id).repo);if(error)throw Error(error);return true;});
    win.webContents.on('will-prevent-unload',event=>{const choice=dialog.showMessageBoxSync(win,{type:'question',buttons:['继续编辑','放弃未保存输入并退出'],defaultId:0,cancelId:0,title:'输入尚未保存',message:'当前表单还有未保存的输入。'});if(choice===1)event.preventDefault();});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(event,url)=>{if(url!==win.webContents.getURL())event.preventDefault();});
    if(process.argv.includes('--smoke-test')){
      win.webContents.on('did-fail-load',(event,code,description,url)=>console.error('LOAD_FAILED',code,description,url));
      win.webContents.on('render-process-gone',(event,details)=>console.error('RENDER_GONE',details));
      win.webContents.on('console-message',(event,level,message)=>console.log('RENDER_LOG',message));
    }
    win.loadFile(path.join(__dirname,'ui','index.html'));
    if(process.argv.includes('--smoke-test')){
      const timeout=setTimeout(()=>{fs.writeFileSync(path.join(store.dir,'smoke-result.json'),JSON.stringify({ok:false,error:'render timeout',url:win.webContents.getURL(),loading:win.webContents.isLoading(),metrics:app.getAppMetrics().map(x=>({type:x.type,pid:x.pid}))}));app.exit(1);},20000);
      win.webContents.on('did-finish-load',async()=>{
        try { await new Promise(resolve=>setTimeout(resolve,600));const screenshot=await win.webContents.capturePage();fs.writeFileSync(path.join(store.dir,'preview.png'),screenshot.toPNG());const result=await win.webContents.executeJavaScript('window.__smokeTest()');fs.writeFileSync(path.join(store.dir,'smoke-result.json'),JSON.stringify(result));clearTimeout(timeout);app.exit(result.ok?0:1); }
        catch(err){fs.writeFileSync(path.join(store.dir,'smoke-result.json'),JSON.stringify({ok:false,error:err.message}));clearTimeout(timeout);app.exit(1);}
      });
    }
  });
  app.on('window-all-closed',()=>app.quit());
}
