// Не получилось придумать как можно избежать any, сохранив при этом максимальную универсальность
export const useDebounce = (callback, delay) => {
    let timerRef;
    return (...args) => {
        clearTimeout(timerRef);
        timerRef = setTimeout(() => {
            callback.apply(null, args);
        }, delay);
    };
};
const MAX_SUGGESTS = 10;
const MAX_LOCAL_STORAGE_SUGGESTS = 5;
const MAX_LAST_SEARCH_ELEMENTS = 3;
function fetchData(beerName) {
    return fetch(`https://api.punkapi.com/v2/beers?beer_name=${beerName}&per_page=${MAX_SUGGESTS}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
    }).then((response) => {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject({
            message: "Error: something went wrong",
        });
    }, () => {
        return Promise.reject({ message: "Error: Connection error" });
    });
}
const errorOutput = document.getElementById("error");
const wrapperDiv = document.getElementById("wrapper");
const inputElement = document.getElementById("beerInput");
const suggestOldDiv = document.getElementById("suggestOld");
const suggestNewDiv = document.getElementById("suggestNew");
const resultDiv = document.getElementById("result");
const lastSearchDiv = document.getElementById("lastSearch");
const beerImage = document.getElementById("beerImage");
const beerName = document.getElementById("beerName");
const beerTags = document.getElementById("beerTags");
const beerFirstBrewed = document.getElementById("beerFirstBrewed");
const beerAbv = document.getElementById("beerAbv");
const beerFoodPairing = document.getElementById("beerFoodPairing");
const beerDescription = document.getElementById("beerDescription");
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
function isStorageSupported() {
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
const onClickSuggest = (beer) => () => {
    beerImage.src = beer.image_url ?? "";
    beerImage.alt = beer.name;
    beerName.textContent = beer.name;
    beerTags.textContent = beer.tagline;
    beerFirstBrewed.textContent = beer.first_brewed;
    beerAbv.textContent = String(beer.abv);
    beerFoodPairing.textContent = beer.food_pairing.join(", ");
    beerDescription.textContent = beer.description;
    resultDiv.style.visibility = "visible";
    if (isLocalStorage) {
        try {
            const beers = localStorage.getItem("beers");
            if (beers) {
                const beersData = JSON.parse(beers);
                beersData[beer.name] = beer;
                localStorage.setItem("beers", JSON.stringify(beersData));
            }
            else {
                localStorage.setItem("beers", JSON.stringify({ [beer.name]: beer }));
            }
            const lastSearch = localStorage.getItem("lastSearch");
            if (lastSearch) {
                const lastSearchData = JSON.parse(lastSearch);
                if (beer.name !== lastSearchData[0].name) {
                    lastSearchData.unshift(beer);
                    if (lastSearchData.length > MAX_LAST_SEARCH_ELEMENTS) {
                        lastSearchData.pop();
                    }
                    localStorage.setItem("lastSearch", JSON.stringify(lastSearchData));
                }
            }
            else {
                localStorage.setItem("lastSearch", JSON.stringify([beer]));
            }
        }
        catch (error) {
            // localStorage переполнен, очищаем beer и вставляем то, что хотели (может быть переполнен при добавлении нового beer)
            localStorage.removeItem("beers");
            localStorage.setItem("beers", JSON.stringify({ [beer.name]: beer }));
        }
    }
    // Добавляем саджест в блок с последними поисками
    setBeerInLastSearchDiv(beer);
};
const setBeerInLastSearchDiv = (beer) => {
    // добавляем саджест только тогда, когда только что кликнутый саджест не совпадает с последним (мне показалось, что так будет правильнее по ux)
    if (lastSearchDiv.firstChild?.textContent !== beer.name) {
        const pTag = document.createElement("p");
        pTag.className = "suggest__item_visited"; /// ПОМЕНЯЯЯЯЯЯЯЯЯЯЯТЬььььььььььььььььььььь
        pTag.textContent = beer.name;
        pTag.onclick = onClickSuggest(beer);
        lastSearchDiv.prepend(pTag);
        // Если количество детей в блоке превышает MAX_LAST_SEARCH_ELEMENTS, то удаляем самый старого
        if (lastSearchDiv.childElementCount === MAX_LAST_SEARCH_ELEMENTS + 1) {
            // Можно кастовать, потому что проверяем на количество
            lastSearchDiv.removeChild(lastSearchDiv.lastChild);
        }
    }
};
let isLocalStorage;
(function init() {
    // Проверяем доступен ли localStorage
    isLocalStorage = isStorageSupported();
    console.log(inputElement.value);
    inputElement.value = "";
    console.log(inputElement);
    if (isLocalStorage) {
        const setBeerListStringInLastSearch = (beerListString) => {
            const lastSearchList = JSON.parse(beerListString);
            lastSearchList
                .reverse()
                .forEach((beer) => setBeerInLastSearchDiv(beer));
        };
        // Инитим последние запросы
        const lastSearch = localStorage.getItem("lastSearch");
        if (lastSearch) {
            setBeerListStringInLastSearch(lastSearch);
        }
        // Ловим событие storage при изменении localStorage, чтобы обновить последние запросы
        window.addEventListener("storage", ({ key, oldValue, newValue }) => {
            console.log(1);
            if (key === "lastSearch" && newValue) {
                setBeerListStringInLastSearch(newValue);
            }
        });
    }
})();
const onInputHandler = async (event) => {
    if (!(event.target instanceof HTMLInputElement))
        return;
    errorOutput.textContent = "";
    if (event.target.value) {
        const inputValue = event.target.value;
        try {
            let localStorageSuggests = [];
            // Берем саджесты из localStorage, показываем пользователю
            if (isLocalStorage) {
                const beers = localStorage.getItem("beers");
                if (beers) {
                    localStorageSuggests = Object.values(JSON.parse(beers))
                        .filter((beer) => beer.name
                        .toLowerCase()
                        .startsWith(inputValue.toLowerCase()))
                        .slice(0, MAX_LOCAL_STORAGE_SUGGESTS);
                    console.log(localStorageSuggests);
                    suggestOldDiv.innerHTML = "";
                    localStorageSuggests.forEach((beer) => {
                        const pTag = document.createElement("p");
                        pTag.className = "suggest__item_visited";
                        pTag.textContent = beer.name;
                        pTag.onclick = onClickSuggest(beer);
                        suggestOldDiv.append(pTag);
                    });
                }
            }
            // Берем саджесты из ручки
            const response = (await fetchData(inputValue));
            console.log(response);
            // Отфильтруем саджесты из ручки, оставив только те, которых нет в саджестах из localStorage, чтобы не повторялись, и покажем пользователю
            suggestNewDiv.innerHTML = "";
            response
                .filter((beer) => !localStorageSuggests.find((localBeer) => localBeer.name === beer.name))
                .slice(0, MAX_SUGGESTS - localStorageSuggests.length)
                .forEach((beer) => {
                const pTag = document.createElement("p");
                pTag.textContent = beer.name;
                pTag.onclick = onClickSuggest(beer);
                suggestNewDiv.append(pTag);
            });
        }
        catch (error) {
            const { message } = error;
            console.error("ERROR", message);
            errorOutput.textContent = message;
        }
    }
    else {
        suggestOldDiv.innerHTML = "";
        suggestNewDiv.innerHTML = "";
    }
};
const debouncedOnInputHandler = useDebounce(onInputHandler, 250);
inputElement.oninput = debouncedOnInputHandler;
