import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Worker from '../models/workerModels.js';
import Training from '../models/trainingModels.js';
import { getTrainingStatus } from '../libs/trainingStatus.js';

const getRows = async (query) => {
  const { tipo = 'capacitaciones', estado = '', status = '', worker = '', search = '' } = query;
  if (tipo === 'trabajadores') {
    const filter = { eliminado: false };
    if (estado) filter.estado = estado;
    if (search.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { rut: pattern },
        { nombres: pattern },
        { apellidos: pattern },
        { area: pattern },
        { cargo: pattern },
      ];
    }
    return Worker.find(filter).sort({ apellidos: 1, nombres: 1 }).lean();
  }

  const filter = { eliminado: false };
  if (worker) filter.trabajador = worker;
  let trainings = await Training.find(filter)
    .populate('trabajador', 'rut nombres apellidos area estado eliminado')
    .sort({ fechaVencimiento: 1 })
    .lean();

  let rows = trainings
    .filter((training) => training.trabajador && !training.trabajador.eliminado)
    .map((training) => {
      const statusInfo = getTrainingStatus(training.fechaVencimiento);
      return {
        trabajador: `${training.trabajador.nombres} ${training.trabajador.apellidos}`,
        rut: training.trabajador.rut,
        area: training.trabajador.area,
        capacitacion: training.nombre,
        realizacion: training.fechaRealizacion,
        vencimiento: training.fechaVencimiento,
        vigenciaAnios: training.vigenciaAnios,
        estado: statusInfo.estado,
        diasRestantes: statusInfo.dias,
      };
    });

  if (status) rows = rows.filter((row) => row.estado === status);
  if (search.trim()) {
    const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    rows = rows.filter((row) =>
      pattern.test(row.trabajador) ||
      pattern.test(row.rut) ||
      pattern.test(row.area) ||
      pattern.test(row.capacitacion)
    );
  }
  return rows;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('es-CL') : '';

export const getReportData = async (req, res, next) => {
  try {
    res.json(await getRows(req.query));
  } catch (error) {
    next(error);
  }
};

export const exportReportExcel = async (req, res, next) => {
  try {
    const tipo = req.query.tipo || 'capacitaciones';
    const rows = await getRows(req.query);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'M&R Transporte';
    const sheet = workbook.addWorksheet(
      tipo === 'trabajadores' ? 'Trabajadores' : 'Capacitaciones',
    );

    if (tipo === 'trabajadores') {
      sheet.columns = [
        { header: 'RUT', key: 'rut', width: 14 },
        { header: 'Nombres', key: 'nombres', width: 24 },
        { header: 'Apellidos', key: 'apellidos', width: 24 },
        { header: 'Correo', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 16 },
        { header: 'Cargo', key: 'cargo', width: 24 },
        { header: 'Área', key: 'area', width: 24 },
        { header: 'Ingreso', key: 'fechaIngreso', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];
      rows.forEach((row) => sheet.addRow({
        ...row,
        fechaIngreso: formatDate(row.fechaIngreso),
      }));
    } else {
      sheet.columns = [
        { header: 'Trabajador', key: 'trabajador', width: 30 },
        { header: 'RUT', key: 'rut', width: 14 },
        { header: 'Área', key: 'area', width: 22 },
        { header: 'Capacitación', key: 'capacitacion', width: 28 },
        { header: 'Realización', key: 'realizacion', width: 14 },
        { header: 'Vencimiento', key: 'vencimiento', width: 14 },
        { header: 'Vigencia', key: 'vigenciaAnios', width: 10 },
        { header: 'Estado', key: 'estado', width: 18 },
        { header: 'Días restantes', key: 'diasRestantes', width: 16 },
      ];
      rows.forEach((row) => sheet.addRow({
        ...row,
        realizacion: formatDate(row.realizacion),
        vencimiento: formatDate(row.vencimiento),
      }));
    }
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCE8F1' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte-${tipo}-${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportReportPdf = async (req, res, next) => {
  try {
    const tipo = req.query.tipo || 'capacitaciones';
    const rows = await getRows(req.query);
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte-${tipo}-${Date.now()}.pdf`,
    );
    doc.pipe(res);
    doc.fontSize(18).text(
      tipo === 'trabajadores'
        ? 'Reporte de trabajadores'
        : 'Reporte de capacitaciones',
      { align: 'center' },
    );
    doc.moveDown();
    doc.fontSize(9);

    if (tipo === 'trabajadores') {
      rows.forEach((row) => {
        doc.text(
          `${row.rut} | ${row.nombres} ${row.apellidos} | ${row.cargo} | ${row.area} | ${row.estado}`,
        );
      });
    } else {
      rows.forEach((row) => {
        doc.text(
          `${row.rut} | ${row.trabajador} | ${row.capacitacion} | vence ${formatDate(row.vencimiento)} | ${row.estado} (${row.diasRestantes} días)`,
        );
      });
    }
    doc.end();
  } catch (error) {
    next(error);
  }
};
