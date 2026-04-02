import z from "zod";

export const getClassInfoSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.unknown()
});

export const createClassSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    classDisplayName: z.string().trim().min(1).max(256),
    isTestClass: z.boolean()
  })
});

export const joinClassSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    classCode: z.string()
  })
});

export const leaveClassSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.unknown()
});

export const deleteClassSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({})
});

export const changeDefaultPermissionSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    role: z.coerce.number().int().min(0).max(1)
  })
});

export const setClassMembersPermissionsSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
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
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    classMembers: z.array(
      z.object({
        accountId: z.coerce.number()
      })
    )
  })
});

export const getClassMembersSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.unknown()
});

export const kickLoggedOutUsersSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({})
});

export const changeClassNameSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    classDisplayName: z.string().trim().min(1).max(256)
  })
});

export const changeClassCodeSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({})
});

export const upgradeTestClassSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({})
});

export type getClassInfoTypeParams = z.infer<typeof getClassInfoSchema>["params"];
export type createClassTypeBody = z.infer<typeof createClassSchema>["body"];
export type joinClassTypeBody = z.infer<typeof joinClassSchema>["body"];
export type leaveClassTypeParams = z.infer<typeof leaveClassSchema>["params"];
export type deleteClassTypeParams = z.infer<typeof deleteClassSchema>["params"];
export type changeDefaultPermissionTypeParams = z.infer<typeof changeDefaultPermissionSchema>["params"];
export type changeDefaultPermissionTypeBody = z.infer<typeof changeDefaultPermissionSchema>["body"];
export type setClassMembersPermissionsTypeParams = z.infer<typeof setClassMembersPermissionsSchema>["params"];
export type setClassMembersPermissionsTypeBody = z.infer<typeof setClassMembersPermissionsSchema>["body"];
export type kickClassMembersTypeParams = z.infer<typeof kickClassMembersSchema>["params"];
export type kickClassMembersTypeBody = z.infer<typeof kickClassMembersSchema>["body"];
export type getClassMembersTypeParams = z.infer<typeof getClassMembersSchema>["params"];
export type kickLoggedOutUsersTypeParams = z.infer<typeof kickLoggedOutUsersSchema>["params"];
export type changeClassNameTypeParams = z.infer<typeof changeClassNameSchema>["params"];
export type changeClassNameTypeBody = z.infer<typeof changeClassNameSchema>["body"];
export type changeClassCodeTypeParams = z.infer<typeof changeClassCodeSchema>["params"];
export type upgradeTestClassTypeParams = z.infer<typeof upgradeTestClassSchema>["params"];