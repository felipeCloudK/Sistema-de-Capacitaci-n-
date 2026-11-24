import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  nombreOriginal: String,
  nombreArchivo: String,
  ruta: String,
  mimeType: String,
  tamanio: Number,
  reemplazadoAt: Date,
}, { _id: false });

const renewalSchema = new mongoose.Schema({
  fechaRealizacion: Date,
  fechaVencimiento: Date,
  vigenciaAnios: Number,
  certificadoAnterior: certificateSchema,
  reemplazadoAt: { type: Date, default: Date.now },
}, { _id: true });

const trainingSchema = new mongoose.Schema({
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  nombre: { type: String, required: true, trim: true },
  fechaRealizacion: { type: Date, required: true },
  fechaVencimiento: { type: Date, required: true },
  vigenciaAnios: { type: Number, required: true, enum: [1, 2, 3] },
  certificado: certificateSchema,
  historialRenovaciones: [renewalSchema],
  eliminado: { type: Boolean, default: false },
  eliminadoAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Training ||
  mongoose.model('Training', trainingSchema);
