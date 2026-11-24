import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  rut: { type: String, required: true, trim: true, unique: true },
  nombres: { type: String, required: true, trim: true },
  apellidos: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  telefono: { type: String, required: true, trim: true },
  cargo: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  fechaIngreso: { type: Date, required: true },
  estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
  eliminado: { type: Boolean, default: false },
  eliminadoAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Worker ||
  mongoose.model('Worker', workerSchema);
