export const nameSpace = 'TBTypes';

export const idMap = {
  AppendOrganization: 'Organization'
};

export const ObjectIdMap = {
  executorId: 'UserId',
  creatorId: 'UserId',
  categoryId: (typeName: string) => `${typeName}CategoryId`,
  id: (typeName: string) => typeName && `${idMap[typeName] || typeName}Id`,
};

export const MixedMap = {
  roleId: 'RoleId',
  orgRoleId: 'RoleId',
  permissions: (typeName) => (typeName === 'PermissionBind' || typeName === 'Role') && `PermissionBinding['permissions']`,
  externalRoleId: (typeName) => typeName === 'PermissionBind' && `PermissionBinding['externalRoleId']`,
  memberRoleId: (typeName) => typeName === 'PermissionBind' && `PermissionBinding['memberRoleId']`,
  level: (typeName) => typeName === 'PermissionBind' && `PermissionBinding['UserLevel']`,
  orgLevel: (typeName) => typeName === 'PermissionBind' && `PermissionBinding['UserLevel']`,
};

export const nameMap = {
  ...ObjectIdMap,
  ...MixedMap,
};
