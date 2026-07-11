import { RentalRequestWhereInput, UserWhereInput } from "../../../generated/prisma/models";
import { PropertyWhereInput } from "../../../generated/prisma/models";

export interface IUserQuery extends UserWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface IPropertyQuery extends PropertyWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface IRentalRequestQuery extends RentalRequestWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}