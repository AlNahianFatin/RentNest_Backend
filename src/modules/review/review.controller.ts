import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { reviewService } from "./review.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { IReviewPayload } from "./review.interface";

const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const payload: IReviewPayload = req.body;
    console.log(userId)

    const result = await reviewService.createReview(userId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Rating posted successfully",
        data: result
    });
});

const manageReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId, status } = req?.body;

    const result = await reviewService.manageReview(reviewId, status);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `Rating status updated to ${status} successfully`,
        data: result
    });
});

export const reviewController = {
    createReview,
    manageReview
};