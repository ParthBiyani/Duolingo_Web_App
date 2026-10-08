import type { PathNode } from "@/lib/api/types";

/** Builds a path node for tests; defaults describe an untouched three-lesson skill. */
export function makeNode(overrides: Partial<PathNode> = {}): PathNode {
  return {
    id: 7,
    type: "lesson",
    position: 1,
    title: "My day",
    icon: "star",
    state: "locked",
    lessons_total: 3,
    lessons_completed: 0,
    crown_level: 0,
    next_lesson_id: 15,
    chest_claimed: false,
    ...overrides,
  };
}

export function makeChest(overrides: Partial<PathNode> = {}): PathNode {
  return makeNode({
    id: 9,
    type: "chest",
    title: "Treasure chest",
    icon: "chest",
    lessons_total: 0,
    next_lesson_id: null,
    ...overrides,
  });
}
