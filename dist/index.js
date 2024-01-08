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
            try {
                // Сохраняем beer в localStorage
                const beers = localStorage.getItem("beers");
                if (beers) {
                    const beersData = JSON.parse(beers);
                    beersData[beer.name] = beer;
                    localStorage.setItem("beers", JSON.stringify(beersData));
                }
                else {
                    localStorage.setItem("beers", JSON.stringify({ [beer.name]: beer }));
                }
                // Сохраняем beer в localStorage как историю поиска (сохраняем только если последнее, что мы искали не совпадает с текущим)
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
                // localStorage переполнен, очищаем beer и вставляем то, что хотели (может быть переполнен при добавлении нового beer, ну и чисто теоретически при добавлении в lastSearch, а если масштабировать приложение то тем более)
                localStorage.removeItem("beers");
                localStorage.setItem("beers", JSON.stringify({ [beer.name]: beer }));
                localStorage.removeItem("lastSearch");
                localStorage.setItem("lastSearch", JSON.stringify([beer]));
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
                    suggestOldDiv.innerHTML = "";
                    localStorageSuggests.forEach((beer) => {
                        insertLinkIntoDiv(beer, suggestOldDiv, "append", true);
                    });
                }
            }
            // Берем саджесты из ручки
            suggestNewDiv.innerHTML = "Loading...";
            const response = (await fetchData(inputValue));
            // Отфильтруем саджесты из ручки, оставив только те, которых нет в саджестах из localStorage, чтобы не повторялись, и покажем пользователю
            suggestNewDiv.innerHTML = "";
            response
                .filter((beer) => !localStorageSuggests.find((localBeer) => localBeer.name === beer.name))
                .slice(0, MAX_SUGGESTS - localStorageSuggests.length)
                .forEach((beer) => {
                insertLinkIntoDiv(beer, suggestNewDiv, "append");
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
// Используем debounce чтобы снизить нагрузку на сервер
const debouncedOnInputHandler = useDebounce(onInputHandler, 250);
inputElement.oninput = debouncedOnInputHandler;
