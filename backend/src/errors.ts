export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (resource: string) => new AppError(404, "NOT_FOUND", `${resource} was not found`);
export const forbidden = (message = "You do not have access to this resource") => new AppError(403, "FORBIDDEN", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
export const invalid = (message: string, details?: unknown) => new AppError(400, "VALIDATION_ERROR", message, details);
