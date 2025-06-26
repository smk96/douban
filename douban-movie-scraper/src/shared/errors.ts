/**
 * 豆瓣电影爬虫 - 错误处理模块
 * 
 * 定义了统一的错误类型和错误处理逻辑
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 网络请求错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 解析错误 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** 搜索无结果 */
  NO_RESULTS = 'NO_RESULTS',
  /** 参数错误 */
  INVALID_ARGS = 'INVALID_ARGS',
  /** 配置错误 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  /** 文件系统错误 */
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  /** 服务器错误 */
  SERVER_ERROR = 'SERVER_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 自定义错误类
 */
export class DoubanScraperError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DoubanScraperError';
    
    // 保持错误堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DoubanScraperError);
    }
  }

  /**
   * 获取错误的详细信息
   */
  getDetails(): {
    type: ErrorType;
    message: string;
    originalError?: string;
    stack?: string;
  } {
    return {
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }
}

/**
 * 错误工厂函数
 */
export class ErrorFactory {
  /**
   * 创建网络错误
   */
  static createNetworkError(message: string, originalError?: Error): DoubanScraperError {
    return new DoubanScraperError(ErrorType.NETWORK_ERROR, message, originalError);
  }

  /**
   * 创建解析错误
   */
  static createParseError(message: string, originalError?: Error): DoubanScraperError {
    return new DoubanScraperError(ErrorType.PARSE_ERROR, message, originalError);
  }

  /**
   * 创建搜索无结果错误
   */
  static createNoResultsError(movieName: string): DoubanScraperError {
    return new DoubanScraperError(
      ErrorType.NO_RESULTS,
      `未找到电影 "${movieName}" 的搜索结果`
    );
  }

  /**
   * 创建参数错误
   */
  static createInvalidArgsError(message: string): DoubanScraperError {
    return new DoubanScraperError(ErrorType.INVALID_ARGS, message);
  }

  /**
   * 创建配置错误
   */
  static createConfigError(message: string): DoubanScraperError {
    return new DoubanScraperError(ErrorType.CONFIG_ERROR, message);
  }

  /**
   * 创建服务器错误
   */
  static createServerError(message: string, originalError?: Error): DoubanScraperError {
    return new DoubanScraperError(ErrorType.SERVER_ERROR, message, originalError);
  }

  /**
   * 从未知错误创建标准错误
   */
  static fromUnknownError(error: unknown): DoubanScraperError {
    if (error instanceof DoubanScraperError) {
      return error;
    }

    if (error instanceof Error) {
      return new DoubanScraperError(
        ErrorType.UNKNOWN_ERROR,
        error.message,
        error
      );
    }

    return new DoubanScraperError(
      ErrorType.UNKNOWN_ERROR,
      String(error)
    );
  }
}

/**
 * 错误处理工具函数
 */
export class ErrorHandler {
  /**
   * 安全地处理错误，确保返回标准错误格式
   */
  static handle(error: unknown): DoubanScraperError {
    return ErrorFactory.fromUnknownError(error);
  }

  /**
   * 获取错误的 HTTP 状态码
   */
  static getHttpStatusCode(error: DoubanScraperError): number {
    switch (error.type) {
      case ErrorType.NO_RESULTS:
        return 404;
      case ErrorType.INVALID_ARGS:
        return 400;
      case ErrorType.NETWORK_ERROR:
        return 503;
      case ErrorType.PARSE_ERROR:
        return 502;
      case ErrorType.CONFIG_ERROR:
        return 500;
      case ErrorType.SERVER_ERROR:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * 格式化错误消息用于日志记录
   */
  static formatForLogging(error: DoubanScraperError): string {
    const details = error.getDetails();
    return `[${details.type}] ${details.message}${
      details.originalError ? ` (原因: ${details.originalError})` : ''
    }`;
  }

  /**
   * 格式化错误消息用于用户显示
   */
  static formatForUser(error: DoubanScraperError): string {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return `网络连接失败: ${error.message}`;
      case ErrorType.PARSE_ERROR:
        return `数据解析失败: ${error.message}`;
      case ErrorType.NO_RESULTS:
        return `搜索结果为空: ${error.message}`;
      case ErrorType.INVALID_ARGS:
        return `参数错误: ${error.message}`;
      case ErrorType.CONFIG_ERROR:
        return `配置错误: ${error.message}`;
      case ErrorType.SERVER_ERROR:
        return `服务器错误: ${error.message}`;
      default:
        return `未知错误: ${error.message}`;
    }
  }
}