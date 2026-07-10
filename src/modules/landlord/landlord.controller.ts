import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { landlordService } from "./landlord.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RequestStatus } from "../../../generated/prisma/enums";

const createProperty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const payload = req.body;

    const result = await landlordService.createProperty(userId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Properties retrieved successfully",
        data: result
    });
});

const updateProperty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const propertyId = req.params.id as string;
    const payload = req.body;

    const result = await landlordService.updateProperty(userId, propertyId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property updated successfully",
        data: result
    });
});

const deleteProperty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const propertyId = req.params.id as string;

    await landlordService.deleteProperty(userId, propertyId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property deleted successfully",
        data: null
    });
});

const getRequests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;

    const result = await landlordService.getRequests(userId);

    if (result.totalPendingRequests === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "No pending request at the moment",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Pending requests retrieved successfully",
        data: {
            totalPendingRequests: result.totalPendingRequests,
            requests: result.result
        }
    });
});

const manageRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const requestId = req.params?.id as string;
    const status: RequestStatus = req.body?.status;
    
    const result = await landlordService.manageRequest(userId, requestId, status);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `Request updated to ${status} successfully`,
        data: result
    });
});

export const landlordController = {
    createProperty,
    updateProperty,
    deleteProperty,
    getRequests,
    manageRequest
};