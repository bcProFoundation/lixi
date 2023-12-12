// import { THOUSAND } from '@bcpros/lixi-models/constants';

import { THOUSAND, MILLION, BILLION } from '@bcpros/lixi-models/constants';

const formatDana = dana => {
  if (dana < THOUSAND) {
    return dana;
  } else if (dana < MILLION) {
    return (dana / THOUSAND).toFixed(2) + 'K';
  } else if (dana < BILLION) {
    return (dana / MILLION).toFixed(1) + 'M';
  } else {
    return (dana / BILLION).toFixed(1) + 'B';
  }
};

export default formatDana;
