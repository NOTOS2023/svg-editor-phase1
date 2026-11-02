# Phase 1 实施方案（初版）

2026-11-02，根据 `phase_cli_1.md` 确定范围：六种内置图形、全部 CLI 命令、SVG 读写、事务失败不改变状态、文档命令后的历史屏障。不实现后续阶段的 box 插件。

## 模块和依赖

- `src/domain/`：封装图形、Composite 容器、文档结构和几何规则，不依赖其他业务模块或 Node IO。
- `src/application/`：编辑会话、Command/历史、输入验证、文档存储端口，依赖 domain。
- `src/infrastructure/`：XML 编解码和 Node 文件存储，依赖 domain 和 application 的存储端口。
- `src/cli/`：词法分析、命令名注册、REPL，依赖 application，通过注入隔离文件 IO。
- `src/main.ts`：唯一装配入口；`test/`、`tools/`、`examples/` 用于验证和演示。

使用 Command + Composite；历史保存命令执行前后的深拷贝（Memento），在副本上编辑，成功后提交，失败不改变文档或历史。状态通过类的行为修改，不向外暴露可写字段。

按名字选择实现仅保留在 CommandRegistry 与 ShapeFactory 两个边界，最终文档明确记为后续插件化重构点。各图形通过多态完成几何变换、属性设置和结构展示。

## 分步交付

1. 工程配置和架构初版。
2. 领域模型、SVG 存储及独立测试。
3. 命令层、CLI、历史和端到端测试。
4. 边界修正、示例、架构一致性检查和最终文档。
5. 执行完整检查、最终 Git 提交和 final 标签；配置远程后推送。

本文件保留初始决策。实施中的真实讨论与修订收录在 `doc/README.md`，不虚构学生本人进行过的审查或远程提交。
