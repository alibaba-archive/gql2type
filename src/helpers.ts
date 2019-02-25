import {
  Field,
  Operation,
  SelectionSetFragmentSpread,
  SelectionSetInlineFragment,
  Fragment
} from 'graphql-codegen-core';
import { SafeString } from 'handlebars';
import * as Handlebars from 'handlebars';
import { nameSpace, nameMap } from './name-map';

export function concat(...args: string[]) {
  args.pop(); // HBS options passed as last argument

  return args.join('');
}

export function defineMaybe(options: Handlebars.HelperOptions): string {
  const config = options.data.root.config || {};
  const optionalType = config.optionalType || 'null';
  const useMaybe = config.optionalType;

  if (!useMaybe) {
    return '';
  }
  return `declare type Maybe<T> = T | ${optionalType};`;
}

export function useMaybe(type: string, options: Handlebars.HelperOptions): string {
  const config = options.data.root.config || {};
  const useMaybe = config.optionalType;
  return useMaybe ? `Maybe<${type}>` : type;
}

export function getScalarType(type: string, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  if (config.scalars && type in config.scalars) {
    return config.scalars[type as string];
  } else {
    return 'any';
  }
}

export function importEnum(name: string, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  const definition = config.enums && config.enums[name];

  if (typeof definition === 'string') {
    // filename specified with optional type name
    const [file, type] = config.enums[name].split('#');
    return { name, file, type };
  }

  if (typeof definition === 'object' && definition === null) {
    // empty definition: don't generate anything
    return {};
  }

  // fall through to normal or value-mapped generation
  return undefined;
}

export function getEnumValue(type: string, name: string, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  if (config.enums && config.enums[type] != null && name in config.enums[type]) {
    return config.enums[type][name];
  } else {
    return `"${name}"`;
  }
}

export function mapTBType(field: Field, realType: string, onType: string, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  const replaces: { [key: string]: string } = config.tbReplaces || {};
  if (!field.isScalar || isPrimitiveType(field, options)) {
    return realType;
  }
  const fieldName = field.name.replace(/^_/, '').replace(/s$/, '').replace(/^\w/, c => c.toLowerCase());
  let mappedName = nameMap[fieldName] || nameMap[field.name] ;
  mappedName = (mappedName && mappedName.__proto__.constructor === Function ? mappedName(onType) : mappedName);
  let mappedResult = mappedName;
  if (!mappedName && realType === 'ObjectId') {
    mappedResult = field.name.replace(/^_/, '').replace(/s$/, '').replace(/^\w/, c => c.toUpperCase());
  }
  if (mappedResult) {
    mappedResult = Object.keys(replaces).reduce((acc, key) => {
      return acc.replace(new RegExp(key), replaces[key]);
    }, mappedResult);
  }
  return mappedResult ? `${nameSpace}.${mappedResult}` : realType;
}

export function getFieldType(field: Field, realType: string, onType: string, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  const useImmutable = !!config.immutableTypes;

  function extendType(type: string) {
    return field.hasDefaultValue ? type : useMaybe(type, options);
  }

  if (field.isArray) {
    let result = mapTBType(field, realType, onType, options);

    const dimension = field.dimensionOfArray + 1;

    if (field.isNullableArray && config.useMaybe) {
      result = useImmutable ? useMaybe(result, options) : `(${useMaybe(result, options)})`;
    }

    if (useImmutable) {
      result = `${new Array(dimension).join('ReadonlyArray<')}${result}${new Array(dimension).join('>')}`;
    } else {
      result = `${result}${new Array(dimension).join('[]')}`;
    }

    if (!field.isRequired) {
      result = extendType(result);
    }

    return result;
  } else {
    if (field.isRequired) {
      return mapTBType(field, realType, onType, options);
    } else {
      return extendType(mapTBType(field, realType, onType, options));
    }
  }
}

export function getOptionals(type: Field, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};

  if (
    config.avoidOptionals === '1' ||
    config.avoidOptionals === 'true' ||
    config.avoidOptionals === true ||
    config.avoidOptionals === 1
  ) {
    return '';
  }

  if (!type.isRequired) {
    return '?';
  }

  return '';
}

export const getType = (convert: Function) => (type: Field, onType: string, options: Handlebars.HelperOptions) => {
  if (!type) {
    return '';
  }

  const result = convertedType(type, onType, options, convert);

  return new SafeString(result);
};

export function convertedType(type: Field, onType: string, options: Handlebars.HelperOptions, convert, skipConversion = false) {
  const baseType = type.type;
  const config = options.data.root.config || {};
  const realType =
    options.data.root.primitives[baseType] ||
    `${type.isScalar ? '' : config.interfacePrefix || ''}${skipConversion ? baseType : convert(baseType, 'typeNames')}`;

  return getFieldType(type, realType, convert(onType, 'typeNames'), options);
}

export function shouldHavePrefix(field: Field, options: Handlebars.HelperOptions) {
  const config = options.data.root.config || {};
  const nonPrefixable = field.isEnum || field.isScalar;

  return config.noNamespaces === true && !isPrimitiveType(field, options) && !nonPrefixable;
}

export function isPrimitiveType(type: Field, options: Handlebars.HelperOptions) {
  return options.data.root.primitives[type.type];
}

function nameFragment(
  convert: (str: string, kind: string) => string,
  prefix: string,
  fragment: SelectionSetFragmentSpread | SelectionSetInlineFragment,
  noNamespaces: boolean
) {
  if (isFragmentSpread(fragment)) {
    return convert(fragment.fragmentName, 'typeNames') + (noNamespaces ? '' : '.') + 'Fragment';
  }

  return (noNamespaces ? convert(prefix, 'typeNames') : '') + fragment.name;
}

function isFragmentSpread(
  fragment: SelectionSetFragmentSpread | SelectionSetInlineFragment
): fragment is SelectionSetFragmentSpread {
  return fragment.isFragmentSpread;
}

export function fragments(convert: (str: string) => string) {
  return (operation: Operation, prefix: string, fragments: Fragment[], options: Handlebars.HelperOptions): string => {
    const config = options.data.root.config || {};
    const noNamespaces = config.noNamespaces === true;
    const fragmentsByType: {
      [type: string]: Array<string>;
    } = {};

    operation.inlineFragments.forEach(fragment => {
      const type = fragment.onType;

      if (!fragmentsByType[type]) {
        fragmentsByType[type] = [];
      }
      fragmentsByType[type].push(nameFragment(convert, prefix, fragment, noNamespaces));
    });

    operation.fragmentsSpread.forEach(fragment => {
      const def = fragments.find(f => f.name === fragment.fragmentName);

      if (!def) {
        throw new Error(
          `A fragment spread you used "${
            fragment.fragmentName
          }" could not found. Please make sure that it's loaded as a GraphQL document!`
        );
      }

      if (!fragmentsByType[def.onType]) {
        fragmentsByType[def.onType] = [];
      }
      fragmentsByType[def.onType].push(nameFragment(convert, prefix, fragment, noNamespaces));
    });

    const mergedFragments = Object.values(fragmentsByType)
      // (F1 & F1)
      .map(names => {
        const joined = names.join(' & ');

        return names.length > 1 ? `(${joined})` : joined;
      })
      // (F1 & F2) | (F3 & F4)
      .join(' | ');

    const output: string[] = [];

    if (mergedFragments && operation.hasFields) {
      output.push(' & ');
    }

    if (Object.keys(fragmentsByType).length > 1) {
      output.push(`(${mergedFragments})`);
    } else {
      output.push(mergedFragments);
    }

    return output.join('');
  };
}

export function convertedFieldType(convert) {
  return (field: Field, prefix: string, onType: string , options: Handlebars.HelperOptions) => {
    const config = options.data.root.config || {};
    let realType = '';
    const primitiveType = isPrimitiveType(field, options);

    if (shouldHavePrefix(field, options)) {
      realType = convert(prefix, 'typeNames');

      if (config.noNamespaces) {
        realType += field.type;
      }
    } else if (primitiveType) {
      realType = primitiveType;
    } else {
      realType = convert(field.type, 'typeNames');
    }

    return new SafeString(getFieldType(field, realType, convert(onType, 'typeNames'), options));
  };
}
