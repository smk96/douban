/**
 * 服务器配置管理模块
 * 
 * 统一管理服务器相关配置，支持不同环境的服务器设置
 */

import { ServerConfig, Environment, RunMode } from '../shared/types.ts';
import { SERVER_CONFIG, ENV_VARS } from '../shared/constants.ts';
import { EnvUtils, ValidationUtils } from '../shared/utils.ts';

/**
 * 获取服务器配置
 * @param environment 环境类型
 * @param mode 运行模式
 * @returns ServerConfig 服务器配置对象
 */
export function getServerConfig(environment?: Environment, mode?: RunMode): ServerConfig {
  const env = environment || EnvUtils.getEnvironment();
  const runMode = mode || EnvUtils.getRunMode();
  
  // 根据运行模式和环境获取配置
  switch (runMode) {
    case 'deploy':
      return getDeployServerConfig();
    case 'server':
      return getWebServerConfig(env);
    case 'cli':
      return getCliServerConfig();
    default:
      return getDefaultServerConfig(env);
  }
}

/**
 * Deno Deploy 服务器配置
 */
function getDeployServerConfig(): ServerConfig {
  // Deno Deploy 环境中，端口和主机名由平台管理
  return {
    port: 8000, // 默认端口，实际由平台决定
    hostname: '0.0.0.0', // 默认主机名，实际由平台决定
    production: true
  };
}

/**
 * Web 服务器配置
 * @param environment 环境类型
 */
function getWebServerConfig(environment: Environment): ServerConfig {
  const port = getPort(environment);
  const hostname = getHostname(environment);
  
  return {
    port,
    hostname,
    production: environment === 'production'
  };
}

/**
 * CLI 模式配置（不需要服务器）
 */
function getCliServerConfig(): ServerConfig {
  return {
    port: 0, // CLI 模式不需要端口
    hostname: 'localhost',
    production: false
  };
}

/**
 * 默认服务器配置
 * @param environment 环境类型
 */
function getDefaultServerConfig(environment: Environment): ServerConfig {
  return {
    port: getPort(environment),
    hostname: getHostname(environment),
    production: environment === 'production'
  };
}

/**
 * 获取端口号
 * @param environment 环境类型
 * @returns number 端口号
 */
function getPort(environment: Environment): number {
  // 优先使用环境变量
  const envPort = EnvUtils.get(ENV_VARS.PORT);
  if (envPort) {
    const port = parseInt(envPort, 10);
    if (ValidationUtils.isValidPort(port)) {
      return port;
    }
  }
  
  // 根据环境返回默认端口
  switch (environment) {
    case 'production':
      return SERVER_CONFIG.PRODUCTION_PORT;
    case 'deploy':
      return SERVER_CONFIG.DEFAULT_PORT;
    default:
      return SERVER_CONFIG.DEFAULT_PORT;
  }
}

/**
 * 获取主机名
 * @param environment 环境类型
 * @returns string 主机名
 */
function getHostname(environment: Environment): string {
  // 优先使用环境变量
  const envHostname = EnvUtils.get(ENV_VARS.HOSTNAME);
  if (envHostname) {
    return envHostname;
  }
  
  // 根据环境返回默认主机名
  switch (environment) {
    case 'production':
      return '0.0.0.0'; // 生产环境监听所有接口
    case 'deploy':
      return '0.0.0.0'; // 部署环境监听所有接口
    default:
      return SERVER_CONFIG.DEFAULT_HOSTNAME; // 开发环境只监听本地
  }
}

/**
 * 获取 Deno.serve() 选项
 * @param environment 环境类型
 * @param mode 运行模式
 * @returns Deno.ServeOptions | undefined
 */
export function getServeOptions(
  environment?: Environment,
  mode?: RunMode
): Deno.ServeOptions | undefined {
  const runMode = mode || EnvUtils.getRunMode();
  
  // Deno Deploy 模式不需要指定端口和主机名
  if (runMode === 'deploy') {
    return undefined;
  }
  
  const config = getServerConfig(environment, mode);
  
  // CLI 模式不需要服务器选项
  if (runMode === 'cli') {
    return undefined;
  }
  
  return {
    port: config.port,
    hostname: config.hostname
  };
}

/**
 * 获取服务器启动信息
 * @param environment 环境类型
 * @param mode 运行模式
 * @returns object 启动信息
 */
export function getServerInfo(environment?: Environment, mode?: RunMode) {
  const config = getServerConfig(environment, mode);
  const runMode = mode || EnvUtils.getRunMode();
  const env = environment || EnvUtils.getEnvironment();
  
  const baseUrl = runMode === 'deploy' 
    ? 'https://your-app.deno.dev' 
    : `http://${config.hostname}:${config.port}`;
  
  return {
    mode: runMode,
    environment: env,
    port: config.port,
    hostname: config.hostname,
    production: config.production,
    baseUrl,
    endpoints: {
      home: baseUrl,
      api: `${baseUrl}/api/search`,
      health: `${baseUrl}/health`,
      imageProxy: `${baseUrl}/api/image-proxy`
    }
  };
}

/**
 * 验证服务器配置
 * @param config 服务器配置
 * @returns boolean 是否有效
 */
export function validateServerConfig(config: ServerConfig): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  // 验证端口
  if (config.port !== 0 && !ValidationUtils.isValidPort(config.port)) {
    return false;
  }
  
  // 验证主机名
  if (!config.hostname || typeof config.hostname !== 'string') {
    return false;
  }
  
  // 验证生产环境标志
  if (typeof config.production !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * 获取静态文件配置
 * @param environment 环境类型
 * @returns object 静态文件配置
 */
export function getStaticFileConfig(environment?: Environment) {
  const env = environment || EnvUtils.getEnvironment();
  
  return {
    directory: SERVER_CONFIG.STATIC_DIR,
    maxAge: env === 'production' ? 86400 : 0, // 生产环境缓存1天
    etag: env === 'production',
    lastModified: env === 'production',
    immutable: false
  };
}

/**
 * 获取请求限制配置
 * @param environment 环境类型
 * @returns object 请求限制配置
 */
export function getRequestLimitsConfig(environment?: Environment) {
  const env = environment || EnvUtils.getEnvironment();
  
  return {
    maxBodySize: SERVER_CONFIG.MAX_BODY_SIZE,
    timeout: env === 'production' ? 30000 : 60000, // 生产环境30秒，开发环境60秒
    keepAlive: env === 'production',
    compression: env === 'production'
  };
}

/**
 * 获取日志配置
 * @param environment 环境类型
 * @returns object 日志配置
 */
export function getLoggingConfig(environment?: Environment) {
  const env = environment || EnvUtils.getEnvironment();
  const debug = EnvUtils.isDebugEnabled();
  
  return {
    level: debug ? 'debug' : (env === 'production' ? 'info' : 'debug'),
    format: env === 'production' ? 'json' : 'pretty',
    timestamp: true,
    requestLogging: true,
    errorLogging: true
  };
}

/**
 * 创建服务器配置摘要
 * @param environment 环境类型
 * @param mode 运行模式
 * @returns string 配置摘要
 */
export function createConfigSummary(environment?: Environment, mode?: RunMode): string {
  const info = getServerInfo(environment, mode);
  
  const lines = [
    `🎬 豆瓣电影爬虫 - ${info.mode.toUpperCase()} 模式`,
    `🌍 环境: ${info.environment}`,
    `🚀 服务器启动中...`
  ];
  
  if (info.mode !== 'cli') {
    lines.push(`📡 地址: ${info.baseUrl}`);
    
    if (info.mode === 'server') {
      lines.push(`🔗 前端界面: ${info.endpoints.home}`);
    }
    
    lines.push(`🔗 API接口: ${info.endpoints.api}`);
  }
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}