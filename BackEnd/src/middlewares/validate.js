import { ValidationError } from "../errors/index.js";

/**
 * Higher-order middleware to validate requests using Zod schemas.
 * @param {import('zod').AnyZodObject} schema 
 */
const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace req objects with validated data to ensure type safety
    req.body = validated.body;
    req.query = validated.query;
    req.params = validated.params;

    return next();
  } catch (error) {
    const details = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    return next(new ValidationError("Validation Failed", details));
  }
};

export default validate;
