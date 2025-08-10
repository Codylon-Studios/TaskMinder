import z from "zod";
import { checkUsername } from "../utils/validateFunctions";

export const registerAccountSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    }),
    password: z.string()
  })
});

export const loginAccountSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    username: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    }),
    password: z.string()
  })
});

export const deleteAccountSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    password: z.string()
  })
});

export const changeUsernameSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    newUsername: z.string().refine(checkUsername, {
      message: "Username must be 4-20 characters, letters, digits, or underscore only"
    })
  })
});


export const changePasswordSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    oldPassword: z.string(),
    newPassword: z.string()
  })
});

export const checkUsernameSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
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