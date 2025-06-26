/**
 * 豆瓣电影爬虫 - 工具函数
 * 
 * 提供通用的工具函数和辅助方法
 */

import { Environment, RunMode } from './types.ts';
import { ENV_VARS } from './constants.ts';

/**
 * 字符串工具函数
 */
export class StringUtils {
  /**
   * 清理HTML标签
   */
  static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * 清理多余的空白字符
   */
  static cleanWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * 截断字符串
   */
  static truncate(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 首字母大写
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * 驼峰命名转换
   */
  static toCamelCase(text: string): string {
    return text.replace(/[-_\s]+(.)?/g, (_, char) => 
      char ? char.toUpperCase() : ''
    );
  }
}

/**
 * 数组工具函数
 */
export class ArrayUtils {
  /**
   * 去重
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * 分块
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 随机打乱
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 安全获取数组元素
   */
  static safeGet<T>(array: T[], index: number, defaultValue?: T): T | undefined {
    return array[index] ?? defaultValue;
  }
}

/**
 * 对象工具函数
 */
export class ObjectUtils {
  /**
   * 深度克隆
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => ObjectUtils.deepClone(item)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = ObjectUtils.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * 合并对象
   */
  static merge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
    const result = { ...target };
    
    for (const source of sources) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          const value = source[key];
          if (value !== undefined) {
            result[key] = value as T[Extract<keyof T, string>];
          }
        }
      }
    }
    
    return result;
  }

  /**
   * 获取嵌套属性值
   */
  static get<T>(obj: Record<string, unknown>, path: string, defaultValue?: T): T | undefined {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key] as Record<string, unknown>;
      } else {
        return defaultValue;
      }
    }
    
    return current as T;
  }

  /**
   * 检查对象是否为空
   */
  static isEmpty(obj: Record<string, unknown>): boolean {
    return Object.keys(obj).length === 0;
  }
}

/**
 * 时间工具函数
 */
export class TimeUtils {
  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化时间戳
   */
  static formatTimestamp(timestamp: number, format = 'YYYY-MM-DD HH:mm:ss'): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取当前时间戳
   */
  static now(): number {
    return Date.now();
  }

  /**
   * 计算执行时间
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = TimeUtils.now();
    const result = await fn();
    const duration = TimeUtils.now() - start;
    return { result, duration };
  }
}

/**
 * 环境工具函数
 */
export class EnvUtils {
  /**
   * 获取环境变量
   */
  static get(key: string, defaultValue?: string): string | undefined {
    return Deno.env.get(key) ?? defaultValue;
  }

  /**
   * 检查是否为生产环境
   */
  static isProduction(): boolean {
    const env = EnvUtils.get(ENV_VARS.ENVIRONMENT, 'development');
    return env === 'production';
  }

  /**
   * 检查是否为开发环境
   */
  static isDevelopment(): boolean {
    const env = EnvUtils.get(ENV_VARS.ENVIRONMENT, 'development');
    return env === 'development';
  }

  /**
   * 检查是否为部署环境
   */
  static isDeploy(): boolean {
    const env = EnvUtils.get(ENV_VARS.ENVIRONMENT, 'development');
    return env === 'deploy';
  }

  /**
   * 获取当前环境
   */
  static getEnvironment(): Environment {
    const env = EnvUtils.get(ENV_VARS.ENVIRONMENT, 'development');
    return env as Environment;
  }

  /**
   * 获取运行模式
   */
  static getRunMode(): RunMode {
    const mode = EnvUtils.get(ENV_VARS.MODE, 'cli');
    return mode as RunMode;
  }

  /**
   * 检查是否启用调试模式
   */
  static isDebugEnabled(): boolean {
    const debug = EnvUtils.get(ENV_VARS.DEBUG, 'false');
    return debug.toLowerCase() === 'true';
  }
}

/**
 * URL 工具函数
 */
export class UrlUtils {
  /**
   * 构建查询字符串
   */
  static buildQuery(params: Record<string, string | number | boolean>): string {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    
    return searchParams.toString();
  }

  /**
   * 解析查询字符串
   */
  static parseQuery(query: string): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(query);
    
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }

  /**
   * 组合URL路径
   */
  static joinPath(...parts: string[]): string {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, ''))
      .filter(part => part.length > 0)
      .join('/');
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 验证工具函数
 */
export class ValidationUtils {
  /**
   * 验证电影名称
   */
  static isValidMovieName(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0;
  }

  /**
   * 验证端口号
   */
  static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * 验证运行模式
   */
  static isValidRunMode(mode: string): mode is RunMode {
    return ['cli', 'server', 'deploy'].includes(mode);
  }

  /**
   * 验证环境类型
   */
  static isValidEnvironment(env: string): env is Environment {
    return ['development', 'production', 'deploy'].includes(env);
  }
}