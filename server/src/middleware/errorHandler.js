function notFound(req, res, next) {
    const error = new Error(`Not Found — ${req.originalUrl}`);
    error.status = 404;
    next(error);
  }
  
  function errorHandler(err, req, res, next) {
    const statusCode = err.status || err.statusCode || 500;
  
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Error ${statusCode}]`, err.message);
    }
  
    res.status(statusCode).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
  
  module.exports = { notFound, errorHandler };