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
        data: result.data,
        meta: result.meta
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

const getPropertyById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id as string;

    const result = await adminService.getPropertyById(id);

    if (!result) {
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
            message: "Property retrieved successfully",
            data: result
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

const updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = req.params?.id as string
    const { propertyType } = req.body;

    const result = await adminService.updateCategory(categoryId, propertyType);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Category updated successfully",
        data: result
    })
})

const manageReviewStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId, status } = req?.body;

    const result = await adminService.manageReviewStatus(reviewId, status);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `Rating status updated to ${status} successfully`,
        data: result
    });
});

export const adminController = {
    getUsers,
    updateUserStatus,
    getProperties,
    getPropertyById,
    getRentalRequests,
    createCategory,
    updateCategory,
    manageReviewStatus
};