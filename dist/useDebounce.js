export const useDebounce = (callback, delay) => {
    let timerRef;
    return (...args) => {
        clearTimeout(timerRef);
        timerRef = setTimeout(() => {
            callback.apply(null, args);
        }, delay);
    };
};
