/**
 * 豆瓣电影爬虫 - 服务器模块入口
 * 
 * 统一导出所有服务器相关功能
 */

// 中间件相关
export {
  corsMiddleware,
  errorMiddleware,
  loggingMiddleware,
  validationMiddleware,
  securityMiddleware,
  combineMiddlewares,
  createDefaultMiddleware,
  applyMiddleware,
  createRequestContext,
  type MiddlewareFunction,
  type RequestContext
} from './middleware.ts';

// 请求处理器相关
export {
  handleApiDocs,
  handleMovieSearchApi,
  handleImageProxy,
  handleHealthCheck,
  handleNotFound,
  handleMethodNotAllowed,
  handleInternalError
} from './handlers.ts';

// 路由相关
export {
  handleRoute,
  matchRoute,
  getRouteInfo,
  addRoute,
  removeRoute,
  createRouter,
  getRouteDebugInfo,
  routes,
  type Route,
  type RouteHandler,
  type RouteMatch
} from './routes.ts';

// 静态文件服务相关
export {
  handleStaticFile,
  createDefaultIndexHtml,
  ensureStaticDirectory
} from './static.ts';