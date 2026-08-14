import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { ILoginUser, IRegisterUser, IUpdatePassword, IUpdateProfile } from "./auth.interface";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";
import { ActiveStatus, Role } from "../../../generated/prisma/enums";

const registerUser = async (payload: IRegisterUser) => {
    let { name, email, password, role } = payload;

    if(role === Role.ADMIN)
        throw new Error("Sorry, you are not permitted to create account of an admin!");

    const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

    const createUser: IRegisterUser = { name, email, password: hashedPassword, role };

    const result = await prisma.user.create({
        data: { ...createUser },
        omit: { password: true }
    })

    return result;
}

const loginUser = async (payload: ILoginUser) => {
    const { email, password } = payload;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
        throw new Error(`No user account found for email '${email}'`);

    if (user.status === ActiveStatus.BANNED)
        throw new Error("Your account is banned. Please contact support.");

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched)
        throw new Error("Password is incorrect");

    const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions);

    const refreshToken = jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions);

    return { accessToken, refreshToken };
};

const refreshToken = async (refreshToken: string) => {
    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_secret);

    if (!verifiedRefreshToken.success)
        throw new Error(verifiedRefreshToken.error);

    const { id } = verifiedRefreshToken.data as JwtPayload;

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });

    if (user.status === ActiveStatus.BANNED)
        throw new Error("Your account is banned. Please contact support.");

    const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions);

    return { accessToken };
};

const updateProfile = async (loggedInUserId: string, payload: IUpdateProfile) => {
    const { name, password } = payload;

    const user = await prisma.user.findUniqueOrThrow({
        where: { id: loggedInUserId }
    });

    if (!user)
        throw new Error("Your account could not be found!");

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched)
        throw new Error("Password is incorrect");

    const updatedUser = await prisma.user.update({
        where: { id: loggedInUserId },
        omit: { password: true },
        data: { name }
    });

    const jwtPayload = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
    };

    const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions);

    const refreshToken = jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions);

    return { user: updatedUser, accessToken, refreshToken };
}

const updatePassword = async (loggedInUserId: string, payload: IUpdatePassword) => {
    const { newPassword, oldPassword } = payload;

    const user = await prisma.user.findUniqueOrThrow({
        where: { id: loggedInUserId }
    });

    if (!user)
        throw new Error("Your account could not be found!");

    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatched)
        throw new Error("Previous password is incorrect. Please try again");

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

    const result = await prisma.user.update({
        where: { id: loggedInUserId },
        data: { password: hashedPassword },
        omit: { password: true }
    });

    return result;
}

const myProfile = async (userId: string) => {
    const result = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
            properties: {
                include: { type: true }
            },
            payments: true,
            reviews: true,
            tenantRequests: true,
            landlordRequests: true
        },
        omit: { password: true }
    });

    return result;
}

export const authService = {
    registerUser,
    loginUser,
    refreshToken,
    updateProfile,
    updatePassword,
    myProfile
};