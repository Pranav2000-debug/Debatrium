import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

/**
 * Zod validation middleware, that validates a schema, and calls next with updated request object.
 * DB checks are NOT in zod validation and will be part of the controller itself.
 * @param { ZodSchema } schema
 * @param {"body" | "param" | "query"} property DEFAULT = "body"
 *
 * ZOD owns:-
 * Presence
 * Type
 * Format
 * Length
 * Regex rules
 * Trimming / normalization
 */

export function validate(schema, property = "body") {
  // express stores this middleware and runs on every request before controller.
  return function (req, _, next) {
    try {
      const parsedData = schema.parse(req[property]);
      req[property] = parsedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues?.[0]?.message;
          // .map((issue) => {
          //   return issue.message;
          // })
          // .join(", ");
        throw new ApiError(400, message);
      }
      next(error);
    }
  };
}
