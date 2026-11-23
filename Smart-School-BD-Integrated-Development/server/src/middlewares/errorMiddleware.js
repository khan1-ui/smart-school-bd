
const notFound = (req, res, next) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const validErrorStatus =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599;

  const statusCode = validErrorStatus
    ? err.statusCode
    : 500;

  // Safe production error logging.
  // Never log request bodies, passwords, tokens or secrets.
  console.error("[API_ERROR]", {
    method: req.method,
    path: req.originalUrl.split("?")[0],
    statusCode,
    errorName: err.name,
    errorCode: err.code || null,
    message: err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== "production"
      ? { stack: err.stack }
      : {}),
  });

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
