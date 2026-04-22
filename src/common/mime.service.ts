import { Injectable } from '@nestjs/common';

@Injectable()
export class MimeService {
  getMimeType(filename: string): string {
    if (filename.endsWith('.json')) return 'application/json';
    if (filename.endsWith('.txt')) return 'text/plain';
    if (filename.endsWith('.xml')) return 'application/xml';
    if (filename.endsWith('.properties')) return 'text/x-properties';
    if (filename.match(/.*-attachment\.(png|jpg|jpeg|gif|svg)$/i))
      return 'image/*';
    return 'application/octet-stream';
  }

  getMimeTypeByExt(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
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
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getCacheMaxAge(ext: string): number {
    const cacheableExts = [
      '.css',
      '.js',
      '.png',
      '.jpg',
      '.svg',
      '.woff',
      '.woff2',
      '.ttf',
    ];
    return cacheableExts.includes(ext) ? 86400000 : 0;
  }
}
