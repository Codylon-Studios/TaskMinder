import z from "zod";

export const createClassSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    classDisplayName: z.string(),
    isTestClass: z.boolean()
  })
});


export const joinClassSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    classCode: z.string()
  })
});

export const changeDefaultPermissionSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    defaultPermission: z.coerce.number()
  })
});


export const setClassMembersPermissionsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    classMembers: z.array(
      z.object({
        accountId: z.number(),
        permissionLevel: z.coerce.number().int().min(0).max(3)
      })
    )
  })
});


export const kickClassMembersSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    classMembers: z.array(
      z.object({
        accountId: z.coerce.number()
      })
    )
  })
});


export const updateDSBMobileDataSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    dsbMobileActivated: z.boolean(),
    dsbMobileUser: z.string().nullable(),
    dsbMobilePassword: z.string().nullable(),
    dsbMobileClass: z.string().nullable()
  })
});


export const setUsersLoggedOutRoleSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    role: z.coerce.number().int().min(0).max(3)
  })
});


export type createClassType = z.infer<typeof createClassSchema>;
export type joinClassType = z.infer<typeof joinClassSchema>;
export type changeDefaultPermissionType = z.infer<typeof changeDefaultPermissionSchema>;
export type setClassMembersPermissionsType = z.infer<typeof setClassMembersPermissionsSchema>;
export type kickClassMembersType = z.infer<typeof kickClassMembersSchema>;
export type updateDSBMobileDataType = z.infer<typeof updateDSBMobileDataSchema>;
export type setUsersLoggedOutRoleType = z.infer<typeof setUsersLoggedOutRoleSchema>;

export type createClassTypeBody = z.infer<typeof createClassSchema>["body"];
export type joinClassTypeBody = z.infer<typeof joinClassSchema>["body"];
export type changeDefaultPermissionTypeBody = z.infer<typeof changeDefaultPermissionSchema>["body"];
export type setClassMembersPermissionsTypeBody = z.infer<typeof setClassMembersPermissionsSchema>["body"];
export type kickClassMembersTypeBody = z.infer<typeof kickClassMembersSchema>["body"];
export type updateDSBMobileDataTypeBody = z.infer<typeof updateDSBMobileDataSchema>["body"];
export type setUsersLoggedOutRoleTypeBody = z.infer<typeof setUsersLoggedOutRoleSchema>["body"];