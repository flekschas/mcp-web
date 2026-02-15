export const MissingAuthenticationErrorCode = 'MissingAuthentication';
export const InvalidAuthenticationErrorCode = 'InvalidAuthentication';
export const InvalidSessionErrorCode = 'InvalidSession';
export const NoSessionsFoundErrorCode = 'NoSessionsFound';
export const SessionNotFoundErrorCode = 'SessionNotFound';
export const QueryNotFoundErrorCode = 'QueryNotFound';
export const QueryNotActiveErrorCode = 'QueryNotActive';
export const QueryDoneErrorCode = 'QueryCompleted';
export const UnknownMethodErrorCode = 'UnknownMethod';
export const InternalErrorCode = 'InternalError';
export const ClientNotConextualizedErrorCode = 'ClientNotConextualized';
export const ToolNotFoundErrorCode = 'ToolNotFound';
export const SessionNotSpecifiedErrorCode = 'SessionNotSpecified';
export const ToolNameRequiredErrorCode = 'ToolNameRequired';
export const ToolNotAllowedErrorCode = 'ToolNotAllowed';
export const SessionLimitExceededErrorCode = 'SessionLimitExceeded';
export const QueryLimitExceededErrorCode = 'QueryLimitExceeded';
export const SessionExpiredErrorCode = 'SessionExpired';

export const SessionNameAlreadyInUseErrorCode = 'SessionNameAlreadyInUse';

/**
 * Session information returned in errors
 */
export interface SessionInfo {
  session_id: string;
  session_name: string | undefined;
  origin: string;
  page_title: string;
  connected_at: string;
  last_activity: string;
  available_tools: string[];
}

/**
 * Error thrown when a session must be specified but wasn't provided.
 * Contains structured information about available sessions.
 */
export class SessionNotSpecifiedError extends Error {
  public readonly code = SessionNotSpecifiedErrorCode;

  constructor(
    message: string,
    public readonly availableSessions: SessionInfo[]
  ) {
    super(message);
    this.name = 'SessionNotSpecifiedError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, SessionNotSpecifiedError.prototype);
  }
}
