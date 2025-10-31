import { Request } from 'express';
import { Role } from '../enums';

// Base Entity Interface
export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// API Response Wrapper
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination
export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Message Broker
export interface IMessageBroker {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(pattern: string, data: any): Promise<void>;
  subscribe(
    pattern: string,
    handler: (data: any) => Promise<void>,
  ): Promise<void>;
  emit(pattern: string, data: any): void;
}

// Storage
export interface IStorageProvider {
  uploadFile(file: IFileUpload): Promise<IFileUploadResult>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  listFiles(prefix?: string): Promise<string[]>;
}

export interface IFileUpload {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  size: number;
  folder?: string;
}

export interface IFileUploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
}

// Cache
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// User
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  AGENT = 'agent',
}

// JWT Payload
export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Service Communication Patterns
export enum MessagePattern {
  // Auth patterns
  AUTH_REGISTER = 'auth.register',
  AUTH_LOGIN = 'auth.login',
  AUTH_VALIDATE = 'auth.validate',
  AUTH_REFRESH = 'auth.refresh',

  // User patterns
  USER_CREATE = 'user.create',
  USER_FIND_BY_ID = 'user.findById',
  USER_FIND_BY_EMAIL = 'user.findByEmail',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',

  // Flight patterns
  FLIGHT_CREATE = 'flight.create',
  FLIGHT_FIND_ALL = 'flight.findAll',
  FLIGHT_FIND_BY_ID = 'flight.findById',
  FLIGHT_SEARCH = 'flight.search',
  FLIGHT_UPDATE = 'flight.update',
  FLIGHT_DELETE = 'flight.delete',

  // Booking patterns
  BOOKING_CREATE = 'booking.create',
  BOOKING_FIND_ALL = 'booking.findAll',
  BOOKING_FIND_BY_ID = 'booking.findById',
  BOOKING_FIND_BY_USER = 'booking.findByUser',
  BOOKING_UPDATE = 'booking.update',
  BOOKING_CANCEL = 'booking.cancel',

  // Notification patterns
  NOTIFICATION_SEND_EMAIL = 'notification.sendEmail',
  NOTIFICATION_SEND_SMS = 'notification.sendSms',
}

// Events for async communication
export enum EventPattern {
  USER_REGISTERED = 'user.registered',
  USER_UPDATED = 'user.updated',

  BOOKING_CREATED = 'booking.created',
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_CANCELLED = 'booking.cancelled',

  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
}

export interface ActiveUserData {
  /**
   * The "subject" of the token. The value of this property is the user ID
   * that granted this token.
   **/
  sub: number;

  /**
   *  The subject's (user) email.
   **/
  email: string;

  /**
   *  The subject's (user) role.
   **/
  role?: Role[];
}

export interface RefreshTokenPayload {
  /**
   * The "subject" of the token. The value of this property is the user ID
   * that granted this token.
   **/
  sub: number;

  /**
   *  The subject's (user) email.
   **/
  email: string;

  refreshTokenId: string;

  deviceId: string;
}

export interface AuthenticatedRequest extends Request {
  user: ActiveUserData;
}
