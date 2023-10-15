import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prismadb from '@/app/libs/prismadb';
import { uploadCloudinaryByFile } from './upload-cloudinary';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
   const { searchParams } = new URL(request.url);
   const transformTo = searchParams.get('transformTo');

   const data = await request.formData();
   const file: File | null = data.get('file') as unknown as File;

   if (!file) {
      return Response.json(
         {
            success: false,
            message: 'No se ha podido subir el archivo al servidor',
         },{ status: 400 }
      );
   }

   try {
      const session = await getServerSession(authOptions);

      if (session && session.user.id) {
         // Guardo el file en Cloudinary (solo para usuarios autenticados)
         // Guardo directamente en Cloudinary porque Vercel no permite upload en el filesystem
         const urlCloudinaryFile = await uploadCloudinaryByFile(file);

         // Guardo en MongoDB el path de Cloudinary (solo para usuarios autenticados)
         const newFile = await prismadb.file.create({
            data: {
               fileUrl: urlCloudinaryFile,
               convertedFileUrl: '',
               userId: session.user.id,
            },
         });
         console.log('Guardado en BD. Id:', newFile.id);
         return Response.json(
            { success: true, fileId: newFile.id, fileUrl: urlCloudinaryFile }, { status: 201 }
         );
      }

      return Response.json(
         { success: true, fileId: 0, fileUrl: '' }, { status: 200 }
      );
   } catch (error) {
      if (error instanceof Error) {
         console.log(error);
         return Response.json(
            { success: false, message: error.message }, { status: 400 }
         );
      }
   }
}
