import { z } from 'zod';
import Training from '../models/trainingModels.js';
import Worker from '../models/workerModels.js';
import { calculateExpiration, getTrainingStatus } from '../libs/trainingStatus.js';
import { deleteTrainingCertificates } from '../libs/deleteTrainingCertificates.js';

const trainingSchema = z.object({
  trabajador: z.string().min(1),
  nombre: z.string().trim().min(1),
  fechaRealizacion: z.coerce.date(),
  vigenciaAnios: z.coerce.number().refine((value) => [1, 2, 3].includes(value)),
});

const trainingWithStatus = (training) => {
  const object = training.toObject ? training.toObject() : { ...training };
  const status = getTrainingStatus(object.fechaVencimiento);
  return { ...object, estadoCalculado: status.estado, diasRestantes: status.dias };
};

export const listTrainings = async (req, res, next) => {
  try {
    const { search = '', status = '', trabajador = '' } = req.query;
    const filter = { eliminado: false };
    if (trabajador) filter.trabajador = trabajador;
    let trainings = await Training.find(filter)
      .populate('trabajador', 'rut nombres apellidos area estado eliminado')
      .sort({ fechaVencimiento: 1 });

    trainings = trainings
      .filter((training) => !training.trabajador?.eliminado)
      .map(trainingWithStatus);

    if (status) trainings = trainings.filter((item) => item.estadoCalculado === status);
    if (search.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      trainings = trainings.filter((item) => {
        const worker = item.trabajador || {};
        return pattern.test(item.nombre) ||
          pattern.test(worker.nombres || '') ||
          pattern.test(worker.apellidos || '') ||
          pattern.test(worker.rut || '') ||
          pattern.test(worker.area || '');
      });
    }
    res.json(trainings);
  } catch (error) {
    next(error);
  }
};

export const getTraining = async (req, res, next) => {
  try {
    const training = await Training.findOne({
      _id: req.params.id,
      eliminado: false,
    }).populate('trabajador', 'rut nombres apellidos area estado');
    if (!training) return res.status(404).json({ message: 'Capacitación no encontrada.' });
    res.json(trainingWithStatus(training));
  } catch (error) {
    next(error);
  }
};

export const createTraining = async (req, res, next) => {
  try {
    const data = trainingSchema.parse(req.body);
    const worker = await Worker.findOne({ _id: data.trabajador, eliminado: false });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });
    if (!req.file) return res.status(400).json({ message: 'El certificado es obligatorio.' });

    const training = await Training.create({
      trabajador: data.trabajador,
      nombre: data.nombre,
      fechaRealizacion: data.fechaRealizacion,
      vigenciaAnios: data.vigenciaAnios,
      fechaVencimiento: calculateExpiration(data.fechaRealizacion, data.vigenciaAnios),
      certificado: {
        nombreOriginal: req.file.originalname,
        nombreArchivo: req.file.filename,
        ruta: `/api/uploads/certificados/${req.file.filename}`,
        mimeType: req.file.mimetype,
        tamanio: req.file.size,
      },
    });
    await training.populate('trabajador', 'rut nombres apellidos area estado');
    res.status(201).json(trainingWithStatus(training));
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Datos de capacitación inválidos.',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const replaceTrainingCertificate = async (req, res, next) => {
  try {
    const data = trainingSchema.parse(req.body);
    const training = await Training.findOne({
      _id: req.params.id,
      eliminado: false,
    });
    if (!training) return res.status(404).json({ message: 'Capacitación no encontrada.' });

    const worker = await Worker.findOne({ _id: data.trabajador, eliminado: false });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado.' });

    const previousCertificate = training.certificado
      ? training.certificado.toObject?.() || { ...training.certificado }
      : null;
    const fechaVencimiento = calculateExpiration(
      data.fechaRealizacion,
      data.vigenciaAnios,
    );

    training.historialRenovaciones.push({
      fechaRealizacion: training.fechaRealizacion,
      fechaVencimiento: training.fechaVencimiento,
      vigenciaAnios: training.vigenciaAnios,
      certificadoAnterior: previousCertificate,
      reemplazadoAt: new Date(),
    });

    training.trabajador = data.trabajador;
    training.nombre = data.nombre;
    training.fechaRealizacion = data.fechaRealizacion;
    training.vigenciaAnios = data.vigenciaAnios;
    training.fechaVencimiento = fechaVencimiento;

    if (req.file) {
      training.certificado = {
        nombreOriginal: req.file.originalname,
        nombreArchivo: req.file.filename,
        ruta: `/api/uploads/certificados/${req.file.filename}`,
        mimeType: req.file.mimetype,
        tamanio: req.file.size,
      };
    }

    await training.save();
    await training.populate('trabajador', 'rut nombres apellidos area estado');
    res.json(trainingWithStatus(training));
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Datos de capacitación inválidos.',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const deleteTraining = async (req, res, next) => {
  try {
    const training = await Training.findOne({
      _id: req.params.id,
      eliminado: false,
    }).lean();
    if (!training) return res.status(404).json({ message: 'Capacitación no encontrada.' });

    await Training.deleteOne({ _id: training._id });
    try {
      await deleteTrainingCertificates([training]);
    } catch (error) {
      console.error('Training data was deleted, but certificate cleanup failed:', error);
      return res.status(500).json({
        message: 'La capacitación se eliminó de MongoDB, pero no se pudieron borrar todos sus certificados.',
      });
    }

    res.json({ message: 'Capacitación, historial y certificados eliminados permanentemente.' });
  } catch (error) {
    next(error);
  }
};
