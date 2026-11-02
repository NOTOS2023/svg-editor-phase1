# SVG 编辑器 CLI · Lab 1 Phase 1

TypeScript 面向对象课程项目。支持六种 SVG 图形、嵌套容器、命令行编辑、SVG 文件读写和命令级撤销重做。

## 启动

环境：Node.js 18.18 或更高版本、npm、Git。

```sh
npm ci
npm run cli
```

交互提示符为 `svg>`，输入 `help` 查看语法，使用 Ctrl+C 或终端 EOF 结束。所有路径默认相对于启动时的工作目录；包含空格的参数使用双引号。

```text
init 800 600
create g scene
create rect r1 20 30 160 60 #4a90d9 in scene
create text title 45 65 "开始" in scene
move scene 50 20
undo
redo
tree
save my-diagram.svg
```

用浏览器打开生成的 SVG 即可预览。

## 脚本与示例

从项目根目录运行：

```sh
npm run cli -- --script examples/flowchart.txt
npm run cli -- --script examples/demo.txt
npm run cli -- --script examples/import.txt
```

- `flowchart.txt`：题目要求的两节点流程图，容器中同时包含矩形和中文文字。
- `demo.txt`：六种图形及分组、缩放、撤销、解组、层级调整的综合演示。
- `import.txt` / `other.svg`：外部 SVG 缺 id 自动补全与读写示例。

脚本顺序执行；错误命令输出单行 `error:`，后面的命令继续执行。有错误时进程退出码为 1。整行以 `#` 开头表示注释，颜色值中的 `#` 会被保留。

编译后也可直接运行 `node dist/src/main.js`，或把多行命令通过标准输入传入。管道模式不打印交互提示符。

## 验证

```sh
npm run check
```

此命令执行严格 TypeScript 编译、Node 内置测试，以及模块依赖和面向对象结构检查。测试包含领域规则、文件往返和独立进程的 CLI 脚本验收。

## 提交材料

- [架构方案、过程记录、一致性自查和质量保证](doc/README.md)
- [最初的实施方案](doc/PLAN.md)
- `src/`：实现；`test/`：自动测试；`tools/`：架构检查；`examples/`：脚本与 SVG。

开发过程分步记录在 Git 历史中。远程仓库配置与推送按用户要求留到最后处理；本地内容完成不代表已经提交到 GitHub/Gitee。

## 范围

本阶段内置 `rect`、`circle`、`ellipse`、`line`、`text`、`g`；题目中的 `box` 属下一阶段，当前按未知类型报错。SVG 读入针对这六种图形的课程子集；详细支持边界和语义选择见 [完整文档](doc/README.md)。
