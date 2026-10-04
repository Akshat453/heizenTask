import { Param, ParseUUIDPipe } from '@nestjs/common';

/**
 * Route parameter that must be a UUID (any version, including the v5-shaped
 * deterministic seed ids). Malformed values are rejected with 400 before any
 * database access; guards still run first, so 401/403 take precedence.
 */
export const IdParam = (name = 'id'): ParameterDecorator =>
  Param(name, new ParseUUIDPipe());
