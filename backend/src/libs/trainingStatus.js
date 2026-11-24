export function calculateExpiration(fechaRealizacion, vigenciaAnios) {
  const date = new Date(fechaRealizacion);
  date.setFullYear(date.getFullYear() + Number(vigenciaAnios));
  return date;
}

export function getTrainingStatus(fechaVencimiento, warningDays = 60) {
  const expiration = new Date(fechaVencimiento);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiration.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((expiration - today) / 86400000);
  if (daysRemaining < 0) return { estado: 'Vencido', dias: daysRemaining };
  if (daysRemaining <= warningDays) return { estado: 'Próximo a vencer', dias: daysRemaining };
  return { estado: 'Vigente', dias: daysRemaining };
}
