export function downloadBlobResponse(response, fallbackName = 'archivo.csv') {
  console.log('[downloadBlobResponse] Headers:', response.headers);
  console.log('[downloadBlobResponse] Content-Type:', response.headers['content-type']);
  console.log('[downloadBlobResponse] Content-Disposition:', response.headers['content-disposition']);
  
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Obtener el nombre del archivo del header Content-Disposition
  let filename = fallbackName;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
    console.log('[downloadBlobResponse] Nombre extraído del header:', filename);
  } else {
    console.log('[downloadBlobResponse] Usando nombre por defecto:', filename);
  }
  
  a.download = filename;
  console.log('[downloadBlobResponse] Descargando archivo como:', filename);

  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
} 