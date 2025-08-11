import { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";


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
        res.status(400).json({
          message: "Validation failed",
          schema: z.prettifyError(err)
        });
      } 
      else {
        next(err);
      }
    }
  };