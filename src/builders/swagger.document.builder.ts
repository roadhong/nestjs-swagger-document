import { Injectable, Logger } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

@Injectable()
export class SwaggerDocumentBuilder {
  private readonly logger = new Logger(SwaggerDocumentBuilder.name);

  build(builderOptions: Record<string, any> = {}, debug?: boolean): Omit<OpenAPIObject, 'paths'> {
    if (debug) {
      this.logger.debug('Building Swagger document...');
    }
    const documentBuilder = new DocumentBuilder()
      .setTitle(builderOptions.title ?? 'Swagger API')
      .setDescription(builderOptions.description ?? 'Swagger API Description')
      .setVersion(builderOptions.version ?? '1.0.0');

    if (debug) {
      this.logger.debug(`Document title: ${builderOptions.title ?? 'Swagger API'}, version: ${builderOptions.version ?? '1.0.0'}`);
    }

    if (builderOptions.termsOfService) {
      documentBuilder.setTermsOfService(builderOptions.termsOfService);
    }
    if (builderOptions.contact) {
      documentBuilder.setContact(builderOptions.contact.name, builderOptions.contact.url, builderOptions.contact.email);
    }
    if (builderOptions.license) {
      documentBuilder.setLicense(builderOptions.license.name, builderOptions.license.url);
    }
    if (builderOptions.openApiVersion) {
      documentBuilder.setOpenAPIVersion(builderOptions.openApiVersion);
    }
    if (builderOptions.contact) {
      documentBuilder.setContact(builderOptions.contact.name, builderOptions.contact.url, builderOptions.contact.email);
    }
    if (builderOptions.license) {
      documentBuilder.setLicense(builderOptions.license.name, builderOptions.license.url);
    }
    if (builderOptions.openApiVersion) {
      documentBuilder.setOpenAPIVersion(builderOptions.openApiVersion);
    }
    if (builderOptions.basePath) {
      documentBuilder.setBasePath(builderOptions.basePath);
    }
    if (builderOptions.servers) {
      builderOptions.servers.forEach((server) => {
        documentBuilder.addServer(server.url, server.description, server.variables);
      });
    }
    if (builderOptions.externalDoc) {
      documentBuilder.setExternalDoc(builderOptions.externalDoc.description, builderOptions.externalDoc.url);
    }
    if (builderOptions.tags) {
      builderOptions.tags.forEach((tag) => {
        documentBuilder.addTag(tag.name, tag.description, tag.externalDocs);
      });
    }
    if (builderOptions.extensions) {
      builderOptions.extensions.forEach((extension) => {
        documentBuilder.addExtension(extension.extensionKey, extension.extensionProperties, extension.location);
      });
    }
    if (builderOptions.securitySchemes) {
      builderOptions.securitySchemes.forEach((security) => {
        documentBuilder.addSecurity(security.name, security.options);
      });
    }
    if (builderOptions.globalResponses) {
      documentBuilder.addGlobalResponse(...builderOptions.globalResponses);
    }
    if (builderOptions.globalParameters) {
      documentBuilder.addGlobalParameters(...builderOptions.globalParameters);
    }
    if (builderOptions.securityRequirements) {
      builderOptions.securityRequirements.forEach((requirement) => {
        documentBuilder.addSecurityRequirements(requirement.name, requirement.requirements);
      });
    }
    if (builderOptions.bearerAuth) {
      documentBuilder.addBearerAuth(builderOptions.bearerAuth.options, builderOptions.bearerAuth.name);
    }
    if (builderOptions.oAuth2) {
      documentBuilder.addOAuth2(builderOptions.oAuth2.options, builderOptions.oAuth2.name);
    }
    if (builderOptions.apiKey) {
      documentBuilder.addApiKey(builderOptions.apiKey.options, builderOptions.apiKey.name);
    }
    if (builderOptions.basicAuth) {
      documentBuilder.addBasicAuth(builderOptions.basicAuth.options, builderOptions.basicAuth.name);
    }
    if (builderOptions.cookieAuth) {
      documentBuilder.addCookieAuth(builderOptions.cookieAuth.cookieName, builderOptions.cookieAuth.options, builderOptions.cookieAuth.securityName);
    }

    const document = documentBuilder.build();
    if (debug) {
      this.logger.debug('Swagger document built successfully');
    }

    return document;
  }
}
