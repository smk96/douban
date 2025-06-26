/**
 * 环境配置检测模块
 * 
 * 负责检测和管理不同的运行环境，提供环境特定的配置
 */

import { Environment, RunMode } from '../shared/types.ts';
import { ENV_VARS, APP_INFO } from '../shared/constants.ts';
import { EnvUtils, ValidationUtils } from '../shared/utils.ts';

/**
 * 环境检测结果接口
 */
export interface EnvironmentInfo {
  /** 环境类型 */
  environment: Environment;
  /** 运行模式 */
  mode: RunMode;
  /** 是否为生产环境 */
  isProduction: boolean;
  /** 是否为开发环境 */
  isDevelopment: boolean;
  /** 是否为部署环境 */
  isDeploy: boolean;
  /** 是否启用调试 */
  isDebug: boolean;
  /** Deno 版本信息 */
  denoVersion: string;
  /** 平台信息 */
  platform: string;
  /** 架构信息 */
  arch: string;
}

/**
 * 检测当前环境
 * @returns EnvironmentInfo 环境信息
 */
export function detectEnvironment(): EnvironmentInfo {
  const environment = determineEnvironment();
  const mode = determineRunMode();
  
  return {
    environment,
    mode,
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    isDeploy: environment === 'deploy',
    isDebug: EnvUtils.isDebugEnabled(),
    denoVersion: Deno.version.deno,
    platform: Deno.build.os,
    arch: Deno.build.arch
  };
}

/**
 * 确定环境类型
 * @returns Environment 环境类型
 */
function determineEnvironment(): Environment {
  // 优先使用环境变量
  const envVar = EnvUtils.get(ENV_VARS.ENVIRONMENT);
  if (envVar && ValidationUtils.isValidEnvironment(envVar)) {
    return envVar;
  }
  
  // 检测 Deno Deploy 环境
  if (isDenoDeployEnvironment()) {
    return 'deploy';
  }
  
  // 检测生产环境标志
  if (isProductionEnvironment()) {
    return 'production';
  }
  
  // 默认为开发环境
  return 'development';
}

/**
 * 确定运行模式
 * @returns RunMode 运行模式
 */
function determineRunMode(): RunMode {
  // 优先使用环境变量
  const modeVar = EnvUtils.get(ENV_VARS.MODE);
  if (modeVar && ValidationUtils.isValidRunMode(modeVar)) {
    return modeVar;
  }
  
  // 根据命令行参数检测
  const args = Deno.args;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // 检查 --mode 参数
    if (arg === '--mode' && i + 1 < args.length) {
      const mode = args[i + 1];
      if (ValidationUtils.isValidRunMode(mode)) {
        return mode;
      }
    }
    
    // 检查 --mode=value 格式
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1];
      if (ValidationUtils.isValidRunMode(mode)) {
        return mode;
      }
    }
  }
  
  // 检测 Deno Deploy 环境
  if (isDenoDeployEnvironment()) {
    return 'deploy';
  }
  
  // 检查是否有电影参数（CLI 模式）
  if (hasMovieArgument()) {
    return 'cli';
  }
  
  // 默认为服务器模式
  return 'server';
}

/**
 * 检测是否为 Deno Deploy 环境
 * @returns boolean
 */
function isDenoDeployEnvironment(): boolean {
  // Deno Deploy 特有的环境变量
  const deployIndicators = [
    'DENO_DEPLOYMENT_ID',
    'DENO_REGION',
    'DENO_DEPLOY'
  ];
  
  return deployIndicators.some(indicator => EnvUtils.get(indicator) !== undefined);
}

/**
 * 检测是否为生产环境
 * @returns boolean
 */
function isProductionEnvironment(): boolean {
  const prodIndicators = [
    EnvUtils.get('NODE_ENV') === 'production',
    EnvUtils.get('PRODUCTION') === 'true',
    EnvUtils.get('PROD') === 'true'
  ];
  
  return prodIndicators.some(indicator => indicator);
}

/**
 * 检查是否有电影参数
 * @returns boolean
 */
function hasMovieArgument(): boolean {
  const args = Deno.args;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // 检查 --movie 或 -m 参数
    if ((arg === '--movie' || arg === '-m') && i + 1 < args.length) {
      return true;
    }
    
    // 检查 --movie=value 格式
    if (arg.startsWith('--movie=')) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取环境特定的功能开关
 * @param environment 环境类型
 * @returns object 功能开关配置
 */
export function getFeatureFlags(environment?: Environment) {
  const env = environment || determineEnvironment();
  
  const baseFlags = {
    // 基础功能
    movieSearch: true,
    movieParser: true,
    imageProxy: true,
    
    // 开发功能
    debugLogging: false,
    detailedErrors: false,
    performanceMetrics: false,
    
    // 生产功能
    caching: false,
    compression: false,
    rateLimiting: false,
    
    // 实验性功能
    experimentalFeatures: false
  };
  
  switch (env) {
    case 'development':
      return {
        ...baseFlags,
        debugLogging: true,
        detailedErrors: true,
        performanceMetrics: true,
        experimentalFeatures: true
      };
      
    case 'production':
      return {
        ...baseFlags,
        caching: true,
        compression: true,
        rateLimiting: true
      };
      
    case 'deploy':
      return {
        ...baseFlags,
        caching: true,
        compression: true
      };
      
    default:
      return baseFlags;
  }
}

/**
 * 获取环境特定的安全配置
 * @param environment 环境类型
 * @returns object 安全配置
 */
export function getSecurityConfig(environment?: Environment) {
  const env = environment || determineEnvironment();
  
  const baseConfig = {
    // HTTPS 配置
    forceHttps: false,
    
    // 头部安全
    securityHeaders: false,
    
    // 内容安全策略
    contentSecurityPolicy: false,
    
    // 请求验证
    validateRequests: true,
    
    // 错误信息
    exposeErrors: true
  };
  
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        forceHttps: true,
        securityHeaders: true,
        contentSecurityPolicy: true,
        exposeErrors: false
      };
      
    case 'deploy':
      return {
        ...baseConfig,
        forceHttps: true,
        securityHeaders: true,
        exposeErrors: false
      };
      
    default:
      return baseConfig;
  }
}

/**
 * 获取环境变量配置
 * @returns object 环境变量配置
 */
export function getEnvironmentVariables() {
  return {
    // 应用配置
    mode: EnvUtils.get(ENV_VARS.MODE, 'server'),
    environment: EnvUtils.get(ENV_VARS.ENVIRONMENT, 'development'),
    debug: EnvUtils.get(ENV_VARS.DEBUG, 'false'),
    
    // 服务器配置
    port: EnvUtils.get(ENV_VARS.PORT, '8000'),
    hostname: EnvUtils.get(ENV_VARS.HOSTNAME, 'localhost'),
    
    // 外部服务配置
    allowedOrigins: EnvUtils.get('ALLOWED_ORIGINS', '*'),
    
    // Deno Deploy 特定
    deploymentId: EnvUtils.get('DENO_DEPLOYMENT_ID'),
    region: EnvUtils.get('DENO_REGION'),
    
    // 其他配置
    logLevel: EnvUtils.get('LOG_LEVEL', 'info'),
    maxRequestSize: EnvUtils.get('MAX_REQUEST_SIZE', '1048576') // 1MB
  };
}

/**
 * 验证环境配置
 * @param environment 环境类型
 * @returns object 验证结果
 */
export function validateEnvironmentConfig(environment?: Environment) {
  const env = environment || determineEnvironment();
  const envVars = getEnvironmentVariables();
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // 验证端口配置
  const port = parseInt(envVars.port, 10);
  if (!ValidationUtils.isValidPort(port)) {
    issues.push(`无效的端口号: ${envVars.port}`);
  }
  
  // 验证模式配置
  if (!ValidationUtils.isValidRunMode(envVars.mode)) {
    issues.push(`无效的运行模式: ${envVars.mode}`);
  }
  
  // 验证环境类型
  if (!ValidationUtils.isValidEnvironment(envVars.environment)) {
    issues.push(`无效的环境类型: ${envVars.environment}`);
  }
  
  // 生产环境特定检查
  if (env === 'production') {
    if (envVars.debug === 'true') {
      warnings.push('生产环境中启用了调试模式');
    }
    
    if (envVars.allowedOrigins === '*') {
      warnings.push('生产环境中允许所有源的 CORS 请求');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    environment: env,
    config: envVars
  };
}

/**
 * 创建环境信息摘要
 * @returns string 环境信息摘要
 */
export function createEnvironmentSummary(): string {
  const info = detectEnvironment();
  const envVars = getEnvironmentVariables();
  
  const lines = [
    `📊 环境信息摘要`,
    `=`.repeat(40),
    `🎯 应用: ${APP_INFO.NAME} v${APP_INFO.VERSION}`,
    `🌍 环境: ${info.environment}`,
    `🚀 模式: ${info.mode}`,
    `🔧 Deno: ${info.denoVersion}`,
    `💻 平台: ${info.platform}/${info.arch}`,
    `🐛 调试: ${info.isDebug ? '启用' : '禁用'}`,
    ``
  ];
  
  if (info.mode !== 'cli') {
    lines.push(`📡 端口: ${envVars.port}`);
    lines.push(`🏠 主机: ${envVars.hostname}`);
    lines.push(``);
  }
  
  if (info.isDeploy) {
    lines.push(`☁️ 部署ID: ${envVars.deploymentId || '未知'}`);
    lines.push(`🌐 区域: ${envVars.region || '未知'}`);
  }
  
  return lines.join('\n');
}