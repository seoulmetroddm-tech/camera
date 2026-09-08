import { IMAGENET_LABELS } from "./imagenetLabels";

/**
 * ImageNet 클래스를 유실물 접수에 쓰는 큰 분류로 묶는다.
 *
 * 라벨 일부만 맞춰보는 방식(정규식)은 "rule"이 다른 단어에 걸리는 식으로 오작동해서
 * 라벨 전체가 정확히 일치할 때만 인정한다. 여기 없는 클래스는 분류하지 않는다.
 */
const CATEGORY_LABELS: Record<string, string[]> = {
  지갑: ["wallet"],
  가방: ["backpack", "purse", "mailbag", "sleeping bag", "plastic bag", "shopping basket"],
  우산: ["umbrella"],
  휴대폰: ["cellular telephone", "hand-held computer"],
  노트북: ["laptop", "notebook"],
  안경: ["sunglass", "sunglasses"],
  시계: ["digital watch", "analog clock", "wall clock", "digital clock", "stopwatch"],
  카메라: ["Polaroid camera", "reflex camera", "lens cap"],
  신발: ["running shoe", "sandal", "Loafer", "clog", "cowboy boot"],
  모자: [
    "cowboy hat",
    "sombrero",
    "bathing cap",
    "shower cap",
    "bonnet",
    "mortarboard",
    "crash helmet",
    "football helmet",
    "ski mask",
  ],
  장갑: ["mitten"],
  // stole·fur coat·cloak처럼 천 질감만 보고 반응하는 클래스는 뺐다.
  // 털가방 사진이 "stole"로 잡혀 엉뚱하게 의류로 채워지는 일이 있었다.
  의류: [
    "jersey",
    "cardigan",
    "sweatshirt",
    "kimono",
    "poncho",
    "trench coat",
    "academic gown",
    "military uniform",
    "jean",
    "suit",
    "gown",
    "abaya",
    "sarong",
    "lab coat",
    "bikini",
    "brassiere",
    "miniskirt",
    "overskirt",
    "hoopskirt",
    "pajama",
    "vestment",
    "swimming trunks",
    "maillot",
    "sock",
    "apron",
    "Windsor tie",
    "bow tie",
    "bolo tie",
  ],
  도서: ["book jacket", "comic book", "menu", "binder", "envelope"],
  // pencil box는 작은 파우치·지갑에도 곧잘 반응해서 뺐다.
  문구: ["ballpoint", "fountain pen", "quill", "pencil sharpener", "rubber eraser"],
  물병: [
    "water bottle",
    "pop bottle",
    "beer bottle",
    "wine bottle",
    "water jug",
    "whiskey jug",
    "coffee mug",
    "cup",
    "pill bottle",
  ],
  전자기기: [
    "remote control",
    "joystick",
    "mouse",
    "computer keyboard",
    "typewriter keyboard",
    "hard disc",
    "loudspeaker",
    "microphone",
    "radio",
    "cassette",
    "cassette player",
    "CD player",
    "tape player",
    "iPod",
    "television",
    "monitor",
    "projector",
    "printer",
    "modem",
  ],
  액세서리: ["necklace", "hair slide", "buckle", "safety pin"],
  악기: [
    "violin",
    "acoustic guitar",
    "electric guitar",
    "cello",
    "flute",
    "harmonica",
    "sax",
    "trombone",
    "cornet",
    "French horn",
    "banjo",
    "accordion",
    "ocarina",
    "oboe",
    "panpipe",
    "bassoon",
    "drum",
    "maraca",
    "marimba",
    "steel drum",
    "harp",
    "grand piano",
  ],
  운동용품: [
    "basketball",
    "soccer ball",
    "tennis ball",
    "golf ball",
    "volleyball",
    "rugby ball",
    "ping-pong ball",
    "baseball",
    "croquet ball",
    "puck",
    "racket",
    "ski",
    "dumbbell",
    "barbell",
    "punching bag",
    "knee pad",
  ],
  자물쇠: ["padlock", "combination lock"],
};

/** ImageNet 출력 인덱스 -> 큰 분류. 분류에 안 넣은 클래스는 null. */
const INDEX_TO_CATEGORY: (string | null)[] = (() => {
  const byLabel = new Map<string, string>();
  for (const [category, labels] of Object.entries(CATEGORY_LABELS)) {
    for (const label of labels) byLabel.set(label, category);
  }
  return IMAGENET_LABELS.map((label) => byLabel.get(label) ?? null);
})();

/** 확률 하나치를 분류별 합계로 접는다. */
function totalsByCategory(probabilities: Float32Array): Map<string, number> {
  const totals = new Map<string, number>();
  for (let i = 0; i < probabilities.length; i += 1) {
    const category = INDEX_TO_CATEGORY[i];
    if (!category) continue;
    totals.set(category, (totals.get(category) ?? 0) + probabilities[i]);
  }
  return totals;
}

/**
 * 여러 배율로 본 결과를 모아 큰 분류 하나를 고른다.
 *
 * 분류별로 확률을 합산하는 이유: 큰 분류 하나에 ImageNet 클래스가 여러 개 걸려 있어서
 * (가방 = backpack + purse + mailbag …) 1등 클래스만 보면 확률이 흩어진 만큼 손해를 본다.
 *
 * 배율끼리는 평균이 아니라 최대값을 쓴다. 평균을 내면 한쪽 배율이 물건을 못 잡았을 때
 * (넓게 찍힌 물건을 확대해 천 질감만 보이는 경우) 제대로 본 쪽까지 같이 깎인다.
 *
 * 최대값이 minScore에 못 미치면 확신이 없다고 보고 null.
 */
export function categorize(probabilitiesPerCrop: Float32Array[], minScore: number): string | null {
  const best = new Map<string, number>();
  for (const probabilities of probabilitiesPerCrop) {
    for (const [category, score] of totalsByCategory(probabilities)) {
      if (score > (best.get(category) ?? 0)) best.set(category, score);
    }
  }

  let winner: string | null = null;
  let winnerScore = 0;
  for (const [category, score] of best) {
    if (score > winnerScore) {
      winnerScore = score;
      winner = category;
    }
  }

  return winnerScore >= minScore ? winner : null;
}
