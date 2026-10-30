import "server-only";

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export class NotFoundError extends DomainError {
  constructor(message = "No encontramos lo que buscás.") {
    super(message, 404);
  }
}
export class ForbiddenError extends DomainError {
  constructor(message = "No tenés permiso para realizar esta acción.") {
    super(message, 403);
  }
}
export class UnauthorizedError extends DomainError {
  constructor(message = "Iniciá sesión para continuar.") {
    super(message, 401);
  }
}
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}
export class RateLimitError extends DomainError {
  constructor() {
    super(
      "Demasiados intentos. Esperá un rato antes de volver a intentar.",
      429,
    );
  }
}
export class EmailDeliveryError extends DomainError {
  constructor() {
    super(
      "El servicio de correo rechazó el envío. Intentá nuevamente más tarde.",
      502,
    );
  }
}
