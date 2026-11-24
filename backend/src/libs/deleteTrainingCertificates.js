import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const certificateDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'uploads',
  'certificados',
);

export async function deleteTrainingCertificates(trainings) {
  const filenames = new Set(
    trainings
      .flatMap((training) => [
        training.certificado?.nombreArchivo,
        ...(training.historialRenovaciones || []).map(
          (renewal) => renewal.certificadoAnterior?.nombreArchivo,
        ),
      ])
      .filter((filename) => typeof filename === 'string' && filename.length > 0),
  );

  await Promise.all(
    [...filenames].map((filename) =>
      rm(path.join(certificateDirectory, path.basename(filename)), { force: true }),
    ),
  );
}
