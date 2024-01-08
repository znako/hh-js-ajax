export const useDebounce = <T extends Array<unknown>>(
    callback: (...args: T) => void,
    delay: number
): ((...args: T) => void) => {
    let timerRef: NodeJS.Timeout | undefined;

    return (...args: T) => {
        clearTimeout(timerRef);

        timerRef = setTimeout(() => {
            callback.apply(null, args);
        }, delay);
    };
};
