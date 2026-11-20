export const questions = [
  {
    title: "The night is yours. Where do you go?",
    options: [
      {
        title: "Into the electric city",
        detail: "Bright lights. One more turn.",
        affinity: "pulse",
      },
      {
        title: "Somewhere only we know",
        detail: "Soft light. A little mystery.",
        affinity: "blush",
      },
    ],
  },
  {
    title: "What draws you closer?",
    options: [
      {
        title: "A quiet kind of magnetism",
        detail: "Something felt before it is said.",
        affinity: "blush",
      },
      {
        title: "An unexpected spark",
        detail: "Something that changes the atmosphere.",
        affinity: "pulse",
      },
    ],
  },
  {
    title: "Choose a world to get lost in.",
    options: [
      {
        title: "Cobalt skies & violet light",
        detail: "Bold. Immersive. After dark.",
        affinity: "pulse",
      },
      {
        title: "Rose glass & luminous clouds",
        detail: "Dreamlike. Intimate. Glowing.",
        affinity: "blush",
      },
    ],
  },
];
export function affinityFor(answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== questions.length ||
    answers.some((a, i) => !questions[i].options[a])
  )
    throw new Error("Complete all three questions.");
  return answers.filter((a, i) => questions[i].options[a].affinity === "pulse")
    .length >= 2
    ? "pulse"
    : "blush";
}

export function groupAffinities(answerRows, peopleCount) {
  if (answerRows.length !== questions.length) return [];
  if (
    answerRows.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== peopleCount ||
        Array.from({ length: peopleCount }, (_, i) => row[i]).some(
          (a) => a !== 0 && a !== 1,
        ),
    )
  )
    return [];
  return Array.from({ length: peopleCount }, (_, guest) =>
    affinityFor(answerRows.map((row) => row[guest])),
  );
}
