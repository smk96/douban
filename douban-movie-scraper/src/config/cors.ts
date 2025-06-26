/**
 * CORS 配置管理模块
 * 
 * 统一管理跨域资源共享配置，支持不同环境的 CORS 策略
 */

import { CorsConfig, Environment } from '../shared/types.ts';
import { CORS_CONFIG } from '../shared/constants.ts';
import { EnvUtils } from '../shared/utils.ts';

/**
 * 获取 CORS 配置
 * @param environment 环境类型
 * @returns CorsConfig CORS 配置对象
 */
export function getCorsConfig(environment?: Environment): CorsConfig {
  const env = environment || EnvUtils.getEnvironment();
  
  switch (env) {
    case 'development':
      return getDevelopmentCorsConfig();
    case 'production':
      return getProductionCorsConfig();
    case 'deploy':
      return getDeployCorsConfig();
    default:
      return getDefaultCorsConfig();
  }
}

/**
 * 开发环境 CORS 配置
 */
function getDevelopmentCorsConfig(): CorsConfig {
  return {
    origin: '*', // 开发环境允许所有源
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    headers: 'Content-Type, Authorization, X-Requested-With',
    contentType: 'application/json; charset=utf-8'
  };
}

/**
 * 生产环境 CORS 配置
 */
function getProductionCorsConfig(): CorsConfig {
  // 生产环境可以配置特定的允许域名
  const allowedOrigins = EnvUtils.get('ALLOWED_ORIGINS', '*');
  
  return {
    origin: allowedOrigins,
    methods: 'GET, POST, OPTIONS',
    headers: 'Content-Type, Authorization',
    contentType: 'application/json; charset=utf-8'
  };
}

/**
 * Deno Deploy 环境 CORS 配置
 */
function getDeployCorsConfig(): CorsConfig {
  return {
    origin: '*', // Deno Deploy 通常允许所有源
    methods: 'GET, POST, OPTIONS',
    headers: 'Content-Type',
    contentType: 'application/json; charset=utf-8'
  };
}

/**
 * 默认 CORS 配置
 */
function getDefaultCorsConfig(): CorsConfig {
  return {
    origin: CORS_CONFIG.ALLOWED_ORIGINS,
    methods: CORS_CONFIG.ALLOWED_METHODS,
    headers: CORS_CONFIG.ALLOWED_HEADERS,
    contentType: CORS_CONFIG.DEFAULT_CONTENT_TYPE
  };
}

/**
 * 获取 CORS 头部对象
 * @param environment 环境类型
 * @returns Record<string, string> CORS 头部
 */
export function getCorsHeaders(environment?: Environment): Record<string, string> {
  const config = getCorsConfig(environment);
  
  return {
    'Access-Control-Allow-Origin': config.origin,
    'Access-Control-Allow-Methods': config.methods,
    'Access-Control-Allow-Headers': config.headers,
    'Content-Type': config.contentType
  };
}

/**
 * 获取预检请求的 CORS 头部
 * @param environment 环境类型
 * @returns Record<string, string> 预检请求头部
 */
export function getPreflightHeaders(environment?: Environment): Record<string, string> {
  const config = getCorsConfig(environment);
  
  return {
    'Access-Control-Allow-Origin': config.origin,
    'Access-Control-Allow-Methods': config.methods,
    'Access-Control-Allow-Headers': config.headers,
    'Access-Control-Max-Age': '86400' // 24小时
  };
}

/**
 * 检查请求源是否被允许
 * @param origin 请求源
 * @param environment 环境类型
 * @returns boolean 是否允许
 */
export function isOriginAllowed(origin: string, environment?: Environment): boolean {
  const config = getCorsConfig(environment);
  
  // 如果配置为 '*'，允许所有源
  if (config.origin === '*') {
    return true;
  }
  
  // 检查是否在允许的源列表中
  const allowedOrigins = config.origin.split(',').map(o => o.trim());
  return allowedOrigins.includes(origin);
}

/**
 * 检查请求方法是否被允许
 * @param method HTTP 方法
 * @param environment 环境类型
 * @returns boolean 是否允许
 */
export function isMethodAllowed(method: string, environment?: Environment): boolean {
  const config = getCorsConfig(environment);
  const allowedMethods = config.methods.split(',').map(m => m.trim().toUpperCase());
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * 创建 CORS 响应
 * @param body 响应体
 * @param status 状态码
 * @param environment 环境类型
 * @returns Response CORS 响应
 */
export function createCorsResponse(
  body: string | null = null,
  status = 200,
  environment?: Environment
): Response {
  const headers = getCorsHeaders(environment);
  
  return new Response(body, {
    status,
    headers
  });
}

/**
 * 创建预检响应
 * @param environment 环境类型
 * @returns Response 预检响应
 */
export function createPreflightResponse(environment?: Environment): Response {
  const headers = getPreflightHeaders(environment);
  
  return new Response(null, {
    status: 200,
    headers
  });
}

/**
 * CORS 中间件配置
 */
export interface CorsMiddlewareOptions {
  /** 环境类型 */
  environment?: Environment;
  /** 是否启用预检请求处理 */
  enablePreflight?: boolean;
  /** 自定义 CORS 配置 */
  customConfig?: Partial<CorsConfig>;
}

/**
 * 应用 CORS 配置到响应
 * @param response 原始响应
 * @param options CORS 选项
 * @returns Response 应用 CORS 后的响应
 */
export function applyCors(response: Response, options: CorsMiddlewareOptions = {}): Response {
  const { environment, customConfig } = options;
  
  let config = getCorsConfig(environment);
  
  // 如果有自定义配置，合并配置
  if (customConfig) {
    config = { ...config, ...customConfig };
  }
  
  // 创建新的头部对象
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', config.origin);
  headers.set('Access-Control-Allow-Methods', config.methods);
  headers.set('Access-Control-Allow-Headers', config.headers);
  
  // 如果原响应没有 Content-Type，设置默认值
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', config.contentType);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}