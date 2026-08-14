import { prisma } from "../../lib/prisma";
import { IReviewPayload } from "./review.interface";
import { PaymentStatus, ReviewStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";

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

    if (existingReview) {
        if (existingReview?.status === ReviewStatus.REJECTED)
            throw new Error("You have already reviewed this property. But as the admin has rejected it, you cannot review this property anymore.");
        throw new Error("You have already reviewed this property.");
    }


    const result = await prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
            data: {
                rating: payload.rating,
                comment: payload?.comment,
                propertyId,
                reviewerId: userId
            }
        });

        const aggregate = await tx.review.aggregate({
            where: {
                propertyId,
                status: ReviewStatus.APPROVED,
            },
            _avg: { rating: true }
        });

        // const averageRating =
        //     aggregate._avg.rating === null
        //         ? null
        //         : Number(aggregate._avg.rating.toFixed(2));

        await tx.property.update({
            where: { id: propertyId },
            data: {
                averageRating: new Prisma.Decimal(aggregate._avg.rating ?? 0),
            },
        });

        return { review };
    });

    return result;
};

const updateReview = async (userId: string, reviewId: string, payload: IReviewPayload) => {
    if (!Number.isInteger(payload.rating))
        throw new Error("Rating must be an integer.");

    if (payload.rating < 1 || payload.rating > 5)
        throw new Error("Rating must be between 1 and 5.");

    const previousReview = await prisma.review.findUniqueOrThrow({
        where: { id: reviewId },
        include: {
            property: {
                include: {
                    rentalRequests: {
                        where: { tenantId: userId },
                        include: { payment: true }
                    }
                }
            }
        }
    });

    if (!previousReview)
        throw new Error("Could not find the review. Please check again");

    if (previousReview.reviewerId !== userId)
        throw new Error("As you are not the reviewer, you cannot update this review");

    if (previousReview.property.rentalRequests?.[0]?.payment?.paymentStatus !== PaymentStatus.COMPLETED)
        throw new Error("Please complete your payment first to proceed with the review");

    const result = await prisma.$transaction(async (tx) => {
        const review = await tx.review.update({
            where: { id: reviewId },
            data: {
                rating: payload.rating,
                comment: payload?.comment
            },
            include: { property: true }
        });

        const aggregate = await tx.review.aggregate({
            where: {
                id: reviewId,
                status: ReviewStatus.APPROVED,
            },
            _avg: { rating: true }
        });

        await tx.property.update({
            where: { id: review.property.id },
            data: {
                averageRating: new Prisma.Decimal(aggregate._avg.rating ?? 0),
            },
        });

        return { review };
    });

    return result;
};

const deleteReview = async (userId: string, reviewId: string) => {
    const previousReview = await prisma.review.findUniqueOrThrow({
        where: { id: reviewId },
        include: {
            property: {
                include: {
                    rentalRequests: {
                        where: { tenantId: userId },
                        include: { payment: true }
                    }
                }
            }
        }
    });

    if (!previousReview)
        throw new Error("Could not find the review. Please check again");

    if (previousReview.reviewerId !== userId)
        throw new Error("As you are not the reviewer, you cannot delete this review");

    if (previousReview.property.rentalRequests?.[0]?.payment?.paymentStatus !== PaymentStatus.COMPLETED)
        throw new Error("Please complete your payment first to proceed with the review");

    const result = await prisma.$transaction(async (tx) => {
        const review = await tx.review.delete({
            where: { id: reviewId },
            include: { property: true }
        });

        const aggregate = await tx.review.aggregate({
            where: {
                id: reviewId,
                status: ReviewStatus.APPROVED,
            },
            _avg: { rating: true }
        });

        await tx.property.update({
            where: { id: review.property.id },
            data: {
                averageRating: new Prisma.Decimal(aggregate._avg.rating ?? 0),
            },
        });

        return { review };
    });

    return result;
};

export const reviewService = {
    createReview,
    updateReview,
    deleteReview
};