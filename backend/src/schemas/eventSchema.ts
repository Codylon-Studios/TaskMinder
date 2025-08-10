import z from "zod";

export const addEventSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    eventTypeId: z.coerce.number(),
    name: z.string(),
    description: z.string().nullable(),
    startDate: z.coerce.number(),
    lesson: z.string().nullable(),
    endDate: z.preprocess(val => {
      if (val === "") return null;
      return val;
    }, z.coerce.number().nullable()),
    teamId: z.coerce.number()
  })
});


export const editEventSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    eventId: z.coerce.number(),
    eventTypeId: z.coerce.number(),
    name: z.string(),
    description: z.string().nullable(),
    startDate: z.coerce.number(),
    lesson: z.string().nullable(),
    endDate: z.coerce.number().nullable(),
    teamId: z.coerce.number()
  })
});


export const deleteEventSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    eventId: z.coerce.number()
  })
});


export const setEventTypesSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    eventTypes: z.array(
      z.object({
        eventTypeId: z.union([z.literal(""), z.coerce.number()]),
        name: z.string(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
      })
    )
  })
});


export type addEventType = z.infer<typeof addEventSchema>;
export type editEventType = z.infer<typeof editEventSchema>;
export type deleteEventType = z.infer<typeof deleteEventSchema>;
export type setEventTypesType = z.infer<typeof setEventTypesSchema>;

export type addEventTypeBody = z.infer<typeof addEventSchema>["body"];
export type editEventTypeBody = z.infer<typeof editEventSchema>["body"];
export type deleteEventTypeBody = z.infer<typeof deleteEventSchema>["body"];
export type setEventTypesTypeBody = z.infer<typeof setEventTypesSchema>["body"];