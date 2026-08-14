import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { reviewService } from "./review.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { IReviewPayload } from "./review.interface";

const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const payload: IReviewPayload = req.body;

    const result = await reviewService.createReview(userId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Review posted successfully",
        data: result
    });
});

const updateReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const reviewId = req.params.id as string;
    const payload: IReviewPayload = req.body;

    const result = await reviewService.updateReview(userId, reviewId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `Review updated successfully`,
        data: result
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const reviewId = req.params.id as string;

    await reviewService.deleteReview(userId, reviewId);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: `Review deleted successfully`,
        data: null
    });
});

export const reviewController = {
    createReview,
    updateReview,
    deleteReview
};