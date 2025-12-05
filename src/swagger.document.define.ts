import { PluginOptions } from '@nestjs/swagger/dist/plugin/merge-options';
import { ApiResponseOptions } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import {
  ExternalDocumentationObject,
  ParameterObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerVariableObject,
  ExtensionLocation,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { SwaggerDocumentOptions } from '@nestjs/swagger';

export interface CommonResponseInfo {
  /**
   * Common response class name
   */
  name: string;
  /**
   * Common response property name
   */
  properties: string;
}

export interface builderOptions {
  /**
   * API title
   */
  title?: string;
  /**
   * API description
   */
  description?: string;
  /**
   * API version
   */
  version?: string;
  /**
   * Terms of service URL
   */
  termsOfService?: string;
  /**
   * Contact information
   */
  contact?: {
    name: string;
    url: string;
    email: string;
  };
  /**
   * License information
   */
  license?: {
    name: string;
    url: string;
  };
  /**
   * OpenAPI version
   */
  openApiVersion?: string;
  /**
   * Base path
   */
  basePath?: string;
  /**
   * Server list
   */
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, ServerVariableObject>;
  }>;
  /**
   * External documentation information
   */
  externalDoc?: {
    description: string;
    url: string;
  };
  /**
   * Tag list
   */
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
  }>;
  /**
   * Extension information list
   */
  extensions?: Array<{
    extensionKey: string;
    extensionProperties: any;
    location?: ExtensionLocation;
  }>;
  /**
   * Security schema list
   */
  securitySchemes?: Array<{
    name: string;
    options: SecuritySchemeObject;
  }>;
  /**
   * Global response list
   */
  globalResponses?: ApiResponseOptions[];
  /**
   * Global parameter list
   */
  globalParameters?: Array<Omit<ParameterObject, 'example' | 'examples'>>;
  /**
   * Security requirement list
   */
  securityRequirements?: Array<{
    name: string | SecurityRequirementObject;
    requirements?: string[];
  }>;
  /**
   * Bearer authentication configuration
   */
  bearerAuth?: {
    options?: SecuritySchemeObject;
    name?: string;
  };
  /**
   * OAuth2 authentication configuration
   */
  oAuth2?: {
    options?: SecuritySchemeObject;
    name?: string;
  };
  /**
   * API Key authentication configuration
   */
  apiKey?: {
    options?: SecuritySchemeObject;
    name?: string;
  };
  /**
   * Basic authentication configuration
   */
  basicAuth?: {
    options?: SecuritySchemeObject;
    name?: string;
  };
  /**
   * Cookie authentication configuration
   */
  cookieAuth?: {
    cookieName?: string;
    options?: SecuritySchemeObject;
    securityName?: string;
  };
}

export interface SwaggerDocumentModuleOptions {
  /**
   * Plugin options
   */
  pluginOptions?: PluginOptions;
  /**
   * Common response information
   */
  commonResponseInfo?: CommonResponseInfo;
  /**
   * Swagger builder options
   */
  builderOptions?: builderOptions;
  /**
   * Swagger document options
   */
  documentOptions?: SwaggerDocumentOptions;
  /**
   * Debug mode
   */
  debug?: boolean;
}
