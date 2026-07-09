import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import httpStatus from "http-status";


export const notFound = (req: Request, res: Response) => {
    sendResponse(res, {
        success: false,
        statusCode: httpStatus.NOT_FOUND,
        message: "Route not found!",
        data: {
            path: req.originalUrl,
            date: Date()
        }
    });
}