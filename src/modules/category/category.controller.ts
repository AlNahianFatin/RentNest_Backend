import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { categoryService } from "./category.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const getCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await categoryService.getCategories();

    if (categories.length === 0) {
        sendResponse(res, {
            success: false,
            statusCode: httpStatus.NOT_FOUND,
            message: "No category found at the moment",
            data: null
        });
    }

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Categories retrieved successfully",
        data: categories
    })
})

export const categoryController = {
    getCategories
};