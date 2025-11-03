function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
    },
  });
}

module.exports = errorHandler;
