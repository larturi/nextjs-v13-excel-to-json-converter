'use client';

import { useState } from 'react';

export function UploadFile() {
   const [file, setFile] = useState<File>();
   const [jsonData, setJsonData] = useState({});

   const copyToClipboard = () => {
      if (file) {
         const textToCopy = file.name;
         navigator.clipboard.writeText(textToCopy);
      }
   };

   const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!file) {
         console.log('No file');
         return;
      }

      try {
         const data = new FormData();
         data.set('file', file);

         const res = await fetch('/api/upload', {
            method: 'POST',
            body: data,
         });

         if (!res.ok) {
            throw new Error(await res.text());
         } else {
            const res = await fetch('/api/convert', {
               method: 'POST',
            });

            const data = await res.json();
            setJsonData(data);
         }
      } catch (e: any) {
         console.error(e);
      }
   };

   return (
      <div className='bg-gray-800 text-white pt-6'>
         <form onSubmit={onSubmit} className='mb-4'>
            <label className='bg-gray-700 text-white p-3 rounded-md cursor-pointer'>
               {file ? file.name : 'Seleccionar archivo'}
               <input
                  type='file'
                  name='file'
                  onChange={(e) => {
                     setJsonData({});
                     setFile(e.target.files?.[0]);
                  }}
                  placeholder='Seleccionar archivo'
                  className='bg-gray-700 text-white p-2 rounded-md hidden'
                  accept='.xlsx, .xls'
               />
            </label>


            <input
               type='submit'
               value='Upload'
               className='bg-blue-500 text-white p-2 rounded-md ml-2 cursor-pointer'
            />

            <button
               onClick={copyToClipboard}
               className='bg-green-500 text-white p-2 rounded-md cursor-pointer m-2'
            >
               Copiar al Portapapeles
            </button>
         </form>

         {Object.keys(jsonData).length > 0 ? (
            <div className='bg-gray-900 p-4 rounded-md'>
               <pre>
                  <code className='text-green-400'>
                     {JSON.stringify(jsonData, null, 2)}
                  </code>
               </pre>
            </div>
         ) : (
            <div className='bg-gray-900 p-[300px] rounded-md'>
               <pre>
                  <code className='text-green-400'></code>
               </pre>
            </div>
         )}
      </div>
   );
}
