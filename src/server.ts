// import "dotenv/config";
import app from "./app";
import { prisma } from "./lib/prisma";
import config from "./config/index"

const port = config.port;

async function main() {
    try {
        await prisma.$connect();
        console.log("Database connected successfully");
        // app.listen(port, () => {
        //     console.log(`Server is running on port: ${port}`)
        // })
        const server = app.listen(port, () => {
            console.log(`Server is running on port: ${port}`);
        });

        server.on("close", () => {
            console.log("Server was closed");
        });

        server.on("error", (err) => {
            console.error("Server error:", err);
        });

        process.on("exit", (code) => {
            console.log("Process exiting with code:", code);
        });

        process.on("uncaughtException", (err) => {
            console.error("Uncaught exception:", err);
        });

        process.on("unhandledRejection", (err) => {
            console.error("Unhandled rejection:", err);
        });
    } catch (error) {
        console.error(`Error starting the server: `, error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();