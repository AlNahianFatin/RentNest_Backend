import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config";
import { authRoutes } from "./modules/auth/auth.route";
import { notFound } from "./middlewares/notFound";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { propertyRoutes } from "./modules/property/property.route";
import { categoryRoutes } from "./modules/category/category.route";
import { landlordRoutes } from "./modules/landlord/landlord.route";
import { rentalRoutes } from "./modules/rental/rental.route";
import { paymentRoutes } from "./modules/payment/payment.route";

const app: Application = express();

//adding essential middlewares for every project 
app.use(cors({
    origin: config.app_url,
    credentials: true
}));

// app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
//     next();
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
    res.send(`Welcome to RenstNest!`);
});

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/landlord", landlordRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/payments", paymentRoutes)

app.use(notFound);

app.use(globalErrorHandler);

export default app;