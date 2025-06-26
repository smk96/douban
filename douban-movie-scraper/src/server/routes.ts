/**
 * 路由定义模块
 * 
 * 定义应用的路由规则和处理器映射
 */

import {
  handleApiDocs,
  handleMovieSearchApi,
  handleImageProxy,
  handleHealthCheck,
  handleNotFound,
  handleMethodNotAllowed
} from './handlers.ts';
import { handleStaticFile } from './static.ts';

/**
 * 路由处理器类型
 */
export type RouteHandler = (request: Request) => Promise<Response>;

/**
 * 路由规则接口
 */
export interface Route {
  /** 路径模式 */
  pattern: string | RegExp;
  /** HTTP 方法 */
  method?: string | string[];
  /** 处理器函数 */
  handler: RouteHandler;
  /** 路由描述 */
  description?: string;
}

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  /** 匹配的路由 */
  route: Route;
  /** 路径参数 */
  params: Record<string, string>;
}

/**
 * 定义应用路由
 */
export const routes: Route[] = [
  // 电影搜索 API（优先级最高）
  {
    pattern: '/api/search',
    method: 'POST',
    handler: handleMovieSearchApi,
    description: '电影搜索接口'
  },
  
  // 图片代理 API
  {
    pattern: '/api/image-proxy',
    method: 'GET',
    handler: handleImageProxy,
    description: '图片代理服务'
  },
  
  // API 文档路由
  {
    pattern: '/api',
    method: 'GET',
    handler: handleApiDocs,
    description: 'API 文档和使用说明'
  },
  
  // 健康检查
  {
    pattern: '/health',
    method: ['GET', 'HEAD'],
    handler: handleHealthCheck,
    description: '服务健康检查'
  },
  
  // 静态文件路由（CSS、JS等）
  {
    pattern: /^\/static\/.+/,
    method: 'GET',
    handler: handleStaticFile,
    description: '静态资源文件'
  },
  
  // 通用静态文件路由
  {
    pattern: /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
    method: 'GET',
    handler: handleStaticFile,
    description: '静态资源文件'
  },
  
  // 兼容性路由
  {
    pattern: '/index.html',
    method: 'GET',
    handler: handleStaticFile,
    description: '前端界面主页'
  },
  
  // 主页路由（前端界面）- 放在最后作为默认路由
  {
    pattern: '/',
    method: 'GET',
    handler: handleStaticFile,
    description: '前端界面主页'
  }
];

/**
 * 匹配路由
 * @param pathname 请求路径
 * @param method HTTP 方法
 * @returns RouteMatch | null 匹配结果
 */
export function matchRoute(pathname: string, method: string): RouteMatch | null {
  for (const route of routes) {
    // 检查方法匹配
    if (route.method) {
      const allowedMethods = Array.isArray(route.method) ? route.method : [route.method];
      if (!allowedMethods.includes(method)) {
        continue;
      }
    }
    
    // 检查路径匹配
    const match = matchPath(pathname, route.pattern);
    if (match) {
      return {
        route,
        params: match.params
      };
    }
  }
  
  return null;
}

/**
 * 匹配路径
 * @param pathname 请求路径
 * @param pattern 路径模式
 * @returns object | null 匹配结果
 */
function matchPath(pathname: string, pattern: string | RegExp): { params: Record<string, string> } | null {
  if (typeof pattern === 'string') {
    // 精确匹配
    if (pathname === pattern) {
      return { params: {} };
    }
    
    // 参数匹配（如 /user/:id）
    const paramPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
    const regex = new RegExp(`^${paramPattern}$`);
    const match = pathname.match(regex);
    
    if (match) {
      const params: Record<string, string> = {};
      const paramNames = pattern.match(/:([^/]+)/g);
      
      if (paramNames) {
        paramNames.forEach((paramName, index) => {
          const key = paramName.slice(1); // 移除 ':'
          params[key] = match[index + 1];
        });
      }
      
      return { params };
    }
  } else {
    // 正则表达式匹配
    const match = pathname.match(pattern);
    if (match) {
      return { params: {} };
    }
  }
  
  return null;
}

/**
 * 路由处理器
 * @param request HTTP 请求
 * @returns Promise<Response> HTTP 响应
 */
export async function handleRoute(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  
  // 添加调试信息
  console.log(`🔍 路由匹配: ${method} ${pathname}`);
  
  // 匹配路由
  const routeMatch = matchRoute(pathname, method);
  
  if (routeMatch) {
    console.log(`✅ 匹配到路由: ${routeMatch.route.pattern} -> ${routeMatch.route.description}`);
    
    try {
      // 将路径参数添加到请求中（如果需要的话）
      if (Object.keys(routeMatch.params).length > 0) {
        // 可以通过某种方式传递参数，这里暂时不实现
      }
      
      return await routeMatch.route.handler(request);
    } catch (error) {
      console.error(`路由处理错误 [${pathname}]:`, error);
      throw error;
    }
  }
  
  console.log(`❌ 未匹配到路由: ${method} ${pathname}`);
  
  // 检查是否是方法不匹配
  const pathOnlyMatch = routes.find(route => {
    const match = matchPath(pathname, route.pattern);
    return match !== null;
  });
  
  if (pathOnlyMatch) {
    const allowedMethods = Array.isArray(pathOnlyMatch.method) 
      ? pathOnlyMatch.method 
      : pathOnlyMatch.method ? [pathOnlyMatch.method] : ['GET'];
    
    return await handleMethodNotAllowed(request, allowedMethods);
  }
  
  // 404 处理
  return await handleNotFound(request);
}

/**
 * 获取路由信息
 * @returns object 路由信息
 */
export function getRouteInfo() {
  return {
    totalRoutes: routes.length,
    routes: routes.map(route => ({
      pattern: route.pattern.toString(),
      method: route.method || 'ANY',
      description: route.description || '无描述'
    }))
  };
}

/**
 * 添加路由
 * @param route 路由配置
 */
export function addRoute(route: Route): void {
  routes.push(route);
}

/**
 * 移除路由
 * @param pattern 路径模式
 * @param method HTTP 方法
 */
export function removeRoute(pattern: string | RegExp, method?: string): boolean {
  const index = routes.findIndex(route => {
    const patternMatch = route.pattern === pattern || 
      (route.pattern instanceof RegExp && pattern instanceof RegExp && 
       route.pattern.toString() === pattern.toString());
    
    const methodMatch = !method || !route.method || 
      (Array.isArray(route.method) ? route.method.includes(method) : route.method === method);
    
    return patternMatch && methodMatch;
  });
  
  if (index !== -1) {
    routes.splice(index, 1);
    return true;
  }
  
  return false;
}

/**
 * 创建路由中间件
 * @returns RouteHandler 路由中间件
 */
export function createRouter(): RouteHandler {
  return handleRoute;
}

/**
 * 路由调试信息
 * @param request HTTP 请求
 * @returns object 调试信息
 */
export function getRouteDebugInfo(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  
  const routeMatch = matchRoute(pathname, method);
  
  return {
    pathname,
    method,
    matched: !!routeMatch,
    route: routeMatch?.route.pattern.toString(),
    params: routeMatch?.params || {},
    availableRoutes: routes.map(r => ({
      pattern: r.pattern.toString(),
      method: r.method
    }))
  };
}