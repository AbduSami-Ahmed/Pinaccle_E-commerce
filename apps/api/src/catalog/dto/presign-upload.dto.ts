import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class PresignedUploadRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  fileName!: string;

  @IsString()
  @IsNotEmpty({ message: 'File type (MIME) is required' })
  fileType!: string;

  @IsInt()
  @IsPositive({ message: 'File size must be a positive integer in bytes' })
  fileSizeBytes!: number;
}
