/**
 * 豆瓣电影爬虫 - 共享模块入口
 * 
 * 统一导出所有共享的类型、错误处理和常量
 */

// 导出所有类型定义
export type {
  MovieInfo,
  SearchResult,
  HttpRequestOptions,
  CliArgs,
  FormatOptions,
  AppConfig,
  ServerConfig,
  CorsConfig,
  Environment,
  RunMode,
  HttpMethod,
  ApiResponse
} from './types.ts';

// 导出错误处理相关
export {
  ErrorType,
  DoubanScraperError,
  ErrorFactory,
  ErrorHandler
} from './errors.ts';

// 导出所有常量
export {
  APP_INFO,
  DOUBAN_CONFIG,
  HTTP_CONFIG,
  SERVER_CONFIG,
  CORS_CONFIG,
  CACHE_CONFIG,
  PATHS,
  ENV_VARS,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CLI_CONFIG
} from './constants.ts';

// 导出工具函数
export {
  StringUtils,
  ArrayUtils,
  ObjectUtils,
  TimeUtils,
  EnvUtils,
  UrlUtils,
  ValidationUtils
} from './utils.ts';