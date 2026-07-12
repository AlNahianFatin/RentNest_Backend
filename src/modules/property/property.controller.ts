import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { propertyService } from "./property.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const getProperties = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;

    const properties = await propertyService.getProperties(query);

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
})

const getProperty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const propertyId = req.params?.id as string;

    const result = await propertyService.getProperty(propertyId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property retrieved successfully",
        data: result
    });
});

export const propertyController = {
    getProperties,
    getProperty
};