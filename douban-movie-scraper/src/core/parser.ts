/**
 * 电影信息解析模块
 * 
 * 负责解析豆瓣电影详情页面，提取电影的各种信息
 */

import { 
  MovieInfo, 
  DoubanScraperError,
  ErrorFactory,
  DOUBAN_CONFIG,
  REGEX_PATTERNS,
  StringUtils
} from '../shared/index.ts';
import { fetchText } from './http.ts';

/**
 * 获取电影详细信息
 * @param movieUrl 电影详情页URL
 * @returns Promise<MovieInfo> 电影信息
 */
export async function getMovieInfo(movieUrl: string): Promise<MovieInfo> {
  if (!movieUrl || typeof movieUrl !== 'string') {
    throw ErrorFactory.createInvalidArgsError('电影URL不能为空');
  }

  try {
    console.log(`📄 开始解析电影详情: ${movieUrl}`);
    
    const html = await fetchText(movieUrl);
    const movieInfo = parseMovieInfo(html, movieUrl);
    
    console.log(`✅ 电影信息解析完成: ${movieInfo.title}`);
    return movieInfo;
    
  } catch (error) {
    throw ErrorFactory.createParseError(
      `解析电影信息失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 解析电影信息
 * @param html 电影详情页HTML
 * @param url 电影URL
 * @returns MovieInfo 电影信息
 */
function parseMovieInfo(html: string, url: string): MovieInfo {
  try {
    const movieInfo: MovieInfo = {
      title: parseTitle(html),
      year: parseYear(html),
      rating: parseRating(html),
      genres: parseGenres(html),
      actors: parseActors(html),
      poster: parsePoster(html),
      summary: parseSummary(html)
    };

    // 验证必要字段
    if (!movieInfo.title) {
      throw new Error('无法解析电影标题');
    }

    return movieInfo;
    
  } catch (error) {
    throw ErrorFactory.createParseError(
      `解析电影详情失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 解析电影标题
 * @param html HTML内容
 * @returns string 电影标题
 */
function parseTitle(html: string): string {
  // 尝试多种标题提取方式
  const titlePatterns = [
    /<h1[^>]*>[\s\S]*?<span[^>]*property="v:itemreviewed"[^>]*>([^<]+)<\/span>/,
    /<h1[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/,
    /<title>([^<]+)<\/title>/,
    /<h1[^>]*>([^<]+)<\/h1>/
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = StringUtils.stripHtml(match[1]).trim();
      
      // 清理标题中的额外信息
      title = title.replace(/\s*\(豆瓣\)$/, '');
      title = title.replace(/\s*-\s*豆瓣电影$/, '');
      
      if (title.length > 0) {
        return StringUtils.cleanWhitespace(title);
      }
    }
  }

  return '未知电影';
}

/**
 * 解析上映年份
 * @param html HTML内容
 * @returns string 上映年份
 */
function parseYear(html: string): string {
  // 尝试多种年份提取方式
  const yearPatterns = [
    /<span[^>]*class="year"[^>]*>\((\d{4})\)<\/span>/,
    /<span[^>]*property="v:initialReleaseDate"[^>]*content="(\d{4})[^"]*"[^>]*>/,
    /上映日期[^>]*>[\s\S]*?(\d{4})/,
    /年份[^>]*>[\s\S]*?(\d{4})/,
    REGEX_PATTERNS.YEAR
  ];

  for (const pattern of yearPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const year = match[1];
      if (/^\d{4}$/.test(year)) {
        return year;
      }
    }
  }

  return '未知';
}

/**
 * 解析豆瓣评分
 * @param html HTML内容
 * @returns string 豆瓣评分
 */
function parseRating(html: string): string {
  // 尝试多种评分提取方式
  const ratingPatterns = [
    /<strong[^>]*class="[^"]*rating_num[^"]*"[^>]*property="v:average"[^>]*>([^<]+)<\/strong>/,
    /<span[^>]*property="v:average"[^>]*>([^<]+)<\/span>/,
    /<div[^>]*class="rating_self"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/,
    /评分[\s\S]*?(\d+\.\d+)/
  ];

  for (const pattern of ratingPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const rating = match[1].trim();
      if (REGEX_PATTERNS.RATING.test(rating)) {
        return rating;
      }
    }
  }

  return '暂无评分';
}

/**
 * 解析电影类型
 * @param html HTML内容
 * @returns string[] 电影类型列表
 */
function parseGenres(html: string): string[] {
  const genres: string[] = [];
  
  // 尝试多种类型提取方式
  const genrePatterns = [
    /<span[^>]*property="v:genre"[^>]*>([^<]+)<\/span>/g,
    /类型[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g,
    /genre[^>]*>([^<]+)</g
  ];

  for (const pattern of genrePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const genre = StringUtils.stripHtml(match[1]).trim();
      if (genre && !genres.includes(genre)) {
        genres.push(genre);
      }
    }
    
    if (genres.length > 0) {
      break;
    }
  }

  return genres.length > 0 ? genres : ['未知类型'];
}

/**
 * 解析主演列表
 * @param html HTML内容
 * @returns string[] 主演列表
 */
function parseActors(html: string): string[] {
  const actors: string[] = [];
  
  // 尝试多种演员提取方式
  const actorPatterns = [
    /<a[^>]*rel="v:starring"[^>]*>([^<]+)<\/a>/g,
    /<span[^>]*class="actor"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g,
    /主演[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g
  ];

  for (const pattern of actorPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const actor = StringUtils.stripHtml(match[1]).trim();
      if (actor && !actors.includes(actor)) {
        actors.push(actor);
      }
    }
    
    if (actors.length > 0) {
      break;
    }
  }

  return actors.length > 0 ? actors : ['未知演员'];
}

/**
 * 解析电影封面
 * @param html HTML内容
 * @returns string 封面图片URL
 */
function parsePoster(html: string): string {
  // 尝试多种封面提取方式
  const posterPatterns = [
    /<a[^>]*class="nbgnbg"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/,
    /<img[^>]*rel="v:image"[^>]*src="([^"]+)"[^>]*>/,
    /<div[^>]*id="mainpic"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/,
    /<img[^>]*class="[^"]*poster[^"]*"[^>]*src="([^"]+)"[^>]*>/
  ];

  for (const pattern of posterPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let posterUrl = match[1].trim();
      
      // 清理图片URL
      posterUrl = posterUrl.replace(REGEX_PATTERNS.IMAGE_URL_CLEAN, '');
      
      // 确保是完整的URL
      if (posterUrl.startsWith('//')) {
        posterUrl = 'https:' + posterUrl;
      } else if (posterUrl.startsWith('/')) {
        posterUrl = DOUBAN_CONFIG.BASE_URL + posterUrl;
      }
      
      if (posterUrl.startsWith('http')) {
        return posterUrl;
      }
    }
  }

  return '暂无封面';
}

/**
 * 解析电影简介
 * @param html HTML内容
 * @returns string 电影简介
 */
function parseSummary(html: string): string {
  // 尝试多种简介提取方式
  const summaryPatterns = [
    /<span[^>]*property="v:summary"[^>]*>([\s\S]*?)<\/span>/,
    /<div[^>]*class="indent"[^>]*id="link-report"[^>]*>[\s\S]*?<span[^>]*class="all hidden"[^>]*>([\s\S]*?)<\/span>/,
    /<div[^>]*class="indent"[^>]*id="link-report"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/,
    /剧情简介[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/
  ];

  for (const pattern of summaryPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let summary = StringUtils.stripHtml(match[1]);
      summary = StringUtils.cleanWhitespace(summary);
      
      // 移除常见的无用文本
      summary = summary.replace(/^\s*©豆瓣/, '');
      summary = summary.replace(/\s*\(展开全部\)\s*$/, '');
      summary = summary.replace(/\s*显示全部\s*$/, '');
      
      if (summary.length > 10) {
        return StringUtils.truncate(summary, 500);
      }
    }
  }

  return '暂无简介';
}

/**
 * 验证电影信息
 * @param movieInfo 电影信息对象
 * @returns boolean 是否有效
 */
export function validateMovieInfo(movieInfo: MovieInfo): boolean {
  if (!movieInfo || typeof movieInfo !== 'object') {
    return false;
  }

  const requiredFields = ['title', 'year', 'rating', 'genres', 'actors', 'poster', 'summary'];
  
  for (const field of requiredFields) {
    if (!(field in movieInfo)) {
      return false;
    }
  }

  // 检查数组字段
  if (!Array.isArray(movieInfo.genres) || !Array.isArray(movieInfo.actors)) {
    return false;
  }

  // 检查字符串字段
  const stringFields = ['title', 'year', 'rating', 'poster', 'summary'];
  for (const field of stringFields) {
    if (typeof movieInfo[field as keyof MovieInfo] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * 清理电影信息
 * @param movieInfo 原始电影信息
 * @returns MovieInfo 清理后的电影信息
 */
export function cleanMovieInfo(movieInfo: MovieInfo): MovieInfo {
  return {
    title: StringUtils.cleanWhitespace(movieInfo.title),
    year: movieInfo.year.trim(),
    rating: movieInfo.rating.trim(),
    genres: movieInfo.genres.map(genre => StringUtils.cleanWhitespace(genre)).filter(g => g.length > 0),
    actors: movieInfo.actors.map(actor => StringUtils.cleanWhitespace(actor)).filter(a => a.length > 0),
    poster: movieInfo.poster.trim(),
    summary: StringUtils.cleanWhitespace(movieInfo.summary)
  };
}