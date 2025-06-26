/**
 * 服务器中间件模块
 * 
 * 提供 CORS、错误处理、日志记录等中间件功能
 */

import { 
  DoubanScraperError,
  ErrorHandler,
  TimeUtils
} from '../shared/index.ts';
import { 
  getCorsHeaders,
  createPreflightResponse,
  getLoggingConfig,
  detectEnvironment
} from '../config/index.ts';

/**
 * 中间件函数类型
 */
export type MiddlewareFunction = (
  request: Request,
  next: () => Promise<Response>
) => Promise<Response>;

/**
 * 请求上下文接口
 */
export interface RequestContext {
  /** 请求对象 */
  request: Request;
  /** URL 对象 */
  url: URL;
  /** 路径名 */
  pathname: string;
  /** 查询参数 */
  searchParams: URLSearchParams;
  /** 请求开始时间 */
  startTime: number;
  /** 请求 ID */
  requestId: string;
  /** 客户端 IP */
  clientIp?: string;
  /** 用户代理 */
  userAgent?: string;
}

/**
 * 创建请求上下文
 * @param request HTTP 请求
 * @returns RequestContext 请求上下文
 */
export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);
  const headers = request.headers;
  
  return {
    request,
    url,
    pathname: url.pathname,
    searchParams: url.searchParams,
    startTime: TimeUtils.now(),
    requestId: generateRequestId(),
    clientIp: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown'
  };
}

/**
 * 生成请求 ID
 * @returns string 请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * CORS 中间件
 * @param request HTTP 请求
 * @param next 下一个处理器
 * @returns Promise<Response>
 */
export async function corsMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const method = request.method;
  
  // 处理预检请求
  if (method === 'OPTIONS') {
    return createPreflightResponse();
  }
  
  // 处理正常请求
  const response = await next();
  
  // 添加 CORS 头部，但不覆盖已有的 Content-Type
  const corsHeaders = getCorsHeaders();
  const headers = new Headers(response.headers);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    // 如果是 Content-Type 且响应已经有了，就不覆盖
    if (key.toLowerCase() === 'content-type' && headers.has('content-type')) {
      return;
    }
    headers.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * 错误处理中间件
 * @param request HTTP 请求
 * @param next 下一个处理器
 * @returns Promise<Response>
 */
export async function errorMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const context = createRequestContext(request);
  
  try {
    return await next();
  } catch (error) {
    return handleError(error, context);
  }
}

/**
 * 处理错误
 * @param error 错误对象
 * @param context 请求上下文
 * @returns Response 错误响应
 */
function handleError(error: unknown, context: RequestContext): Response {
  const scraperError = ErrorHandler.handle(error);
  const statusCode = ErrorHandler.getHttpStatusCode(scraperError);
  const corsHeaders = getCorsHeaders();
  
  // 记录错误日志
  logError(scraperError, context);
  
  // 创建错误响应
  const errorResponse = {
    success: false,
    error: ErrorHandler.formatForUser(scraperError),
    requestId: context.requestId,
    timestamp: new Date().toISOString()
  };
  
  // 在开发环境中包含更多错误信息
  const envInfo = detectEnvironment();
  if (envInfo.isDevelopment || envInfo.isDebug) {
    Object.assign(errorResponse, {
      details: scraperError.getDetails(),
      stack: scraperError.stack
    });
  }
  
  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: corsHeaders
  });
}

/**
 * 记录错误日志
 * @param error 错误对象
 * @param context 请求上下文
 */
function logError(error: DoubanScraperError, context: RequestContext): void {
  const logMessage = [
    `❌ [${context.requestId}]`,
    `${context.request.method} ${context.pathname}`,
    `- ${ErrorHandler.formatForLogging(error)}`,
    `- IP: ${context.clientIp}`,
    `- UA: ${context.userAgent}`
  ].join(' ');
  
  console.error(logMessage);
  
  // 在调试模式下输出堆栈跟踪
  const envInfo = detectEnvironment();
  if (envInfo.isDebug && error.stack) {
    console.error(error.stack);
  }
}

/**
 * 日志记录中间件
 * @param request HTTP 请求
 * @param next 下一个处理器
 * @returns Promise<Response>
 */
export async function loggingMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const context = createRequestContext(request);
  const loggingConfig = getLoggingConfig();
  
  // 记录请求开始
  if (loggingConfig.requestLogging) {
    logRequest(context);
  }
  
  try {
    const response = await next();
    
    // 记录请求完成
    if (loggingConfig.requestLogging) {
      logResponse(context, response);
    }
    
    return response;
  } catch (error) {
    // 错误会在 errorMiddleware 中处理
    throw error;
  }
}

/**
 * 记录请求日志
 * @param context 请求上下文
 */
function logRequest(context: RequestContext): void {
  const logMessage = [
    `📥 [${context.requestId}]`,
    `${context.request.method} ${context.pathname}`,
    `- IP: ${context.clientIp}`
  ].join(' ');
  
  console.log(logMessage);
}

/**
 * 记录响应日志
 * @param context 请求上下文
 * @param response HTTP 响应
 */
function logResponse(context: RequestContext, response: Response): void {
  const duration = TimeUtils.now() - context.startTime;
  const statusIcon = response.status >= 400 ? '❌' : '✅';
  
  const logMessage = [
    `📤 [${context.requestId}]`,
    `${context.request.method} ${context.pathname}`,
    `- ${response.status}`,
    `- ${duration}ms`
  ].join(' ');
  
  console.log(`${statusIcon} ${logMessage}`);
}

/**
 * 请求验证中间件
 * @param request HTTP 请求
 * @param next 下一个处理器
 * @returns Promise<Response>
 */
export async function validationMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const context = createRequestContext(request);
  
  // 验证请求方法
  const allowedMethods = ['GET', 'POST', 'OPTIONS'];
  if (!allowedMethods.includes(request.method)) {
    throw ErrorHandler.handle(new Error(`不支持的请求方法: ${request.method}`));
  }
  
  // 验证内容类型（对于 POST 请求）
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw ErrorHandler.handle(new Error('不支持的内容类型，请使用 application/json'));
    }
  }
  
  // 验证请求体大小
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 1024 * 1024; // 1MB
    if (size > maxSize) {
      throw ErrorHandler.handle(new Error('请求体过大'));
    }
  }
  
  return await next();
}

/**
 * 安全头部中间件
 * @param request HTTP 请求
 * @param next 下一个处理器
 * @returns Promise<Response>
 */
export async function securityMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const response = await next();
  const envInfo = detectEnvironment();
  
  // 只在生产环境添加安全头部
  if (!envInfo.isProduction) {
    return response;
  }
  
  const headers = new Headers(response.headers);
  
  // 添加安全头部
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * 组合多个中间件
 * @param middlewares 中间件数组
 * @returns MiddlewareFunction 组合后的中间件
 */
export function combineMiddlewares(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
    let index = 0;
    
    async function dispatch(): Promise<Response> {
      if (index >= middlewares.length) {
        return await next();
      }
      
      const middleware = middlewares[index++];
      return await middleware(request, dispatch);
    }
    
    return await dispatch();
  };
}

/**
 * 创建默认中间件栈
 * @returns MiddlewareFunction 默认中间件
 */
export function createDefaultMiddleware(): MiddlewareFunction {
  return combineMiddlewares(
    loggingMiddleware,
    corsMiddleware,
    securityMiddleware,
    validationMiddleware,
    errorMiddleware
  );
}

/**
 * 应用中间件到处理器
 * @param handler 请求处理器
 * @param middleware 中间件
 * @returns 包装后的处理器
 */
export function applyMiddleware(
  handler: (request: Request) => Promise<Response>,
  middleware: MiddlewareFunction = createDefaultMiddleware()
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    return await middleware(request, () => handler(request));
  };
}