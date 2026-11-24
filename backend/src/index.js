import 'dotenv/config';
import app from './app.js';
import { PORT } from './config.js';
import { connectDB } from './db.js';

async function main() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor disponible en http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor:', error.message);
    process.exitCode = 1;
  }
}



main();
