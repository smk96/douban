/**
 * HTTP请求工具模块
 * 
 * 提供稳定可靠的HTTP请求功能，包括重试机制、超时控制、错误处理等
 */

import { 
  HttpRequestOptions, 
  DoubanScraperError, 
  ErrorType,
  ErrorFactory,
  HTTP_CONFIG,
  DOUBAN_CONFIG
} from '../shared/index.ts';

/**
 * HTTP客户端类
 */
export class HttpClient {
  private userAgent: string;
  private timeout: number;
  private maxRetries: number;

  constructor(options?: Partial<HttpRequestOptions>) {
    this.userAgent = DOUBAN_CONFIG.USER_AGENT;
    this.timeout = options?.timeout || HTTP_CONFIG.DEFAULT_TIMEOUT;
    this.maxRetries = options?.retries || HTTP_CONFIG.MAX_RETRIES;
  }

  /**
   * 发送HTTP请求
   * @param url 请求URL
   * @param options 请求选项
   * @returns Promise<Response>
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const requestOptions = this.buildRequestOptions(options);
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, requestOptions);
        
        // 检查响应状态
        if (response.ok) {
          return response;
        }
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === this.maxRetries) {
          throw ErrorFactory.createNetworkError(
            `HTTP请求失败: ${response.status} ${response.statusText}`
          );
        }
        
        // 对于某些状态码，不进行重试
        if (this.shouldNotRetry(response.status)) {
          throw ErrorFactory.createNetworkError(
            `HTTP请求失败: ${response.status} ${response.statusText}`
          );
        }
        
      } catch (error) {
        // 如果是最后一次尝试，抛出错误
        if (attempt === this.maxRetries) {
          if (error instanceof DoubanScraperError) {
            throw error;
          }
          throw ErrorFactory.createNetworkError(
            `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined
          );
        }
        
        // 等待后重试
        await this.delay(HTTP_CONFIG.RETRY_DELAY * (attempt + 1));
      }
    }
    
    throw ErrorFactory.createNetworkError('网络请求失败，已达到最大重试次数');
  }

  /**
   * 获取网页内容
   * @param url 网页URL
   * @returns Promise<string> 网页HTML内容
   */
  async fetchText(url: string): Promise<string> {
    const response = await this.fetch(url);
    return await response.text();
  }

  /**
   * 获取JSON数据
   * @param url API URL
   * @returns Promise<T> JSON数据
   */
  async fetchJson<T = unknown>(url: string): Promise<T> {
    const response = await this.fetch(url);
    return await response.json() as T;
  }

  /**
   * 构建请求选项
   * @param options 用户提供的选项
   * @returns RequestInit 完整的请求选项
   */
  private buildRequestOptions(options?: RequestInit): RequestInit {
    const defaultHeaders = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    return {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers
      }
    };
  }

  /**
   * 带超时的fetch请求
   * @param url 请求URL
   * @param options 请求选项
   * @returns Promise<Response>
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw ErrorFactory.createNetworkError(`请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 判断是否不应该重试
   * @param status HTTP状态码
   * @returns boolean
   */
  private shouldNotRetry(status: number): boolean {
    // 4xx客户端错误通常不应该重试
    return status >= 400 && status < 500;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置用户代理
   * @param userAgent 用户代理字符串
   */
  setUserAgent(userAgent: string): void {
    this.userAgent = userAgent;
  }

  /**
   * 设置超时时间
   * @param timeout 超时时间（毫秒）
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * 设置最大重试次数
   * @param retries 重试次数
   */
  setMaxRetries(retries: number): void {
    this.maxRetries = retries;
  }
}

/**
 * 创建默认的HTTP客户端实例
 */
export const httpClient = new HttpClient();

/**
 * 便捷的HTTP请求函数
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise<Response>
 */
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  return await httpClient.fetch(url, options);
}

/**
 * 便捷的文本获取函数
 * @param url 请求URL
 * @returns Promise<string>
 */
export async function fetchText(url: string): Promise<string> {
  return await httpClient.fetchText(url);
}

/**
 * 便捷的JSON获取函数
 * @param url 请求URL
 * @returns Promise<T>
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  return await httpClient.fetchJson<T>(url);
}