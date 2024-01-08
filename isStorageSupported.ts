function isQuotaExceededError(err: unknown): boolean {
    return (
        err instanceof DOMException &&
        // everything except Firefox
        (err.code === 22 ||
            // Firefox
            err.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            err.name === "QuotaExceededError" ||
            // Firefox
            err.name === "NS_ERROR_DOM_QUOTA_REACHED")
    );
}

// Проверка на доступность localStorage в браузере
export function isStorageSupported(): boolean {
    let storage: Storage | undefined;
    try {
        storage = window["localStorage"];
        if (!storage) {
            return false;
        }
        const x = `__storage_test__`;
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (err) {
        const isValidQuotaExceededError =
            isQuotaExceededError(err) && !!storage && storage.length > 0;
        return isValidQuotaExceededError;
    }
}
