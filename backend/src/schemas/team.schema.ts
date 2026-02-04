import z, { strictObject } from "zod";

export const setTeamsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    teams: z.array(
      z.object({
        teamId: z.union([z.literal(""), z.coerce.number()]),
        name: z.string().trim().min(1).max(256)
      })
    )
  })
});

export const setJoinedTeamsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    teams: z.array(z.number())
  })
});

export const addPrivateTeamSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    name: z.string().trim().min(1).max(256)
  })
});

export const joinPrivateTeamSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    inviteCode: z.string().trim().min(1).max(256)
  })
});

export const deletePrivateTeamSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    teamId: z.coerce.number()
  })
});

export const leavePrivateTeamSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    teamId: z.coerce.number()
  })
});

export type setJoinedTeamsTypeBody = z.infer<typeof setJoinedTeamsSchema>["body"];
export type setTeamsTypeBody = z.infer<typeof setTeamsSchema>["body"];
export type addPrivateTeamTypeBody = z.infer<typeof addPrivateTeamSchema>["body"];
export type joinPrivateTeamTypeBody = z.infer<typeof joinPrivateTeamSchema>["body"];
export type deletePrivateTeamTypeBody = z.infer<typeof deletePrivateTeamSchema>["body"];
export type leavePrivateTeamTypeBody = z.infer<typeof leavePrivateTeamSchema>["body"];