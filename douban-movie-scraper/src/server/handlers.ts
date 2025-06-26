/**
 * 请求处理器模块
 * 
 * 提供统一的 HTTP 请求处理器，包括 API 处理、图片代理等功能
 */

import { 
  MovieInfo,
  ApiResponse,
  DoubanScraperError,
  ErrorFactory,
  ErrorHandler,
  APP_INFO,
  CACHE_CONFIG
} from '../shared/index.ts';
import { searchMovie, selectBestMatch, getMovieInfo } from '../core/index.ts';
import { getCorsHeaders, detectEnvironment } from '../config/index.ts';

/**
 * 处理电影搜索请求
 * @param movieName 电影名称
 * @returns Promise<MovieInfo> 电影信息
 */
async function handleMovieSearch(movieName: string): Promise<MovieInfo> {
  try {
    console.log(`🔍 API请求 - 搜索电影: ${movieName}`);
    
    // 搜索电影
    const searchResults = await searchMovie(movieName);
    
    if (searchResults.length === 0) {
      throw ErrorFactory.createNoResultsError(movieName);
    }
    
    // 选择最佳匹配
    const bestMatch = selectBestMatch(searchResults, movieName);
    console.log(`📍 选择电影: ${bestMatch.title}`);
    
    // 获取详细信息
    const movieInfo = await getMovieInfo(bestMatch.url);
    
    console.log(`✅ 成功获取电影信息: ${movieInfo.title}`);
    return movieInfo;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ 搜索失败: ${errorMessage}`);
    throw error;
  }
}

/**
 * API 文档处理器
 * @param request HTTP 请求
 * @returns Promise<Response> API 文档响应
 */
export async function handleApiDocs(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const envInfo = detectEnvironment();
  
  const apiDoc = {
    name: `${APP_INFO.NAME} API`,
    version: APP_INFO.VERSION,
    description: APP_INFO.DESCRIPTION,
    author: APP_INFO.AUTHOR,
    environment: envInfo.environment,
    mode: envInfo.mode,
    endpoints: {
      'POST /api/search': {
        description: '搜索电影信息',
        body: {
          movieName: 'string - 电影名称（必需）'
        },
        response: {
          success: 'boolean - 请求是否成功',
          data: 'MovieInfo - 电影信息对象',
          error: 'string - 错误信息（失败时）'
        },
        example: {
          request: {
            movieName: '阳光普照'
          },
          response: {
            success: true,
            data: {
              title: '阳光普照',
              year: '2019',
              rating: '8.9',
              genres: ['剧情', '家庭'],
              actors: ['陈以文', '柯淑勤', '许光汉'],
              poster: 'https://img.douban.com/view/photo/s_ratio_poster/public/p2570243317.jpg',
              summary: '电影简介...'
            }
          }
        }
      },
      'GET /api/image-proxy': {
        description: '图片代理服务',
        params: {
          url: 'string - 图片URL（必需）'
        },
        response: '图片二进制数据',
        example: '/api/image-proxy?url=https://img.douban.com/view/photo/s_ratio_poster/public/p2570243317.jpg'
      },
      'GET /health': {
        description: '健康检查',
        response: {
          status: 'string - 服务状态',
          timestamp: 'string - 时间戳',
          version: 'string - 应用版本'
        }
      }
    },
    usage: {
      curl: `curl -X POST ${url.origin}/api/search -H "Content-Type: application/json" -d '{"movieName":"阳光普照"}'`,
      javascript: `
fetch('${url.origin}/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movieName: '阳光普照' })
})
.then(res => res.json())
.then(data => console.log(data));`
    }
  };
  
  return new Response(JSON.stringify(apiDoc, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

/**
 * 电影搜索 API 处理器
 * @param request HTTP 请求
 * @returns Promise<Response> 搜索结果响应
 */
export async function handleMovieSearchApi(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    const response: ApiResponse = {
      success: false,
      error: '请使用 POST 方法'
    };
    
    return new Response(JSON.stringify(response), {
      status: 405,
      headers: getCorsHeaders()
    });
  }
  
  try {
    const body = await request.json();
    const movieName = body.movieName;
    
    if (!movieName || typeof movieName !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: '请提供有效的电影名称'
      };
      
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: getCorsHeaders()
      });
    }
    
    const movieInfo = await handleMovieSearch(movieName);
    
    const response: ApiResponse<MovieInfo> = {
      success: true,
      data: movieInfo
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: getCorsHeaders()
    });
    
  } catch (error) {
    let errorMessage = '搜索失败';
    let statusCode = 500;
    
    if (error instanceof DoubanScraperError) {
      errorMessage = error.message;
      statusCode = ErrorHandler.getHttpStatusCode(error);
    }
    
    const response: ApiResponse = {
      success: false,
      error: errorMessage
    };
    
    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: getCorsHeaders()
    });
  }
}

/**
 * 图片代理处理器
 * @param request HTTP 请求
 * @returns Promise<Response> 图片响应
 */
export async function handleImageProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    const response: ApiResponse = {
      success: false,
      error: '缺少图片URL参数'
    };
    
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: getCorsHeaders()
    });
  }

  try {
    // 代理请求图片，设置正确的Referer
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://movie.douban.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`图片请求失败: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    let contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // 如果是webp格式，改为jpeg
    if (contentType.includes('webp')) {
      contentType = 'image/jpeg';
    }

    // 生成合适的文件名
    const imageUrlObj = new URL(imageUrl);
    const originalFilename = imageUrlObj.pathname.split('/').pop() || 'image';
    const filename = originalFilename.replace(/\.webp$/i, '.jpg');

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_CONFIG.IMAGE_CACHE_TIME}`,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('图片代理错误:', error);
    
    const response: ApiResponse = {
      success: false,
      error: '图片加载失败'
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: getCorsHeaders()
    });
  }
}

/**
 * 健康检查处理器
 * @param request HTTP 请求
 * @returns Promise<Response> 健康状态响应
 */
export async function handleHealthCheck(request: Request): Promise<Response> {
  const envInfo = detectEnvironment();
  
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_INFO.VERSION,
    environment: envInfo.environment,
    mode: envInfo.mode,
    uptime: process?.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
    memory: {
      used: Deno.memoryUsage ? `${Math.round(Deno.memoryUsage().heapUsed / 1024 / 1024)}MB` : 'unknown',
      total: Deno.memoryUsage ? `${Math.round(Deno.memoryUsage().heapTotal / 1024 / 1024)}MB` : 'unknown'
    }
  };
  
  return new Response(JSON.stringify(healthInfo, null, 2), {
    headers: getCorsHeaders()
  });
}

/**
 * 404 处理器
 * @param request HTTP 请求
 * @returns Promise<Response> 404 响应
 */
export async function handleNotFound(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  const response: ApiResponse = {
    success: false,
    error: 'Not Found',
    message: `路径 ${url.pathname} 不存在`,
    data: {
      availableEndpoints: [
        'GET /',
        'POST /api/search',
        'GET /api/image-proxy',
        'GET /health'
      ]
    }
  };
  
  return new Response(JSON.stringify(response), {
    status: 404,
    headers: getCorsHeaders()
  });
}

/**
 * 方法不允许处理器
 * @param request HTTP 请求
 * @param allowedMethods 允许的方法
 * @returns Promise<Response> 405 响应
 */
export async function handleMethodNotAllowed(
  request: Request, 
  allowedMethods: string[] = ['GET', 'POST', 'OPTIONS']
): Promise<Response> {
  const response: ApiResponse = {
    success: false,
    error: 'Method Not Allowed',
    message: `方法 ${request.method} 不被允许`,
    data: {
      allowedMethods
    }
  };
  
  const headers = getCorsHeaders();
  headers['Allow'] = allowedMethods.join(', ');
  
  return new Response(JSON.stringify(response), {
    status: 405,
    headers
  });
}

/**
 * 内部服务器错误处理器
 * @param error 错误对象
 * @param request HTTP 请求
 * @returns Promise<Response> 500 响应
 */
export async function handleInternalError(
  error: unknown, 
  request: Request
): Promise<Response> {
  const scraperError = ErrorHandler.handle(error);
  const envInfo = detectEnvironment();
  
  const response: ApiResponse = {
    success: false,
    error: 'Internal Server Error',
    message: ErrorHandler.formatForUser(scraperError)
  };
  
  // 在开发环境中包含更多错误信息
  if (envInfo.isDevelopment || envInfo.isDebug) {
    Object.assign(response, {
      details: scraperError.getDetails(),
      stack: scraperError.stack
    });
  }
  
  return new Response(JSON.stringify(response), {
    status: 500,
    headers: getCorsHeaders()
  });
}