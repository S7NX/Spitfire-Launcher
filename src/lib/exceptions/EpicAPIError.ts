import type { EpicAPIErrorData } from '$types/game/authorizations';
import type { KyRequest } from 'ky';

export default class EpicAPIError extends Error {
  public method?: string;
  public url?: string;
  public httpStatus?: number;
  public errorCode: string;
  public numericErrorCode: number | null;
  public messageVars: string[];
  public continuation?: string;
  public continuationUrl?: string;
  public correctiveAction?: string;

  constructor(error: EpicAPIErrorData, request?: KyRequest, status?: number) {
    super();
    this.name = 'EpicAPIError';
    this.message = error.errorMessage;

    this.method = request?.method?.toUpperCase();
    this.url = request?.url;
    this.httpStatus = status;
    this.errorCode = error.errorCode;
    this.numericErrorCode = error.numericErrorCode;
    this.messageVars = error.messageVars || [];
    this.continuation = error.continuation;
    this.continuationUrl = error.continuationUrl;
    this.correctiveAction = error.correctiveAction;
  }
}
