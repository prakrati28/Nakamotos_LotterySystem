import express from "express"
import dotenv from "dotenv"
import ownerRouter from "./routers/ownerRouter.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use("/api/owner", ownerRouter);
app.listen(PORT, () => {console.log(`Backend running on http://localhost:${PORT}`)});
 
export default app;

