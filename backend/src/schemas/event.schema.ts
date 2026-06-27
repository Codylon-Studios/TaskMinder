import z from "zod";

// optional flag: when true the item is personal (account-scoped) instead of shared/team-scoped.
// accepts a real boolean or a form string ("true"/"false"); defaults to false (shared).
const isPersonalField = z
  .preprocess(val => (typeof val === "string" ? val === "true" : val), z.boolean())
  .optional()
  .default(false);

export const addEventSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    eventTypeId: z.coerce.number(),
    name: z.string().trim().min(1).max(256),
    description: z.string().trim().min(1).max(1024).nullable().or(z.literal("")),
    startDate: z.coerce.number(),
    lesson: z.string().trim().min(1).nullable().or(z.literal("")),
    endDate: z.preprocess(val => {
      if (val === "") return null;
      return val;
    }, z.coerce.number().nullable()),
    teamId: z.coerce.number(),
    isPersonal: isPersonalField
  })
});

export const editEventSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    eventTypeId: z.coerce.number(),
    name: z.string().trim().min(1).max(256),
    description: z.string().trim().min(1).max(1024).nullable().or(z.literal("")),
    startDate: z.coerce.number(),
    lesson: z.string().trim().min(1).nullable().or(z.literal("")),
    endDate: z.coerce.number().nullable(),
    teamId: z.coerce.number(),
    isPersonal: isPersonalField
  })
});

export const deleteEventSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.unknown()
});

export const pinEventSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    pinStatus: z.boolean()
  })
});

export const setEventTypesSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    eventTypes: z.array(
      z.object({
        eventTypeId: z.union([z.literal(""), z.coerce.number()]),
        name: z.string().trim().min(1).max(256),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
      })
    )
  })
});

export type editEventTypeParams = z.infer<typeof editEventSchema>["params"];
export type deleteEventTypeParams = z.infer<typeof deleteEventSchema>["params"];
export type pinEventTypeParams = z.infer<typeof pinEventSchema>["params"];

export type addEventTypeBody = z.infer<typeof addEventSchema>["body"];
export type editEventTypeBody = z.infer<typeof editEventSchema>["body"];
export type pinEventTypeBody = z.infer<typeof pinEventSchema>["body"];
export type setEventTypesTypeBody = z.infer<typeof setEventTypesSchema>["body"];