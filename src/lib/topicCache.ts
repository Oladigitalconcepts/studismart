// Per-(study_pack, topic) cache for AI-generated topic explanations.
// Stored in localStorage so explanations persist across sessions and don't
// re-generate every time the user opens a topic sheet.

const PREFIX = "studymind-topic-content-v1";

const key = (packId: string, topic: string) =>
  `${PREFIX}:${packId}:${topic.toLowerCase().trim()}`;

export const getTopicContent = (packId: string, topic: string): string | null => {
  try {
    return localStorage.getItem(key(packId, topic));
  } catch {
    return null;
  }
};

export const setTopicContent = (packId: string, topic: string, content: string) => {
  try {
    localStorage.setItem(key(packId, topic), content);
  } catch {
    /* quota — ignore */
  }
};

export const clearTopicContent = (packId: string, topic: string) => {
  try {
    localStorage.removeItem(key(packId, topic));
  } catch {
    /* noop */
  }
};
