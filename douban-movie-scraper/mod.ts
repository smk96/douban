#!/usr/bin/env deno run --allow-net --allow-env --allow-read

/**
 * 豆瓣电影爬虫 - 统一入口文件
 * 
 * 支持多种运行模式：CLI、Web服务器、Deno Deploy
 */

import { 
  detectEnvironment,
  createAppConfig,
  ConfigManager
} from './src/config/index.ts';
import { 
  applyMiddleware,
  createDefaultMiddleware,
  handleRoute,
  ensureStaticDirectory
} from './src/server/index.ts';
import { handleCliMode } from './src/cli/index.ts';

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 检测环境和配置
    const envInfo = detectEnvironment();
    const config = createAppConfig();
    
    console.log(`🎬 ${config.app.name} v${config.app.version}`);
    console.log(`🌍 环境: ${envInfo.environment} | 模式: ${envInfo.mode}`);
    console.log('='.repeat(60));
    
    // 根据运行模式选择启动方式
    switch (envInfo.mode) {
      case 'cli':
        await startCliMode();
        break;
        
      case 'server':
        await startServerMode(config);
        break;
        
      case 'deploy':
        await startDeployMode(config);
        break;
        
      default:
        console.error(`❌ 未知的运行模式: ${envInfo.mode}`);
        Deno.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 启动失败:', error);
    Deno.exit(1);
  }
}

/**
 * 启动 CLI 模式
 */
async function startCliMode(): Promise<void> {
  console.log('🖥️ 启动 CLI 模式...');
  await handleCliMode();
}

/**
 * 启动服务器模式
 */
async function startServerMode(config: ReturnType<typeof createAppConfig>): Promise<void> {
  console.log('🚀 启动 Web 服务器模式...');
  
  // 确保静态文件目录存在
  await ensureStaticDirectory();
  
  // 创建中间件
  const middleware = createDefaultMiddleware();
  const handler = applyMiddleware(handleRoute, middleware);
  
  // 启动服务器
  const serveOptions = {
    port: config.server.port,
    hostname: config.server.hostname
  };
  
  console.log(`📡 服务器地址: ${config.server.baseUrl}`);
  console.log(`🔗 前端界面: ${config.server.endpoints.home}`);
  console.log(`🔗 API接口: ${config.server.endpoints.api}`);
  console.log('='.repeat(60));
  console.log('✅ 服务器已启动！按 Ctrl+C 停止服务器');
  
  Deno.serve(serveOptions, handler);
}

/**
 * 启动 Deno Deploy 模式
 */
async function startDeployMode(config: ReturnType<typeof createAppConfig>): Promise<void> {
  console.log('☁️ 启动 Deno Deploy 模式...');
  
  // 创建中间件
  const middleware = createDefaultMiddleware();
  const handler = applyMiddleware(handleRoute, middleware);
  
  console.log(`📡 API接口: ${config.server.endpoints.api}`);
  console.log('='.repeat(60));
  console.log('✅ Deno Deploy 服务已启动！');
  
  // Deno Deploy 模式不需要指定端口和主机名
  Deno.serve(handler);
}

// 启动应用
if (import.meta.main) {
  main();
}