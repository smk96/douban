/**
 * 豆瓣电影爬虫 - 应用常量定义
 * 
 * 定义了应用中使用的各种常量
 */

/**
 * 应用信息常量
 */
export const APP_INFO = {
  /** 应用名称 */
  NAME: '豆瓣电影爬虫',
  /** 应用版本 */
  VERSION: '2.0.0',
  /** 应用描述 */
  DESCRIPTION: '获取豆瓣电影信息的工具',
  /** 作者信息 */
  AUTHOR: 'Claude 4.0 sonnet',
  /** 仓库地址 */
  REPOSITORY: 'https://github.com/your-username/douban-movie-scraper'
} as const;

/**
 * 豆瓣网站相关常量
 */
export const DOUBAN_CONFIG = {
  /** 豆瓣基础URL */
  BASE_URL: 'https://movie.douban.com',
  /** 搜索API URL */
  SEARCH_URL: 'https://movie.douban.com/j/subject_suggest',
  /** 用户代理字符串 */
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  /** 请求头 */
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
} as const;

/**
 * HTTP 请求相关常量
 */
export const HTTP_CONFIG = {
  /** 默认超时时间（毫秒） */
  DEFAULT_TIMEOUT: 10000,
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 重试延迟（毫秒） */
  RETRY_DELAY: 1000,
  /** 连接超时时间（毫秒） */
  CONNECT_TIMEOUT: 5000
} as const;

/**
 * 服务器配置常量
 */
export const SERVER_CONFIG = {
  /** 默认端口 */
  DEFAULT_PORT: 8000,
  /** 默认主机名 */
  DEFAULT_HOSTNAME: 'localhost',
  /** 生产环境端口 */
  PRODUCTION_PORT: 8080,
  /** 静态文件目录 */
  STATIC_DIR: './static',
  /** 最大请求体大小 */
  MAX_BODY_SIZE: 1024 * 1024 // 1MB
} as const;

/**
 * CORS 配置常量
 */
export const CORS_CONFIG = {
  /** 允许的源 */
  ALLOWED_ORIGINS: '*',
  /** 允许的方法 */
  ALLOWED_METHODS: 'GET, POST, OPTIONS',
  /** 允许的头部 */
  ALLOWED_HEADERS: 'Content-Type, Authorization',
  /** 默认内容类型 */
  DEFAULT_CONTENT_TYPE: 'application/json; charset=utf-8'
} as const;

/**
 * 缓存配置常量
 */
export const CACHE_CONFIG = {
  /** 图片缓存时间（秒） */
  IMAGE_CACHE_TIME: 86400, // 24小时
  /** API 缓存时间（秒） */
  API_CACHE_TIME: 3600, // 1小时
  /** 静态文件缓存时间（秒） */
  STATIC_CACHE_TIME: 604800 // 7天
} as const;

/**
 * 文件路径常量
 */
export const PATHS = {
  /** 源代码目录 */
  SRC: './src',
  /** 静态文件目录 */
  STATIC: './static',
  /** 文档目录 */
  DOCS: './docs',
  /** 配置文件 */
  CONFIG: './deno.json',
  /** 主入口文件 */
  MAIN_ENTRY: './mod.ts'
} as const;

/**
 * 环境变量名称常量
 */
export const ENV_VARS = {
  /** 运行模式 */
  MODE: 'MODE',
  /** 端口号 */
  PORT: 'PORT',
  /** 主机名 */
  HOSTNAME: 'HOSTNAME',
  /** 调试模式 */
  DEBUG: 'DEBUG',
  /** 环境类型 */
  ENVIRONMENT: 'ENVIRONMENT'
} as const;

/**
 * 正则表达式常量
 */
export const REGEX_PATTERNS = {
  /** 电影ID提取 */
  MOVIE_ID: /\/subject\/(\d+)\//,
  /** 评分提取 */
  RATING: /(\d+\.\d+)/,
  /** 年份提取 */
  YEAR: /\((\d{4})\)/,
  /** 图片URL清理 */
  IMAGE_URL_CLEAN: /\?.*$/,
  /** HTML标签清理 */
  HTML_TAGS: /<[^>]*>/g
} as const;

/**
 * 错误消息常量
 */
export const ERROR_MESSAGES = {
  /** 网络错误 */
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  /** 解析错误 */
  PARSE_ERROR: '数据解析失败，可能是网站结构发生变化',
  /** 搜索无结果 */
  NO_RESULTS: '未找到相关电影，请尝试其他关键词',
  /** 参数错误 */
  INVALID_ARGS: '参数格式错误，请检查输入',
  /** 配置错误 */
  CONFIG_ERROR: '配置文件错误，请检查配置',
  /** 服务器错误 */
  SERVER_ERROR: '服务器内部错误',
  /** 未知错误 */
  UNKNOWN_ERROR: '发生未知错误'
} as const;

/**
 * 成功消息常量
 */
export const SUCCESS_MESSAGES = {
  /** 搜索成功 */
  SEARCH_SUCCESS: '电影搜索完成',
  /** 解析成功 */
  PARSE_SUCCESS: '电影信息解析完成',
  /** 服务器启动成功 */
  SERVER_START: '服务器启动成功',
  /** 任务完成 */
  TASK_COMPLETE: '任务执行完成'
} as const;

/**
 * CLI 相关常量
 */
export const CLI_CONFIG = {
  /** 帮助信息 */
  HELP_TEXT: `
${APP_INFO.NAME} v${APP_INFO.VERSION}

使用方法:
  deno run mod.ts [选项]

选项:
  --mode <mode>     运行模式 (cli|server|deploy)
  --movie <name>    电影名称 (CLI模式)
  --format <fmt>    输出格式 (text|json)
  --port <port>     服务器端口 (server模式)
  --help           显示帮助信息
  --version        显示版本信息

示例:
  deno run mod.ts --mode=cli --movie="阳光普照"
  deno run mod.ts --mode=server --port=8080
  deno run mod.ts --mode=deploy
`,
  /** 版本信息 */
  VERSION_TEXT: `${APP_INFO.NAME} v${APP_INFO.VERSION}`
} as const;