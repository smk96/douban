/**
 * 电影搜索模块
 * 
 * 提供豆瓣电影搜索功能，包括主搜索和备用搜索策略
 */

import { 
  SearchResult, 
  DoubanScraperError,
  ErrorFactory,
  DOUBAN_CONFIG,
  REGEX_PATTERNS,
  StringUtils
} from '../shared/index.ts';
import { fetchText, fetchJson } from './http.ts';

/**
 * 搜索电影
 * @param movieName 电影名称
 * @returns Promise<SearchResult[]> 搜索结果列表
 */
export async function searchMovie(movieName: string): Promise<SearchResult[]> {
  if (!movieName || typeof movieName !== 'string' || movieName.trim().length === 0) {
    throw ErrorFactory.createInvalidArgsError('电影名称不能为空');
  }

  const cleanMovieName = StringUtils.cleanWhitespace(movieName.trim());
  
  try {
    console.log(`🔍 开始搜索电影: "${cleanMovieName}"`);
    
    // 首先尝试主搜索方法
    let results = await searchMovieMain(cleanMovieName);
    
    if (results.length === 0) {
      console.log('🔄 主搜索无结果，尝试备用搜索...');
      results = await searchMovieBackup(cleanMovieName);
    }
    
    console.log(`📊 搜索完成，找到 ${results.length} 个结果`);
    return results;
    
  } catch (error) {
    throw ErrorFactory.createNetworkError(
      `搜索电影失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 主搜索方法 - 使用豆瓣搜索API
 * @param movieName 电影名称
 * @returns Promise<SearchResult[]>
 */
async function searchMovieMain(movieName: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `${DOUBAN_CONFIG.SEARCH_URL}?q=${encodeURIComponent(movieName)}`;
    console.log(`📡 请求搜索API: ${searchUrl}`);
    
    const data = await fetchJson<{ title: string; url: string; id: string }[]>(searchUrl);
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ API返回数据格式异常');
      return [];
    }
    
    return parseJsonSearchResults(data);
    
  } catch (error) {
    console.warn(`⚠️ 主搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * 备用搜索方法 - 直接搜索豆瓣网页
 * @param movieName 电影名称
 * @returns Promise<SearchResult[]>
 */
async function searchMovieBackup(movieName: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `${DOUBAN_CONFIG.BASE_URL}/search?q=${encodeURIComponent(movieName)}`;
    console.log(`📡 请求搜索页面: ${searchUrl}`);
    
    const html = await fetchText(searchUrl);
    return parseHtmlSearchResults(html);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`备用搜索失败: ${errorMessage}`);
    return [];
  }
}

/**
 * 解析JSON搜索结果
 * @param data API返回的JSON数据
 * @returns SearchResult[]
 */
function parseJsonSearchResults(data: { title: string; url: string; id: string }[]): SearchResult[] {
  try {
    const results: SearchResult[] = [];
    
    for (const item of data) {
      if (!item.title || !item.url) {
        continue;
      }
      
      // 提取电影ID
      const idMatch = item.url.match(REGEX_PATTERNS.MOVIE_ID);
      const id = idMatch ? idMatch[1] : item.id || '';
      
      if (id) {
        results.push({
          id,
          url: item.url.startsWith('http') ? item.url : `${DOUBAN_CONFIG.BASE_URL}${item.url}`,
          title: StringUtils.cleanWhitespace(StringUtils.stripHtml(item.title))
        });
      }
    }
    
    console.log(`✅ JSON搜索解析完成，获得 ${results.length} 个有效结果`);
    return results;
    
  } catch (error) {
    throw ErrorFactory.createParseError(
      `解析JSON搜索结果失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 解析HTML搜索结果
 * @param html 搜索页面HTML
 * @returns SearchResult[]
 */
function parseHtmlSearchResults(html: string): SearchResult[] {
  try {
    const results: SearchResult[] = [];
    
    // 使用正则表达式提取搜索结果
    const resultPattern = /<div class="item-root">[\s\S]*?<a[^>]*href="([^"]*subject\/(\d+)\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/g;
    
    let match;
    while ((match = resultPattern.exec(html)) !== null) {
      try {
        const [, url, id, title] = match;
        
        if (id && title) {
          results.push({
            id,
            url: url.startsWith('http') ? url : `${DOUBAN_CONFIG.BASE_URL}${url}`,
            title: StringUtils.cleanWhitespace(StringUtils.stripHtml(title))
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ 跳过解析失败的搜索结果: ${errorMessage}`);
        continue;
      }
    }
    
    console.log(`✅ HTML搜索解析完成，获得 ${results.length} 个有效结果`);
    return results;
    
  } catch (error) {
    throw ErrorFactory.createParseError(
      `解析搜索结果失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 选择最佳匹配结果
 * @param results 搜索结果列表
 * @param movieName 原始电影名称
 * @returns SearchResult 最佳匹配结果
 */
export function selectBestMatch(results: SearchResult[], movieName: string): SearchResult {
  if (results.length === 0) {
    throw ErrorFactory.createNoResultsError(movieName);
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  const cleanMovieName = StringUtils.cleanWhitespace(movieName.toLowerCase());
  
  // 计算相似度分数
  const scoredResults = results.map(result => {
    const cleanTitle = StringUtils.cleanWhitespace(result.title.toLowerCase());
    const similarity = calculateSimilarity(cleanMovieName, cleanTitle);
    
    return {
      result,
      score: similarity
    };
  });
  
  // 按分数排序，选择最高分
  scoredResults.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredResults[0].result;
  console.log(`🎯 选择最佳匹配: "${bestMatch.title}" (相似度: ${scoredResults[0].score.toFixed(2)})`);
  
  return bestMatch;
}

/**
 * 计算字符串相似度
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns number 相似度分数 (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  // 完全匹配
  if (str1 === str2) {
    return 1.0;
  }
  
  // 包含匹配
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }
  
  // 使用简单的编辑距离算法
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
}

/**
 * 计算编辑距离
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns number 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 验证搜索结果
 * @param results 搜索结果列表
 * @returns boolean 是否有效
 */
export function validateSearchResults(results: SearchResult[]): boolean {
  if (!Array.isArray(results)) {
    return false;
  }
  
  return results.every(result => 
    result &&
    typeof result.id === 'string' &&
    typeof result.url === 'string' &&
    typeof result.title === 'string' &&
    result.id.length > 0 &&
    result.url.length > 0 &&
    result.title.length > 0
  );
}