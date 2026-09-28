export class AppError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export const notFound = (resource) => new AppError(404, "NOT_FOUND", `${resource} was not found`);
export const forbidden = (message = "You do not have access to this resource") => new AppError(403, "FORBIDDEN", message);
export const conflict = (message) => new AppError(409, "CONFLICT", message);
export const invalid = (message, details) => new AppError(400, "VALIDATION_ERROR", message, details);
