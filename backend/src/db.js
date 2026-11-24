import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

export const connectDB = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB conectado');
};

