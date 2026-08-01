import { prisma } from "../../lib/prisma";
import { IPropertyQuery } from "./property.interface";
import { PropertyWhereInput } from "../../../generated/prisma/models";
import { PropertyStatus, ReviewStatus } from "../../../generated/prisma/enums";

const getProperties = async (query: IPropertyQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: PropertyWhereInput[] = [];

    if (query.search) {
        andConditions.push({
            OR: [
                {
                    location: {
                        contains: query.search,
                        mode: "insensitive"
                    }
                }
            ]
        })
    }

    if (query.status)
        andConditions.push({ status: query.status });

    if (query.price)
        andConditions.push({ price: query.price });

    if (query.type)
        andConditions.push({ type: query.type });

    // andConditions.push({ status: PropertyStatus.AVAILABLE });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [properties, totalAvailablePropertyCount] = await Promise.all([
            await tx.property.findMany({
                where: {
                    AND: andConditions,
                    status: PropertyStatus.AVAILABLE
                },

                include: {
                    landlord: {
                        omit: { password: true }
                    },
                    reviews: {
                        where: { status: ReviewStatus.APPROVED },
                        include: {
                            reviewer: {
                                omit: { password: true }
                            }
                        }
                    },
                    type: true
                },

                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            await tx.property.count({ where: { AND: andConditions } }),
        ])

        return { properties, totalAvailablePropertyCount };
    });

    return {
        data: transactionResult.properties,
        meta: {
            page: page,
            limit: limit,
            totalAvailablePropertyCount: transactionResult.totalAvailablePropertyCount,
            totalPageCount: Math.ceil(transactionResult.totalAvailablePropertyCount / limit)
        }
    };
}

const getProperty = async (id: string) => {
    const result = await prisma.property.findUniqueOrThrow({
        where: { id },
        include: {
            landlord: {
                omit: { password: true }
            },
            reviews: {
                where: { status: ReviewStatus.APPROVED },
                include: {
                    reviewer: {
                        omit: { password: true }
                    }
                }
            },
            type: true
        }
    });

    return result;
};

export const propertyService = {
    getProperties,
    getProperty
};