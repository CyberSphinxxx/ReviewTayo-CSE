/**
 * Remote boundary.
 *
 * The contract the future backend adopts (`api-contract.ts`) and the one switch
 * between a local-only app and a synchronised one (`transport.ts`). UI must never
 * import from here directly; feature code asks a service, which asks the
 * transport.
 */

export * from './api-contract';
export {
  HttpApiTransport,
  LocalOnlyTransport,
  createApiTransport,
  toApiFailure,
  type ApiFailure,
  type ApiRequest,
  type ApiTransport,
  type HttpTransportOptions,
  type TransportConfig,
} from './transport';
