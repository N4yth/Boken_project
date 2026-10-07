export type Author = {
  id: string;
  name: string;
};

export const authorNames = (authors: Author[] | undefined): string =>
  (authors ?? []).map((author) => author.name).join(", ");
