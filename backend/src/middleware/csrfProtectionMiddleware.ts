import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";

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
	const tokenFromHeader = req.headers["x-csrf-token"] as string | undefined;
	const tokenFromBody = (req.body && req.body._csrf) || null;

	const providedToken = tokenFromHeader || tokenFromBody;

	if (!providedToken || typeof providedToken !== 'string' || !tokenFromSession || typeof tokenFromSession !== 'string') {
			logger.warn("CSRF Check: Validation failed - Token missing or invalid type");
			let err: RequestError = {
				name: "Unauthorized",
				status: 401,
				message: "CSRF Check: Validation failed - Token missing or invalid type",
				expected: true,
			}
			throw err;
	}

	// --- Timing-attack safe comparison ---
	try {
			const providedTokenBuffer = Buffer.from(providedToken, 'utf8');
			const sessionTokenBuffer = Buffer.from(tokenFromSession, 'utf8');

			if (providedTokenBuffer.length !== sessionTokenBuffer.length) {
					logger.warn("CSRF Check: Validation failed - Token length mismatch");
					let err: RequestError = {
						name: "Unauthorized",
						status: 401,
						message: "CSRF Check: Validation failed - Token missing or invalid type",
						expected: true,
					}
					throw err;
			}

			if (crypto.timingSafeEqual(providedTokenBuffer, sessionTokenBuffer)) {
					next(); // Tokens match, proceed
			} else {
					logger.warn("CSRF Check: Validation failed - Tokens do not match");
					let err: RequestError = {
						name: "Unauthorized",
						status: 401,
						message: "CSRF Check: Validation failed - Token missing or invalid type",
						expected: true,
					}
					throw err;
			}
	} catch(e) {
			logger.error("CSRF Check: Error during comparison:", e);
			let err: RequestError = {
				name: "Unauthorized",
				status: 401,
				message: "CSRF Check: Validation failed - Token missing or invalid type",
				expected: true,
			}
			throw err;
	}
	// --- End timing-attack safe comparison ---
}