import { setTimerHost } from '../src/utils/timer-host';

// Late-bound so fake timers installed after setup are honored.
setTimerHost({
  setTimeout: ((handler: () => void, ms?: number) => Number(setTimeout(handler, ms))) as typeof setTimeout,
});
