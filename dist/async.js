import { MAX_SUGGESTS } from "./const.js";
export function fetchData(beerName) {
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
