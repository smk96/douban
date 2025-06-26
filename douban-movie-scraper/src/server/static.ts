/**
 * 静态文件服务模块
 * 
 * 提供静态文件服务功能，包括 HTML、CSS、JS、图片等资源
 */

import { 
  ErrorFactory,
  CACHE_CONFIG,
  PATHS
} from '../shared/index.ts';
import { getStaticFileConfig, detectEnvironment } from '../config/index.ts';

/**
 * MIME 类型映射
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/**
 * 获取文件的 MIME 类型
 * @param filename 文件名
 * @returns string MIME 类型
 */
function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns string 扩展名
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * 解析静态文件路径
 * @param pathname 请求路径
 * @returns string 文件路径
 */
function resolveStaticPath(pathname: string): string {
  // 移除查询参数和片段
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // 处理根路径
  if (cleanPath === '/' || cleanPath === '/index.html') {
    return './static/index.html';
  }
  
  // 处理 /static/ 前缀
  if (cleanPath.startsWith('/static/')) {
    return '.' + cleanPath;
  }
  
  // 处理其他静态文件
  return `./static${cleanPath}`;
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns Promise<boolean> 是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(filePath);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * 读取文件内容
 * @param filePath 文件路径
 * @returns Promise<Uint8Array> 文件内容
 */
async function readFile(filePath: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(filePath);
  } catch (error) {
    throw ErrorFactory.createServerError(
      `读取文件失败: ${filePath}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 获取文件信息
 * @param filePath 文件路径
 * @returns Promise<Deno.FileInfo> 文件信息
 */
async function getFileInfo(filePath: string): Promise<Deno.FileInfo> {
  try {
    return await Deno.stat(filePath);
  } catch (error) {
    throw ErrorFactory.createServerError(
      `获取文件信息失败: ${filePath}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 生成 ETag
 * @param fileInfo 文件信息
 * @returns string ETag
 */
function generateETag(fileInfo: Deno.FileInfo): string {
  const mtime = fileInfo.mtime?.getTime() || 0;
  const size = fileInfo.size || 0;
  return `"${mtime.toString(16)}-${size.toString(16)}"`;
}

/**
 * 检查条件请求
 * @param request HTTP 请求
 * @param etag ETag 值
 * @param lastModified 最后修改时间
 * @returns boolean 是否未修改
 */
function checkConditionalRequest(
  request: Request, 
  etag: string, 
  lastModified: Date
): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  const ifModifiedSince = request.headers.get('if-modified-since');
  
  // 检查 ETag
  if (ifNoneMatch) {
    return ifNoneMatch === etag;
  }
  
  // 检查最后修改时间
  if (ifModifiedSince) {
    const clientTime = new Date(ifModifiedSince);
    return lastModified <= clientTime;
  }
  
  return false;
}

/**
 * 创建缓存头部
 * @param fileInfo 文件信息
 * @param config 静态文件配置
 * @returns Record<string, string> 头部对象
 */
function createCacheHeaders(
  fileInfo: Deno.FileInfo, 
  config: ReturnType<typeof getStaticFileConfig>
): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // 设置缓存控制
  if (config.maxAge > 0) {
    headers['Cache-Control'] = `public, max-age=${config.maxAge}`;
  } else {
    headers['Cache-Control'] = 'no-cache';
  }
  
  // 设置 ETag
  if (config.etag && fileInfo.mtime) {
    headers['ETag'] = generateETag(fileInfo);
  }
  
  // 设置最后修改时间
  if (config.lastModified && fileInfo.mtime) {
    headers['Last-Modified'] = fileInfo.mtime.toUTCString();
  }
  
  return headers;
}

/**
 * 处理静态文件请求
 * @param request HTTP 请求
 * @returns Promise<Response> 静态文件响应
 */
export async function handleStaticFile(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  
  // 只支持 GET 和 HEAD 方法
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD'
      }
    });
  }
  
  try {
    // 特殊处理根路径，直接返回 HTML 内容
    if (pathname === '/' || pathname === '/index.html') {
      const htmlContent = createDefaultIndexHtml();
      
      return new Response(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    const filePath = resolveStaticPath(pathname);
    
    // 检查文件是否存在
    if (!(await fileExists(filePath))) {
      return new Response('File Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // 获取文件信息
    const fileInfo = await getFileInfo(filePath);
    const config = getStaticFileConfig();
    
    // 创建缓存头部
    const cacheHeaders = createCacheHeaders(fileInfo, config);
    
    // 检查条件请求
    if (fileInfo.mtime) {
      const etag = cacheHeaders['ETag'];
      const isNotModified = checkConditionalRequest(request, etag, fileInfo.mtime);
      
      if (isNotModified) {
        return new Response(null, {
          status: 304,
          headers: cacheHeaders
        });
      }
    }
    
    // 获取 MIME 类型
    const mimeType = getMimeType(filePath);
    
    // 创建响应头部
    const headers = {
      'Content-Type': mimeType,
      'Content-Length': fileInfo.size?.toString() || '0',
      ...cacheHeaders
    };
    
    // HEAD 请求只返回头部
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers
      });
    }
    
    // 读取文件内容
    const content = await readFile(filePath);
    
    return new Response(content, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error(`静态文件服务错误 [${pathname}]:`, error);
    
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}

/**
 * 创建默认的 index.html 内容
 * @returns string HTML 内容
 */
export function createDefaultIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>豆瓣电影</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding-top: 30px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            color: white;
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
        }
        
        .search-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .search-form {
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .search-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s ease;
            white-space: nowrap;
        }
        
        .search-btn:hover:not(:disabled) {
            background: #5a6fd8;
        }
        
        .search-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .result-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        
        .movie-info {
            display: flex;
            gap: 20px;
        }
        
        .movie-poster {
            flex-shrink: 0;
        }
        
        .movie-poster img {
            width: 120px;
            height: 160px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .movie-details {
            flex: 1;
        }
        
        .movie-title {
            font-size: 1.4rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 12px;
            line-height: 1.3;
        }
        
        .movie-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .meta-item {
            font-size: 14px;
            color: #666;
        }
        
        .meta-label {
            font-weight: 500;
            color: #333;
        }
        
        .movie-summary {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }
        
        .summary-title {
            font-weight: 500;
            color: #333;
            margin-bottom: 8px;
        }
        
        .summary-text {
            color: #666;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .loading {
            text-align: center;
            color: #667eea;
            padding: 40px;
            font-size: 16px;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #c33;
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding-top: 20px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .search-card {
                padding: 20px;
            }
            
            .search-form {
                flex-direction: column;
                gap: 16px;
            }
            
            .movie-info {
                flex-direction: column;
                text-align: center;
            }
            
            .movie-poster {
                align-self: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 豆瓣电影</h1>
        </div>

        <div class="search-card">
            <form id="searchForm" class="search-form">
                <div class="form-group">
                    <label for="movieName">电影名称</label>
                    <input type="text" id="movieName" name="movieName" placeholder="如：毒舌律师" required>
                </div>
                <button type="submit" id="searchBtn" class="search-btn">🔍 搜索</button>
            </form>
        </div>

        <div id="result"></div>
    </div>

    <script>
        const form = document.getElementById('searchForm');
        const resultDiv = document.getElementById('result');
        const searchBtn = document.getElementById('searchBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const movieName = document.getElementById('movieName').value.trim();
            if (!movieName) return;

            searchBtn.disabled = true;
            searchBtn.textContent = '🔄 搜索中...';
            
            resultDiv.innerHTML = '<div class="result-card"><div class="loading">正在搜索电影信息...</div></div>';

            try {
                const response = await fetch('/api/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ movieName })
                });

                const data = await response.json();

                if (data.success) {
                    displayMovie(data.data);
                } else {
                    displayError(data.error || '搜索失败');
                }
            } catch (error) {
                displayError('网络请求失败: ' + error.message);
            } finally {
                searchBtn.disabled = false;
                searchBtn.textContent = '🔍 搜索';
            }
        });

        function displayMovie(movie) {
            const posterUrl = movie.poster.startsWith('http') 
                ? \`/api/image-proxy?url=\${encodeURIComponent(movie.poster)}\`
                : movie.poster;

            // 格式化标题，显示中文名和年份在一行
            const titleWithYear = \`\${movie.title} (\${movie.year})\`;

            resultDiv.innerHTML = \`
                <div class="result-card">
                    <div class="movie-info">
                        <div class="movie-poster">
                            <img src="\${posterUrl}" alt="\${movie.title}" onerror="this.style.display='none'">
                        </div>
                        <div class="movie-details">
                            <div class="movie-title">\${titleWithYear}</div>
                            <div class="movie-meta">
                                <div class="meta-item">
                                    <span class="meta-label">评分:</span> \${movie.rating}
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">类型:</span> \${movie.genres.join(', ')}
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">主演:</span> \${movie.actors.join(', ')}
                                </div>
                            </div>
                            <div class="movie-summary">
                                <div class="summary-title">简介</div>
                                <div class="summary-text">\${movie.summary}</div>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        function displayError(message) {
            resultDiv.innerHTML = \`
                <div class="result-card">
                    <div class="error">
                        <strong>错误:</strong> \${message}
                    </div>
                </div>
            \`;
        }
    </script>
</body>
</html>`;
}

/**
 * 确保静态文件目录存在
 * @returns Promise<void>
 */
export async function ensureStaticDirectory(): Promise<void> {
  try {
    await Deno.mkdir('./static', { recursive: true });
    
    // 如果 index.html 不存在，创建默认的
    if (!(await fileExists('./static/index.html'))) {
      const defaultHtml = createDefaultIndexHtml();
      await Deno.writeTextFile('./static/index.html', defaultHtml);
      console.log('✅ 创建了默认的 index.html 文件');
    }
  } catch (error) {
    console.warn('⚠️ 创建静态文件目录失败:', error);
  }
}