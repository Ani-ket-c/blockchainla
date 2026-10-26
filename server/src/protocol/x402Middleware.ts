import { Request, Response, NextFunction } from 'express';
import { globalFacilitator } from './x402Facilitator.js';
import { X402_HEADERS, PaymentAuthorizationPayload, PaymentReceipt } from './x402Types.js';

export interface X402Request extends Request {
  x402Receipt?: PaymentReceipt;
  x402Payer?: string;
}

export interface RoutePaymentConfig {
  serviceId: string;
  description: string;
  recipient: string;
  amountMicroUnits: string; // e.g. "10000" = 0.01 USDC
  tokenSymbol?: string;
  tokenAddress?: string;
}

/**
 * Creates an Express middleware enforcing the x402 HTTP 402 Payment Required protocol
 */
export function requireX402Payment(config: RoutePaymentConfig) {
  return (req: X402Request, res: Response, next: NextFunction) => {
    const rawSignatureHeader = req.header(X402_HEADERS.PAYMENT_SIGNATURE) || req.header(X402_HEADERS.PAYMENT_SIGNATURE.toLowerCase());

    // Case 1: No payment signature attached -> Challenge client with HTTP 402
    if (!rawSignatureHeader) {
      const challenge = globalFacilitator.createChallenge({
        serviceId: config.serviceId,
        description: config.description,
        recipient: config.recipient,
        amountMicroUnits: config.amountMicroUnits,
        tokenSymbol: config.tokenSymbol,
        tokenAddress: config.tokenAddress,
        requestBodyFingerprint: JSON.stringify(req.body || {})
      });

      const encodedChallenge = Buffer.from(JSON.stringify(challenge)).toString('base64');
      
      // Conforms to RFC x402 header standard
      res.setHeader(X402_HEADERS.PAYMENT_REQUIRED, encodedChallenge);
      res.setHeader('Access-Control-Expose-Headers', `${X402_HEADERS.PAYMENT_REQUIRED}, ${X402_HEADERS.PAYMENT_RESPONSE}`);
      
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Access to this agent service requires an x402 cryptographic micropayment authorization.',
        challenge
      });
    }

    // Case 2: Payment signature provided -> Verify and settle
    try {
      let authPayload: PaymentAuthorizationPayload;

      // Support base64 or direct JSON
      try {
        const decoded = Buffer.from(rawSignatureHeader, 'base64').toString('utf-8');
        authPayload = JSON.parse(decoded);
      } catch {
        authPayload = JSON.parse(rawSignatureHeader);
      }

      const settlementResult = globalFacilitator.verifyAndSettle(authPayload);

      if (!settlementResult.success || !settlementResult.receipt) {
        return res.status(402).json({
          error: 'PAYMENT_VERIFICATION_FAILED',
          message: settlementResult.error || 'Failed to verify EIP-712 payment authorization',
          details: {
            authPayload
          }
        });
      }

      // Attach receipt to request context & response headers
      req.x402Receipt = settlementResult.receipt;
      req.x402Payer = authPayload.payer;

      const encodedReceipt = Buffer.from(JSON.stringify(settlementResult.receipt)).toString('base64');
      res.setHeader(X402_HEADERS.PAYMENT_RESPONSE, encodedReceipt);
      res.setHeader('Access-Control-Expose-Headers', `${X402_HEADERS.PAYMENT_REQUIRED}, ${X402_HEADERS.PAYMENT_RESPONSE}`);

      next();
    } catch (err: any) {
      return res.status(400).json({
        error: 'MALFORMED_PAYMENT_HEADER',
        message: `Could not parse ${X402_HEADERS.PAYMENT_SIGNATURE}: ${err.message}`
      });
    }
  };
}
