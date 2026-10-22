export function whatsappAptoShareUrl(score: number, origin: string): string {
  const text = `Concluí como APTO o simulado independente de preparação para o exame teórico de condução no Carta MZ Quiz com ${score}/25! Treina grátis aqui: ${origin}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
