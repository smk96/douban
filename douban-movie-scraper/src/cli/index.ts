/**
 * CLI 模块入口
 * 
 * 处理命令行模式的电影搜索功能
 */

import { 
  CliArgs,
  ValidationUtils,
  APP_INFO,
  CLI_CONFIG
} from '../shared/index.ts';
import { searchMovie, selectBestMatch, getMovieInfo } from '../core/index.ts';

/**
 * 解析命令行参数
 */
function parseArgs(): CliArgs | null {
  const args = Deno.args;
  const parsed: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--version' || arg === '-v') {
      parsed.version = true;
    } else if (arg === '--movie' || arg === '-m') {
      if (i + 1 < args.length) {
        parsed.movie = args[++i];
      }
    } else if (arg.startsWith('--movie=')) {
      parsed.movie = arg.split('=')[1];
    } else if (arg === '--format') {
      if (i + 1 < args.length) {
        const format = args[++i];
        if (format === 'json' || format === 'text') {
          parsed.format = format;
        }
      }
    } else if (arg.startsWith('--format=')) {
      const format = arg.split('=')[1];
      if (format === 'json' || format === 'text') {
        parsed.format = format as 'json' | 'text';
      }
    }
  }
  
  // 如果显示帮助或版本信息，直接返回
  if (parsed.help) {
    console.log(CLI_CONFIG.HELP_TEXT);
    return null;
  }
  
  if (parsed.version) {
    console.log(CLI_CONFIG.VERSION_TEXT);
    return null;
  }
  
  // 验证电影名称
  if (!parsed.movie || !ValidationUtils.isValidMovieName(parsed.movie)) {
    console.error('❌ 请提供有效的电影名称');
    console.log('使用 --help 查看使用说明');
    return null;
  }
  
  // 设置默认格式
  if (!parsed.format) {
    parsed.format = 'text';
  }
  
  return parsed;
}

/**
 * 格式化输出电影信息
 */
function formatMovieInfo(movieInfo: any, format: 'text' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(movieInfo, null, 2);
  }
  
  // 文本格式
  const lines = [
    `🎬 ${movieInfo.title}`,
    `📅 年份: ${movieInfo.year}`,
    `⭐ 评分: ${movieInfo.rating}`,
    `🎭 类型: ${movieInfo.genres.join(', ')}`,
    `👥 主演: ${movieInfo.actors.join(', ')}`,
    `📖 简介: ${movieInfo.summary}`,
    `🖼️ 封面: ${movieInfo.poster}`
  ];
  
  return lines.join('\n');
}

/**
 * 处理 CLI 模式
 */
export async function handleCliMode(): Promise<void> {
  const args = parseArgs();
  
  if (!args) {
    return; // 已显示帮助信息或版本信息
  }
  
  try {
    console.log(`🔍 搜索电影: ${args.movie}`);
    console.log('='.repeat(40));
    
    // 搜索电影
    const searchResults = await searchMovie(args.movie!);
    
    if (searchResults.length === 0) {
      console.log('❌ 未找到相关电影');
      return;
    }
    
    // 选择最佳匹配
    const bestMatch = selectBestMatch(searchResults, args.movie!);
    console.log(`📍 找到电影: ${bestMatch.title}`);
    
    // 获取详细信息
    const movieInfo = await getMovieInfo(bestMatch.url);
    
    console.log('='.repeat(40));
    console.log(formatMovieInfo(movieInfo, args.format!));
    
  } catch (error) {
    console.error('❌ 搜索失败:', error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}