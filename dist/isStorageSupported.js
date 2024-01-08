function isQuotaExceededError(err) {
    return (err instanceof DOMException &&
        // everything except Firefox
        (err.code === 22 ||
            // Firefox
            err.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            err.name === "QuotaExceededError" ||
            // Firefox
            err.name === "NS_ERROR_DOM_QUOTA_REACHED"));
}
export function isStorageSupported() {
    let storage;
    try {
        storage = window["localStorage"];
        if (!storage) {
            return false;
        }
        const x = `__storage_test__`;
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (err) {
        // We acknowledge a QuotaExceededError only if there's something
        // already stored.
        const isValidQuotaExceededError = isQuotaExceededError(err) && !!storage && storage.length > 0;
        return isValidQuotaExceededError;
    }
}
