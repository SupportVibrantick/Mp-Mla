import { Request, Response, NextFunction } from "express";

/**
 * @description Wraps async middleware/controllers to catch errors and pass them to the next error handler
 */
const catchAsync = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export default catchAsync;

