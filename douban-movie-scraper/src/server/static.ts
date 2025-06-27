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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            background-attachment: fixed;
            min-height: 100vh;
            padding: 20px;
            position: relative;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%);
            pointer-events: none;
            z-index: 1;
        }
        
        .container {
            max-width: 650px;
            margin: 0 auto;
            padding-top: 30px;
            position: relative;
            z-index: 2;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            color: white;
            font-size: 2.8rem;
            font-weight: 300;
            margin-bottom: 10px;
            text-shadow: 0 4px 20px rgba(0,0,0,0.3);
            letter-spacing: -0.5px;
            background: linear-gradient(45deg, #fff, #f0f8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .search-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2);
            margin-bottom: 30px;
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .search-form {
            display: flex;
            gap: 16px;
            align-items: flex-end;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: #2d3748;
            font-size: 15px;
            letter-spacing: 0.3px;
        }
        
        .form-group input {
            width: 100%;
            padding: 14px 18px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: rgba(255,255,255,0.9);
            color: #2d3748;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            background: white;
            transform: translateY(-1px);
        }
        
        .form-group input::placeholder {
            color: #a0aec0;
        }
        
        .search-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .search-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #5a6fd8 0%, #6b46c1 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }
        
        .search-btn:active {
            transform: translateY(0);
        }
        
        .search-btn:disabled {
            background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .result-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2);
            margin-top: 24px;
            border: 1px solid rgba(255,255,255,0.3);
            animation: slideUp 0.5s ease-out;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .movie-info {
            display: flex;
            gap: 24px;
        }
        
        .movie-poster {
            flex-shrink: 0;
        }
        
        .movie-poster img {
            width: 130px;
            height: 170px;
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }
        
        .movie-poster img:hover {
            transform: scale(1.05);
        }
        
        .movie-details {
            flex: 1;
        }
        
        .movie-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 16px;
            line-height: 1.3;
        }
        
        .movie-title a {
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .movie-title a:hover {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .movie-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .meta-item {
            font-size: 14px;
            color: #4a5568;
            padding: 8px 0;
            border-bottom: 1px solid rgba(226, 232, 240, 0.6);
        }
        
        .meta-label {
            font-weight: 600;
            color: #2d3748;
            margin-right: 8px;
            display: inline-block;
            min-width: 50px;
        }
        
        .meta-item:nth-child(1) .meta-label {
            color: #f56565;
        }
        
        .meta-item:nth-child(2) .meta-label {
            color: #38b2ac;
        }
        
        .meta-item:nth-child(3) .meta-label {
            color: #9f7aea;
        }
        
        .meta-item:nth-child(4) .meta-label {
            color: #ed8936;
        }
        
        .movie-summary {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid rgba(226, 232, 240, 0.6);
        }
        
        .summary-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 12px;
            font-size: 16px;
        }
        
        .summary-text {
            color: #4a5568;
            line-height: 1.7;
            font-size: 14px;
        }
        
        .loading {
            text-align: center;
            color: #667eea;
            padding: 50px;
            font-size: 18px;
            font-weight: 500;
        }
        
        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #667eea;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        
        .error {
            background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
            color: #c53030;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #e53e3e;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(229, 62, 62, 0.2);
        }
        
        @media (max-width: 768px) {
            .container {
                padding-top: 20px;
            }
            
            .header h1 {
                font-size: 2.2rem;
            }
            
            .search-card {
                padding: 24px;
            }
            
            .search-form {
                flex-direction: column;
                gap: 20px;
            }
            
            .movie-info {
                flex-direction: column;
                text-align: center;
            }
            
            .movie-poster {
                align-self: center;
            }
            
            .movie-meta {
                grid-template-columns: 1fr;
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

            // 格式化标题，添加《》书名号和年份
            const titleWithYear = \`《\${movie.title}》(\${movie.year})\`;

            resultDiv.innerHTML = \`
                <div class="result-card">
                    <div class="movie-info">
                        <div class="movie-poster">
                            <img src="\${posterUrl}" alt="\${movie.title}" onerror="this.style.display='none'">
                        </div>
                        <div class="movie-details">
                            <div class="movie-title">
                                <a href="\${movie.doubanUrl}" target="_blank" rel="noopener noreferrer">\${titleWithYear}</a>
                            </div>
                            <div class="movie-meta">
                                <div class="meta-item">
                                    <span class="meta-label">评分:</span> \${movie.rating}
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">类型:</span> \${movie.genres.join(', ')}
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">导演:</span> \${movie.directors.join(', ')}
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