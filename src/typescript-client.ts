import { TypeScriptCommonConfig, initCommonTemplate } from './typescript-common';
import { transformDocumentsFiles } from 'graphql-codegen-core';
import { flattenTypes, buildFilesArray } from 'graphql-codegen-plugin-helpers';
import * as Handlebars from 'handlebars';
import * as selectionSet from './selection-set.handlebars';
import { shouldHavePrefix, fragments as toFragments, convertedFieldType } from './helpers';

export interface TypeScriptClientConfig extends TypeScriptCommonConfig {
  noNamespaces?: boolean;
}

export function initClientTemplate(hbs, documents, schema, config: TypeScriptClientConfig) {
  const { templateContext, convert } = initCommonTemplate(hbs, schema, config);
  const transformedDocuments = transformDocumentsFiles(schema, documents);
  const flattenDocuments = flattenTypes(transformedDocuments);
  const { operations, fragments } = flattenDocuments;
  const files = buildFilesArray(transformedDocuments);

  files.forEach((file: any) => {
    file.operations = [];
    file.fragments = [];
  });

  operations.forEach(op => {
    const fileNames = op.originalFile.split('/');
    const fileName = fileNames[fileNames.length - 1];
    const file: any = files.find(file => file.filename === fileName);
    file.operations.push(op);
  });

  fragments.forEach(fg => {
    const fileNames = fg.originalFile.split('/');
    const fileName = fileNames[fileNames.length - 1];
    const file: any = files.find(file => file.filename === fileName);

    file.fragments.push(fg);
  });

  Handlebars.registerPartial('selectionSet', selectionSet);
  Handlebars.registerHelper('shouldHavePrefix', shouldHavePrefix);
  Handlebars.registerHelper('fragments', toFragments(convert));
  Handlebars.registerHelper('convertedFieldType', convertedFieldType(convert));

  const hbsContext = {
    ...templateContext,
    ...flattenDocuments,
    files,
  };

  return hbsContext;
}
