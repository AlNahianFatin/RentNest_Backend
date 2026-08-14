import { Router } from "express";
import { authController } from "./auth.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/register", authController.registerUser);

router.post("/login", authController.loginUser);

router.post("/refresh-token", authController.refreshToken);

router.get("/me", auth(Role.ADMIN, Role.LANDLORD, Role.TENANT), authController.myProfile);

router.patch("/me", auth(Role.ADMIN, Role.LANDLORD, Role.TENANT), authController.updateProfile);

router.patch("/updatePassword", auth(Role.ADMIN, Role.LANDLORD, Role.TENANT), authController.updatePassword);

export const authRoutes = router;