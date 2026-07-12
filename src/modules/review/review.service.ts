import { prisma } from "../../lib/prisma";
import { IReviewPayload } from "./review.interface";
import { PaymentStatus, ReviewStatus } from "../../../generated/prisma/enums";

const createReview = async (userId: string, payload: IReviewPayload) => {
    const { propertyId } = payload;

    if (!Number.isInteger(payload.rating))
        throw new Error("Rating must be an integer.");

    if (payload.rating < 1 || payload.rating > 5)
        throw new Error("Rating must be between 1 and 5.");

    const rentalRequest = await prisma.rentalRequest.findFirst({
        where: {
            tenantId: userId,
            propertyId,
        },
        include: {
            payment: {
                select: { paymentStatus: true }
            }
        }
    });

    if (!rentalRequest)
        throw new Error("Could not find the rental request. Check again");

    if (rentalRequest.payment?.paymentStatus !== PaymentStatus.COMPLETED)
        throw new Error("Please complete your payment first to proceed with the review");

    const existingReview = await prisma.review.findUnique({
        where: {
            reviewerId_propertyId: {
                reviewerId: userId,
                propertyId
            }
        }
    });

    if (existingReview)
        throw new Error("You have already reviewed this property.");

    const result = await prisma.review.create({
        data: {
            rating: payload.rating,
            comment: payload?.comment,
            propertyId,
            reviewerId: userId
        }
    });

    return result;
};

const manageReview = async (reviewId: string, status: ReviewStatus) => {
    const review = await prisma.review.findUniqueOrThrow({
        where: { id: reviewId }
    });

    if (status === review.status)
        throw new Error("Change review status to update");

    const result = await prisma.review.update({
        where: { id: reviewId },
        data: { status }
    });

    return result;
};

export const reviewService = {
    createReview,
    manageReview
};