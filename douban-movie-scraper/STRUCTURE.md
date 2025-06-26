# 豆瓣电影爬虫 - 重构后的项目结构

## 📁 目录结构说明

```
douban-movie-scraper/
├── mod.ts                    # 统一入口文件
├── deno.json                 # Deno 配置文件
├── README.md                 # 项目说明文档
├── src/                      # 源代码目录
│   ├── core/                 # 核心业务逻辑
│   │   ├── search.ts         # 电影搜索功能
│   │   ├── parser.ts         # 页面解析功能
│   │   └── http.ts           # HTTP 客户端
│   ├── server/               # 服务器相关
│   │   ├── handlers.ts       # 请求处理器
│   │   ├── middleware.ts     # 中间件（CORS、错误处理）
│   │   ├── routes.ts         # 路由定义
│   │   └── static.ts         # 静态文件服务
│   ├── cli/                  # 命令行相关
│   │   ├── args.ts           # 参数处理
│   │   ├── formatter.ts      # 输出格式化
│   │   └── index.ts          # CLI 入口
│   ├── shared/               # 共享工具和类型
│   │   ├── types.ts          # 类型定义
│   │   ├── errors.ts         # 错误处理
│   │   ├── constants.ts      # 应用常量
│   │   └── utils.ts          # 工具函数
│   └── config/               # 配置管理
│       ├── cors.ts           # CORS 配置
│       ├── server.ts         # 服务器配置
│       ├── environment.ts    # 环境配置
│       └── index.ts          # 配置入口
├── static/                   # 静态文件
│   ├── index.html            # Web 界面
│   ├── style.css             # 样式文件
│   └── script.js             # 前端脚本
└── docs/                     # 文档
    ├── deployment.md         # 部署指南
    └── api.md                # API 文档
```

## 🎯 重构目标

### 解决的问题
1. **消除代码重复** - 统一 CORS 配置、HTTP 处理逻辑、错误处理
2. **清晰的模块分离** - 业务逻辑、服务器逻辑、CLI 逻辑独立
3. **统一入口管理** - 一个 mod.ts 支持多种运行模式
4. **配置管理优化** - 支持不同环境的配置
5. **文档整合** - 清晰的使用和部署指南

### 设计原则
- **单一职责** - 每个模块只负责一个功能领域
- **依赖倒置** - 高层模块不依赖低层模块
- **开闭原则** - 对扩展开放，对修改封闭
- **接口隔离** - 使用小而专一的接口

## 🚀 使用方式

### CLI 模式
```bash
deno run mod.ts --mode=cli --movie="电影名称"
```

### Web 服务器模式
```bash
deno run mod.ts --mode=server
```

### Deno Deploy 模式
```bash
deno run mod.ts --mode=deploy
```

## 📋 重构进度

- [x] 创建目录结构
- [ ] 重构共享类型和错误处理
- [ ] 重构核心业务逻辑模块
- [ ] 创建统一的配置管理系统
- [ ] 重构服务器相关模块
- [ ] 重构命令行相关模块
- [ ] 迁移静态文件和创建统一入口
- [ ] 更新配置文件和文档
- [ ] 测试重构后的项目功能

## 🔧 开发指南

### 添加新功能
1. 确定功能属于哪个模块（core/server/cli）
2. 在相应目录下创建模块文件
3. 更新相关的类型定义和配置
4. 添加测试和文档

### 部署流程
1. 本地测试所有模式
2. 更新文档
3. 部署到 Deno Deploy

---

**重构状态**: 🔄 进行中  
**当前阶段**: 目录结构创建完成  
**下一步**: 重构共享类型和错误处理