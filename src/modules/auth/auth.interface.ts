import { Role } from "../../../generated/prisma/enums";

export interface IRegisterUser {
    name: string;
    email: string;
    password: string;
    role: Role;
}

export interface ILoginUser {
    email: string;
    password: string;
};

export interface IUpdateProfile {
    name: string;
    password: string;
}

export interface IUpdatePassword {
    newPassword: string;
    oldPassword: string;
}