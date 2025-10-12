import { AppError } from "@notes-app/common";

export async function expectAppError(
  fn: () => Promise<unknown>,
  expectedCode: number
) {
  try {
    await fn();
    fail('Expected AppError to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(expectedCode);
  }
}