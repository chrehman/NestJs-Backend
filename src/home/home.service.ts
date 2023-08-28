import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomeResponseDto } from './dto/home.dto';
import { UserInfo } from 'src/user/decorator/user.decorator';

interface GetHomesParams {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  propertyType?: PropertyType;
}

interface Image {
  url: string;
}

interface CreateHomeParams {
  address: string;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: Image[];
}

interface UpdateeHomeParams {
  address?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  city?: string;
  price?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

const homeSelect = {
  id: true,
  address: true,
  city: true,
  price: true,
  propertyType: true,
  numberOfBathrooms: true,
  numberOfBedrooms: true,
};

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(filter: GetHomesParams): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: {
        ...filter,
      },
    });
    if (!homes.length) {
      throw new NotFoundException('No homes found');
    }
    return homes.map((home) => {
      const fetchHome = { ...home, image: home.images[0].url };
      delete fetchHome.images;
      return new HomeResponseDto(fetchHome);
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      where: {
        id,
      },
    });
    if (!home) {
      throw new NotFoundException('No home found by Id');
    }
    return new HomeResponseDto(home);
  }

  async createHome(
    {
      address,
      city,
      landSize,
      numberOfBathrooms,
      numberOfBedrooms,
      images,
      price,
      propertyType,
    }: CreateHomeParams,
    userId: number,
  ) {
    const home = await this.prismaService.home.create({
      data: {
        address,
        city,
        landSize,
        numberOfBathrooms,
        numberOfBedrooms,
        price,
        propertyType,
        realtorId: userId,
      },
    });

    console.log(images, 'images');

    const imagesData = await this.prismaService.image.createMany({
      data: images.map((img) => ({
        url: img.url,
        homeId: home.id,
      })),
    });
    console.log(imagesData, 'imagesData');
    const fetchHome = { ...home, image: images[0].url };
    return new HomeResponseDto(fetchHome);
  }

  async updateHomeById(id: number, body: UpdateeHomeParams) {
    const homeExists = await this.prismaService.home.findUnique({
      where: {
        id,
      },
    });

    if (!homeExists) {
      throw new NotFoundException('No home found by Id');
    }

    const home = await this.prismaService.home.update({
      where: {
        id,
      },
      data: {
        ...body,
      },
    });
    return new HomeResponseDto(home);
  }

  async deleteHomeById(id: number) {
    const homeExists = await this.prismaService.home.findUnique({
      where: {
        id,
      },
    });

    if (!homeExists) {
      throw new NotFoundException('No home found by Id');
    }

    await this.prismaService.image.deleteMany({
      where: {
        homeId: id,
      },
    });

    const home = await this.prismaService.home.delete({
      where: {
        id,
      },
    });
    return home;
  }

  async getRealtorHomeById(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: {
        id,
      },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException('No home found by Id');
    }

    return home.realtor;
  }

  async inquire(buyer: UserInfo, homeId: number, message: string) {
    const realtor = await this.getRealtorHomeById(homeId);

    return this.prismaService.message.create({
      data: {
        message,
        homeId,
        buyerId: buyer.id,
        relatorId: realtor.id,
      },
    });
  }

  async getMessagesByHome(homeId: number) {
    return await this.prismaService.message.findMany({
      where: {
        homeId,
      },
      select: {
        message: true,
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
