import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { RequestError } from "../@types/requestError";

function generateCSRFToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

export function csrfSessionInit(req: Request, res: Response, next: NextFunction) {
	if (!req.session.csrfToken) {
		req.session.csrfToken = generateCSRFToken();
	}
	next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
	const method = req.method.toUpperCase();
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		return next();
	}

	const tokenFromSession = req.session.csrfToken;
	const tokenFromHeader = req.headers["x-csrf-token"];
	const tokenFromBody = (req.body && req.body._csrf) || null;

	const providedToken = tokenFromHeader || tokenFromBody;

	if (!providedToken || providedToken !== tokenFromSession) {
		let err: RequestError = {
			name: "Forbidden",
			status: 403,
			message: "Invalid or missing CSRF token",
			expected: true,
		}
		throw err;
	}

	next();
}