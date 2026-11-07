import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductMediaDto {
  @IsString()
  @IsNotEmpty({ message: 'S3 key is required' })
  s3Key!: string;

  @IsString()
  @IsNotEmpty({ message: 'CDN URL is required' })
  cdnUrl!: string;

  @IsString()
  @IsNotEmpty({ message: 'Alt text is required for accessibility' })
  altText!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;
}
