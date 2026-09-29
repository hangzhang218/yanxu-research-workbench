# 研序科研工作台 v0.2.0

面向个人科研、可以反复新建项目的 Windows 桌面应用。依据用户提供的科研复盘设计。每次研究使用独立记录和创建时的流程模板；论文阅读、动机、假设、实验和证据可以互相关联。

## 使用

双击 ResearchWorkbench-Setup-0.2.0.exe，按安装向导操作。支持 Windows 10 / 11 x64，不需要另装 Node.js、Python 或开发环境。安装程序内含运行组件，记录与查看笔记、项目、实验和快照可以离线完成；打开外部论文或代码链接需要网络。

首版安装程序未进行数字签名。Windows 的安装提示可能显示发布者未知；请从可信来源接收原始安装包，并可核对交付的 SHA256。

## 已实现

- 项目总览与三阶段检查；阶段由使用者判断，可返回前一阶段并记录原因。
- 论文的题目、作者、年份、出处、链接、阅读状态、附件。
- 论文问题、信息条件、方法、结论、已验证限制，以及独立的复现、异常现象、个人思考与后续计划。
- 问题定义与两类论证链：解决缺陷、提出改进。
- 假设关联论文，记录现实意义、支持条件、否定条件、状态与边界。
- 实验关联假设，记录用途（探索/最终评价）、设置、配置、结果、解释、边界、效率与附件。
- 主张—证据对应查看与投稿归档说明。
- 版本快照、修改内容和理由、模型图及源文件附件、真实 Git 提交与 GitHub 自动推送。
- 项目复盘、候选检查规则与通用模板更新；更新不改写已有项目。
- 本机持久保存、前次记录备份、包含附件的完整备份导出、独立项目导入。

第一版提供人工记录与关联，不自动读论文，不运行实验，不自动判断证据是否充分，通过提交预览选择文件后创建真实 Git 提交。现有结果始终由使用者填写和判断。

## 数据与分发

分享安装包只分享程序和通用流程，不分享用户研究数据。每位安装者首次启动时，创建自己的空白项目。

记录放在 Windows 当前用户的应用数据目录，可通过左下角“打开数据目录”访问。workspace.json 保存记录与修订号；workspace.json.bak 是上一次成功保存的记录。attachments 保存复制后的附件。软件升级与默认卸载配置保留用户数据。

“导出备份”创建一个含 workspace.json 与 attachments 的文件夹。换电脑时复制整个文件夹，在新安装的 App 中选择“导入备份”，选中其中的 workspace.json。正常导入会增加独立项目并保留原项目，不合并通用模板；导入项目保留自己的规则快照。完整备份文件夹也可压缩后自行传给合作者。

若主记录损坏，App 保留原文件并显示提示。可以导入完整备份恢复；损坏文件会额外留存为 .corrupt 文件。

## 开发与版本

界面使用本地 HTML/CSS/JavaScript，Electron 提供窗口和经明确限制的文件访问。Node.js 环境仅开发者需要。

```powershell
npm ci
node download-git-runtime.cjs
npm start
npm run package
node --test test-storage.cjs
```

package-lock.json 固定本次使用的依赖版本；运行组件 v40.10.6，打包工具 v26.15.3。构建使用 electron-builder NSIS 离线安装包，不使用 nsis-web。源代码的 Git 初始版本保存了这次实现及目的。

## 验证

存储测试覆盖中文记录、前次版本备份、过期修订拒绝、附件完整备份与独立目录导入、无效数据拒绝、损坏文件保护。桌面流程测试覆盖新项目、论文记录、论文与假设关联、假设与实验关联、快照和持久读回。

当前执行环境限制 Chromium 子进程，桌面流程测试使用 --disable-gpu --in-process-gpu --no-sandbox 兼容参数，仅用于隔离测试。发布版保持 Chromium sandbox、上下文隔离和禁用 Node.js 渲染器访问，未加入这些兼容参数。尚未在第二台实体电脑上测试常规安装启动。

参考：[Electron 分发说明](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)、[electron-builder NSIS](https://www.electron.build/nsis/)。

## v0.2 GitHub 同步

安装包内置 MinGit 2.56.0 与 Git Credential Manager 2.9.1。每个项目可以关联本地代码/论文仓库和 GitHub HTTPS 仓库，并填写作者与当前分支。若没有本地 Git 仓库，选择独立目录后可初始化。

保存版本后，App 将当前项目记录、论文笔记、版本说明与已附加文件导出到仓库的 .research-workbench/项目编号/。提交预览显示仓库的代码、论文与模型图变更。已跟踪文件与工作台生成文件默认选中；其他新增文件需使用者勾选。只有勾选文件进入当前提交，其他暂存内容保留。提交说明记录修改内容、目的和工作台版本编号。

启用自动推送时，每次在 App 中创建提交后自动 push，并读取远端分支提交号确认成功。离线、认证失败或远端分歧时保留本地提交，可在版本页重试。App 不执行强制推送、自动合并或自动变基。“同步当前分支”可推送在其他工具中已有的提交，但 App 不监听外部提交并自动上传。

仓库关联设置只在本机 git-connections.json 中保存，不进入工作台导出的项目记录。GitHub 登录与凭证由 GCM 处理；App 不要求输入密码或令牌。首次推送可能通过浏览器登录授权。

大文件：当前文件选择限制 50 MB。更大数据、模型 checkpoint 需另行使用 Git LFS 或外部存储；不会因为记录快照就上传所有大型结果。

测试：node --test test-storage.cjs test-git.cjs。Git 集成测试通过独立本地 bare 远端验证真实提交、精确文件选择、其他暂存内容保留、过期预览拒绝和非快进推送失败时保留提交。真实 GitHub 测试需有写入权限的目标仓库及用户认证。

官方运行组件：[Git for Windows 2.56.0](https://github.com/git-for-windows/git/releases/tag/v2.56.0.windows.1)、[GCM 2.9.1](https://github.com/git-ecosystem/git-credential-manager/releases/tag/v2.9.1)。下载脚本校验官方发布的 SHA256，安装包保留组件随附许可证。认证参考：[GitHub 凭证说明](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git)。
