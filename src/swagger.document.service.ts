import { INestApplication, Injectable, Inject, Optional, SetMetadata, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { SwaggerDocumentModuleOptions } from './swagger.document.define';
import { SWAGGER_PLUGIN_OPTIONS } from './swagger.document.module';
import { SwaggerDecoratorApplier } from './appliers/swagger.decorator.applier';
import { SwaggerModelProcessor } from './processors/swagger.model.processor';
import { SwaggerMetadataWorker } from './workers/swagger.metadata.worker';
import { SwaggerDocumentBuilder } from './builders/swagger.document.builder';

export const SWAGGER_APP_COMMON_SKIP = 'SWAGGER_APP_COMMON_SKIP';

export function SwaggerAppCommonSkip(): ClassDecorator & MethodDecorator {
  return SetMetadata(SWAGGER_APP_COMMON_SKIP, true);
}

@Injectable()
export class SwaggerDocumentService {
  private readonly logger = new Logger(SwaggerDocumentService.name);
  private readonly options: SwaggerDocumentModuleOptions;
  private document: OpenAPIObject;

  constructor(
    private readonly documentBuilder: SwaggerDocumentBuilder,
    private readonly decoratorApplier: SwaggerDecoratorApplier,
    private readonly modelProcessor: SwaggerModelProcessor,
    private readonly metadataWorker: SwaggerMetadataWorker,
    @Optional() @Inject(SWAGGER_PLUGIN_OPTIONS) injectedOptions?: SwaggerDocumentModuleOptions,
  ) {
    this.options = injectedOptions || {};
    if (this.options.debug) {
      this.logger.debug('SwaggerDocumentService initialized');
    }
  }

  getDocument(): OpenAPIObject {
    return this.document;
  }

  initialize(baseApp: INestApplication, callback?: () => void | Promise<void>): void {
    if (this.options.debug) {
      this.logger.debug('Initializing SwaggerDocumentService...');
    }
    this.document = this.loadMetadata(path.join(process.cwd(), 'api-metadata.json'));

    void this.metadataWorker.generateMetadata(this.options, async (metadata: Record<string, any>) => {
      try {
        await this.setup(baseApp, metadata);
        this.logger.log('Swagger document setup completed');

        if (callback) {
          try {
            await callback();
          } catch (error) {
            this.logger.error('initialize callback error:', error);
          }
        }
      } catch (error) {
        this.logger.error('SwaggerService.setup error:', error);
      }
    });
  }

  private async setup(baseApp: INestApplication, metadata: Record<string, any>): Promise<void> {
    if (!metadata) {
      if (this.options.debug) {
        this.logger.warn('No metadata provided, skipping setup');
      }

      return;
    }

    if (this.options.debug) {
      this.logger.debug('Applying decorators...');
    }
    this.decoratorApplier.applyDecorators(baseApp, metadata, this.options);
    if (this.options.debug) {
      this.logger.debug('Processing models...');
    }
    const models = await this.modelProcessor.getModels(metadata, this.options.debug);
    if (this.options.debug) {
      this.logger.debug(`Found ${models.length} models`);
    }
    const builderOptions = this.documentBuilder.build(this.options.builderOptions, this.options.debug);
    this.document = SwaggerModule.createDocument(baseApp, builderOptions, {
      autoTagControllers: true,
      deepScanRoutes: true,
      extraModels: [...models],
      ...this.options.documentOptions,
    });

    const apiPath = path.join(process.cwd(), 'api-metadata.json');
    writeFileSync(apiPath, JSON.stringify(this.document, null, 2), 'utf-8');
    if (this.options.debug) {
      this.logger.debug(`api-metadata.json created at: ${apiPath}`);
    } else {
      this.logger.log('api-metadata.json created successfully');
    }
  }

  loadMetadata(file: string): OpenAPIObject {
    const filePath = path.join(__dirname, file);
    if (this.options.debug) {
      this.logger.debug(`Loading metadata from: ${filePath}`);
    }
    if (!existsSync(filePath)) {
      if (this.options.debug) {
        this.logger.debug('Metadata file not found, will be generated');
      }

      return undefined;
    }

    const data = readFileSync(filePath, 'utf-8');
    if (this.options.debug) {
      this.logger.debug('Metadata file loaded successfully');
    }

    return JSON.parse(data);
  }
}
