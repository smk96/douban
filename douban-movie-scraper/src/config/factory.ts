/**
 * 配置工厂模块
 * 
 * 提供创建完整应用配置的工厂函数
 */

import { Environment, RunMode, AppConfig } from '../shared/types.ts';
import { APP_INFO, HTTP_CONFIG, DOUBAN_CONFIG } from '../shared/constants.ts';
import { 
  detectEnvironment,
  getServerConfig,
  getCorsConfig,
  getFeatureFlags,
  getSecurityConfig,
  getLoggingConfig,
  getRequestLimitsConfig,
  getStaticFileConfig
} from './index.ts';

/**
 * 完整的应用配置接口
 */
export interface FullAppConfig {
  /** 应用基本信息 */
  app: {
    name: string;
    version: string;
    description: string;
    author: string;
  };
  
  /** 环境信息 */
  environment: {
    type: Environment;
    mode: RunMode;
    isProduction: boolean;
    isDevelopment: boolean;
    isDeploy: boolean;
    isDebug: boolean;
  };
  
  /** 服务器配置 */
  server: {
    port: number;
    hostname: string;
    production: boolean;
    baseUrl: string;
    endpoints: Record<string, string>;
  };
  
  /** CORS 配置 */
  cors: {
    origin: string;
    methods: string;
    headers: string;
    contentType: string;
  };
  
  /** HTTP 配置 */
  http: {
    timeout: number;
    maxRetries: number;
    userAgent: string;
    baseUrl: string;
  };
  
  /** 功能开关 */
  features: Record<string, boolean>;
  
  /** 安全配置 */
  security: Record<string, boolean>;
  
  /** 日志配置 */
  logging: Record<string, unknown>;
  
  /** 请求限制配置 */
  limits: Record<string, unknown>;
  
  /** 静态文件配置 */
  static: Record<string, unknown>;
}

/**
 * 创建完整的应用配置
 * @param environment 环境类型（可选）
 * @param mode 运行模式（可选）
 * @returns FullAppConfig 完整配置
 */
export function createAppConfig(environment?: Environment, mode?: RunMode): FullAppConfig {
  const envInfo = detectEnvironment();
  const env = environment || envInfo.environment;
  const runMode = mode || envInfo.mode;
  
  const serverConfig = getServerConfig(env, runMode);
  const corsConfig = getCorsConfig(env);
  const features = getFeatureFlags(env);
  const security = getSecurityConfig(env);
  const logging = getLoggingConfig(env);
  const limits = getRequestLimitsConfig(env);
  const staticConfig = getStaticFileConfig(env);
  
  // 构建基础 URL
  const baseUrl = runMode === 'deploy' 
    ? 'https://your-app.deno.dev' 
    : `http://${serverConfig.hostname}:${serverConfig.port}`;
  
  return {
    app: {
      name: APP_INFO.NAME,
      version: APP_INFO.VERSION,
      description: APP_INFO.DESCRIPTION,
      author: APP_INFO.AUTHOR
    },
    
    environment: {
      type: env,
      mode: runMode,
      isProduction: env === 'production',
      isDevelopment: env === 'development',
      isDeploy: env === 'deploy',
      isDebug: envInfo.isDebug
    },
    
    server: {
      port: serverConfig.port,
      hostname: serverConfig.hostname,
      production: serverConfig.production,
      baseUrl,
      endpoints: {
        home: baseUrl,
        api: `${baseUrl}/api/search`,
        health: `${baseUrl}/health`,
        imageProxy: `${baseUrl}/api/image-proxy`
      }
    },
    
    cors: corsConfig,
    
    http: {
      timeout: HTTP_CONFIG.DEFAULT_TIMEOUT,
      maxRetries: HTTP_CONFIG.MAX_RETRIES,
      userAgent: DOUBAN_CONFIG.USER_AGENT,
      baseUrl: DOUBAN_CONFIG.BASE_URL
    },
    
    features,
    security,
    logging,
    limits,
    static: staticConfig
  };
}

/**
 * 创建基础应用配置（用于核心模块）
 * @param environment 环境类型（可选）
 * @returns AppConfig 基础配置
 */
export function createBasicAppConfig(environment?: Environment): AppConfig {
  const env = environment || detectEnvironment().environment;
  
  return {
    userAgent: DOUBAN_CONFIG.USER_AGENT,
    timeout: HTTP_CONFIG.DEFAULT_TIMEOUT,
    maxRetries: HTTP_CONFIG.MAX_RETRIES,
    doubanBaseUrl: DOUBAN_CONFIG.BASE_URL
  };
}

/**
 * 验证应用配置
 * @param config 应用配置
 * @returns object 验证结果
 */
export function validateAppConfig(config: FullAppConfig) {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // 验证应用信息
  if (!config.app.name || !config.app.version) {
    issues.push('应用名称和版本不能为空');
  }
  
  // 验证服务器配置
  if (config.server.port < 0 || config.server.port > 65535) {
    issues.push(`无效的端口号: ${config.server.port}`);
  }
  
  // 验证 HTTP 配置
  if (config.http.timeout <= 0) {
    issues.push(`无效的超时时间: ${config.http.timeout}`);
  }
  
  if (config.http.maxRetries < 0) {
    issues.push(`无效的重试次数: ${config.http.maxRetries}`);
  }
  
  // 生产环境警告
  if (config.environment.isProduction) {
    if (config.environment.isDebug) {
      warnings.push('生产环境中启用了调试模式');
    }
    
    if (config.cors.origin === '*') {
      warnings.push('生产环境中允许所有源的 CORS 请求');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * 创建配置摘要字符串
 * @param config 应用配置
 * @returns string 配置摘要
 */
export function createConfigSummaryString(config: FullAppConfig): string {
  const lines = [
    `🎬 ${config.app.name} v${config.app.version}`,
    `🌍 环境: ${config.environment.type} (${config.environment.mode} 模式)`,
    `🚀 服务器启动中...`
  ];
  
  if (config.environment.mode !== 'cli') {
    lines.push(`📡 地址: ${config.server.baseUrl}`);
    
    if (config.environment.mode === 'server') {
      lines.push(`🔗 前端界面: ${config.server.endpoints.home}`);
    }
    
    lines.push(`🔗 API接口: ${config.server.endpoints.api}`);
  }
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

/**
 * 获取运行时配置
 * @returns FullAppConfig 运行时配置
 */
export function getRuntimeConfig(): FullAppConfig {
  return createAppConfig();
}

/**
 * 配置管理器类
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: FullAppConfig;
  
  private constructor() {
    this.config = createAppConfig();
  }
  
  /**
   * 获取配置管理器实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * 获取完整配置
   */
  getConfig(): FullAppConfig {
    return this.config;
  }
  
  /**
   * 获取应用配置
   */
  getAppConfig(): AppConfig {
    return {
      userAgent: this.config.http.userAgent,
      timeout: this.config.http.timeout,
      maxRetries: this.config.http.maxRetries,
      doubanBaseUrl: this.config.http.baseUrl
    };
  }
  
  /**
   * 重新加载配置
   */
  reload(environment?: Environment, mode?: RunMode): void {
    this.config = createAppConfig(environment, mode);
  }
  
  /**
   * 验证当前配置
   */
  validate() {
    return validateAppConfig(this.config);
  }
  
  /**
   * 获取配置摘要
   */
  getSummary(): string {
    return createConfigSummaryString(this.config);
  }
}