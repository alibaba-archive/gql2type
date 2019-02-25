import { DocumentFile, PluginFunction, PluginValidateFn } from 'graphql-codegen-core';
import { initClientTemplate, TypeScriptClientConfig } from './typescript-client';
import { GraphQLSchema } from 'graphql';
import * as Handlebars from 'handlebars';
import * as rootTemplate from './root.handlebars';
import * as clientTemplate from './typescript-client.handlebars';

export const plugin: PluginFunction = async (
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: TypeScriptClientConfig,
): Promise<string> => {
  const templateContext = initClientTemplate(Handlebars, documents, schema, config);

  Handlebars.registerHelper('firstOf', (something: any[]) => something[0]);
  Handlebars.registerPartial('client', clientTemplate);

  return Handlebars.compile(rootTemplate)(templateContext);
};

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: any,
  outputFile: string
) => {
  if (!outputFile.endsWith('.d.ts')) {
    throw new Error(`Plugin "typescript-graphql-files-modules" requires extension to be ".d.ts"!`);
  }
};
