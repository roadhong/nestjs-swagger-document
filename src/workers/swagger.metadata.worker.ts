import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { SwaggerDocumentModuleOptions } from '../swagger.document.define';
import { SwaggerModule } from '@nestjs/swagger';

@Injectable()
export class SwaggerMetadataWorker {
  private readonly logger = new Logger(SwaggerMetadataWorker.name);

  generateMetadata(options: SwaggerDocumentModuleOptions, setupCallback: (metadata: Record<string, any>) => Promise<void>): void {
    if (options.debug) {
      this.logger.debug('Starting metadata generation...');
    }
    const metadataFolder = path.join(__dirname, '..', 'metadata');
    if (!existsSync(metadataFolder)) {
      mkdirSync(metadataFolder, { recursive: true });
      if (options.debug) {
        this.logger.debug(`Created metadata folder: ${metadataFolder}`);
      }
    }

    const metadataJsWorkerPath = path.join(__dirname, 'worker.js');
    if (!existsSync(metadataJsWorkerPath)) {
      throw new Error(`Metadata worker file not found: ${metadataJsWorkerPath}`);
    }
    if (options.debug) {
      this.logger.debug(`Worker path: ${metadataJsWorkerPath}`);
    }

    const worker = new Worker(metadataJsWorkerPath, {
      workerData: {
        metadataFolder,
        options,
      },
    });

    worker.on('message', async (message: { type?: string; success?: boolean; error?: string; level?: string; logMessage?: any; logParams?: any[] }) => {
      // Handle log messages
      if (message.type === 'log') {
        if (message.level === 'debug') {
          this.logger.debug(message.logMessage, ...(message.logParams || []));
        } else if (message.level === 'error') {
          this.logger.error(message.logMessage, ...(message.logParams || []));
        }

        return;
      }

      // Handle result messages
      if (message.success !== undefined) {
        void worker.terminate();
        if (message.success) {
          try {
            if (options.debug) {
              this.logger.debug('Metadata generation succeeded, loading metadata...');
            }
            const metadata = await this.loadMetadataFromFile(metadataFolder);
            await SwaggerModule.loadPluginMetadata(async () => metadata);
            await setupCallback(metadata);
            if (options.debug) {
              this.logger.debug('Metadata loaded and callback executed');
            }
          } catch (error) {
            this.logger.error('SwaggerMetadataWorker error:', error);
          }
        } else {
          this.logger.error('Metadata generation failed:', message.error);
        }
      }
    });

    worker.on('error', (error) => {
      this.logger.error('SwaggerDocumentModule Worker error:', error);
      void worker.terminate();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.logger.error(`SwaggerDocumentModule Worker stopped with exit code ${code}`);
      } else if (options.debug) {
        this.logger.debug('Worker exited successfully');
      }
    });
  }

  private async loadMetadataFromFile(metadataFolder: string): Promise<Record<string, any>> {
    const metadataJsPath = path.join(metadataFolder, 'metadata.js');
    if (!existsSync(metadataJsPath)) {
      throw new Error('Metadata JS file not found');
    }
    const module = await import(metadataJsPath);
    const metadata = await module.default();

    return metadata;
  }
}
