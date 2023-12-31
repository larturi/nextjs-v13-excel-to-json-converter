import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import XLSX from 'xlsx';
import { uploadCloudinaryByFile } from '../upload/upload-cloudinary';
import prismadb from '@/app/libs/prismadb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
   try {
      const { searchParams } = new URL(request.url);
      const transformTo = searchParams.get('transformTo');
      const fileId = searchParams.get('fileId');
      const fileUrl = searchParams.get('fileUrl');
      const fileNameWithExtension = searchParams.get('fileName');
      const partes = fileNameWithExtension!.split('.');
      const fileName = partes[0];

      let urlCloudinaryFileConverted;

      const session = await getServerSession(authOptions);

      switch (transformTo) {
         case 'json':
            const jsonOutput = await transformToJson(fileUrl!);

            if (session && session.user.id) {
               // Guardo el file en Cloudinary (solo para usuarios autenticados)
               const jsonAsString = JSON.stringify(jsonOutput);

               urlCloudinaryFileConverted = await uploadCloudinaryByFile(
                  jsonAsString,
                  `${fileName}.json`
               );

               // Realiza la actualización en MongoDB
               await prismadb.file.update({
                  where: { id: fileId! },
                  data: {
                     convertedFileUrl: urlCloudinaryFileConverted,
                  },
               });
            }

            return Response.json(jsonOutput, { status: 200 });

         case 'xlsx':
            const xlsOutput = await transformToExcel(fileUrl!);

            if (session && session.user.id) {
               // Guardo el file en Cloudinary (solo para usuarios autenticados)
               urlCloudinaryFileConverted = await uploadCloudinaryByFile(
                  xlsOutput!,
                  `${fileName}.xlsx`
               );

               // Realiza la actualización en MongoDB
               await prismadb.file.update({
                  where: { id: fileId! },
                  data: {
                     convertedFileUrl: urlCloudinaryFileConverted,
                  },
               });
            }

            return Response.json({xlsOutput, urlCloudinaryFileConverted}, { status: 200 });
      }
   } catch (error) {
      if (error instanceof Error) {
         console.log(error);
         return Response.json(
            { success: false, message: error.message },
            { status: 400 }
         );
      }
   }
}

async function transformToJson(fileUrl: string) {
   // Descargar el archivo desde la URL de Cloudinary
   const response = await fetch(fileUrl);
   if (!response.ok) {
      throw new Error('Error al descargar el archivo desde Cloudinary');
   }
   const data = await response.arrayBuffer();

   // Convertir el archivo descargado a un archivo XLSX
   const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
   const sheet_name_list = workbook.SheetNames;

   // Crear un objeto en lugar de una lista
   const jsonOutput: any = [];

   sheet_name_list.forEach(function (y: string | number) {
      const worksheet = workbook.Sheets[y];
      const headers: { [key: string]: any } = {};
      let data = [];

      for (const z in worksheet) {
         if (z[0] === '!') continue;

         let col = z.substring(0, 1) as string;
         let row = parseInt(z.substring(1));
         let value = worksheet[z].v;

         if (row == 1) {
            headers[col] = value;
            continue;
         }

         if (!data[row]) data[row] = {} as { [key: string]: any };
         data[row][headers[col]] = value;
      }

      data.shift();
      data.shift();
      jsonOutput.push(data);
   });

   return jsonOutput[0];
}


async function transformToExcel(cloudinaryJsonUrl: string) {
   try {
      // Descargar el archivo JSON desde la URL de Cloudinary
      const response = await fetch(cloudinaryJsonUrl);
      if (!response.ok) {
         throw new Error('Error al descargar el archivo JSON desde Cloudinary');
      }
      const jsonData = await response.json();

      // Transformar el JSON en un archivo Excel
      const ws = XLSX.utils.json_to_sheet(jsonData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      return new Uint8Array(excelBuffer);
   } catch (error) {
      console.error('Error al transformar el archivo JSON a Excel:', error);
      return null;
   }
}
