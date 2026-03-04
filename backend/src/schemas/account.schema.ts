import z from "zod";
import { checkUsername } from "../utils/validate.functions.js";

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const registerAccountSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    }),
    password: passwordSchema
  })
});

export const loginAccountSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    }),
    password: z.string().trim().min(4)
  })
});

export const deleteAccountSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    password: z.string().trim().min(4)
  })
});

export const changeUsernameSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    password: z.string().trim().min(4),
    newUsername: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    })
  })
});

export const changePasswordSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    oldPassword: z.string().trim().min(4),
    newPassword: passwordSchema
  })
});

export const checkUsernameSchema = z.object({
  // omit body due to GET request
  params: z.object({}),
  query: z.object({
    username: z.string().trim().min(4)
  })
});

export type deleteAccountTypeParams = z.infer<typeof deleteAccountSchema>["params"];

export type checkUsernameTypeQuery = z.infer<typeof checkUsernameSchema>["query"];

export type registerAccountTypeBody = z.infer<typeof registerAccountSchema>["body"];
export type loginAccountTypeBody = z.infer<typeof loginAccountSchema>["body"];
export type deleteAccountTypeBody = z.infer<typeof deleteAccountSchema>["body"];
export type changeUsernameTypeBody = z.infer<typeof changeUsernameSchema>["body"];
export type changePasswordTypeBody = z.infer<typeof changePasswordSchema>["body"];
