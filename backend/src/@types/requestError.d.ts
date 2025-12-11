export interface RequestError extends Error {
  status: number;
  expected: boolean;
}
