import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", authController.registerUser);

router.post("/login", authController.loginUser);

router.get("/me", authController.myProfile);

router.post("/refresh-token", authController.refreshToken);

export const authRoutes = router;