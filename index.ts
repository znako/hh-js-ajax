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

interface ErrorType {
    message: string;
}

interface BeerData {
    id: number;
    name: string;
    tagline: string;
    first_brewed: string;
    description: string;
    image_url: string | null;
    abv: number;
    food_pairing: Array<string>;
}

const MAX_SUGGESTS = 10;
const MAX_LOCAL_STORAGE_SUGGESTS = 5;
const MAX_LAST_SEARCH_ELEMENTS = 3;

function fetchData(
    beerName: string
): Promise<Array<BeerData>> | Promise<ErrorType> {
    return fetch(
        `https://api.punkapi.com/v2/beers?beer_name=${beerName}&per_page=${MAX_SUGGESTS}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
        }
    ).then(
        (response) => {
            if (response.ok) {
                return response.json();
            }
            return Promise.reject({
                message: "Error: something went wrong",
            });
        },
        () => {
            return Promise.reject({ message: "Error: Connection error" });
        }
    );
}

const errorOutput = document.getElementById("error") as HTMLDivElement;
const wrapperDiv = document.getElementById("wrapper") as HTMLDivElement;
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

function isStorageSupported(): boolean {
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
        // We acknowledge a QuotaExceededError only if there's something
        // already stored.
        const isValidQuotaExceededError =
            isQuotaExceededError(err) && !!storage && storage.length > 0;
        return isValidQuotaExceededError;
    }
}

const onClickSuggest = (beer: BeerData) => () => {
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
                const beersData = JSON.parse(beers) as Record<string, BeerData>;
                beersData[beer.name] = beer;
                localStorage.setItem("beers", JSON.stringify(beersData));
            } else {
                localStorage.setItem(
                    "beers",
                    JSON.stringify({ [beer.name]: beer })
                );
            }

            const lastSearch = localStorage.getItem("lastSearch");
            if (lastSearch) {
                const lastSearchData = JSON.parse(
                    lastSearch
                ) as Array<BeerData>;
                if (beer.name !== lastSearchData[0].name) {
                    lastSearchData.unshift(beer);
                    if (lastSearchData.length > MAX_LAST_SEARCH_ELEMENTS) {
                        lastSearchData.pop();
                    }
                    localStorage.setItem(
                        "lastSearch",
                        JSON.stringify(lastSearchData)
                    );
                }
            } else {
                localStorage.setItem("lastSearch", JSON.stringify([beer]));
            }
        } catch (error) {
            // localStorage переполнен, очищаем beer и вставляем то, что хотели (может быть переполнен при добавлении нового beer)
            localStorage.removeItem("beers");
            localStorage.setItem(
                "beers",
                JSON.stringify({ [beer.name]: beer })
            );
        }
    }

    // Добавляем саджест в блок с последними поисками
    setBeerInLastSearchDiv(beer);
};

const setBeerInLastSearchDiv = (beer: BeerData) => {
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
            lastSearchDiv.removeChild(lastSearchDiv.lastChild as Node);
        }
    }
};

let isLocalStorage: boolean;
(function init() {
    // Проверяем доступен ли localStorage
    isLocalStorage = isStorageSupported();
    if (isLocalStorage) {
        const setBeerListStringInLastSearch = (beerListString: string) => {
            const lastSearchList = JSON.parse(
                beerListString
            ) as Array<BeerData>;
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

const onInputHandler = async (event: Event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    errorOutput.textContent = "";

    if (event.target.value) {
        const inputValue = event.target.value;
        try {
            let localStorageSuggests: Array<BeerData> = [];

            // Берем саджесты из localStorage, показываем пользователю
            if (isLocalStorage) {
                const beers = localStorage.getItem("beers");
                if (beers) {
                    localStorageSuggests = Object.values(
                        JSON.parse(beers) as Record<string, BeerData>
                    )
                        .filter((beer) =>
                            beer.name
                                .toLowerCase()
                                .startsWith(inputValue.toLowerCase())
                        )
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
            const response = (await fetchData(inputValue)) as Array<BeerData>;
            console.log(response);
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
                    const pTag = document.createElement("p");
                    pTag.textContent = beer.name;
                    pTag.onclick = onClickSuggest(beer);
                    suggestNewDiv.append(pTag);
                });
        } catch (error) {
            const { message } = error as ErrorType;
            console.error("ERROR", message);
            errorOutput.textContent = message;
        }
    } else {
        suggestOldDiv.innerHTML = "";
        suggestNewDiv.innerHTML = "";
    }
};

const debouncedOnInputHandler = useDebounce(onInputHandler, 250);

inputElement.oninput = debouncedOnInputHandler;
