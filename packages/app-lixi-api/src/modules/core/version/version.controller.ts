import { Controller, Get } from '@nestjs/common';

@Controller('version')
export class VersionController {
  private readonly version: string;
  private readonly commitHash: string;

  constructor() {
    this.version = process.env.APP_VERSION || 'unknown';
    this.commitHash = process.env.COMMIT_HASH || 'unknown';
  }

  @Get()
  getVersion(): { version: string; commitHash: string } {
    return {
      version: this.version,
      commitHash: this.commitHash
    };
  }
}
