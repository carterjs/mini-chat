const ADJECTIVES = [
    "Inquisitive",
    "Sassy",
    "Salty",
    "Hungry",
    "Friendly",
    "Curious",
    "Delightful",
    "Determined",
    "Defiant",
    "Cautious",
    "Cheerful",
    "Brainy",
    "Charming",
    "Confused",
    "Insightful",
    "Happy",
    "Indifferent"
];

const NOUNS = [
    "Mouse",
    "Banana",
    "Keyboard",
    "Lamp",
    "Tree",
    "Bush",
    "Apple",
    "Candle",
    "Leopard",
    "Cat",
    "Dog",
    "Pillow",
    "Television",
    "Bouquet",
    "Moose",
    "Hawk",
    "Spider",
    "Orange",
    "Celery",
    "Grasshopper",
    "Lizard",
    "Rabbit"
];

export function generateName() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];

    return `${adjective} ${noun}`;
}