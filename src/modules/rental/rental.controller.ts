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
        message: "Rental request submitted successfully. Please wait for the landlord to accept it.",
        data: result
    });
})

const getMyRentalRequests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;
    const userId = req.user?.id as string;

    const result = await rentalService.getMyRentalRequests(userId, query);

    if (result.meta.totalRentalRequestCount === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "You have not submitted any rental request yet",
            data: result
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental requests retrieved successfully",
        data: result.data,
        meta: result.meta
    });
});

const getMyRents = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req?.query;
    const userId = req.user?.id as string;

    const result = await rentalService.getMyRents(userId, query);

    if (result.meta.totalPropertiesCount === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "You have not rented any property yet",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rents retrieved successfully",
        data: result.data,
        meta: result.meta
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
        message: "Rental request details retrieved successfully",
        data: result
    });
});

export const rentalController = {
    submitRentalRequest,
    getMyRentalRequests,
    getMyRents,
    getRentalRequest
};