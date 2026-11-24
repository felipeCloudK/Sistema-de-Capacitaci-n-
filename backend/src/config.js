import dotenv from 'dotenv';

dotenv.config();

export const PORT = Number(process.env.PORT) || 4000;
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/mrdatabase';
export const PRIVATE_NETWORK_ONLY =
  process.env.PRIVATE_NETWORK_ONLY !== 'false';