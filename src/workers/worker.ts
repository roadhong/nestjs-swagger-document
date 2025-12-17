import { parentPort, workerData } from 'worker_threads';
import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-generator';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';
import path from 'path';
import { existsSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import { SwaggerDocumentModuleOptions } from '../swagger.document.define';

interface WorkerData {
  metadataFolder: string;
  options: SwaggerDocumentModuleOptions;
}

function sendLog(level: 'debug' | 'error', message: any, ...optionalParams: any[]): void {
  if (parentPort) {
    parentPort.postMessage({
      type: 'log',
      level,
      logMessage: message,
      logParams: optionalParams,
    });
  }
}

if (parentPort) {
  const { metadataFolder, options }: WorkerData = workerData;

  void (async () => {
    try {
      const metadataTsPath = path.join(metadataFolder, 'metadata.ts');
      const metadataJsPath = path.join(metadataFolder, 'metadata.js');
      [metadataTsPath, metadataJsPath].forEach((file) => {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      });

      const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
      if (!existsSync(tsConfigPath)) {
        throw new Error('tsconfig.json not found');
      }

      const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));
      const { outDir = './dist', rootDir = './src' } = tsConfig.compilerOptions || {};
      const baseOutDir = path.resolve(process.cwd(), outDir);
      const baseRootDir = path.resolve(process.cwd(), rootDir);

      if (options.debug) {
        sendLog('debug', `options: ${JSON.stringify(options, null, 2)}`);
        sendLog('debug', `[Worker] RootDir: ${baseRootDir}`);
        sendLog('debug', `[Worker] OutDir: ${baseOutDir}`);
        sendLog('debug', `[Worker] Current working directory: ${process.cwd()}`);
        sendLog('debug', `[Worker] Metadata folder: ${metadataFolder}`);
      }

      const generator = new PluginMetadataGenerator();
      try {
        if (options.debug) {
          sendLog('debug', '[Worker] Starting metadata generation...');
        }
        const pluginOptions = {
          dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
          controllerFileNameSuffix: ['.controller.ts'],
          classValidatorShim: true,
          pathToSource: metadataFolder,
          controllerKeyOfComment: 'description',
          introspectComments: true,
          debug: options.debug || false,
          ...options.pluginOptions,
        };
        generator.generate({
          visitors: [new ReadonlyVisitor(pluginOptions)],
          outputDir: metadataFolder,
          tsconfigPath: './tsconfig.json',
        });
        if (options.debug) {
          sendLog('debug', '[Worker] Metadata generation completed');
        }
      } catch (error) {
        if (!existsSync(metadataTsPath)) {
          throw error;
        }
        if (options.debug) {
          sendLog('debug', 'Type check error ignored, metadata file exists:', error);
        }
      }

      if (existsSync(metadataTsPath)) {
        try {
          const swc = await import('@swc/core');
          const tsContent = readFileSync(metadataTsPath, 'utf-8');
          const result = await swc.transform(tsContent, {
            module: { type: 'commonjs' },
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true,
              },
            },
          });
          const rootDirRelative = path.relative(metadataFolder, baseRootDir);
          const outDirRelative = path.relative(metadataFolder, baseOutDir);
          const escapedRootDir = rootDirRelative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rootDirRegex = new RegExp(`(["'])(([^"']*\\/)?)${escapedRootDir}((\\/[^"']*)?)\\1`, 'g');
          const transformedCode = result.code.replace(rootDirRegex, (match, quote, prefixGroup, prefix, suffixGroup, suffix) => {
            return `${quote}${prefix || ''}${outDirRelative}${suffix || ''}${quote}`;
          });
          writeFileSync(metadataJsPath, transformedCode, 'utf-8');

          if (options.debug) {
            sendLog('debug', `[Worker] Metadata JS path: ${metadataJsPath}`);
          }
        } catch (error) {
          sendLog('error', 'SwaggerMetadataWorker error:', error);
          if (options.debug) {
            sendLog('error', 'SwaggerMetadataWorker SWC transform error details:', error);
          }
        }
      }

      parentPort.postMessage({ success: true });
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}
