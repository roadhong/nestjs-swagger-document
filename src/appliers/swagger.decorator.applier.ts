import { Injectable, INestApplication, Logger } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, getSchemaPath } from '@nestjs/swagger';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { SwaggerDocumentModuleOptions } from '../swagger.document.define';
import { SWAGGER_APP_COMMON_SKIP } from '../swagger.document.service';

@Injectable()
export class SwaggerDecoratorApplier {
  private readonly logger = new Logger(SwaggerDecoratorApplier.name);

  applyDecorators(baseApp: INestApplication, metadata: Record<string, any>, options: SwaggerDocumentModuleOptions): void {
    if (options.debug) {
      this.logger.debug('Applying decorators to controllers...');
    }
    const controllerMetadata = this.extractControllerMetadata(metadata);
    const controllers = this.getControllers(baseApp);
    const models = this.extractModels(metadata);
    const commonProperties = this.findCommonProperties(models, options);

    if (options.debug) {
      this.logger.debug(`Found ${controllers.length} controllers to process`);
    }

    controllers.forEach((wrapper: InstanceWrapper) => {
      this.processController(wrapper, controllerMetadata, commonProperties, options);
    });

    if (options.debug) {
      this.logger.debug('Decorators applied to all controllers');
    }
  }

  private extractControllerMetadata(metadata: Record<string, any>): Record<string, any> {
    return metadata['@nestjs/swagger']['controllers'].map((controller: any[]) => controller[1]).reduce((acc: any, obj: any) => ({ ...acc, ...obj }), {});
  }

  private extractModels(metadata: Record<string, any>): Record<string, any> {
    return metadata['@nestjs/swagger']['models'].map((model: any[]) => model[1]).reduce((acc: any, obj: any) => ({ ...acc, ...obj }), {});
  }

  private findCommonProperties(models: Record<string, any>, options: SwaggerDocumentModuleOptions): any | undefined {
    if (!options.commonResponseInfo) {
      return undefined;
    }

    const commonResponseName = options.commonResponseInfo.name;

    return models[commonResponseName];
  }

  private processController(wrapper: InstanceWrapper, controllerMetadata: Record<string, any>, commonProperties: any, options: SwaggerDocumentModuleOptions): void {
    const { instance } = wrapper;
    const prototype = Object.getPrototypeOf(instance);
    const controller = instance.constructor;
    const controllerName = controller.name;

    const methodCount = Object.getOwnPropertyNames(prototype).filter((name) => typeof prototype[name] === 'function').length;
    if (options.debug && methodCount > 0) {
      this.logger.debug(`Processing controller: ${controllerName} (${methodCount} methods)`);
    }

    Object.getOwnPropertyNames(prototype).forEach((methodName) => {
      this.processMethod(prototype, methodName, controller, controllerName, controllerMetadata, commonProperties, options);
    });
  }

  private processMethod(
    prototype: any,
    methodName: string,
    controller: any,
    controllerName: string,
    controllerMetadata: Record<string, any>,
    commonProperties: any,
    options: SwaggerDocumentModuleOptions,
  ): void {
    const method = prototype[methodName];
    if (typeof method !== 'function') {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    if (!descriptor) {
      return;
    }

    const methodMetadata = Reflect.getMetadata(METHOD_METADATA, method);
    if (methodMetadata === undefined) {
      return;
    }

    const { description, type } = controllerMetadata?.[controllerName]?.[methodName] ?? {};
    const info = Reflect.getMetadata('swagger/apiOperation', method);
    const skipCommonResponse = Reflect.getMetadata(SWAGGER_APP_COMMON_SKIP, controller) ?? Reflect.getMetadata(SWAGGER_APP_COMMON_SKIP, method);

    const operation = this.buildOperation(info, description);
    const shouldApplyCommonResponse = type && !skipCommonResponse && options.commonResponseInfo;

    if (shouldApplyCommonResponse) {
      this.applyCommonResponseDecorator(prototype, methodName, descriptor, operation, type, commonProperties, options);
    } else {
      this.applyOperationDecorator(prototype, methodName, descriptor, operation);
    }
  }

  private buildOperation(info: any, description?: string): any {
    const operation = {
      ...info,
      description,
    };

    if (!description) {
      return operation;
    }

    const parts = description.split('===').map((part: string) => part.trim());

    if (parts.length === 1) {
      return {
        ...operation,
        description: parts[0],
      };
    }

    const [summary, descriptionText] = parts;

    return {
      ...operation,
      summary: `${summary}`,
      description: descriptionText,
    };
  }

  private buildResponseProperties(type: any, commonProperties: any, options: SwaggerDocumentModuleOptions): any {
    const baseProperties = { ...commonProperties };

    if (type.name !== 'Object') {
      return {
        ...baseProperties,
        [options.commonResponseInfo!.properties]: {
          $ref: getSchemaPath(type),
        },
      };
    }

    return {
      ...baseProperties,
      [options.commonResponseInfo!.properties]: { type: 'object' },
    };
  }

  private applyCommonResponseDecorator(
    prototype: any,
    methodName: string,
    descriptor: PropertyDescriptor,
    operation: any,
    type: any,
    commonProperties: any,
    options: SwaggerDocumentModuleOptions,
  ): void {
    const properties = this.buildResponseProperties(type, commonProperties, options);
    const commonResponseInfo = options.commonResponseInfo!;

    applyDecorators(
      ApiOperation(operation),
      ApiOkResponse({
        schema: {
          allOf: [{ $ref: getSchemaPath(commonResponseInfo.name) }, { properties }],
        },
      }),
    )(prototype, methodName, descriptor);
  }

  private applyOperationDecorator(prototype: any, methodName: string, descriptor: PropertyDescriptor, operation: any): void {
    applyDecorators(ApiOperation(operation))(prototype, methodName, descriptor);
  }

  private getControllers(baseApp: INestApplication): InstanceWrapper[] {
    const controllers: InstanceWrapper[] = [];
    const modulesContainer = (baseApp as any).container?.modules;

    if (!modulesContainer) {
      return controllers;
    }

    for (const module of modulesContainer.values()) {
      if (module.controllers) {
        controllers.push(...module.controllers.values());
      }
    }

    return controllers;
  }
}
