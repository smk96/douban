/**
 * 豆瓣电影爬虫 - 核心业务逻辑模块入口
 * 
 * 统一导出所有核心业务功能
 */

// HTTP 客户端相关
export {
  HttpClient,
  httpClient,
  fetchWithRetry,
  fetchText,
  fetchJson
} from './http.ts';

// 搜索功能相关
export {
  searchMovie,
  selectBestMatch,
  validateSearchResults
} from './search.ts';

// 解析功能相关
export {
  getMovieInfo,
  validateMovieInfo,
  cleanMovieInfo
} from './parser.ts';