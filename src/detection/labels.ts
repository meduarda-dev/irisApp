// COCO com 91 posições (índice 0 = fundo). '???' são ids vazios do COCO.
export const COCO_LABELS_PT: string[] = [
  '???', 'pessoa', 'bicicleta', 'carro', 'moto', 'avião', 'ônibus', 'trem',
  'caminhão', 'barco', 'semáforo', 'hidrante', '???', 'placa de pare',
  'parquímetro', 'banco', 'pássaro', 'gato', 'cachorro', 'cavalo', 'ovelha',
  'vaca', 'elefante', 'urso', 'zebra', 'girafa', '???', 'mochila',
  'guarda-chuva', '???', '???', 'bolsa', 'gravata', 'mala', 'frisbee',
  'esquis', 'snowboard', 'bola', 'pipa', 'taco de beisebol',
  'luva de beisebol', 'skate', 'prancha de surfe', 'raquete de tênis',
  'garrafa', '???', 'taça de vinho', 'copo', 'garfo', 'faca', 'colher',
  'tigela', 'banana', 'maçã', 'sanduíche', 'laranja', 'brócolis', 'cenoura',
  'cachorro-quente', 'pizza', 'rosquinha', 'bolo', 'cadeira', 'sofá',
  'vaso de planta', 'cama', '???', 'mesa', '???', '???', 'vaso sanitário',
  '???', 'televisão', 'notebook', 'mouse', 'controle remoto', 'teclado',
  'celular', 'micro-ondas', 'forno', 'torradeira', 'pia', 'geladeira', '???',
  'livro', 'relógio', 'vaso', 'tesoura', 'urso de pelúcia',
  'secador de cabelo', 'escova de dentes',
];

// Se os nomes saírem "deslocados" em 1, troque para 0.
export const LABEL_OFFSET = 1;

export function labelFor(classIndex: number): string {
  return COCO_LABELS_PT[classIndex + LABEL_OFFSET] ?? '???';
}