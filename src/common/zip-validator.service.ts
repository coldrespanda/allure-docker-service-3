import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';
import AdmZip from 'adm-zip';

@Injectable()
export class ZipValidatorService {
  private readonly logger = new Logger(ZipValidatorService.name);
  private readonly MAX_FILES = 10000;
  private readonly MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024;

  validate(zipBuffer: Buffer): {
    isValid: boolean;
    entries: AdmZip.IZipEntry[];
  } {
    this.logger.log(`Validating ZIP: ${zipBuffer.length} bytes`);

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    let totalUncompressedSize = 0;
    let fileCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      fileCount++;
      totalUncompressedSize += entry.header?.size ?? 0;

      if (fileCount > this.MAX_FILES) {
        throw new BadRequestException(
          `ZIP contains more than ${this.MAX_FILES} files`,
        );
      }

      if (totalUncompressedSize > this.MAX_UNCOMPRESSED_SIZE) {
        throw new BadRequestException(
          `ZIP uncompressed size exceeds ${this.MAX_UNCOMPRESSED_SIZE / 1024 / 1024}MB`,
        );
      }

      const normalizedName = path.normalize(entry.entryName);
      if (normalizedName.includes('..') || path.isAbsolute(normalizedName)) {
        throw new BadRequestException(
          `Invalid file path in ZIP: ${entry.entryName}`,
        );
      }
    }

    this.logger.log(
      `ZIP valid: ${fileCount} files, ${totalUncompressedSize} bytes`,
    );
    return { isValid: true, entries };
  }
}
