import * as z from "zod";
import { isValidEmail, isValidPassword } from "../../regex/regexRules.js";

export function signupSchema() {
  return z.object({
    fullname: z.string().trim().min(1, "One or more inputs are invalid."),
    username: z.string().trim().min(4, "One or more inputs are invalid."),
    email: z
      .string()
      .trim()
      .refine((val) => isValidEmail(val), "One or more inputs are invalid."),
    password: z
      .string()
      .trim()
      .refine((val) => isValidPassword(val), "One or more inputs are invalid."),
  }).strict();
}
