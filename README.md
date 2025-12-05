# NestJS Swagger Document

A module for easily generating and managing **OpenAPI 3.0 spec** documents in NestJS applications.

This module is designed to generate **standard OpenAPI 3.0 spec documents in JSON/YAML format for use in separate Swagger Controllers or Document Clients**, rather than directly providing Swagger UI. The generated OpenAPI spec can be used immediately with various tools such as Swagger UI, Redoc, Postman, Insomnia, etc.

## Key Features

### 1. Write Description and Summary with Comments Only ⭐

**The biggest advantage!** Simply write comments on controller methods and response classes (DTOs), and Swagger documents will be automatically generated.

- **Controller methods**: Method comments are automatically used as `description`
- **Summary separation**: Use the `===` separator to split `summary` and `description`
- **DTO properties**: Property comments in response classes are automatically applied as `description` in `@ApiProperty`
- **No decorators needed**: You can write API documentation with comments only, without separate `@ApiOperation` or `@ApiProperty` decorators

**Example:**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  /**
   * Get user list
   * ===
   * Retrieves all user lists.
   * Supports pagination and can retrieve up to 100 items.
   */
  @Get()
  findAll() {
    return [];
  }

  /**
   * Get user details
   */
  @Get(':id')
  findOne() {
    return {};
  }
}
```

In the above example:

- First method: `summary` = "Get user list", `description` = "Retrieves all user lists. Supports pagination and can retrieve up to 100 items."
- Second method: `description` = "Get user details" (no summary)

**DTO class example:**

```typescript
export class UserDto {
  /**
   * User unique ID
   */
  id: number;

  /**
   * User email address
   */
  email: string;

  /**
   * User name
   */
  name: string;
}
```

As shown above, simply writing comments on DTO class properties will automatically add `description` to the Swagger document. You don't need to write `@ApiProperty({ description: '...' })` separately!

### 2. Easy Swagger Document Generation

- Automatically applies Swagger decorators based on metadata
- Automatically generates API documentation for controllers and methods
- Saves Swagger documents as `api-metadata.json` files for reuse
- **Generates JSON documents that can be used in separate Swagger Controllers or Document Clients**

### 3. Common Response Configuration

- Can automatically apply common response structures to all API endpoints
- Maintains consistent API response formats by setting common response wrapper classes
- Can exclude common responses for specific controllers or methods

## Installation

```bash
npm install nestjs-swagger-document
# or
pnpm add nestjs-swagger-document
# or
yarn add nestjs-swagger-document
```

## Usage

This module is designed to generate Swagger documents as JSON for use in separate Swagger Controllers or Document Clients. Instead of using `SwaggerModule.setup()` directly, you can provide the generated documents through custom controllers.

### 1. Module Registration

Register `SwaggerDocumentModule` in `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SwaggerDocumentModule } from 'nestjs-swagger-document';

@Module({
  imports: [
    SwaggerDocumentModule.forRoot({
      builderOptions: {
        title: 'My API',
        description: 'API Documentation',
        version: '1.0.0',
      },
      debug: true, // Enable debug logs in development environment
    }),
  ],
})
export class AppModule {}
```

### 2. Application Initialization

Initialize `SwaggerDocumentService` in `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerDocumentService } from 'nestjs-swagger-document';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Initialize SwaggerDocumentService
  // Note: Metadata generation runs asynchronously in a worker,
  // so the document may not be created immediately after initialization.
  const swaggerService = app.get(SwaggerDocumentService);
  swaggerService.initialize(app);

  await app.listen(3000);
}
bootstrap();
```

### 3. Create Swagger Controller (Optional)

You can create a separate Swagger Controller to provide the documentation:

```typescript
import { Controller, Get } from '@nestjs/common';
import { SwaggerDocumentService } from 'nestjs-swagger-document';

@Controller('swagger')
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get('json')
  getSwaggerJson() {
    // The document may not have been created yet, so null check is required.
    const document = this.swaggerService.getDocument();
    if (!document) {
      return { message: 'Swagger document is being generated...' };
    }
    return document;
  }
}
```

### 4. OpenAPI Spec Usage (Recommended)

The generated Swagger document follows the **OpenAPI 3.0 spec**, so it can be used with various tools:

#### Provide OpenAPI Document

```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { SwaggerDocumentService } from 'nestjs-swagger-document';

@Controller('openapi')
export class OpenApiController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get('spec')
  @Header('Content-Type', 'application/json')
  getOpenApiSpec() {
    const document = this.swaggerService.getDocument();
    if (!document) {
      return {
        openapi: '3.0.0',
        info: {
          title: 'API Documentation',
          version: '1.0.0',
          description: 'Document is being generated. Please try again in a few seconds.',
        },
        paths: {},
      };
    }
    return document;
  }

  @Get('spec.yaml')
  @Header('Content-Type', 'text/yaml')
  async getOpenApiSpecYaml() {
    const document = this.swaggerService.getDocument();
    if (!document) {
      return 'openapi: 3.0.0\ninfo:\n  title: API Documentation\n  version: 1.0.0';
    }

    // YAML conversion (requires yaml package: npm install yaml)
    const yaml = await import('yaml');
    return yaml.stringify(document);
  }
}
```

#### Swagger UI Integration

**Method 1: Using Swagger UI CDN**

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { SwaggerDocumentService } from 'nestjs-swagger-document';
import { Response } from 'express';

@Controller('api-docs')
export class SwaggerUiController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get()
  getSwaggerUi(@Res() res: Response) {
    const document = this.swaggerService.getDocument();
    if (!document) {
      return res.status(503).send(`
        <html>
          <body>
            <h1>Swagger Document is being generated...</h1>
            <p>Please try again in a few seconds.</p>
            <script>setTimeout(() => location.reload(), 3000);</script>
          </body>
        </html>
      `);
    }

    const specUrl = '/openapi/spec';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            SwaggerUIBundle({
              url: '${specUrl}',
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
              ]
            });
          </script>
        </body>
      </html>
    `;

    res.send(html);
  }
}
```

**Method 2: Using Redoc**

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { SwaggerDocumentService } from 'nestjs-swagger-document';
import { Response } from 'express';

@Controller('redoc')
export class RedocController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get()
  getRedoc(@Res() res: Response) {
    const specUrl = '/openapi/spec';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation - ReDoc</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <redoc spec-url="${specUrl}"></redoc>
          <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
        </body>
      </html>
    `;
    res.send(html);
  }
}
```

#### External Tool Integration

The generated OpenAPI spec is compatible with the following tools:

- **Postman**: Import OpenAPI spec to create API collections
- **Insomnia**: Import OpenAPI spec for API documentation
- **Stoplight**: API design and documentation based on OpenAPI spec
- **Swagger Editor**: Edit and validate OpenAPI spec online
- **Swagger Codegen**: Generate client SDKs from OpenAPI spec

**Example: Postman Collection Generation**

```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { SwaggerDocumentService } from 'nestjs-swagger-document';

@Controller('export')
export class ExportController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get('postman')
  @Header('Content-Type', 'application/json')
  async getPostmanCollection() {
    const document = this.swaggerService.getDocument();
    if (!document) {
      return { error: 'Document not ready' };
    }

    // Convert OpenAPI to Postman Collection
    // (Example using openapi-to-postman package)
    const { convert } = await import('openapi-to-postman');
    const collection = await convert(document, {});
    return collection;
  }
}
```

#### Using api-metadata.json

In projects using this module, the `api-metadata.json` file is created in the **project root** (`process.cwd()`). That is, the file is saved in the current working directory where the application is executed. It can be used within the same project or distributed as an npm package for use in other projects:

**Using within the same project:**

The path may vary depending on the project structure. The safest method is to use `process.cwd()`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Read api-metadata.json from project root using process.cwd()
const apiMetadataPath = path.join(process.cwd(), 'api-metadata.json');
const apiMetadata = JSON.parse(fs.readFileSync(apiMetadataPath, 'utf-8'));

console.log('API Title:', apiMetadata.info.title);
console.log('Available endpoints:', Object.keys(apiMetadata.paths));
```

Or you can import directly using relative paths (path adjustment required depending on project structure):

```typescript
// When used in files at project root
import apiMetadata from './api-metadata.json';

// When used in files within src/ folder
import apiMetadata from '../api-metadata.json';

// When used in files within src/controllers/ folder
import apiMetadata from '../../api-metadata.json';
```

**Type-safe usage in TypeScript:**

```typescript
// src/types/api-document.ts
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import * as fs from 'fs';
import * as path from 'path';

const apiMetadataPath = path.join(process.cwd(), 'api-metadata.json');
const apiMetadata = JSON.parse(fs.readFileSync(apiMetadataPath, 'utf-8'));

export type ApiDocument = OpenAPIObject;
export const apiDocument: ApiDocument = apiMetadata as ApiDocument;

// Usage example
import { apiDocument } from './types/api-document';

const userEndpoint = apiDocument.paths['/users'];
if (userEndpoint?.get) {
  console.log('GET /users summary:', userEndpoint.get.summary);
}
```

**Direct usage in Swagger UI:**

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('docs')
export class DocsController {
  @Get()
  getSwaggerUi(@Res() res: Response) {
    const apiMetadataPath = path.join(process.cwd(), 'api-metadata.json');

    if (!fs.existsSync(apiMetadataPath)) {
      return res.status(503).send('API metadata not found');
    }

    const apiMetadata = JSON.parse(fs.readFileSync(apiMetadataPath, 'utf-8'));

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            const spec = ${JSON.stringify(apiMetadata)};
            SwaggerUIBundle({
              spec: spec,
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
              ]
            });
          </script>
        </body>
      </html>
    `;
    res.send(html);
  }
}
```

**Notes:**

- `api-metadata.json` is generated at runtime, so you must run the application at least once for the file to be created.
- The file is saved in the `process.cwd()` path (current working directory when the application is executed).
- Make sure the `api-metadata.json` file is created before publishing as an npm package.
- The file may not exist, so it's good to always check for existence:

```typescript
import * as fs from 'fs';
import * as path from 'path';

function getApiMetadata() {
  // Use within the same project
  const apiMetadataPath = path.join(process.cwd(), 'api-metadata.json');

  if (!fs.existsSync(apiMetadataPath)) {
    throw new Error('api-metadata.json not found. Please run the API server first.');
  }

  return JSON.parse(fs.readFileSync(apiMetadataPath, 'utf-8'));
}
```

## Writing API Documentation with Comments

### Basic Usage

Writing JSDoc comments on controller methods will automatically be reflected in Swagger documents:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  /**
   * Retrieves user list.
   */
  @Get()
  findAll() {
    return [];
  }
}
```

### Separating Summary and Description

You can separate `summary` and `description` by using the `===` separator in comments:

```typescript
@Controller('users')
export class UsersController {
  /**
   * Get user list
   * ===
   * Retrieves all user lists.
   * Supports pagination and can retrieve up to 100 items.
   *
   * @returns User list array
   */
  @Get()
  findAll() {
    return [];
  }

  /**
   * Create user
   * ===
   * Creates a new user.
   * Email and password are required.
   */
  @Post()
  create() {
    return {};
  }
}
```

**Structure:**

- Text above `===` → Swagger `summary` (short summary)
- Text below `===` → Swagger `description` (detailed description)

### DTO Class Property Comments

Writing comments on response class (DTO) properties will also automatically be reflected in Swagger documents. You don't need to write the `description` of the `@ApiProperty` decorator separately:

```typescript
export class UserDto {
  /**
   * User unique ID
   */
  id: number;

  /**
   * User email address
   */
  email: string;

  /**
   * User name
   */
  name: string;

  /**
   * User creation date and time
   */
  createdAt: Date;
}
```

Writing comments as above will automatically apply `@ApiProperty({ description: '...' })`.

**Complex example:**

```typescript
export class CreateUserDto {
  /**
   * User email
   * Must be a valid email format.
   */
  @IsEmail()
  email: string;

  /**
   * User password
   * Must be at least 8 characters long.
   */
  @IsString()
  @MinLength(8)
  password: string;

  /**
   * User name
   */
  @IsString()
  name: string;
}
```

### Notes

- Comments must use JSDoc format (`/** */`)
- The `===` separator must use exactly 3 equal signs
- If `===` is not present, the entire comment is used as `description`
- DTO class property comments are automatically applied as `description` in `@ApiProperty`
- Classes in files with `.dto.ts` or `.entity.ts` extensions are automatically processed

## Common Response Configuration

### Define Common Response Class

First, define a common response wrapper class. Writing comments only will automatically apply `@ApiProperty`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CommonResponse<T> {
  /**
   * Response code
   */
  code: number;

  /**
   * Response message
   */
  message: string;

  /**
   * Response data
   */
  data: T;

  /**
   * Timestamp
   */
  timestamp: Date;
}
```

### Add Common Response to Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { SwaggerDocumentModule } from 'nestjs-swagger-document';
import { CommonResponse } from './common/common-response.dto';

@Module({
  imports: [
    SwaggerDocumentModule.forRoot({
      commonResponseInfo: {
        name: 'CommonResponse', // Common response class name
        properties: 'data', // Property name where actual data will be placed
      },
      builderOptions: {
        title: 'My API',
        version: '1.0.0',
      },
    }),
  ],
})
export class AppModule {}
```

### Usage in Controller

Specifying the return type of controller methods will automatically apply common responses. Using comments together will create more complete documentation:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  /**
   * Get user list
   * ===
   * Retrieves all user lists.
   * If the return type is specified as UserDto[],
   * it will automatically be wrapped as CommonResponse<UserDto[]>.
   */
  @Get()
  findAll(): UserDto[] {
    return [];
  }
}
```

**UserDto example (automatic comment application):**

```typescript
// dto/user.dto.ts
export class UserDto {
  /**
   * User unique ID
   */
  id: number;

  /**
   * User email
   */
  email: string;

  /**
   * User name
   */
  name: string;
}
```

### Excluding Common Response

To exclude common responses from specific controllers or methods, use the `@SwaggerAppCommonSkip()` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { SwaggerAppCommonSkip } from 'nestjs-swagger-document';

@Controller('health')
@SwaggerAppCommonSkip() // Applied to entire controller
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

Or apply to specific methods only:

```typescript
import { Controller, Get } from '@nestjs/common';
import { SwaggerAppCommonSkip } from 'nestjs-swagger-document';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get('raw')
  @SwaggerAppCommonSkip() // Exclude common response only for this method
  findRaw() {
    return { data: [] };
  }
}
```

## Configuration Options

### Default Plugin Options (pluginOptions)

This module uses the NestJS Swagger plugin to generate metadata. The following are the default plugin options:

```typescript
{
  // DTO file extensions (default: ['.dto.ts', '.entity.ts'])
  dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],

  // Controller file extensions (default: ['.controller.ts'])
  controllerFileNameSuffix: ['.controller.ts'],

  // Convert class-validator decorators to Swagger schema (default: true)
  classValidatorShim: true,

  // Metadata source path (automatically set)
  pathToSource: metadataFolder,

  // Key to extract from controller comments (default: 'description')
  controllerKeyOfComment: 'description',

  // Enable automatic comment extraction (default: true)
  introspectComments: true,

  // Debug mode (default: false)
  debug: false
}
```

#### Option Descriptions

- **`dtoFileNameSuffix`**: List of file extensions to find DTO classes. By default, processes `.dto.ts` and `.entity.ts` files.

  ```typescript
  SwaggerDocumentModule.forRoot({
    pluginOptions: {
      dtoFileNameSuffix: ['.dto.ts', '.entity.ts', '.model.ts'], // Add custom extensions
    },
  });
  ```

- **`controllerFileNameSuffix`**: List of file extensions to find controller classes. By default, processes `.controller.ts` files.

  ```typescript
  SwaggerDocumentModule.forRoot({
    pluginOptions: {
      controllerFileNameSuffix: ['.controller.ts', '.ctrl.ts'], // Add custom extensions
    },
  });
  ```

- **`classValidatorShim`**: Automatically converts `class-validator` decorators (`@IsString()`, `@IsEmail()`, etc.) to Swagger schemas. When set to `true`, validation rules are reflected in Swagger documents even without `@ApiProperty` decorators.

  ```typescript
  // When classValidatorShim: true
  export class CreateUserDto {
    @IsEmail()
    email: string; // Automatically converted to type: 'string', format: 'email'

    @IsString()
    @MinLength(8)
    password: string; // Automatically converted to type: 'string', minLength: 8
  }
  ```

- **`controllerKeyOfComment`**: Key to extract from controller method comments. Default is `'description'`, and this value is used as `description` in `@ApiOperation`.

- **`introspectComments`**: Whether to automatically extract JSDoc comments and reflect them in Swagger documents. When set to `true`, comments are automatically used as `description`.

  ```typescript
  SwaggerDocumentModule.forRoot({
    pluginOptions: {
      introspectComments: true, // Enable automatic comment extraction (default)
    },
  });
  ```

- **`debug`**: Whether to output debug logs from the plugin. Useful for troubleshooting during development.

#### Custom Plugin Options Usage Example

```typescript
import { Module } from '@nestjs/common';
import { SwaggerDocumentModule } from 'nestjs-swagger-document';

@Module({
  imports: [
    SwaggerDocumentModule.forRoot({
      pluginOptions: {
        // Customize DTO file extensions
        dtoFileNameSuffix: ['.dto.ts', '.entity.ts', '.model.ts'],

        // Customize controller file extensions
        controllerFileNameSuffix: ['.controller.ts'],

        // Disable class-validator automatic conversion
        classValidatorShim: false,

        // Disable automatic comment extraction (requires manual @ApiProperty writing)
        introspectComments: false,
      },
      builderOptions: {
        title: 'My API',
        version: '1.0.0',
      },
    }),
  ],
})
export class AppModule {}
```

### SwaggerDocumentModuleOptions

```typescript
interface SwaggerDocumentModuleOptions {
  // Plugin options
  pluginOptions?: PluginOptions;

  // Common response information
  commonResponseInfo?: {
    name: string; // Common response class name
    properties: string; // Data property name
  };

  // Swagger builder options
  builderOptions?: {
    title?: string;
    description?: string;
    version?: string;
    termsOfService?: string;
    contact?: {
      name: string;
      url: string;
      email: string;
    };
    license?: {
      name: string;
      url: string;
    };
    servers?: Array<{
      url: string;
      description?: string;
    }>;
    // ... other options
  };

  // Swagger document options
  documentOptions?: SwaggerDocumentOptions;

  // Debug mode
  debug?: boolean;
}
```

## Dynamic Configuration (forRootAsync)

Use `forRootAsync` to load configuration asynchronously:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SwaggerDocumentModule } from 'nestjs-swagger-document';

@Module({
  imports: [
    SwaggerDocumentModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        builderOptions: {
          title: configService.get('API_TITLE'),
          version: configService.get('API_VERSION'),
        },
        debug: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## How It Works

1. **Metadata Collection**: Collects metadata generated by the NestJS Swagger plugin
   - Automatically extracts JSDoc comments from controller methods and uses them as `description`
   - If `===` separator exists, splits into `summary` and `description`
   - Automatically extracts property comments from DTO classes (`.dto.ts`, `.entity.ts`) and uses them as `description` in `@ApiProperty`
2. **Decorator Application**: Automatically applies Swagger decorators to controllers and methods
   - Automatically applies extracted comment information to `@ApiOperation` decorators
   - Automatically applies DTO property comments to `@ApiProperty` decorators
3. **Common Response Processing**: Generates response schemas based on configured common response information
4. **Document Generation**: Generates the final **OpenAPI 3.0 spec** document and saves it as `api-metadata.json` file in the `process.cwd()` path
   - The file is created in the current working directory (project root) where the application is executed
   - The generated document follows the standard OpenAPI 3.0 format, so it's compatible with various tools
   - Can be used immediately with Swagger UI, Redoc, Postman, Insomnia, etc.

## Notes and Limitations

### Metadata Generation Delay

This module executes metadata generation **asynchronously in a Worker Thread**. Therefore, it has the following limitations:

1. **Document not created immediately after initialization**: The Swagger document may not have been created immediately after calling `SwaggerDocumentService.initialize()`.

2. **Asynchronous processing**: Since metadata generation runs in the background, there may be a delay of a few seconds after application startup.

3. **Null check required when accessing documents**: You must always perform null checks when providing documents in Swagger Controllers:

```typescript
@Controller('swagger')
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerDocumentService) {}

  @Get('json')
  getSwaggerJson() {
    const document = this.swaggerService.getDocument();

    if (!document) {
      return {
        message: 'Swagger document is being generated. Please try again in a few seconds.',
        status: 'pending',
      };
    }

    return document;
  }
}
```

4. **Retry mechanism recommended**: It's recommended to implement retry logic on the client side when fetching documents.

### Recommended Use Cases

This module is particularly useful in the following situations:

- ✅ **OpenAPI 3.0 spec utilization**: Generate standard OpenAPI specs for use with various tools
- ✅ **Using separate Swagger UI/Redoc clients**
- ✅ **Providing API documentation as JSON/YAML** for use in external tools (Postman, Insomnia, Stoplight, etc.)
- ✅ **Centralized documentation management in microservices environments**
- ✅ **Document generation and deployment in CI/CD pipelines**
- ✅ **API client SDK generation**: Automatically generate client code using OpenAPI specs

### Not Recommended Use Cases

In the following cases, it may be more appropriate to use `@nestjs/swagger`'s `SwaggerModule.setup()` directly:

- ❌ When Swagger UI must be provided immediately upon application startup
- ❌ When quick prototyping is needed in simple projects
- ❌ When Worker Thread environment cannot be used

## License

MIT
