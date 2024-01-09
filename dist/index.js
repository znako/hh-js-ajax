import { fetchData } from "./async.js";
import { MAX_LAST_SEARCH_ELEMENTS, MAX_LOCAL_STORAGE_SUGGESTS, MAX_SUGGESTS, } from "./const.js";
import { isStorageSupported } from "./isStorageSupported.js";
import { useDebounce } from "./useDebounce.js";
const errorOutput = document.getElementById("error");
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
const getLocalStorageItemSafe = (localStorageKey) => {
    const stringifyData = localStorage.getItem(localStorageKey);
    if (!stringifyData)
        return null;
    try {
        const data = JSON.parse(stringifyData);
        return data;
    }
    catch (error) {
        return null;
    }
};
const setLocalStorageItemSafe = (localStorageKey, data) => {
    try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
    }
    catch (error) {
        // localStorage переполнен, очищаем его
        localStorage.clear();
    }
};
function onClickSuggest(beer) {
    return () => {
        // Отрисовываем данные
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
            // Сохраняем beer в localStorage
            const beers = getLocalStorageItemSafe("beers");
            if (beers) {
                beers[beer.name] = beer;
                setLocalStorageItemSafe("beers", beers);
            }
            else {
                setLocalStorageItemSafe("beers", { [beer.name]: beer });
            }
            // Сохраняем beer в localStorage как историю поиска (сохраняем только если последнее, что мы искали не совпадает с текущим)
            const lastSearch = getLocalStorageItemSafe("lastSearch");
            if (lastSearch) {
                if (beer.name !== lastSearch[0].name) {
                    lastSearch.unshift(beer);
                    if (lastSearch.length > MAX_LAST_SEARCH_ELEMENTS) {
                        lastSearch.pop();
                    }
                    setLocalStorageItemSafe("lastSearch", lastSearch);
                }
            }
            else {
                setLocalStorageItemSafe("lastSearch", [beer]);
            }
        }
        // Добавляем саджест в блок с последними поисками
        setBeerInLastSearchDiv(beer);
    };
}
// Функция для переиспользования в разных частях кода
const insertLinkIntoDiv = (beer, insertDiv, insertType, textDecoration = false) => {
    const tagP = document.createElement("p");
    const tagA = document.createElement("a");
    tagA.textContent = beer.name;
    tagA.href = "#";
    if (textDecoration) {
        tagA.className = "visited";
    }
    tagA.onclick = onClickSuggest(beer);
    tagP.append(tagA);
    insertDiv[insertType](tagP);
};
function setBeerInLastSearchDiv(beer) {
    // Добавляем саджест только тогда, когда только что кликнутый саджест не совпадает с последним (мне показалось, что так будет правильнее по UX)
    if (lastSearchDiv.firstChild?.textContent !== beer.name) {
        insertLinkIntoDiv(beer, lastSearchDiv, "prepend", true);
        // Если количество детей в блоке превышает MAX_LAST_SEARCH_ELEMENTS, то удаляем самого старого
        if (lastSearchDiv.childElementCount === MAX_LAST_SEARCH_ELEMENTS + 1) {
            // Можно кастовать, потому что проверяем на количество
            lastSearchDiv.removeChild(lastSearchDiv.lastChild);
        }
    }
}
let isLocalStorage;
(function init() {
    // Проверяем доступен ли localStorage
    isLocalStorage = isStorageSupported();
    if (isLocalStorage) {
        const initLastSearch = () => {
            const lastSearch = getLocalStorageItemSafe("lastSearch");
            if (lastSearch) {
                lastSearch
                    .reverse()
                    .forEach((beer) => setBeerInLastSearchDiv(beer));
            }
        };
        // Инитим последние запросы
        initLastSearch();
        // Ловим событие storage при изменении localStorage, чтобы обновить последние запросы
        window.addEventListener("storage", ({ key }) => {
            if (key === "lastSearch") {
                initLastSearch();
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
        let localStorageSuggests = [];
        // Берем саджесты из localStorage, показываем пользователю
        if (isLocalStorage) {
            const beers = getLocalStorageItemSafe("beers");
            if (beers) {
                localStorageSuggests = Object.values(beers)
                    .filter((beer) => beer.name
                    .toLowerCase()
                    .startsWith(inputValue.toLowerCase()))
                    .slice(0, MAX_LOCAL_STORAGE_SUGGESTS);
                suggestOldDiv.innerHTML = "";
                localStorageSuggests.forEach((beer) => {
                    insertLinkIntoDiv(beer, suggestOldDiv, "append", true);
                });
            }
        }
        // Берем саджесты из ручки
        suggestNewDiv.innerHTML = "Loading...";
        let response;
        try {
            response = (await fetchData(inputValue));
        }
        catch (error) {
            const { message } = error;
            console.error("ERROR", message);
            errorOutput.textContent = message;
            return;
        }
        // Отфильтруем саджесты из ручки, оставив только те, которых нет в саджестах из localStorage, чтобы не повторялись, и покажем пользователю
        suggestNewDiv.innerHTML = "";
        response
            .filter((beer) => !localStorageSuggests.find((localBeer) => localBeer.name === beer.name))
            .slice(0, MAX_SUGGESTS - localStorageSuggests.length)
            .forEach((beer) => {
            insertLinkIntoDiv(beer, suggestNewDiv, "append");
        });
    }
    else {
        suggestOldDiv.innerHTML = "";
        suggestNewDiv.innerHTML = "";
    }
};
// Используем debounce чтобы снизить нагрузку на сервер
const debouncedOnInputHandler = useDebounce(onInputHandler, 250);
inputElement.oninput = debouncedOnInputHandler;
