const ApiError = require('../utils/ApiError');
// validate({ body: zodSchema, query: zodSchema, params: zodSchema })
module.exports = (schemas) => (req, res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const r = schemas[part].safeParse(req[part]);
    if (!r.success) {
      const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    if (part === 'body') req.body = r.data;
  }
  next();
};
