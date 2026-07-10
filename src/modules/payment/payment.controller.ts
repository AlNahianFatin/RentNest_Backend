import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { paymentService } from "./payment.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";

const createSession = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const rentalRequestId = req.body?.rentalRequestId;

    const result = await paymentService.createSession(userId, rentalRequestId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Payment session created successfully",
        data: result
    });
})

const confirmPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const event = req.body as Buffer;
    const signature = req.headers['stripe-signature'] as string;

    await paymentService.confirmPayment(event, signature);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Webhook triggered successfully",
        data: null
    });
});

const getPaymentHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;

    const result = await paymentService.getPaymentHistory(userId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment history retrieved successfully",
        data: result
    });
});

const getPaymentDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const isAdmin = req.user?.role === Role.ADMIN;
    const paymentId = req.params?.id as string;

    const result = await paymentService.getPaymentDetails(userId, isAdmin, paymentId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment details retrieved successfully",
        data: result
    });
});

export const paymentController = {
    createSession,
    confirmPayment,
    getPaymentHistory,
    getPaymentDetails
};