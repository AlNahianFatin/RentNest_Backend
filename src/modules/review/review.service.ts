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

    if (existingReview)
        throw new Error("You have already reviewed this property.");

    // const result = await prisma.review.create({
    //     data: {
    //         rating: payload.rating,
    //         comment: payload?.comment,
    //         propertyId,
    //         reviewerId: userId
    //     }
    // });

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

        const averageRating =
            aggregate._avg.rating === null
                ? null
                : Number(aggregate._avg.rating.toFixed(2));

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

const manageReview = async (reviewId: string, status: ReviewStatus) => {
    return await prisma.$transaction(async (tx) => {

        const review = await tx.review.findUniqueOrThrow({
            where: { id: reviewId }
        });

        if (review.status === status)
            throw new Error("Change review status to update.");

        const updatedReview = await tx.review.update({
            where: { id: reviewId },
            data: { status }
        });

        const aggregate = await tx.review.aggregate({
            where: {
                propertyId: review.propertyId,
                status: ReviewStatus.APPROVED,
            },
            _avg: { rating: true }
        });

        const averageRating =
            aggregate._avg.rating === null
                ? 0
                : Number(aggregate._avg.rating.toFixed(2));

        await tx.property.update({
            where: { id: review.propertyId },
            data: {
                averageRating:
                    averageRating === null
                        ? 0
                        : new Prisma.Decimal(averageRating),
            },
        });

        return updatedReview;
    });
};

export const reviewService = {
    createReview,
    manageReview
};