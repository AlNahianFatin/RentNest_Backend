import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { rentalService } from "./rental.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";

const submitRentalRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const propertyId = req.body?.propertyId;

    const result = await rentalService.submitRentalRequest(userId, propertyId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Rental request submitted successfully",
        data: result
    });
})

const getRentalRequests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;

    const result = await rentalService.getRentalRequests(userId);

    if (result.length === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "You have not submitted any rental request yet",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental requests retrieved successfully",
        data: result
    });
});

const getRentalRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const isAdmin = req.user?.role === Role.ADMIN;
    const requestId = req.params?.id as string;

    const result = await rentalService.getRentalRequest(userId, isAdmin, requestId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property retrieved successfully",
        data: result
    });
});

export const rentalController = {
    submitRentalRequest,
    getRentalRequests,
    getRentalRequest
};