import { PropertyStatus } from "../../../generated/prisma/enums";
import { PaymentWhereInput, PropertyWhereInput, RentalRequestWhereInput } from "../../../generated/prisma/models";

export interface ICreateProperty {
    houseNo: number;
    roadNo: number;
    location: string;
    thumbnail: string;
    price: number;
    categoryId: string;
}

export interface IUpdateProperty {
    houseNo?: number;
    roadNo?: number;
    location?: string;
    thumbnail?: string;
    price?: number;
    status?: PropertyStatus;
    categoryId?: string;
}

export interface IPropertyQuery extends PropertyWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface IRentalQuery extends PaymentWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}