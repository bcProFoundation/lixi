import { Upload } from '@bcpros/lixi-prisma';

export const toImageUrl = (deliveryUrl: string, cfAccountHash: string, upload?: Upload) => {
  if (!upload) return '';
  const cfUrl = `${deliveryUrl}/${cfAccountHash}/${upload.cfImageId}/public`;
  const url = upload.cfImageId ? cfUrl : '';
  return url;
};
