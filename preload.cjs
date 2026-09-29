const {contextBridge,ipcRenderer}=require('electron');
const call=async(name,...args)=>{const result=await ipcRenderer.invoke(name,...args);if(!result.ok)throw new Error(result.error);return result.value;};
contextBridge.exposeInMainWorld('research',{read:()=>call('read'),save:(data,rev)=>call('save',data,rev),attach:kind=>call('attach',kind),openAttachment:id=>call('openAttachment',id),openLink:url=>call('openLink',url),dataDir:()=>call('dataDir'),export:data=>call('export',data),import:()=>call('import'),recover:data=>call('recover',data)});
