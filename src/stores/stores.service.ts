import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto, user: User) {
    try {
      const store = this.storesRepository.create({
        ...createStoreDto,
        user,
        createdBy: user,
      });

      await this.storesRepository.save(store);
      return store;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll(paginationDto: PaginationDto, user: User) {
    const { limit, offset } = paginationDto;
    const stores = await this.storesRepository.find({
      take: limit,
      skip: offset,
      where: {
        user: { id: user.id },
      },
    });

    return stores;
  }

  async findOne(find: string, user: User) {
    let store: Store;

    if (isUUID(find)) {
      store = await this.storesRepository.findOneBy({
        id: find,
        user: { id: user.id },
      });
    } else {
      const queryBuilder = this.storesRepository.createQueryBuilder('prod');
      store = await queryBuilder
        .where('LOWER(name) = :term OR slug = :term', {
          term: find.toLocaleLowerCase(),
        })
        .andWhere('prod.user = :userId', { userId: user.id })
        .getOne();
    }

    if (!store) {
      throw new NotFoundException(`Product with term ${find} not found`);
    }

    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto, user: User) {
    const store = await this.storesRepository.preload({
      id,
      ...updateStoreDto,
    });

    if (!store) {
      throw new NotFoundException(`Store with id ${id} not found`);
    }

    if (user && store.user.id !== user.id) {
      throw new UnauthorizedException(
        `You are not allowed to update this store`,
      );
    }

    try {
      await this.storesRepository.save(store);
      return store;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async remove(id: string, user: User) {
    const store = await this.findOne(id, user);
    if (!store) {
      throw new NotFoundException(`Store with id ${id} not found`);
    }

    await this.storesRepository.remove(store);
  }

  private handleDBException(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unextepted error, check server logs',
    );
  }
}
