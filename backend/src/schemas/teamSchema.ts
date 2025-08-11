import z, { strictObject } from "zod";

export const setTeamsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    teams: z.array(
      z.object({
        teamId: z.union([z.literal(""), z.coerce.number()]),
        name: z.string()
      })
    )
  })
});

export const setJoinedTeamsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: strictObject({
    teams: z.array(z.number())
  })
});

export type setJoinedTeamsType = z.infer<typeof setJoinedTeamsSchema>;
export type setTeamsType = z.infer<typeof setTeamsSchema>;

export type setJoinedTeamsTypeBody = z.infer<typeof setJoinedTeamsSchema>["body"];
export type setTeamsTypeBody = z.infer<typeof setTeamsSchema>["body"];