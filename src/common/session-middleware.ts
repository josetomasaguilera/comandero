import { RequestHandler } from 'express';

let middleware: RequestHandler | undefined;

export function setSessionMiddleware(sessionMiddleware: RequestHandler): void {
  middleware = sessionMiddleware;
}

export function getSessionMiddleware(): RequestHandler | undefined {
  return middleware;
}
