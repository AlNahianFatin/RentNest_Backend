import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { adminService } from "./admin.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { ActiveStatus } from "../../../generated/prisma/enums";

const getUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;

    const result = await adminService.getUsers(query);

    if (result.data.length === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "No user found at the moment",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Users retrieved successfully",
        data: result
    });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params?.id as string;
    const updatedStatus: ActiveStatus = req.body.status;

    const result = await adminService.updateUserStatus(userId, updatedStatus);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `User status updated to ${updatedStatus} successfully`,
        data: result
    });
});

const getProperties = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;

    const properties = await adminService.getProperties(query);

    if (properties.data.length === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "No property found at the moment",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Properties retrieved successfully",
        data: properties.data,
        meta: properties.meta
    });
});

const getRentalRequests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;

    const properties = await adminService.getRentalRequests(query);

    if (properties.data.length === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "No rental request found at the moment",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental requests retrieved successfully",
        data: properties.data,
        meta: properties.meta
    });
});

const createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { propertyType } = req?.body;

    const result = await adminService.createCategory(propertyType);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: `Property category ${propertyType.trim().toUpperCase()} created successfully`,
        data: result
    });
});

export const adminController = {
    getUsers,
    updateUserStatus,
    getProperties,
    getRentalRequests,
    createCategory
};