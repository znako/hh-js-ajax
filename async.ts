import { MAX_SUGGESTS } from "./const.js";
import { BeerData, ErrorType } from "./types.js";

// Функция для запросов на сервер
export function fetchData(
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
            // Могут быть ошибки разного рода, поэтому отлавливаем
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
