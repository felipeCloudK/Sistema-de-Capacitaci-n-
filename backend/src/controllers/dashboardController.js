import Worker from '../models/workerModels.js';
import Training from '../models/trainingModels.js';
import { getTrainingStatus } from '../libs/trainingStatus.js';

export const getDashboard = async (req, res, next) => {
  try {
    const workers = await Worker.find({ eliminado: false }).lean();
    const trainings = await Training.find({ eliminado: false })
      .populate('trabajador', 'rut nombres apellidos area estado eliminado')
      .lean();

    const activeTrainings = trainings.filter((training) =>
      training.trabajador && !training.trabajador.eliminado
    );
    const statusCounts = {
      vigente: 0,
      proximo: 0,
      vencido: 0,
    };
    const upcoming = [];

    activeTrainings.forEach((training) => {
      const status = getTrainingStatus(training.fechaVencimiento);
      if (status.estado === 'Vigente') statusCounts.vigente++;
      if (status.estado === 'Próximo a vencer') {
        statusCounts.proximo++;
        upcoming.push({
          id: training._id,
          trabajador: `${training.trabajador.nombres} ${training.trabajador.apellidos}`,
          rut: training.trabajador.rut,
          capacitacion: training.nombre,
          vencimiento: training.fechaVencimiento,
          diasRestantes: status.dias,
          estado: status.estado,
        });
      }
      if (status.estado === 'Vencido') {
        statusCounts.vencido++;
        upcoming.push({
          id: training._id,
          trabajador: `${training.trabajador.nombres} ${training.trabajador.apellidos}`,
          rut: training.trabajador.rut,
          capacitacion: training.nombre,
          vencimiento: training.fechaVencimiento,
          diasRestantes: status.dias,
          estado: status.estado,
        });
      }
    });

    upcoming.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));

    const workerIdsWithTraining = new Set(
      activeTrainings.map((training) => String(training.trabajador._id)),
    );
    const workersWithoutTraining = workers
      .filter((worker) => !workerIdsWithTraining.has(String(worker._id)))
      .map((worker) => ({
        id: worker._id,
        trabajador: `${worker.nombres} ${worker.apellidos}`,
        rut: worker.rut,
        area: worker.area,
      }));

    const areaCounts = {};
    activeTrainings.forEach((training) => {
      const area = training.trabajador?.area || 'Sin área';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });

    const evolution = {};
    const now = new Date();
    for (let offset = 11; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      evolution[key] = 0;
    }
    activeTrainings.forEach((training) => {
      const date = new Date(training.fechaRealizacion);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (Object.prototype.hasOwnProperty.call(evolution, key)) evolution[key]++;
    });

    const recentRenewals = activeTrainings
      .flatMap((training) =>
        (training.historialRenovaciones || []).map((renewal) => ({
          id: renewal._id,
          trabajador: `${training.trabajador.nombres} ${training.trabajador.apellidos}`,
          rut: training.trabajador.rut,
          capacitacion: training.nombre,
          renovadoAt: renewal.reemplazadoAt,
        })),
      )
      .filter((renewal) =>
        renewal.renovadoAt &&
        Date.now() - new Date(renewal.renovadoAt).getTime() <= 30 * 86400000
      )
      .sort((a, b) => new Date(b.renovadoAt) - new Date(a.renovadoAt));

    res.json({
      tarjetas: {
        totalTrabajadores: workers.length,
        trabajadoresActivos: workers.filter((worker) => worker.estado === 'activo').length,
        totalCapacitaciones: activeTrainings.length,
        vigentes: statusCounts.vigente,
        proximas: statusCounts.proximo,
        vencidas: statusCounts.vencido,
      },
      distribucionEstados: [
        { estado: 'Vigente', valor: statusCounts.vigente },
        { estado: 'Próximo a vencer', valor: statusCounts.proximo },
        { estado: 'Vencido', valor: statusCounts.vencido },
      ],
      porArea: Object.entries(areaCounts).map(([area, valor]) => ({ area, valor })),
      evolucionMensual: Object.entries(evolution).map(([mes, valor]) => ({ mes, valor })),
      alertas: {
        proximas: upcoming.filter((item) => item.estado === 'Próximo a vencer'),
        vencidas: upcoming.filter((item) => item.estado === 'Vencido'),
        sinCapacitaciones: workersWithoutTraining,
        renovacionesRecientes: recentRenewals,
      },
      proximosVencimientos: upcoming,
    });
  } catch (error) {
    next(error);
  }
};
