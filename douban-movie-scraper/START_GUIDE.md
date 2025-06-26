# 🚀 豆瓣电影爬虫 - 启动指南

## 📁 项目结构

重构后的项目已经完全模块化，具有清晰的架构：

```
douban-movie-scraper/
├── mod.ts                    # 统一入口文件
├── deno.json                 # Deno 配置文件
├── src/                      # 源代码目录
│   ├── shared/               # 共享模块（类型、错误、常量、工具）
│   ├── core/                 # 核心业务逻辑（搜索、解析、HTTP）
│   ├── config/               # 配置管理（环境、服务器、CORS）
│   ├── server/               # 服务器模块（中间件、路由、处理器）
│   └── cli/                  # 命令行模块
├── static/                   # 静态文件（自动生成）
└── docs/                     # 文档目录
```

## 🎯 启动方式

### 方式 1: Web 服务器模式（推荐）

```bash
# 启动 Web 服务器（带前端界面）
deno task start

# 或者直接运行
deno run --allow-net --allow-env --allow-read mod.ts --mode=server
```

**访问地址**:
- 前端界面: http://localhost:8000
- API 文档: http://localhost:8000
- 搜索 API: http://localhost:8000/api/search
- 健康检查: http://localhost:8000/health

### 方式 2: CLI 命令行模式

```bash
# 搜索电影（文本格式）
deno task cli --movie="阳光普照"

# 搜索电影（JSON格式）
deno run --allow-net --allow-env mod.ts --mode=cli --movie="肖申克的救赎" --format=json

# 显示帮助信息
deno run --allow-net --allow-env mod.ts --mode=cli --help
```

### 方式 3: Deno Deploy 模式

```bash
# 启动 Deno Deploy 兼容模式
deno task deploy

# 或者
deno run --allow-net --allow-env --allow-read mod.ts --mode=deploy
```

## 🔧 开发工具

```bash
# 代码检查
deno task lint

# 代码格式化
deno task fmt

# 类型检查
deno task check

# 运行测试
deno task test
```

## 🌐 API 使用示例

### 搜索电影 API

```bash
# 使用 curl
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"movieName":"阳光普照"}'

# 使用 PowerShell
$body = @{movieName="阳光普照"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/search" -Method POST -Body $body -ContentType "application/json"
```

### JavaScript 示例

```javascript
// 搜索电影
async function searchMovie(movieName) {
  const response = await fetch('http://localhost:8000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movieName })
  });
  
  const data = await response.json();
  return data;
}

// 使用示例
searchMovie('阳光普照').then(console.log);
```

## 📋 环境变量配置

可以通过环境变量自定义配置：

```bash
# 设置运行模式
export MODE=server

# 设置端口
export PORT=8080

# 设置主机名
export HOSTNAME=0.0.0.0

# 启用调试模式
export DEBUG=true

# 设置环境类型
export ENVIRONMENT=production
```

## 🔄 从原项目迁移

如果您想在原项目中使用重构后的代码：

1. **复制重构后的文件**到原项目目录：
   ```bash
   # 复制源代码
   cp -r E:\jsf\gym\cc\douban-movie-scraper\src e:\jsf\gym\email\douban\
   
   # 复制配置文件
   cp E:\jsf\gym\cc\douban-movie-scraper\mod.ts e:\jsf\gym\email\douban\
   cp E:\jsf\gym\cc\douban-movie-scraper\deno.json e:\jsf\gym\email\douban\
   ```

2. **删除旧文件**（可选）：
   ```bash
   # 删除旧的入口文件
   rm e:\jsf\gym\email\douban\main.ts
   rm e:\jsf\gym\email\douban\server.ts
   rm e:\jsf\gym\email\douban\deploy.ts
   
   # 删除旧的模块目录
   rm -rf e:\jsf\gym\email\douban\modules\
   ```

3. **启动项目**：
   ```bash
   cd e:\jsf\gym\email\douban
   deno task start
   ```

## ✨ 新功能特性

重构后的项目具有以下新特性：

- ✅ **统一入口**: 一个文件支持多种运行模式
- ✅ **智能环境检测**: 自动识别运行环境和模式
- ✅ **模块化架构**: 清晰的代码组织和依赖关系
- ✅ **中间件系统**: 可组合的请求处理管道
- ✅ **完整的Web界面**: 美观的前端搜索界面
- ✅ **API文档**: 自动生成的API使用文档
- ✅ **错误处理**: 统一的错误处理和响应格式
- ✅ **配置管理**: 支持多环境的配置系统
- ✅ **静态文件服务**: 完整的静态资源服务
- ✅ **性能优化**: 缓存控制和性能监控

## 🎉 开始使用

现在您可以：

1. **复制 `mod.ts` 到您的原项目目录**
2. **复制 `src/` 目录到您的原项目**
3. **更新 `deno.json` 配置**
4. **运行 `deno task start` 启动项目**

享受重构后的强大功能吧！🚀