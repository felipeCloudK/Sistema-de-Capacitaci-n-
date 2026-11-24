import { z } from 'zod';
import Worker from '../models/workerModels.js';
import Training from '../models/trainingModels.js';
import { getTrainingStatus } from '../libs/trainingStatus.js';
import { deleteTrainingCertificates } from '../libs/deleteTrainingCertificates.js';
import { rutSchema } from '../libs/rut.js';

const workerSchema = z.object({
  rut: rutSchema,
  nombres: z.string().trim().min(1),
  apellidos: z.string().trim().min(1),
  email: z.string().trim().email(),
  telefono: z.string().trim().min(5),
  cargo: z.string().trim().min(1),
  area: z.string().trim().min(1),
  fechaIngreso: z.coerce.date(),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

export const listWorkers = async (req, res, next) => {
  try {
    const { search = '', estado } = req.query;
    const filter = { eliminado: false };
    if (estado && ['activo', 'inactivo'].includes(estado)) filter.estado = estado;
    if (search.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { rut: pattern },
        { nombres: pattern },
        { apellidos: pattern },
        { email: pattern },
        { cargo: pattern },
        { area: pattern },
      ];
    }
    const workers = await Worker.find(filter).sort({ nombres: 1, apellidos: 1 });
    res.json(workers);
  } catch (error) {
    next(error);
  }
};

export const getWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, eliminado: false });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });
    const trainings = await Training.find({
      trabajador: worker._id,
      eliminado: false,
    }).sort({ fechaVencimiento: 1 });
    const trainingsWithStatus = trainings.map((training) => {
      const status = getTrainingStatus(training.fechaVencimiento);
      return {
        ...training.toObject(),
        estadoCalculado: status.estado,
        diasRestantes: status.dias,
      };
    });
    res.json({ worker, trainings: trainingsWithStatus });
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (req, res, next) => {
  try {
    const data = workerSchema.parse({
      ...req.body,
    });
    const existing = await Worker.findOne({ rut: data.rut });
    if (existing) {
      return res.status(409).json({
        message: existing.eliminado
          ? 'Este RUT pertenece a un registro eliminado. Utilice el respaldo antes de restaurarlo.'
          : 'Ya existe un trabajador registrado con este RUT.',
      });
    }
    const worker = await Worker.create(data);
    res.status(201).json(worker);
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Datos de trabajador inválidos.',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const data = workerSchema.parse({
      ...req.body,
    });
    const duplicate = await Worker.findOne({
      rut: data.rut,
      _id: { $ne: req.params.id },
      eliminado: false,
    });
    if (duplicate) {
      return res.status(409).json({ message: 'Ya existe un trabajador con este RUT.' });
    }
    const worker = await Worker.findOneAndUpdate(
      { _id: req.params.id, eliminado: false },
      data,
      { new: true, runValidators: true },
    );
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });
    res.json(worker);
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Datos de trabajador inválidos.',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const changeWorkerStatus = async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido.' });
    }
    const worker = await Worker.findOneAndUpdate(
      { _id: req.params.id, eliminado: false },
      { estado },
      { new: true, runValidators: true },
    );
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });
    res.json(worker);
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, eliminado: false });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });

    const trainings = await Training.find({ trabajador: worker._id }).lean();
    await Training.deleteMany({ trabajador: worker._id });
    await Worker.deleteOne({ _id: worker._id });
    try {
      await deleteTrainingCertificates(trainings);
    } catch (error) {
      console.error('Worker data was deleted, but certificate cleanup failed:', error);
      return res.status(500).json({
        message: 'El trabajador y sus capacitaciones se eliminaron de MongoDB, pero no se pudieron borrar todos los certificados.',
      });
    }

    res.json({
      message: 'Trabajador y capacitaciones asociadas eliminados permanentemente.',
      capacitacionesEliminadas: trainings.length,
    });
  } catch (error) {
    next(error);
  }
};
