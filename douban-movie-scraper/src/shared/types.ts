/**
 * 豆瓣电影爬虫 - 核心类型定义
 * 
 * 定义了电影信息、搜索结果、配置等核心数据结构
 */

/**
 * 电影基本信息接口
 */
export interface MovieInfo {
  /** 电影标题 */
  title: string;
  /** 上映年份 */
  year: string;
  /** 豆瓣评分 */
  rating: string;
  /** 电影类型列表 */
  genres: string[];
  /** 主演列表 */
  actors: string[];
  /** 电影封面图片URL */
  poster: string;
  /** 电影简介 */
  summary: string;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /** 电影ID */
  id: string;
  /** 电影详情页URL */
  url: string;
  /** 电影标题 */
  title: string;
}

/**
 * HTTP请求配置接口
 */
export interface HttpRequestOptions {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 命令行参数接口
 */
export interface CliArgs {
  /** 电影名称 */
  movie?: string;
  /** 显示帮助信息 */
  help?: boolean;
  /** 显示版本信息 */
  version?: boolean;
  /** 输出格式 */
  format?: 'text' | 'json';
  /** 运行模式 */
  mode?: 'cli' | 'server' | 'deploy';
}

/**
 * 格式化输出选项
 */
export interface FormatOptions {
  /** 输出格式 */
  format: 'text' | 'json';
  /** 是否显示颜色 */
  colorize?: boolean;
  /** 是否显示详细信息 */
  verbose?: boolean;
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  /** 默认User-Agent */
  userAgent: string;
  /** 请求超时时间 */
  timeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 豆瓣基础URL */
  doubanBaseUrl: string;
}

/**
 * 服务器配置接口
 */
export interface ServerConfig {
  /** 服务器端口 */
  port: number;
  /** 主机名 */
  hostname: string;
  /** 是否为生产环境 */
  production: boolean;
}

/**
 * CORS 配置接口
 */
export interface CorsConfig {
  /** 允许的源 */
  origin: string;
  /** 允许的方法 */
  methods: string;
  /** 允许的头部 */
  headers: string;
  /** 内容类型 */
  contentType: string;
}

/**
 * 环境类型
 */
export type Environment = 'development' | 'production' | 'deploy';

/**
 * 运行模式类型
 */
export type RunMode = 'cli' | 'server' | 'deploy';

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';

/**
 * 响应数据接口
 */
export interface ApiResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 响应消息 */
  message?: string;
}