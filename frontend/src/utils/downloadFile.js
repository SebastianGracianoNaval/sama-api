export function downloadBlobResponse(response, fallbackName = 'archivo.csv') {
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Obtener el nombre del archivo del header Content-Disposition
  let filename = fallbackName;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
  }
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
} 