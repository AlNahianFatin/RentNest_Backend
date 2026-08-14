import { PropertyWhereInput } from "../../../generated/prisma/models";

export interface IPropertyQuery extends PropertyWhereInput {
    search?: string;
    limit?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}