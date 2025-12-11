import { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import logger from "../config/logger";
import { performUploadCleanup } from "../utils/upload.cleanup";


type RequestValidationSchema = z.ZodObject<{
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}>;

export const validate = <T extends RequestValidationSchema>(schema: T) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        // Bypass Express typing
        // eslint-disable-next-line
        Object.assign(req.query as any, parsed.query);
      }
      if (parsed.params !== undefined) {
        // Bypass Express typing
        // eslint-disable-next-line
        Object.assign(req.params as any, parsed.params);
      }

      next();
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        // Ensure uploaded temp files are cleaned up on validation failure
        try {
          await performUploadCleanup(req, res, "validation failure");
        }
        catch (cleanupErr) {
          logger.warn("An error occurred during validation cleanup:\t", cleanupErr);
        }

        const expectedSchema = {
          description: '"params" is for the required URL parameters, "query" for the query parameters and "body" is the expected request body',
          ... z.toJSONSchema(schema).properties
        };
        res.status(400).json({
          message: "Validation failed",
          error: z.prettifyError(err),
          expectedSchema: expectedSchema
        });
      } 
      else {
        next(err);
      }
    }
  };
