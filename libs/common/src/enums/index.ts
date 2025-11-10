export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  AGENT = 'agent',
}

export enum AuthType {
  Bearer,
  None,
}

export enum ClientType {
  WEB = 'web',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  API = 'api', // for machine-to-machine use
}
