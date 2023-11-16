import { Upload } from '@generated/types.generated';

export const toImageUrl = (deliveryUrl: string, cfAccountHash: string, upload?: Upload) => {
  if (!upload) return '';
  const cfUrl = `${deliveryUrl}/${cfAccountHash}/${upload.cfImageId}/public`;
  const url = upload.cfImageId ? cfUrl : '';
  return url;
};
