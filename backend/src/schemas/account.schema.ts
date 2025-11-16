import z from "zod";
import { checkUsername } from "../utils/validate.functions";

export const registerAccountSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    }),
    password: z.string().trim().min(4)
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
  params: z.object({}),
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
    newPassword: z.string().trim().min(4)
  })
});

export const checkUsernameSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    })
  })
});


export type registerAccountType = z.infer<typeof registerAccountSchema>;
export type loginAccountType = z.infer<typeof loginAccountSchema>;
export type deleteAccountType = z.infer<typeof deleteAccountSchema>;
export type changeUsernameType = z.infer<typeof changeUsernameSchema>;
export type changePasswordType = z.infer<typeof changePasswordSchema>;
export type checkUsernameType = z.infer<typeof checkUsernameSchema>;

export type registerAccountTypeBody = z.infer<typeof registerAccountSchema>["body"];
export type loginAccountTypeBody = z.infer<typeof loginAccountSchema>["body"];
export type deleteAccountTypeBody = z.infer<typeof deleteAccountSchema>["body"];
export type changeUsernameTypeBody = z.infer<typeof changeUsernameSchema>["body"];
export type changePasswordTypeBody = z.infer<typeof changePasswordSchema>["body"];
export type checkUsernameTypeBody = z.infer<typeof checkUsernameSchema>["body"];
