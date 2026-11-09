
export class ApiError extends Error {
  constructor(statusCode, message, code, errors) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
};


export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = 500;
  let message = 'Something went wrong. Please try again.';
  let code;
  let errors;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    errors = err.errors;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body must be valid JSON.';
    code = 'INVALID_JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'This record already exists.';
    code = 'DUPLICATE';
  } else {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(code && { code }),
    ...(errors && { errors }),
  });
};
