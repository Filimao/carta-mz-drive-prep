import stop from "@/assets/sign-stop.svg";
import noEntry from "@/assets/sign-no-entry.svg";
import yieldSign from "@/assets/sign-yield.svg";
import speed from "@/assets/sign-speed.svg";

export const BASIC_SIGNS = [
  { id: "stop", name: "Paragem obrigatória", description: "Pare completamente e ceda passagem antes de avançar.", category_id: null, image_url: stop, group: "Prioridade" },
  { id: "yield", name: "Cedência de passagem", description: "Ceda passagem aos veículos da via em que vai entrar. Pare se for necessário.", category_id: null, image_url: yieldSign, group: "Prioridade" },
  { id: "no-entry", name: "Sentido proibido", description: "Não entre nesta via pelo sentido em que se encontra.", category_id: null, image_url: noEntry, group: "Proibição" },
  { id: "speed", name: "Velocidade máxima de 60 km/h", description: "Não ultrapasse a velocidade indicada no sinal. Adapte sempre a velocidade às condições da via.", category_id: null, image_url: speed, group: "Proibição" },
];