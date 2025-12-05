import { DynamicModule, Module, FactoryProvider } from '@nestjs/common';

import { SwaggerDocumentService } from './swagger.document.service';
import { SwaggerDocumentModuleOptions } from './swagger.document.define';
import { SwaggerDocumentBuilder } from './builders/swagger.document.builder';
import { SwaggerDecoratorApplier } from './appliers/swagger.decorator.applier';
import { SwaggerModelProcessor } from './processors/swagger.model.processor';
import { SwaggerMetadataWorker } from './workers/swagger.metadata.worker';

export const SWAGGER_PLUGIN_OPTIONS = 'SWAGGER_PLUGIN_OPTIONS';

export interface SwaggerDocumentAsyncOptions {
  useFactory: (...args: any[]) => Promise<SwaggerDocumentModuleOptions> | SwaggerDocumentModuleOptions;
  inject?: any[];
}

@Module({})
export class SwaggerDocumentModule {
  static forRoot(options: SwaggerDocumentModuleOptions = {}): DynamicModule {
    const swaggerOptions: SwaggerDocumentModuleOptions = {
      ...options,
    };

    return {
      module: SwaggerDocumentModule,
      providers: [
        {
          provide: SWAGGER_PLUGIN_OPTIONS,
          useValue: swaggerOptions,
        },
        SwaggerDocumentBuilder,
        SwaggerDecoratorApplier,
        SwaggerModelProcessor,
        SwaggerMetadataWorker,
        {
          provide: SwaggerDocumentService,
          useFactory: (
            documentBuilder: SwaggerDocumentBuilder,
            decoratorApplier: SwaggerDecoratorApplier,
            modelProcessor: SwaggerModelProcessor,
            metadataWorker: SwaggerMetadataWorker,
            options: SwaggerDocumentModuleOptions,
          ) => {
            return new SwaggerDocumentService(documentBuilder, decoratorApplier, modelProcessor, metadataWorker, options);
          },
          inject: [SwaggerDocumentBuilder, SwaggerDecoratorApplier, SwaggerModelProcessor, SwaggerMetadataWorker, SWAGGER_PLUGIN_OPTIONS],
        },
      ],
      exports: [SwaggerDocumentService, SWAGGER_PLUGIN_OPTIONS],
    };
  }

  static forRootAsync(options: SwaggerDocumentAsyncOptions): DynamicModule {
    const swaggerOptionsProvider: FactoryProvider<SwaggerDocumentModuleOptions> = {
      provide: SWAGGER_PLUGIN_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: SwaggerDocumentModule,
      providers: [
        swaggerOptionsProvider,
        SwaggerDocumentBuilder,
        SwaggerDecoratorApplier,
        SwaggerModelProcessor,
        SwaggerMetadataWorker,
        {
          provide: SwaggerDocumentService,
          useFactory: (
            documentBuilder: SwaggerDocumentBuilder,
            decoratorApplier: SwaggerDecoratorApplier,
            modelProcessor: SwaggerModelProcessor,
            metadataWorker: SwaggerMetadataWorker,
            swaggerOptions: SwaggerDocumentModuleOptions,
          ) => {
            return new SwaggerDocumentService(documentBuilder, decoratorApplier, modelProcessor, metadataWorker, swaggerOptions);
          },
          inject: [SwaggerDocumentBuilder, SwaggerDecoratorApplier, SwaggerModelProcessor, SwaggerMetadataWorker, SWAGGER_PLUGIN_OPTIONS],
        },
      ],
      exports: [SwaggerDocumentService, SWAGGER_PLUGIN_OPTIONS],
    };
  }
}
