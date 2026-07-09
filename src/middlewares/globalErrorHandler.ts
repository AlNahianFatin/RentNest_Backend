import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { error } from "node:console";
import { Prisma } from "../../generated/prisma/client";

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log("Error: ", error);

    let statusCode;
    let errorMessage = err.message || "Oops! Something went wrong";
    let errorName = err.name || "Internal Server Error";
    let errorDetails = err.stack;

    if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = httpStatus.BAD_REQUEST;
        errorMessage = "Incorrect field type or missing fields!";
    }
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Duplicate key error";
        }
        else if (err.code === "P2003") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Foreign key constraint failed";
        }
        else if (err.code === "P2025") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "An operation failed because it depends on one or more records that are required but not found";
        }
    }
    else if (err instanceof Prisma.PrismaClientInitializationError) {
        if (err.errorCode === "P1000") {
            statusCode = httpStatus.UNAUTHORIZED;
            errorMessage = "Authentication failed against database server";
        }
        else if (err.errorCode === "P1001") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Can't reach database server";
        }
    }
    else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "Error occurred during query execution";
    }

    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: statusCode || httpStatus.INTERNAL_SERVER_ERROR,
        name: errorName,
        message: errorMessage,
        error: errorDetails
    });
}