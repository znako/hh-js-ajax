// Не получилось придумать как можно избежать any, сохранив при этом максимальную универсальность
export const useDebounce = (
    callback: (...args: any) => void,
    delay: number
) => {
    let timerRef: NodeJS.Timeout | undefined;

    return (...args: any) => {
        clearTimeout(timerRef);

        timerRef = setTimeout(() => {
            callback.apply(null, args);
        }, delay);
    };
};
