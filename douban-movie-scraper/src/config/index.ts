/**
 * 豆瓣电影爬虫 - 配置管理模块入口
 * 
 * 统一导出所有配置管理功能
 */

// CORS 配置相关
export {
  getCorsConfig,
  getCorsHeaders,
  getPreflightHeaders,
  isOriginAllowed,
  isMethodAllowed,
  createCorsResponse,
  createPreflightResponse,
  applyCors,
  type CorsMiddlewareOptions
} from './cors.ts';

// 服务器配置相关
export {
  getServerConfig,
  getServeOptions,
  getServerInfo,
  validateServerConfig,
  getStaticFileConfig,
  getRequestLimitsConfig,
  getLoggingConfig,
  createConfigSummary
} from './server.ts';

// 环境配置相关
export {
  detectEnvironment,
  getFeatureFlags,
  getSecurityConfig,
  getEnvironmentVariables,
  validateEnvironmentConfig,
  createEnvironmentSummary,
  type EnvironmentInfo
} from './environment.ts';

// 配置工厂相关
export {
  createAppConfig,
  createBasicAppConfig,
  validateAppConfig,
  createConfigSummaryString,
  getRuntimeConfig,
  ConfigManager,
  type FullAppConfig
} from './factory.ts';

// 重新导出共享类型
export type {
  Environment,
  RunMode,
  ServerConfig,
  CorsConfig
} from '../shared/types.ts';