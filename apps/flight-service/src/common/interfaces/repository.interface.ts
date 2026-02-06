import { FindOptionsWhere } from 'typeorm';

/**
 * Generic repository interface
 * Defines standard CRUD operations for all repositories
 * Follows Interface Segregation Principle (ISP)
 */
export interface IBaseRepository<T, ID = number> {
  /**
   * Find entity by ID
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Find all entities with optional filters
   */
  findAll(options?: FindOptionsWhere<T>): Promise<T[]>;

  /**
   * Find entities with pagination
   */
  findWithPagination(
    skip: number,
    take: number,
    where?: FindOptionsWhere<T>,
  ): Promise<[T[], number]>;

  /**
   * Create new entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update existing entity
   */
  update(id: ID, data: Partial<T>): Promise<T>;

  /**
   * Delete entity (soft delete if supported)
   */
  delete(id: ID): Promise<boolean>;

  /**
   * Check if entity exists
   */
  exists(where: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Count entities matching criteria
   */
  count(where?: FindOptionsWhere<T>): Promise<number>;
}
