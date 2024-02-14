import { PollTime } from '@bcpros/lixi-models/constants';

export const timeLeft = (endDate: string) => {
  const now = Date.now();
  const endTime = new Date(endDate).getTime();

  const timeLeft = endTime - now;

  if (timeLeft < 0) return PollTime.closePoll;
  const hours = (timeLeft / (1000 * 60 * 60)).toFixed(1);
  const numberHour = Number(hours);

  if (numberHour > 24) {
    return (numberHour / 24).toFixed(0) + ' days left';
  } else if (numberHour < 1) {
    return (numberHour * 60).toFixed(0) + ' minutes left';
  } else {
    return numberHour.toFixed(0) + ' hours left';
  }
};
