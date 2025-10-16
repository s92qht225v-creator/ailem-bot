import { useState, useEffect } from 'react';
import { calculateTimeRemaining } from '../../utils/helpers';

const CountdownTimer = ({ endDate, onExpire }) => {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(endDate);
      setTimeRemaining(remaining);

      if (remaining.expired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  if (timeRemaining.expired) {
    return (
      <div className="text-center text-error font-semibold">
        Sale Ended
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-center items-center">
      <TimeUnit value={timeRemaining.days} label="Days" />
      <span className="text-xl font-bold">:</span>
      <TimeUnit value={timeRemaining.hours} label="Hours" />
      <span className="text-xl font-bold">:</span>
      <TimeUnit value={timeRemaining.minutes} label="Mins" />
      <span className="text-xl font-bold">:</span>
      <TimeUnit value={timeRemaining.seconds} label="Secs" />
    </div>
  );
};

const TimeUnit = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center bg-primary text-white rounded-lg px-3 py-2 min-w-[60px]">
      <span className="text-2xl font-bold">{String(value).padStart(2, '0')}</span>
      <span className="text-xs uppercase">{label}</span>
    </div>
  );
};

export default CountdownTimer;
