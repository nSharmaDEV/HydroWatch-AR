import type { Language } from './domain'

const labels = {
  copyMessage: ['Copy message', 'Copiar mensaje'],
  editMessage: ['Edit message', 'Editar mensaje'],
  openEmail: ['Open in my email app', 'Abrir en mi app de correo'],
  copyEmail: ['Copy email', 'Copiar correo'],
  callSupplier: ['Call supplier', 'Llamar al proveedor'],
  callAdh: ['Call ADH', 'Llamar a ADH'],
  contactInfo: ['About this contact', 'Información del contacto'],
  otherInfo: ['About the other option', 'Información de la otra opción'],
  logContact: ['Log a contact attempt', 'Registrar un intento de contacto'],
  yourFiles: ['Your files', 'Tus archivos'],
  dragHint: ['Drag into your email', 'Arrastra a tu correo'],
  showFiles: ['Show files', 'Mostrar archivos'],
  hideFiles: ['Hide files', 'Ocultar archivos'],
  download: ['Download', 'Descargar'],
  nextTitle: ['What happens next', 'Qué sigue'],
  nextSend: ['Send or call', 'Envía o llama'],
  nextSendText: ['Email the draft or call them.', 'Envía el borrador por correo o llámalos.'],
  nextLog: ['Log it here', 'Regístralo aquí'],
  nextLogText: ['Keep a record of when you reached out.', 'Guarda un registro de cuándo te comunicaste.'],
  nextFollow: ['Follow up', 'Da seguimiento'],
  nextFollowText: ['No reply in a few days? Try again.', '¿Sin respuesta en unos días? Inténtalo de nuevo.'],
} as const
export const reviewLabel = (key: keyof typeof labels, language: Language) => labels[key][language === 'es' ? 1 : 0]
