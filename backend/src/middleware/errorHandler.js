const errorHandler = (err, req, res, _next) => {
  console.error("Error:", err.message || err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
