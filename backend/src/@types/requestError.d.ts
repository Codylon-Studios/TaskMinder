export interface RequestError extends Error {
  status: number;
  additionalInformation?: string;
  expected: boolean;
}
