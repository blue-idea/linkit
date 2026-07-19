# 1. 优化任务

- [X] 1.1收藏分类后面的图标修改为鼠标放置到上面显示。分类操作不要点击Drag category进行拖拽，直接拖拽分类。删除Drag category。
- [X] 1.2增加分类的图标设置功能，需要有候选图标功能。
- [X] 1.3 书签增加直接访问功能，增加便捷性。注意需要和现有右侧栏visit访问进行区分。进行封装，Card、List、Masonry、Timeline、Tag Aggregation、Theme Space 视图下都能正常使用。
- [ ] 1.4 对齐界面的语言设置，除自定义内容外。所有界面语言、提示语言都需要和设置中的语言对齐。不要修改其他功能，影响程序正常访问。

# 2.修复任务

- [X] 2.1 新建、编辑collection时Emoji需要弹出候选图标选项。
- [X] 2.2 搜索结果，回车确认后，直接访问网站（open directyly)。

## 3. 项目打包

- [X] 3.1 开发/正式本机身份槽隔离（TASK-055）：正式 `Linkit`，开发 `Linkit-Dev`（`wails dev -tags dev`）；Release CI 断言产物不含开发身份。详见 `docs/knowledge/打包.md`。
- [ ] 3.2 用 GitHub Actions 发布安装包到 Releases：`release.yml` 已支持 Windows installer / macOS dmg / Linux deb；触发后验证身份门禁与产物。

用 GitHub Actions（已配置好）
你的项目已经有 desktop-build.yml，它会：
在 windows-latest runner 上构建 Windows 版
在 macos-latest runner 上构建 macOS 版
只需推送代码，GitHub 免费提供3个平台的 runner。需要打包成安装包（.exe installer / .dmg）和linux 安装包，可以参考 打包.md 中的 CI 集成方案追加到 workflow 里。
将安装包提交到github 的releases中。
