import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SwaggerModelProcessor {
  private readonly logger = new Logger(SwaggerModelProcessor.name);

  async getModels(metadata: Record<string, any>, debug?: boolean): Promise<any[]> {
    if (debug) {
      this.logger.debug('Processing models from metadata...');
    }
    const models = await Promise.all(metadata['@nestjs/swagger']['models'].map(async (model: any[]) => await model[0]));

    const modelMetadata = models.reduce((acc: any[], obj: any) => {
      obj = [...Object.values(obj)].filter((x) => typeof x == 'function');
      obj.forEach((item: any) => {
        if (item['_OPENAPI_METADATA_FACTORY']) {
          const metadata = item['_OPENAPI_METADATA_FACTORY']();
          Object.entries(metadata).forEach(([propName, prop]: [string, any]) => {
            if (prop.enum && typeof prop.enum === 'object' && !Array.isArray(prop.enum)) {
              const enumObj = prop.enum;
              const names = Object.keys(enumObj).filter((k) => isNaN(Number(k)));
              prop['x-enum-varnames'] = names;
            }
          });
        }
      });

      return [...acc, ...obj];
    }, []);

    if (debug) {
      this.logger.debug(`Processed ${modelMetadata.length} models`);
    }

    return modelMetadata;
  }
}
