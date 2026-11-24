import { z } from 'zod';

export const rutSchema = z.string()
  .trim()
  .transform((rut) => rut.replace(/\./g, '').toUpperCase())
  .pipe(z.string().regex(/^\d{1,8}-[\dK]$/, 'El RUT debe usar el formato 12345678-9.'))
  .transform((rut) => rut.replace('-', ''));
