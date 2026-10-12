/** Dias de aviso antes do fim do contrato. */
export const CONTRACT_END_WARNING_DAYS = 14;

/**
 * Dias até ao fim do contrato (negativo = já passou e ainda sem check-out), só para residentes ativos
 * dentro da janela de aviso. null = sem aviso.
 */
export const contractEndsInDays = (status: string, moveOut: string | null | undefined, today: Date = new Date()) => {
  if (!moveOut || !["active", "checking_out"].includes(status)) return null;
  const end = new Date(String(moveOut).slice(0, 10) + "T00:00:00");
  const t = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const days = Math.round((end.getTime() - t.getTime()) / 86400000);
  return days <= CONTRACT_END_WARNING_DAYS ? days : null;
};
