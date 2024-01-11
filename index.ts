import { fetchData } from "./async.js";
import {
    MAX_LAST_SEARCH_ELEMENTS,
    MAX_LOCAL_STORAGE_SUGGESTS,
    MAX_SUGGESTS,
} from "./const.js";
import { isStorageSupported } from "./isStorageSupported.js";
import { BeerData, ErrorType } from "./types.js";
import { useDebounce } from "./useDebounce.js";

const errorOutput = document.getElementById("error") as HTMLDivElement;
const inputElement = document.getElementById("beerInput") as HTMLInputElement;
const suggestOldDiv = document.getElementById("suggestOld") as HTMLDivElement;
const suggestNewDiv = document.getElementById("suggestNew") as HTMLDivElement;
const resultDiv = document.getElementById("result") as HTMLDivElement;
const lastSearchDiv = document.getElementById("lastSearch") as HTMLDivElement;
const beerImage = document.getElementById("beerImage") as HTMLImageElement;
const beerName = document.getElementById("beerName") as HTMLSpanElement;
const beerTags = document.getElementById("beerTags") as HTMLSpanElement;
const beerFirstBrewed = document.getElementById(
    "beerFirstBrewed"
) as HTMLSpanElement;
const beerAbv = document.getElementById("beerAbv") as HTMLSpanElement;
const beerFoodPairing = document.getElementById(
    "beerFoodPairing"
) as HTMLSpanElement;
const beerDescription = document.getElementById(
    "beerDescription"
) as HTMLSpanElement;

const getLocalStorageItemSafe = (localStorageKey: string) => {
    const stringifyData = localStorage.getItem(localStorageKey);
    if (!stringifyData) return null;
    try {
        const data = JSON.parse(stringifyData);
        return data;
    } catch (error) {
        return null;
    }
};

const setLocalStorageItemSafe = (localStorageKey: string, data: unknown) => {
    try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
    } catch (error) {
        // localStorage переполнен, очищаем его
        localStorage.clear();
    }
};

function onClickSuggest(beer: BeerData) {
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
            const beers = getLocalStorageItemSafe("beers") as Record<
                string,
                BeerData
            >;
            if (beers) {
                beers[beer.name] = beer;
                setLocalStorageItemSafe("beers", beers);
            } else {
                setLocalStorageItemSafe("beers", { [beer.name]: beer });
            }

            // Сохраняем beer в localStorage как историю поиска (сохраняем только если последнее, что мы искали не совпадает с текущим)
            const lastSearch = getLocalStorageItemSafe(
                "lastSearch"
            ) as Array<BeerData>;
            if (lastSearch) {
                if (beer.name !== lastSearch[0].name) {
                    lastSearch.unshift(beer);
                    if (lastSearch.length > MAX_LAST_SEARCH_ELEMENTS) {
                        lastSearch.pop();
                    }
                    setLocalStorageItemSafe("lastSearch", lastSearch);
                }
            } else {
                setLocalStorageItemSafe("lastSearch", [beer]);
            }
        }

        // Добавляем саджест в блок с последними поисками
        setBeerInLastSearchDiv(beer);
    };
}

// Функция для переиспользования в разных частях кода
const insertLinkIntoDiv = (
    beer: BeerData,
    insertDiv: HTMLDivElement,
    insertType: "append" | "prepend",
    textDecoration: boolean = false
) => {
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

function setBeerInLastSearchDiv(beer: BeerData) {
    // Добавляем саджест только тогда, когда только что кликнутый саджест не совпадает с последним (мне показалось, что так будет правильнее по UX)
    if (lastSearchDiv.firstChild?.textContent !== beer.name) {
        insertLinkIntoDiv(beer, lastSearchDiv, "prepend", true);

        // Если количество детей в блоке превышает MAX_LAST_SEARCH_ELEMENTS, то удаляем самого старого
        if (lastSearchDiv.childElementCount === MAX_LAST_SEARCH_ELEMENTS + 1) {
            // Можно кастовать, потому что проверяем на количество
            lastSearchDiv.removeChild(lastSearchDiv.lastChild as Node);
        }
    }
}

let isLocalStorage: boolean;
(function init() {
    // Проверяем доступен ли localStorage
    isLocalStorage = isStorageSupported();
    if (isLocalStorage) {
        const initLastSearch = () => {
            const lastSearch = getLocalStorageItemSafe(
                "lastSearch"
            ) as Array<BeerData>;
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

const onInputHandler = async (event: Event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    errorOutput.textContent = "";

    if (event.target.value) {
        const inputValue = event.target.value;
        let localStorageSuggests: Array<BeerData> = [];

        // Берем саджесты из localStorage, показываем пользователю
        if (isLocalStorage) {
            const beers = getLocalStorageItemSafe("beers") as Record<
                string,
                BeerData
            >;
            if (beers) {
                localStorageSuggests = Object.values(beers)
                    .filter((beer) =>
                        beer.name
                            .toLowerCase()
                            .startsWith(inputValue.toLowerCase())
                    )
                    .slice(0, MAX_LOCAL_STORAGE_SUGGESTS);

                suggestOldDiv.innerHTML = "";
                localStorageSuggests.forEach((beer) => {
                    insertLinkIntoDiv(beer, suggestOldDiv, "append", true);
                });
            }
        }

        // Берем саджесты из ручки
        suggestNewDiv.innerHTML = "Loading...";
        let response: Array<BeerData>;
        try {
            response = (await fetchData(inputValue)) as Array<BeerData>;
        } catch (error) {
            const { message } = error as ErrorType;
            console.error("ERROR", message);
            errorOutput.textContent = message;
            return;
        }
        // Отфильтруем саджесты из ручки, оставив только те, которых нет в саджестах из localStorage, чтобы не повторялись, и покажем пользователю
        suggestNewDiv.innerHTML = "";
        response
            .filter(
                (beer) =>
                    !localStorageSuggests.find(
                        (localBeer) => localBeer.name === beer.name
                    )
            )
            .slice(0, MAX_SUGGESTS - localStorageSuggests.length)
            .forEach((beer) => {
                insertLinkIntoDiv(beer, suggestNewDiv, "append");
            });
    } else {
        suggestOldDiv.innerHTML = "";
        suggestNewDiv.innerHTML = "";
    }
};

// Используем debounce чтобы снизить нагрузку на сервер
const debouncedOnInputHandler = useDebounce(onInputHandler, 250);

inputElement.oninput = debouncedOnInputHandler;
